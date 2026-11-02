"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useLanguage } from "@/components/LanguageProvider";
import { sendGeneratorNotification } from "@/lib/notify";
import { buildGoogleMapsRouteUrl, orderStopsFromOrigin } from "@/lib/maps";
import { PickupRequest } from "@/lib/types";

function invoiceUrl(requestId: string): string {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/invoice/?r=${requestId}`;
}

function PickupForm({
  onConfirm,
  busy,
}: {
  onConfirm: (liters: number, price: number) => void;
  busy: boolean;
}) {
  const { t } = useLanguage();
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("0.09");
  const litersNum = Number(liters) || 0;
  const priceNum = Number(price) || 0;
  const total = Math.round(litersNum * priceNum * 1000) / 1000;
  const isValid = litersNum > 0 && priceNum > 0;

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="text-sm font-bold text-neutral-700">{t("تفاصيل السحب", "Pickup details")}</p>
      <div className="grid grid-cols-2 gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("الكمية (لتر)", "Quantity (L)")}</label>
          <input
            value={liters}
            onChange={(e) => setLiters(e.target.value)}
            type="number"
            inputMode="numeric"
            placeholder="0"
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-[11px] font-semibold text-neutral-500">{t("السعر (ر.ع/لتر)", "Price (OMR/L)")}</label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.001"
            className="rounded-lg border border-neutral-200 bg-neutral-50 px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-sm font-semibold text-neutral-600">
        {t("الإجمالي", "Total")}: {total} {t("ر.ع", "OMR")}
      </p>
      <button
        onClick={() => isValid && onConfirm(litersNum, priceNum)}
        disabled={!isValid || busy}
        className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {busy ? t("جارِ التسجيل...", "Saving...") : t("✅ تأكيد السحب", "✅ Confirm pickup")}
      </button>
    </div>
  );
}

function RequestDetail({
  request,
  onBack,
}: {
  request: PickupRequest;
  onBack: () => void;
}) {
  const { t } = useLanguage();
  const { generators, generatorGroups, collectors, drivers, completePickup } = useData();
  const generator = generators.find((g) => g.id === request.generatorId);
  const collector = collectors.find((c) => c.id === request.collectorId);
  // لو المولّد فرعٌ ضمن مجموعة، إشعاراته تروح لرقم واتساب المجموعة الموحّد
  const group = generator?.groupId ? generatorGroups.find((gr) => gr.id === generator.groupId) : undefined;
  const generatorRecipient = group?.whatsapp || generator?.whatsapp || "";
  const [notifying, setNotifying] = useState(false);
  const [notified, setNotified] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [done, setDone] = useState(false);

  async function notifyOnMyWay() {
    if (!generatorRecipient) return;
    setNotifying(true);
    const text = `🚚 المندوب في الطريق إليك الآن لاستلام الزيت المستخدم — ${generator?.name ?? ""}\n\n🚚 The representative is on the way to collect your used oil now.`;
    await sendGeneratorNotification(request.collectorId, generatorRecipient, text);
    setNotifying(false);
    setNotified(true);
  }

  async function confirmPickup(liters: number, price: number) {
    setCompleting(true);
    await completePickup(request.id, liters, price);
    const total = Math.round(liters * price * 1000) / 1000;
    const link = invoiceUrl(request.id);
    // المولّد يستلم رسالته المعتادة (الاستمارة الكاملة)
    const generatorText = `✅ تم سحب ${liters} لتر من الزيت المستخدم بسعر ${price} ر.ع/لتر — الإجمالي ${total} ر.ع. شكرًا لتعاونكم 🙏\nاستمارة نقل النفايات: ${link}\n\n✅ ${liters} liters of used oil collected at ${price} OMR/L — Total ${total} OMR. Thank you!\nYour waste transfer note: ${link}`;
    const collectorText = `تم تأكيد سحب ${liters} لتر من ${request.generatorName} بواسطة المندوب — الإجمالي ${total} ر.ع ✅`;
    // نسخة الكميات (بدون أسعار) تُرسل للمندوب المكلّف نفسه — يطبعها من الطابعة المحمولة ويختمها مدير الفرع
    const repDriver = request.driverId ? drivers.find((d) => d.id === request.driverId) : undefined;
    const repText = `📋 استمارة الكميات للطباعة والختم — ${request.generatorName} (${liters} لتر):\n${link}&copy=1`;
    await Promise.all([
      generatorRecipient
        ? sendGeneratorNotification(request.collectorId, generatorRecipient, generatorText)
        : Promise.resolve(),
      collector?.whatsapp
        ? sendGeneratorNotification(request.collectorId, collector.whatsapp, collectorText)
        : Promise.resolve(),
      repDriver?.whatsapp
        ? sendGeneratorNotification(request.collectorId, repDriver.whatsapp, repText)
        : Promise.resolve(),
    ]);
    setCompleting(false);
    setDone(true);
  }

  const navUrl = buildGoogleMapsRouteUrl([{ lat: request.lat, lng: request.lng }]);

  if (done) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center gap-4 px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-3xl">
          ✅
        </div>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("تم تسجيل السحب", "Pickup recorded")}</h1>
        <p className="text-sm text-neutral-500">{t("وصل إشعار واتساب للمنشأة والمجمّع", "A WhatsApp notification was sent to the facility and collector")}</p>
        <button
          onClick={onBack}
          className="mt-4 h-12 rounded-2xl bg-neutral-900 px-6 text-sm font-bold text-white"
        >
          {t("← رجوع لقائمة الطلبات", "← Back to request list")}
        </button>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-6">
      <button onClick={onBack} className="text-start text-xs font-semibold text-neutral-400">
        {t("← رجوع للقائمة", "← Back to list")}
      </button>

      <div className="rounded-2xl border border-neutral-200 bg-white p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-neutral-400">{t("المنشأة", "Facility")}</span>
          <span className="font-bold text-neutral-900">{request.generatorName}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-neutral-400">{t("رقم الواتساب", "WhatsApp number")}</span>
          <span className="font-mono font-semibold" dir="ltr">
            {generator?.whatsapp || "—"}
          </span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-neutral-400">{t("المنطقة", "Area")}</span>
          <span className="font-semibold">
            {request.wilayat} — {request.governorate}
          </span>
        </div>
      </div>

      <div className="flex gap-2">
        {navUrl && (
          <a
            href={navUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 rounded-2xl bg-neutral-900 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
          >
            {t("🗺️ فتح المسار", "🗺️ Open route")}
          </a>
        )}
        <button
          onClick={notifyOnMyWay}
          disabled={notifying || notified || !generatorRecipient}
          className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 disabled:opacity-50 active:scale-[0.98]"
        >
          {notified
            ? t("✅ تم الإشعار", "✅ Notified")
            : notifying
              ? t("جارِ الإرسال...", "Sending...")
              : t("📢 أنا في الطريق", "📢 I'm on my way")}
        </button>
      </div>

      <PickupForm onConfirm={confirmPickup} busy={completing} />
    </main>
  );
}

function DriverContent() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const driverId = searchParams.get("id") ?? "";
  const { ready, drivers, requests, updateDriverLocation } = useData();
  const driver = drivers.find((d) => d.id === driverId);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!driverId || !navigator.geolocation) return;
    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        updateDriverLocation(driverId, pos.coords.latitude, pos.coords.longitude);
      },
      () => {},
      { enableHighAccuracy: true, maximumAge: 30000 }
    );
    return () => {
      if (watchIdRef.current !== null) navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [driverId, updateDriverLocation]);

  const myPending = requests.filter((r) => r.driverId === driverId && r.status === "pending");
  const selected = myPending.find((r) => r.id === selectedId) ?? null;

  const fullRouteUrl =
    myPending.length > 0
      ? buildGoogleMapsRouteUrl(
          driver && driver.lat != null && driver.lng != null
            ? orderStopsFromOrigin({ lat: driver.lat, lng: driver.lng }, myPending)
            : myPending
        )
      : "";

  if (!ready) {
    return <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>;
  }

  if (!driverId || !driver) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-10 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-red-50 text-3xl">
          ⚠️
        </div>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("رابط غير صالح", "Invalid link")}</h1>
        <p className="text-sm text-neutral-500">{t("تواصل مع شركة التجميع للحصول على رابط صحيح", "Contact your collection company for a valid link")}</p>
      </main>
    );
  }

  if (selected) {
    return <RequestDetail request={selected} onBack={() => setSelectedId(null)} />;
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-6">
      <div>
        <p className="text-xs font-medium text-neutral-400">{t("مرحبًا", "Welcome")}</p>
        <h1 className="text-lg font-extrabold text-neutral-900">{driver.name}</h1>
        <p className="mt-1 text-sm text-neutral-500">{t("طلبات السحب المعيّنة لك", "Pickup requests assigned to you")}</p>
      </div>

      <Link
        href={`/register/?driver=${driverId}`}
        className="rounded-2xl border border-brand-200 bg-brand-50/60 py-3 text-center text-sm font-bold text-brand-700 active:scale-[0.98]"
      >
        ➕ {t("تسجيل مولّد جديد", "Register a new generator")}
      </Link>

      {fullRouteUrl && (
        <a
          href={fullRouteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-2xl bg-neutral-900 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
        >
          🗺️ {t("فتح المسار الكامل", "Open full route")} ({myPending.length} {t("توقف", "stops")})
        </a>
      )}

      {myPending.length === 0 ? (
        <p className="py-10 text-center text-sm text-neutral-400">{t("لا توجد طلبات معيّنة لك حاليًا", "No requests assigned to you right now")}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {myPending.map((r) => (
            <button
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className="rounded-2xl border border-neutral-200 bg-white p-4 text-start transition active:scale-[0.98]"
            >
              <p className="text-sm font-bold text-neutral-900">{r.generatorName}</p>
              <p className="mt-0.5 text-xs text-neutral-400">
                {r.wilayat} — {r.governorate}
              </p>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}

export default function DriverPage() {
  const { t } = useLanguage();
  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <Suspense
        fallback={<p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>}
      >
        <DriverContent />
      </Suspense>
    </div>
  );
}
