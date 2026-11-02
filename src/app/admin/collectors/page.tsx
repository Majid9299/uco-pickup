"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { Collector } from "@/lib/types";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";
import { beginImpersonation } from "@/components/ImpersonationBanner";

function AddCollectorForm() {
  const { t } = useLanguage();
  const { addCollector } = useData();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [selectedGovernorates, setSelectedGovernorates] = useState<Set<string>>(new Set());
  const [open, setOpen] = useState(false);

  function toggleGovernorate(g: string) {
    setSelectedGovernorates((prev) => {
      const next = new Set(prev);
      if (next.has(g)) next.delete(g);
      else next.add(g);
      return next;
    });
  }

  async function submit() {
    await addCollector({
      name: name.trim(),
      whatsapp: whatsapp.trim(),
      governorates: Array.from(selectedGovernorates),
    });
    setName("");
    setWhatsapp("");
    setSelectedGovernorates(new Set());
    setOpen(false);
  }

  const isValid = name.trim() && selectedGovernorates.size > 0;

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-500"
      >
        {t("+ إضافة مجمّع جديد", "+ Add new collector")}
      </button>
    );
  }

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t("اسم شركة التجميع", "Collection company name")}
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <PhoneInput value={whatsapp} onChange={setWhatsapp} placeholder={t("9xxx xxxx (اختياري)", "9xxx xxxx (optional)")} size="sm" />
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-neutral-500">{t("محافظات التغطية", "Coverage governorates")}</p>
        <div className="flex flex-wrap gap-1.5">
          {GOVERNORATES.map((g) => (
            <button
              key={g.name}
              onClick={() => toggleGovernorate(g.name)}
              className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                selectedGovernorates.has(g.name)
                  ? "bg-brand-600 text-white"
                  : "bg-white text-neutral-500 ring-1 ring-neutral-200"
              }`}
            >
              {g.name}
            </button>
          ))}
        </div>
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {t("حفظ المجمّع", "Save collector")}
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
    </div>
  );
}

function AdminCollectorsContent() {
  const { t } = useLanguage();
  const router = useRouter();
  const { requests, collectors, generators, toggleCollectorActive, deleteCollector } = useData();
  const completed = requests.filter((r) => r.status === "completed");

  function enterAs(c: Collector) {
    beginImpersonation(c.name, c.id);
    router.push("/collector");
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">
          {t("🏢 المجمّعون", "🏢 Collectors")} ({collectors.length})
        </h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <AddCollectorForm />
        <div className="flex flex-col gap-2">
          {collectors.map((c: Collector) => {
            const collectorOpsCount = completed.filter((r) => r.collectorId === c.id).length;
            const collectorGensCount = generators.filter((g) => g.collectorId === c.id).length;

            function handleDelete() {
              const warning = t(
                `حذف "${c.name}" نهائيًا؟ بيحذف معه ${collectorGensCount} مولّد و${collectorOpsCount} عملية مكتملة. ما يمكن التراجع.`,
                `Permanently delete "${c.name}"? This will also delete ${collectorGensCount} generators and ${collectorOpsCount} completed transactions. This cannot be undone.`
              );
              if (window.confirm(warning)) {
                deleteCollector(c.id);
              }
            }

            return (
              <div key={c.id} className="rounded-xl bg-neutral-50 px-3 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-neutral-800">{c.name}</p>
                    <p className="text-[11px] text-neutral-400">
                      {c.governorates.join(t("، ", ", "))} · {c.whatsapp || t("بدون رقم واتساب", "no WhatsApp number")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleCollectorActive(c.id)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        c.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {c.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
                    </button>
                    <button
                      onClick={handleDelete}
                      className="rounded-full bg-white px-2.5 py-1.5 text-[11px] font-bold text-red-500 ring-1 ring-red-200"
                    >
                      {t("🗑️ حذف", "🗑️ Delete")}
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap gap-1.5">
                  <button
                    onClick={() => enterAs(c)}
                    className="rounded-full bg-amber-500 px-2.5 py-1 text-[11px] font-bold text-white"
                  >
                    {t("🔑 دخول كـ", "🔑 Log in as")}
                  </button>
                  <Link
                    href={`/admin/collector/?id=${c.id}`}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-600 ring-1 ring-neutral-200"
                  >
                    {t("ℹ️ معلومات", "ℹ️ Info")}
                  </Link>
                  <Link
                    href={`/admin/collector/transactions/?id=${c.id}`}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-600 ring-1 ring-neutral-200"
                  >
                    {t("📋 العمليات", "📋 Transactions")} ({collectorOpsCount})
                  </Link>
                  <Link
                    href={`/admin/collector/generators/?id=${c.id}`}
                    className="rounded-full bg-white px-2.5 py-1 text-[11px] font-bold text-neutral-600 ring-1 ring-neutral-200"
                  >
                    {t("🏪 المولّدون", "🏪 Generators")} ({collectorGensCount})
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <AdminCollectorsContent />
      </div>
    </AdminAuthProvider>
  );
}
