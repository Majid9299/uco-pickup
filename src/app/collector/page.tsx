"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { GOVERNORATES } from "@/lib/mock-data";
import { buildGoogleMapsRouteUrl } from "@/lib/maps";
import { sendGeneratorNotification } from "@/lib/notify";
import { PickupRequest } from "@/lib/types";

function PickupCompleteForm({
  request,
  onConfirm,
  onCancel,
}: {
  request: PickupRequest;
  onConfirm: (liters: number, price: number) => void;
  onCancel: () => void;
}) {
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("0.09");
  const litersNum = Number(liters) || 0;
  const priceNum = Number(price) || 0;
  const total = Math.round(litersNum * priceNum * 1000) / 1000;
  const isValid = litersNum > 0 && priceNum > 0;

  return (
    <div className="mt-2 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">الكمية (لتر)</label>
          <input
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">السعر (ر.ع/لتر)</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.001"
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs font-semibold text-neutral-600">الإجمالي: {total} ر.ع</p>
      <div className="flex gap-2">
        <button
          onClick={() => isValid && onConfirm(litersNum, priceNum)}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          تأكيد السحب ✅
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          إلغاء
        </button>
      </div>
      <p className="text-[11px] text-neutral-400">
        {request.generatorName} · {request.wilayat}
      </p>
    </div>
  );
}

function CollectorPicker({ onPick }: { onPick: (id: string) => void }) {
  const { collectors, ready } = useData();
  const active = collectors.filter((c) => c.active);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-8">
      <div>
        <p className="text-xs font-medium text-neutral-400">أول مرة تدخل من هذا الجهاز</p>
        <h1 className="text-lg font-extrabold text-neutral-900">اختر شركتك</h1>
        <p className="mt-1 text-sm text-neutral-500">
          سيتذكّر هذا الجهاز اختيارك — تقدر تبدّله لاحقًا من نفس الصفحة
        </p>
      </div>
      {!ready ? (
        <p className="py-6 text-center text-xs text-neutral-400">جارِ التحميل…</p>
      ) : active.length === 0 ? (
        <p className="py-6 text-center text-xs text-neutral-400">
          لا يوجد مجمّعون مسجّلون بعد — تواصل مع الإدارة
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          {active.map((c) => (
            <button
              key={c.id}
              onClick={() => onPick(c.id)}
              className="rounded-2xl border border-neutral-200 bg-white p-4 text-right transition active:scale-[0.98]"
            >
              <p className="text-sm font-bold text-neutral-900">{c.name}</p>
              <p className="mt-0.5 text-xs text-neutral-400">{c.governorates.join("، ")}</p>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

function CollectorDashboard({
  collectorId,
  onSwitch,
}: {
  collectorId: string;
  onSwitch: () => void;
}) {
  const { requests, collectors, generators, completePickup } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [lastCompleted, setLastCompleted] = useState<PickupRequest | null>(null);
  const [notifyResult, setNotifyResult] = useState<
    { ok: true; text: string } | { ok: false; message: string } | null
  >(null);

  const myRequests = requests.filter((r) => r.collectorId === collectorId);
  const pending = myRequests.filter((r) => r.status === "pending");
  const completed = myRequests.filter((r) => r.status === "completed");

  const wilayats = governorate
    ? GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? []
    : [];

  const filteredPending = pending.filter(
    (r) =>
      (!governorate || r.governorate === governorate) && (!wilayat || r.wilayat === wilayat)
  );

  const completedLiters = completed.reduce((s, r) => s + (r.liters ?? 0), 0);
  const completedOMR = completed.reduce((s, r) => s + (r.totalOMR ?? 0), 0);
  const completedTotals = { liters: completedLiters, omr: Math.round(completedOMR * 1000) / 1000 };

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function openRoute() {
    const stops = (selectedIds.size > 0
      ? filteredPending.filter((r) => selectedIds.has(r.id))
      : filteredPending
    ).map((r) => ({ lat: r.lat, lng: r.lng }));
    const url = buildGoogleMapsRouteUrl(stops);
    if (url) window.open(url, "_blank", "noopener,noreferrer");
  }

  async function confirmCompletion(request: PickupRequest, liters: number, price: number) {
    await completePickup(request.id, liters, price);
    setCompletingId(null);
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.delete(request.id);
      return next;
    });
    const totalOMR = Math.round(liters * price * 1000) / 1000;
    setLastCompleted({ ...request, liters, pricePerLiterOMR: price, totalOMR });

    const generator = generators.find((g) => g.id === request.generatorId);
    const text = `تم استلام ${liters} لتر من الزيت المستخدم بسعر ${price} ر.ع/لتر — الإجمالي ${totalOMR} ر.ع. شكرًا لتعاونكم 🙏`;
    const result = await sendGeneratorNotification(collectorId, generator?.whatsapp ?? "", text);
    setNotifyResult(result.ok ? { ok: true, text } : { ok: false, message: result.message });
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-400">لوحة المجمّع</p>
          <h1 className="text-lg font-extrabold text-neutral-900">{collector?.name}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/collector/settings"
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm"
          >
            ⚙️ الواتساب
          </Link>
          <button
            onClick={onSwitch}
            className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm"
          >
            🔄 تبديل الشركة
          </button>
        </div>
      </div>

      {!collector?.whatsapp && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          ⚠️ ما أضفت رقم واتساب المجمّع بعد — أضفه من الإعدادات حتى تصل إشعارات التأكيد
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-700">طلبات السحب المعلّقة</p>

        <div className="mb-3 grid grid-cols-2 gap-2">
          <select
            value={governorate}
            onChange={(e) => {
              setGovernorate(e.target.value);
              setWilayat("");
            }}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none"
          >
            <option value="">كل المحافظات</option>
            {collector?.governorates.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
          <select
            value={wilayat}
            onChange={(e) => setWilayat(e.target.value)}
            disabled={!governorate}
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2 text-xs focus:border-brand-500 focus:outline-none disabled:opacity-40"
          >
            <option value="">كل الولايات</option>
            {wilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {filteredPending.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">لا توجد طلبات معلّقة</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredPending.map((r) => (
              <div key={r.id} className="rounded-xl border border-neutral-100 p-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(r.id)}
                    onChange={() => toggleSelect(r.id)}
                    className="h-4 w-4 accent-brand-600"
                  />
                  <div className="flex-1">
                    <p className="text-sm font-bold text-neutral-800">{r.generatorName}</p>
                    <p className="text-[11px] text-neutral-400">
                      {r.wilayat} — {r.governorate}
                    </p>
                  </div>
                  <button
                    onClick={() => setCompletingId(completingId === r.id ? null : r.id)}
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700"
                  >
                    تنفيذ السحب
                  </button>
                </div>
                {completingId === r.id && (
                  <PickupCompleteForm
                    request={r}
                    onConfirm={(liters, price) => confirmCompletion(r, liters, price)}
                    onCancel={() => setCompletingId(null)}
                  />
                )}
              </div>
            ))}
          </div>
        )}

        <button
          onClick={openRoute}
          disabled={filteredPending.length === 0}
          className="mt-4 h-12 w-full rounded-2xl bg-neutral-900 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          🗺️ إنشاء مسار
          {selectedIds.size > 0 ? ` (${selectedIds.size} محدّد)` : " (الكل الظاهر)"} — فتح في
          خرائط قوقل
        </button>
      </div>

      {lastCompleted && notifyResult && (
        <div
          className={`rounded-2xl border p-3 text-xs ${
            notifyResult.ok
              ? "border-emerald-100 bg-emerald-50 text-emerald-700"
              : "border-amber-200 bg-amber-50 text-amber-700"
          }`}
        >
          {notifyResult.ok ? (
            <>
              <p className="mb-1.5 font-bold">✅ أُرسل إشعار واتساب حقيقي لـ {lastCompleted.generatorName}</p>
              <div className="rounded-xl rounded-tr-sm bg-white px-3 py-2 leading-relaxed text-neutral-700">
                {notifyResult.text}
              </div>
            </>
          ) : (
            <p className="font-bold">
              ⚠️ ما انرسل إشعار واتساب: {notifyResult.message}
              {" — "}
              <Link href="/collector/settings" className="underline">
                اربط رقمك من الإعدادات
              </Link>
            </p>
          )}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <div className="mb-3 flex items-center justify-between">
          <p className="text-sm font-bold text-neutral-700">
            عمليات مكتملة ({completed.length})
          </p>
          <p className="text-xs font-semibold text-neutral-500">
            {completedTotals.liters} لتر · {completedTotals.omr} ر.ع
          </p>
        </div>
        {completed.length === 0 ? (
          <p className="py-4 text-center text-xs text-neutral-400">لا توجد عمليات بعد</p>
        ) : (
          <div className="flex flex-col gap-2">
            {completed.map((r) => (
              <div
                key={r.id}
                className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2 text-xs"
              >
                <span className="font-semibold text-neutral-700">{r.generatorName}</span>
                <span className="text-neutral-400">
                  {r.liters} لتر · {r.totalOMR} ر.ع
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CollectorPage() {
  const { collectorId, setCollectorId } = useCollectorSession();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      {!collectorId ? (
        <CollectorPicker onPick={setCollectorId} />
      ) : (
        <CollectorDashboard collectorId={collectorId} onSwitch={() => setCollectorId(null)} />
      )}
    </div>
  );
}
