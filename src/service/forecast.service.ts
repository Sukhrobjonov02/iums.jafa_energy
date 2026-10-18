import { apiClient } from './api-client';
import type {
  ForecastAccuracy,
  ForecastHistoryDay,
  ForecastSummary,
  StationForecast,
  StationPlanReport,
  StationInsight,
} from '../types/forecast';

const BASE_URL = '/api/forecast';

/**
 * Production and revenue the weather model expects over the next 7 or 15 days.
 * The backend keeps the stored rows; nothing here talks to the weather provider.
 */
class ForecastService {
  /** Rolled up across every station the signed-in user may see. */
  async getSummary(): Promise<ForecastSummary> {
    const response = await apiClient.get<{ data: ForecastSummary }>(`${BASE_URL}/summary`);
    return response.data.data;
  }

  async getStations(days: 7 | 15 = 7): Promise<StationForecast[]> {
    const response = await apiClient.get<{ data: StationForecast[] }>(`${BASE_URL}/stations`, {
      params: { days },
    });
    return response.data.data;
  }

  async getStation(provider: string, stationId: string, days: 7 | 15 = 7): Promise<StationForecast> {
    const response = await apiClient.get<{ data: StationForecast }>(
      `${BASE_URL}/${provider}/${encodeURIComponent(stationId)}`,
      { params: { days } },
    );
    return response.data.data;
  }

  /** How close past forecasts came to what actually happened. */
  async getAccuracy(windowDays = 30): Promise<ForecastAccuracy> {
    const response = await apiClient.get<{ data: ForecastAccuracy }>(`${BASE_URL}/accuracy`, {
      params: { windowDays },
    });
    return response.data.data;
  }

  /** Day by day: what was predicted for each finished day and what actually happened. */
  async getHistory(windowDays = 30): Promise<ForecastHistoryDay[]> {
    const response = await apiClient.get<{ data: ForecastHistoryDay[] }>(`${BASE_URL}/history`, {
      params: { windowDays },
    });
    return response.data.data;
  }

  /** One station's past days against the forecast, the forecast's accuracy for it and its promise. */
  async getStationInsight(provider: string, stationId: string, windowDays = 30): Promise<StationInsight> {
    const response = await apiClient.get<{ data: StationInsight }>(
      `${BASE_URL}/${provider}/${encodeURIComponent(stationId)}/insight`,
      { params: { windowDays } },
    );
    return response.data.data;
  }

  /** Each station's output against its promised yield over the last `windowDays` finished days. */
  async getPlan(windowDays = 30): Promise<StationPlanReport[]> {
    const response = await apiClient.get<{ data: StationPlanReport[] }>(`${BASE_URL}/plan`, {
      params: { windowDays },
    });
    return response.data.data;
  }

  async getSyncStatus(): Promise<any> {
    const response = await apiClient.get<{ data: any }>(`${BASE_URL}/sync/status`);
    return response.data.data;
  }

  /** Admin only: fetch the weather again now instead of waiting for the next run. */
  async triggerSync(): Promise<any> {
    const response = await apiClient.post<{ data: any }>(`${BASE_URL}/sync`, {});
    return response.data.data;
  }
}

export const forecastService = new ForecastService();
export default forecastService;
