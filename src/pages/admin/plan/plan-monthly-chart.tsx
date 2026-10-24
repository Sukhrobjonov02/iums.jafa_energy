import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Empty, Select, Space, Spin, Typography } from 'antd';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { forecastService } from '../../../service/forecast.service';
import type { StationPlanYear } from '../../../types/forecast';

const { Text } = Typography;

const MONTHS = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];
const ALL = '__all__';
const fmt = (v: number) => `${Math.round(v).toLocaleString('ru-RU')} kWh`;

/**
 * A station's year month by month, the way JAFA's sizing sheet draws it ("Выработка солнечной
 * электростанции по месяцам"): the promised kWh for each month beside what the vendor measured.
 * "Hammasi" adds up every planned station; a month with no measured figure shows no actual bar.
 */
const PlanMonthlyChart: React.FC = () => {
  const thisYear = new Date().getFullYear();
  const [year, setYear] = useState(thisYear);
  const [rows, setRows] = useState<StationPlanYear[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [station, setStation] = useState<string>(ALL);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    forecastService
      .getPlanMonthly(year)
      .then((data) => !cancelled && setRows(data))
      .catch((e) => !cancelled && setError(e?.message ?? "Yuklab bo'lmadi"));
    return () => {
      cancelled = true;
    };
  }, [year]);

  const keyOf = (r: StationPlanYear) => `${r.provider}:${r.stationId}`;

  const data = useMemo(() => {
    const picked = (rows ?? []).filter((r) => station === ALL || keyOf(r) === station);
    return MONTHS.map((name, i) => {
      let plan = 0;
      let actual: number | null = null;
      for (const r of picked) {
        const m = r.months[i];
        plan += m.planKwh;
        if (m.actualKwh !== null) actual = (actual ?? 0) + m.actualKwh;
      }
      return { name, plan: Math.round(plan), actual: actual === null ? null : Math.round(actual) };
    });
  }, [rows, station]);

  // The year's promise in full; the comparison only over the months that have a measured figure.
  const totals = useMemo(() => {
    const measured = data.filter((d) => d.actual !== null);
    const year = data.reduce((a, d) => a + d.plan, 0);
    const plan = measured.reduce((a, d) => a + d.plan, 0);
    const actual = measured.reduce((a, d) => a + (d.actual ?? 0), 0);
    return { year, plan, actual, months: measured.length, pct: plan > 0 ? (actual / plan) * 100 : null };
  }, [data]);

  return (
    <Card
      size="small"
      title="Oylar bo'yicha ishlab chiqarish"
      extra={
        <Space wrap>
          <Select
            value={station}
            onChange={setStation}
            style={{ minWidth: 220 }}
            showSearch
            optionFilterProp="label"
            options={[
              { value: ALL, label: 'Hammasi' },
              ...(rows ?? []).map((r) => ({ value: keyOf(r), label: r.stationName ?? r.stationId })),
            ]}
          />
          <Select
            value={year}
            onChange={setYear}
            options={[thisYear - 1, thisYear].map((y) => ({ value: y, label: String(y) }))}
          />
        </Space>
      }
    >
      {error && <Alert type="error" showIcon message={error} />}
      <Spin spinning={rows === null && !error}>
        {rows && rows.length === 0 ? (
          <Empty description="Rejasi kiritilgan stansiya yo'q" />
        ) : (
          <>
            <Text type="secondary">
              {year} yil rejasi {fmt(totals.year)}.{' '}
              {totals.months > 0 &&
                `Ma'lumoti bor ${totals.months} oyda: reja ${fmt(totals.plan)}, haqiqiy ${fmt(totals.actual)}` +
                  (totals.pct === null ? '' : ` (${totals.pct.toFixed(1)}%)`)}
            </Text>
            <div style={{ width: '100%', height: 340, marginTop: 8 }}>
              <ResponsiveContainer>
                <BarChart data={data} margin={{ top: 8, right: 8, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" interval={0} tick={{ fontSize: 12 }} />
                  <YAxis tickFormatter={(v: number) => v.toLocaleString('ru-RU')} width={70} />
                  <Tooltip formatter={(v: any, n: any) => [v === null ? '—' : fmt(Number(v)), n]} />
                  <Legend />
                  <Bar dataKey="plan" name="Reja" fill="#bfbfbf" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="actual" name="Haqiqiy" fill="#1677ff" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        )}
      </Spin>
    </Card>
  );
};

export default PlanMonthlyChart;
