"use client";

import { useSyncExternalStore } from "react";
import { AdminRole } from "./types";

const STORAGE_KEY = "uco-admin-session";

export interface AdminSession {
  id: string;
  name: string;
  role: AdminRole;
}

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

export function useAdminSession() {
  const raw = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const session: AdminSession | null = raw ? JSON.parse(raw) : null;

  function setSession(next: AdminSession | null) {
    if (next) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    else window.localStorage.removeItem(STORAGE_KEY);
    window.dispatchEvent(new StorageEvent("storage"));
  }

  return { session, setSession };
}
