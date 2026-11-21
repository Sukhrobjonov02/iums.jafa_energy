import React from 'react';
import type { DeadlineState, OmIncident, OmPeriodReport } from '../../../types/om';
import { CATEGORY_UZ, INCIDENT_UZ } from './om-labels';
import { MONTHS_UZ, reportTitle } from './report-style';

const TASHKENT_MS = 5 * 3_600_000;
const time = (t: number | string | null): string => {
  if (t === null) return '—';
  const d = new Date(new Date(t).getTime() + TASHKENT_MS).toISOString();
  return `${d.slice(8, 10)}.${d.slice(5, 7)} ${d.slice(11, 16)}`;
};
const date = (d: string) => `${d.slice(8, 10)}.${d.slice(5, 7)}.${d.slice(0, 4)}`;
const num = (v: number | null | undefined, digits = 1) =>
  v === null || v === undefined ? '—' : new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(v);
const fixed = (v: number, digits: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: digits, minimumFractionDigits: digits }).format(v);
const pct = (v: number | null) => (v === null ? '—' : `${fixed(v, 2)}%`);
const pr = (v: number | null) => (v === null ? '—' : `${fixed(v * 100, 1)}%`);
const hours = (minutes: number) => num(minutes / 60, 1);
const sum = (n: number | null, unit: string) => (n === null ? 'yillik narx kiritilmagan' : `${num(n, 0)} ${unit}`);

/** A year's report lists periods and incidents only while they fit a few pages; the workbook has them all. */
const YEAR_LIST_LIMIT = 40;

const monthLabel = (m: { month: string; from: string; to: string }) => {
  const [y, mm] = m.month.split('-').map(Number);
  const whole = m.from.endsWith('-01') && m.to.slice(8) === String(new Date(Date.UTC(y, mm, 0)).getUTCDate()).padStart(2, '0');
  return `${MONTHS_UZ[mm - 1]} ${y}${whole ? '' : ` (${m.from.slice(8)}.${m.from.slice(5, 7)}–${m.to.slice(8)}.${m.to.slice(5, 7)})`}`;
};

/** How an incident stood against one of Annex 2's clocks: what happened, and under it the deadline. */
const clock = (state: DeadlineState, due: string | null, done: string | null): { text: string; sub?: string; tone: 'ok' | 'bad' | 'warn' | 'none' } => {
  switch (state) {
    case 'done':
      return { text: time(done), sub: "o'z vaqtida", tone: 'ok' };
    case 'late':
      return { text: `${time(done)} (kech)`, sub: `muddat ${time(due)}`, tone: 'warn' };
    case 'overdue':
      return { text: 'bajarilmagan', sub: `muddat ${time(due)}`, tone: 'bad' };
    case 'pending':
      return { text: `muddat ${time(due)}`, tone: 'none' };
    case 'not_needed':
      return { text: "kerak bo'lmadi", tone: 'none' };
    default:
      return { text: 'keyingi rejali tashrifda', tone: 'none' };
  }
};

const Clock: React.FC<{ c: ReturnType<typeof clock>; via?: string | null }> = ({ c, via }) => (
  <td className={c.tone}>
    <span className="nw">{c.text}{via ? `, ${via}` : ''}</span>
    {c.sub && <><br /><span className="nw">{c.sub}</span></>}
  </td>
);

const Note: React.FC<{ text: string | null }> = ({ text }) =>
  text ? <p className="note">{text}</p> : <p className="note empty">Bu davr uchun ma'lumot kiritilmagan.</p>;

/** What staff typed under a section whose figures come from a log: shown only when there is something. */
const Remark: React.FC<{ text: string | null }> = ({ text }) => (text ? <p className="note"><b>Izoh.</b> {text}</p> : null);

/**
 * A report as a plain document. The monthly one follows Annex 5's order (a) to (g); the daily one
 * keeps the measured sections only; the annual one swaps the days for months and adds what the
 * year's availability means in money. Plain HTML with its own stylesheet so the same markup is
 * shown on the page and printed from an empty frame.
 */
export const ReportDocument = React.forwardRef<HTMLDivElement, { report: OmPeriodReport }>(({ report: r }, ref) => {
  const s = r.summary;
  const day = r.period === 'day';
  const yearly = r.period === 'year';
  const title = reportTitle(r);
  const running = day ? 'kun hali tugamagan' : yearly ? `shartnoma yili ${date(r.periodTo)} da tugaydi` : 'oy hali tugamagan';
  // A short table is kept on one page; a long one may run over and repeats its header.
  const keep = (rows: number) => (rows <= 25 ? ' keep' : '');
  // The hand-written sections are not part of a daily report, so its incidents come third.
  const no = day ? { incidents: 3 } : { maintenance: 3, incidents: 4, spareParts: 5, hse: 6, recommendations: 7 };
  const listed = <T,>(rows: T[]) => !yearly || rows.length <= YEAR_LIST_LIMIT;
  // A plant with no energy figure on any day of the period has no total, which is not a zero.
  const known = (st: { missingEnergyDays: number; days: unknown[] }) => st.missingEnergyDays < st.days.length;
  const total = (rows: { downMinutes: number }[]) => hours(rows.reduce((n, p) => n + p.downMinutes, 0));
  const perStation = r.stations.length > 1 && r.stations.length <= 4;
  const chargeable = r.downtime.filter((p) => p.category === null);
  const excused = r.downtime.filter((p) => p.category !== null);
  const station = (i: OmIncident) => i.stationName ?? r.stations.find((st) => st.provider === i.provider && st.stationId === i.stationId)?.name ?? i.stationId;
  // An entry of a log is about one plant or about the site as a whole.
  const place = (e: { provider: string | null; stationId: string | null; stationName: string | null }) =>
    e.provider && e.stationId ? e.stationName ?? r.stations.find((st) => st.provider === e.provider && st.stationId === e.stationId)?.name ?? e.stationId : 'umumiy';
  const works = r.maintenance ?? [];
  const moves = r.spareMoves ?? [];
  const stock = r.stock ?? [];
  const hse = r.hse ?? [];
  const scheduled = works.filter((w) => w.kind === 'scheduled').length;
  const usedMoves = moves.filter((m) => m.kind === 'used').length;

  return (
    <div className="om-report" ref={ref}>
      <header>
        <div className="brand">JAFA ENERGY</div>
        <h1>{title}</h1>
        <p className="sub">Ekspluatatsiya va texnik xizmat ko'rsatish (O&amp;M) shartnomasi{r.period === 'month' ? ', Ilova 5' : ''}</p>
        <table className="meta">
          <tbody>
            <tr><th>Shartnoma</th><td>{r.contractName}{r.contractNumber ? `, № ${r.contractNumber}` : ''}</td></tr>
            <tr><th>Buyurtmachi</th><td>{r.customerName ?? '—'}</td></tr>
            <tr><th>Pudratchi</th><td>JAFA ENERGY</td></tr>
            <tr>
              <th>Hisobot davri</th>
              <td>
                {day ? date(r.from) : `${date(r.from)} – ${date(r.to)}`}
                {!r.complete && <strong className="warn"> (oraliq hisobot: {running})</strong>}
              </td>
            </tr>
            <tr><th>Tuzilgan vaqt</th><td>{time(r.generatedAt)} (Toshkent vaqti), IUMS monitoring tizimi ma'lumotlari asosida</td></tr>
          </tbody>
        </table>
      </header>

      <section className="tiles">
        <div><span>Ishlab chiqarilgan energiya, kVt·soat</span><b>{num(s.energyKwh, 0)}</b></div>
        <div><span>Nurlanish (gorizontal), kVt·soat/m²</span><b>{num(s.irradiationKwhM2, 1)}</b></div>
        <div><span>PR (ma'lumot uchun)</span><b>{pr(s.performanceRatio)}</b></div>
        <div><span>Availability (kafolat {s.galPct}%)</span><b className={s.availabilityPct !== null && s.availabilityPct < s.galPct ? 'bad' : 'ok'}>{pct(s.availabilityPct)}</b></div>
        <div><span>Hodisalar</span><b>{s.incidents.total}</b></div>
      </section>

      <section>
        <h2>1. Elektr energiyasi ishlab chiqarish va nurlanish</h2>
        <table className={keep(r.stations.length).trim()}>
          <thead>
            <tr>
              <th>Obyekt</th><th className="r">DC quvvat, kWp</th><th className="r">Energiya, kVt·soat</th>
              <th className="r">Nurlanish, kVt·soat/m²</th><th className="r">kVt·soat/kWp</th><th className="r">PR</th>
            </tr>
          </thead>
          <tbody>
            {r.stations.map((st) => (
              <tr key={`${st.provider}:${st.stationId}`}>
                <td>{st.name}</td><td className="r">{num(st.dcKwp, 2)}</td><td className="r">{num(known(st) ? st.energyKwh : null, 0)}</td>
                <td className="r">{num(st.irradiationKwhM2, 1)}</td><td className="r">{num(known(st) ? st.specificYield : null, 1)}</td><td className="r">{pr(st.performanceRatio)}</td>
              </tr>
            ))}
          </tbody>
          {r.stations.length > 1 && (
            <tfoot>
              <tr>
                <td>Jami</td><td className="r">{num(s.dcKwp, 2)}</td><td className="r">{num(s.energyKwh, 0)}</td>
                <td className="r">{num(s.irradiationKwhM2, 1)}</td><td className="r">{num(s.specificYield, 1)}</td><td className="r">{pr(s.performanceRatio)}</td>
              </tr>
            </tfoot>
          )}
        </table>

        {yearly && r.months && (
          <>
            <h3>Oylar bo'yicha</h3>
            <table className="compact keep">
              <thead>
                <tr>
                  <th>Oy</th><th className="r">Energiya, kVt·soat</th><th className="r">Nurlanish, kVt·soat/m²</th>
                  <th className="r">kVt·soat/kWp</th><th className="r">PR</th>
                </tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthLabel(m)}</td><td className="r">{num(m.energyKwh, 0)}</td><td className="r">{num(m.irradiationKwhM2, 1)}</td>
                    <td className="r">{num(m.specificYield, 1)}</td><td className="r">{pr(m.performanceRatio)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td>Jami</td><td className="r">{num(s.energyKwh, 0)}</td><td className="r">{num(s.irradiationKwhM2, 1)}</td>
                  <td className="r">{num(s.specificYield, 1)}</td><td className="r">{pr(s.performanceRatio)}</td>
                </tr>
              </tfoot>
            </table>
          </>
        )}

        {r.period === 'month' && (
          <>
        <h3>Kunlar bo'yicha</h3>
        <table className="compact">
          <thead>
            <tr>
              <th>Sana</th>
              {perStation && r.stations.map((st) => <th key={st.stationId} className="r">{st.name}, kVt·soat</th>)}
              <th className="r">{perStation ? 'Jami, kVt·soat' : 'Energiya, kVt·soat'}</th>
              <th className="r">Nurlanish, kVt·soat/m²</th><th className="r">PR</th>
            </tr>
          </thead>
          <tbody>
            {r.days.map((d, i) => (
              <tr key={d.date}>
                <td>{date(d.date)}</td>
                {perStation && r.stations.map((st) => <td key={st.stationId} className="r">{num(st.days[i].energyKwh, 1)}</td>)}
                <td className="r">{num(d.energyKwh, 1)}</td><td className="r">{num(d.irradiationKwhM2, 2)}</td><td className="r">{pr(d.performanceRatio)}</td>
              </tr>
            ))}
          </tbody>
        </table>
          </>
        )}
        <p className="foot">
          Energiya: invertor ishlab chiqaruvchisi bulutining kunlik hisoboti. Nurlanish: obyekt joylashuvi uchun sun'iy yo'ldosh ma'lumoti
          (Open-Meteo), gorizontal tekislikda. PR = energiya ÷ (nurlanish × DC quvvat); nurlanish panel tekisligida o'lchanmagani uchun
          ma'lumot tariqasida beriladi. "—" ma'lumot yo'qligini bildiradi.
        </p>
      </section>

      <section>
        <h2>2. Availability hisobi{yearly ? '' : " (ma'lumot uchun)"}</h2>
        <table className={keep(r.stations.length).trim()}>
          <thead>
            <tr>
              <th>Obyekt</th><th className="r">Foydali vaqt, soat</th><th className="r">To'xtash, soat</th>
              <th className="r">Shundan uzrli, soat</th><th className="r">Availability</th>
            </tr>
          </thead>
          <tbody>
            {r.stations.map((st) => (
              <tr key={`${st.provider}:${st.stationId}`}>
                <td>{st.name}</td><td className="r">{hours(st.usefulMinutes)}</td><td className="r">{hours(st.downMinutes)}</td>
                <td className="r">{hours(st.excludedMinutes)}</td><td className="r">{pct(st.availabilityPct)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td>Shartnoma bo'yicha (DC quvvat bo'yicha o'rtacha)</td><td className="r">{hours(s.usefulMinutes)}</td>
              <td className="r">{hours(s.downMinutes)}</td><td className="r">{hours(s.excludedMinutes)}</td><td className="r">{pct(s.availabilityPct)}</td>
            </tr>
          </tfoot>
        </table>
        <p className="foot">
          Ilova 3 bo'yicha: nurlanish 75 W/m² dan yuqori bo'lgan 15 daqiqalik oraliqlar foydali vaqt hisoblanadi.
          Availability = (foydali vaqt − to'xtash + uzrli to'xtash) ÷ foydali vaqt. Kafolatlangan daraja {s.galPct}%
          {yearly ? '.' : '; jarima va bonus shartnoma yili yakuni bo\'yicha hisoblanadi.'}
        </p>

        {yearly && r.months && (
          <>
            <h3>Oylar bo'yicha</h3>
            <table className="compact keep">
              <thead>
                <tr>
                  <th>Oy</th><th className="r">Foydali vaqt, soat</th><th className="r">To'xtash, soat</th>
                  <th className="r">Shundan uzrli, soat</th><th className="r">Availability</th><th className="r">Hodisalar</th>
                </tr>
              </thead>
              <tbody>
                {r.months.map((m) => (
                  <tr key={m.month}>
                    <td>{monthLabel(m)}</td><td className="r">{hours(m.usefulMinutes)}</td><td className="r">{hours(m.downMinutes)}</td>
                    <td className="r">{hours(m.excludedMinutes)}</td><td className="r">{pct(m.availabilityPct)}</td><td className="r">{m.incidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="foot">Yillik Availability oylik ko'rsatkichlarning o'rtachasi emas: u butun yilning foydali vaqti bo'yicha hisoblanadi.</p>
          </>
        )}

        {yearly && r.settlement && (
          <>
            <h3>Shartnoma yili bo'yicha hisob-kitob (8.2 va 8.3-bandlar)</h3>
            <table className="meta keep">
              <tbody>
                <tr><th>Yillik Availability</th><td><b>{pct(r.settlement.availabilityPct)}</b> (kafolatlangan daraja {s.galPct}%)</td></tr>
                <tr>
                  <th>Jarima</th>
                  <td>
                    {r.settlement.ldPct > 0
                      ? `kafolatdan ${num(r.settlement.shortfallPts, 2)} foiz punkti kam: yillik narxning ${num(r.settlement.ldPct, 3)}%, ${sum(r.settlement.ldUzs, "so'm")}`
                      : "yo'q (Availability kafolatdan past emas)"}
                  </td>
                </tr>
                <tr>
                  <th>Bonus</th>
                  <td>
                    {r.settlement.bonusPct > 0
                      ? `bonus chegarasidan ${num(r.settlement.excessPts, 2)} foiz punkti yuqori: yillik narxning ${num(r.settlement.bonusPct, 3)}%, ${sum(r.settlement.bonusUzs, "so'm")}`
                      : "yo'q"}
                  </td>
                </tr>
              </tbody>
            </table>
            {!r.complete && <p className="foot warn">Shartnoma yili tugamagan: bu hozirgacha bo'lgan holat, yakuniy hisob yil tugagach chiqadi.</p>}
          </>
        )}

        <h3>To'xtash davrlari (Pudratchi hisobiga)</h3>
        {!listed(chargeable) ? (
          <p className="note">
            Jami {chargeable.length} ta davr, {total(chargeable)} soat. To'liq ro'yxat oylik hisobotlarda va Excel faylida.
          </p>
        ) : chargeable.length ? (
          <table className={`compact${keep(chargeable.length)}`}>
            <thead><tr><th>Obyekt</th><th>Invertor</th><th>Boshlandi</th><th>Tugadi</th><th className="r">Soat</th><th>Izoh</th></tr></thead>
            <tbody>
              {chargeable.map((p) => (
                <tr key={`${p.sn}:${p.start}`}>
                  <td>{p.station}</td><td>{p.sn}</td><td className="nw">{time(p.start)}</td><td className="nw">{time(p.end)}</td><td className="r">{hours(p.downMinutes)}</td>
                  <td>{[p.silent ? "aloqa yo'q" : '', ...p.causes].filter(Boolean).join('; ') || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="note">Bu davrda Pudratchi hisobiga to'xtash bo'lmagan.</p>
        )}

        <h3>Uzrli to'xtash davrlari</h3>
        {!listed(excused) ? (
          <p className="note">
            Jami {excused.length} ta davr, {total(excused)} soat. To'liq ro'yxat oylik hisobotlarda va Excel faylida.
          </p>
        ) : excused.length ? (
          <table className={`compact${keep(excused.length)}`}>
            <thead><tr><th>Obyekt</th><th>Invertor</th><th>Boshlandi</th><th>Tugadi</th><th className="r">Soat</th><th>Asos (Ilova 3, 2.1)</th></tr></thead>
            <tbody>
              {excused.map((p) => (
                <tr key={`${p.sn}:${p.start}`}>
                  <td>{p.station}</td><td>{p.sn}</td><td className="nw">{time(p.start)}</td><td className="nw">{time(p.end)}</td><td className="r">{hours(p.downMinutes)}</td>
                  <td>{CATEGORY_UZ[p.category!]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="note">Bu davrda uzrli to'xtash bo'lmagan.</p>
        )}

        {r.excusableEvents.length > 0 && listed(r.excusableEvents) && (
          <>
            <h3>Qayd etilgan uzrli hodisalar</h3>
            <table className="compact">
              <thead><tr><th>Obyekt</th><th>Turi</th><th>Boshlandi</th><th>Tugadi</th><th>Izoh</th></tr></thead>
              <tbody>
                {r.excusableEvents.map((e) => (
                  <tr key={e.id}>
                    <td>{r.stations.find((st) => st.provider === e.provider && st.stationId === e.stationId)?.name ?? e.stationId}{e.inverterSn ? `, ${e.inverterSn}` : ''}</td>
                    <td>{CATEGORY_UZ[e.category]}</td><td>{time(e.startsAt)}</td><td>{e.endsAt ? time(e.endsAt) : 'davom etmoqda'}</td><td>{e.description ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </section>

      {!day && (
        <section>
          <h2>{no.maintenance}. Bajarilgan rejali va tuzatish texnik xizmat ishlari</h2>
          {works.length ? (
            <>
              <p className="note lead">Jami {works.length} ta ish: {scheduled} ta rejali, {works.length - scheduled} ta tuzatish (rejadan tashqari).</p>
              {!listed(works) ? (
                <p className="note">To'liq ro'yxat oylik hisobotlarda va Excel faylida.</p>
              ) : (
                <table className={`compact${keep(works.length)}`}>
                  <thead>
                    <tr><th>Sana</th><th>Obyekt</th><th>Turi</th><th>Bajarilgan ish</th><th>Bajaruvchi</th></tr>
                  </thead>
                  <tbody>
                    {works.map((w) => (
                      <tr key={w.id}>
                        <td className="nw">{date(w.performedOn)}</td>
                        <td>{place(w)}</td>
                        <td>
                          {w.kind === 'scheduled' ? 'Rejali' : 'Tuzatish'}
                          {w.item ? `, Ilova 1: ${w.item}` : ''}
                          {w.incidentId ? `, hodisa № ${w.incidentId}` : ''}
                        </td>
                        <td>{w.description}</td>
                        <td>{w.performedBy ?? '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </>
          ) : (
            !r.notes.maintenance && <p className="note">Bu davrda texnik xizmat ishi qayd etilmagan.</p>
          )}
          {r.maintenancePlan && (
            <>
              <h3>Rejali ishlar jadvalining bajarilishi (Ilova 1)</h3>
              <table className="compact keep">
                <thead>
                  <tr><th>Band</th><th>Ish</th><th className="r">Yiliga kamida</th><th className="r">Bajarildi</th><th>Oxirgi marta</th></tr>
                </thead>
                <tbody>
                  {r.maintenancePlan.map((l) => (
                    <tr key={l.code}>
                      <td>{l.code}</td>
                      <td>{l.label}</td>
                      <td className="r">{l.perYear ?? "me'yor bo'yicha"}</td>
                      <td className={`r${l.perYear !== null && r.complete && l.done < l.perYear ? ' bad' : ''}`}>{l.done}</td>
                      <td className="nw">{l.lastOn ? date(l.lastOn) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
          <Remark text={r.notes.maintenance} />
        </section>
      )}

      <section>
        <h2>{no.incidents}. Hodisalar jurnali va javob vaqtlari</h2>
        {r.incidents.length ? (
          <>
            <p className="note lead">
              Jami {s.incidents.total} ta hodisa. Buyurtmachiga xabar: {s.incidents.response.onTime} ta o'z vaqtida, {s.incidents.response.late} ta
              kech, {s.incidents.response.open} ta berilmagan. Obyektga borish: {s.incidents.arrival.onTime} ta o'z vaqtida, {s.incidents.arrival.late} ta
              kech, {s.incidents.arrival.open} ta bajarilmagan, {s.incidents.arrival.notNeeded} ta kerak bo'lmagan.
            </p>
            {!listed(r.incidents) ? (
              <p className="note">To'liq jurnal oylik hisobotlarda va Excel faylida.</p>
            ) : (
            <table className="compact">
              <thead>
                <tr><th>№</th><th>Obyekt</th><th>Toifa</th><th>Aniqlangan</th><th>Tiklangan</th><th>Buyurtmachiga xabar</th><th>Obyektga borish</th><th>Sabab</th></tr>
              </thead>
              <tbody>
                {r.incidents.map((i) => {
                  const a = clock(i.responseState, i.responseDueAt, i.customerNotifiedAt);
                  const b = clock(i.arrivalState, i.arrivalDueAt, i.arrivedAt);
                  return (
                    <tr key={i.id}>
                      <td>{i.id}</td><td>{station(i)}</td><td>{INCIDENT_UZ[i.category].label}</td><td className="nw">{time(i.detectedAt)}</td>
                      <td className="nw">{i.endedAt ? time(i.endedAt) : 'davom etmoqda'}</td>
                      <Clock c={a} via={i.customerNotifiedAt ? i.notifiedVia : null} /><Clock c={b} />
                      <td>{(i.cause ?? '').replace(/^Avtomatik: /, '') || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            )}
            <p className="foot">
              Muddatlar (Ilova 2): 100% to'xtash: xabar 2 soat, borish 8 soat; 30% va undan ko'p yo'qotish: 4 va 24 soat; 30% dan kam: 8 va 48 soat;
              kritik bo'lmagan: 24 soat va keyingi rejali tashrif. Muddat nosozlik aniqlangan paytdan hisoblanadi.
            </p>
          </>
        ) : (
          <p className="note">Bu davrda hodisa qayd etilmagan.</p>
        )}
      </section>

      {!day && (
        <>
          <section>
            <h2>{no.spareParts}. Ishlatilgan ehtiyot qismlar va ombor holati</h2>
            {moves.length ? (
              <>
                <p className="note lead">
                  Davrda {moves.length} ta harakat qayd etilgan, shundan {usedMoves} tasi ehtiyot qism ishlatilishi.
                </p>
                {!listed(moves) ? (
                  <p className="note">To'liq jurnal oylik hisobotlarda va Excel faylida.</p>
                ) : (
                  <table className={`compact${keep(moves.length)}`}>
                    <thead>
                      <tr><th>Sana</th><th>Ehtiyot qism</th><th>Raqami</th><th>Harakat</th><th className="r">Miqdor</th><th>Qayerga ishlatildi</th><th>Izoh</th></tr>
                    </thead>
                    <tbody>
                      {moves.map((m) => (
                        <tr key={m.id}>
                          <td className="nw">{date(m.movedOn)}</td>
                          <td>{m.part}</td>
                          <td>{m.partNumber ?? '—'}</td>
                          <td>{r.journalLabels.spareMoveKinds[m.kind]}</td>
                          <td className="r nw">{num(m.quantity, 2)} {m.unit}</td>
                          <td>{m.kind === 'used' ? place(m) : '—'}</td>
                          <td>{m.note ?? '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </>
            ) : (
              <p className="note">Bu davrda ehtiyot qism ishlatilmagan va omborda harakat bo'lmagan.</p>
            )}
            {stock.length > 0 && (
              <>
                <h3>Ombor holati, {date(r.to)}</h3>
                <table className={`compact${keep(stock.length)}`}>
                  <thead>
                    <tr><th>Ehtiyot qism</th><th>Raqami</th><th className="r">Qoldiq</th><th>Oxirgi inventarizatsiya</th></tr>
                  </thead>
                  <tbody>
                    {stock.map((l) => (
                      <tr key={`${l.part}|${l.partNumber ?? ''}`}>
                        <td>{l.part}</td>
                        <td>{l.partNumber ?? '—'}</td>
                        <td className="r nw">{num(l.quantity, 2)} {l.unit}</td>
                        <td className="nw">{l.lastInventoryOn ? date(l.lastInventoryOn) : "o'tkazilmagan"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <Remark text={r.notes.spareParts} />
          </section>
          <section>
            <h2>{no.hse}. Mehnat muhofazasi va atrof-muhit bo'yicha hodisalar</h2>
            {hse.length ? (
              <>
                <table className={`compact${keep(hse.length)}`}>
                  <thead>
                    <tr><th>Vaqti</th><th>Obyekt</th><th>Turi</th><th>Nima bo'ldi</th><th>Ko'rilgan choralar</th><th>Buyurtmachiga xabar</th></tr>
                  </thead>
                  <tbody>
                    {hse.map((e) => (
                      <tr key={e.id}>
                        <td className="nw">{time(e.occurredAt)}</td>
                        <td>{place(e)}</td>
                        <td>{r.journalLabels.hseKinds[e.kind]}</td>
                        <td>{e.description}</td>
                        <td>{e.actions ?? '—'}</td>
                        <Clock c={clock(e.noticeState, e.noticeDueAt, e.customerNotifiedAt)} via={e.customerNotifiedAt ? e.notifiedVia : null} />
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="foot">Shartnomaning 5.1.4-bandi: HSE hodisasi haqida Buyurtmachiga 24 soat ichida xabar beriladi.</p>
              </>
            ) : (
              <p className="note">Bu davrda mehnat muhofazasi va atrof-muhit bo'yicha hodisa qayd etilmagan.</p>
            )}
            <Remark text={r.notes.hse} />
          </section>
          {/* Kept with the section before them, so the signatures never stand alone on a last page. */}
          <div className="closing">
            <section>
              <h2>{no.recommendations}. Pudratchining tavsiyalari{yearly ? ' va keyingi yil texnik xizmat jadvali bo\'yicha takliflar' : ''}</h2>
              <Note text={r.notes.recommendations} />
            </section>

            <section className="signatures">
              <div><b>Pudratchi</b><span>____________________ / ____________________ /</span></div>
              <div><b>Buyurtmachi</b><span>____________________ / ____________________ /</span></div>
            </section>
          </div>
        </>
      )}
    </div>
  );
});
ReportDocument.displayName = 'ReportDocument';
