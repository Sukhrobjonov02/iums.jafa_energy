import type { VendorKey } from './availability';

export type ExcusableCategory =
  | 'customer'
  | 'third_party_works'
  | 'no_access'
  | 'grid'
  | 'force_majeure'
  | 'soiling'
  | 'third_party_damage'
  | 'ambient'
  | 'manufacturer'
  | 'communication'
  | 'spare_parts'
  | 'scheduled'
  | 'epc_defect'
  | 'suspension';

export interface OmContractStation {
  provider: VendorKey;
  stationId: string;
  dcKwp?: number;
  inverterKwp?: Record<string, number>;
}

export interface OmContract {
  id: number;
  name: string;
  customerName: string | null;
  contractNumber: string | null;
  serviceStartDate: string;
  stations: OmContractStation[];
  galPct: number;
  ldRatePct: number;
  ldCapPct: number;
  bonusThresholdPct: number;
  bonusRatePct: number;
  bonusCapPct: number;
  irradianceThresholdWm2: number;
  annualPriceUzs: number | null;
  customerContacts: { emails?: string[]; telegramChatIds?: string[] };
  active: boolean;
}

export interface OmDowntimePeriod {
  start: number;
  end: number;
  downMinutes: number;
  category: ExcusableCategory | null;
  silent: boolean;
  causes: string[];
  /** For a silent period: how much the energy counter grew across it, against what was expected. */
  counter?: { known: boolean; producedKwh: number; expectedKwh: number; mixed: boolean } | null;
}

export interface OmInverterResult {
  sn: string;
  dcKwp: number;
  usefulMinutes: number;
  downMinutes: number;
  silentMinutes: number;
  /** Useful minutes with no data in which the energy counter shows it worked; counted as up. */
  producedSilentlyMinutes: number;
  /** Energy / (irradiance × kWp) used for the silent-time check; the inverter's own when measured. */
  performanceRatio?: number;
  performanceRatioMeasured?: boolean;
  excludedMinutes: number;
  excludedByCategory: Partial<Record<ExcusableCategory, number>>;
  noDataMinutes: number;
  availabilityPct: number | null;
  periods: OmDowntimePeriod[];
}

export interface OmStationResult {
  provider: VendorKey;
  stationId: string;
  name: string;
  dcKwp: number;
  availabilityPct: number | null;
  usefulMinutes: number;
  downMinutes: number;
  excludedMinutes: number;
  noDataMinutes: number;
  producedSilentlyMinutes: number;
  irradianceMissing: boolean;
  inverters: OmInverterResult[];
}

export interface OmSettlement {
  availabilityPct: number;
  shortfallPts: number;
  ldPct: number;
  ldUzs: number | null;
  excessPts: number;
  bonusPct: number;
  bonusUzs: number | null;
}

export interface OmAvailabilityReport {
  contractId: number;
  contractName: string;
  from: string;
  to: string;
  contractYear: number | null;
  slotMinutes: number;
  thresholdWm2: number;
  availabilityPct: number | null;
  settlement: OmSettlement | null;
  excludedByCategory: Partial<Record<ExcusableCategory, number>>;
  categoryLabels: Record<ExcusableCategory, string>;
  stations: OmStationResult[];
  generatedAt: string;
  /** Automatically raised events in the range still waiting for staff review. */
  suggestedEvents: number;
  notes: string[];
}

export interface OmSuggestResult {
  from: string;
  to: string;
  created: number;
  updated: number;
}

export interface OmExcusableEvent {
  id: number;
  provider: VendorKey;
  stationId: string;
  inverterSn: string | null;
  category: ExcusableCategory;
  startsAt: string;
  endsAt: string | null;
  description: string | null;
  evidence: string[];
  source: string;
  customerStatus: 'pending' | 'accepted' | 'disputed';
  /** confirmed counts; suggested (raised automatically) waits for staff; rejected never counts. */
  reviewStatus: 'confirmed' | 'suggested' | 'rejected';
  createdBy: string | null;
  createdAt: string;
}

/** Annex 2 categories by the share of production lost. */
export type IncidentCategory = 'total' | 'major' | 'minor' | 'noncritical';

/** Where one Annex 2 clock stands. */
export type DeadlineState = 'done' | 'late' | 'pending' | 'overdue' | 'not_needed' | 'next_visit';

/** A fault on a contracted plant with its Annex 2 response clocks. */
export interface OmIncident {
  id: number;
  contractId: number | null;
  provider: string;
  stationId: string;
  stationName: string | null;
  inverterSns: string[];
  category: IncidentCategory;
  categoryManual: boolean;
  lossPct: number | null;
  title: string | null;
  detectedAt: string;
  endedAt: string | null;
  responseDueAt: string;
  arrivalDueAt: string | null;
  diagnosedAt: string | null;
  cause: string | null;
  customerNotifiedAt: string | null;
  notifiedVia: string | null;
  arrivedAt: string | null;
  arrivalNotNeeded: boolean;
  resolvedAt: string | null;
  notes: string | null;
  silent: boolean;
  source: string;
  createdBy: string | null;
  responseState: DeadlineState;
  arrivalState: DeadlineState;
}

export interface OmScanResult {
  from: string;
  to: string;
  created: number;
  updated: number;
}

/** One day of a monthly report: what was made, under how much sun. */
export interface OmReportDay {
  date: string;
  energyKwh: number | null;
  irradiationKwhM2: number | null;
  performanceRatio: number | null;
}

export interface OmReportStation {
  provider: string;
  stationId: string;
  name: string;
  dcKwp: number;
  availabilityPct: number | null;
  usefulMinutes: number;
  downMinutes: number;
  excludedMinutes: number;
  days: OmReportDay[];
  energyKwh: number;
  irradiationKwhM2: number;
  specificYield: number | null;
  performanceRatio: number | null;
  missingEnergyDays: number;
  missingIrradiationDays: number;
}

export interface OmReportDowntime {
  station: string;
  sn: string;
  start: number;
  end: number;
  downMinutes: number;
  category: ExcusableCategory | null;
  silent: boolean;
  causes: string[];
}

export interface OmReportNotes {
  maintenance: string | null;
  spareParts: string | null;
  hse: string | null;
  recommendations: string | null;
  updatedBy: string | null;
  updatedAt: string | null;
}

export interface OmResponseStats {
  total: number;
  ongoing: number;
  resolved: number;
  response: { onTime: number; late: number; open: number };
  arrival: { onTime: number; late: number; open: number; notNeeded: number };
}

/** The monthly report of Annex 5. */
export interface OmMonthlyReport {
  contractId: number;
  contractName: string;
  customerName: string | null;
  contractNumber: string | null;
  month: string;
  from: string;
  to: string;
  complete: boolean;
  generatedAt: string;
  summary: {
    dcKwp: number;
    energyKwh: number;
    irradiationKwhM2: number | null;
    specificYield: number | null;
    performanceRatio: number | null;
    availabilityPct: number | null;
    galPct: number;
    usefulMinutes: number;
    downMinutes: number;
    excludedMinutes: number;
    incidents: OmResponseStats;
  };
  stations: OmReportStation[];
  days: OmReportDay[];
  downtime: OmReportDowntime[];
  excusableEvents: OmExcusableEvent[];
  incidents: OmIncident[];
  notes: OmReportNotes;
  warnings: string[];
}
