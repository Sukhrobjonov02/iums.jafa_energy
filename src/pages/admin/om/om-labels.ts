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

/** Where panels face, as the server counts it: 0 south, -90 east, 90 west, 180 north. */
export const DIRECTIONS: { value: number; label: string }[] = [
  { value: 0, label: 'Janub' },
  { value: -45, label: 'Janubi-sharq' },
  { value: -90, label: 'Sharq' },
  { value: 45, label: "Janubi-g'arb" },
  { value: 90, label: "G'arb" },
  { value: -135, label: 'Shimoli-sharq' },
  { value: 135, label: "Shimoli-g'arb" },
  { value: 180, label: 'Shimol' },
];

/** "23° janub", or "10° sharq (60%), 10° g'arb (40%)" for a plant with several planes. */
export function planesLabel(planes?: { tiltDeg: number; azimuthDeg: number; share: number }[] | null): string {
  if (!planes?.length) return '';
  const one = (p: { tiltDeg: number; azimuthDeg: number }) => {
    if (p.tiltDeg === 0) return '0°';
    const d = DIRECTIONS.find((x) => x.value === (p.azimuthDeg === -180 ? 180 : p.azimuthDeg));
    return `${p.tiltDeg}° ${d ? d.label.toLowerCase() : `azimut ${p.azimuthDeg}°`}`;
  };
  return planes.map((p) => (planes.length > 1 ? `${one(p)} (${Math.round(p.share * 100)}%)` : one(p))).join(', ');
}
