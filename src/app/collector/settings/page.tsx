"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { CURRENT_COLLECTOR_ID } from "@/lib/mock-data";

export default function CollectorSettingsPage() {
  const { collectors, setCollectorWhatsapp } = useData();
  const collector = collectors.find((c) => c.id === CURRENT_COLLECTOR_ID);
  const [whatsapp, setWhatsapp] = useState(collector?.whatsapp ?? "");
  const [saved, setSaved] = useState(false);

  function submit() {
    setCollectorWhatsapp(CURRENT_COLLECTOR_ID, whatsapp.trim());
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
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
