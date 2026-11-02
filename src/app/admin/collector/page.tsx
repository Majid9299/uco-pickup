"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateCommission } from "@/lib/commission";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function AdminCollectorInfoContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const collectorId = searchParams.get("id") ?? "";
  const { collectors, requests, generators } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

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

  const collectorRequests = requests.filter((r) => r.collectorId === collectorId);
  const completed = collectorRequests.filter((r) => r.status === "completed");
  const pending = collectorRequests.filter((r) => r.status === "pending");
  const collectorGenerators = generators.filter((g) => g.collectorId === collectorId);
  const liters = completed.reduce((s, r) => s + (r.liters ?? 0), 0);
  const omr = Math.round(completed.reduce((s, r) => s + (r.totalOMR ?? 0), 0) * 1000) / 1000;
  const commission = calculateCommission(liters);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{collector.name}</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between py-1.5">
          <span className="text-neutral-400">{t("المعرّف", "ID")}</span>
          <span className="font-mono font-semibold" dir="ltr">{collector.id}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-neutral-400">{t("رقم الواتساب", "WhatsApp number")}</span>
          <span className="font-mono font-semibold" dir="ltr">{collector.whatsapp || "—"}</span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-neutral-400">{t("الحالة", "Status")}</span>
          <span className={`font-bold ${collector.active ? "text-accent-600" : "text-red-600"}`}>
            {collector.active ? t("مفعّل", "Active") : t("معطّل", "Disabled")}
          </span>
        </div>
        <div className="flex justify-between py-1.5">
          <span className="text-neutral-400">{t("محافظات التغطية", "Coverage governorates")}</span>
          <span className="font-semibold">{collector.governorates.join(t("، ", ", "))}</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("عمليات مكتملة", "Completed pickups")}</p>
          <p className="mt-1 text-xl font-extrabold text-neutral-900">{completed.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("طلبات معلّقة", "Pending requests")}</p>
          <p className="mt-1 text-xl font-extrabold text-neutral-900">{pending.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("إجمالي الكمية", "Total quantity")}</p>
          <p className="mt-1 text-xl font-extrabold text-neutral-900">{liters} {t("لتر", "L")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("قيمة الصفقات", "Deal value")}</p>
          <p className="mt-1 text-xl font-extrabold text-neutral-900">{omr} {t("ر.ع", "OMR")}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("المولّدون المسجّلون", "Registered generators")}</p>
          <p className="mt-1 text-xl font-extrabold text-neutral-900">{collectorGenerators.length}</p>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="text-xs text-neutral-400">{t("المستحق لإنفير", "Due to Invare")}</p>
          <p className="mt-1 text-xl font-extrabold text-brand-700">{commission.totalDueOMR} {t("ر.ع", "OMR")}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Link
          href={`/admin/collector/transactions/?id=${collectorId}`}
          className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-center text-sm font-bold text-neutral-700 active:scale-[0.98]"
        >
          {t("📋 العمليات", "📋 Transactions")}
        </Link>
        <Link
          href={`/admin/collector/generators/?id=${collectorId}`}
          className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-center text-sm font-bold text-neutral-700 active:scale-[0.98]"
        >
          {t("🏪 المولّدون", "🏪 Generators")}
        </Link>
      </div>

      <Link
        href={`/admin/collector/invoice/?id=${collectorId}`}
        className="rounded-2xl bg-neutral-900 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
      >
        {t("🧾 إصدار فاتورة", "🧾 Generate invoice")}
      </Link>
    </main>
  );
}

function AdminCollectorInfoPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <AdminCollectorInfoContent />
      </Suspense>
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminCollectorInfoPage />
    </AdminAuthProvider>
  );
}
