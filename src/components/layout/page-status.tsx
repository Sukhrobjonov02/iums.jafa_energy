import React from "react";
import type { MenuProps } from "antd";
import { PageStatusDot } from "./PageStatusDot";

/**
 * Which admin pages work, as last checked against production. Shown only to the maintainer, as a
 * dot after each menu label, so he can see at a glance what still needs fixing; every other
 * account sees the plain menu. The map is part of the bundle, so it says nothing secret.
 */
export type PageHealth = "ok" | "partial" | "broken";

export interface PageStatus {
  health: PageHealth;
  /** Why, in a sentence: what fails or what is missing. */
  note: string;
}

/** User id of the maintainer (Abdulaziz, super_admin) on production. */
export const MAINTAINER_USER_ID = 14;

/** Checked on 2026-10-15, updated after that day's fixes. Keys are the menu keys (route paths). */
export const PAGE_STATUS: Record<string, PageStatus> = {
  "/admin": { health: "ok", note: "Umumiy raqamlar, daromad va prognoz to'g'ri chiqadi." },
  "/admin/availability": { health: "ok", note: "Ishlash foizi va uzilishlar, 10-sentabrdan beri." },
  "/admin/plan": { health: "ok", note: "Har stansiya: va'da qilingan yillik ishlab chiqarish va haqiqiy (Status_V 2.0.xlsx)." },
  "/admin/temperature": { health: "ok", note: "Uchala vendor haroratlari va ogohlantirish chegaralari." },
  "/admin/users": { health: "ok", note: "Foydalanuvchilar ro'yxati va tahrirlash." },
  "/admin/user-stations": { health: "ok", note: "Biriktirish ishlaydi; ro'yxatlar bazadan, tez yuklanadi." },
  "/admin/huawei": { health: "ok", note: "Huawei stansiyalari, qurilmalari va faol alarmlari." },
  "/admin/hopecloud/real-time-data": { health: "ok", note: "Bazadagi ma'lumot darhol chiqadi; Users tabi birinchi ochilganda ~16 soniya (HopeCloud'dan jonli)." },
  "/admin/hopecloud/sync-data": { health: "ok", note: "Stansiya, qurilma, alarm va aloqa modullari (modullar har kuni yangilanadi)." },
  "/admin/fsolar/realtime": { health: "ok", note: "Ofisdagi 2 ta qurilma, saqlangan ma'lumotdan." },
  "/admin/fsolar/devices": { health: "ok", note: "Ofisdagi 2 ta qurilma; ma'lumot eskirsa Offline deb chiqadi." },
  "/admin/fsolar/energy": { health: "ok", note: "Vendor'dan jonli, faqat ofis qurilmalari." },
  "/admin/fsolar/history": { health: "ok", note: "Saqlangan 5 daqiqalik tarix; jonli rejim ham bor." },
  "/admin/fsolar/alarms": { health: "ok", note: "Vendor'dan jonli, faqat ofis qurilmalari." },
  "/admin/soliscloud/dashboard": { health: "ok", note: "Jami raqamlar va Sync Now ishlaydi." },
  "/admin/soliscloud/stations": { health: "ok", note: "Ro'yxat, tafsilot va grafiklar ishlaydi." },
  "/admin/soliscloud/inverters": { health: "ok", note: "Ro'yxat, tafsilot va grafiklar ishlaydi." },
  "/admin/soliscloud/alarms": { health: "ok", note: "Jonli va saqlangan alarmlar." },
  "/admin/soliscloud/collectors": { health: "ok", note: "Ro'yxat, signal va diagnostika ishlaydi." },
};

/** The same menu with a status dot after every page that has a known status. */
export function withPageStatus(items: MenuProps["items"]): MenuProps["items"] {
  return (items ?? []).map((item) => {
    if (!item || !("key" in item)) return item;
    const node = item as { key?: React.Key; label?: React.ReactNode; children?: MenuProps["items"] };
    const status = typeof node.key === "string" ? PAGE_STATUS[node.key] : undefined;
    return {
      ...item,
      ...(status ? { label: <span>{node.label}<PageStatusDot status={status} /></span> } : {}),
      ...(node.children ? { children: withPageStatus(node.children) } : {}),
    } as (typeof items extends (infer T)[] | undefined ? T : never);
  });
}
