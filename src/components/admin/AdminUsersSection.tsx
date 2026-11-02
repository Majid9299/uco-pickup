"use client";

import { useState } from "react";
import { PhoneInput } from "@/components/PhoneInput";
import { useAdminAuth } from "./AdminAuth";

function AddAdminUserForm() {
  const { addAdminUser } = useAdminAuth();
  const [name, setName] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [role, setRole] = useState<"user" | "manager">("user");
  const [open, setOpen] = useState(false);

  async function submit() {
    await addAdminUser({ name: name.trim(), whatsapp: whatsapp.trim(), role });
    setName("");
    setWhatsapp("");
    setRole("user");
    setOpen(false);
  }

  const isValid = name.trim() && whatsapp.trim();

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mb-3 w-full rounded-xl border border-dashed border-neutral-300 py-2 text-xs font-bold text-neutral-500"
      >
        + إضافة حساب دخول جديد
      </button>
    );
  }

  return (
    <div className="mb-3 flex flex-col gap-3 rounded-xl bg-neutral-50 p-3">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="الاسم"
        className="rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
      />
      <PhoneInput value={whatsapp} onChange={setWhatsapp} size="sm" />
      <div className="flex gap-2">
        {(["user", "manager"] as const).map((r) => (
          <button
            key={r}
            onClick={() => setRole(r)}
            className={`flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold ${
              role === r ? "bg-brand-600 text-white" : "bg-white text-neutral-500 ring-1 ring-neutral-200"
            }`}
          >
            {r === "manager" ? "مدير (تحكّم كامل)" : "مستخدم (عرض فقط)"}
          </button>
        ))}
      </div>
      <div className="flex gap-2">
        <button
          onClick={submit}
          disabled={!isValid}
          className="flex-1 rounded-xl bg-brand-600 py-2 text-xs font-bold text-white disabled:bg-neutral-200 disabled:text-neutral-400"
        >
          حفظ
        </button>
        <button
          onClick={() => setOpen(false)}
          className="rounded-xl border border-neutral-200 px-3 py-2 text-xs font-semibold text-neutral-500"
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}

export function AdminUsersSection() {
  const { adminUsers, toggleAdminUserActive, session } = useAdminAuth();

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-4">
      <p className="mb-3 text-sm font-bold text-neutral-700">حسابات دخول الإدارة ({adminUsers.length})</p>
      <AddAdminUserForm />
      {adminUsers.length === 0 && (
        <p className="py-4 text-center text-xs text-neutral-400">
          لا يوجد حسابات مسجّلة بعد — أضف حسابك بواتساب حتى ما تحتاج الرقم السري الاحتياطي مرة ثانية
        </p>
      )}
      <div className="flex flex-col gap-2">
        {adminUsers.map((u) => (
          <div key={u.id} className="flex items-center justify-between rounded-xl bg-neutral-50 px-3 py-2">
            <div>
              <p className="text-sm font-semibold text-neutral-800">
                {u.name}
                {u.id === session.id && <span className="mr-1.5 text-[10px] text-neutral-400">(أنت)</span>}
              </p>
              <p className="text-[11px] text-neutral-400" dir="ltr">
                {u.whatsapp} · {u.role === "manager" ? "مدير" : "مستخدم"}
              </p>
            </div>
            <button
              onClick={() => toggleAdminUserActive(u.id)}
              className={`rounded-full px-3 py-1.5 text-[11px] font-bold ${
                u.active ? "bg-accent-50 text-accent-600" : "bg-red-50 text-red-600"
              }`}
            >
              {u.active ? "مفعّل" : "معطّل"}
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}
