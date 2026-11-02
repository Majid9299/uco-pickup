"use client";

import Link from "next/link";
import { Header } from "@/components/Header";
import { useLanguage } from "@/components/LanguageProvider";
import { WhatsAppAdminPanel } from "@/components/WhatsAppAdminPanel";
import { AdminAuthProvider } from "@/components/admin/AdminAuth";

function AdminWhatsAppContent() {
  const { t } = useLanguage();
  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/admin" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة الإدارة", "← Admin dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("🔗 خدمة واتساب", "🔗 WhatsApp service")}</h1>
      </div>
      <WhatsAppAdminPanel />
    </main>
  );
}

export default function Page() {
  return (
    <AdminAuthProvider>
      <div className="flex min-h-screen flex-col bg-neutral-50">
        <Header />
        <AdminWhatsAppContent />
      </div>
    </AdminAuthProvider>
  );
}
