import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Segmented, Select, Space, Spin, Typography, message } from 'antd';
import { FileExcelOutlined, FilePdfOutlined, PrinterOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { Link } from 'react-router-dom';
import { omService } from '../../../service/om.service';
import { useAuth } from '../../../helpers/hooks/useAuth';
import type { OmContract, OmPeriodReport, OmReportPeriod } from '../../../types/om';
import { ReportDocument } from './report-document';
import { REPORT_CSS, pageMarginCss, reportDocumentHtml, reportTitle } from './report-style';

const { Title, Text } = Typography;

const TASHKENT_MS = 5 * 3_600_000;
const today = () => dayjs(new Date(Date.now() + TASHKENT_MS).toISOString().slice(0, 10));
/** Reports are written for a finished period, so the page opens on the last month and on yesterday. */
const lastMonth = () => today().subtract(1, 'month').startOf('month');
const yesterday = () => today().subtract(1, 'day');

const PERIODS: { value: OmReportPeriod; label: string }[] = [
  { value: 'day', label: 'Kunlik' },
  { value: 'month', label: 'Oylik' },
  { value: 'year', label: 'Yillik' },
];
const FILE_NAME: Record<OmReportPeriod, string> = { day: 'OM-kunlik-hisobot', month: 'OM-hisobot', year: 'OM-yillik-hisobot' };
/** A running Contract Year is flagged by the report's own warnings. */
const RUNNING: Record<OmReportPeriod, string | null> = {
  day: "Bu kun hali tugamagan: hisobot hozirgacha bo'lgan ma'lumot bilan tuzildi.",
  month: "Bu oy hali tugamagan: hisobot bugungi kungacha bo'lgan ma'lumot bilan tuzildi.",
  year: null,
};

/** The Contract Years that have started, counted from the Service Commencement Date. */
function contractYears(serviceStartDate: string | undefined): { value: number; label: string }[] {
  if (!serviceStartDate) return [];
  const start = dayjs(serviceStartDate);
  const out: { value: number; label: string }[] = [];
  for (let n = 1; n <= 99 && !start.add(n - 1, 'year').isAfter(today(), 'day'); n++) {
    const from = start.add(n - 1, 'year');
    out.push({ value: n, label: `${n}-yil (${from.format('DD.MM.YYYY')} – ${start.add(n, 'year').subtract(1, 'day').format('DD.MM.YYYY')})` });
  }
  return out;
}

/** Prints the report alone from an empty frame, so the app's layout cannot clip or restyle it. */
function printReport(node: HTMLElement, title: string, header: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(reportDocumentHtml(node.outerHTML, pageMarginCss(header)));
  doc.close();
  doc.title = title;
  const win = frame.contentWindow!;
  win.focus();
  win.print();
  setTimeout(() => frame.remove(), 60_000);
}

const OmReportPage: React.FC = () => {
  const { user } = useAuth();
  const canEdit = user?.role !== 'viewer';
  const [contracts, setContracts] = useState<OmContract[]>([]);
  const [selected, setSelected] = useState<number | null>(null);
  const [period, setPeriod] = useState<OmReportPeriod>('month');
  const [month, setMonth] = useState<Dayjs>(lastMonth);
  const [day, setDay] = useState<Dayjs>(yesterday);
  const [year, setYear] = useState<number | null>(null);
  const [report, setReport] = useState<OmPeriodReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [form] = Form.useForm();
  const docRef = useRef<HTMLDivElement>(null);
  const years = useMemo(() => contractYears(contracts.find((c) => c.id === selected)?.serviceStartDate), [contracts, selected]);
  // The running Contract Year unless another was picked; none while the services have not started.
  const yearKey = years.some((y) => y.value === year) ? year : years[years.length - 1]?.value ?? null;
  const key = period === 'day' ? day.format('YYYY-MM-DD') : period === 'month' ? month.format('YYYY-MM') : yearKey === null ? null : String(yearKey);

  useEffect(() => {
    omService
      .contracts()
      .then((list) => {
        setContracts(list);
        setSelected((cur) => cur ?? list[0]?.id ?? null);
        if (!list.length) setLoading(false);
      })
      .catch(() => {
        setFailed("Shartnomalarni olib bo'lmadi. Sahifani yangilab ko'ring.");
        setLoading(false);
      });
  }, []);

  const load = useCallback(() => {
    if (!selected) return;
    if (key === null) {
      setReport(null);
      setFailed("Bu shartnoma bo'yicha xizmat hali boshlanmagan, shuning uchun yillik hisobot yo'q.");
      setLoading(false);
      return;
    }
    setLoading(true);
    omService
      .report(selected, period, key)
      .then((r) => {
        setReport(r);
        setFailed(null);
        form.setFieldsValue({
          maintenance: r.notes.maintenance ?? '',
          spareParts: r.notes.spareParts ?? '',
          hse: r.notes.hse ?? '',
          recommendations: r.notes.recommendations ?? '',
        });
      })
      .catch((e) => {
        setReport(null);
        setFailed(e?.response?.data?.message ?? "Hisobotni tuzib bo'lmadi");
      })
      .finally(() => setLoading(false));
  }, [selected, period, key, form]);

  useEffect(load, [load]);

  const saveNotes = async () => {
    if (!selected || !report) return;
    setSaving(true);
    try {
      const notes = await omService.saveReportNotes(selected, report.key, form.getFieldsValue());
      setReport({ ...report, notes });
      message.success('Saqlandi, hisobotga qo\'shildi');
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const save = (blob: Blob, name: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const pdf = async () => {
    if (!docRef.current || !report) return;
    setPrinting(true);
    try {
      const name = `${FILE_NAME[report.period]} ${report.key} ${report.contractName}`;
      const blob = await omService.reportPdf(reportDocumentHtml(docRef.current.outerHTML), `${reportTitle(report)} · ${report.contractName}`, name);
      save(blob, `${name}.pdf`);
    } catch {
      message.error("PDF ni tayyorlab bo'lmadi. Hozircha \"Chop etish\" tugmasidan foydalaning.");
    } finally {
      setPrinting(false);
    }
  };

  const excel = async () => {
    if (!selected || key === null || !report) return;
    setDownloading(true);
    try {
      save(await omService.reportExcel(selected, period, key), `${FILE_NAME[period]}-${report.key}.xlsx`);
    } catch {
      message.error("Excel faylni olib bo'lmadi");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
      <style>{REPORT_CSS}</style>
      <Space style={{ justifyContent: 'space-between', width: '100%' }} wrap>
        <Title level={3} style={{ margin: 0 }}>O&M hisobot</Title>
        <Space wrap>
          <Select
            style={{ minWidth: 220 }}
            value={selected ?? undefined}
            placeholder="Shartnoma"
            onChange={setSelected}
            options={contracts.map((c) => ({ value: c.id, label: c.name }))}
          />
          <Segmented options={PERIODS} value={period} onChange={(v) => setPeriod(v as OmReportPeriod)} />
          {period === 'day' && (
            <DatePicker allowClear={false} format="DD.MM.YYYY" value={day} onChange={(v) => v && setDay(v)} disabledDate={(d) => d.isAfter(today(), 'day')} />
          )}
          {period === 'month' && (
            <DatePicker
              picker="month"
              allowClear={false}
              format="MM.YYYY"
              value={month}
              onChange={(v) => v && setMonth(v.startOf('month'))}
              disabledDate={(d) => d.isAfter(dayjs(), 'month')}
            />
          )}
          {period === 'year' && (
            <Select style={{ minWidth: 250 }} value={yearKey ?? undefined} placeholder="Shartnoma yili" onChange={setYear} options={years} />
          )}
          <Button icon={<FileExcelOutlined />} loading={downloading} disabled={!report} onClick={excel}>Excel</Button>
          <Button type="primary" icon={<FilePdfOutlined />} loading={printing} disabled={!report} onClick={pdf}>PDF</Button>
          <Button
            icon={<PrinterOutlined />}
            disabled={!report}
            onClick={() => docRef.current && report && printReport(docRef.current, `${FILE_NAME[report.period]} ${report.key} ${report.contractName}`, `${reportTitle(report)} · ${report.contractName}`)}
          >
            Chop etish
          </Button>
        </Space>
      </Space>

      {failed && <Alert type="error" showIcon message={failed} />}

      {!contracts.length && !loading ? (
        <Card><Empty description="Hali shartnoma kiritilmagan. Avval O&M shartnoma sahifasida shartnoma qo'shing." /></Card>
      ) : (
        <Spin spinning={loading}>
          {report && (
            <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'minmax(0, 1fr)' }}>
              {!report.complete && RUNNING[report.period] && <Alert type="info" showIcon message={RUNNING[report.period]} />}
              {report.warnings.map((w) => <Alert key={w} type="warning" showIcon message={w} />)}

              {canEdit && report.period !== 'day' && (
                <Card
                  size="small"
                  title="Qo'lda yoziladigan izoh va tavsiyalar"
                  extra={<Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveNotes}>Saqlash</Button>}
                >
                  <Form form={form} layout="vertical">
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                      <Form.Item name="maintenance" label="3. Texnik xizmat ishlari bo'yicha izoh" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Ishlar ro'yxati jurnaldan o'zi chiqadi. Bu yerga faqat qo'shimcha izoh yoziladi." />
                      </Form.Item>
                      <Form.Item name="spareParts" label="5. Ehtiyot qismlar bo'yicha izoh" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Harakatlar va ombor qoldig'i jurnaldan o'zi chiqadi. Bu yerga faqat qo'shimcha izoh yoziladi." />
                      </Form.Item>
                      <Form.Item name="hse" label="6. HSE hodisalari bo'yicha izoh" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Hodisalar jurnaldan o'zi chiqadi. Bu yerga faqat qo'shimcha izoh yoziladi." />
                      </Form.Item>
                      <Form.Item
                        name="recommendations"
                        label={report.period === 'year' ? "7. Tavsiyalar va keyingi yil texnik xizmat jadvali bo'yicha takliflar" : '7. Tavsiyalar'}
                        style={{ margin: 0 }}
                      >
                        <Input.TextArea
                          autoSize={{ minRows: 3, maxRows: 10 }}
                          placeholder={
                            report.period === 'year'
                              ? 'Masalan: panellarni yuvish aprel va sentabrda; invertorlar ko\'rigi har chorakda'
                              : 'Masalan: obyektdagi internetni barqarorlashtirish tavsiya etiladi'
                          }
                        />
                      </Form.Item>
                    </div>
                  </Form>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Bu matnlar shu {report.period === 'year' ? 'yil' : 'oy'} hisobotining tegishli bo'limlariga chiqadi. Saqlagandan keyin pastdagi hisobotda ko'rinadi.
                    Bajarilgan ishlar, ehtiyot qismlar va HSE hodisalarining o'zi <Link to="/admin/om/journal">O&M jurnallar</Link> sahifasida kiritiladi.
                  </Text>
                </Card>
              )}

              <Card styles={{ body: { padding: 28, overflowX: 'auto' } }}>
                <div style={{ maxWidth: 900, margin: '0 auto' }}>
                  <ReportDocument ref={docRef} report={report} />
                </div>
              </Card>
            </div>
          )}
        </Spin>
      )}
    </div>
  );
};

export default OmReportPage;
