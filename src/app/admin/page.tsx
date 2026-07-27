"use client";

import { useState } from "react";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { calculateCommission, round } from "@/lib/commission";
import { GOVERNORATES } from "@/lib/mock-data";
import { Collector } from "@/lib/types";
import { WhatsAppAdminPanel } from "@/components/WhatsAppAdminPanel";

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-xs text-neutral-400">{label}</p>
      <p className="mt-1 text-xl font-extrabold text-neutral-900">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-neutral-400">{sub}</p>}
    </div>
  );
}

function AddCollectorForm() {
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
        + إضافة مجمّع جديد
      </button>
    );
  }

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="اسم شركة التجميع"
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <input
        value={whatsapp}
        onChange={(e) => setWhatsapp(e.target.value)}
        placeholder="رقم الواتساب (اختياري)"
        dir="ltr"
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <div>
        <p className="mb-1.5 text-[11px] font-semibold text-neutral-500">محافظات التغطية</p>
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
          حفظ المجمّع
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          إلغاء
        </button>
      </div>
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
          <AddCollectorForm />
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

        <WhatsAppAdminPanel />
      </main>
    </div>
  );
}
