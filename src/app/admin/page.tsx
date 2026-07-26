"use client";

import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { calculateCommission, round } from "@/lib/commission";
import { Collector } from "@/lib/types";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function collectorLiters(collectorId: string, requests: { collectorId: string; status: string; liters?: number }[]) {
  return requests
    .filter((r) => r.collectorId === collectorId && r.status === "completed")
    .reduce((s, r) => s + (r.liters ?? 0), 0);
}

export default function AdminPage() {
  const {
    requests,
    collectors,
    generators,
    toggleGeneratorActive,
    toggleCollectorActive,
  } = useData();

  const completed = requests.filter((r) => r.status === "completed");

  const totalLiters = completed.reduce((s, r) => s + (r.liters ?? 0), 0);
  const totalOMRRaw = completed.reduce((s, r) => s + (r.totalOMR ?? 0), 0);
  const totals = { liters: totalLiters, omr: round(totalOMRRaw), ...calculateCommission(totalLiters) };

  const reconciliation = collectors.map((c) => {
    const liters = collectorLiters(c.id, requests);
    return { collector: c, ...calculateCommission(liters), liters };
  });

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />

      <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <p className="text-xs font-medium text-neutral-400">وضع الإدارة</p>
          <h1 className="text-lg font-extrabold text-neutral-900">لوحة الإدارة والمطابقة المالية</h1>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard label="عمليات مكتملة" value={`${completed.length}`} />
          <StatCard label="إجمالي الكمية" value={`${totals.liters} لتر`} sub={`${totals.tons} طن`} />
          <StatCard label="قيمة الصفقات" value={`${totals.omr} ر.ع`} />
          <StatCard
            label="مستحقات إنفير"
            value={`${totals.totalDueOMR} ر.ع`}
            sub={`عمولة ${totals.commissionOMR} + ضريبة ${totals.vatOMR}`}
          />
        </div>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-neutral-700">
            المطابقة المالية حسب المجمّع
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-100 text-right text-xs text-neutral-400">
                  <th className="px-3 py-2 font-medium">المجمّع</th>
                  <th className="px-3 py-2 font-medium">الأطنان</th>
                  <th className="px-3 py-2 font-medium">العمولة</th>
                  <th className="px-3 py-2 font-medium">الضريبة</th>
                  <th className="px-3 py-2 font-medium">المستحق</th>
                </tr>
              </thead>
              <tbody>
                {reconciliation.map(({ collector, tons, commissionOMR, vatOMR, totalDueOMR }) => (
                  <tr key={collector.id} className="border-b border-neutral-50 last:border-0">
                    <td className="px-3 py-2 font-semibold text-neutral-800">{collector.name}</td>
                    <td className="px-3 py-2 text-neutral-600">{tons}</td>
                    <td className="px-3 py-2 text-neutral-600">{commissionOMR} ر.ع</td>
                    <td className="px-3 py-2 text-neutral-600">{vatOMR} ر.ع</td>
                    <td className="px-3 py-2 font-bold text-brand-700">{totalDueOMR} ر.ع</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-neutral-700">سجل كل المعاملات المكتملة</p>
          {completed.length === 0 ? (
            <p className="py-4 text-center text-xs text-neutral-400">لا توجد معاملات بعد</p>
          ) : (
            <div className="flex flex-col gap-2">
              {completed.map((r) => {
                const collector = collectors.find((c) => c.id === r.collectorId);
                return (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs"
                  >
                    <div>
                      <p className="font-semibold text-neutral-700">{r.generatorName}</p>
                      <p className="text-neutral-400">
                        {collector?.name} · {r.wilayat}
                      </p>
                    </div>
                    <span className="font-bold text-neutral-700">
                      {r.liters} لتر · {r.totalOMR} ر.ع
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-neutral-700">المجمّعون ({collectors.length})</p>
          <div className="flex flex-col gap-2">
            {collectors.map((c: Collector) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{c.name}</p>
                  <p className="text-[11px] text-neutral-400">
                    {c.governorates.join("، ")} · {c.whatsapp || "بدون رقم واتساب"}
                  </p>
                </div>
                <button
                  onClick={() => toggleCollectorActive(c.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    c.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {c.active ? "مفعّل" : "معطّل"}
                </button>
              </div>
            ))}
          </div>
        </section>

        <section className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-neutral-700">
            المولّدون ({generators.length})
          </p>
          <div className="flex flex-col gap-2">
            {generators.map((g) => (
              <div
                key={g.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2"
              >
                <div>
                  <p className="text-sm font-semibold text-neutral-800">{g.name}</p>
                  <p className="text-[11px] text-neutral-400">
                    {g.wilayat} — {g.governorate}
                  </p>
                </div>
                <button
                  onClick={() => toggleGeneratorActive(g.id)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                    g.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
                  }`}
                >
                  {g.active ? "مفعّل" : "معطّل"}
                </button>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
