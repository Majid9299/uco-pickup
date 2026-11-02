"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { sendOtp, verifyOtp } from "@/lib/otpAuth";
import { useAdminSession, AdminSession } from "@/lib/adminSession";
import { AdminUser } from "@/lib/types";
import { Header } from "@/components/Header";
import { PhoneInput } from "@/components/PhoneInput";
import { useLanguage } from "@/components/LanguageProvider";

const FALLBACK_PIN = process.env.NEXT_PUBLIC_MANAGER_FALLBACK_PIN ?? "";
// الرقم الوحيد المصرّح له بدخول لوحة الإدارة — مقفول هنا بدل الاعتماد على
// جدول admin_users لأن قاعدة البيانات هذي تسمح بالقراءة/الكتابة العامة
// بمفتاح anon (نموذج Zero-friction)، فأي حد يقدر يضيف نفسه للجدول مباشرة
const ALLOWED_ADMIN_PHONE = "96892992106";
const OWNER_ADMIN: AdminUser = {
  id: "owner-admin",
  name: "المدير",
  whatsapp: ALLOWED_ADMIN_PHONE,
  role: "manager",
  active: true,
};

interface AdminUserRow {
  id: string;
  name: string;
  whatsapp: string;
  role: "user" | "manager";
  active: boolean;
}

function fromRow(r: AdminUserRow): AdminUser {
  return { id: r.id, name: r.name, whatsapp: r.whatsapp, role: r.role, active: r.active };
}

function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function nextId() {
  return `adm-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

interface AdminAuthContextValue {
  session: AdminSession;
  logout: () => void;
  adminUsers: AdminUser[];
  addAdminUser: (input: { name: string; whatsapp: string; role: "user" | "manager" }) => Promise<void>;
  toggleAdminUserActive: (id: string) => Promise<void>;
}

const AdminAuthContext = createContext<AdminAuthContextValue | null>(null);

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}

function useAdminUsers() {
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [loaded, setLoaded] = useState(!isSupabaseConfigured);

  useEffect(() => {
    if (!isSupabaseConfigured) return;
    let cancelled = false;
    supabase
      .from("admin_users")
      .select("*")
      .then(({ data }) => {
        if (cancelled) return;
        if (data) setAdminUsers((data as AdminUserRow[]).map(fromRow));
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function addAdminUser(input: { name: string; whatsapp: string; role: "user" | "manager" }) {
    const user: AdminUser = { ...input, id: nextId(), active: true };
    await supabase.from("admin_users").insert({
      id: user.id,
      name: user.name,
      whatsapp: user.whatsapp,
      role: user.role,
      active: true,
    });
    setAdminUsers((prev) => [...prev, user]);
  }

  async function toggleAdminUserActive(id: string) {
    const user = adminUsers.find((u) => u.id === id);
    if (!user) return;
    const active = !user.active;
    await supabase.from("admin_users").update({ active }).eq("id", id);
    setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
  }

  return { adminUsers, adminUsersLoaded: loaded, addAdminUser, toggleAdminUserActive };
}

type Step = "phone" | "code" | "pin";

function LoginForm({
  adminUsers,
  adminUsersLoaded,
  onSuccess,
}: {
  adminUsers: AdminUser[];
  adminUsersLoaded: boolean;
  onSuccess: (session: AdminSession) => void;
}) {
  const { t } = useLanguage();
  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function checkAllowedPhone(): boolean {
    if (normalizePhone(phone) !== ALLOWED_ADMIN_PHONE) {
      setError(t("هذا الرقم غير مصرّح له بدخول لوحة الإدارة", "This number isn't authorized to access the admin panel"));
      return false;
    }
    return true;
  }

  async function submitPhone() {
    setError(null);
    if (!checkAllowedPhone()) return;
    setBusy(true);
    const result = await sendOtp(ALLOWED_ADMIN_PHONE);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    setStep("code");
  }

  async function submitCode() {
    setError(null);
    setBusy(true);
    const result = await verifyOtp(ALLOWED_ADMIN_PHONE, code);
    setBusy(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSuccess({ id: OWNER_ADMIN.id, name: OWNER_ADMIN.name, role: OWNER_ADMIN.role });
  }

  function goToPinStep() {
    setError(null);
    if (!checkAllowedPhone()) return;
    setStep("pin");
  }

  function submitPin() {
    setError(null);
    if (!checkAllowedPhone()) return;
    if (!FALLBACK_PIN) {
      setError(t("لم يُضبط رقم سري احتياطي بعد (NEXT_PUBLIC_MANAGER_FALLBACK_PIN)", "No fallback PIN has been set yet (NEXT_PUBLIC_MANAGER_FALLBACK_PIN)"));
      return;
    }
    if (pin.trim() !== FALLBACK_PIN) {
      setError(t("رقم سري غير صحيح", "Incorrect PIN"));
      return;
    }
    onSuccess({ id: OWNER_ADMIN.id, name: OWNER_ADMIN.name, role: OWNER_ADMIN.role });
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center gap-5 px-5 py-10">
      <div className="text-center">
        <p className="text-xs font-medium text-neutral-400">{t("وضع الإدارة", "Admin mode")}</p>
        <h1 className="text-lg font-extrabold text-neutral-900">{t("تسجيل الدخول", "Log in")}</h1>
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-neutral-200 bg-white p-4">
        {step === "phone" && (
          <>
            <label className="text-xs font-semibold text-neutral-500">{t("رقم الواتساب", "WhatsApp number")}</label>
            <PhoneInput value={phone} onChange={setPhone} />
            <button
              onClick={submitPhone}
              disabled={busy || !phone.trim() || !adminUsersLoaded}
              className="h-12 rounded-2xl bg-brand-600 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {busy ? t("جارِ الإرسال...", "Sending...") : t("إرسال رمز التحقق", "Send verification code")}
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
                setStep("phone");
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
              {t("الرقم السري الاحتياطي (عند تعطّل واتساب)", "Backup PIN (when WhatsApp is down)")}
            </label>
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              placeholder="••••"
              dir="ltr"
              inputMode="numeric"
              type="password"
              className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-center text-lg tracking-[0.3em] focus:border-brand-500 focus:outline-none"
            />
            <button
              onClick={submitPin}
              disabled={!pin.trim()}
              className="h-12 rounded-2xl bg-neutral-900 text-sm font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
            >
              {t("دخول", "Log in")}
            </button>
            <button
              onClick={() => {
                setStep("phone");
                setError(null);
              }}
              className="text-xs font-semibold text-neutral-400"
            >
              {t("← رجوع لتسجيل الدخول بواتساب", "← Back to WhatsApp login")}
            </button>
          </>
        )}

        {error && <p className="text-xs font-semibold text-red-600">{error}</p>}
      </div>

      {step !== "pin" && (
        <button
          onClick={goToPinStep}
          className="text-center text-xs font-semibold text-neutral-400 underline"
        >
          {t("واتساب معطّل أو غير مربوط؟ ادخل برقم سري احتياطي", "WhatsApp down or not linked? Enter a backup PIN")}
        </button>
      )}
    </main>
    </div>
  );
}

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const { session, setSession } = useAdminSession();
  const { adminUsers, adminUsersLoaded, addAdminUser, toggleAdminUserActive } = useAdminUsers();

  if (!session) {
    return <LoginForm adminUsers={adminUsers} adminUsersLoaded={adminUsersLoaded} onSuccess={setSession} />;
  }

  return (
    <AdminAuthContext.Provider
      value={{
        session,
        logout: () => setSession(null),
        adminUsers,
        addAdminUser,
        toggleAdminUserActive,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}
