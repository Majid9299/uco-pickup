"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";

export default function CollectorSettingsPage() {
  const { collectorId } = useCollectorSession();
  const { collectors, setCollectorWhatsapp } = useData();
  const collector = collectors.find((c) => c.id === collectorId);

  // مزامنة الحقل المحلي مع رقم واتساب المجمّع الفعلي بمجرد وصوله من القاعدة،
  // بنمط React الموصى به لتعديل الحالة أثناء الرندر بدل useEffect+setState
  const [syncedWhatsapp, setSyncedWhatsapp] = useState(collector?.whatsapp);
  const [whatsapp, setWhatsapp] = useState(collector?.whatsapp ?? "");
  if (collector?.whatsapp !== syncedWhatsapp) {
    setSyncedWhatsapp(collector?.whatsapp);
    setWhatsapp(collector?.whatsapp ?? "");
  }

  const [saved, setSaved] = useState(false);

  async function submit() {
    if (!collectorId) return;
    await setCollectorWhatsapp(collectorId, whatsapp.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  if (!collectorId) {
    return (
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">اختر شركتك أولًا من لوحة المجمّع</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            ← لوحة المجمّع
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-5 py-8">
        <div>
          <Link href="/collector" className="text-xs font-semibold text-neutral-400">
            ← لوحة المجمّع
          </Link>
          <h1 className="mt-2 text-lg font-extrabold text-neutral-900">إعدادات الواتساب</h1>
          <p className="mt-1 text-sm text-neutral-500">
            الرقم اللي بترسل عليه إشعارات تأكيد كل عملية سحب
          </p>
        </div>

        <div className="flex flex-col gap-1.5 rounded-2xl border border-neutral-200 bg-white p-4">
          <label className="text-xs font-semibold text-neutral-500">رقم الواتساب</label>
          <input
            value={whatsapp}
            onChange={(e) => setWhatsapp(e.target.value)}
            placeholder="+968 9xxx xxxx"
            dir="ltr"
            className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
          />
        </div>

        <button
          onClick={submit}
          disabled={!whatsapp.trim()}
          className="h-14 rounded-2xl bg-brand-600 text-lg font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          حفظ
        </button>

        {saved && (
          <div className="rounded-xl bg-accent-50 p-3 text-center text-sm font-semibold text-accent-600">
            تم الحفظ ✅
          </div>
        )}
      </main>
    </div>
  );
}
