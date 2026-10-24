import React, { useEffect, useMemo, useState } from 'react';
import { Alert, Card, Col, Empty, Row, Segmented, Space, Spin, Statistic, Table, Tag, Tooltip, Typography } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { forecastService } from '../../../service/forecast.service';
import type { StationPlanReport } from '../../../types/forecast';
import type { VendorKey } from '../../../types/availability';
import { providerTag } from '../availability/provider-tag';
import PlanMonthlyChart from './plan-monthly-chart';

const { Text, Paragraph, Title } = Typography;

const pctColor = (pct: number | null) => (pct === null ? 'default' : pct >= 90 ? 'green' : pct >= 70 ? 'gold' : 'red');
/** "2026-10-15" -> "15.10", joined for a tooltip. */
const dateList = (dates?: string[]) => (dates ?? []).map((d) => `${d.slice(8, 10)}.${d.slice(5, 7)}`).join(', ');
const kwh = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(2)} MWh` : `${v.toFixed(0)} kWh`);

/**
 * What each station was sold to produce (panel kWp x the promised yearly yield per kWp, spread by
 * month as in the sizing sheet) against what it actually made. The forecast does not use this
 * promise: tested on 410 station-days it was a worse daily forecast than the weather model.
 */
const PlanPage: React.FC = () => {
  const [windowDays, setWindowDays] = useState<30 | 90>(30);
  const [rows, setRows] = useState<StationPlanReport[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setRows(null);
    setError(null);
    forecastService
      .getPlan(windowDays)
      .then((data) => !cancelled && setRows(data))
      .catch((e) => !cancelled && setError(e?.message ?? 'Yuklab bo\'lmadi'));
    return () => {
      cancelled = true;
    };
  }, [windowDays]);

  const totals = useMemo(() => {
    const r = rows ?? [];
    const promised = r.reduce((a, x) => a + x.promisedKwh, 0);
    const actual = r.reduce((a, x) => a + x.actualKwh, 0);
    return {
      promised,
      actual,
      pct: promised > 0 ? (actual / promised) * 100 : null,
      under: r.filter((x) => x.workingPct !== null && x.workingPct < 70).length,
    };
  }, [rows]);

  const columns: ColumnsType<StationPlanReport> = [
    {
      title: 'Stansiya',
      dataIndex: 'stationName',
      render: (name: string | null, r) => (
        <Space direction="vertical" size={0}>
          <Text strong>{name ?? r.stationId}</Text>
          {providerTag(r.provider as VendorKey)}
        </Space>
      ),
    },
    { title: 'Panel', dataIndex: 'kwp', align: 'right', render: (v: number) => `${v} kWp` },
    {
      title: "Va'da",
      dataIndex: 'yieldKwhPerKwp',
      align: 'right',
      render: (v: number, r) => (
        <Tooltip title={`Yiliga ${kwh(r.yearlyPromiseKwh)}${r.yieldIsDefault ? ". Jadvalda ko'rsatilmagan, odatiy 1400 olindi" : ''}`}>
          <span>
            {v} kWh/kWp{r.yieldIsDefault ? '*' : ''}
          </span>
        </Tooltip>
      ),
    },
    { title: 'Reja (davr)', dataIndex: 'promisedKwh', align: 'right', render: (v: number) => kwh(v) },
    {
      title: 'Haqiqiy',
      dataIndex: 'actualKwh',
      align: 'right',
      render: (v: number, r) =>
        r.actualSource === 'counters' ? (
          <Tooltip title="Invertor hisoblagichining shu davrdagi o'sishi (vendor saytidagi Total Yield farqi)">
            <span>{kwh(v)}</span>
          </Tooltip>
        ) : (
          kwh(v)
        ),
    },
    {
      title: (
        <Tooltip title="Haqiqiy / reja, hamma kunlar hisobga olingan">
          <span>Bajarilishi</span>
        </Tooltip>
      ),
      dataIndex: 'deliveredPct',
      align: 'right',
      sorter: (a, b) => (a.deliveredPct ?? 999) - (b.deliveredPct ?? 999),
      render: (v: number | null) => <Tag color={pctColor(v)}>{v === null ? '—' : `${v}%`}</Tag>,
    },
    {
      title: (
        <Tooltip title="Faqat stansiya ishlagan kunlar: ishlaganda va'da qilinganini beryaptimi">
          <span>Ishlagan kunlarda</span>
        </Tooltip>
      ),
      dataIndex: 'workingPct',
      align: 'right',
      defaultSortOrder: 'ascend',
      sorter: (a, b) => (a.workingPct ?? 999) - (b.workingPct ?? 999),
      render: (v: number | null) => <Tag color={pctColor(v)}>{v === null ? '—' : `${v}%`}</Tag>,
    },
    {
      title: (
        <Tooltip title="Stansiya shu kuni boshqa stansiyalar bergan kWh/kWp ning choragidan kam bergan kunlar (bulutli kun buzilish hisoblanmaydi), yoki vendor 0 ko'rsatgan va invertor hisoblagichi ham o'smagan kunlar">
          <span>Buzilish kunlari</span>
        </Tooltip>
      ),
      dataIndex: 'breakdownDays',
      align: 'right',
      render: (v: number, r) =>
        v > 0 ? (
          <Tooltip title={dateList(r.breakdownDates)}>
            <Tag color="red">
              {v} / {r.days}
            </Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">0 / {r.days}</Text>
        ),
    },
    {
      title: (
        <Tooltip title="Vendor sayti 0 kWh yoki ma'lumot yo'q deb ko'rsatgan, lekin invertor hisoblagichi o'sgan kunlar: stansiya ishlagan, ma'lumot yuboruvchi (datalogger) aloqasi uzilgan">
          <span>Aloqa uzilgan kunlar</span>
        </Tooltip>
      ),
      dataIndex: 'silentDays',
      align: 'right',
      render: (v: number | undefined, r) =>
        v ? (
          <Tooltip title={dateList(r.silentDates)}>
            <Tag color="orange">{v}</Tag>
          </Tooltip>
        ) : r.noDataDays ? (
          <Tooltip title={dateList(r.noDataDates)}>
            <Tag>{r.noDataDays} kun noma'lum</Tag>
          </Tooltip>
        ) : (
          <Text type="secondary">0</Text>
        ),
    },
  ];

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={3} style={{ margin: 0 }}>
          Reja va haqiqat
        </Title>
        <Segmented
          value={windowDays}
          onChange={(v) => setWindowDays(v as 30 | 90)}
          options={[
            { label: '30 kun', value: 30 },
            { label: '90 kun', value: 90 },
          ]}
        />
      </Space>

      {error && <Alert type="error" showIcon message={error} />}

      <Spin spinning={rows === null && !error}>
        <Row gutter={[16, 16]}>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Reja (davr)" value={kwh(totals.promised)} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Haqiqiy" value={kwh(totals.actual)} />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic
                title="Bajarilishi"
                value={totals.pct === null ? '—' : `${totals.pct.toFixed(1)}%`}
                valueStyle={{ color: totals.pct !== null && totals.pct < 70 ? '#cf1322' : undefined }}
              />
            </Card>
          </Col>
          <Col xs={12} md={6}>
            <Card size="small">
              <Statistic title="Ishlaganda ham 70% dan past" value={`${totals.under} ta stansiya`} />
            </Card>
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <PlanMonthlyChart />
        </div>

        <Card size="small" style={{ marginTop: 16 }}>
          {rows && rows.length === 0 ? (
            <Empty description="Rejasi kiritilgan stansiya yo'q" />
          ) : (
            <Table<StationPlanReport>
              rowKey={(r) => `${r.provider}:${r.stationId}`}
              columns={columns}
              dataSource={rows ?? []}
              pagination={false}
              size="middle"
              scroll={{ x: 900 }}
            />
          )}
        </Card>
      </Spin>

      <Paragraph type="secondary" style={{ fontSize: 13, margin: 0 }}>
        Reja: panel quvvati (kWp) × o'rnatishda va'da qilingan yillik ishlab chiqarish (kWh/kWp), oylarga JAFA'ning
        hisob jadvalidagi ulush bo'yicha taqsimlangan (iyulda eng ko'p, dekabrda eng kam). Ma'lumot: Status_V 2.0.xlsx.
        Kunlar vendorning o'z kunlik hisobotidan olinadi va har kuni qayta yuklanadi, shuning uchun bizning tizimimiz
        ishlamagan kunlar (masalan, 16–18 oktabr) ham to'ldiriladi. SolisCloud'da davrning ishlab chiqarishi invertor
        hisoblagichidan olinadi: vendor kunlik hisoboti datalogger aloqasi uzilgan kunlarni 0 ko'rsatadi, hisoblagich esa
        o'sha kunlarda ham ishlab chiqarilganini hisoblaydi. Shunday kunlar "Aloqa uzilgan" deb sanaladi, buzilish emas.
        Buzilish kuni: stansiya shu kuni boshqa stansiyalar bergan kWh/kWp ning choragidan kam bergan kun, shuning uchun
        hammaga bir xil ta'sir qilgan bulutli kun buzilish hisoblanmaydi. "Ishlagan kunlarda" ustuni buzilish kunlarini chiqarib
        tashlaydi: u stansiya ishlaganda va'da qilinganini beryaptimi, degan savolga javob. 70% dan past bo'lsa,
        panellar, string yoki invertor sozlamasini joyida tekshirish kerak. Bu reja prognozga qo'shilmagan: sinovda u
        kunlik prognoz sifatida ob-havo modelidan ancha yomon chiqdi.
      </Paragraph>
    </Space>
  );
};

export default PlanPage;
