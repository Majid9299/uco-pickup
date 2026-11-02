"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";

function CollectorTransactionsContent({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { requests, collectors } = useData();
  const collector = collectors.find((c) => c.id === collectorId);
  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");

  const completed = requests.filter(
    (r) => r.collectorId === collectorId && r.status === "completed"
  );

  const wilayats = governorate
    ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? []
    : [];

  const filtered = completed.filter(
    (r) => (!governorate || r.governorate === governorate) && (!wilayat || r.wilayat === wilayat)
  );

  const totalLiters = filtered.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMR = Math.round(filtered.reduce((s, r) => s + (r.totalOMR ?? 0), 0) * 1000) / 1000;

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/collector" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة المجمّع", "← Collector dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("المعاملات المكتملة", "Completed transactions")}</h1>
        <p className="mt-1 text-sm text-neutral-500">{collector?.name}</p>
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
            {collector?.governorates.map((g) => (
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

        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700">{filtered.length} {t("عملية", "pickups")}</p>
          <p className="text-xs font-semibold text-neutral-500">
            {totalLiters} {t("لتر", "L")} · {totalOMR} {t("ر.ع", "OMR")}
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
                  <div className="flex gap-3">
                    <Link href={`/invoice/?r=${r.id}&copy=1`} className="font-bold text-neutral-500">
                      {t("🧾 نسخة الكميات", "🧾 Quantity copy")}
                    </Link>
                    <Link href={`/invoice/?r=${r.id}`} className="font-bold text-brand-700">
                      {t("🧾 الاستمارة", "🧾 Transfer note")}
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CollectorTransactionsPage() {
  const { t } = useLanguage();
  const { collectorId } = useCollectorSession();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      {!collectorId ? (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("سجّل الدخول أولًا من الصفحة الرئيسية", "Log in first from the home page")}</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
        </main>
      ) : (
        <CollectorTransactionsContent collectorId={collectorId} />
      )}
    </div>
  );
}
