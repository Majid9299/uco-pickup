import { Collector, PickupRequest } from "./types";

// رقم الفاتورة تسلسلي حسب ترتيب اكتمال العمليات لنفس المجمّع، مضافًا إليه
// رقم البداية اللي يحدّده — بدون الحاجة لعدّاد محفوظ منفصل بقاعدة البيانات
export function invoiceNumberFor(
  collector: Collector,
  requests: PickupRequest[],
  requestId: string
): string {
  const completed = requests
    .filter((r) => r.collectorId === collector.id && r.status === "completed")
    .sort((a, b) => (a.completedAt ?? "").localeCompare(b.completedAt ?? ""));
  const index = completed.findIndex((r) => r.id === requestId);
  const start = collector.invoiceStartNumber ?? 1000;
  const prefix = collector.invoicePrefix ?? "INV-";
  const num = start + (index >= 0 ? index : completed.length);
  return `${prefix}${num}`;
}
