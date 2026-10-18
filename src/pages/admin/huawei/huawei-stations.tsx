import React, { useEffect, useState } from "react";
import {
  Alert,
  Card,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
  Typography,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  huaweiService,
  type HuaweiAlarmRow,
  type HuaweiDeviceRow,
  type HuaweiInverterLatest,
  type HuaweiMeterLatest,
  type HuaweiStateKind,
  type HuaweiStationRow,
  type HuaweiSyncRun,
} from "../../../service/huawei.service";
import { formatKwh } from "../../../helpers/currency";
import StationInsightCard from "../../../components/forecast/StationInsightCard";

/** Stored figures arrive as numeric strings. */
const num = (v: string | number | null | undefined): number | null => (v === null || v === undefined || v === "" ? null : Number(v));

const { Text } = Typography;
const TASHKENT_MS = 5 * 3_600_000;

/** Tashkent wall time whatever the viewer's own clock is set to: "15.10 14:30". */
const formatTime = (iso: string | null): string => {
  if (!iso) return "—";
  const d = new Date(new Date(iso).getTime() + TASHKENT_MS).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};

const DEVICE_TYPE: Record<number, string> = {
  1: "Invertor",
  38: "Invertor",
  62: "Dongle",
  47: "Hisoblagich",
  17: "Hisoblagich",
  39: "Batareya",
};

const LEVEL: Record<number, { text: string; color: string }> = {
  1: { text: "Jiddiy", color: "red" },
  2: { text: "Muhim", color: "volcano" },
  3: { text: "Kichik", color: "orange" },
  4: { text: "Ogohlantirish", color: "gold" },
};

/** Inverter states grouped as the backend does (SmartPVMS reference, Table 5-1). */
const STATE: Record<HuaweiStateKind, { text: string; color: string }> = {
  "on-grid": { text: "Tarmoqda", color: "green" },
  standby: { text: "Kutish", color: "default" },
  starting: { text: "Ishga tushmoqda", color: "blue" },
  shutdown: { text: "To'xtagan", color: "red" },
  scheduling: { text: "Tarmoq boshqaruvi", color: "blue" },
  testing: { text: "Tekshiruv", color: "blue" },
  "comm-lost": { text: "Aloqa yo'q", color: "orange" },
  unknown: { text: "Noma'lum", color: "default" },
};

const RUN_STATUS: Record<string, { text: string; color: string }> = {
  success: { text: "muvaffaqiyatli", color: "green" },
  skipped: { text: "kvota kutilmoqda", color: "gold" },
  failed: { text: "xato", color: "red" },
};

const fixed = (v: number | null | undefined, digits: number, unit: string) =>
  v === null || v === undefined ? "—" : `${v.toFixed(digits)} ${unit}`;

const isInverter = (d: HuaweiDeviceRow) => d.devTypeId === 1 || d.devTypeId === 38;

const latestCell = (d: HuaweiDeviceRow) => {
  if (!d.latest) return <Text type="secondary">—</Text>;
  if (isInverter(d)) {
    const l = d.latest as HuaweiInverterLatest;
    const state = STATE[l.stateKind] ?? STATE.unknown;
    return (
      <Space size={4} wrap>
        <Tooltip title={l.stateLabel ? `${l.stateLabel} (${l.inverterState})` : undefined}>
          <Tag color={state.color}>{state.text}</Tag>
        </Tooltip>
        <Text>{fixed(l.activePower, 2, "kW")}</Text>
        <Tooltip title="Ichki harorat; faqat tarmoqqa ishlayotganda o'lchanadi">
          <Text type="secondary">{fixed(l.temperature, 1, "°C")}</Text>
        </Tooltip>
        <Tooltip title="Samaradorlik; faqat tarmoqqa ishlayotganda o'lchanadi">
          <Text type="secondary">{fixed(l.efficiency, 1, "%")}</Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(l.readAt)}
        </Text>
      </Space>
    );
  }
  if (d.devTypeId === 47) {
    const l = d.latest as HuaweiMeterLatest;
    return (
      <Space size={4} wrap>
        <Text>{l.activePowerW === null ? "—" : `${(l.activePowerW / 1000).toFixed(2)} kW`}</Text>
        <Tooltip title="Musbat / manfiy aktiv energiya hisoblagichi (yo'nalish datchik qanday o'rnatilganiga bog'liq)">
          <Text type="secondary">
            +{formatKwh(l.positiveKwh, 1)} / −{formatKwh(l.negativeKwh, 1)}
          </Text>
        </Tooltip>
        <Text type="secondary" style={{ fontSize: 12 }}>
          {formatTime(l.readAt)}
        </Text>
      </Space>
    );
  }
  return <Text type="secondary">—</Text>;
};

const capacity = (s: HuaweiStationRow) => {
  const kwp = Number(s.capacityKwp);
  if (s.capacityKwp !== null && kwp > 0) return `${kwp} kWp`;
  if (s.ratedKw !== null)
    return (
      <Tooltip title="FusionSolar'da stansiya quvvati kiritilmagan; invertor modelidan olindi">
        <Text>{s.ratedKw} kW*</Text>
      </Tooltip>
    );
  return "—";
};

const health = (state: number | null) => {
  if (state === 3) return <Tag color="green">Sog'lom</Tag>;
  if (state === 2) return <Tag color="red">Nosoz</Tag>;
  if (state === 1) return <Tag color="default">Aloqa yo'q</Tag>;
  return <Tag>—</Tag>;
};

const HuaweiStations: React.FC = () => {
  const [rows, setRows] = useState<HuaweiStationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [runs, setRuns] = useState<HuaweiSyncRun[] | null>(null);

  useEffect(() => {
    huaweiService
      .getStations()
      .then((data) => setRows(data))
      .catch(() => setFailed(true))
      .finally(() => setLoading(false));
    huaweiService
      .getSyncStatus()
      .then((s) => setRuns(s.recent))
      .catch(() => setRuns([]));
  }, []);

  const realtime = runs?.filter((r) => r.job === "realtime") ?? [];
  const lastRun = realtime[0] ?? null;
  const lastSuccess = realtime.find((r) => r.status === "success") ?? null;

  const columns: ColumnsType<HuaweiStationRow> = [
    {
      title: "Stansiya",
      dataIndex: "name",
      render: (name: string, s) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name}</Text>
          <Text type="secondary" style={{ fontSize: 12 }}>
            {s.plantCode}
            {s.address ? ` · ${s.address}` : ""}
          </Text>
        </Space>
      ),
    },
    {
      title: "Holat",
      dataIndex: "healthState",
      render: (v: number | null) => health(v),
    },
    {
      title: "Alarmlar",
      dataIndex: "activeAlarms",
      render: (alarms?: HuaweiAlarmRow[]) =>
        alarms?.length ? (
          <Tag color="red">{alarms.length} ta faol</Tag>
        ) : (
          <Text type="secondary">yo'q</Text>
        ),
    },
    {
      title: "Hozir",
      dataIndex: "nowKw",
      render: (v: number | null) => (
        <Tooltip title="Invertorlarning so'nggi 30 daqiqadagi quvvati">
          <Text>{fixed(v, 1, "kW")}</Text>
        </Tooltip>
      ),
    },
    {
      title: "Quvvati",
      key: "capacity",
      render: (_: unknown, s) => capacity(s),
    },
    {
      title: "Bugun",
      dataIndex: "dayKwh",
      render: (v: string | null) => formatKwh(v, 1),
    },
    {
      title: "Shu oy",
      dataIndex: "monthKwh",
      render: (v: string | null) => formatKwh(v),
    },
    {
      title: "Shu yil",
      dataIndex: "yearKwh",
      render: (v: string | null) => formatKwh(v),
    },
    {
      title: "Jami",
      dataIndex: "totalKwh",
      render: (v: string | null) => formatKwh(v),
    },
    {
      title: "Yangilangan",
      dataIndex: "kpiAt",
      render: (v: string | null) => (
        <Tooltip title="Huawei'dan oxirgi marta o'qilgan vaqt (Toshkent)">
          <Text type="secondary">{formatTime(v)}</Text>
        </Tooltip>
      ),
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gap: 16,
        gridTemplateColumns: "minmax(0, 1fr)",
      }}
    >
      <Typography.Title level={3} style={{ margin: 0 }}>
        Huawei stansiyalari
      </Typography.Title>
      {runs !== null && (
        <Text type="secondary">
          Realtime: oxirgi ishga tushish{" "}
          {lastRun ? (
            <>
              {formatTime(lastRun.startedAt)}{" "}
              <Tooltip title={lastRun.error ?? undefined}>
                <Tag color={RUN_STATUS[lastRun.status]?.color}>
                  {RUN_STATUS[lastRun.status]?.text ?? lastRun.status}
                </Tag>
              </Tooltip>
            </>
          ) : (
            "—"
          )}
          {lastRun && lastSuccess && lastSuccess !== lastRun && (
            <> · oxirgi muvaffaqiyatli {formatTime(lastSuccess.startedAt)}</>
          )}
        </Text>
      )}
      {failed && (
        <Alert
          type="error"
          showIcon
          message="Ma'lumotni olib bo'lmadi. Sahifani yangilab ko'ring."
        />
      )}
      <Spin spinning={loading}>
        <Card size="small" styles={{ body: { padding: 0 } }}>
          <Table<HuaweiStationRow>
            rowKey="plantCode"
            dataSource={rows}
            columns={columns}
            pagination={false}
            scroll={{ x: 960 }}
            expandable={{
              expandedRowRender: (s) => (
                <div style={{ display: "grid", gap: 12 }}>
                  <StationInsightCard
                    provider="huawei"
                    stationId={s.plantCode}
                    energy={{ todayKwh: num(s.dayKwh), monthKwh: num(s.monthKwh), yearKwh: num(s.yearKwh), totalKwh: num(s.totalKwh) }}
                  />
                  {s.activeAlarms?.length ? (
                    <Table<HuaweiAlarmRow>
                      size="small"
                      rowKey="id"
                      pagination={false}
                      dataSource={s.activeAlarms}
                      columns={[
                        {
                          title: "Alarm",
                          dataIndex: "alarmName",
                          render: (v: string, a) => (
                            <Space direction="vertical" size={0}>
                              <Text strong>{v}</Text>
                              {a.cause && (
                                <Text type="secondary" style={{ fontSize: 12 }}>
                                  {a.cause}
                                </Text>
                              )}
                            </Space>
                          ),
                        },
                        {
                          title: "Daraja",
                          dataIndex: "level",
                          render: (l: number) => (
                            <Tag color={LEVEL[l]?.color}>
                              {LEVEL[l]?.text ?? l}
                            </Tag>
                          ),
                        },
                        {
                          title: "Qurilma",
                          dataIndex: "sn",
                          render: (v: string | null, a) =>
                            v ?? a.devName ?? "—",
                        },
                        {
                          title: "Boshlangan",
                          dataIndex: "raiseTime",
                          render: (v: string) => formatTime(v),
                        },
                        {
                          title: "Tavsiya",
                          dataIndex: "repairSuggestion",
                          render: (v: string | null) => (
                            <Text style={{ fontSize: 12 }}>{v ?? "—"}</Text>
                          ),
                        },
                      ]}
                    />
                  ) : null}
                  <Table
                    size="small"
                    rowKey="id"
                    pagination={false}
                    dataSource={s.devices}
                    columns={[
                      {
                        title: "Qurilma",
                        dataIndex: "devTypeId",
                        render: (t: number) => DEVICE_TYPE[t] ?? `Turi ${t}`,
                      },
                      {
                        title: "Model",
                        dataIndex: "model",
                        render: (v: string | null) => v ?? "—",
                      },
                      {
                        title: "SN",
                        dataIndex: "sn",
                        render: (v: string | null) => v ?? "—",
                      },
                      {
                        title: "Dastur versiyasi",
                        dataIndex: "softwareVersion",
                        render: (v: string | null) => v ?? "—",
                      },
                      {
                        title: "Oxirgi o'lchov",
                        key: "latest",
                        render: (_: unknown, d: HuaweiDeviceRow) => latestCell(d),
                      },
                    ]}
                  />
                </div>
              ),
            }}
          />
        </Card>
      </Spin>
      <Text type="secondary" style={{ fontSize: 13 }}>
        Ma'lumot Huawei FusionSolar'dan har 10 daqiqada, alarmlar har 32
        daqiqada olinadi; stansiya va qurilmalar ro'yxati har 2 soatda
        yangilanadi. Invertor harorati va samaradorligi faqat u tarmoqqa
        ishlayotganda o'lchanadi, kechasi "—" ko'rinadi. "*" belgili quvvat
        invertor modelidan olingan. Alarm 30 daqiqadan ko'p davom etsa, Telegram'ga xabar
        ketadi. Ishlash foizi, harorat va daromad umumiy sahifalarda boshqa
        stansiyalar bilan birga ko'rinadi.
      </Text>
    </div>
  );
};

export default HuaweiStations;
