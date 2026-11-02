"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";
import { Factory } from "@/lib/types";

function FactoryForm({ factory, onClose }: { factory?: Factory; onClose: () => void }) {
  const { t } = useLanguage();
  const { addFactory, updateFactory } = useData();
  const [name, setName] = useState(factory?.name ?? "");
  const [whatsapp, setWhatsapp] = useState(factory?.whatsapp ?? "");
  const [taxNumber, setTaxNumber] = useState(factory?.taxNumber ?? "");
  const [crNumber, setCrNumber] = useState(factory?.crNumber ?? "");
  const [governorates, setGovernorates] = useState<string[]>(factory?.governorates ?? []);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const valid = name.trim().length > 0;

  function toggleGov(name: string) {
    setGovernorates((prev) => (prev.includes(name) ? prev.filter((g) => g !== name) : [...prev, name]));
  }

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const input = {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        governorates,
        taxNumber: taxNumber.trim() || undefined,
        crNumber: crNumber.trim() || undefined,
      };
      if (factory) await updateFactory(factory.id, input);
      else await addFactory(input);
      onClose();
    } catch (err) {
      const msg = (err as Error).message;
      const missing = /factories|schema cache|does not exist|PGRST205/i.test(msg);
      setError(
        missing
          ? t("قاعدة البيانات لسا ما تحدّثت — شغّل كود SQL مرة واحدة.", "Database not updated — run the one-time SQL.")
          : t(`تعذّر الحفظ: ${msg}`, `Save failed: ${msg}`)
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-brand-100 bg-brand-50/40 p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("اسم المصنع", "Factory name")}</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t("مثال: مصنع عُمان لإعادة التدوير", "e.g. Oman Recycling Plant")}
          className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("رقم الواتساب (اختياري)", "WhatsApp (optional)")}</label>
        <PhoneInput value={whatsapp} onChange={setWhatsapp} size="sm" />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-500">{t("الرقم الضريبي", "Tax number")}</label>
          <input
            value={taxNumber}
            onChange={(e) => setTaxNumber(e.target.value)}
            dir="ltr"
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-neutral-500">{t("رقم السجل", "CR number")}</label>
          <input
            value={crNumber}
            onChange={(e) => setCrNumber(e.target.value)}
            dir="ltr"
            className="rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("المحافظات (اختياري)", "Governorates (optional)")}</label>
        <div className="flex flex-wrap gap-1.5">
          {GOVERNORATES.map((g) => (
            <button
              key={g.name}
              type="button"
              onClick={() => toggleGov(g.name)}
              className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                governorates.includes(g.name) ? "bg-brand-600 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={submit}
          disabled={!valid || busy}
          className="flex-1 rounded-xl bg-brand-600 py-2.5 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? t("جارِ الحفظ...", "Saving...") : factory ? t("حفظ", "Save") : t("إضافة المصنع", "Add factory")}
        </button>
        <button onClick={onClose} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500">
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      {error && <p className="rounded-lg bg-red-50 p-2 text-center text-[11px] font-semibold text-red-600">{error}</p>}
    </div>
  );
}

function AdminFactoriesContent() {
  const { t } = useLanguage();
  const { factories, sales, toggleFactoryActive, deleteFactory } = useData();
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("🏭 مصانع إعادة التدوير", "🏭 Recycling factories")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {t("الجهات المشترية اللي يبيع لها المجمّعون", "The buyers that collectors sell to")}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-800">
            {factories.length} {t("مصنع", "factories")}
          </p>
          {!creating && (
            <button
              onClick={() => setCreating(true)}
              className="rounded-full bg-brand-600 px-3 py-1.5 text-[11px] font-bold text-white active:scale-[0.98]"
            >
              {t("➕ مصنع جديد", "➕ New factory")}
            </button>
          )}
        </div>

        {creating && (
          <div className="mb-3">
            <FactoryForm onClose={() => setCreating(false)} />
          </div>
        )}

        {factories.length === 0 && !creating ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد مصانع بعد", "No factories yet")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {factories.map((f) =>
              editingId === f.id ? (
                <FactoryForm key={f.id} factory={f} onClose={() => setEditingId(null)} />
              ) : (
                <div key={f.id} className="rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-neutral-800">🏭 {f.name}</p>
                      <p className="text-[11px] text-neutral-400" dir="ltr">{f.whatsapp || "—"}</p>
                    </div>
                    <div className="flex flex-none flex-wrap items-center justify-end gap-1.5">
                      <button
                        onClick={() => toggleFactoryActive(f.id)}
                        className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                          f.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                        }`}
                      >
                        {f.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
                      </button>
                      <button
                        onClick={() => setEditingId(f.id)}
                        className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-600"
                      >
                        {t("✏️ تعديل", "✏️ Edit")}
                      </button>
                      <button
                        onClick={() => {
                          const count = sales.filter((s) => s.buyerFactoryId === f.id).length;
                          if (
                            confirm(
                              t(
                                `حذف "${f.name}"؟ راح تنحذف معه ${count} عملية بيع مسجّلة له.`,
                                `Delete "${f.name}"? Its ${count} recorded sales will be deleted too.`
                              )
                            )
                          ) {
                            deleteFactory(f.id).catch((e) => alert((e as Error).message));
                          }
                        }}
                        className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600"
                      >
                        {t("🗑️ حذف", "🗑️ Delete")}
                      </button>
                    </div>
                  </div>
                  {f.governorates.length > 0 && (
                    <p className="mt-1.5 text-[11px] text-neutral-400">{f.governorates.join("، ")}</p>
                  )}
                </div>
              )
            )}
          </div>
        )}
      </div>
    </main>
  );
}

function AdminFactoriesPage() {
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <AdminFactoriesContent />
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminFactoriesPage />
    </AdminAuthProvider>
  );
}
