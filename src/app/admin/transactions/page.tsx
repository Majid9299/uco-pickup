"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateCommission, round } from "@/lib/commission";
import { GOVERNORATES } from "@/lib/mock-data";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function collectorLiters(collectorId: string, requests: { collectorId: string; status: string; liters?: number }[]) {
  return requests
    .filter((r) => r.collectorId === collectorId && r.status === "completed")
    .reduce((s, r) => s + (r.liters ?? 0), 0);
}

function AdminTransactionsContent() {
  const { t } = useLanguage();
  const { requests, collectors } = useData();

  const completed = requests.filter((r) => r.status === "completed");
  const totalLiters = completed.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMRRaw = completed.reduce((s, r) => s + (r.totalOMR ?? 0), 0);
  const totals = { liters: totalLiters, omr: round(totalOMRRaw), ...calculateCommission(totalLiters) };

  const reconciliation = collectors.map((c) => {
    const liters = collectorLiters(c.id, requests);
    return { collector: c, ...calculateCommission(liters), liters };
  });

  const [filterCollectorId, setFilterCollectorId] = useState("");
  const [filterGovernorate, setFilterGovernorate] = useState("");
  const [filterWilayat, setFilterWilayat] = useState("");

  const filterWilayats = filterGovernorate
    ? GOVERNORATES.find((g) => g.name === filterGovernorate)?.wilayats ?? []
    : [];

  const filteredCompleted = completed.filter(
    (r) =>
      (!filterCollectorId || r.collectorId === filterCollectorId) &&
      (!filterGovernorate || r.governorate === filterGovernorate) &&
      (!filterWilayat || r.wilayat === filterWilayat)
  );

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">
          {t("📋 المعاملات والمطابقة المالية", "📋 Transactions & reconciliation")}
        </h1>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label={t("عمليات مكتملة", "Completed pickups")} value={`${completed.length}`} />
        <StatCard label={t("إجمالي الكمية", "Total quantity")} value={`${totals.liters} ${t("لتر", "L")}`} sub={`${totals.tons} ${t("طن", "tons")}`} />
        <StatCard label={t("قيمة الصفقات", "Deal value")} value={`${totals.omr} ${t("ر.ع", "OMR")}`} />
        <StatCard
          label={t("مستحقات إنفير", "Invare's dues")}
          value={`${totals.totalDueOMR} ${t("ر.ع", "OMR")}`}
          sub={t(`عمولة ${totals.commissionOMR} + ضريبة ${totals.vatOMR}`, `Commission ${totals.commissionOMR} + VAT ${totals.vatOMR}`)}
        />
      </div>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-700">
          {t("المطابقة المالية حسب المجمّع", "Financial reconciliation by collector")}
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-100 text-start text-xs text-neutral-400">
                <th className="px-3 py-2 font-medium">{t("المجمّع", "Collector")}</th>
                <th className="px-3 py-2 font-medium">{t("الأطنان", "Tons")}</th>
                <th className="px-3 py-2 font-medium">{t("العمولة", "Commission")}</th>
                <th className="px-3 py-2 font-medium">{t("الضريبة", "VAT")}</th>
                <th className="px-3 py-2 font-medium">{t("المستحق", "Due")}</th>
              </tr>
            </thead>
            <tbody>
              {reconciliation.map(({ collector, tons, commissionOMR, vatOMR, totalDueOMR }) => (
                <tr key={collector.id} className="border-b border-neutral-50 last:border-0">
                  <td className="px-3 py-2 font-semibold text-neutral-800">{collector.name}</td>
                  <td className="px-3 py-2 text-neutral-600">{tons}</td>
                  <td className="px-3 py-2 text-neutral-600">{commissionOMR} {t("ر.ع", "OMR")}</td>
                  <td className="px-3 py-2 text-neutral-600">{vatOMR} {t("ر.ع", "OMR")}</td>
                  <td className="px-3 py-2 font-bold text-brand-700">{totalDueOMR} {t("ر.ع", "OMR")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-700">{t("سجل كل المعاملات المكتملة", "Log of all completed transactions")}</p>

        <div className="mb-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select
            value={filterCollectorId}
            onChange={(e) => setFilterCollectorId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("كل المجمّعين", "All collectors")}</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={filterGovernorate}
            onChange={(e) => {
              setFilterGovernorate(e.target.value);
              setFilterWilayat("");
            }}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("كل المحافظات", "All governorates")}</option>
            {GOVERNORATES.map((g) => (
              <option key={g.name} value={g.name}>
                {g.name}
              </option>
            ))}
          </select>
          <select
            value={filterWilayat}
            onChange={(e) => setFilterWilayat(e.target.value)}
            disabled={!filterGovernorate}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">{t("كل الولايات", "All wilayats")}</option>
            {filterWilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {filteredCompleted.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-400">{t("لا توجد معاملات مطابقة", "No matching transactions")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredCompleted.map((r) => {
              const collector = collectors.find((c) => c.id === r.collectorId);
              return (
                <div
                  key={r.id}
                  className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs"
                >
                  <div>
                    <p className="font-semibold text-neutral-700">{r.generatorName}</p>
                    <p className="text-neutral-400">
                      {collector?.name} · {r.wilayat}
                    </p>
                  </div>
                  <span className="font-bold text-neutral-700">
                    {r.liters} {t("لتر", "L")} · {r.totalOMR} {t("ر.ع", "OMR")}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <AdminTransactionsContent />
      </div>
    </AdminAuthProvider>
  );
}
