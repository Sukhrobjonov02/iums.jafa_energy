export type ForecastProvider = 'hopecloud' | 'soliscloud' | 'fsolar' | 'huawei';
export type ForecastConfidence = 'high' | 'medium';
/** "measured" = worked out from this station's own output, "default" = the configured guess. */
export type PerformanceRatioSource = 'measured' | 'default';

export interface ForecastDay {
  date: string;
  horizonDays: number;
  confidence: ForecastConfidence;
  radiationKwhM2?: number;
  sunshineHours?: number;
  tempMax?: number;
  tempMin?: number;
  precipitationMm?: number;
  cloudCover?: number;
  weatherCode?: number;
  predictedKwh?: number;
  predictedRevenueUzs?: number;
}

export interface ForecastTotals {
  days: number;
  kwh: number;
  revenueUzs: number;
}

export interface StationForecast {
  provider: ForecastProvider;
  stationId: string;
  stationName?: string;
  capacityKw?: number;
  performanceRatio: number;
  performanceRatioSource: PerformanceRatioSource;
  coordinatesApproximate: boolean;
  issuedAt?: string;
  days: ForecastDay[];
  totals: ForecastTotals;
}

/** One finished day: what was predicted for it, and what the fleet actually produced. */
export interface ForecastHistoryDay {
  date: string;
  predictedKwh: number;
  actualKwh: number;
  /** Stations that contributed to both numbers on this day. */
  stations: number;
  /** Signed: positive means the forecast ran high. */
  errorPct: number;
}

export interface ForecastAccuracy {
  windowDays: number;
  /** Calendar days that have both a frozen day-ahead prediction and a recorded actual. */
  measuredDays: number;
  /** Station-days behind those percentages — the sample size, not the number of days. */
  measuredPoints: number;
  /** Average absolute gap between the day-ahead forecast and what happened, percent, on days the station worked. */
  mapePct: number | null;
  /** The same average with breakdown days included (older backends omit it). */
  mapeAllPct?: number | null;
  /** Station-days left out of mapePct because the station broke down (made under a quarter of its promise). */
  breakdownPoints?: number;
  /** Positive = the forecast runs high. */
  biasPct: number | null;
  /** What the formula gets wrong even with perfect weather, percent. */
  modelErrorPct: number | null;
}

export interface ForecastSummary {
  currency: 'UZS';
  pricePerKwhUzs: number;
  issuedAt: string | null;
  stations: number;
  anyDefaultRatio: boolean;
  coordinatesApproximate: boolean;
  next7: ForecastTotals;
  next15: ForecastTotals;
  perDay: ForecastDay[];
  accuracy?: ForecastAccuracy;
}

/** One station's output against what it was sold to produce (kWp x promised kWh/kWp/yr). */
export interface StationPlanReport {
  provider: 'hopecloud' | 'soliscloud' | 'huawei' | 'fsolar';
  stationId: string;
  stationName: string | null;
  kwp: number;
  yieldKwhPerKwp: number;
  yieldIsDefault: boolean;
  yearlyPromiseKwh: number;
  days: number;
  promisedKwh: number;
  actualKwh: number;
  deliveredPct: number | null;
  workingPct: number | null;
  breakdownDays: number;
}

/** One planned station's year by calendar month; `actualKwh` is null where no figure is held. */
export interface StationPlanYear {
  provider: StationPlanReport['provider'];
  stationId: string;
  stationName: string | null;
  year: number;
  months: Array<{ month: number; planKwh: number; actualKwh: number | null }>;
}

/** One station's page: its past days against the forecast, the forecast's accuracy and its promise. */
export interface StationInsight {
  provider: ForecastProvider;
  stationId: string;
  windowDays: number;
  pricePerKwhUzs: number;
  history: (ForecastHistoryDay & { promisedKwh: number | null; breakdown: boolean })[];
  accuracy: ForecastAccuracy;
  plan: StationPlanReport | null;
}
