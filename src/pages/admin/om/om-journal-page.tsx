import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  AutoComplete,
  Button,
  Card,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Segmented,
  Select,
  Space,
  Table,
  Tabs,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { omService } from '../../../service/om.service';
import { availabilityService } from '../../../service/availability.service';
import { useAuth } from '../../../helpers/hooks/useAuth';
import type {
  DeadlineState,
  HseKind,
  MaintenanceKind,
  OmContract,
  OmHseEvent,
  OmIncident,
  OmJournalLabels,
  OmMaintenancePlan,
  OmMaintenanceWork,
  OmPlanLine,
  OmSparePartMove,
  OmStockLine,
  SpareMoveKind,
} from '../../../types/om';

const { Title, Text } = Typography;

const TASHKENT_MS = 5 * 3_600_000;
const todayIso = () => new Date(Date.now() + TASHKENT_MS).toISOString().slice(0, 10);
const today = () => dayjs(todayIso());
const date = (d: string | null) => (d ? `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}` : '—');
const time = (t: string): string => {
  const d = new Date(new Date(t).getTime() + TASHKENT_MS).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};
/** Tashkent wall time from the picker, as an instant, and back. */
const fromPicker = (d: Dayjs | null | undefined) => (d ? `${d.format('YYYY-MM-DDTHH:mm')}:00+05:00` : null);
const toPicker = (iso: string | null) => (iso ? dayjs(new Date(new Date(iso).getTime() + TASHKENT_MS).toISOString().slice(0, 16)) : null);
const notFuture = (d: Dayjs) => d.isAfter(today(), 'day');
const failure = (e: any, fallback: string) => message.error(e?.response?.data?.message ?? fallback);

/** An entry may be about one plant of the contract or about the site as a whole. */
const WHOLE = '';
const WHOLE_LABEL = 'Umumiy (butun obyekt)';
const placeKey = (r: { provider: string | null; stationId: string | null }) => (r.provider && r.stationId ? `${r.provider}:${r.stationId}` : WHOLE);
const placeOf = (key: string | undefined, names: Map<string, string>) => {
  if (!key) return { provider: null, stationId: null, stationName: null };
  const [provider, ...rest] = key.split(':');
  return { provider: provider as OmContract['stations'][number]['provider'], stationId: rest.join(':'), stationName: names.get(key) ?? null };
};

interface TabProps {
  contract: OmContract;
  from: string;
  to: string;
  canEdit: boolean;
  names: Map<string, string>;
  labels: OmJournalLabels;
}

const placeName = (r: { provider: string | null; stationId: string | null; stationName: string | null }, names: Map<string, string>) =>
  r.provider && r.stationId ? names.get(`${r.provider}:${r.stationId}`) ?? r.stationName ?? r.stationId : 'Umumiy';

const StationSelect: React.FC<{ contract: OmContract; names: Map<string, string>; value?: string; onChange?: (v: string) => void }> = ({ contract, names, value, onChange }) => (
  <Select
    value={value}
    onChange={onChange}
    options={[
      { value: WHOLE, label: WHOLE_LABEL },
      ...contract.stations.map((s) => ({ value: `${s.provider}:${s.stationId}`, label: names.get(`${s.provider}:${s.stationId}`) ?? s.stationId })),
    ]}
  />
);

const rowActions = <T extends { id: number }>(canEdit: boolean, edit: (r: T) => void, remove: (id: number) => Promise<void>, reload: () => void): ColumnsType<T> =>
  canEdit
    ? [{
        title: '',
        width: 90,
        render: (_: unknown, r: T) => (
          <Space>
            <Button size="small" icon={<EditOutlined />} onClick={() => edit(r)} />
            <Popconfirm
              title="O'chirilsinmi?"
              okText="Ha"
              cancelText="Yo'q"
              onConfirm={() => remove(r.id).then(reload).catch((e) => failure(e, "O'chirib bo'lmadi"))}
            >
              <Button size="small" danger icon={<DeleteOutlined />} />
            </Popconfirm>
          </Space>
        ),
      }]
    : [];

// Maintenance works

/** How a scheduled work stands against the times a year Annex 1 asks for, given how much of the year has passed. */
const PlanTag: React.FC<{ line: OmPlanLine; elapsed: number }> = ({ line, elapsed }) => {
  if (line.perYear === null) return <Tag>{line.done} marta</Tag>;
  if (line.done >= line.perYear) return <Tag color="green">{line.done} / {line.perYear}</Tag>;
  const dueSoFar = Math.floor(line.perYear * elapsed);
  return line.done < dueSoFar ? (
    <Tooltip title={`Yilning o'tgan qismiga ko'ra hozirgacha kamida ${dueSoFar} marta bo'lishi kerak edi`}>
      <Tag color="orange">{line.done} / {line.perYear}, ortda</Tag>
    </Tooltip>
  ) : (
    <Tag color="blue">{line.done} / {line.perYear}</Tag>
  );
};

const WorksTab: React.FC<TabProps> = ({ contract, from, to, canEdit, names, labels }) => {
  const [rows, setRows] = useState<OmMaintenanceWork[]>([]);
  const [plan, setPlan] = useState<OmMaintenancePlan | null>(null);
  const [incidents, setIncidents] = useState<OmIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; work: OmMaintenanceWork | null }>({ open: false, work: null });

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      omService.works(contract.id, { from, to }),
      // No plan before the services start; the works themselves are still listed.
      omService.maintenancePlan(contract.id).catch(() => null),
    ])
      .then(([works, p]) => {
        setRows(works);
        setPlan(p);
      })
      .catch((e) => failure(e, "Ishlarni olib bo'lmadi"))
      .finally(() => setLoading(false));
  }, [contract.id, from, to]);

  useEffect(load, [load]);
  // The incidents a corrective work can be tied to: the last two months of them.
  useEffect(() => {
    omService
      .incidents(contract.id, { from: today().subtract(60, 'day').format('YYYY-MM-DD'), to: todayIso() })
      .then(setIncidents)
      .catch(() => setIncidents([]));
  }, [contract.id]);

  const itemLabel = useMemo(() => new Map(labels.maintenanceItems.map((i) => [i.code, i.label])), [labels]);
  const elapsed = plan ? Math.min(1, Math.max(0, (dayjs(todayIso()).diff(dayjs(plan.from), 'day') + 1) / (dayjs(plan.to).diff(dayjs(plan.from), 'day') + 1))) : 0;

  const columns: ColumnsType<OmMaintenanceWork> = [
    { title: 'Sana', dataIndex: 'performedOn', width: 105, render: date },
    { title: 'Obyekt', width: 170, render: (_, r) => placeName(r, names) },
    {
      title: 'Turi',
      width: 150,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={r.kind === 'scheduled' ? 'blue' : 'orange'}>{r.kind === 'scheduled' ? 'Rejali' : 'Tuzatish'}</Tag>
          {r.item && (
            <Tooltip title={itemLabel.get(r.item)}>
              <Text type="secondary" style={{ fontSize: 12 }}>Ilova 1, {r.item}-band</Text>
            </Tooltip>
          )}
          {r.incidentId && <Text type="secondary" style={{ fontSize: 12 }}>Hodisa #{r.incidentId}</Text>}
        </Space>
      ),
    },
    { title: 'Bajarilgan ish', dataIndex: 'description', render: (v: string) => <span style={{ whiteSpace: 'pre-wrap' }}>{v}</span> },
    { title: 'Bajaruvchi', dataIndex: 'performedBy', width: 150, render: (v: string | null) => v ?? '—' },
    ...rowActions<OmMaintenanceWork>(canEdit, (work) => setModal({ open: true, work }), (id) => omService.removeWork(id), load),
  ];

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <Card
        size="small"
        title="Bajarilgan ishlar"
        extra={canEdit && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, work: null })}>Ish qo'shish</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table<OmMaintenanceWork>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={rows}
          columns={columns}
          pagination={rows.length > 15 ? { pageSize: 15 } : false}
          scroll={{ x: 800 }}
          locale={{ emptyText: 'Bu davrda ish kiritilmagan' }}
        />
      </Card>

      {plan && (
        <Card
          size="small"
          title={`Rejali ishlar jadvali (Ilova 1): ${plan.contractYear}-shartnoma yili, ${date(plan.from)} – ${date(plan.to)}`}
          styles={{ body: { padding: 0 } }}
        >
          <Table<OmPlanLine>
            rowKey="code"
            size="small"
            loading={loading}
            dataSource={plan.items}
            pagination={false}
            scroll={{ x: 700 }}
            columns={[
              { title: 'Band', dataIndex: 'code', width: 70 },
              { title: 'Ish', dataIndex: 'label' },
              { title: 'Yiliga kamida', dataIndex: 'perYear', width: 120, render: (v: number | null) => (v === null ? "me'yor bo'yicha" : `${v} marta`) },
              { title: 'Bajarildi', width: 150, render: (_, l) => <PlanTag line={l} elapsed={elapsed} /> },
              { title: 'Oxirgi marta', dataIndex: 'lastOn', width: 120, render: date },
            ]}
          />
          <Text type="secondary" style={{ display: 'block', padding: '8px 12px', fontSize: 12 }}>
            Bu yerda faqat "Rejali" turidagi va Ilova 1 bandi tanlangan ishlar sanaladi. Davr tanlovi bu jadvalga ta'sir qilmaydi: u doim butun shartnoma yili bo'yicha.
          </Text>
        </Card>
      )}

      <WorkModal
        {...modal}
        contract={contract}
        names={names}
        labels={labels}
        incidents={incidents}
        onClose={() => setModal({ open: false, work: null })}
        onSaved={() => {
          setModal({ open: false, work: null });
          load();
        }}
      />
    </div>
  );
};

const WorkModal: React.FC<{
  open: boolean;
  work: OmMaintenanceWork | null;
  contract: OmContract;
  names: Map<string, string>;
  labels: OmJournalLabels;
  incidents: OmIncident[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, work, contract, names, labels, incidents, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const kind: MaintenanceKind = Form.useWatch('kind', form) ?? 'scheduled';

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      kind: work?.kind ?? 'scheduled',
      performedOn: work ? dayjs(work.performedOn) : today(),
      station: work ? placeKey(work) : WHOLE,
      item: work?.item ?? undefined,
      description: work?.description ?? '',
      performedBy: work?.performedBy ?? '',
      incidentId: work?.incidentId ?? undefined,
    });
  }, [open, work, form]);

  const incidentOptions = useMemo(() => {
    const list = incidents.map((i) => ({
      value: i.id,
      label: `#${i.id} ${i.stationName ?? names.get(`${i.provider}:${i.stationId}`) ?? i.stationId}, ${time(i.detectedAt)}`,
    }));
    if (work?.incidentId && !list.some((o) => o.value === work.incidentId)) list.unshift({ value: work.incidentId, label: `#${work.incidentId}` });
    return list;
  }, [incidents, names, work]);

  const submit = async () => {
    // A form that does not pass shows its own messages under the fields.
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    setSaving(true);
    try {
      await omService.saveWork({
        ...(work ? { id: work.id } : { contractId: contract.id }),
        ...placeOf(v.station, names),
        kind: v.kind,
        item: v.kind === 'scheduled' ? v.item ?? null : null,
        performedOn: v.performedOn.format('YYYY-MM-DD'),
        description: v.description?.trim() || '',
        performedBy: v.performedBy?.trim() || null,
        incidentId: v.kind === 'corrective' ? v.incidentId ?? null : null,
      });
      message.success('Saqlandi');
      onSaved();
    } catch (e) {
      failure(e, "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={work ? 'Ishni tahrirlash' : "Ish qo'shish"} onCancel={onClose} onOk={submit} okText="Saqlash" cancelText="Bekor qilish" confirmLoading={saving} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="kind" label="Turi">
          <Segmented<MaintenanceKind>
            options={[
              { value: 'scheduled', label: 'Rejali' },
              { value: 'corrective', label: 'Tuzatish (rejadan tashqari)' },
            ]}
          />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="start">
          <Form.Item name="performedOn" label="Bajarilgan sana" rules={[{ required: true, message: 'Sanani tanlang' }]}>
            <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} disabledDate={notFuture} allowClear={false} />
          </Form.Item>
          <Form.Item name="station" label="Obyekt">
            <StationSelect contract={contract} names={names} />
          </Form.Item>
        </Space>
        {kind === 'scheduled' ? (
          <Form.Item name="item" label="Ilova 1 bandi" extra="Band tanlansa, ish pastdagi yillik jadvalda sanaladi.">
            <Select
              allowClear
              placeholder="Qaysi rejali ish"
              options={labels.maintenanceItems.map((i) => ({ value: i.code, label: `${i.code} ${i.label}` }))}
            />
          </Form.Item>
        ) : (
          <Form.Item name="incidentId" label="Qaysi hodisa bo'yicha (bo'lsa)">
            <Select allowClear placeholder="Oxirgi 60 kun hodisalari" options={incidentOptions} />
          </Form.Item>
        )}
        <Form.Item
          name="description"
          label="Bajarilgan ish"
          extra={kind === 'scheduled' ? "Bo'sh qoldirilsa, tanlangan band nomi yoziladi." : undefined}
          rules={[
            ({ getFieldValue }) => ({
              validator: (_, value) =>
                value?.trim() || (getFieldValue('kind') === 'scheduled' && getFieldValue('item')) ? Promise.resolve() : Promise.reject(new Error('Nima ish qilinganini yozing')),
            }),
          ]}
        >
          <Input.TextArea rows={3} placeholder="Masalan: 3-invertorning ventilyatori almashtirildi" />
        </Form.Item>
        <Form.Item name="performedBy" label="Bajaruvchi">
          <Input placeholder="Ism yoki brigada" />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// Spare parts

const MOVE_COLOR: Record<SpareMoveKind, string> = { received: 'green', used: 'orange', inventory: 'blue' };
const UNITS = ['dona', 'metr', 'komplekt', 'kg', 'litr'];
/** Clause 7.6 asks for an inventory at least once a quarter. */
const INVENTORY_DAYS = 92;

const SpareTab: React.FC<TabProps> = ({ contract, from, to, canEdit, names, labels }) => {
  const [moves, setMoves] = useState<OmSparePartMove[]>([]);
  const [stock, setStock] = useState<OmStockLine[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; move: OmSparePartMove | null; kind: SpareMoveKind; part?: OmStockLine }>({ open: false, move: null, kind: 'received' });

  const load = useCallback(() => {
    setLoading(true);
    omService
      .spareParts(contract.id, { from, to })
      .then((r) => {
        setMoves(r.moves);
        setStock(r.stock);
      })
      .catch((e) => failure(e, "Ehtiyot qismlarni olib bo'lmadi"))
      .finally(() => setLoading(false));
  }, [contract.id, from, to]);

  useEffect(load, [load]);

  const add = (kind: SpareMoveKind, part?: OmStockLine) => setModal({ open: true, move: null, kind, part });
  const close = () => setModal((m) => ({ ...m, open: false }));

  const stockColumns: ColumnsType<OmStockLine> = [
    { title: 'Ehtiyot qism', dataIndex: 'part' },
    { title: 'Raqami', dataIndex: 'partNumber', width: 140, render: (v: string | null) => v ?? '—' },
    {
      title: 'Qoldiq',
      width: 130,
      render: (_, l) => <Text strong type={l.quantity < 0 ? 'danger' : undefined}>{l.quantity} {l.unit}</Text>,
    },
    {
      title: 'Oxirgi inventarizatsiya',
      width: 210,
      render: (_, l) => {
        if (!l.lastInventoryOn) return <Tag>hali o'tkazilmagan</Tag>;
        const late = dayjs(to).diff(dayjs(l.lastInventoryOn), 'day') > INVENTORY_DAYS;
        return late ? <Tag color="orange">{date(l.lastInventoryOn)}, 3 oydan oshdi</Tag> : <span>{date(l.lastInventoryOn)}</span>;
      },
    },
    { title: 'Oxirgi harakat', dataIndex: 'lastMoveOn', width: 130, render: date },
    ...(canEdit
      ? [{
          title: '',
          width: 190,
          render: (_: unknown, l: OmStockLine) => (
            <Space>
              <Button size="small" onClick={() => add('used', l)}>Ishlatildi</Button>
              <Button size="small" onClick={() => add('inventory', l)}>Sanaldi</Button>
            </Space>
          ),
        }]
      : []),
  ];

  const moveColumns: ColumnsType<OmSparePartMove> = [
    { title: 'Sana', dataIndex: 'movedOn', width: 105, render: date },
    {
      title: 'Ehtiyot qism',
      render: (_, m) => (
        <Space direction="vertical" size={0}>
          <Text>{m.part}</Text>
          {m.partNumber && <Text type="secondary" style={{ fontSize: 12 }}>{m.partNumber}</Text>}
        </Space>
      ),
    },
    { title: 'Harakat', dataIndex: 'kind', width: 150, render: (k: SpareMoveKind) => <Tag color={MOVE_COLOR[k]}>{labels.spareMoveKinds[k]}</Tag> },
    { title: 'Miqdor', width: 110, render: (_, m) => `${m.quantity} ${m.unit}` },
    { title: 'Qayerga ishlatildi', width: 170, render: (_, m) => (m.kind === 'used' ? placeName(m, names) : '—') },
    { title: 'Izoh', dataIndex: 'note', render: (v: string | null) => v ?? '—' },
    ...rowActions<OmSparePartMove>(canEdit, (move) => setModal({ open: true, move, kind: move.kind }), (id) => omService.removeMove(id), load),
  ];

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <Card
        size="small"
        title={`Ombor qoldig'i: ${date(to)} holatiga`}
        extra={canEdit && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => add('received')}>Kirim</Button>}
        styles={{ body: { padding: 0 } }}
      >
        <Table<OmStockLine>
          rowKey={(l) => `${l.part}|${l.partNumber ?? ''}`}
          size="small"
          loading={loading}
          dataSource={stock}
          columns={stockColumns}
          pagination={stock.length > 15 ? { pageSize: 15 } : false}
          scroll={{ x: 800 }}
          locale={{ emptyText: "Omborda hali hech narsa yo'q. Birinchi ehtiyot qismni \"Kirim\" bilan kiriting." }}
        />
        <Text type="secondary" style={{ display: 'block', padding: '8px 12px', fontSize: 12 }}>
          Qoldiq = kirimlar − ishlatilganlar. Inventarizatsiya (sanab chiqish) kiritilsa, qoldiq o'sha kundan boshlab sanalgan miqdorga teng bo'ladi.
          Shartnomaning 7.6-bandi bo'yicha inventarizatsiya kamida har chorakda o'tkaziladi.
        </Text>
      </Card>

      <Card
        size="small"
        title="Harakatlar jurnali"
        extra={
          canEdit && (
            <Space>
              <Button size="small" onClick={() => add('used')}>Ishlatildi</Button>
              <Button size="small" onClick={() => add('inventory')}>Inventarizatsiya</Button>
            </Space>
          )
        }
        styles={{ body: { padding: 0 } }}
      >
        <Table<OmSparePartMove>
          rowKey="id"
          size="small"
          loading={loading}
          dataSource={moves}
          columns={moveColumns}
          pagination={moves.length > 15 ? { pageSize: 15 } : false}
          scroll={{ x: 850 }}
          locale={{ emptyText: "Bu davrda harakat yo'q" }}
        />
      </Card>

      <MoveModal
        {...modal}
        contract={contract}
        names={names}
        labels={labels}
        stock={stock}
        onClose={close}
        onSaved={() => {
          close();
          load();
        }}
      />
    </div>
  );
};

const MoveModal: React.FC<{
  open: boolean;
  move: OmSparePartMove | null;
  kind: SpareMoveKind;
  part?: OmStockLine;
  contract: OmContract;
  names: Map<string, string>;
  labels: OmJournalLabels;
  stock: OmStockLine[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, move, kind: startKind, part, contract, names, labels, stock, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const kind: SpareMoveKind = Form.useWatch('kind', form) ?? startKind;

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    form.setFieldsValue({
      kind: move?.kind ?? startKind,
      movedOn: move ? dayjs(move.movedOn) : today(),
      part: move?.part ?? part?.part ?? '',
      partNumber: move?.partNumber ?? part?.partNumber ?? '',
      quantity: move?.quantity ?? (startKind === 'inventory' && part ? part.quantity : undefined),
      unit: move?.unit ?? part?.unit ?? 'dona',
      station: move ? placeKey(move) : WHOLE,
      note: move?.note ?? '',
    });
  }, [open, move, startKind, part, form]);

  /** Picking a part already in stock brings its number and unit, so the same part is not kept under two names. */
  const pick = (name: string) => {
    const line = stock.find((l) => l.part === name);
    if (line) form.setFieldsValue({ partNumber: line.partNumber ?? '', unit: line.unit });
  };

  const submit = async () => {
    // A form that does not pass shows its own messages under the fields.
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    setSaving(true);
    try {
      await omService.saveMove({
        ...(move ? { id: move.id } : { contractId: contract.id }),
        ...(v.kind === 'used' ? placeOf(v.station, names) : { provider: null, stationId: null, stationName: null }),
        kind: v.kind,
        movedOn: v.movedOn.format('YYYY-MM-DD'),
        part: v.part.trim(),
        partNumber: v.partNumber?.trim() || null,
        quantity: v.quantity,
        unit: v.unit?.trim() || 'dona',
        note: v.note?.trim() || null,
      });
      message.success('Saqlandi');
      onSaved();
    } catch (e) {
      failure(e, "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={move ? 'Yozuvni tahrirlash' : labels.spareMoveKinds[kind]} onCancel={onClose} onOk={submit} okText="Saqlash" cancelText="Bekor qilish" confirmLoading={saving} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="kind" label="Harakat">
          <Segmented<SpareMoveKind> options={(Object.keys(labels.spareMoveKinds) as SpareMoveKind[]).map((k) => ({ value: k, label: labels.spareMoveKinds[k] }))} />
        </Form.Item>
        <Form.Item name="movedOn" label="Sana" rules={[{ required: true, message: 'Sanani tanlang' }]}>
          <DatePicker format="DD.MM.YYYY" style={{ width: '100%' }} disabledDate={notFuture} allowClear={false} />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="start">
          <Form.Item name="part" label="Ehtiyot qism nomi" rules={[{ required: true, whitespace: true, message: 'Nomini yozing' }]}>
            <AutoComplete
              options={stock.map((l) => ({ value: l.part }))}
              filterOption={(input, option) => String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())}
              onSelect={pick}
              placeholder="Masalan: MC4 konnektor"
            />
          </Form.Item>
          <Form.Item name="partNumber" label="Raqami yoki modeli">
            <Input placeholder="Yorliqdagi raqam" />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="start">
          <Form.Item
            name="quantity"
            label={kind === 'inventory' ? 'Sanab chiqilgan miqdor' : 'Miqdor'}
            rules={[
              { required: true, message: 'Miqdorni yozing' },
              ({ getFieldValue }) => ({
                validator: (_, value) =>
                  value === undefined || value === null || value > 0 || (value === 0 && getFieldValue('kind') === 'inventory')
                    ? Promise.resolve()
                    : Promise.reject(new Error("Noldan katta bo'lishi kerak")),
              }),
            ]}
          >
            <InputNumber min={0} style={{ width: '100%' }} />
          </Form.Item>
          <Form.Item name="unit" label="Birlik">
            <AutoComplete options={UNITS.map((value) => ({ value }))} />
          </Form.Item>
        </Space>
        {kind === 'used' && (
          <Form.Item name="station" label="Qayerga ishlatildi">
            <StationSelect contract={contract} names={names} />
          </Form.Item>
        )}
        <Form.Item name="note" label="Izoh">
          <Input.TextArea rows={2} placeholder={kind === 'received' ? 'Kimdan olindi, hujjat raqami' : kind === 'used' ? 'Qaysi uskunaga, nima uchun' : 'Kim sanadi, farq sababi'} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

// HSE incidents

const NoticeTag: React.FC<{ state: DeadlineState; due: string; doneAt: string | null }> = ({ state, due, doneAt }) => {
  switch (state) {
    case 'done':
      return <Tag color="green">O'z vaqtida: {time(doneAt!)}</Tag>;
    case 'late':
      return <Tag color="orange">Kech: {time(doneAt!)} (muddat {time(due)})</Tag>;
    case 'overdue':
      return <Tag color="red">Muddat o'tdi: {time(due)}</Tag>;
    default:
      return <Tag color="blue">Muddat: {time(due)}</Tag>;
  }
};

const HseTab: React.FC<TabProps> = ({ contract, from, to, canEdit, names, labels }) => {
  const [rows, setRows] = useState<OmHseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; event: OmHseEvent | null; notified: boolean }>({ open: false, event: null, notified: false });

  const load = useCallback(() => {
    setLoading(true);
    omService
      .hse(contract.id, { from, to })
      .then(setRows)
      .catch((e) => failure(e, "HSE hodisalarini olib bo'lmadi"))
      .finally(() => setLoading(false));
  }, [contract.id, from, to]);

  useEffect(load, [load]);

  const close = () => setModal({ open: false, event: null, notified: false });

  const columns: ColumnsType<OmHseEvent> = [
    { title: 'Vaqti', dataIndex: 'occurredAt', width: 110, render: time },
    {
      title: 'Hodisa',
      width: 200,
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Tag color={r.kind === 'near_miss' || r.kind === 'other' ? 'gold' : 'red'}>{labels.hseKinds[r.kind]}</Tag>
          <Text type="secondary" style={{ fontSize: 12 }}>{placeName(r, names)}</Text>
        </Space>
      ),
    },
    {
      title: "Nima bo'ldi va qanday chora ko'rildi",
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <span style={{ whiteSpace: 'pre-wrap' }}>{r.description}</span>
          {r.actions && <Text type="secondary" style={{ whiteSpace: 'pre-wrap' }}>Chora: {r.actions}</Text>}
        </Space>
      ),
    },
    {
      title: 'Mijozga xabar (24 soat)',
      width: 250,
      render: (_, r) => (
        <Space direction="vertical" size={4}>
          <NoticeTag state={r.noticeState} due={r.noticeDueAt} doneAt={r.customerNotifiedAt} />
          {r.notifiedVia && <Text type="secondary" style={{ fontSize: 12 }}>{r.notifiedVia}</Text>}
          {canEdit && !r.customerNotifiedAt && <Button size="small" onClick={() => setModal({ open: true, event: r, notified: true })}>Xabar berildi</Button>}
        </Space>
      ),
    },
    ...rowActions<OmHseEvent>(canEdit, (event) => setModal({ open: true, event, notified: false }), (id) => omService.removeHse(id), load),
  ];

  return (
    <Card
      size="small"
      title="Mehnat muhofazasi va atrof-muhit (HSE) hodisalari"
      extra={canEdit && <Button size="small" type="primary" icon={<PlusOutlined />} onClick={() => setModal({ open: true, event: null, notified: false })}>Hodisa qo'shish</Button>}
      styles={{ body: { padding: 0 } }}
    >
      <Table<OmHseEvent>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={rows.length > 15 ? { pageSize: 15 } : false}
        scroll={{ x: 850 }}
        locale={{ emptyText: "Bu davrda HSE hodisasi qayd etilmagan" }}
      />
      <Text type="secondary" style={{ display: 'block', padding: '8px 12px', fontSize: 12 }}>
        Shartnomaning 5.1.4-bandi bo'yicha har bir HSE hodisasi haqida mijozga 24 soat ichida xabar beriladi. Jarohatsiz o'tgan xavfli holatlar ham shu yerga yoziladi.
        Davrda hodisa bo'lmasa, hisobotda "hodisa qayd etilmagan" deb chiqadi.
      </Text>
      <HseModal
        {...modal}
        contract={contract}
        names={names}
        labels={labels}
        onClose={close}
        onSaved={() => {
          close();
          load();
        }}
      />
    </Card>
  );
};

const HseModal: React.FC<{
  open: boolean;
  event: OmHseEvent | null;
  notified: boolean;
  contract: OmContract;
  names: Map<string, string>;
  labels: OmJournalLabels;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, event, notified, contract, names, labels, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    const now = toPicker(new Date().toISOString());
    form.setFieldsValue({
      kind: event?.kind ?? 'near_miss',
      occurredAt: event ? toPicker(event.occurredAt) : now,
      station: event ? placeKey(event) : WHOLE,
      description: event?.description ?? '',
      actions: event?.actions ?? '',
      customerNotifiedAt: notified ? now : toPicker(event?.customerNotifiedAt ?? null),
      notifiedVia: event?.notifiedVia ?? '',
    });
  }, [open, event, notified, form]);

  const submit = async () => {
    // A form that does not pass shows its own messages under the fields.
    const v = await form.validateFields().catch(() => null);
    if (!v) return;
    setSaving(true);
    try {
      await omService.saveHse({
        ...(event ? { id: event.id } : { contractId: contract.id }),
        ...placeOf(v.station, names),
        kind: v.kind,
        occurredAt: fromPicker(v.occurredAt)!,
        description: v.description.trim(),
        actions: v.actions?.trim() || null,
        customerNotifiedAt: fromPicker(v.customerNotifiedAt),
        notifiedVia: v.notifiedVia?.trim() || null,
      });
      message.success('Saqlandi');
      onSaved();
    } catch (e) {
      failure(e, "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const picker = <DatePicker showTime={{ format: 'HH:mm' }} format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} disabledDate={notFuture} />;

  return (
    <Modal open={open} title={event ? 'HSE hodisasini tahrirlash' : "HSE hodisasi qo'shish"} onCancel={onClose} onOk={submit} okText="Saqlash" cancelText="Bekor qilish" confirmLoading={saving} destroyOnClose>
      <Form form={form} layout="vertical">
        <Form.Item name="kind" label="Turi" rules={[{ required: true }]}>
          <Select options={(Object.keys(labels.hseKinds) as HseKind[]).map((k) => ({ value: k, label: labels.hseKinds[k] }))} />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="start">
          <Form.Item name="occurredAt" label="Qachon bo'ldi" rules={[{ required: true, message: 'Vaqtni tanlang' }]}>{picker}</Form.Item>
          <Form.Item name="station" label="Obyekt">
            <StationSelect contract={contract} names={names} />
          </Form.Item>
        </Space>
        <Form.Item name="description" label="Nima bo'ldi" rules={[{ required: true, whitespace: true, message: "Nima bo'lganini yozing" }]}>
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item name="actions" label="Ko'rilgan choralar">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="start">
          <Form.Item name="customerNotifiedAt" label="Mijozga xabar berilgan vaqt">{picker}</Form.Item>
          <Form.Item name="notifiedVia" label="Qanday (isbot uchun)">
            <AutoComplete options={['E-mail', 'Telefon', 'Telegram', 'Rasmiy xat'].map((value) => ({ value }))} />
          </Form.Item>
        </Space>
      </Form>
    </Modal>
  );
};

// The page

type TabKey = 'works' | 'spare' | 'hse';

/**
 * The three logs the O&M Agreement asks the Contractor to keep: maintenance works done, the spare
 * parts stock movement log, and HSE incidents. The monthly and annual reports read them.
 */
const OmJournalPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const [contracts, setContracts] = useState<OmContract[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [labels, setLabels] = useState<OmJournalLabels | null>(null);
  const [names, setNames] = useState<Map<string, string>>(new Map());
  const [range, setRange] = useState<[Dayjs, Dayjs]>(() => [today().startOf('month'), today()]);
  const [tab, setTab] = useState<TabKey>('works');
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([omService.contracts(), omService.journalLabels()])
      .then(([list, l]) => {
        setContracts(list);
        setLabels(l);
        setSelected((cur) => cur ?? list[0]?.id ?? null);
      })
      .catch(() => setFailed("Ma'lumotni olib bo'lmadi. Sahifani yangilab ko'ring."))
      .finally(() => setLoading(false));
    // Plant names only dress the lists, so the page does not wait for them.
    availabilityService
      .getReport()
      .then((r) => setNames(new Map(r.stations.map((s) => [`${s.provider}:${s.stationId}`, s.name]))))
      .catch(() => undefined);
  }, []);

  const contract = contracts.find((c) => c.id === selected) ?? null;
  const from = range[0].format('YYYY-MM-DD');
  const to = range[1].format('YYYY-MM-DD');
  const props = contract && labels ? { contract, from, to, canEdit, names, labels } : null;

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={3} style={{ margin: 0 }}>O&M jurnallar</Title>
        <Space wrap>
          <Select
            style={{ minWidth: 220 }}
            value={selected ?? undefined}
            placeholder="Shartnoma"
            onChange={setSelected}
            options={contracts.map((c) => ({ value: c.id, label: c.name }))}
          />
          <DatePicker.RangePicker
            value={range}
            format="DD.MM.YYYY"
            allowClear={false}
            disabledDate={notFuture}
            onChange={(v) => v && v[0] && v[1] && setRange([v[0], v[1]])}
            presets={[
              { label: 'Shu oy', value: [today().startOf('month'), today()] },
              { label: "O'tgan oy", value: [today().subtract(1, 'month').startOf('month'), today().subtract(1, 'month').endOf('month')] },
              ...(contract ? [{ label: 'Xizmat boshidan', value: [dayjs(contract.serviceStartDate), today()] as [Dayjs, Dayjs] }] : []),
            ]}
          />
        </Space>
      </Space>

      {failed && <Alert type="error" showIcon message={failed} />}

      {!loading && !contracts.length && !failed ? (
        <Card>
          <Empty description="Hali shartnoma kiritilmagan. Avval “O&M shartnoma” sahifasida shartnoma qo'shing." />
        </Card>
      ) : (
        props && (
          <>
            <Text type="secondary">
              Bu yerga kiritilgan yozuvlar oylik va yillik O&M hisobotning 3, 5 va 6-bo'limlarida o'zi chiqadi (shartnoma, Ilova 5).
            </Text>
            <Tabs
              activeKey={tab}
              onChange={(k) => setTab(k as TabKey)}
              destroyOnHidden
              items={[
                { key: 'works', label: 'Texnik xizmat ishlari', children: <WorksTab {...props} /> },
                { key: 'spare', label: 'Ehtiyot qismlar', children: <SpareTab {...props} /> },
                { key: 'hse', label: 'HSE hodisalari', children: <HseTab {...props} /> },
              ]}
            />
          </>
        )
      )}
    </div>
  );
};

export default OmJournalPage;
