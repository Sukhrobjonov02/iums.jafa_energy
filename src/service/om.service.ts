import { apiClient } from './api-client';
import type { ExcusableCategory, OmAvailabilityReport, OmContract, OmExcusableEvent, OmHseEvent, OmIncident, OmJournalLabels, OmMaintenancePlan, OmMaintenanceWork, OmPeriodReport, OmReportPeriod, OmReportNotes, OmScanResult, OmSparePartMove, OmStockLine, OmSuggestResult } from '../types/om';

type Range = { from?: string; to?: string };

const REPORT_PATH: Record<OmReportPeriod, string> = { day: 'daily-report', month: 'monthly-report', year: 'annual-report' };
const REPORT_PARAM: Record<OmReportPeriod, string> = { day: 'date', month: 'month', year: 'year' };

/** The O&M Agreement: contracts, their Annex 3 availability and the excusable events. */
class OmService {
  async contracts(): Promise<OmContract[]> {
    const r = await apiClient.get<{ data: OmContract[] }>('/api/om/contracts');
    return r.data.data;
  }

  async saveContract(c: Partial<OmContract>): Promise<OmContract> {
    const r = c.id
      ? await apiClient.put<{ data: OmContract }>(`/api/om/contracts/${c.id}`, c)
      : await apiClient.post<{ data: OmContract }>('/api/om/contracts', c);
    return r.data.data;
  }

  async availability(id: number, q: { year?: number; from?: string; to?: string }): Promise<OmAvailabilityReport> {
    const r = await apiClient.get<{ data: OmAvailabilityReport }>(`/api/om/contracts/${id}/availability`, { params: q });
    return r.data.data;
  }

  /** Proposes Grid excusable events from the inverters' grid alarms over the range. */
  async suggest(id: number, q: { year?: number; from?: string; to?: string }): Promise<OmSuggestResult> {
    const r = await apiClient.post<{ data: OmSuggestResult }>(`/api/om/contracts/${id}/suggest`, {}, { params: q });
    return r.data.data;
  }

  async review(id: number, reviewStatus: OmExcusableEvent['reviewStatus']): Promise<OmExcusableEvent> {
    const r = await apiClient.put<{ data: OmExcusableEvent }>(`/api/om/excusable-events/${id}`, { reviewStatus });
    return r.data.data;
  }

  async categories(): Promise<Record<ExcusableCategory, string>> {
    const r = await apiClient.get<{ data: Record<ExcusableCategory, string> }>('/api/om/excusable-categories');
    return r.data.data;
  }

  async events(): Promise<OmExcusableEvent[]> {
    const r = await apiClient.get<{ data: OmExcusableEvent[] }>('/api/om/excusable-events');
    return r.data.data;
  }

  async saveEvent(e: Partial<OmExcusableEvent>): Promise<OmExcusableEvent> {
    const r = e.id
      ? await apiClient.put<{ data: OmExcusableEvent }>(`/api/om/excusable-events/${e.id}`, e)
      : await apiClient.post<{ data: OmExcusableEvent }>('/api/om/excusable-events', e);
    return r.data.data;
  }

  async removeEvent(id: number): Promise<void> {
    await apiClient.delete(`/api/om/excusable-events/${id}`);
  }

  /** The incident log (Annex 2): incidents in the range, or with `open` every unresolved one. */
  async incidents(id: number, q: { from?: string; to?: string; open?: boolean }): Promise<OmIncident[]> {
    const r = await apiClient.get<{ data: OmIncident[] }>(`/api/om/contracts/${id}/incidents`, { params: q });
    return r.data.data;
  }

  /** Opens incidents from the downtime in the range (runs by itself every 15 minutes for 3 days). */
  async scanIncidents(id: number, q: { from?: string; to?: string }): Promise<OmScanResult> {
    const r = await apiClient.post<{ data: OmScanResult }>(`/api/om/contracts/${id}/incidents/scan`, {}, { params: q });
    return r.data.data;
  }

  async saveIncident(i: Partial<OmIncident>): Promise<OmIncident> {
    const r = i.id
      ? await apiClient.put<{ data: OmIncident }>(`/api/om/incidents/${i.id}`, i)
      : await apiClient.post<{ data: OmIncident }>('/api/om/incidents', i);
    return r.data.data;
  }

  async removeIncident(id: number): Promise<void> {
    await apiClient.delete(`/api/om/incidents/${id}`);
  }

  /** A report; `key` is the day (YYYY-MM-DD), the month (YYYY-MM) or the Contract Year's number. */
  async report(id: number, period: OmReportPeriod, key: string): Promise<OmPeriodReport> {
    const r = await apiClient.get<{ data: OmPeriodReport }>(`/api/om/contracts/${id}/${REPORT_PATH[period]}`, { params: { [REPORT_PARAM[period]]: key } });
    return r.data.data;
  }

  async reportExcel(id: number, period: OmReportPeriod, key: string): Promise<Blob> {
    const r = await apiClient.get(`/api/om/contracts/${id}/${REPORT_PATH[period]}/excel`, { params: { [REPORT_PARAM[period]]: key }, responseType: 'blob' });
    return r.data;
  }

  /** The report as it stands on the page, made into a PDF by the server so every browser gets the same file. */
  async reportPdf(html: string, header: string, name: string): Promise<Blob> {
    const r = await apiClient.post('/api/om/report-pdf', { html, header, name }, { responseType: 'blob', timeout: 90_000 });
    return r.data;
  }

  /** `key` is the report's own key: "YYYY-MM", or "Y1" for the annual report of Contract Year 1. */
  async saveReportNotes(id: number, key: string, notes: Partial<OmReportNotes>): Promise<OmReportNotes> {
    const r = await apiClient.put<{ data: OmReportNotes }>(`/api/om/contracts/${id}/monthly-report/notes`, notes, { params: { month: key } });
    return r.data.data;
  }

  // The three logs of a contract: maintenance works, spare parts and HSE incidents.

  async journalLabels(): Promise<OmJournalLabels> {
    const r = await apiClient.get<{ data: OmJournalLabels }>('/api/om/journal-labels');
    return r.data.data;
  }

  async works(id: number, q: Range): Promise<OmMaintenanceWork[]> {
    const r = await apiClient.get<{ data: OmMaintenanceWork[] }>(`/api/om/contracts/${id}/maintenance`, { params: q });
    return r.data.data;
  }

  /** Scheduled works of a Contract Year (the running one by default) against Annex 1. */
  async maintenancePlan(id: number, year?: number): Promise<OmMaintenancePlan> {
    const r = await apiClient.get<{ data: OmMaintenancePlan }>(`/api/om/contracts/${id}/maintenance/plan`, { params: { year } });
    return r.data.data;
  }

  async saveWork(w: Partial<OmMaintenanceWork>): Promise<OmMaintenanceWork> {
    const r = w.id
      ? await apiClient.put<{ data: OmMaintenanceWork }>(`/api/om/maintenance/${w.id}`, w)
      : await apiClient.post<{ data: OmMaintenanceWork }>('/api/om/maintenance', w);
    return r.data.data;
  }

  async removeWork(id: number): Promise<void> {
    await apiClient.delete(`/api/om/maintenance/${id}`);
  }

  /** Stock movements in the range, and the stock on hand today. */
  async spareParts(id: number, q: Range): Promise<{ moves: OmSparePartMove[]; stock: OmStockLine[] }> {
    const r = await apiClient.get<{ data: { moves: OmSparePartMove[]; stock: OmStockLine[] } }>(`/api/om/contracts/${id}/spare-parts`, { params: q });
    return r.data.data;
  }

  async saveMove(m: Partial<OmSparePartMove>): Promise<OmSparePartMove> {
    const r = m.id
      ? await apiClient.put<{ data: OmSparePartMove }>(`/api/om/spare-parts/${m.id}`, m)
      : await apiClient.post<{ data: OmSparePartMove }>('/api/om/spare-parts', m);
    return r.data.data;
  }

  async removeMove(id: number): Promise<void> {
    await apiClient.delete(`/api/om/spare-parts/${id}`);
  }

  async hse(id: number, q: Range): Promise<OmHseEvent[]> {
    const r = await apiClient.get<{ data: OmHseEvent[] }>(`/api/om/contracts/${id}/hse`, { params: q });
    return r.data.data;
  }

  async saveHse(e: Partial<OmHseEvent>): Promise<OmHseEvent> {
    const r = e.id
      ? await apiClient.put<{ data: OmHseEvent }>(`/api/om/hse/${e.id}`, e)
      : await apiClient.post<{ data: OmHseEvent }>('/api/om/hse', e);
    return r.data.data;
  }

  async removeHse(id: number): Promise<void> {
    await apiClient.delete(`/api/om/hse/${id}`);
  }
}

export const omService = new OmService();
