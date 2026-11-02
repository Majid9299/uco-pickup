"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function AdminGeneratorsContent() {
  const { t } = useLanguage();
  const { generators, collectors, toggleGeneratorActive, reassignGenerator } = useData();

  const [filterCollectorId, setFilterCollectorId] = useState("");
  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkTargetId, setBulkTargetId] = useState("");

  const wilayats = governorate
    ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? []
    : [];

  const filtered = generators.filter((g) => {
    if (filterCollectorId && g.collectorId !== filterCollectorId) return false;
    if (governorate && g.governorate !== governorate) return false;
    if (wilayat && g.wilayat !== wilayat) return false;
    const day = g.registeredAt?.slice(0, 10);
    if (fromDate && (!day || day < fromDate)) return false;
    if (toDate && (!day || day > toDate)) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((g) => selectedIds.has(g.id));

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll() {
    setSelectedIds((prev) => {
      if (allSelected) return new Set();
      return new Set(filtered.map((g) => g.id));
    });
  }

  async function transferSelected() {
    if (!bulkTargetId || selectedIds.size === 0) return;
    await Promise.all(Array.from(selectedIds).map((id) => reassignGenerator(id, bulkTargetId)));
    setSelectedIds(new Set());
    setBulkTargetId("");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("إدارة المولّدين", "Manage generators")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("نقل المولّدين بين المجمّعين — فرديًا أو جماعيًا", "Move generators between collectors — individually or in bulk")}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <select
            value={filterCollectorId}
            onChange={(e) => setFilterCollectorId(e.target.value)}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("كل المجمّعين (الحالي)", "All collectors (current)")}</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setWilayat("");
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
          <div className="grid grid-cols-2 gap-2">
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs focus:border-brand-500 focus:outline-none"
            />
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              dir="ltr"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-2 py-2 text-xs focus:border-brand-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="mb-3 flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold text-neutral-500">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={toggleSelectAll}
              className="h-4 w-4 accent-brand-600"
            />
            {t("تحديد الكل", "Select all")}
          </label>
          <p className="text-xs font-semibold text-neutral-500">
            {filtered.length} {t("مولّد", "generators")}
            {selectedIds.size > 0 && ` · ${selectedIds.size} ${t("محدّد", "selected")}`}
          </p>
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد منشآت مطابقة", "No matching facilities")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((g) => {
              const current = collectors.find((c) => c.id === g.collectorId);
              return (
                <div key={g.id} className="rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-start gap-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(g.id)}
                      onChange={() => toggleSelect(g.id)}
                      className="mt-1 h-4 w-4 accent-brand-600"
                    />
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-bold text-neutral-800">{g.name}</p>
                        <button
                          onClick={() => toggleGeneratorActive(g.id)}
                          className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${
                            g.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                          }`}
                        >
                          {g.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
                        </button>
                      </div>
                      <p className="mt-0.5 text-[11px] text-neutral-400">
                        {g.wilayat} — {g.governorate}
                        {g.registeredAt && ` · ${g.registeredAt.slice(0, 10)}`}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <span className="text-[11px] text-neutral-400">{t("المجمّع الحالي:", "Current collector:")}</span>
                        <select
                          value={g.collectorId}
                          onChange={(e) => reassignGenerator(g.id, e.target.value)}
                          className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-700 focus:border-brand-500 focus:outline-none"
                        >
                          {!current && <option value="">{t("بدون مجمّع", "No collector")}</option>}
                          {collectors.map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex gap-2 border-t border-neutral-100 pt-4">
          <select
            value={bulkTargetId}
            onChange={(e) => setBulkTargetId(e.target.value)}
            className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm focus:border-brand-500 focus:outline-none"
          >
            <option value="">{t("انقل المحدّد إلى مجمّع...", "Move selected to collector...")}</option>
            {collectors.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            onClick={transferSelected}
            disabled={!bulkTargetId || selectedIds.size === 0}
            className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            🔀 {t("نقل", "Move")} ({selectedIds.size})
          </button>
        </div>
      </div>
    </main>
  );
}

function AdminGeneratorsPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <AdminGeneratorsContent />
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminGeneratorsPage />
    </AdminAuthProvider>
  );
}
