import React, { useCallback, useEffect, useState } from 'react';
import {
  AutoComplete,
  Button,
  Card,
  Checkbox,
  DatePicker,
  Form,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { DeleteOutlined, EditOutlined, PlusOutlined, ReloadOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { omService } from '../../../service/om.service';
import type { DeadlineState, IncidentCategory, OmContract, OmIncident } from '../../../types/om';

const { Text } = Typography;

const TASHKENT_MS = 5 * 3_600_000;
const formatTime = (t: string): string => {
  const d = new Date(new Date(t).getTime() + TASHKENT_MS).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};
const fromPicker = (d: Dayjs | null | undefined) => (d ? `${d.format('YYYY-MM-DDTHH:mm')}:00+05:00` : null);
const toPicker = (iso: string | null) => (iso ? dayjs(new Date(new Date(iso).getTime() + TASHKENT_MS).toISOString().slice(0, 16)) : null);
const nowPicker = () => toPicker(new Date().toISOString());

/** Annex 2 of the contract, in Uzbek. */
const INCIDENT_UZ: Record<IncidentCategory, { label: string; color: string; clocks: string }> = {
  total: { label: "100% to'xtash", color: 'red', clocks: 'xabar 2 soat, yetib borish 8 soat (24/7)' },
  major: { label: "30%+ yo'qotish", color: 'volcano', clocks: 'xabar 4 soat, yetib borish 24 soat' },
  minor: { label: "30% dan kam yo'qotish", color: 'gold', clocks: 'xabar 8 soat, yetib borish 48 soat (ish vaqti)' },
  noncritical: { label: 'Kritik emas', color: 'default', clocks: 'xabar 24 soat, keyingi rejali tashrifda' },
};

const Clock: React.FC<{ state: DeadlineState; due: string | null; doneAt: string | null }> = ({ state, due, doneAt }) => {
  switch (state) {
    case 'done':
      return <Tag color="green">O'z vaqtida: {formatTime(doneAt!)}</Tag>;
    case 'late':
      return <Tag color="orange">Kech: {formatTime(doneAt!)} (muddat {formatTime(due!)})</Tag>;
    case 'overdue':
      return <Tag color="red">Muddat o'tdi: {formatTime(due!)}</Tag>;
    case 'pending':
      return <Tag color="blue">Muddat: {formatTime(due!)}</Tag>;
    case 'not_needed':
      return <Tag>Kerak bo'lmadi</Tag>;
    default:
      return <Tag>Keyingi rejali tashrifda</Tag>;
  }
};

interface Props {
  contract: OmContract;
  from: string;
  to: string;
  canEdit: boolean;
  names: Map<string, string>;
}

type Prefill = Partial<Record<'customerNotifiedAt' | 'arrivedAt' | 'resolvedAt', true>>;

/** The incident log of Annex 2: every fault, its two clocks, and what staff did about it. */
export const IncidentsCard: React.FC<Props> = ({ contract, from, to, canEdit, names }) => {
  const [rows, setRows] = useState<OmIncident[]>([]);
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [modal, setModal] = useState<{ open: boolean; incident: OmIncident | null; prefill: Prefill }>({ open: false, incident: null, prefill: {} });

  const load = useCallback(() => {
    setLoading(true);
    omService
      .incidents(contract.id, { from, to })
      .then(setRows)
      .catch(() => message.error("Hodisalarni olib bo'lmadi"))
      .finally(() => setLoading(false));
  }, [contract.id, from, to]);

  useEffect(load, [load]);

  const scan = () => {
    setScanning(true);
    omService
      .scanIncidents(contract.id, { from, to })
      .then((r) => {
        message.success(r.created || r.updated ? `${r.created} ta yangi hodisa, ${r.updated} ta yangilandi` : 'Yangi hodisa topilmadi');
        load();
      })
      .catch((e) => message.error(e?.response?.data?.message ?? "Tekshirib bo'lmadi"))
      .finally(() => setScanning(false));
  };

  const open = (incident: OmIncident | null, prefill: Prefill = {}) => setModal({ open: true, incident, prefill });
  const overdue = rows.filter((r) => !r.resolvedAt && (r.responseState === 'overdue' || r.arrivalState === 'overdue')).length;

  const columns: ColumnsType<OmIncident> = [
    {
      title: 'Hodisa',
      render: (_, r) => (
        <Space direction="vertical" size={2}>
          <Text strong>#{r.id} {r.stationName ?? names.get(`${r.provider}:${r.stationId}`) ?? r.stationId}</Text>
          <Space size={4} wrap>
            <Tooltip title={INCIDENT_UZ[r.category].clocks}>
              <Tag color={INCIDENT_UZ[r.category].color}>{INCIDENT_UZ[r.category].label}</Tag>
            </Tooltip>
            {r.silent && (
              <Tooltip title="Invertor ma'lumot yubormagan va hisoblagich ishlaganini ko'rsatmagan. Faqat internet uzilgan bo'lishi ham mumkin.">
                <Tag>Aloqa yo'q</Tag>
              </Tooltip>
            )}
          </Space>
          {r.title && <Text type="secondary" style={{ fontSize: 12 }}>{r.title}</Text>}
          {r.cause && <Text style={{ fontSize: 12 }}>Sabab: {r.cause}</Text>}
        </Space>
      ),
    },
    {
      title: 'Vaqti',
      width: 170,
      render: (_, r) => (
        <Space direction="vertical" size={0}>
          <Text>{formatTime(r.detectedAt)} dan</Text>
          {r.endedAt ? <Text type="secondary">{formatTime(r.endedAt)} gacha</Text> : <Tag color="red">Hali ishlamayapti</Tag>}
        </Space>
      ),
    },
    {
      title: 'Mijozga xabar',
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={4}>
          <Clock state={r.responseState} due={r.responseDueAt} doneAt={r.customerNotifiedAt} />
          {r.notifiedVia && <Text type="secondary" style={{ fontSize: 12 }}>{r.notifiedVia}</Text>}
          {canEdit && !r.customerNotifiedAt && (
            <Button size="small" onClick={() => open(r, { customerNotifiedAt: true })}>Xabar berildi</Button>
          )}
        </Space>
      ),
    },
    {
      title: 'Joyga borish',
      width: 220,
      render: (_, r) => (
        <Space direction="vertical" size={4}>
          <Clock state={r.arrivalState} due={r.arrivalDueAt} doneAt={r.arrivedAt} />
          {canEdit && !r.arrivedAt && !r.arrivalNotNeeded && (
            <Space size={4}>
              <Button size="small" onClick={() => open(r, { arrivedAt: true })}>Yetib keldi</Button>
              <Button
                size="small"
                onClick={() => omService.saveIncident({ id: r.id, arrivalNotNeeded: true }).then(load)}
              >
                Kerak emas
              </Button>
            </Space>
          )}
        </Space>
      ),
    },
    {
      title: 'Holati',
      width: 150,
      render: (_, r) =>
        r.resolvedAt ? (
          <Tag color="green">Tuzatildi: {formatTime(r.resolvedAt)}</Tag>
        ) : canEdit ? (
          <Button size="small" onClick={() => open(r, { resolvedAt: true })}>Tuzatildi</Button>
        ) : (
          <Tag color="gold">Ochiq</Tag>
        ),
    },
    ...(canEdit
      ? [{
          title: '',
          width: 90,
          render: (_: unknown, r: OmIncident) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => open(r)} />
              <Popconfirm title="O'chirilsinmi?" onConfirm={() => omService.removeIncident(r.id).then(load)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        }]
      : []),
  ];

  return (
    <Card
      size="small"
      title={
        <Space>
          <span>Hodisalar jurnali (Ilova 2: javob vaqtlari)</span>
          {overdue > 0 && <Tag color="red">{overdue} ta muddati o'tgan</Tag>}
        </Space>
      }
      extra={
        canEdit && (
          <Space>
            <Tooltip title="Tizim har 15 daqiqada oxirgi 3 kunni o'zi tekshiradi. Bu tugma tanlangan davrni qayta tekshiradi.">
              <Button size="small" icon={<ReloadOutlined />} loading={scanning} onClick={scan}>Qayta tekshirish</Button>
            </Tooltip>
            <Button size="small" icon={<PlusOutlined />} onClick={() => open(null)}>Qo'shish</Button>
          </Space>
        )
      }
      styles={{ body: { padding: 0 } }}
    >
      <Table<OmIncident>
        rowKey="id"
        size="small"
        loading={loading}
        dataSource={rows}
        columns={columns}
        pagination={rows.length > 10 ? { pageSize: 10 } : false}
        scroll={{ x: 950 }}
        locale={{ emptyText: "Bu davrda hodisa yo'q" }}
      />
      <Text type="secondary" style={{ display: 'block', padding: '8px 12px', fontSize: 12 }}>
        Invertor(lar) 30 daqiqadan ko'p ishlamasa (uzrli bo'lmagan to'xtash), tizim hodisa ochadi. Toifa to'xtagan quvvat ulushiga qarab
        aniqlanadi va shartnomaning Ilova 2 muddatlari shu paytdan boshlab hisoblanadi. Muddatga 30 daqiqa qolganda va muddat o'tganda
        Telegram alarm guruhiga eslatma boradi.
      </Text>
      <IncidentModal
        {...modal}
        contract={contract}
        names={names}
        onClose={() => setModal({ open: false, incident: null, prefill: {} })}
        onSaved={() => {
          setModal({ open: false, incident: null, prefill: {} });
          load();
        }}
      />
    </Card>
  );
};

const IncidentModal: React.FC<{
  open: boolean;
  incident: OmIncident | null;
  prefill: Prefill;
  contract: OmContract;
  names: Map<string, string>;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, incident, prefill, contract, names, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    const first = contract.stations[0];
    form.setFieldsValue({
      station: incident ? `${incident.provider}:${incident.stationId}` : first ? `${first.provider}:${first.stationId}` : undefined,
      category: incident?.category ?? 'major',
      title: incident?.title ?? '',
      detectedAt: incident ? toPicker(incident.detectedAt) : nowPicker(),
      endedAt: toPicker(incident?.endedAt ?? null),
      cause: incident?.cause ?? '',
      customerNotifiedAt: prefill.customerNotifiedAt ? nowPicker() : toPicker(incident?.customerNotifiedAt ?? null),
      notifiedVia: incident?.notifiedVia ?? '',
      arrivedAt: prefill.arrivedAt ? nowPicker() : toPicker(incident?.arrivedAt ?? null),
      arrivalNotNeeded: incident?.arrivalNotNeeded ?? false,
      resolvedAt: prefill.resolvedAt ? nowPicker() : toPicker(incident?.resolvedAt ?? null),
      notes: incident?.notes ?? '',
    });
  }, [open, incident, prefill, contract, form]);

  const submit = async () => {
    const v = await form.validateFields();
    const [provider, ...rest] = String(v.station).split(':');
    setSaving(true);
    try {
      await omService.saveIncident({
        ...(incident ? { id: incident.id } : { provider, stationId: rest.join(':'), contractId: contract.id, stationName: names.get(v.station) ?? null }),
        category: v.category,
        title: v.title || null,
        detectedAt: fromPicker(v.detectedAt)!,
        endedAt: fromPicker(v.endedAt),
        cause: v.cause || null,
        customerNotifiedAt: fromPicker(v.customerNotifiedAt),
        notifiedVia: v.notifiedVia || null,
        arrivedAt: fromPicker(v.arrivedAt),
        arrivalNotNeeded: Boolean(v.arrivalNotNeeded),
        resolvedAt: fromPicker(v.resolvedAt),
        notes: v.notes || null,
      });
      message.success('Saqlandi');
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const picker = <DatePicker showTime={{ format: 'HH:mm' }} format="DD.MM.YYYY HH:mm" style={{ width: '100%' }} />;

  return (
    <Modal
      open={open}
      title={incident ? `Hodisa #${incident.id}` : "Hodisa qo'shish"}
      onCancel={onClose}
      onOk={submit}
      okText="Saqlash"
      cancelText="Bekor qilish"
      confirmLoading={saving}
      destroyOnClose
    >
      <Form form={form} layout="vertical">
        <Form.Item name="station" label="Obyekt" rules={[{ required: true }]}>
          <Select
            disabled={!!incident}
            options={contract.stations.map((s) => ({ value: `${s.provider}:${s.stationId}`, label: names.get(`${s.provider}:${s.stationId}`) ?? s.stationId }))}
          />
        </Form.Item>
        <Form.Item name="category" label="Toifa (muddatlar shunga qarab hisoblanadi)" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(INCIDENT_UZ) as IncidentCategory[]).map((k) => ({ value: k, label: `${INCIDENT_UZ[k].label}: ${INCIDENT_UZ[k].clocks}` }))}
          />
        </Form.Item>
        <Form.Item name="title" label="Qisqacha">
          <Input />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="detectedAt" label="Aniqlangan" rules={[{ required: true }]}>{picker}</Form.Item>
          <Form.Item name="endedAt" label="Ishlab chiqarish tiklangan">{picker}</Form.Item>
        </Space>
        <Form.Item name="cause" label="Sabab (masofaviy tashxis)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }}>
          <Form.Item name="customerNotifiedAt" label="Mijozga xabar berilgan vaqt">{picker}</Form.Item>
          <Form.Item name="notifiedVia" label="Qanday (isbot uchun)">
            <AutoComplete options={['E-mail', 'Telefon', 'Telegram', 'Rasmiy xat'].map((value) => ({ value }))} />
          </Form.Item>
        </Space>
        <Space style={{ width: '100%' }} styles={{ item: { flex: 1 } }} align="end">
          <Form.Item name="arrivedAt" label="Obyektga yetib kelgan vaqt">{picker}</Form.Item>
          <Form.Item name="arrivalNotNeeded" valuePropName="checked">
            <Checkbox>Borish kerak bo'lmadi</Checkbox>
          </Form.Item>
        </Space>
        <Form.Item name="resolvedAt" label="Tuzatilgan vaqt">{picker}</Form.Item>
        <Form.Item name="notes" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
};
