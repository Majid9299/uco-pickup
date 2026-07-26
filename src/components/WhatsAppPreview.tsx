interface WhatsAppMessage {
  to: string;
  toLabel: string;
  text: string;
}

// محاكاة بصرية لإشعار واتساب يُرسَل تلقائيًا بعد تأكيد السحب — لا يوجد اتصال فعلي
// بـ WhatsApp Business API في هذا النموذج التشغيلي (Static Frontend فقط)
export function WhatsAppPreview({ messages }: { messages: WhatsAppMessage[] }) {
  return (
    <div className="flex flex-col gap-2">
      {messages.map((m, i) => (
        <div key={i} className="rounded-2xl border border-emerald-100 bg-emerald-50 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-emerald-700">
            <span>✅</span>
            <span>إشعار واتساب مُرسَل إلى {m.toLabel}</span>
            <span className="font-mono text-emerald-500" dir="ltr">
              {m.to}
            </span>
          </div>
          <div className="rounded-xl rounded-tr-sm bg-white px-3 py-2 text-xs leading-relaxed text-neutral-700">
            {m.text}
          </div>
        </div>
      ))}
    </div>
  );
}
