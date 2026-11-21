import { apiClient } from './api-client';
import type { ExcusableCategory, OmAvailabilityReport, OmContract, OmExcusableEvent, OmIncident, OmPeriodReport, OmReportPeriod, OmReportNotes, OmScanResult, OmSuggestResult } from '../types/om';

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

  /** `key` is the report's own key: "YYYY-MM", or "Y1" for the annual report of Contract Year 1. */
  async saveReportNotes(id: number, key: string, notes: Partial<OmReportNotes>): Promise<OmReportNotes> {
    const r = await apiClient.put<{ data: OmReportNotes }>(`/api/om/contracts/${id}/monthly-report/notes`, notes, { params: { month: key } });
    return r.data.data;
  }
}

export const omService = new OmService();
