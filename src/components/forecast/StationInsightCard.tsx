import React, { useEffect, useMemo, useState } from 'react';
import { Card, Col, Empty, Row, Space, Spin, Statistic, Tag, Tooltip, Typography } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import dayjs from 'dayjs';
import forecastService from '../../service/forecast.service';
import type { StationForecast, StationInsight } from '../../types/forecast';
import { formatKwh, formatUzs, formatUzsShort } from '../../helpers/currency';

const { Text } = Typography;

/** What the station's own page already knows about its output, in kWh; any of it may be missing. */
export interface StationEnergy {
  todayKwh?: number | null;
  monthKwh?: number | null;
  yearKwh?: number | null;
  totalKwh?: number | null;
}

interface Props {
  provider: 'hopecloud' | 'soliscloud' | 'huawei';
  stationId: string;
  energy?: StationEnergy;
}

const pctColor = (pct: number | null | undefined) =>
  pct === null || pct === undefined ? 'default' : pct >= 90 ? 'green' : pct >= 70 ? 'gold' : 'red';

/**
 * One station's money and forecast, the per-station version of the dashboard's revenue and
 * forecast cards: what its output earned (kWh x the configured price), the next 7 days the weather
 * model expects, and its past days against the forecast and against what it was sold to produce.
 */
const StationInsightCard: React.FC<Props> = ({ provider, stationId, energy }) => {
  const [forecast, setForecast] = useState<StationForecast | null>(null);
  const [insight, setInsight] = useState<StationInsight | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.allSettled([
      forecastService.getStation(provider, stationId, 7),
      forecastService.getStationInsight(provider, stationId, 30),
    ]).then(([f, i]) => {
      if (cancelled) return;
      setForecast(f.status === 'fulfilled' ? f.value : null);
      setInsight(i.status === 'fulfilled' ? i.value : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [provider, stationId]);

  const price = insight?.pricePerKwhUzs ?? (forecast && forecast.totals.kwh > 0 ? forecast.totals.revenueUzs / forecast.totals.kwh : 1000);
  const money = (kwh?: number | null) => (kwh === null || kwh === undefined ? null : kwh * price);

  const nextDays = useMemo(
    () =>
      (forecast?.days ?? []).map((d) => ({
        kun: dayjs(d.date).format('DD.MM'),
        Bashorat: Math.round(d.predictedKwh ?? 0),
      })),
    [forecast],
  );
  const pastDays = useMemo(
    () =>
      (insight?.history ?? []).map((d) => ({
        kun: dayjs(d.date).format('DD.MM'),
        Bashorat: Math.round(d.predictedKwh),
        Haqiqiy: Math.round(d.actualKwh),
        Reja: d.promisedKwh === null ? undefined : Math.round(d.promisedKwh),
        breakdown: d.breakdown,
      })),
    [insight],
  );

  const acc = insight?.accuracy;
  const plan = insight?.plan;

  return (
    <Card title="Daromad va prognoz" style={{ marginBottom: 16 }}>
      <Spin spinning={loading}>
        {energy && (
          <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
            {([
              ['Bugun', energy.todayKwh],
              ['Shu oy', energy.monthKwh],
              ['Shu yil', energy.yearKwh],
              ['Ishga tushgandan beri', energy.totalKwh],
            ] as const).map(([title, kwh]) => (
              <Col xs={12} md={6} key={title}>
                <Statistic title={title} value={money(kwh) === null ? '-' : formatUzsShort(money(kwh))} />
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {kwh === null || kwh === undefined ? '' : formatKwh(kwh, 1)}
                </Text>
              </Col>
            ))}
          </Row>
        )}

        <Row gutter={[16, 16]} style={{ marginBottom: 8 }}>
          <Col xs={24} md={8}>
            <Statistic
              title="7 kunlik prognoz"
              value={forecast ? formatKwh(forecast.totals.kwh) : '-'}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {forecast ? formatUzs(forecast.totals.revenueUzs) : "Bu stansiya uchun prognoz hali yo'q"}
            </Text>
          </Col>
          <Col xs={12} md={8}>
            <Statistic
              title={
                <Tooltip title="Ertangi kun uchun qilingan prognoz haqiqatdan o'rtacha qancha farq qilgan, stansiya ishlagan kunlarda (oxirgi 30 kun)">
                  <span>Prognoz xatosi</span>
                </Tooltip>
              }
              value={acc?.mapePct === null || acc?.mapePct === undefined ? '-' : `${acc.mapePct}%`}
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {acc && acc.measuredDays > 0
                ? `${acc.measuredDays} kun${acc.breakdownPoints ? `, ${acc.breakdownPoints} buzilish kuni chiqarildi` : ''}`
                : "Hali o'lchanmagan"}
            </Text>
          </Col>
          <Col xs={12} md={8}>
            <Statistic
              title={
                <Tooltip title="Ishlagan kunlarda haqiqiy ishlab chiqarish va'da qilinganning necha foizi (panel kWp x yillik kWh/kWp)">
                  <span>Va'dani bajarishi</span>
                </Tooltip>
              }
              valueRender={() =>
                plan ? <Tag color={pctColor(plan.workingPct)} style={{ fontSize: 18, padding: '2px 8px' }}>{plan.workingPct === null ? '-' : `${plan.workingPct}%`}</Tag> : <span>-</span>
              }
            />
            <Text type="secondary" style={{ fontSize: 12 }}>
              {plan ? `${plan.kwp} kWp x ${plan.yieldKwhPerKwp} kWh/kWp` : "Reja kiritilmagan"}
            </Text>
          </Col>
        </Row>

        {nextDays.length > 0 && (
          <div style={{ marginTop: 12 }}>
            <Text strong>Keyingi 7 kun, kWh</Text>
            <div style={{ height: 160 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nextDays} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="kun" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip formatter={(v: any) => [`${v} kWh`, 'Bashorat']} />
                  <Bar dataKey="Bashorat" fill="#1677ff" radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        <div style={{ marginTop: 16 }}>
          <Space size={6} wrap>
            <Text strong>O'tgan kunlar: bashorat va haqiqat, kWh</Text>
            {pastDays.some((d) => d.breakdown) && <Tag color="red">qizil ustun = buzilish kuni</Tag>}
          </Space>
          {pastDays.length === 0 ? (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Hali tekshirilgan kun yo'q" />
          ) : (
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={pastDays} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="kun" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} width={40} />
                  <ChartTooltip formatter={(v: any, name: string) => [`${v} kWh`, name]} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Bar dataKey="Bashorat" fill="#8c8c8c" radius={[3, 3, 0, 0]} />
                  <Bar dataKey="Haqiqiy" fill="#52c41a" radius={[3, 3, 0, 0]}>
                    {pastDays.map((d) => (
                      <Cell key={d.kun} fill={d.breakdown ? '#ff4d4f' : '#52c41a'} />
                    ))}
                  </Bar>
                  {pastDays.some((d) => d.Reja !== undefined) && <Bar dataKey="Reja" fill="#faad14" radius={[3, 3, 0, 0]} />}
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 8 }}>
          Daromad = ishlab chiqarish x {formatUzs(price)} / kWh. Prognoz Open-Meteo quyosh radiatsiyasi modelidan. Reja = Status
          jadvalidagi va'da. Buzilish kuni: stansiya va'dasining choragidan kam bergan kun; prognoz xatosiga qo'shilmaydi.
        </Text>
      </Spin>
    </Card>
  );
};

export default StationInsightCard;
