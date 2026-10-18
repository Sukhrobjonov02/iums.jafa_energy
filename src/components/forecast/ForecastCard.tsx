import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Segmented, Space, Spin, Statistic, Tag, Tooltip, Typography } from 'antd';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip as ChartTooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CloudOutlined, InfoCircleOutlined, ThunderboltOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import forecastService from '../../service/forecast.service';
import type { ForecastDay, ForecastHistoryDay, ForecastSummary } from '../../types/forecast';
import { formatKwh, formatUzs, formatUzsShort } from '../../helpers/currency';

const { Text } = Typography;

/** WMO weather codes, grouped to the handful of words that matter for a solar day. */
const weatherLabel = (code?: number): string => {
  if (code === undefined || code === null) return '';
  if (code === 0) return 'Ochiq';
  if (code <= 2) return 'Kam bulut';
  if (code === 3) return 'Bulutli';
  if (code <= 48) return 'Tuman';
  if (code <= 67) return 'Yomg\'ir';
  if (code <= 77) return 'Qor';
  if (code <= 82) return 'Jala';
  return 'Momaqaldiroq';
};

interface ForecastCardProps {
  /** Compact drops the chart, for the narrow mobile monitor page. */
  compact?: boolean;
}

const ForecastCard: React.FC<ForecastCardProps> = ({ compact = false }) => {
  const [summary, setSummary] = useState<ForecastSummary | null>(null);
  const [history, setHistory] = useState<ForecastHistoryDay[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [days, setDays] = useState<7 | 15>(7);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    forecastService
      .getSummary()
      .then((data) => {
        if (!cancelled) {
          setSummary(data);
          setFailed(false);
        }
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Past days are fetched separately and allowed to fail on their own: the forecast itself is
  // useful without them, and this section is empty for the first day after the feature ships.
  useEffect(() => {
    let cancelled = false;
    forecastService
      .getHistory(30)
      .then((rows) => {
        if (!cancelled) setHistory(rows);
      })
      .catch(() => {
        if (!cancelled) setHistory([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const historyData = useMemo(
    () =>
      history.map((d) => ({
        kun: dayjs(d.date).format('DD MMM'),
        Bashorat: Math.round(d.predictedKwh),
        Haqiqiy: Math.round(d.actualKwh),
        xato: d.errorPct,
        stansiya: d.stations,
      })),
    [history],
  );

  const totals = summary ? (days === 7 ? summary.next7 : summary.next15) : null;

  const chartData = useMemo(() => {
    if (!summary) return [];
    return summary.perDay.slice(0, days).map((d: ForecastDay) => ({
      kun: dayjs(d.date).format('DD MMM'),
      kWh: Math.round(d.predictedKwh ?? 0),
      somm: Math.round(d.predictedRevenueUzs ?? 0),
      obHavo: weatherLabel(d.weatherCode),
      harorat: d.tempMax,
      ishonch: d.confidence,
    }));
  }, [summary, days]);

  const header = (
    <Space>
      <CloudOutlined />
      Ob-havo bo'yicha prognoz
    </Space>
  );

  // Two different numbers, and the card must not blur them. mapePct is how far yesterday's
  // forecast for today actually landed from the truth; it only exists once a forecast has
  // been scored against a finished day. modelErrorPct is what the formula gets wrong with
  // the weather known exactly, so it is available at once and is the floor for the other.
  const acc = summary?.accuracy;
  const accuracyTag = !acc ? null : acc.measuredDays > 0 && acc.mapePct !== null ? (
    <Tooltip
      title={
        `Oxirgi ${acc.windowDays} kunda ${acc.measuredDays} ta kun tekshirildi, stansiya ishlagan kunlar bo'yicha. ` +
        (acc.breakdownPoints
          ? `${acc.breakdownPoints} ta stansiya-kun buzilish sababli hisobga olinmadi (stansiya va'da qilinganining ` +
            `choragidan kam bergan; buni ob-havo prognozi oldindan bila olmaydi)` +
            (acc.mapeAllPct !== null && acc.mapeAllPct !== undefined ? `, ular bilan xato ${acc.mapeAllPct}%` : '') +
            '. '
          : '') +
        `O'rtacha ${acc.biasPct !== null && acc.biasPct > 0 ? 'yuqori' : 'past'} bashorat: ` +
        `${acc.biasPct !== null ? Math.abs(acc.biasPct).toFixed(1) : '-'}%.` +
        (acc.modelErrorPct !== null ? ` Formulaning o'z xatosi ${acc.modelErrorPct}%.` : '')
      }
    >
      <Tag color={acc.mapePct <= 10 ? 'green' : acc.mapePct <= 20 ? 'gold' : 'red'}>
        O'rtacha xato {acc.mapePct}%
      </Tag>
    </Tooltip>
  ) : (
    <Tooltip
      title={
        "Prognoz aniqligi u tekshiriladigan kun kelgandan keyin o'lchanadi, ya'ni ertadan boshlab to'planadi." +
        (acc.modelErrorPct !== null
          ? ` Hozircha faqat formulaning o'z xatosi ma'lum: ob-havo aniq bo'lganda ham u ${acc.modelErrorPct}% atrofida adashadi.`
          : '')
      }
    >
      <Tag icon={<InfoCircleOutlined />}>
        {acc.modelErrorPct !== null
          ? `Formula xatosi ${acc.modelErrorPct}%`
          : 'Aniqlik hali o\'lchanmagan'}
      </Tag>
    </Tooltip>
  );

  if (loading) {
    return (
      <Card title={header}>
        <div style={{ textAlign: 'center', padding: '32px 0' }}>
          <Spin />
        </div>
      </Card>
    );
  }

  if (failed || !summary || summary.stations === 0 || summary.perDay.length === 0) {
    return (
      <Card title={header}>
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            failed
              ? 'Prognozni olishda xato. Keyinroq urinib ko\'ring.'
              : 'Prognoz hali hisoblanmagan. U har kuni soat 5:00 va 17:00 da yangilanadi.'
          }
        />
      </Card>
    );
  }

  return (
    <Card
      title={header}
      extra={
        <Segmented
          value={days}
          onChange={(v) => setDays(v as 7 | 15)}
          options={[
            { label: '7 kun', value: 7 },
            { label: '15 kun', value: 15 },
          ]}
        />
      }
    >
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Statistic
            title={`${days} kunda ishlab chiqarish`}
            value={formatKwh(totals?.kwh)}
            prefix={<ThunderboltOutlined style={{ color: '#faad14' }} />}
          />
        </Col>
        <Col xs={24} sm={8}>
          {/* Shortened so the tile holds a 15-day total; the exact figure is one hover away. */}
          <Tooltip title={formatUzs(totals?.revenueUzs)}>
            <div>
              <Statistic
                title={`${days} kunda daromad`}
                value={formatUzsShort(totals?.revenueUzs)}
                valueStyle={{ color: '#389e0d' }}
              />
            </div>
          </Tooltip>
        </Col>
        <Col xs={24} sm={8}>
          <Statistic
            title="Kuniga o'rtacha"
            value={formatKwh((totals?.kwh ?? 0) / Math.max(1, totals?.days ?? 1))}
          />
        </Col>
      </Row>

      <Space size={[6, 6]} wrap style={{ marginTop: 14 }}>
        <Tag>{formatUzs(summary.pricePerKwhUzs)}/kWh</Tag>
        <Tag color="blue">{summary.stations} ta stansiya</Tag>
        {days === 15 && <Tag color="gold">8-15 kun aniqligi pastroq</Tag>}
        {summary.issuedAt && (
          <Tag>Hisoblangan: {dayjs(summary.issuedAt).format('DD MMM HH:mm')}</Tag>
        )}
        {summary.coordinatesApproximate && (
          <Tooltip title="Stansiyalarning aniq koordinatasi kiritilmagan, Toshkent markazi olingan.">
            <Tag icon={<InfoCircleOutlined />}>Koordinata taxminiy</Tag>
          </Tooltip>
        )}
        {accuracyTag}
      </Space>

      {summary.anyDefaultRatio && (
        <Alert
          style={{ marginTop: 14 }}
          type="info"
          showIcon
          message="Ba'zi stansiyalar uchun taxminiy koeffitsiyent ishlatilgan"
          description="Stansiyaning o'z tarixi yetarli bo'lsa, koeffitsiyent uning haqiqiy ishlab chiqarishidan o'lchanadi. Yetarli bo'lmaganda sozlamadagi qiymat olinadi va bu raqam haqiqatdan farq qilishi mumkin."
        />
      )}

      {!compact && (
        <div style={{ marginTop: 18, height: 240 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="kun" tick={{ fontSize: 12 }} />
              {/* Bare numbers on the axis: the unit is in the tooltip and the tile above,
                  and a " kWh" suffix on every tick wraps the labels onto two lines. */}
              <YAxis tick={{ fontSize: 12 }} width={46} tickFormatter={(v: number) => String(Math.round(v))} />
              <ChartTooltip
                formatter={(value: any, name: string) =>
                  name === 'kWh' ? [`${value} kWh`, 'Ishlab chiqarish'] : [value, name]
                }
                labelFormatter={(label: string) => {
                  const row = chartData.find((r) => r.kun === label);
                  return row ? `${label} - ${row.obHavo}, ${row.harorat ?? '-'} C` : label;
                }}
              />
              <Bar dataKey="kWh" fill="#52c41a" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* What the forecast promised for days that have since finished, beside what actually
          happened. The single average-error tag says how far out the model is; this says on which
          days and in which direction, which is the part someone can act on. */}
      {!compact && historyData.length > 0 && (
        <div style={{ marginTop: 22 }}>
          <Space size={[6, 6]} wrap style={{ marginBottom: 8 }}>
            <Text strong>O'tgan kunlar: bashorat va haqiqat</Text>
            <Tag>{historyData.length} kun</Tag>
            {summary.accuracy?.mapePct !== null && summary.accuracy?.mapePct !== undefined && (
              <Tag color={summary.accuracy.mapePct <= 10 ? 'green' : summary.accuracy.mapePct <= 20 ? 'gold' : 'red'}>
                O'rtacha xato {summary.accuracy.mapePct}%
              </Tag>
            )}
          </Space>
          <div style={{ height: 220 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={historyData} margin={{ top: 4, right: 8, left: 0, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="kun" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} width={46} tickFormatter={(v: number) => String(Math.round(v))} />
                <ChartTooltip
                  formatter={(value: any, name: string) => [`${value} kWh`, name]}
                  labelFormatter={(label: string) => {
                    const row = historyData.find((r) => r.kun === label);
                    if (!row) return label;
                    const yon = row.xato > 0 ? 'yuqori' : 'past';
                    return `${label} - bashorat ${Math.abs(row.xato)}% ${yon}, ${row.stansiya} ta stansiya`;
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Bashorat" fill="#8c8c8c" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Haqiqiy" fill="#52c41a" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <Text type="secondary" style={{ fontSize: 12, display: 'block', marginTop: 10 }}>
        Ustunlar kunlik ishlab chiqarish, kWh. Prognoz Open-Meteo quyosh radiatsiyasi modeliga asoslanadi. Daromad narxi sozlamada
        belgilanadi va hozir {formatUzs(summary.pricePerKwhUzs)} / kWh.
      </Text>
    </Card>
  );
};

export default ForecastCard;
