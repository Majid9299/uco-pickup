"use client";

import { useEffect, useState } from "react";

interface NotifyStatus {
  connected: boolean;
  phoneNumber: string | null;
  qr: string | null;
  stats: { sent: number; success: number; failed: number };
}

const SERVICE_URL = process.env.NEXT_PUBLIC_WHATSAPP_SERVICE_URL ?? "";

// ربط رقم واتساب خاص بكل مجمّع (منفصل عن رقم OTP النظامي الواحد) لإرسال
// إشعارات السحب الحقيقية لمولّديه — جلسة Baileys مستقلة بجانب السيرفر
export function NotifyWhatsAppPanel({ collectorId }: { collectorId: string }) {
  const [status, setStatus] = useState<NotifyStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    if (!SERVICE_URL) return;
    let cancelled = false;

    async function poll() {
      try {
        const res = await fetch(`${SERVICE_URL}/notify/${collectorId}/status`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data: NotifyStatus = await res.json();
        if (!cancelled) {
          setStatus(data);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("تعذّر الاتصال بخدمة واتساب");
      }
    }

    poll();
    const interval = setInterval(poll, 3000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [collectorId]);

  async function handleLogout() {
    if (!SERVICE_URL) return;
    setLoggingOut(true);
    try {
      await fetch(`${SERVICE_URL}/notify/${collectorId}/logout`, { method: "POST" });
    } finally {
      setLoggingOut(false);
    }
  }

  if (!SERVICE_URL) {
    return (
      <div className="rounded-2xl border border-dashed border-neutral-300 bg-white p-4">
        <p className="mb-1 text-sm font-bold text-neutral-700">
          ربط واتساب لإشعارات المولّدين
        </p>
        <p className="text-xs text-neutral-400">
          خدمة الواتساب غير مربوطة بعد بهذا الموقع — راجع whatsapp-service/README.md
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-neutral-700">ربط واتساب لإشعارات المولّدين</p>
        {status && (
          <span
            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
              status.connected ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
            }`}
          >
            {status.connected ? "متصل" : "غير متصل"}
          </span>
        )}
      </div>
      <p className="mb-3 text-xs text-neutral-400">
        اربط رقم واتساب المجمّع نفسه هنا — منفصل تمامًا عن أي رقم نظامي آخر.
        بعد الربط، كل عملية سحب تكتمل يُرسَل منه إشعار تلقائي للمولّد.
      </p>

      {error && <p className="text-xs text-red-500">{error}</p>}

      {status?.connected && (
        <div className="flex flex-col gap-3">
          <p className="text-xs text-neutral-500">
            الرقم المرتبط: <span dir="ltr" className="font-mono">{status.phoneNumber}</span>
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl bg-neutral-50 p-2">
              <p className="text-[11px] text-neutral-400">أُرسل</p>
              <p className="text-sm font-bold text-neutral-800">{status.stats.sent}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2">
              <p className="text-[11px] text-neutral-400">نجح</p>
              <p className="text-sm font-bold text-accent-600">{status.stats.success}</p>
            </div>
            <div className="rounded-xl bg-neutral-50 p-2">
              <p className="text-[11px] text-neutral-400">فشل</p>
              <p className="text-sm font-bold text-red-600">{status.stats.failed}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={loggingOut}
            className="rounded-xl border border-neutral-200 py-2 text-xs font-semibold text-neutral-500 disabled:opacity-50"
          >
            {loggingOut ? "جاري قطع الاتصال..." : "قطع الاتصال وربط رقم جديد"}
          </button>
        </div>
      )}

      {status && !status.connected && (
        <div className="flex flex-col items-center gap-2">
          {status.qr ? (
            <>
              <p className="text-xs text-neutral-500">
                امسح الرمز بواتساب هاتفك (الإعدادات → الأجهزة المرتبطة)
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={status.qr}
                alt="WhatsApp QR"
                className="h-48 w-48 rounded-xl border border-neutral-200"
              />
            </>
          ) : (
            <p className="py-6 text-xs text-neutral-400">بانتظار توليد رمز QR...</p>
          )}
        </div>
      )}

      {!status && !error && (
        <p className="py-4 text-center text-xs text-neutral-400">جاري التحقق من حالة الاتصال...</p>
      )}
    </div>
  );
}
