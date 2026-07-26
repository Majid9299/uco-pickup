"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "uco-collector-id";

// بديل بسيط لتسجيل الدخول: كل جهاز يختار "هويته" كمجمّع مرة وحدة، وتُحفَظ
// محليًا على المتصفح — يكفي لنموذج تشغيلي بدون طبقة مصادقة حقيقية.
// نستخدم useSyncExternalStore لأنه الطريقة الآمنة للقراءة من localStorage
// بدون تعارض بين محتوى التصدير الثابت (بدون window) ومحتوى المتصفح.
function subscribe(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

export function useCollectorSession() {
  const collectorId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function setCollectorId(id: string | null) {
    if (id) window.localStorage.setItem(STORAGE_KEY, id);
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage"));
  }

  return { collectorId, setCollectorId };
}
