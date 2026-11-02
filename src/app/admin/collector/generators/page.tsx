"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";
import { Generator } from "@/lib/types";

function AdminGeneratorEditForm({ generator, onClose }: { generator: Generator; onClose: () => void }) {
  const { t } = useLanguage();
  const { updateGenerator } = useData();
  const [name, setName] = useState(generator.name);
  const [whatsapp, setWhatsapp] = useState(generator.whatsapp);
  const [governorate, setGovernorate] = useState(generator.governorate);
  const [wilayat, setWilayat] = useState(generator.wilayat);
  const [busy, setBusy] = useState(false);

  const wilayats = GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? [];
  const isBranch = !!generator.groupId;
  const isValid = name.trim() && (isBranch || whatsapp.trim()) && governorate && wilayat;

  async function submit() {
    if (!isValid) return;
    setBusy(true);
    try {
      await updateGenerator(generator.id, {
        name: name.trim(),
        whatsapp: whatsapp.trim(),
        governorate,
        wilayat,
      });
      onClose();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
      <label className="text-[11px] font-semibold text-neutral-500">{t("اسم المنشأة", "Facility name")}</label>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <label className="text-[11px] font-semibold text-neutral-500">
        {isBranch ? t("رقم الواتساب (اختياري للفرع)", "WhatsApp (optional for branch)") : t("رقم الواتساب", "WhatsApp number")}
      </label>
      <input
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        dir="ltr"
        className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <select
          value={governorate}
          onChange={(e) => {
            setGovernorate(e.target.value);
            setWilayat(GOVERNORATES.find((g) => g.name === e.target.value)?.wilayats[0] ?? "");
          }}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {GOVERNORATES.map((g) => (
            <option key={g.name} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
        <select
          value={wilayat}
          onChange={(e) => setWilayat(e.target.value)}
          className="rounded-lg border border-neutral-200 bg-white px-2 py-2 text-sm focus:border-brand-500 focus:outline-none"
        >
          {wilayats.map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <div className="mt-1 flex gap-2">
        <button
          onClick={submit}
          disabled={!isValid || busy}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {busy ? t("جارِ الحفظ...", "Saving...") : t("حفظ التعديلات", "Save changes")}
        </button>
        <button onClick={onClose} className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500">
          {t("إلغاء", "Cancel")}
        </button>
      </div>
    </div>
  );
}

function AdminCollectorGeneratorsContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const collectorId = searchParams.get("id") ?? "";
  const { collectors, generators, requests, toggleGeneratorActive, deleteGenerator } = useData();
  const collector = collectors.find((c) => c.id === collectorId);
  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

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

  const myGenerators = generators.filter((g) => g.collectorId === collectorId);

  const wilayats = governorate
    ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? []
    : [];

  const filtered = myGenerators.filter(
    (g) => (!governorate || g.governorate === governorate) && (!wilayat || g.wilayat === wilayat)
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href={`/admin/collector/?id=${collectorId}`} className="text-xs font-semibold text-neutral-400">
          {t("← معلومات المجمّع", "← Collector info")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("المولّدون", "Generators")} — {collector.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{myGenerators.length} {t("منشأة مسجّلة", "facilities registered")}</p>
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
        </div>

        {filtered.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد منشآت مطابقة", "No matching facilities")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filtered.map((g) => (
              <div key={g.id} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="min-w-0 truncate text-sm font-bold text-neutral-800">{g.name}</p>
                  <div className="flex flex-none flex-wrap items-center justify-end gap-1.5">
                    <button
                      onClick={() => toggleGeneratorActive(g.id)}
                      className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                        g.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                      }`}
                    >
                      {g.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
                    </button>
                    <button
                      onClick={() => setEditingId((prev) => (prev === g.id ? null : g.id))}
                      className="rounded-full bg-neutral-100 px-3 py-1.5 text-[11px] font-bold text-neutral-600"
                    >
                      {t("✏️ تعديل", "✏️ Edit")}
                    </button>
                    <button
                      onClick={() => {
                        const count = requests.filter((r) => r.generatorId === g.id).length;
                        if (
                          confirm(
                            t(
                              `حذف "${g.name}" نهائيًا؟ راح ينحذف معه ${count} عملية سحب مسجّلة له. لا يمكن التراجع.`,
                              `Permanently delete "${g.name}"? Its ${count} recorded pickups will be deleted too. This can't be undone.`
                            )
                          )
                        ) {
                          deleteGenerator(g.id).catch((e) => alert((e as Error).message));
                        }
                      }}
                      className="rounded-full bg-red-50 px-3 py-1.5 text-[11px] font-bold text-red-600"
                    >
                      {t("🗑️ حذف", "🗑️ Delete")}
                    </button>
                  </div>
                </div>
                {editingId === g.id && <AdminGeneratorEditForm generator={g} onClose={() => setEditingId(null)} />}
                <div className="mt-1.5 text-[11px]">
                  <div className="flex justify-between py-0.5">
                    <span className="text-neutral-400">{t("المنطقة", "Area")}</span>
                    <span className="font-semibold text-neutral-600">{g.wilayat} — {g.governorate}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-neutral-400">{t("رقم الواتساب", "WhatsApp number")}</span>
                    <span className="font-mono font-semibold text-neutral-600" dir="ltr">{g.whatsapp || "—"}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-neutral-400">{t("معرّف المولّد", "Generator ID")}</span>
                    <span className="font-mono font-semibold text-neutral-600" dir="ltr">{g.id}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-neutral-400">{t("تاريخ التسجيل", "Registered on")}</span>
                    <span className="font-semibold text-neutral-600">{g.registeredAt?.slice(0, 10) || "—"}</span>
                  </div>
                  {g.lat && g.lng && (
                    <div className="flex justify-end py-0.5">
                      <a
                        href={`https://www.google.com/maps?q=${g.lat},${g.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-bold text-brand-700"
                      >
                        {t("عرض على الخريطة ←", "View on map ←")}
                      </a>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

function AdminCollectorGeneratorsPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <AdminCollectorGeneratorsContent />
      </Suspense>
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminCollectorGeneratorsPage />
    </AdminAuthProvider>
  );
}
