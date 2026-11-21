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

export type OmReportPeriod = 'day' | 'month' | 'year';

/** One calendar month of a Contract Year, or the part of it the year covers. */
export interface OmReportMonthRow {
  month: string;
  from: string;
  to: string;
  energyKwh: number;
  irradiationKwhM2: number | null;
  specificYield: number | null;
  performanceRatio: number | null;
  availabilityPct: number | null;
  usefulMinutes: number;
  downMinutes: number;
  excludedMinutes: number;
  incidents: number;
}

/** A daily, monthly (Annex 5) or annual report of one contract. */
export interface OmPeriodReport {
  period: OmReportPeriod;
  /** What the hand-written sections are filed under: "YYYY-MM" for a month, "Y1" for Contract Year 1. */
  key: string;
  contractId: number;
  contractName: string;
  customerName: string | null;
  contractNumber: string | null;
  serviceStartDate: string;
  month: string | null;
  contractYear: number | null;
  from: string;
  /** Last day covered: the period's end, or today while it is running. */
  to: string;
  /** The period's own last day, reached or not. */
  periodTo: string;
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
  /** The three logs over the period (Annex 5 (c), (e), (f)); absent in a daily report's sections. */
  maintenance: OmMaintenanceWork[];
  spareMoves: OmSparePartMove[];
  /** Stock on hand at the end of the period. */
  stock: OmStockLine[];
  hse: OmHseEvent[];
  /** Annual report only: scheduled works counted against Annex 1. */
  maintenancePlan: OmPlanLine[] | null;
  journalLabels: Pick<OmJournalLabels, 'maintenanceKinds' | 'spareMoveKinds' | 'hseKinds'>;
  /** Annual report only. */
  months: OmReportMonthRow[] | null;
  /** Annual report only: damages or bonus on the year's availability so far. */
  settlement: OmSettlement | null;
  warnings: string[];
}

export type MaintenanceKind = 'scheduled' | 'corrective';
export type SpareMoveKind = 'received' | 'used' | 'inventory';
export type HseKind = 'injury' | 'near_miss' | 'fire' | 'electrical' | 'environment' | 'property' | 'other';

/** A place an entry of a log refers to: one plant of the contract, or none for the whole site. */
interface OmJournalPlace {
  provider: VendorKey | null;
  stationId: string | null;
  stationName: string | null;
}

/** A maintenance work done (Annex 5 (c)). */
export interface OmMaintenanceWork extends OmJournalPlace {
  id: number;
  contractId: number;
  kind: MaintenanceKind;
  /** The Annex 1 item a scheduled work answers, "1.1" to "1.12". */
  item: string | null;
  /** "YYYY-MM-DD". */
  performedOn: string;
  description: string;
  performedBy: string | null;
  incidentId: number | null;
  createdBy: string | null;
}

/** A line of the spare parts stock movement log (clause 7.6). */
export interface OmSparePartMove extends OmJournalPlace {
  id: number;
  contractId: number;
  /** "YYYY-MM-DD". */
  movedOn: string;
  part: string;
  partNumber: string | null;
  kind: SpareMoveKind;
  quantity: number;
  unit: string;
  note: string | null;
  createdBy: string | null;
}

export interface OmStockLine {
  part: string;
  partNumber: string | null;
  unit: string;
  quantity: number;
  lastInventoryOn: string | null;
  lastMoveOn: string;
}

/** An HSE incident and whether the Customer was told within 24 hours (clause 5.1.4). */
export interface OmHseEvent extends OmJournalPlace {
  id: number;
  contractId: number;
  occurredAt: string;
  kind: HseKind;
  description: string;
  actions: string | null;
  customerNotifiedAt: string | null;
  notifiedVia: string | null;
  noticeDueAt: string;
  noticeState: DeadlineState;
  createdBy: string | null;
}

/** An Annex 1 scheduled work and how often it was done in a Contract Year. */
export interface OmPlanLine {
  code: string;
  label: string;
  /** Times a year the Agreement asks for; null where it only says "as the norms require". */
  perYear: number | null;
  done: number;
  lastOn: string | null;
}

export interface OmMaintenancePlan {
  contractYear: number;
  from: string;
  to: string;
  items: OmPlanLine[];
}

export interface OmJournalLabels {
  maintenanceItems: { code: string; label: string; perYear: number | null }[];
  maintenanceKinds: Record<MaintenanceKind, string>;
  spareMoveKinds: Record<SpareMoveKind, string>;
  hseKinds: Record<HseKind, string>;
}
