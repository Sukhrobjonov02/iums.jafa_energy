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
}

export interface OmInverterResult {
  sn: string;
  dcKwp: number;
  usefulMinutes: number;
  downMinutes: number;
  silentMinutes: number;
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
