"use client";

import { useState } from "react";
import Link from "next/link";
import { Header } from "@/components/Header";
import { useData } from "@/components/DataProvider";
import { useCollectorSession } from "@/components/useCollectorSession";
import { useLanguage } from "@/components/LanguageProvider";
import { calculateSaleCommission, round } from "@/lib/commission";
import { Sale } from "@/lib/types";

// وضع البيع: هذا المجمّع بائع. للمصنع تتم مباشرة؛ لمجمّع آخر تُرسَل كعرض ينتظر قبوله.
function SellForm({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { collectors, factories, createSale, acceptSale } = useData();
  const [buyerType, setBuyerType] = useState<"factory" | "collector">("factory");
  const [buyerId, setBuyerId] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const activeFactories = factories.filter((f) => f.active);
  const otherCollectors = collectors.filter((c) => c.active && c.id !== collectorId);

  const litersNum = Number(liters) || 0;
  const priceNum = Number(price) || 0;
  const total = round(litersNum * priceNum, 3);
  const myFee = calculateSaleCommission(litersNum, buyerType).perSideTotalOMR;
  const valid = buyerId && litersNum > 0 && priceNum > 0;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      const buyerName =
        buyerType === "factory"
          ? factories.find((f) => f.id === buyerId)?.name ?? ""
          : collectors.find((c) => c.id === buyerId)?.name ?? "";
      const sale = await createSale({
        sellerCollectorId: collectorId,
        buyerType,
        buyerCollectorId: buyerType === "collector" ? buyerId : undefined,
        buyerFactoryId: buyerType === "factory" ? buyerId : undefined,
        buyerName,
        initiatedBy: "seller",
        liters: litersNum,
        pricePerLiterOMR: priceNum,
      });
      if (buyerType === "factory") {
        await acceptSale(sale.id);
        setDoneMsg(t("تم تسجيل البيع ✅", "Sale recorded ✅"));
      } else {
        setDoneMsg(t("تم إرسال العرض — بانتظار قبول المشتري ⏳", "Offer sent — awaiting buyer's acceptance ⏳"));
      }
      setLiters("");
      setPrice("");
      setBuyerId("");
      setTimeout(() => setDoneMsg(null), 3000);
    } catch (err) {
      setError(saleErrorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("المشتري", "Buyer")}</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => {
              setBuyerType("factory");
              setBuyerId("");
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
              buyerType === "factory" ? "bg-brand-600 text-white" : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200"
            }`}
          >
            {t("🏭 مصنع", "🏭 Factory")}
          </button>
          <button
            type="button"
            onClick={() => {
              setBuyerType("collector");
              setBuyerId("");
            }}
            className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
              buyerType === "collector" ? "bg-brand-600 text-white" : "bg-neutral-50 text-neutral-600 ring-1 ring-neutral-200"
            }`}
          >
            {t("🏢 مجمّع آخر", "🏢 Another collector")}
          </button>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">
          {buyerType === "factory" ? t("اختر المصنع", "Choose factory") : t("اختر المجمّع", "Choose collector")}
        </label>
        <select
          value={buyerId}
          onChange={(e) => setBuyerId(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t("— اختر —", "— select —")}</option>
          {(buyerType === "factory" ? activeFactories : otherCollectors).map((x) => (
            <option key={x.id} value={x.id}>
              {x.name}
            </option>
          ))}
        </select>
        {buyerType === "factory" && activeFactories.length === 0 && (
          <p className="text-[11px] text-amber-600">
            {t("ما فيه مصانع مضافة بعد — تُضاف من لوحة الإدارة", "No factories added yet — added from the admin panel")}
          </p>
        )}
      </div>

      <QtyPriceFields liters={liters} setLiters={setLiters} price={price} setPrice={setPrice} />
      <FeePreview litersNum={litersNum} priceNum={priceNum} total={total} myFee={myFee} />

      <button
        onClick={submit}
        disabled={!valid || busy}
        className="h-12 rounded-2xl bg-brand-600 text-base font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {busy
          ? t("جارِ الإرسال...", "Sending...")
          : buyerType === "factory"
          ? t("تسجيل البيع", "Record sale")
          : t("إرسال عرض البيع", "Send sale offer")}
      </button>
      {doneMsg && <SuccessNote text={doneMsg} />}
      {error && <ErrorNote text={error} />}
    </div>
  );
}

// وضع الشراء: هذا المجمّع مشتري. يُرسل طلب شراء لمجمّع آخر ينتظر قبوله.
function BuyForm({ collectorId }: { collectorId: string }) {
  const { t } = useLanguage();
  const { collectors, createSale } = useData();
  const me = collectors.find((c) => c.id === collectorId);
  const [sellerId, setSellerId] = useState("");
  const [liters, setLiters] = useState("");
  const [price, setPrice] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);

  const otherCollectors = collectors.filter((c) => c.active && c.id !== collectorId);

  const litersNum = Number(liters) || 0;
  const priceNum = Number(price) || 0;
  const total = round(litersNum * priceNum, 3);
  const myFee = calculateSaleCommission(litersNum, "collector").perSideTotalOMR;
  const valid = sellerId && litersNum > 0 && priceNum > 0;

  async function submit() {
    if (!valid) return;
    setBusy(true);
    setError(null);
    try {
      await createSale({
        sellerCollectorId: sellerId,
        buyerType: "collector",
        buyerCollectorId: collectorId,
        buyerName: me?.name ?? "",
        initiatedBy: "buyer",
        liters: litersNum,
        pricePerLiterOMR: priceNum,
      });
      setDoneMsg(t("تم إرسال الطلب — بانتظار قبول البائع ⏳", "Request sent — awaiting seller's acceptance ⏳"));
      setLiters("");
      setPrice("");
      setSellerId("");
      setTimeout(() => setDoneMsg(null), 3000);
    } catch (err) {
      setError(saleErrorText(err, t));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-neutral-200 bg-white p-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("الشراء من مجمّع", "Buy from collector")}</label>
        <select
          value={sellerId}
          onChange={(e) => setSellerId(e.target.value)}
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        >
          <option value="">{t("— اختر المجمّع البائع —", "— select the selling collector —")}</option>
          {otherCollectors.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      <QtyPriceFields liters={liters} setLiters={setLiters} price={price} setPrice={setPrice} />
      <FeePreview litersNum={litersNum} priceNum={priceNum} total={total} myFee={myFee} />

      <button
        onClick={submit}
        disabled={!valid || busy}
        className="h-12 rounded-2xl bg-accent-600 text-base font-bold text-white transition active:scale-[0.98] disabled:bg-neutral-200 disabled:text-neutral-400"
      >
        {busy ? t("جارِ الإرسال...", "Sending...") : t("إرسال طلب الشراء", "Send purchase request")}
      </button>
      {doneMsg && <SuccessNote text={doneMsg} />}
      {error && <ErrorNote text={error} />}
    </div>
  );
}

function QtyPriceFields({
  liters,
  setLiters,
  price,
  setPrice,
}: {
  liters: string;
  setLiters: (v: string) => void;
  price: string;
  setPrice: (v: string) => void;
}) {
  const { t } = useLanguage();
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("الكمية (لتر)", "Quantity (L)")}</label>
        <input
          value={liters}
          onChange={(e) => setLiters(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          dir="ltr"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-neutral-500">{t("السعر / لتر (ر.ع)", "Price/L (OMR)")}</label>
        <input
          value={price}
          onChange={(e) => setPrice(e.target.value.replace(/[^\d.]/g, ""))}
          inputMode="decimal"
          dir="ltr"
          className="rounded-xl border border-neutral-200 bg-neutral-50 px-3 py-2.5 text-sm focus:border-brand-500 focus:outline-none"
        />
      </div>
    </div>
  );
}

function FeePreview({
  litersNum,
  priceNum,
  total,
  myFee,
}: {
  litersNum: number;
  priceNum: number;
  total: number;
  myFee: number;
}) {
  const { t } = useLanguage();
  if (!(litersNum > 0 && priceNum > 0)) return null;
  return (
    <div className="rounded-xl bg-neutral-50 p-3 text-xs text-neutral-600">
      <div className="flex justify-between py-0.5">
        <span>{t("قيمة الصفقة", "Deal value")}</span>
        <span className="font-mono font-bold text-neutral-800" dir="ltr">{total} {t("ر.ع", "OMR")}</span>
      </div>
      <div className="flex justify-between py-0.5">
        <span>{t("عمولتك لإنفير (ريال/طن)", "Your Invare fee (1 OMR/ton)")}</span>
        <span className="font-mono" dir="ltr">{myFee} {t("ر.ع", "OMR")}</span>
      </div>
    </div>
  );
}

function SuccessNote({ text }: { text: string }) {
  return <div className="rounded-xl bg-accent-50 p-3 text-center text-sm font-semibold text-accent-600">{text}</div>;
}
function ErrorNote({ text }: { text: string }) {
  return <div className="rounded-xl bg-red-50 p-3 text-center text-xs font-semibold text-red-600">{text}</div>;
}

function saleErrorText(err: unknown, t: (a: string, e: string) => string) {
  const msg = (err as Error).message;
  const missing = /sales|factories|initiated_by|schema cache|does not exist|PGRST205/i.test(msg);
  return missing
    ? t(
        "قاعدة البيانات لسا ما تحدّثت لدعم عروض البيع — لازم تشغّل كود SQL مرة واحدة (راجع الرسالة المرسلة).",
        "Database isn't updated for sale offers yet — run the one-time SQL (see the message I sent)."
      )
    : t(`تعذّر التسجيل: ${msg}`, `Failed: ${msg}`);
}

function CollectorSalesContent({ collectorId }: { collectorId: string }) {
  const { t, lang } = useLanguage();
  const { sales, collectors, acceptSale, deleteSale } = useData();
  const [mode, setMode] = useState<"sell" | "buy">("sell");
  const dateLocale = lang === "ar" ? "ar-OM" : "en-GB";
  const nameOf = (id?: string) => (id ? collectors.find((c) => c.id === id)?.name ?? id : "");

  const isMyTrade = (s: Sale) => s.sellerCollectorId === collectorId || s.buyerCollectorId === collectorId;
  // عروض/طلبات واردة تنتظر ردّي (بدأها الطرف الآخر وأنا المقابل)
  const incoming = sales.filter(
    (s) =>
      s.status === "pending" &&
      ((s.initiatedBy === "seller" && s.buyerCollectorId === collectorId) ||
        (s.initiatedBy === "buyer" && s.sellerCollectorId === collectorId))
  );
  // معلّقة صادرة مني (أنا اللي بدأتها، تنتظر الطرف الآخر)
  const outgoing = sales.filter((s) => s.status === "pending" && isMyTrade(s) && !incoming.includes(s));
  const completed = sales
    .filter((s) => s.status === "completed" && isMyTrade(s))
    .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-5 px-5 py-6">
      <div>
        <Link href="/collector" className="text-xs font-semibold text-neutral-400">
          {t("← لوحة المجمّع", "← Collector dashboard")}
        </Link>
        <h1 className="mt-2 text-lg font-extrabold text-neutral-900">{t("💰 بيع وشراء الزيت", "💰 Sell & buy oil")}</h1>
        <p className="mt-1 text-xs text-neutral-400">
          {t("عمولة إنفير: ريال لكل طن من كل طرف في المعاملة", "Invare fee: 1 OMR per ton from each party")}
        </p>
      </div>

      {/* عروض/طلبات واردة تنتظر ردّك */}
      {incoming.length > 0 && (
        <div className="flex flex-col gap-2 rounded-2xl border border-amber-200 bg-amber-50/60 p-4">
          <p className="text-xs font-bold text-amber-700">
            {t("⏳ بانتظار ردّك", "⏳ Awaiting your response")} ({incoming.length})
          </p>
          {incoming.map((s) => {
            const fromSeller = s.initiatedBy === "seller"; // عرض بيع لي
            return (
              <div key={s.id} className="rounded-xl border border-amber-100 bg-white p-3 text-xs">
                <p className="font-bold text-neutral-800">
                  {fromSeller
                    ? <>🔽 {t("عرض بيع من", "Sale offer from")} 🏢 {nameOf(s.sellerCollectorId)}</>
                    : <>🔼 {t("طلب شراء من", "Purchase request from")} 🏢 {s.buyerName}</>}
                </p>
                <p className="mt-0.5 text-neutral-500" dir="ltr">
                  {s.liters} {t("لتر", "L")} × {s.pricePerLiterOMR} = {s.totalOMR} {t("ر.ع", "OMR")}
                </p>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => acceptSale(s.id).catch((e) => alert((e as Error).message))}
                    className="flex-1 rounded-lg bg-accent-600 py-2 text-xs font-bold text-white"
                  >
                    {t("✅ قبول", "✅ Accept")}
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(t("رفض هذه المعاملة؟", "Reject this transaction?"))) {
                        deleteSale(s.id).catch((e) => alert((e as Error).message));
                      }
                    }}
                    className="flex-1 rounded-lg bg-red-50 py-2 text-xs font-bold text-red-600"
                  >
                    {t("❌ رفض", "❌ Reject")}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode("sell")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
            mode === "sell" ? "bg-brand-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"
          }`}
        >
          {t("⬆️ بيع", "⬆️ Sell")}
        </button>
        <button
          type="button"
          onClick={() => setMode("buy")}
          className={`flex-1 rounded-xl py-2.5 text-sm font-bold ${
            mode === "buy" ? "bg-accent-600 text-white" : "bg-white text-neutral-600 ring-1 ring-neutral-200"
          }`}
        >
          {t("⬇️ شراء من مجمّع", "⬇️ Buy from collector")}
        </button>
      </div>

      {mode === "sell" ? <SellForm collectorId={collectorId} /> : <BuyForm collectorId={collectorId} />}

      {/* معلّقة صادرة مني */}
      {outgoing.length > 0 && (
        <div className="rounded-2xl border border-neutral-200 bg-white p-4">
          <p className="mb-2 text-xs font-bold text-neutral-700">{t("معلّقة — بانتظار الطرف الآخر", "Pending — awaiting the other party")}</p>
          <div className="flex flex-col gap-2 text-xs">
            {outgoing.map((s) => {
              const iAmSeller = s.sellerCollectorId === collectorId;
              return (
                <div key={s.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
                  <span className="text-neutral-600">
                    {iAmSeller
                      ? <>⬆️ {t("عرض بيع لـ", "Offer to")} {s.buyerName}</>
                      : <>⬇️ {t("طلب شراء من", "Request from")} {nameOf(s.sellerCollectorId)}</>}
                    <span dir="ltr"> · {s.liters} {t("لتر", "L")}</span>
                  </span>
                  <button
                    onClick={() => deleteSale(s.id).catch((e) => alert((e as Error).message))}
                    className="font-bold text-red-500"
                  >
                    {t("إلغاء", "Cancel")}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="rounded-2xl border border-neutral-200 bg-white p-4">
        <p className="mb-3 text-xs font-bold text-neutral-700">{t("سجل البيع والشراء", "Sales & purchases history")}</p>
        {completed.length === 0 ? (
          <p className="py-6 text-center text-xs text-neutral-400">{t("ما فيه معاملات مكتملة بعد", "No completed transactions yet")}</p>
        ) : (
          <div className="flex flex-col gap-2 text-xs">
            {completed.map((s) => {
              const isSeller = s.sellerCollectorId === collectorId;
              return (
                <div key={s.id} className="rounded-xl border border-neutral-100 p-3">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-neutral-800">
                      {isSeller ? (
                        <>⬆️ {t("بيع لـ", "Sold to")} {s.buyerType === "factory" ? "🏭" : "🏢"} {s.buyerName}</>
                      ) : (
                        <>⬇️ {t("شراء من", "Bought from")} 🏢 {nameOf(s.sellerCollectorId)}</>
                      )}
                    </span>
                    <span className="font-semibold text-neutral-700" dir="ltr">
                      {s.liters} {t("لتر", "L")} · {s.totalOMR} {t("ر.ع", "OMR")}
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-neutral-400">
                    <span>
                      {s.completedAt ? new Date(s.completedAt).toLocaleDateString(dateLocale) : ""}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm(t("حذف هذه المعاملة؟", "Delete this transaction?"))) {
                          deleteSale(s.id).catch((e) => alert((e as Error).message));
                        }
                      }}
                      className="font-bold text-red-500"
                    >
                      {t("🗑️ حذف", "🗑️ Delete")}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}

export default function CollectorSalesPage() {
  const { t } = useLanguage();
  const { collectorId } = useCollectorSession();

  return (
    <div className="flex min-h-screen flex-col bg-neutral-50">
      <Header />
      {!collectorId ? (
        <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-3 px-5 py-8 text-center">
          <p className="text-sm text-neutral-500">{t("سجّل الدخول أولًا من الصفحة الرئيسية", "Log in first from the home page")}</p>
          <Link href="/collector" className="text-sm font-bold text-brand-700">
            {t("← لوحة المجمّع", "← Collector dashboard")}
          </Link>
        </main>
      ) : (
        <CollectorSalesContent collectorId={collectorId} />
      )}
    </div>
  );
}
