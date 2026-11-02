"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { round } from "@/lib/commission";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function AdminSalesContent() {
  const { t, lang } = useLanguage();
  const { sales, collectors } = useData();
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";

  const completed = sales.filter((s) => s.status === "completed");
  const totalLiters = completed.reduce((s, x) => s + (x.liters ?? 0), 0);
  const totalOMR = round(completed.reduce((s, x) => s + (x.totalOMR ?? 0), 0));
  const collectorName = (id: string) => collectors.find((c) => c.id === id)?.name ?? id;

  const sorted = [...sales].sort((a, b) =>
    (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt)
  );

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("💰 المبيعات (كل المجمّعين)", "💰 Sales (all collectors)")}</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {completed.length} {t("عملية بيع", "sales")} · {totalLiters} {t("لتر", "L")} · {totalOMR} {t("ر.ع", "OMR")}
        </p>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        {sorted.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("ما فيه مبيعات بعد", "No sales yet")}</p>
        ) : (
          <div className="flex flex-col gap-2 text-xs">
            {sorted.map((s) => (
              <div key={s.id} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-neutral-800">
                    {collectorName(s.sellerCollectorId)} ← {s.buyerType === "factory" ? "🏭" : "🏢"} {s.buyerName}
                  </span>
                  <span className="font-semibold text-neutral-700" dir="ltr">
                    {s.liters ?? "—"} {t("لتر", "L")} · {s.totalOMR ?? "—"} {t("ر.ع", "OMR")}
                  </span>
                </div>
                <p className="mt-1 text-neutral-400">
                  {s.status === "completed"
                    ? s.completedAt
                      ? new Date(s.completedAt).toLocaleDateString(dateLocale)
                      : ""
                    : t("معلّقة", "pending")}
                  {s.commissionOMR != null && ` · ${t("عمولة", "fee")} ${round((s.commissionOMR ?? 0) + (s.vatOMR ?? 0))} ${t("ر.ع", "OMR")}`}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <AdminSalesContent />
      </div>
    </AdminAuthProvider>
  );
}
