"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateCommission, round } from "@/lib/commission";
import { AdminAuthProvider, useAdminAuth } from "@/components/admin/AdminAuth";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function NavCard({ href, icon, title, sub }: { href: string; icon: string; title: string; sub: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <p className="text-sm font-bold text-neutral-800">{title}</p>
          <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>
        </div>
      </div>
      <span className="text-neutral-400">‹</span>
    </Link>
  );
}

function AdminDashboard() {
  const { t } = useLanguage();
  const { logout } = useAdminAuth();
  const { requests, collectors, generators, factories, sales } = useData();

  const completed = requests.filter((r) => r.status === "completed");
  const totalLiters = completed.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMRRaw = completed.reduce((s, r) => s + (r.totalOMR ?? 0), 0);
  const totals = { liters: totalLiters, omr: round(totalOMRRaw), ...calculateCommission(totalLiters) };
  const completedSales = sales.filter((s) => s.status === "completed").length;

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-neutral-400">{t("وضع الإدارة", "Admin mode")}</p>
            <h1 className="text-lg font-extrabold text-neutral-900">{t("لوحة الإدارة", "Admin dashboard")}</h1>
          </div>
          <button
            onClick={logout}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm"
          >
            {t("🚪 خروج", "🚪 Log out")}
          </button>
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

        <div className="flex flex-col gap-3">
          <NavCard
            href="/admin/collectors"
            icon="🏢"
            title={t("المجمّعون", "Collectors")}
            sub={`${collectors.length} ${t("مجمّع — إضافة وإدارة", "collectors — add & manage")}`}
          />
          <NavCard
            href="/admin/generators"
            icon="🏪"
            title={t("المولّدون", "Generators")}
            sub={`${generators.length} ${t("مولّد — إدارة ونقل بين المجمّعين", "generators — manage & transfer")}`}
          />
          <NavCard
            href="/admin/factories"
            icon="🏭"
            title={t("مصانع إعادة التدوير", "Recycling factories")}
            sub={`${factories.length} ${t("مصنع — الجهات اللي يبيع لها المجمّعون", "factories — buyers")}`}
          />
          <NavCard
            href="/admin/sales"
            icon="💰"
            title={t("المبيعات", "Sales")}
            sub={`${completedSales} ${t("عملية بيع — مجمّع لمجمّع/مصنع", "sales — collector to collector/factory")}`}
          />
          <NavCard
            href="/admin/transactions"
            icon="📋"
            title={t("المعاملات والمطابقة المالية", "Transactions & reconciliation")}
            sub={`${completed.length} ${t("عملية — إحصائيات ومستحقات إنفير", "pickups — stats & Invare dues")}`}
          />
          <NavCard
            href="/admin/whatsapp"
            icon="🔗"
            title={t("خدمة واتساب", "WhatsApp service")}
            sub={t("حالة الربط ورمز QR", "Connection status & QR code")}
          />
        </div>
      </main>
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminAuthProvider>
      <AdminDashboard />
    </AdminAuthProvider>
  );
}
