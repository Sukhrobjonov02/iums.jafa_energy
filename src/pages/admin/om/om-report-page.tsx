import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Alert, Button, Card, DatePicker, Empty, Form, Input, Select, Space, Spin, Typography, message } from 'antd';
import { FileExcelOutlined, PrinterOutlined, SaveOutlined } from '@ant-design/icons';
import dayjs, { Dayjs } from 'dayjs';
import { omService } from '../../../service/om.service';
import { useAuth } from '../../../helpers/hooks/useAuth';
import type { OmContract, OmMonthlyReport } from '../../../types/om';
import { ReportDocument } from './report-document';
import { REPORT_CSS } from './report-style';

const { Title, Text } = Typography;

const TASHKENT_MS = 5 * 3_600_000;
/** Reports are written for a finished month, so the page opens on the last one. */
const lastMonth = () => dayjs(new Date(Date.now() + TASHKENT_MS).toISOString().slice(0, 10)).subtract(1, 'month').startOf('month');

/** Prints the report alone from an empty frame, so the app's layout cannot clip or restyle it. */
function printReport(node: HTMLElement, title: string) {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0';
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(`<!doctype html><html><head><meta charset="utf-8"><title></title><style>body{margin:0}${REPORT_CSS}</style></head><body></body></html>`);
  doc.close();
  doc.title = title;
  doc.body.appendChild(doc.importNode(node, true));
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
  const [month, setMonth] = useState<Dayjs>(lastMonth);
  const [report, setReport] = useState<OmMonthlyReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [form] = Form.useForm();
  const docRef = useRef<HTMLDivElement>(null);
  const monthKey = month.format('YYYY-MM');

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
    setLoading(true);
    omService
      .monthlyReport(selected, monthKey)
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
  }, [selected, monthKey, form]);

  useEffect(load, [load]);

  const saveNotes = async () => {
    if (!selected || !report) return;
    setSaving(true);
    try {
      const notes = await omService.saveReportNotes(selected, monthKey, form.getFieldsValue());
      setReport({ ...report, notes });
      message.success('Saqlandi, hisobotga qo\'shildi');
    } catch (e: any) {
      message.error(e?.response?.data?.message ?? "Saqlab bo'lmadi");
    } finally {
      setSaving(false);
    }
  };

  const excel = async () => {
    if (!selected) return;
    setDownloading(true);
    try {
      const blob = await omService.monthlyReportExcel(selected, monthKey);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `OM-hisobot-${monthKey}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
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
        <Title level={3} style={{ margin: 0 }}>O&M oylik hisobot</Title>
        <Space wrap>
          <Select
            style={{ minWidth: 220 }}
            value={selected ?? undefined}
            placeholder="Shartnoma"
            onChange={setSelected}
            options={contracts.map((c) => ({ value: c.id, label: c.name }))}
          />
          <DatePicker
            picker="month"
            allowClear={false}
            format="MM.YYYY"
            value={month}
            onChange={(v) => v && setMonth(v.startOf('month'))}
            disabledDate={(d) => d.isAfter(dayjs(), 'month')}
          />
          <Button icon={<FileExcelOutlined />} loading={downloading} disabled={!report} onClick={excel}>Excel</Button>
          <Button
            type="primary"
            icon={<PrinterOutlined />}
            disabled={!report}
            onClick={() => docRef.current && report && printReport(docRef.current, `OM hisobot ${report.month} ${report.contractName}`)}
          >
            Chop etish / PDF
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
              {!report.complete && (
                <Alert type="info" showIcon message="Bu oy hali tugamagan: hisobot bugungi kungacha bo'lgan ma'lumot bilan tuzildi." />
              )}
              {report.warnings.map((w) => <Alert key={w} type="warning" showIcon message={w} />)}

              {canEdit && (
                <Card
                  size="small"
                  title="Qo'lda to'ldiriladigan bo'limlar"
                  extra={<Button size="small" type="primary" icon={<SaveOutlined />} loading={saving} onClick={saveNotes}>Saqlash</Button>}
                >
                  <Form form={form} layout="vertical">
                    <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))' }}>
                      <Form.Item name="maintenance" label="3. Bajarilgan texnik xizmat ishlari" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Masalan: 12.10 panellar yuvildi; 20.10 invertor ulanishlari tekshirildi" />
                      </Form.Item>
                      <Form.Item name="spareParts" label="5. Ehtiyot qismlar va ombor holati" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Masalan: ehtiyot qism ishlatilmadi" />
                      </Form.Item>
                      <Form.Item name="hse" label="6. Mehnat muhofazasi va atrof-muhit hodisalari" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Masalan: hodisa qayd etilmadi" />
                      </Form.Item>
                      <Form.Item name="recommendations" label="7. Tavsiyalar" style={{ margin: 0 }}>
                        <Input.TextArea autoSize={{ minRows: 3, maxRows: 10 }} placeholder="Masalan: obyektdagi internetni barqarorlashtirish tavsiya etiladi" />
                      </Form.Item>
                    </div>
                  </Form>
                  <Text type="secondary" style={{ fontSize: 12 }}>
                    Bu matnlar shu oy hisobotining tegishli bo'limlariga chiqadi. Saqlagandan keyin pastdagi hisobotda ko'rinadi.
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
