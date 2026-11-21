import type { ExcusableCategory, IncidentCategory } from '../../../types/om';

/** Uzbek names of the Annex 3, Part 2 categories; the contract's English wording is in the tooltip. */
export const CATEGORY_UZ: Record<ExcusableCategory, string> = {
  customer: 'Mijoz harakati yoki ko\'rsatmasi',
  third_party_works: 'Mijoz yollagan uchinchi shaxs ishlari',
  no_access: 'Obyektga kirish berilmadi',
  grid: 'Tarmoq: uzilish, cheklov, dispetcher buyrug\'i',
  force_majeure: 'Fors-major',
  soiling: 'Qor, muz, qum yoki ifloslanish',
  third_party_damage: 'Uchinchi shaxs shikast yetkazgan',
  ambient: 'Ob-havo ruxsat etilgan chegaradan tashqari',
  manufacturer: 'Ishlab chiqaruvchi yordami kerak',
  communication: 'Monitoring yoki aloqa uzilishi',
  spare_parts: 'Ehtiyot qism mijoz tufayli kechikdi',
  scheduled: 'Kelishilgan rejali to\'xtash',
  epc_defect: 'EPC yoki zavod nuqsoni',
  suspension: 'Xizmat qonuniy to\'xtatilgan',
};

/** Annex 2 of the contract, in Uzbek. */
export const INCIDENT_UZ: Record<IncidentCategory, { label: string; color: string; clocks: string }> = {
  total: { label: "100% to'xtash", color: 'red', clocks: 'xabar 2 soat, yetib borish 8 soat (24/7)' },
  major: { label: "30%+ yo'qotish", color: 'volcano', clocks: 'xabar 4 soat, yetib borish 24 soat' },
  minor: { label: "30% dan kam yo'qotish", color: 'gold', clocks: 'xabar 8 soat, yetib borish 48 soat (ish vaqti)' },
  noncritical: { label: 'Kritik emas', color: 'default', clocks: 'xabar 24 soat, keyingi rejali tashrifda' },
};
