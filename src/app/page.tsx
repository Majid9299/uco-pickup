import Link from "next/link";
import { Header } from "@/components/Header";
import { COMMISSION_PER_TON_OMR, VAT_RATE } from "@/lib/mock-data";

const STEPS = [
  {
    icon: "🧑‍💼",
    title: "١. تسجيل المولّد",
    text: "مندوب ميداني يزور المطعم أو الفندق، يسجّل بياناته، والنظام يصدر له باركود خاص يُطبَع ويُلصَق في الموقع.",
  },
  {
    icon: "📷",
    title: "٢. مسح الباركود",
    text: "أي شخص يمسح الباركود — بدون تطبيق أو تسجيل دخول — ينشئ النظام تلقائيًا طلب سحب جديد يصل فورًا للمجمّع المسؤول عن المنطقة.",
  },
  {
    icon: "🚛",
    title: "٣. تنفيذ السحب",
    text: "المجمّع يجمّع الطلبات في مسار واحد بضغطة زر إلى خرائط قوقل، يسجّل الكمية والسعر عند الوصول، ويؤكّد السحب.",
  },
  {
    icon: "✅",
    title: "٤. تأكيد وعمولة",
    text: "إشعار تأكيد فوري للمولّد والمجمّع، وتُحتسَب عمولة إنفير تلقائيًا لتظهر في لوحة الإدارة.",
  },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Header />

      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-5 py-10">
        <section className="text-center">
          <p className="text-xs font-bold text-brand-700">إثبات مفهوم — نموذج تشغيلي</p>
          <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 sm:text-3xl">
            إدارة طلبات سحب زيت الطهي المستخدم
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-neutral-500">
            ربط المولّدين (مطاعم، فنادق، مطابخ) بالمجمّعين عبر تجربة صفر احتكاك — لا حاجة
            لتطبيق أو تسجيل دخول من طرف المولّد، فقط مسح باركود.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/register"
              className="rounded-2xl bg-brand-600 px-5 py-3 text-sm font-bold text-white active:scale-[0.98]"
            >
              تسجيل مولّد جديد + إصدار باركود
            </Link>
            <Link
              href="/collector"
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-700 active:scale-[0.98]"
            >
              لوحة المجمّع
            </Link>
            <Link
              href="/admin"
              className="rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-bold text-neutral-700 active:scale-[0.98]"
            >
              لوحة الإدارة
            </Link>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {STEPS.map((step) => (
            <div
              key={step.title}
              className="flex gap-3 rounded-2xl border border-neutral-200 bg-white p-4"
            >
              <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-brand-50 text-xl">
                {step.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-neutral-900">{step.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-neutral-500">{step.text}</p>
              </div>
            </div>
          ))}
        </section>

        <section className="rounded-2xl border border-brand-100 bg-brand-50 p-5 text-center">
          <p className="text-sm font-bold text-brand-700">النموذج المالي</p>
          <p className="mt-1 text-xs text-brand-700">
            عمولة {COMMISSION_PER_TON_OMR} ر.ع لكل طن (١٠٠٠ لتر) تُحصَّل من المجمّع، بالإضافة
            إلى ضريبة قيمة مضافة {VAT_RATE * 100}%
          </p>
        </section>
      </main>

      <footer className="border-t border-neutral-200 py-6 text-center text-xs text-neutral-400">
        نموذج تشغيلي بواجهة أمامية فقط — كل البيانات تجريبية ومحفوظة مؤقتًا في المتصفح
      </footer>
    </div>
  );
}
