"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { calculateCommission } from "@/lib/commission";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function AdminCollectorTransactionsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const collectorId = searchParams.get("id") ?? "";
  const { collectors, requests } = useData();
  const collector = collectors.find((c) => c.id === collectorId);
  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  if (!collector) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
        <p className="text-sm text-neutral-500">{t("المجمّع غير موجود", "Collector not found")}</p>
        <Link href="/admin" className="text-sm font-bold text-brand-700">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
      </main>
    );
  }

  const completed = requests.filter((r) => r.collectorId === collectorId && r.status === "completed");

  const wilayats = governorate
    ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? []
    : [];

  const filtered = completed.filter((r) => {
    if (governorate && r.governorate !== governorate) return false;
    if (wilayat && r.wilayat !== wilayat) return false;
    const day = r.completedAt?.slice(0, 10);
    if (fromDate && (!day || day < fromDate)) return false;
    if (toDate && (!day || day > toDate)) return false;
    return true;
  });

  const totalLiters = filtered.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMR = Math.round(filtered.reduce((s, r) => s + (r.totalOMR ?? 0), 0) * 1000) / 1000;
  const commission = calculateCommission(totalLiters);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href={`/admin/collector/?id=${collectorId}`} className="text-xs font-semibold text-neutral-400">
          {t("← معلومات المجمّع", "← Collector info")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("عمليات", "Transactions")} — {collector.name}</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 grid grid-cols-2 gap-2">
          <select
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setWilayat("");
            }}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("كل المحافظات", "All governorates")}</option>
            {collector.governorates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={wilayat}
            onChange={(e) => setWilayat(e.target.value)}
            disabled={!governorate}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">{t("كل الولايات", "All wilayats")}</option>
            {wilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-neutral-500">{t("من تاريخ", "From date")}</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] font-semibold text-neutral-500">{t("إلى تاريخ", "To date")}</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700">{filtered.length} {t("عملية", "pickups")}</p>
          <p className="text-xs font-semibold text-neutral-500">
            {totalLiters} {t("لتر", "L")} · {totalOMR} {t("ر.ع", "OMR")}
          </p>
        </div>

        <div className="mb-3 rounded-xl bg-neutral-50 p-3">
          <p className="mb-2 text-[11px] font-bold text-neutral-500">
            {fromDate || toDate
              ? `${t("الفترة", "Period")}: ${fromDate || "—"} → ${toDate || "—"}`
              : t("الفترة: كل الأوقات", "Period: all time")}
          </p>
          <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-4">
            <div>
              <p className="text-[11px] text-neutral-400">{t("اللترات", "Liters")}</p>
              <p className="text-sm font-bold text-neutral-800">{totalLiters}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-400">{t("قيمة الصفقات", "Deal value")}</p>
              <p className="text-sm font-bold text-neutral-800">{totalOMR} {t("ر.ع", "OMR")}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-400">{t("عمولة إنفير", "Invare commission")}</p>
              <p className="text-sm font-bold text-neutral-800">{commission.commissionOMR} {t("ر.ع", "OMR")}</p>
            </div>
            <div>
              <p className="text-[11px] text-neutral-400">{t("المستحق (+ضريبة)", "Due (+VAT)")}</p>
              <p className="text-sm font-bold text-brand-700">{commission.totalDueOMR} {t("ر.ع", "OMR")}</p>
            </div>
          </div>
          <p className="mt-2 text-center text-[10px] text-neutral-400">
            {t("العمولة: 2 ر.ع لكل طن (1000 لتر)", "Commission: 2 OMR per ton (1000 L)")}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد عمليات مطابقة", "No matching pickups")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((r) => (
              <div key={r.id} className="rounded-xl border border-neutral-100 p-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-800">{r.generatorName}</span>
                  <span className="font-semibold text-neutral-700">
                    {r.liters} {t("لتر", "L")} · {r.totalOMR} {t("ر.ع", "OMR")}
                  </span>
                </div>
                <div className="mt-1 flex items-center justify-between">
                  <p className="text-neutral-400">
                    {r.wilayat} — {r.governorate}
                    {r.completedAt && ` · ${r.completedAt.slice(0, 10)}`}
                  </p>
                  <Link href={`/invoice/?r=${r.id}`} className="font-bold text-brand-700">
                    {t("🧾 الاستمارة", "🧾 Transfer note")}
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AdminCollectorTransactionsPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <AdminCollectorTransactionsContent />
      </Suspense>
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminCollectorTransactionsPage />
    </AdminAuthProvider>
  );
}
