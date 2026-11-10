import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Col,
  DatePicker,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Segmented,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
  message,
} from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { CheckOutlined, CloseOutlined, DeleteOutlined, EditOutlined, InfoCircleOutlined, PlusOutlined, SearchOutlined, SettingOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { omService } from '../../../service/om.service';
import { availabilityService } from '../../../service/availability.service';
import { useAuth } from '../../../helpers/hooks/useAuth';
import { providerTag } from '../availability/provider-tag';
import type {
  ExcusableCategory,
  OmAvailabilityReport,
  OmContract,
  OmDowntimePeriod,
  OmExcusableEvent,
  OmInverterResult,
  OmStationResult,
} from '../../../types/om';
import type { VendorKey } from '../../../types/availability';

const { Text, Paragraph, Title } = Typography;

const TASHKENT_MS = 5 * 3_600_000;
const tashkentToday = () => new Date(Date.now() + TASHKENT_MS).toISOString().slice(0, 10);

/** "12.10 14:30" in Tashkent time whatever the viewer's clock says. */
const formatTime = (t: number | string): string => {
  const d = new Date(new Date(t).getTime() + TASHKENT_MS).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};
const formatDate = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const formatHours = (minutes: number) =>
  `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 1 }).format(minutes / 60)} soat`;
const formatUzs = (v: number | null) =>
  v === null ? '—' : `${new Intl.NumberFormat('uz-UZ', { maximumFractionDigits: 0 }).format(v)} so'm`;

/** Uzbek names of the Annex 3, Part 2 categories; the contract's English wording is in the tooltip. */
const CATEGORY_UZ: Record<ExcusableCategory, string> = {
  customer: 'Mijoz harakati yoki ko\'rsatmasi',
  third_party_works: 'Mijoz yollagan uchinchi shaxs ishlari',
  no_access: 'Obyektga kirish berilmadi',
  grid: 'Tarmoq: uzilish, cheklov, dispetcher buyrug\'i',
  force_majeure: 'Fors-major',
  soiling: 'Qor, muz, qum yoki ifloslanish',
  third_party_damage: 'Uchinchi shaxs shikast yetkazgan',
  ambient: 'Ob-havo ruxsat etilgan chegaradan tashqari',
  manufacturer: 'Ishlab chiqaruvchi yordami kerak',
  communication: 'Monitoring yoki aloqa uzilishi',
  spare_parts: 'Ehtiyot qism mijoz tufayli kechikdi',
  scheduled: 'Kelishilgan rejali to\'xtash',
  epc_defect: 'EPC yoki zavod nuqsoni',
  suspension: 'Xizmat qonuniy to\'xtatilgan',
};

const STATUS_UZ: Record<OmExcusableEvent['customerStatus'], { label: string; color: string }> = {
  pending: { label: 'Mijoz tasdig\'i kutilmoqda', color: 'gold' },
  accepted: { label: 'Mijoz tasdiqlagan', color: 'green' },
  disputed: { label: 'Mijoz rad etgan (hisobga olinmaydi)', color: 'red' },
};

const pctColor = (pct: number | null, gal: number) =>
  pct === null ? '#bfbfbf' : pct >= gal ? '#047857' : pct >= gal - 2 ? '#d48806' : '#cf1322';

type Period = 'month' | 'last-month' | 'year' | 'custom';

interface StationOption {
  provider: VendorKey;
  stationId: string;
  name: string;
}

const key = (s: { provider: string; stationId: string }) => `${s.provider}:${s.stationId}`;

/** Tashkent wall time from the picker, as an instant. */
const fromPicker = (d: Dayjs) => `${d.format('YYYY-MM-DDTHH:mm')}:00+05:00`;
const toPicker = (iso: string) => dayjs(new Date(new Date(iso).getTime() + TASHKENT_MS).toISOString().slice(0, 16));

const PeriodsTable: React.FC<{ periods: OmDowntimePeriod[]; labels: Record<ExcusableCategory, string> }> = ({ periods, labels }) =>
  periods.length ? (
    <Table<OmDowntimePeriod>
      size="small"
      rowKey={(p) => `${p.start}`}
      dataSource={[...periods].sort((a, b) => b.start - a.start)}
      pagination={periods.length > 8 ? { pageSize: 8, size: 'small' } : false}
      columns={[
        { title: 'Boshlandi', dataIndex: 'start', width: 110, render: (v: number) => formatTime(v) },
        { title: 'Tugadi', dataIndex: 'end', width: 110, render: (v: number) => formatTime(v) },
        { title: "To'xtash", dataIndex: 'downMinutes', width: 100, render: (v: number) => formatHours(v) },
        {
          title: 'Hisobi',
          dataIndex: 'category',
          width: 260,
          render: (c: ExcusableCategory | null, p) =>
            c ? (
              <Tooltip title={labels[c]}>
                <Tag color="green">Uzrli: {CATEGORY_UZ[c]}</Tag>
              </Tooltip>
            ) : (
              <Space size={4}>
                <Tag color="red">JAFA hisobiga</Tag>
                {p.silent && <Tag>Aloqa yo'q</Tag>}
              </Space>
            ),
        },
        {
          title: 'Hisoblagich',
          dataIndex: 'counter',
          width: 230,
          render: (c: OmDowntimePeriod['counter'], p) => {
            if (!p.silent || !c) return null;
            if (!c.known) return <Text type="secondary">hisoblagich ma'lumoti yo'q</Text>;
            return (
              <Tooltip
                title={
                  c.mixed
                    ? "Bu oraliqda bir nechta ko'rsatkich kelgan, shuning uchun hisoblagich bo'yicha baholanmadi."
                    : "Ma'lumot kelmagan vaqtda energiya hisoblagichi qancha o'sgani va quyoshga qarab qancha kutilgani. Kutilganning 70% idan kam bo'lsa, to'xtash hisoblanadi."
                }
              >
                <Text type="secondary" style={{ fontSize: 12 }}>
                  +{c.producedKwh} kWh / kutilgan {c.expectedKwh} kWh{c.mixed ? ' (aralash)' : ''}
                </Text>
              </Tooltip>
            );
          },
        },
        {
          title: 'Vendor alarmi',
          dataIndex: 'causes',
          render: (v: string[]) => (v.length ? v.join(', ') : <Text type="secondary">alarm yo'q</Text>),
        },
      ]}
    />
  ) : (
    <Text type="secondary">To'xtash bo'lmagan</Text>
  );

const InverterBlock: React.FC<{ inv: OmInverterResult; labels: Record<ExcusableCategory, string>; gal: number }> = ({ inv, labels, gal }) => (
  <div style={{ display: 'grid', gap: 8 }}>
    <Space wrap size={[12, 4]}>
      <Text strong>Invertor {inv.sn}</Text>
      <Tag>{inv.dcKwp} kWp</Tag>
      <Text strong style={{ color: pctColor(inv.availabilityPct, gal) }}>
        {inv.availabilityPct === null ? '—' : `${inv.availabilityPct.toFixed(2)}%`}
      </Text>
      <Text type="secondary">
        foydali vaqt {formatHours(inv.usefulMinutes)}, to'xtash {formatHours(inv.downMinutes)}, shundan uzrli {formatHours(inv.excludedMinutes)}
        {inv.noDataMinutes ? `, ma'lumot yo'q ${formatHours(inv.noDataMinutes)}` : ''}
      </Text>
      {inv.producedSilentlyMinutes > 0 && (
        <Tooltip title="Bu vaqtda invertordan ma'lumot kelmagan (internet yoki datalogger uzilgan), lekin energiya hisoblagichi o'sgan. Demak invertor ishlagan, bu vaqt to'xtash hisoblanmaydi.">
          <Tag color="blue">aloqa yo'q, lekin ishlagan: {formatHours(inv.producedSilentlyMinutes)}</Tag>
        </Tooltip>
      )}
    </Space>
    <PeriodsTable periods={inv.periods} labels={labels} />
  </div>
);

const ContractModal: React.FC<{
  open: boolean;
  contract: OmContract | null;
  stations: StationOption[];
  onClose: () => void;
  onSaved: (c: OmContract) => void;
}> = ({ open, contract, stations, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (contract) {
      form.setFieldsValue({
        ...contract,
        serviceStartDate: dayjs(contract.serviceStartDate),
        stationKeys: contract.stations.map(key),
        emails: (contract.customerContacts?.emails ?? []).join(', '),
        telegram: (contract.customerContacts?.telegramChatIds ?? []).join(', '),
      });
    } else {
      form.setFieldsValue({ galPct: 97, ldRatePct: 0.5, ldCapPct: 10, bonusThresholdPct: 99, bonusRatePct: 0.3, bonusCapPct: 3, irradianceThresholdWm2: 75 });
    }
  }, [open, contract, form]);

  const submit = async () => {
    const v = await form.validateFields();
    const previous = new Map((contract?.stations ?? []).map((s) => [key(s), s]));
    const list = (v.stationKeys as string[]).map((k) => {
      const [provider, ...rest] = k.split(':');
      return previous.get(k) ?? { provider: provider as VendorKey, stationId: rest.join(':') };
    });
    const split = (s?: string) => (s ?? '').split(',').map((x) => x.trim()).filter(Boolean);
    setSaving(true);
    try {
      const saved = await omService.saveContract({
        id: contract?.id,
        name: v.name,
        customerName: v.customerName || null,
        contractNumber: v.contractNumber || null,
        serviceStartDate: (v.serviceStartDate as Dayjs).format('YYYY-MM-DD'),
        stations: list,
        annualPriceUzs: v.annualPriceUzs ?? null,
        galPct: v.galPct,
        ldRatePct: v.ldRatePct,
        ldCapPct: v.ldCapPct,
        bonusThresholdPct: v.bonusThresholdPct,
        bonusRatePct: v.bonusRatePct,
        bonusCapPct: v.bonusCapPct,
        irradianceThresholdWm2: v.irradianceThresholdWm2,
        customerContacts: { emails: split(v.emails), telegramChatIds: split(v.telegram) },
      });
      message.success('Saqlandi');
      onSaved(saved);
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Saqlab bo\'lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={contract ? 'Shartnomani tahrirlash' : 'Yangi O&M shartnomasi'} onCancel={onClose} onOk={submit} confirmLoading={saving} width={720} okText="Saqlash" cancelText="Bekor qilish">
      <Form form={form} layout="vertical">
        <Row gutter={12}>
          <Col xs={24} md={12}>
            <Form.Item name="name" label="Nomi" rules={[{ required: true }]}>
              <Input placeholder="Masalan: Kontinent O&M" />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="customerName" label="Mijoz">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="contractNumber" label="Shartnoma raqami">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="serviceStartDate" label="Xizmat boshlangan sana (3.2-band)" rules={[{ required: true }]}>
              <DatePicker style={{ width: '100%' }} format="DD.MM.YYYY" />
            </Form.Item>
          </Col>
          <Col span={24}>
            <Form.Item name="stationKeys" label="Obyekt(lar)" rules={[{ required: true }]}>
              <Select
                mode="multiple"
                showSearch
                optionFilterProp="label"
                options={stations.map((s) => ({ value: key(s), label: s.name }))}
                placeholder="Stansiyani tanlang"
              />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="annualPriceUzs" label="Yillik narx, so'm, QQSsiz (9.1-band)">
              <InputNumber style={{ width: '100%' }} min={0} step={1_000_000} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="galPct" label="Kafolat (GAL), %">
              <InputNumber style={{ width: '100%' }} min={0} max={100} />
            </Form.Item>
          </Col>
          <Col xs={12} md={6}>
            <Form.Item name="irradianceThresholdWm2" label="Nurlanish chegarasi, W/m²">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="ldRatePct" label="Jarima, % / 1 punkt">
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="ldCapPct" label="Jarima chegarasi, %">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bonusThresholdPct" label="Bonus boshlanadi, %">
              <InputNumber style={{ width: '100%' }} min={0} max={100} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bonusRatePct" label="Bonus, % / 1 punkt">
              <InputNumber style={{ width: '100%' }} min={0} step={0.1} />
            </Form.Item>
          </Col>
          <Col xs={8}>
            <Form.Item name="bonusCapPct" label="Bonus chegarasi, %">
              <InputNumber style={{ width: '100%' }} min={0} />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="emails" label="Mijozga xabar: email (vergul bilan)">
              <Input />
            </Form.Item>
          </Col>
          <Col xs={24} md={12}>
            <Form.Item name="telegram" label="Mijozga xabar: Telegram chat id (vergul bilan)">
              <Input />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Modal>
  );
};

const EventModal: React.FC<{
  open: boolean;
  event: OmExcusableEvent | null;
  contract: OmContract | null;
  names: Map<string, string>;
  inverters: Map<string, string[]>;
  labels: Record<ExcusableCategory, string>;
  onClose: () => void;
  onSaved: () => void;
}> = ({ open, event, contract, names, inverters, labels, onClose, onSaved }) => {
  const [form] = Form.useForm();
  const [saving, setSaving] = useState(false);
  const station = Form.useWatch('station', form);

  useEffect(() => {
    if (!open) return;
    form.resetFields();
    if (event) {
      form.setFieldsValue({
        ...event,
        station: key(event),
        range: [toPicker(event.startsAt), event.endsAt ? toPicker(event.endsAt) : null],
        evidence: (event.evidence ?? []).join('\n'),
      });
    } else {
      form.setFieldsValue({ customerStatus: 'pending', station: contract?.stations[0] ? key(contract.stations[0]) : undefined });
    }
  }, [open, event, contract, form]);

  const submit = async () => {
    const v = await form.validateFields();
    const [provider, ...rest] = (v.station as string).split(':');
    const [start, end] = v.range as [Dayjs, Dayjs | null];
    setSaving(true);
    try {
      await omService.saveEvent({
        id: event?.id,
        provider: provider as VendorKey,
        stationId: rest.join(':'),
        inverterSn: v.inverterSn || null,
        category: v.category,
        startsAt: fromPicker(start),
        endsAt: end ? fromPicker(end) : null,
        description: v.description || null,
        evidence: String(v.evidence ?? '').split('\n').map((s) => s.trim()).filter(Boolean),
        customerStatus: v.customerStatus,
      });
      message.success('Saqlandi');
      onSaved();
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? 'Saqlab bo\'lmadi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open={open} title={event ? 'Uzrli hodisani tahrirlash' : 'Uzrli hodisa qo\'shish'} onCancel={onClose} onOk={submit} confirmLoading={saving} width={640} okText="Saqlash" cancelText="Bekor qilish">
      <Form form={form} layout="vertical">
        <Form.Item name="station" label="Obyekt" rules={[{ required: true }]}>
          <Select options={(contract?.stations ?? []).map((s) => ({ value: key(s), label: names.get(key(s)) ?? s.stationId }))} />
        </Form.Item>
        <Form.Item name="inverterSn" label="Invertor (bo'sh qolsa butun obyekt)">
          <Select allowClear options={(inverters.get(station) ?? []).map((sn) => ({ value: sn, label: sn }))} />
        </Form.Item>
        <Form.Item name="category" label="Turi (Ilova 3, 2.1)" rules={[{ required: true }]}>
          <Select
            options={(Object.keys(CATEGORY_UZ) as ExcusableCategory[]).map((c) => ({
              value: c,
              label: (
                <Tooltip title={labels[c]} placement="right">
                  {CATEGORY_UZ[c]}
                </Tooltip>
              ),
            }))}
          />
        </Form.Item>
        <Form.Item name="range" label="Davr (Toshkent vaqti; tugashi bo'sh bo'lsa davom etmoqda)" rules={[{ required: true }]}>
          <DatePicker.RangePicker showTime={{ format: 'HH:mm' }} format="DD.MM.YYYY HH:mm" allowEmpty={[false, true]} style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="description" label="Izoh">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="evidence" label="Dalil havolalari (har qatorga bittadan: foto, xat, dispetcher buyrug'i)">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item name="customerStatus" label="Mijoz holati">
          <Select options={Object.entries(STATUS_UZ).map(([value, s]) => ({ value, label: s.label }))} />
        </Form.Item>
      </Form>
    </Modal>
  );
};

const OmPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const [contracts, setContracts] = useState<OmContract[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [period, setPeriod] = useState<Period>('month');
  const [year, setYear] = useState(1);
  const [custom, setCustom] = useState<[Dayjs, Dayjs] | null>(null);
  const [report, setReport] = useState<OmAvailabilityReport | null>(null);
  const [events, setEvents] = useState<OmExcusableEvent[]>([]);
  const [labels, setLabels] = useState<Record<ExcusableCategory, string>>({} as Record<ExcusableCategory, string>);
  const [stationOptions, setStationOptions] = useState<StationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [contractModal, setContractModal] = useState<{ open: boolean; contract: OmContract | null }>({ open: false, contract: null });
  const [eventModal, setEventModal] = useState<{ open: boolean; event: OmExcusableEvent | null }>({ open: false, event: null });
  const [searching, setSearching] = useState(false);

  const contract = contracts.find((c) => c.id === selected) ?? null;

  useEffect(() => {
    Promise.all([omService.contracts(), omService.categories(), availabilityService.getReport()])
      .then(([list, cats, avail]) => {
        setContracts(list);
        setLabels(cats);
        setStationOptions(avail.stations.map((s) => ({ provider: s.provider, stationId: s.stationId, name: s.name })));
        setSelected((cur) => cur ?? list[0]?.id ?? null);
        if (!list.length) setLoading(false);
      })
      .catch(() => {
        setFailed("Ma'lumotni olib bo'lmadi. Sahifani yangilab ko'ring.");
        setLoading(false);
      });
  }, []);

  const range = useMemo((): { year?: number; from?: string; to?: string } => {
    const today = tashkentToday();
    if (period === 'year') return { year };
    if (period === 'custom' && custom) return { from: custom[0].format('YYYY-MM-DD'), to: custom[1].format('YYYY-MM-DD') };
    if (period === 'last-month') {
      const d = dayjs(today).subtract(1, 'month');
      return { from: d.startOf('month').format('YYYY-MM-DD'), to: d.endOf('month').format('YYYY-MM-DD') };
    }
    return { from: `${today.slice(0, 7)}-01`, to: today };
  }, [period, year, custom]);

  const load = useCallback(() => {
    if (!selected) return;
    setLoading(true);
    Promise.all([omService.availability(selected, range), omService.events()])
      .then(([r, ev]) => {
        setReport(r);
        setEvents(ev);
        setFailed(null);
      })
      .catch((e) => setFailed(e?.response?.data?.message ?? "Hisoblab bo'lmadi"))
      .finally(() => setLoading(false));
  }, [selected, range]);

  useEffect(load, [load]);

  const names = useMemo(() => {
    const m = new Map(stationOptions.map((s) => [key(s), s.name]));
    report?.stations.forEach((s) => m.set(key(s), s.name));
    return m;
  }, [stationOptions, report]);
  const inverters = useMemo(() => new Map((report?.stations ?? []).map((s) => [key(s), s.inverters.map((i) => i.sn)])), [report]);
  const contractEvents = useMemo(() => {
    const keys = new Set((contract?.stations ?? []).map(key));
    return events.filter((e) => keys.has(key(e)));
  }, [events, contract]);
  const suggestions = useMemo(() => contractEvents.filter((e) => e.reviewStatus === 'suggested'), [contractEvents]);
  const recorded = useMemo(() => contractEvents.filter((e) => e.reviewStatus !== 'suggested'), [contractEvents]);

  const review = (e: OmExcusableEvent, status: OmExcusableEvent['reviewStatus']) =>
    omService
      .review(e.id, status)
      .then(() => {
        message.success(status === 'confirmed' ? 'Tasdiqlandi, foizga qo\'shildi' : 'Rad etildi, qayta taklif qilinmaydi');
        load();
      })
      .catch(() => message.error("Saqlab bo'lmadi"));

  const search = () => {
    if (!selected) return;
    setSearching(true);
    omService
      .suggest(selected, range)
      .then((r) => {
        if (r.created || r.updated) message.success(`${r.created} ta yangi taklif${r.updated ? `, ${r.updated} ta yangilandi` : ''}`);
        else message.info("Bu davrda tarmoq alarmi bilan to'xtash topilmadi");
        load();
      })
      .catch((e) => message.error(e?.response?.data?.message ?? "Qidirib bo'lmadi"))
      .finally(() => setSearching(false));
  };

  const gal = contract?.galPct ?? 97;
  const s = report?.settlement;
  const excused = report ? report.stations.reduce((n, x) => n + x.excludedMinutes, 0) : 0;
  const down = report ? report.stations.reduce((n, x) => n + x.downMinutes, 0) : 0;

  const stationColumns: ColumnsType<OmStationResult> = [
    {
      title: 'Obyekt',
      dataIndex: 'name',
      render: (n: string, st) => (
        <Space direction="vertical" size={0}>
          <Text strong>{n}</Text>
          <Space size={4}>
            {providerTag(st.provider)}
            <Text type="secondary" style={{ fontSize: 12 }}>
              {st.dcKwp} kWp, {st.inverters.length} ta invertor
            </Text>
          </Space>
        </Space>
      ),
    },
    {
      title: 'Availability',
      dataIndex: 'availabilityPct',
      render: (v: number | null) => <Text strong style={{ color: pctColor(v, gal) }}>{v === null ? '—' : `${v.toFixed(2)}%`}</Text>,
    },
    {
      title: 'Foydali vaqt',
      dataIndex: 'usefulMinutes',
      render: (v: number, st) => (
        <Space direction="vertical" size={0}>
          <Text>{formatHours(v)}</Text>
          {st.producedSilentlyMinutes > 0 && (
            <Tooltip title="Ma'lumot kelmagan, lekin energiya hisoblagichi bo'yicha ishlagan vaqt. To'xtash hisoblanmaydi.">
              <Text type="secondary" style={{ fontSize: 12 }}>aloqasiz ishlagan: {formatHours(st.producedSilentlyMinutes)}</Text>
            </Tooltip>
          )}
        </Space>
      ),
    },
    { title: "To'xtash", dataIndex: 'downMinutes', render: (v: number) => (v ? formatHours(v) : <Text type="secondary">0</Text>) },
    { title: 'Shundan uzrli', dataIndex: 'excludedMinutes', render: (v: number) => (v ? formatHours(v) : <Text type="secondary">0</Text>) },
  ];

  const eventColumns: ColumnsType<OmExcusableEvent> = [
    { title: 'Obyekt', render: (_, e) => (
      <Space direction="vertical" size={0}>
        <Text>{names.get(key(e)) ?? e.stationId}</Text>
        {e.inverterSn && <Text type="secondary" style={{ fontSize: 12 }}>invertor {e.inverterSn}</Text>}
      </Space>
    ) },
    { title: 'Turi', dataIndex: 'category', render: (c: ExcusableCategory) => <Tooltip title={labels[c]}>{CATEGORY_UZ[c]}</Tooltip> },
    { title: 'Davr', render: (_, e) => `${formatTime(e.startsAt)} – ${e.endsAt ? formatTime(e.endsAt) : 'davom etmoqda'}` },
    { title: 'Izoh', dataIndex: 'description', render: (v: string | null, e) => (
      <Space direction="vertical" size={0}>
        <Text>{v ?? ''}</Text>
        {e.evidence?.map((u) => <a key={u} href={u} target="_blank" rel="noreferrer">{u.length > 40 ? `${u.slice(0, 40)}…` : u}</a>)}
      </Space>
    ) },
    { title: 'Mijoz', dataIndex: 'customerStatus', render: (v: OmExcusableEvent['customerStatus']) => <Tag color={STATUS_UZ[v].color}>{STATUS_UZ[v].label}</Tag> },
    { title: 'Kim', dataIndex: 'createdBy', render: (v: string | null, e) => (
      <Space direction="vertical" size={0}>
        <Text type="secondary">{e.source === 'manual' ? v ?? '' : 'avtomatik'}</Text>
        {e.reviewStatus === 'rejected' && <Tag>JAFA rad etgan (hisobga olinmaydi)</Tag>}
      </Space>
    ) },
    ...(canEdit
      ? [{
          title: '',
          width: 90,
          render: (_: unknown, e: OmExcusableEvent) => (
            <Space>
              <Button size="small" icon={<EditOutlined />} onClick={() => setEventModal({ open: true, event: e })} />
              <Popconfirm title="O'chirilsinmi?" onConfirm={() => omService.removeEvent(e.id).then(load)}>
                <Button size="small" danger icon={<DeleteOutlined />} />
              </Popconfirm>
            </Space>
          ),
        }]
      : []),
  ];

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={3} style={{ margin: 0 }}>O&M shartnoma: Availability</Title>
        <Space wrap>
          <Select
            style={{ minWidth: 220 }}
            value={selected ?? undefined}
            placeholder="Shartnoma"
            onChange={setSelected}
            options={contracts.map((c) => ({ value: c.id, label: c.name }))}
          />
          {canEdit && contract && <Button icon={<SettingOutlined />} onClick={() => setContractModal({ open: true, contract })}>Sozlash</Button>}
          {canEdit && <Button type="primary" icon={<PlusOutlined />} onClick={() => setContractModal({ open: true, contract: null })}>Yangi shartnoma</Button>}
        </Space>
      </Space>

      {failed && <Alert type="error" showIcon message={failed} />}

      {!contracts.length && !loading ? (
        <Card>
          <Empty description="Hali shartnoma kiritilmagan. Yangi shartnoma qo'shing: obyekt, xizmat boshlangan sana va yillik narx." />
        </Card>
      ) : (
        <>
          <Space wrap>
            <Segmented<Period>
              value={period}
              onChange={setPeriod}
              options={[
                { label: 'Shu oy', value: 'month' },
                { label: "O'tgan oy", value: 'last-month' },
                { label: 'Shartnoma yili', value: 'year' },
                { label: 'Boshqa davr', value: 'custom' },
              ]}
            />
            {period === 'year' && (
              <Space>
                <Text>Yil</Text>
                <InputNumber min={1} max={30} value={year} onChange={(v) => setYear(v ?? 1)} />
              </Space>
            )}
            {period === 'custom' && (
              <DatePicker.RangePicker format="DD.MM.YYYY" value={custom} onChange={(v) => v && v[0] && v[1] && setCustom([v[0], v[1]])} />
            )}
          </Space>

          <Spin spinning={loading}>
            {report && (
              <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
                <Row gutter={[16, 16]}>
                  <Col xs={12} lg={6}>
                    <Card size="small">
                      <Statistic
                        title={`Availability (kafolat ${gal}%)`}
                        value={report.availabilityPct ?? '—'}
                        suffix={report.availabilityPct !== null ? '%' : undefined}
                        precision={2}
                        valueStyle={{ color: pctColor(report.availabilityPct, gal) }}
                      />
                    </Card>
                  </Col>
                  <Col xs={12} lg={6}>
                    <Card size="small">
                      <Statistic
                        title={
                          <Space size={4}>
                            {s && s.bonusPct > 0 ? 'Bonus (8.3)' : 'Jarima (8.2)'}
                            <Tooltip title="Shartnoma yili uchun hisoblanadi. Oy yoki boshqa davr uchun faqat ma'lumot sifatida.">
                              <InfoCircleOutlined />
                            </Tooltip>
                          </Space>
                        }
                        value={s ? (s.bonusPct > 0 ? formatUzs(s.bonusUzs) : formatUzs(s.ldUzs)) : '—'}
                        valueStyle={{ color: s && s.ldPct > 0 ? '#cf1322' : s && s.bonusPct > 0 ? '#047857' : undefined, fontSize: 20 }}
                      />
                      {s && (
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {s.ldPct > 0 ? `${s.shortfallPts} punkt kam, yillik narxning ${s.ldPct}%` : s.bonusPct > 0 ? `yillik narxning ${s.bonusPct}%` : 'jarima ham, bonus ham yo\'q'}
                        </Text>
                      )}
                    </Card>
                  </Col>
                  <Col xs={12} lg={6}>
                    <Card size="small">
                      <Statistic title="To'xtash / shundan uzrli" value={`${formatHours(down)} / ${formatHours(excused)}`} valueStyle={{ fontSize: 20 }} />
                    </Card>
                  </Col>
                  <Col xs={12} lg={6}>
                    <Card size="small">
                      <Statistic
                        title={report.contractYear ? `${report.contractYear}-shartnoma yili` : 'Davr'}
                        value={`${formatDate(report.from)} – ${formatDate(report.to)}`}
                        valueStyle={{ fontSize: 18 }}
                      />
                    </Card>
                  </Col>
                </Row>

                {report.notes.map((n) => (
                  <Alert key={n} type="warning" showIcon message={n} />
                ))}

                {Object.keys(report.excludedByCategory).length > 0 && (
                  <Card size="small" title="Uzrli vaqt turlari bo'yicha">
                    <Space wrap>
                      {(Object.entries(report.excludedByCategory) as [ExcusableCategory, number][]).map(([c, m]) => (
                        <Tooltip key={c} title={labels[c]}>
                          <Tag color="green">{CATEGORY_UZ[c]}: {formatHours(m)}</Tag>
                        </Tooltip>
                      ))}
                    </Space>
                  </Card>
                )}

                <Card size="small" styles={{ body: { padding: 0 } }}>
                  {report.stations.length ? (
                    <Table<OmStationResult>
                      rowKey={key}
                      dataSource={report.stations}
                      columns={stationColumns}
                      pagination={false}
                      scroll={{ x: 700 }}
                      expandable={{
                        expandedRowRender: (st) => (
                          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
                            {st.inverters.map((i) => <InverterBlock key={i.sn} inv={i} labels={labels} gal={gal} />)}
                          </div>
                        ),
                      }}
                    />
                  ) : (
                    <Empty style={{ padding: 32 }} description="Shartnomada obyekt yo'q" />
                  )}
                </Card>

                <Card
                  size="small"
                  title={
                    <Space>
                      <ThunderboltOutlined />
                      Avtomatik takliflar
                      {suggestions.length > 0 && <Tag color="gold">{suggestions.length}</Tag>}
                    </Space>
                  }
                  extra={
                    canEdit && (
                      <Tooltip title="Tanlangan davrda invertor tarmoq alarmi bergan to'xtashlarni qidiradi. Har soatda oxirgi 3 kun o'zi tekshiriladi.">
                        <Button size="small" icon={<SearchOutlined />} loading={searching} onClick={search}>
                          Shu davrda qidirish
                        </Button>
                      </Tooltip>
                    )
                  }
                  styles={{ body: { padding: suggestions.length ? 0 : 12 } }}
                >
                  {suggestions.length ? (
                    <Table<OmExcusableEvent>
                      rowKey="id"
                      size="small"
                      dataSource={suggestions}
                      pagination={suggestions.length > 10 ? { pageSize: 10 } : false}
                      scroll={{ x: 800 }}
                      columns={[
                        eventColumns[0],
                        eventColumns[1],
                        eventColumns[2],
                        { title: 'Sabab', dataIndex: 'description', render: (v: string | null) => <Text>{v ?? ''}</Text> },
                        ...(canEdit
                          ? [{
                              title: '',
                              width: 230,
                              render: (_: unknown, e: OmExcusableEvent) => (
                                <Space>
                                  <Button size="small" type="primary" icon={<CheckOutlined />} onClick={() => review(e, 'confirmed')}>
                                    Tasdiqlash
                                  </Button>
                                  <Button size="small" icon={<CloseOutlined />} onClick={() => review(e, 'rejected')}>
                                    Rad etish
                                  </Button>
                                </Space>
                              ),
                            }]
                          : []),
                      ]}
                    />
                  ) : (
                    <Text type="secondary">
                      Tasdiqlanishi kerak bo'lgan taklif yo'q. Invertor to'xtagan paytda tarmoq alarmi (kuchlanish yoki chastota me'yordan
                      tashqari, tarmoq yo'q) bo'lsa, tizim bu yerda uzrli hodisa taklif qiladi.
                    </Text>
                  )}
                </Card>

                <Card
                  size="small"
                  title="Uzrli hodisalar (Ilova 3, 2-qism)"
                  extra={canEdit && <Button size="small" icon={<PlusOutlined />} onClick={() => setEventModal({ open: true, event: null })}>Qo'shish</Button>}
                  styles={{ body: { padding: 0 } }}
                >
                  <Table<OmExcusableEvent>
                    rowKey="id"
                    size="small"
                    dataSource={recorded}
                    columns={eventColumns}
                    pagination={recorded.length > 10 ? { pageSize: 10 } : false}
                    scroll={{ x: 800 }}
                    locale={{ emptyText: "Uzrli hodisa kiritilmagan" }}
                  />
                </Card>

                <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
                  Qanday hisoblanadi (Ilova 3): kun {report.slotMinutes} daqiqalik bo'laklarga bo'linadi. Faqat nurlanish {report.thresholdWm2} W/m² dan
                  yuqori bo'lgan bo'laklar "foydali vaqt" hisoblanadi. Nurlanish sun'iy yo'ldosh ma'lumotidan olinadi (Open-Meteo), chunki obyektlarda
                  piranometr yo'q. Har invertor uchun A = (foydali vaqt − to'xtash + uzrli to'xtash) / foydali vaqt. Obyekt va shartnoma bo'yicha
                  natija invertorlarning DC quvvati (kWp) bo'yicha o'rtacha. Vendor hech bir invertordan ma'lumot yubormagan vaqt hisobdan chiqariladi
                  (1.3-band). Butun parkning ko'pi yorug' vaqtda bir vaqtda to'xtasa, bu tarmoq hodisasi deb uzrli hisoblanadi (2.1 d). Mijoz rad etgan
                  uzrli hodisa hisobga olinmaydi. Invertor tarmoq alarmi bergan to'xtashlar avtomatik taklif qilinadi va faqat tasdiqlangandan
                  keyin hisobga olinadi. Invertordan ma'lumot kelmagan (internet uzilgan) vaqt, agar shu oraliqda energiya hisoblagichi
                  kutilganining kamida 70% iga o'sgan bo'lsa, ishlagan deb hisoblanadi.
                </Paragraph>
              </div>
            )}
          </Spin>
        </>
      )}

      <ContractModal
        open={contractModal.open}
        contract={contractModal.contract}
        stations={stationOptions}
        onClose={() => setContractModal({ open: false, contract: null })}
        onSaved={(c) => {
          setContractModal({ open: false, contract: null });
          setContracts((list) => [...list.filter((x) => x.id !== c.id), c].sort((a, b) => a.id - b.id));
          setSelected(c.id);
        }}
      />
      <EventModal
        open={eventModal.open}
        event={eventModal.event}
        contract={contract}
        names={names}
        inverters={inverters}
        labels={labels}
        onClose={() => setEventModal({ open: false, event: null })}
        onSaved={() => {
          setEventModal({ open: false, event: null });
          load();
        }}
      />
    </div>
  );
};

export default OmPage;
