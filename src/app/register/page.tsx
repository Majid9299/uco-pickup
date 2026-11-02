"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { MapPicker } from "@/components/MapPicker";
import { findNearestLocation, GOVERNORATES } from "@/lib/mock-data";
import { Generator } from "@/lib/types";

const MAX_SEARCH_MS = 20000;
const GOOD_ACCURACY_M = 15;

function scanUrl(generatorId: string) {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/scan/?g=${generatorId}`;
}

function RegisterForm({ collectorId, byDriverName }: { collectorId: string; byDriverName?: string }) {
  const { t } = useLanguage();
  const { addGenerator, generatorGroups } = useData();
  const searchParams = useSearchParams();
  const groupId = searchParams.get("group") ?? "";
  // لو جينا برابط ?group=، إحنا نسجّل "فرع" ضمن مجموعة: رقم الواتساب يُؤخذ من
  // المجموعة (كل الفروع على رقم واحد)، فما نطلبه من المستخدم
  const group = groupId
    ? generatorGroups.find((g) => g.id === groupId && g.collectorId === collectorId)
    : undefined;
  const isBranch = !!group;
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [governorate, setGovernorate] = useState(GOVERNORATES[0].name);
  const [wilayat, setWilayat] = useState(GOVERNORATES[0].wilayats[0]);
  const [lat, setLat] = useState("23.6");
  const [lng, setLng] = useState("58.4");
  // بيانات الإقرار الذاتي ISCC (يعبّيها المجمّع، ويقدر المولّد يعدّلها لاحقًا)
  const [address, setAddress] = useState("");
  const [postCode, setPostCode] = useState("");
  const [country, setCountry] = useState("عُمان");
  const [maxCapacity, setMaxCapacity] = useState("");
  const [renewableCapacity, setRenewableCapacity] = useState("");
  const [over5t, setOver5t] = useState(false);
  const [animalOrigin, setAnimalOrigin] = useState(false);
  const [showDeclaration, setShowDeclaration] = useState(false);
  const [pendingLocation, setPendingLocation] = useState<{
    lat: number;
    lng: number;
    accuracy: number;
  } | null>(null);
  const [locating, setLocating] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [created, setCreated] = useState<Generator | null>(null);
  const watchIdRef = useRef<number | null>(null);
  const timeoutIdRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const intervalIdRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const wilayats = GOVERNORATES.find((g) => g.name === governorate)?.wilayats ?? [];
  // فرع المجموعة ما يحتاج رقم واتساب (يستخدم رقم المجموعة)
  const isValid = name.trim() && (isBranch || whatsapp.trim()) && lat && lng;

  useEffect(() => {
    const latNum = Number(lat);
    const lngNum = Number(lng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) return;
    const nearest = findNearestLocation(latNum, lngNum);
    if (nearest) {
      setGovernorate(nearest.governorate);
      setWilayat(nearest.wilayat);
    }
  }, [lat, lng]);

  function stopWatching() {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    if (timeoutIdRef.current !== null) {
      clearTimeout(timeoutIdRef.current);
      timeoutIdRef.current = null;
    }
    if (intervalIdRef.current !== null) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    setLocating(false);
  }

  useEffect(() => stopWatching, []);

  function useMyLocation() {
    if (!navigator.geolocation) {
      setLocationError(t("المتصفح ما يدعم تحديد الموقع", "This browser doesn't support geolocation"));
      return;
    }
    stopWatching();
    setLocating(true);
    setLocationError(null);
    setPendingLocation(null);
    setElapsedSeconds(0);

    const startedAt = Date.now();
    intervalIdRef.current = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startedAt) / 1000));
    }, 1000);

    watchIdRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const accuracy = Math.round(pos.coords.accuracy);
        setPendingLocation((prev) =>
          !prev || accuracy < prev.accuracy
            ? { lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy }
            : prev
        );
        if (accuracy <= GOOD_ACCURACY_M) stopWatching();
      },
      () => {
        setLocationError(
          t(
            "تعذّر تحديد الموقع — تأكد من السماح بالوصول للموقع من المتصفح",
            "Couldn't determine location — make sure location access is allowed in the browser"
          )
        );
        stopWatching();
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: MAX_SEARCH_MS }
    );

    timeoutIdRef.current = setTimeout(stopWatching, MAX_SEARCH_MS);
  }

  function confirmPendingLocation() {
    if (!pendingLocation) return;
    setLat(pendingLocation.lat.toFixed(5));
    setLng(pendingLocation.lng.toFixed(5));
    setPendingLocation(null);
  }

  async function submit() {
    const generator = await addGenerator({
      collectorId,
      groupId: isBranch ? group!.id : undefined,
      name: name.trim(),
      whatsapp: isBranch ? group!.whatsapp : whatsapp.trim(),
      governorate,
      wilayat,
      lat: Number(lat),
      lng: Number(lng),
      address: address.trim() || undefined,
      postCode: postCode.trim() || undefined,
      country: country.trim() || undefined,
      maxCapacityYear: maxCapacity ? Number(maxCapacity) : undefined,
      renewableCapacityYear: renewableCapacity ? Number(renewableCapacity) : undefined,
      monthlyOver5t: over5t,
      animalOrigin: animalOrigin,
    });
    setCreated(generator);
  }

  function reset() {
    setCreated(null);
    setName("");
    setWhatsapp("");
  }

  function downloadBarcodeImage() {
    if (!created) return;
    const qrCanvas = qrCanvasRef.current;
    if (!qrCanvas) return;

    const padding = 24;
    const textBlockHeight = 70;
    const canvas = document.createElement("canvas");
    canvas.width = qrCanvas.width + padding * 2;
    canvas.height = qrCanvas.height + textBlockHeight + padding * 2;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(qrCanvas, padding, padding);

    ctx.textAlign = "center";
    ctx.direction = "rtl";
    ctx.fillStyle = "#111111";
    ctx.font = "bold 22px Arial, sans-serif";
    ctx.fillText(created.name, canvas.width / 2, qrCanvas.height + padding + 30);

    ctx.direction = "ltr";
    ctx.font = "16px monospace";
    ctx.fillStyle = "#666666";
    ctx.fillText(created.id, canvas.width / 2, qrCanvas.height + padding + 55);

    const link = document.createElement("a");
    link.download = `barcode-${created.id}.png`;
    link.href = canvas.toDataURL("image/png");
    link.click();
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="print:hidden">
        <Header />
      </div>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        {!created ? (
          <>
            <div>
              <p className="text-xs font-medium text-neutral-400">
                {isBranch ? t("إضافة فرع", "Add branch") : t("زيارة ميدانية", "Field visit")}
              </p>
              <h1 className="text-lg font-extrabold text-neutral-900">
                {isBranch ? `${t("فرع جديد لمجموعة:", "New branch for group:")} ${group!.name}` : t("تسجيل مولّد جديد", "Register a new generator")}
              </h1>
              <p className="mt-1 text-sm text-neutral-500">
                {isBranch
                  ? t(
                      "سجّل بيانات الفرع — له باركود خاص، وإشعاراته تروح لرقم واتساب المجموعة",
                      "Register the branch details — it gets its own barcode, and its notifications go to the group's WhatsApp"
                    )
                  : t(
                      "سجّل بيانات المطعم أو الفندق — سيصدر النظام باركود خاص به لطباعته ولصقه في الموقع",
                      "Register the restaurant or hotel's details — the system will generate a barcode to print and stick on-site"
                    )}
              </p>
              {byDriverName && (
                <p className="mt-2 rounded-lg bg-brand-50 px-3 py-1.5 text-[11px] font-semibold text-brand-700">
                  {t("تسجيل بواسطة المندوب:", "Registered by representative:")} {byDriverName}
                </p>
              )}
            </div>

            <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-semibold text-neutral-500">{t("اسم المنشأة", "Facility name")}</label>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t("مثال: مطعم الواحة الذهبية", "e.g. Golden Oasis Restaurant")}
                  className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                />
              </div>

              {isBranch ? (
                <div className="rounded-xl bg-brand-50/60 px-3 py-2.5 text-xs text-neutral-600">
                  {t("رقم الواتساب: يُستخدم رقم المجموعة", "WhatsApp: uses the group's number")}{" "}
                  <span dir="ltr" className="font-bold">{group!.whatsapp || "—"}</span>
                </div>
              ) : (
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500">{t("رقم الواتساب", "WhatsApp number")}</label>
                  <PhoneInput value={whatsapp} onChange={setWhatsapp} />
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500">{t("المحافظة", "Governorate")}</label>
                  <select
                    value={governorate}
                    onChange={(e) => {
                      setGovernorate(e.target.value);
                      setWilayat(
                        GOVERNORATES.find((g) => g.name === e.target.value)?.wilayats[0] ?? ""
                      );
                    }}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {GOVERNORATES.map((g) => (
                      <option key={g.name} value={g.name}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold text-neutral-500">{t("الولاية", "Wilayat")}</label>
                  <select
                    value={wilayat}
                    onChange={(e) => setWilayat(e.target.value)}
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  >
                    {wilayats.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <p className="-mt-2 text-[11px] text-neutral-400">
                {t(
                  "تُحدَّد المحافظة والولاية تلقائيًا من الموقع الجغرافي أدناه، ويمكن تعديلها يدويًا",
                  "Governorate and wilayat are auto-detected from the location below, and can be edited manually"
                )}
              </p>

              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-xs font-semibold text-neutral-500">
                    {t("الموقع الجغرافي", "Geographic location")}
                  </label>
                  <button
                    onClick={useMyLocation}
                    type="button"
                    disabled={locating}
                    className="text-[11px] font-bold text-brand-700 disabled:text-neutral-400"
                  >
                    {locating
                      ? `⏳ ${t("جارِ البحث...", "Searching...")} ${elapsedSeconds} ${t("ث", "s")}`
                      : t("📍 إضافة الموقع الجغرافي", "📍 Add geographic location")}
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    value={lat}
                    onChange={(e) => {
                      setLat(e.target.value);
                      setPendingLocation(null);
                    }}
                    placeholder={t("خط العرض", "Latitude")}
                    dir="ltr"
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                  <input
                    value={lng}
                    onChange={(e) => {
                      setLng(e.target.value);
                      setPendingLocation(null);
                    }}
                    placeholder={t("خط الطول", "Longitude")}
                    dir="ltr"
                    className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setShowMap((s) => !s)}
                  className="mt-2 w-full rounded-xl border border-brand-200 bg-brand-50/60 py-2 text-xs font-bold text-brand-700 active:scale-[0.98]"
                >
                  {showMap
                    ? t("🗺️ إخفاء الخريطة", "🗺️ Hide map")
                    : t("🗺️ فتح الخريطة ووضع الدبوس", "🗺️ Open map & drop a pin")}
                </button>
                {showMap && (
                  <div className="mt-2 flex flex-col gap-1.5">
                    <MapPicker
                      lat={Number(lat)}
                      lng={Number(lng)}
                      onChange={(la, ln) => {
                        setLat(la.toFixed(5));
                        setLng(ln.toFixed(5));
                        setPendingLocation(null);
                      }}
                    />
                    <p className="text-[11px] text-neutral-400">
                      {t(
                        "انقر على الخريطة أو اسحب الدبوس 📍 لتحديد موقع المولّد بدقة",
                        "Tap the map or drag the pin 📍 to set the generator's exact location"
                      )}
                    </p>
                  </div>
                )}

                {locating && (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
                    <p className="text-[11px] font-semibold text-neutral-500">
                      {t("🔎 يبحث عن أدق موقع ممكن...", "🔎 Searching for the most accurate location...")}
                      {pendingLocation &&
                        ` ${t("أفضل دقة حتى الآن:", "Best accuracy so far:")} ${pendingLocation.accuracy} ${t("متر", "m")}`}
                    </p>
                    <button
                      onClick={stopWatching}
                      type="button"
                      disabled={!pendingLocation}
                      className="rounded-xl border border-neutral-200 bg-white px-3 py-2 text-xs font-semibold text-neutral-600 disabled:opacity-40"
                    >
                      {t("⏹️ إيقاف واستخدام هذا الموقع", "⏹️ Stop and use this location")}
                    </button>
                  </div>
                )}

                {!locating && pendingLocation && (
                  <div className="mt-2 flex flex-col gap-2 rounded-xl bg-neutral-50 p-3">
                    <p
                      className={`text-[11px] font-bold ${
                        pendingLocation.accuracy <= 20
                          ? "text-accent-600"
                          : pendingLocation.accuracy <= 50
                          ? "text-amber-600"
                          : "text-red-600"
                      }`}
                    >
                      {t("🎯 الدقة: ضمن", "🎯 Accuracy: within")} {pendingLocation.accuracy} {t("متر", "m")}
                      {pendingLocation.accuracy > 50 &&
                        ` — ${t("جرّب مرة ثانية في مكان مفتوح لدقة أفضل", "try again in an open area for better accuracy")}`}
                    </p>
                    <p className="text-[11px] text-neutral-400" dir="ltr">
                      {pendingLocation.lat.toFixed(5)}, {pendingLocation.lng.toFixed(5)}
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={confirmPendingLocation}
                        type="button"
                        className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white active:scale-[0.98]"
                      >
                        {t("✅ تأكيد إضافة الموقع الجغرافي", "✅ Confirm this location")}
                      </button>
                      <button
                        onClick={useMyLocation}
                        type="button"
                        className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
                      >
                        {t("🔄 إعادة المحاولة", "🔄 Try again")}
                      </button>
                    </div>
                  </div>
                )}
                {locationError && (
                  <p className="mt-1.5 text-[11px] font-bold text-red-600">{locationError}</p>
                )}

                <p className="mt-1.5 text-[11px] text-neutral-400">
                  {t(
                    "الأدق: طلب مشاركة الموقع من واتساب مباشرة من صاحب المنشأة",
                    "More accurate: ask the facility owner to share their location directly via WhatsApp"
                  )}
                </p>
              </div>
            </div>

            {/* بيانات الإقرار الذاتي ISCC — يعبّيها المجمّع، ويقدر المولّد يعدّلها من صفحة العقد */}
            <div className="rounded-2xl border border-neutral-200 bg-white p-4">
              <button
                type="button"
                onClick={() => setShowDeclaration((s) => !s)}
                className="flex w-full items-center justify-between"
              >
                <span className="text-sm font-bold text-neutral-700">
                  📄 {t("بيانات الإقرار الذاتي (ISCC)", "Self-declaration data (ISCC)")}
                </span>
                <span className="text-neutral-400">{showDeclaration ? "▲" : "▼"}</span>
              </button>
              {showDeclaration && (
                <div className="mt-3 flex flex-col gap-3">
                  <p className="text-[11px] text-neutral-400">
                    {t(
                      "تُستخدم في العقد الإلكتروني مع المولّد — يراجعها ويوافق عليها من صفحته.",
                      "Used in the generator's electronic contract — they review and approve from their page."
                    )}
                  </p>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-neutral-500">{t("العنوان", "Address")}</label>
                    <input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500">{t("الرمز البريدي", "Post code")}</label>
                      <input
                        value={postCode}
                        onChange={(e) => setPostCode(e.target.value)}
                        dir="ltr"
                        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500">{t("البلد", "Country")}</label>
                      <input
                        value={country}
                        onChange={(e) => setCountry(e.target.value)}
                        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500">{t("الطاقة القصوى/سنة (طن)", "Max capacity/yr (t)")}</label>
                      <input
                        value={maxCapacity}
                        onChange={(e) => setMaxCapacity(e.target.value.replace(/[^\d.]/g, ""))}
                        inputMode="decimal"
                        dir="ltr"
                        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-semibold text-neutral-500">{t("المستدامة/سنة (طن)", "Sustainable/yr (t)")}</label>
                      <input
                        value={renewableCapacity}
                        onChange={(e) => setRenewableCapacity(e.target.value.replace(/[^\d.]/g, ""))}
                        inputMode="decimal"
                        dir="ltr"
                        className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
                      />
                    </div>
                  </div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
                    <input type="checkbox" checked={over5t} onChange={(e) => setOver5t(e.target.checked)} className="h-4 w-4" />
                    {t("كمية الزيت المستعمل 5 أطنان أو أكثر شهريًا", "UCO quantity is 5 tons or more per month")}
                  </label>
                  <label className="flex items-center gap-2 text-xs font-semibold text-neutral-600">
                    <input type="checkbox" checked={animalOrigin} onChange={(e) => setAnimalOrigin(e.target.checked)} className="h-4 w-4" />
                    {t("الزيت المستعمل ذو أصل حيواني (كليًا أو جزئيًا)", "UCO is of animal origin (fully or partly)")}
                  </label>
                </div>
              )}
            </div>

            <button
              onClick={submit}
              disabled={!isValid}
              className="h-14 rounded-2xl bg-brand-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {t("حفظ وإصدار الباركود", "Save & generate barcode")}
            </button>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center gap-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-accent-50 text-3xl print:hidden">
              ✅
            </div>
            <div className="print:hidden">
              <h2 className="text-xl font-extrabold text-neutral-900">{t("تم تسجيل المولّد", "Generator registered")}</h2>
              <p className="text-sm text-neutral-500">
                {t("اطبع هذا الباركود وألصقه في موقع", "Print this barcode and stick it at")} {created.name}
              </p>
            </div>

            <div className="rounded-2xl border border-neutral-200 bg-white p-5">
              <QRCodeSVG value={scanUrl(created.id)} size={200} />
            </div>
            <QRCodeCanvas
              value={scanUrl(created.id)}
              size={300}
              ref={qrCanvasRef}
              className="hidden"
            />

            <div className="w-full rounded-2xl border border-neutral-200 bg-white p-4 text-end text-sm">
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">{t("المنشأة", "Facility")}</span>
                <span className="font-semibold">{created.name}</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">{t("المنطقة", "Area")}</span>
                <span className="font-semibold">
                  {created.wilayat} — {created.governorate}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-neutral-400">{t("رقم المولّد", "Generator ID")}</span>
                <span className="font-mono font-semibold" dir="ltr">
                  {created.id}
                </span>
              </div>
            </div>

            <div className="flex w-full gap-2 print:hidden">
              <button
                onClick={downloadBarcodeImage}
                type="button"
                className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 active:scale-[0.98]"
              >
                {t("⬇️ تحميل كصورة", "⬇️ Download as image")}
              </button>
              <button
                onClick={() => window.print()}
                type="button"
                className="flex-1 rounded-2xl border border-neutral-200 bg-white py-3 text-sm font-bold text-neutral-700 active:scale-[0.98]"
              >
                {t("🖨️ طباعة", "🖨️ Print")}
              </button>
            </div>

            <p className="text-xs text-neutral-400 print:hidden">
              {t(
                "أي مسح لهذا الباركود سيُنشئ تلقائيًا طلب سحب جديد يصلك أنت مباشرة — بدون تطبيق أو تسجيل دخول من طرف المنشأة",
                "Scanning this barcode automatically creates a new pickup request that reaches you directly — no app or login needed from the facility"
              )}
            </p>

            <button
              onClick={reset}
              className="mt-auto h-14 w-full rounded-2xl bg-neutral-900 text-lg font-bold text-white active:scale-[0.98] print:hidden"
            >
              {t("تسجيل مولّد آخر", "Register another generator")}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

function RegisterEntry() {
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  // يقدر يفتحها المجمّع (جلسة دخول) أو المندوب عبر رابط ?driver=<id> —
  // في الحالتين المولّد يُنسب لمجمّع المندوب نفسه
  const driverId = searchParams.get("driver") ?? "";
  const { collectorId: sessionCollectorId } = useCollectorSession();
  const { drivers, ready } = useData();
  const driver = driverId ? drivers.find((d) => d.id === driverId) : undefined;
  const collectorId = sessionCollectorId || driver?.collectorId || "";

  if (!collectorId) {
    // رابط مندوب صحيح لكن البيانات لسا تُحمّل — ننتظر بدل ما نعرض "سجّل الدخول"
    if (driverId && !ready) {
      return (
        <div className="flex min-h-screen flex-col bg-neutral-50">
          <Header />
          <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>
        </div>
      );
    }
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("سجّل الدخول أولًا من الصفحة الرئيسية", "Log in first from the home page")}</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
        </main>
      </div>
    );
  }

  return <RegisterForm collectorId={collectorId} byDriverName={driver?.name} />;
}

export default function RegisterPage() {
  const { t } = useLanguage();
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen flex-col bg-neutral-50">
          <Header />
          <p className="flex-1 py-10 text-center text-sm text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>
        </div>
      }
    >
      <RegisterEntry />
    </Suspense>
  );
}
