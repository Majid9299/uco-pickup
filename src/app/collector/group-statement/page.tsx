"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";

function statementVerifyUrl(groupId: string): string {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/collector/group-statement/?group=${groupId}`;
}

function StatementContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group") ?? "";
  const { ready, requests, generators, generatorGroups, collectors } = useData();
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const group = generatorGroups.find((g) => g.id === groupId);
  const collector = group ? collectors.find((c) => c.id === group.collectorId) : undefined;
  const branches = generators.filter((g) => g.groupId === groupId);
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";
  const pageSize = collector?.invoicePageSize ?? "a4";

  if (!ready) {
    return <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>;
  }

  if (!group) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">⚠️</div>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("المجموعة غير موجودة", "Group not found")}</h1>
        <Link href="/collector/generators" className="text-sm font-bold text-brand-700">
          {t("← المولّدون", "← Generators")}
        </Link>
      </main>
    );
  }

  const inRange = (completedAt?: string) => {
    if (!completedAt) return false;
    const d = completedAt.slice(0, 10);
    if (from && d < from) return false;
    if (to && d > to) return false;
    return true;
  };

  const branchRows = branches.map((b) => {
    const pickups = requests
      .filter((r) => r.generatorId === b.id && r.status === "completed" && inRange(r.completedAt))
      .sort((a, z) => (a.completedAt ?? "").localeCompare(z.completedAt ?? ""));
    const liters = pickups.reduce((s, r) => s + (r.liters ?? 0), 0);
    const total = pickups.reduce((s, r) => s + (r.totalOMR ?? 0), 0);
    return { branch: b, pickups, liters, total };
  });

  const grandLiters = branchRows.reduce((s, r) => s + r.liters, 0);
  const grandTotal = Math.round(branchRows.reduce((s, r) => s + r.total, 0) * 1000) / 1000;
  const round3 = (n: number) => Math.round(n * 1000) / 1000;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-4 px-5 py-6">
      <style>{`@media print { @page { size: ${pageSize.toUpperCase()}; margin: 12mm; } main { max-width: 100% !important; } }`}</style>

      <div className="flex gap-2 print:hidden">
        <Link
          href="/collector/generators"
          className="rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-bold text-neutral-600"
        >
          {t("← رجوع", "← Back")}
        </Link>
        <button
          onClick={() => window.print()}
          className="flex-1 rounded-2xl bg-neutral-900 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
        >
          {t("🖨️ طباعة / حفظ PDF", "🖨️ Print / Save as PDF")}
        </button>
      </div>

      {/* فلتر الفترة */}
      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-neutral-200 bg-white p-3 print:hidden">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("من تاريخ", "From date")}</label>
          <input
            type="date"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("إلى تاريخ", "To date")}</label>
          <input
            type="date"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        {(from || to) && (
          <button
            onClick={() => {
              setFrom("");
              setTo("");
            }}
            className="col-span-2 text-[11px] font-semibold text-brand-700"
          >
            {t("عرض كل الفترات", "Show all periods")}
          </button>
        )}
      </div>

      {/* المستند */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-5 text-sm">
        <div className="flex items-start justify-between border-b-2 border-neutral-800 pb-3">
          <div>
            <p className="text-base font-extrabold text-neutral-900">{collector?.companyName || collector?.name || "—"}</p>
            {collector?.crNumber && (
              <p className="text-[11px] text-neutral-400" dir="ltr">{t("س.ت:", "CR:")} {collector.crNumber}</p>
            )}
          </div>
          <div className="text-end">
            <p className="text-sm font-extrabold text-neutral-900">
              كشف حساب مجمّع
              <span className="block text-[10px] font-semibold text-neutral-500">Consolidated Statement</span>
            </p>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px]">
          <p className="font-bold text-neutral-700">
            {t("المجموعة:", "Group:")} <span className="font-extrabold text-neutral-900">{group.name}</span>
            <span className="text-neutral-400"> · </span>
            <span dir="ltr" className="text-neutral-500">{group.whatsapp || "—"}</span>
          </p>
          <p className="text-neutral-500">
            {t("الفترة:", "Period:")}{" "}
            {from || to ? (
              <span dir="ltr">{from || "…"} → {to || "…"}</span>
            ) : (
              t("كل الفترات", "All time")
            )}
          </p>
        </div>

        {/* جدول لكل فرع */}
        <div className="mt-4 flex flex-col gap-4">
          {branchRows.map(({ branch, pickups, liters, total }) => (
            <div key={branch.id}>
              <p className="mb-1 text-xs font-extrabold text-neutral-800">
                🏬 {branch.name} <span className="font-normal text-neutral-400">— {branch.wilayat}</span>
              </p>
              <table className="w-full border-collapse text-[11px]">
                <thead>
                  <tr className="bg-neutral-100 text-neutral-600">
                    <th className="border border-neutral-300 px-2 py-1.5 text-start">{t("التاريخ", "Date")}</th>
                    <th className="border border-neutral-300 px-2 py-1.5 text-end">{t("الكمية (لتر)", "Qty (L)")}</th>
                    <th className="border border-neutral-300 px-2 py-1.5 text-end">{t("سعر اللتر", "Price/L")}</th>
                    <th className="border border-neutral-300 px-2 py-1.5 text-end">{t("الإجمالي", "Total")}</th>
                  </tr>
                </thead>
                <tbody>
                  {pickups.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="border border-neutral-300 px-2 py-2 text-center text-neutral-400">
                        {t("لا سحوبات في هذه الفترة", "No pickups in this period")}
                      </td>
                    </tr>
                  ) : (
                    pickups.map((r) => (
                      <tr key={r.id} className="text-neutral-700">
                        <td className="border border-neutral-300 px-2 py-1.5" dir="ltr">
                          {r.completedAt ? new Date(r.completedAt).toLocaleDateString(dateLocale) : "—"}
                        </td>
                        <td className="border border-neutral-300 px-2 py-1.5 text-end font-mono" dir="ltr">{r.liters}</td>
                        <td className="border border-neutral-300 px-2 py-1.5 text-end font-mono" dir="ltr">{r.pricePerLiterOMR}</td>
                        <td className="border border-neutral-300 px-2 py-1.5 text-end font-mono" dir="ltr">{r.totalOMR}</td>
                      </tr>
                    ))
                  )}
                  {pickups.length > 0 && (
                    <tr className="bg-neutral-50 font-bold text-neutral-800">
                      <td className="border border-neutral-300 px-2 py-1.5 text-end">{t("إجمالي الفرع", "Branch total")}</td>
                      <td className="border border-neutral-300 px-2 py-1.5 text-end font-mono" dir="ltr">{round3(liters)}</td>
                      <td className="border border-neutral-300 px-2 py-1.5"></td>
                      <td className="border border-neutral-300 px-2 py-1.5 text-end font-mono" dir="ltr">{round3(total)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          ))}
          {branchRows.length === 0 && (
            <p className="py-4 text-center text-xs text-neutral-400">{t("لا فروع في هذه المجموعة", "No branches in this group")}</p>
          )}
        </div>

        {/* الإجمالي الكلي */}
        <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3">
          <span className="text-sm font-bold text-white">{t("الإجمالي الكلي", "Grand total")}</span>
          <span className="font-mono text-sm font-extrabold text-white" dir="ltr">
            {round3(grandLiters)} {t("لتر", "L")} · {grandTotal} {t("ر.ع", "OMR")}
          </span>
        </div>

        <div className="mt-4 flex items-end justify-between">
          <p className="text-[10px] text-neutral-400">
            {t("عدد الفروع:", "Branches:")} {branches.length}
          </p>
          <div className="flex flex-col items-center gap-1">
            <QRCodeSVG value={statementVerifyUrl(group.id)} size={56} />
            <p className="text-[9px] text-neutral-400">{t("تحقّق / Verify", "تحقّق / Verify")}</p>
          </div>
        </div>
      </div>
    </main>
  );
}

export default function GroupStatementPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="print:hidden">
        <Header />
      </div>
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <StatementContent />
      </Suspense>
    </div>
  );
}
