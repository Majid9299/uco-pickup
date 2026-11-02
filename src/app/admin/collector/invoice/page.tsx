"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateCommission } from "@/lib/commission";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function firstOfMonthISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function AdminCollectorInvoiceContent() {
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const collectorId = searchParams.get("id") ?? "";
  const { collectors, requests } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

  const [fromDate, setFromDate] = useState(firstOfMonthISO());
  const [toDate, setToDate] = useState(todayISO());

  const invoiceNumber = useMemo(
    () => `INV-${collectorId.slice(0, 8).toUpperCase()}-${todayISO().replace(/-/g, "")}`,
    [collectorId]
  );

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

  const items = requests.filter((r) => {
    if (r.collectorId !== collectorId || r.status !== "completed") return false;
    const day = r.completedAt?.slice(0, 10);
    if (fromDate && (!day || day < fromDate)) return false;
    if (toDate && (!day || day > toDate)) return false;
    return true;
  });

  const totalLiters = items.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMR = Math.round(items.reduce((s, r) => s + (r.totalOMR ?? 0), 0) * 1000) / 1000;
  const commission = calculateCommission(totalLiters);
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div className="print:hidden">
        <Link href={`/admin/collector/?id=${collectorId}`} className="text-xs font-semibold text-neutral-400">
          {t("← معلومات المجمّع", "← Collector info")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("فاتورة", "Invoice")} — {collector.name}</h1>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 print:hidden">
        <div className="grid grid-cols-2 gap-2">
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
        <button
          onClick={() => window.print()}
          className="mt-3 h-12 w-full rounded-2xl bg-neutral-900 text-sm font-bold text-white active:scale-[0.98]"
        >
          {t("🖨️ طباعة / حفظ PDF", "🖨️ Print / Save as PDF")}
        </button>
      </div>

      {/* منطقة الفاتورة القابلة للطباعة */}
      <div className="rounded-2xl border border-neutral-200 bg-white p-6 text-sm">
        <div className="flex items-start justify-between border-b border-neutral-200 pb-4">
          <div>
            <p className="text-lg font-extrabold text-neutral-900">{t("إنفير", "Invare")}</p>
            <p className="text-xs text-neutral-400">{t("نظام سحب زيت الطهي المستخدم", "Used Cooking Oil Pickup System")}</p>
          </div>
          <div className="text-end">
            <p className="text-base font-extrabold text-neutral-900">{t("فاتورة", "INVOICE")}</p>
            <p className="text-xs text-neutral-400" dir="ltr">
              {invoiceNumber}
            </p>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-4">
          <div>
            <p className="text-[11px] font-bold text-neutral-400">{t("فاتورة إلى", "Bill to")}</p>
            <p className="mt-1 font-bold text-neutral-800">{collector.name}</p>
            <p className="text-xs text-neutral-500" dir="ltr">{collector.whatsapp || "—"}</p>
            <p className="text-xs text-neutral-500">{collector.governorates.join(t("، ", ", "))}</p>
          </div>
          <div className="text-end">
            <p className="text-[11px] font-bold text-neutral-400">{t("الفترة", "Period")}</p>
            <p className="mt-1 text-xs text-neutral-700" dir="ltr">
              {new Date(fromDate).toLocaleDateString(dateLocale)} — {new Date(toDate).toLocaleDateString(dateLocale)}
            </p>
            <p className="mt-2 text-[11px] font-bold text-neutral-400">{t("تاريخ الإصدار", "Issue date")}</p>
            <p className="text-xs text-neutral-700" dir="ltr">{new Date().toLocaleDateString(dateLocale)}</p>
          </div>
        </div>

        <table className="mt-5 w-full text-xs">
          <thead>
            <tr className="border-b border-neutral-200 text-start text-neutral-400">
              <th className="py-2 font-medium">{t("البيان", "Description")}</th>
              <th className="py-2 text-end font-medium">{t("الكمية", "Quantity")}</th>
              <th className="py-2 text-end font-medium">{t("القيمة", "Value")}</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-neutral-100">
              <td className="py-2 text-neutral-700">{t("عمليات سحب مكتملة", "Completed pickups")}</td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{items.length}</td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{totalOMR} {t("ر.ع", "OMR")}</td>
            </tr>
            <tr className="border-b border-neutral-100">
              <td className="py-2 text-neutral-700">{t("إجمالي الكمية", "Total quantity")}</td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{totalLiters} {t("لتر", "L")}</td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{commission.tons} {t("طن", "t")}</td>
            </tr>
            <tr className="border-b border-neutral-100">
              <td className="py-2 text-neutral-700">{t("عمولة إنفير (2 ر.ع / طن)", "Invare commission (2 OMR / ton)")}</td>
              <td className="py-2"></td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{commission.commissionOMR} {t("ر.ع", "OMR")}</td>
            </tr>
            <tr className="border-b border-neutral-100">
              <td className="py-2 text-neutral-700">{t("ضريبة القيمة المضافة (5%)", "VAT (5%)")}</td>
              <td className="py-2"></td>
              <td className="py-2 text-end font-mono text-neutral-700" dir="ltr">{commission.vatOMR} {t("ر.ع", "OMR")}</td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4 flex items-center justify-between rounded-xl bg-neutral-900 px-4 py-3">
          <span className="text-sm font-bold text-white">{t("الإجمالي المستحق", "Total due")}</span>
          <span className="font-mono text-lg font-extrabold text-white" dir="ltr">
            {commission.totalDueOMR} {t("ر.ع", "OMR")}
          </span>
        </div>

        {items.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-[11px] font-bold text-neutral-400">{t("تفاصيل العمليات", "Pickup details")}</p>
            <table className="w-full text-[11px]">
              <thead>
                <tr className="border-b border-neutral-200 text-start text-neutral-400">
                  <th className="py-1.5 font-medium">{t("التاريخ", "Date")}</th>
                  <th className="py-1.5 font-medium">{t("المنشأة", "Facility")}</th>
                  <th className="py-1.5 text-end font-medium">{t("لتر", "L")}</th>
                  <th className="py-1.5 text-end font-medium">{t("ر.ع", "OMR")}</th>
                </tr>
              </thead>
              <tbody>
                {items.map((r) => (
                  <tr key={r.id} className="border-b border-neutral-50">
                    <td className="py-1.5 text-neutral-500" dir="ltr">{r.completedAt?.slice(0, 10)}</td>
                    <td className="py-1.5 text-neutral-700">{r.generatorName}</td>
                    <td className="py-1.5 text-end font-mono text-neutral-700" dir="ltr">{r.liters}</td>
                    <td className="py-1.5 text-end font-mono text-neutral-700" dir="ltr">{r.totalOMR}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  );
}

function AdminCollectorInvoicePage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <div className="print:hidden">
        <Header />
      </div>
      <Suspense fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}>
        <AdminCollectorInvoiceContent />
      </Suspense>
    </div>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <AdminCollectorInvoicePage />
    </AdminAuthProvider>
  );
}
