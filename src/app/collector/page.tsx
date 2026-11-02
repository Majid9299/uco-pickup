"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { GOVERNORATES } from "@/lib/mock-data";
import { buildGoogleMapsRouteUrl } from "@/lib/maps";
import { sendGeneratorNotification } from "@/lib/notify";
import { sendOtp, verifyOtp } from "@/lib/otpAuth";
import { PickupRequest, Collector, Driver } from "@/lib/types";

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function invoiceUrl(requestId: string): string {
  if (typeof window === "undefined") return "";
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";
  return `${window.location.origin}${basePath}/invoice/?r=${requestId}`;
}

function PickupCompleteForm({
  request,
  onConfirm,
  onCancel,
}: {
  request: PickupRequest;
  onConfirm: (liters: number, price: number) => void;
  onCancel: () => void;
}) {
  const { t } = useLanguage();
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
          <label className="text-[11px] font-semibold text-neutral-500">
            {t("الكمية (لتر)", "Quantity (L)")}
          </label>
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
          <label className="text-[11px] font-semibold text-neutral-500">
            {t("السعر (ر.ع/لتر)", "Price (OMR/L)")}
          </label>
          <input
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            type="number"
            step="0.001"
            className="rounded-lg border border-neutral-200 bg-white px-2.5 py-2 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>
      </div>
      <p className="text-xs font-semibold text-neutral-600">
        {t("الإجمالي", "Total")}: {total} {t("ر.ع", "OMR")}
      </p>
      <div className="flex gap-2">
        <button
          onClick={() => isValid && onConfirm(litersNum, priceNum)}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          {t("تأكيد السحب ✅", "Confirm pickup ✅")}
        </button>
        <button
          onClick={onCancel}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          {t("إلغاء", "Cancel")}
        </button>
      </div>
      <p className="text-[11px] text-neutral-400">
        {request.generatorName} · {request.wilayat}
      </p>
    </div>
  );
}

function CollectorPicker({ onPick }: { onPick: (id: string) => void }) {
  const { t } = useLanguage();
  const { collectors, drivers, ready, addCollector } = useData();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [step, setStep] = useState<"form" | "code" | "pin">("form");
  const [matched, setMatched] = useState<Collector | null>(null);
  const [matchedDriver, setMatchedDriver] = useState<Driver | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [companyName, setCompanyName] = useState("");

  function switchMode(next: "login" | "register") {
    setMode(next);
    setError(null);
  }

  async function submitLogin() {
    setError(null);
    const phoneDigits = normalizePhone(phone);
    const collector = collectors.find(
      (c) => c.active && c.whatsapp && normalizePhone(c.whatsapp) === phoneDigits
    );
    const driver = collector
      ? undefined
      : drivers.find((d) => d.active && d.whatsapp && normalizePhone(d.whatsapp) === phoneDigits);
    if (!collector && !driver) {
      setError(
        t(
          "هذا الرقم غير مسجّل كشركة تجميع ولا كمندوب — سجّل شركتك الآن أو تواصل مع الإدارة",
          "This number isn't registered as a collector or representative — register your company now or contact admin"
        )
      );
      return;
    }
    setBusy(true);
    const result = await sendOtp(phoneDigits);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMatched(collector ?? null);
    setMatchedDriver(driver ?? null);
    setStep("code");
  }

  function goToPinLogin() {
    setError(null);
    const phoneDigits = normalizePhone(phone);
    const collector = collectors.find(
      (c) => c.active && c.whatsapp && normalizePhone(c.whatsapp) === phoneDigits
    );
    const driver = collector
      ? undefined
      : drivers.find((d) => d.active && d.whatsapp && normalizePhone(d.whatsapp) === phoneDigits);
    if (!collector && !driver) {
      setError(
        t(
          "هذا الرقم غير مسجّل كشركة تجميع ولا كمندوب — سجّل شركتك الآن أو تواصل مع الإدارة",
          "This number isn't registered as a collector or representative — register your company now or contact admin"
        )
      );
      return;
    }
    if (!collector?.pin && !driver?.pin) {
      setError(
        t(
          "ما فيه رقم سري مضبوط لهذا الحساب — سجّل دخول بواتساب أول مرة واضبط رقم سري من الإعدادات",
          "No PIN is set for this account yet — log in with WhatsApp once and set a PIN from Settings"
        )
      );
      return;
    }
    setMatched(collector ?? null);
    setMatchedDriver(driver ?? null);
    setStep("pin");
  }

  function submitPinLogin() {
    setError(null);
    const expectedPin = matched?.pin ?? matchedDriver?.pin;
    if (!expectedPin || pin.trim() !== expectedPin) {
      setError(t("رقم سري غير صحيح", "Incorrect PIN"));
      return;
    }
    if (matched) {
      onPick(matched.id);
    } else if (matchedDriver) {
      router.push(`/driver/?id=${matchedDriver.id}`);
    }
  }

  async function submitRegistration() {
    setError(null);
    const phoneDigits = normalizePhone(phone);
    const existing = collectors.find(
      (c) => c.whatsapp && normalizePhone(c.whatsapp) === phoneDigits
    );
    if (existing) {
      setError(t("هذا الرقم مسجّل مسبقًا — سجّل الدخول بدل التسجيل", "This number is already registered — log in instead"));
      return;
    }
    setBusy(true);
    const collector = await addCollector({
      name: companyName.trim(),
      whatsapp: phone.trim(),
      governorates: GOVERNORATES.map((g) => g.name),
    });
    const result = await sendOtp(phoneDigits);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setMatched(collector);
    setStep("code");
  }

  async function submitCode() {
    if (!matched && !matchedDriver) return;
    setError(null);
    setBusy(true);
    const result = await verifyOtp(normalizePhone(phone), code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    if (matched) {
      onPick(matched.id);
    } else if (matchedDriver) {
      router.push(`/driver/?id=${matchedDriver.id}`);
    }
  }

  const isLoginValid = phone.trim().length > 0;
  const isRegisterValid = companyName.trim().length > 0 && normalizePhone(phone).length > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-5 py-8">
      <div>
        <p className="text-xs font-medium text-neutral-400">
          {t("أول مرة تدخل من هذا الجهاز", "First time on this device")}
        </p>
        <h1 className="text-lg font-extrabold text-neutral-900">
          {mode === "login"
            ? t("تسجيل الدخول برقم الواتساب", "Log in with your WhatsApp number")
            : t("تسجيل شركة تجميع جديدة", "Register a new collection company")}
        </h1>
        <p className="mt-1 text-sm text-neutral-500">
          {mode === "login"
            ? t(
                "شركات التجميع والمندوبون يدخلون من هنا بنفس رقم الواتساب المسجّل لهم",
                "Collectors and representatives log in here with their registered WhatsApp number"
              )
            : t(
                "سجّل بيانات شركتك — بعد التحقق من رقم الواتساب بتدخل مباشرة للوحتك",
                "Register your company — once your WhatsApp number is verified you'll go straight to your dashboard"
              )}
        </p>
      </div>

      {!ready ? (
        <p className="py-6 text-center text-xs text-neutral-400">{t("جارِ التحميل…", "Loading…")}</p>
      ) : (
        <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
          {step === "form" && mode === "login" && (
            <>
              <label className="text-xs font-semibold text-neutral-500">
                {t("رقم الواتساب", "WhatsApp number")}
              </label>
              <PhoneInput value={phone} onChange={setPhone} />
              <button
                onClick={submitLogin}
                disabled={busy || !isLoginValid}
                className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {busy ? t("جارِ الإرسال...", "Sending...") : t("إرسال رمز التحقق", "Send verification code")}
              </button>
              <button
                onClick={goToPinLogin}
                type="button"
                disabled={!isLoginValid}
                className="h-11 rounded-2xl border border-neutral-200 text-sm font-bold text-neutral-700 disabled:opacity-40"
              >
                {t("🔑 الدخول برقم سري بدل واتساب", "🔑 Log in with a PIN instead")}
              </button>
              <button
                onClick={() => switchMode("register")}
                type="button"
                className="text-xs font-bold text-brand-700"
              >
                {t("🆕 أول مرة؟ سجّل شركة التجميع", "🆕 First time? Register your company")}
              </button>
            </>
          )}

          {step === "form" && mode === "register" && (
            <>
              <label className="text-xs font-semibold text-neutral-500">
                {t("اسم شركة التجميع", "Collection company name")}
              </label>
              <input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t("مثال: شركة الخليج لتجميع الزيوت", "e.g. Gulf Oil Collection Co.")}
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
              />
              <label className="text-xs font-semibold text-neutral-500">
                {t("رقم الواتساب", "WhatsApp number")}
              </label>
              <PhoneInput value={phone} onChange={setPhone} />
              <button
                onClick={submitRegistration}
                disabled={busy || !isRegisterValid}
                className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {busy
                  ? t("جارِ التسجيل...", "Registering...")
                  : t("تسجيل الشركة وإرسال رمز التحقق", "Register company & send verification code")}
              </button>
              <button
                onClick={() => switchMode("login")}
                type="button"
                className="text-xs font-bold text-neutral-400"
              >
                {t("← شركتك مسجّلة مسبقًا؟ سجّل الدخول", "← Already registered? Log in")}
              </button>
            </>
          )}

          {step === "code" && (
            <>
              <label className="text-xs font-semibold text-neutral-500">
                {t("رمز التحقق المُرسَل على واتساب", "Verification code sent to WhatsApp")} {phone}
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="000000"
                dir="ltr"
                inputMode="numeric"
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={submitCode}
                disabled={busy || code.trim().length < 4}
                className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {busy ? t("جارِ التحقق...", "Verifying...") : t("تحقق ودخول", "Verify & log in")}
              </button>
              <button
                onClick={() => {
                  setStep("form");
                  setError(null);
                }}
                className="text-xs font-semibold text-neutral-400"
              >
                {t("← رجوع", "← Back")}
              </button>
            </>
          )}

          {step === "pin" && (
            <>
              <label className="text-xs font-semibold text-neutral-500">
                {t("الرقم السري", "PIN")} — {phone}
              </label>
              <input
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/[^\d]/g, ""))}
                placeholder="••••"
                dir="ltr"
                inputMode="numeric"
                type="password"
                className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-500 focus:outline-none"
              />
              <button
                onClick={submitPinLogin}
                disabled={pin.trim().length < 4}
                className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
              >
                {t("دخول", "Log in")}
              </button>
              <button
                onClick={() => {
                  setStep("form");
                  setPin("");
                  setError(null);
                }}
                className="text-xs font-semibold text-neutral-400"
              >
                {t("← رجوع", "← Back")}
              </button>
            </>
          )}

          {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
        </div>
      )}
    </main>
  );
}

function CollectorDashboard({
  collectorId,
  onLogout,
}: {
  collectorId: string;
  onLogout: () => void;
}) {
  const { t } = useLanguage();
  const { requests, collectors, generators, generatorGroups, drivers, completePickup, assignRequestToDriver } =
    useData();
  const collector = collectors.find((c) => c.id === collectorId);
  const myDrivers = drivers.filter((d) => d.collectorId === collectorId && d.active);
  const myGenerators = generators.filter((g) => g.collectorId === collectorId);

  const [governorate, setGovernorate] = useState("");
  const [wilayat, setWilayat] = useState("");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkDriverId, setBulkDriverId] = useState("");
  const [completingId, setCompletingId] = useState<string | null>(null);
  const [lastCompleted, setLastCompleted] = useState<PickupRequest | null>(null);
  const [notifyResult, setNotifyResult] = useState<
    { ok: true; text: string } | { ok: false; message: string } | null
  >(null);

  const myRequests = requests.filter((r) => r.collectorId === collectorId);
  const completed = myRequests.filter((r) => r.status === "completed");
  // نعرض أيضًا الطلبات غير المعيّنة لأي مجمّع (ما كان فيه مجمّع مفعّل يغطي
  // منطقتها وقت إنشائها) لأي مجمّع تغطي محافظاته تلك المنطقة، حتى ما تضيع
  const pending = requests.filter(
    (r) =>
      r.status === "pending" &&
      (r.collectorId === collectorId ||
        (!r.collectorId && collector?.governorates.includes(r.governorate)))
  );

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

  async function assignSelectedToDriver() {
    if (!bulkDriverId) return;
    const ids =
      selectedIds.size > 0 ? Array.from(selectedIds) : filteredPending.map((r) => r.id);
    await Promise.all(ids.map((id) => assignRequestToDriver(id, bulkDriverId)));
    setSelectedIds(new Set());
    setBulkDriverId("");
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
    // لو المولّد فرعٌ ضمن مجموعة، يروح الإشعار لرقم واتساب المجموعة الموحّد
    const group = generator?.groupId ? generatorGroups.find((gr) => gr.id === generator.groupId) : undefined;
    const recipient = group?.whatsapp || generator?.whatsapp || "";
    // المولّد يستلم رسالته المعتادة (الاستمارة الكاملة بالأسعار)
    const link = invoiceUrl(request.id);
    const text = t(
      `تم استلام ${liters} لتر من الزيت المستخدم بسعر ${price} ر.ع/لتر — الإجمالي ${totalOMR} ر.ع. شكرًا لتعاونكم 🙏\n\nاستمارة نقل النفايات: ${link}`,
      `${liters} liters of used oil collected at ${price} OMR/L — Total ${totalOMR} OMR. Thank you! 🙏\n\nYour waste transfer note: ${link}`
    );
    const result = await sendGeneratorNotification(collectorId, recipient, text);
    setNotifyResult(result.ok ? { ok: true, text } : { ok: false, message: result.message });

    // نسخة الكميات (بدون أسعار) تُرسل للمندوب المكلّف بالطلب — يطبعها من الطابعة المحمولة
    // ويختمها مدير الفرع ويسلّمها للمولّد. لا تُرسل للمولّد.
    const repDriver = request.driverId ? drivers.find((d) => d.id === request.driverId) : undefined;
    if (repDriver?.whatsapp) {
      const repLink = `${invoiceUrl(request.id)}&copy=1`;
      const repText = `📋 استمارة الكميات للطباعة والختم — ${request.generatorName} (${liters} لتر):\n${repLink}`;
      sendGeneratorNotification(collectorId, repDriver.whatsapp, repText);
    }
  }

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-medium text-neutral-400">{t("لوحة المجمّع", "Collector dashboard")}</p>
          <h1 className="text-lg font-extrabold text-neutral-900">{collector?.name}</h1>
        </div>
        <button
          onClick={onLogout}
          className="rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-neutral-500 shadow-sm"
        >
          {t("🚪 تسجيل الخروج", "🚪 Log out")}
        </button>
      </div>

      <div className="flex gap-2">
        <Link
          href="/register"
          className="flex-1 rounded-2xl bg-brand-600 px-4 py-3 text-center text-sm font-bold text-white active:scale-[0.98]"
        >
          {t("➕ إضافة مولّد", "➕ Add generator")}
        </Link>
        <Link
          href="/collector/settings"
          className="flex-1 rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-center text-sm font-bold text-neutral-700 active:scale-[0.98]"
        >
          {t("⚙️ إدارة الواتساب", "⚙️ WhatsApp settings")}
        </Link>
      </div>

      <Link
        href="/collector/generators"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
      >
        <div>
          <p className="text-sm font-bold text-neutral-700">{t("🏪 المولّدون المسجّلون", "🏪 Registered generators")}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {myGenerators.length} {t("منشأة مسجّلة باسمك", "facilities registered under you")}
          </p>
        </div>
        <span className="text-neutral-400">‹</span>
      </Link>

      <Link
        href="/collector/drivers"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
      >
        <div>
          <p className="text-sm font-bold text-neutral-700">{t("🚚 المندوبون والأسطول", "🚚 Representatives & fleet")}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {t("إضافة مندوبين وتتبّع مواقعهم", "Add representatives and track their locations")}
          </p>
        </div>
        <span className="text-neutral-400">‹</span>
      </Link>

      <Link
        href="/collector/sales"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
      >
        <div>
          <p className="text-sm font-bold text-neutral-700">{t("💰 بيع وشراء الزيت", "💰 Sell & buy oil")}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {t("بيع لمجمّع/مصنع أو شراء من مجمّع", "sell to a collector/factory or buy from a collector")}
          </p>
        </div>
        <span className="text-neutral-400">‹</span>
      </Link>

      <Link
        href="/collector/transactions"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
      >
        <div>
          <p className="text-sm font-bold text-neutral-700">{t("📋 المعاملات المكتملة", "📋 Completed transactions")}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {completed.length} {t("عملية", "pickups")} · {completedTotals.liters} {t("لتر", "L")} · {completedTotals.omr} {t("ر.ع", "OMR")}
          </p>
        </div>
        <span className="text-neutral-400">‹</span>
      </Link>

      <Link
        href="/collector/invoicing"
        className="flex items-center justify-between rounded-2xl border border-neutral-200 bg-white p-4 active:scale-[0.98]"
      >
        <div>
          <p className="text-sm font-bold text-neutral-700">{t("🧾 إعدادات الفوترة", "🧾 Invoicing settings")}</p>
          <p className="mt-0.5 text-xs text-neutral-400">
            {t("الرقم الضريبي، مقاس الفاتورة، الخلفية والختم", "Tax number, invoice size, background & stamp")}
          </p>
        </div>
        <span className="text-neutral-400">‹</span>
      </Link>

      {!collector?.whatsapp && (
        <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50 p-3 text-xs font-semibold text-amber-700">
          {t(
            "⚠️ ما أضفت رقم واتساب المجمّع بعد — أضفه من الإعدادات حتى تصل إشعارات التأكيد",
            "⚠️ You haven't added a collector WhatsApp number yet — add it in Settings so confirmation notifications go out"
          )}
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-sm font-bold text-neutral-700">{t("طلبات السحب المعلّقة", "Pending pickup requests")}</p>

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
            <option value="">{t("كل الولايات", "All wilayats")}</option>
            {wilayats.map((w) => (
              <option key={w} value={w}>
                {w}
              </option>
            ))}
          </select>
        </div>

        {filteredPending.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("لا توجد طلبات معلّقة", "No pending requests")}</p>
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
                    <div className="flex items-center gap-1.5">
                      <p className="text-sm font-bold text-neutral-800">{r.generatorName}</p>
                      {r.driverId && (
                        <span className="rounded-full bg-accent-50 px-2 py-0.5 text-[10px] font-bold text-accent-600">
                          {t("مسندة", "Assigned")}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-neutral-400">
                      {r.wilayat} — {r.governorate}
                    </p>
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  {myDrivers.length > 0 && (
                    <select
                      value={r.driverId ?? ""}
                      onChange={(e) => assignRequestToDriver(r.id, e.target.value || null)}
                      className="flex-1 rounded-lg border border-neutral-200 bg-neutral-50 px-2 py-1.5 text-[11px] font-semibold text-neutral-700 focus:border-brand-500 focus:outline-none"
                    >
                      <option value="">{t("🚚 إسناد لمندوب...", "🚚 Assign to representative...")}</option>
                      {myDrivers.map((d) => (
                        <option key={d.id} value={d.id}>
                          🚚 {d.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <button
                    onClick={() => setCompletingId(completingId === r.id ? null : r.id)}
                    className="rounded-full bg-brand-50 px-3 py-1.5 text-[11px] font-bold text-brand-700"
                  >
                    {t("تنفيذ السحب بنفسي", "Complete pickup myself")}
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

        {myDrivers.length > 0 ? (
          <div className="mt-4 flex gap-2">
            <select
              value={bulkDriverId}
              onChange={(e) => setBulkDriverId(e.target.value)}
              className="flex-1 rounded-2xl border border-neutral-200 bg-neutral-50 px-3 py-3 text-sm focus:border-brand-500 focus:outline-none"
            >
              <option value="">{t("اختر مندوب للإسناد الجماعي...", "Choose a representative for bulk assign...")}</option>
              {myDrivers.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.name}
                </option>
              ))}
            </select>
            <button
              onClick={assignSelectedToDriver}
              disabled={!bulkDriverId || filteredPending.length === 0}
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              🚚 {t("إسناد", "Assign")}
              {selectedIds.size > 0 ? ` (${selectedIds.size})` : ` ${t("الكل", "all")}`}
            </button>
          </div>
        ) : (
          <button
            onClick={openRoute}
            disabled={filteredPending.length === 0}
            className="mt-4 h-12 w-full rounded-2xl bg-neutral-900 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
          >
            🗺️ {t("إنشاء مسار", "Build route")}
            {selectedIds.size > 0
              ? ` (${selectedIds.size} ${t("محدّد", "selected")})`
              : ` (${t("الكل الظاهر", "all shown")})`}{" "}
            — {t("فتح في خرائط قوقل", "open in Google Maps")}
          </button>
        )}
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
              <p className="mb-1.5 font-bold">
                {t("✅ أُرسل إشعار واتساب حقيقي لـ", "✅ A real WhatsApp notification was sent to")}{" "}
                {lastCompleted.generatorName}
              </p>
              <div className="rounded-xl rounded-tr-sm bg-white px-3 py-2 leading-relaxed text-neutral-700">
                {notifyResult.text}
              </div>
            </>
          ) : (
            <p className="font-bold">
              {t("⚠️ ما انرسل إشعار واتساب:", "⚠️ WhatsApp notification failed to send:")} {notifyResult.message}
              {" — "}
              <Link href="/collector/settings" className="underline">
                {t("اربط رقمك من الإعدادات", "Link your number in Settings")}
              </Link>
            </p>
          )}
        </div>
      )}

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
        <CollectorDashboard collectorId={collectorId} onLogout={() => setCollectorId(null)} />
      )}
    </div>
  );
}
