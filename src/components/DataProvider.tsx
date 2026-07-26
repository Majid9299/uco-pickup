"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { Collector, Generator, PickupRequest } from "@/lib/types";

interface DataContextValue {
  ready: boolean;
  configured: boolean;
  generators: Generator[];
  collectors: Collector[];
  requests: PickupRequest[];
  addGenerator: (
    input: Omit<Generator, "id" | "registeredAt" | "active">
  ) => Promise<Generator>;
  addCollector: (input: Omit<Collector, "id" | "active">) => Promise<Collector>;
  createRequestForGenerator: (generatorId: string) => Promise<PickupRequest | null>;
  completePickup: (
    requestId: string,
    liters: number,
    pricePerLiterOMR: number
  ) => Promise<void>;
  setCollectorWhatsapp: (collectorId: string, whatsapp: string) => Promise<void>;
  toggleGeneratorActive: (generatorId: string) => Promise<void>;
  toggleCollectorActive: (collectorId: string) => Promise<void>;
}

const DataContext = createContext<DataContextValue | null>(null);

function nextId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// أول مجمّع نشط يخدم محافظة المولّد هو من يستلم الطلب تلقائيًا — في نسخة
// لاحقة يمكن استبدال هذا بمنطق تخصيص مناطق حصري أو توزيع دوري بين عدة مجمّعين
function findCollectorFor(governorate: string, collectors: Collector[]): Collector | undefined {
  return collectors.find((c) => c.active && c.governorates.includes(governorate));
}

interface GeneratorRow {
  id: string;
  name: string;
  whatsapp: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  registered_at: string;
  active: boolean;
}

interface CollectorRow {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  active: boolean;
}

interface RequestRow {
  id: string;
  generator_id: string;
  generator_name: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  collector_id: string;
  status: "pending" | "completed";
  created_at: string;
  liters: number | null;
  price_per_liter_omr: number | null;
  total_omr: number | null;
  completed_at: string | null;
}

function fromGeneratorRow(r: GeneratorRow): Generator {
  return {
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp,
    governorate: r.governorate,
    wilayat: r.wilayat,
    lat: r.lat,
    lng: r.lng,
    registeredAt: r.registered_at,
    active: r.active,
  };
}

function fromCollectorRow(r: CollectorRow): Collector {
  return {
    id: r.id,
    name: r.name,
    whatsapp: r.whatsapp,
    governorates: r.governorates,
    active: r.active,
  };
}

function fromRequestRow(r: RequestRow): PickupRequest {
  return {
    id: r.id,
    generatorId: r.generator_id,
    generatorName: r.generator_name,
    governorate: r.governorate,
    wilayat: r.wilayat,
    lat: r.lat,
    lng: r.lng,
    collectorId: r.collector_id,
    status: r.status,
    createdAt: r.created_at,
    liters: r.liters ?? undefined,
    pricePerLiterOMR: r.price_per_liter_omr ?? undefined,
    totalOMR: r.total_omr ?? undefined,
    completedAt: r.completed_at ?? undefined,
  };
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [generators, setGenerators] = useState<Generator[]>([]);
  const [collectors, setCollectors] = useState<Collector[]>([]);
  const [requests, setRequests] = useState<PickupRequest[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let cancelled = false;

    async function loadAll() {
      const [g, c, r] = await Promise.all([
        supabase.from("generators").select("*").order("created_at", { ascending: true }),
        supabase.from("collectors").select("*").order("created_at", { ascending: true }),
        supabase.from("pickup_requests").select("*").order("created_at", { ascending: false }),
      ]);
      if (cancelled) return;
      if (g.data) setGenerators((g.data as GeneratorRow[]).map(fromGeneratorRow));
      if (c.data) setCollectors((c.data as CollectorRow[]).map(fromCollectorRow));
      if (r.data) setRequests((r.data as RequestRow[]).map(fromRequestRow));
      setReady(true);
    }

    loadAll();

    const channel = supabase
      .channel("uco-pickup-live")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "generators" },
        (payload) => {
          const row = payload.new as GeneratorRow;
          if (!row?.id) return;
          const mapped = fromGeneratorRow(row);
          setGenerators((prev) =>
            prev.some((g) => g.id === mapped.id)
              ? prev.map((g) => (g.id === mapped.id ? mapped : g))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "collectors" },
        (payload) => {
          const row = payload.new as CollectorRow;
          if (!row?.id) return;
          const mapped = fromCollectorRow(row);
          setCollectors((prev) =>
            prev.some((c) => c.id === mapped.id)
              ? prev.map((c) => (c.id === mapped.id ? mapped : c))
              : [...prev, mapped]
          );
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pickup_requests" },
        (payload) => {
          const row = payload.new as RequestRow;
          if (!row?.id) return;
          const mapped = fromRequestRow(row);
          setRequests((prev) =>
            prev.some((r) => r.id === mapped.id)
              ? prev.map((r) => (r.id === mapped.id ? mapped : r))
              : [mapped, ...prev]
          );
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  async function addGenerator(input: Omit<Generator, "id" | "registeredAt" | "active">) {
    const generator: Generator = {
      ...input,
      id: nextId("gen"),
      registeredAt: new Date().toISOString().slice(0, 10),
      active: true,
    };
    await supabase.from("generators").insert({
      id: generator.id,
      name: generator.name,
      whatsapp: generator.whatsapp,
      governorate: generator.governorate,
      wilayat: generator.wilayat,
      lat: generator.lat,
      lng: generator.lng,
      registered_at: generator.registeredAt,
      active: true,
    });
    setGenerators((prev) => [...prev, generator]);
    return generator;
  }

  async function addCollector(input: Omit<Collector, "id" | "active">) {
    const collector: Collector = { ...input, id: nextId("col"), active: true };
    await supabase.from("collectors").insert({
      id: collector.id,
      name: collector.name,
      whatsapp: collector.whatsapp,
      governorates: collector.governorates,
      active: true,
    });
    setCollectors((prev) => [...prev, collector]);
    return collector;
  }

  async function createRequestForGenerator(generatorId: string) {
    const generator = generators.find((g) => g.id === generatorId);
    if (!generator) return null;

    const collector = findCollectorFor(generator.governorate, collectors);
    const request: PickupRequest = {
      id: nextId("req"),
      generatorId: generator.id,
      generatorName: generator.name,
      governorate: generator.governorate,
      wilayat: generator.wilayat,
      lat: generator.lat,
      lng: generator.lng,
      collectorId: collector?.id ?? "",
      status: "pending",
      createdAt: new Date().toISOString(),
    };
    await supabase.from("pickup_requests").insert({
      id: request.id,
      generator_id: request.generatorId,
      generator_name: request.generatorName,
      governorate: request.governorate,
      wilayat: request.wilayat,
      lat: request.lat,
      lng: request.lng,
      collector_id: request.collectorId,
      status: "pending",
      created_at: request.createdAt,
    });
    setRequests((prev) => [request, ...prev]);
    return request;
  }

  async function completePickup(requestId: string, liters: number, pricePerLiterOMR: number) {
    const totalOMR = Math.round(liters * pricePerLiterOMR * 1000) / 1000;
    const completedAt = new Date().toISOString();
    await supabase
      .from("pickup_requests")
      .update({
        status: "completed",
        liters,
        price_per_liter_omr: pricePerLiterOMR,
        total_omr: totalOMR,
        completed_at: completedAt,
      })
      .eq("id", requestId);
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? { ...r, status: "completed", liters, pricePerLiterOMR, totalOMR, completedAt }
          : r
      )
    );
  }

  async function setCollectorWhatsapp(collectorId: string, whatsapp: string) {
    await supabase.from("collectors").update({ whatsapp }).eq("id", collectorId);
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, whatsapp } : c))
    );
  }

  async function toggleGeneratorActive(generatorId: string) {
    const generator = generators.find((g) => g.id === generatorId);
    if (!generator) return;
    const active = !generator.active;
    await supabase.from("generators").update({ active }).eq("id", generatorId);
    setGenerators((prev) => prev.map((g) => (g.id === generatorId ? { ...g, active } : g)));
  }

  async function toggleCollectorActive(collectorId: string) {
    const collector = collectors.find((c) => c.id === collectorId);
    if (!collector) return;
    const active = !collector.active;
    await supabase.from("collectors").update({ active }).eq("id", collectorId);
    setCollectors((prev) => prev.map((c) => (c.id === collectorId ? { ...c, active } : c)));
  }

  return (
    <DataContext.Provider
      value={{
        ready,
        configured: isSupabaseConfigured,
        generators,
        collectors,
        requests,
        addGenerator,
        addCollector,
        createRequestForGenerator,
        completePickup,
        setCollectorWhatsapp,
        toggleGeneratorActive,
        toggleCollectorActive,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData() {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used within DataProvider");
  return ctx;
}
