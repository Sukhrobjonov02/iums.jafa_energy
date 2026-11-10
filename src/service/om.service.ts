import { apiClient } from './api-client';
import type { ExcusableCategory, OmAvailabilityReport, OmContract, OmExcusableEvent } from '../types/om';

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
}

export const omService = new OmService();
