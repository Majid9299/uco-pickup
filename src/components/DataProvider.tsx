"use client";

import { createContext, useContext, useState } from "react";
import { COLLECTORS, GENERATORS, INITIAL_REQUESTS } from "@/lib/mock-data";
import { Collector, Generator, PickupRequest } from "@/lib/types";

interface DataContextValue {
  generators: Generator[];
  collectors: Collector[];
  requests: PickupRequest[];
  addGenerator: (input: Omit<Generator, "id" | "registeredAt" | "active">) => Generator;
  createRequestForGenerator: (generatorId: string) => PickupRequest | null;
  completePickup: (requestId: string, liters: number, pricePerLiterOMR: number) => void;
  setCollectorWhatsapp: (collectorId: string, whatsapp: string) => void;
  toggleGeneratorActive: (generatorId: string) => void;
  toggleCollectorActive: (collectorId: string) => void;
}

const DataContext = createContext<DataContextValue | null>(null);

let idCounter = 1000;
function nextId(prefix: string) {
  idCounter += 1;
  return `${prefix}-${idCounter}`;
}

// أول مجمّع يخدم محافظة المولّد هو من يستلم الطلب تلقائيًا — في نسخة لاحقة
// يمكن استبدال هذا بمنطق تخصيص مناطق حصري أو توزيع دوري بين عدة مجمّعين
function findCollectorFor(governorate: string, collectors: Collector[]): Collector | undefined {
  return collectors.find((c) => c.active && c.governorates.includes(governorate));
}

export function DataProvider({ children }: { children: React.ReactNode }) {
  const [generators, setGenerators] = useState<Generator[]>(GENERATORS);
  const [collectors, setCollectors] = useState<Collector[]>(COLLECTORS);
  const [requests, setRequests] = useState<PickupRequest[]>(INITIAL_REQUESTS);

  function addGenerator(input: Omit<Generator, "id" | "registeredAt" | "active">) {
    const generator: Generator = {
      ...input,
      id: nextId("gen"),
      registeredAt: new Date().toISOString().slice(0, 10),
      active: true,
    };
    setGenerators((prev) => [...prev, generator]);
    return generator;
  }

  function createRequestForGenerator(generatorId: string) {
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
    setRequests((prev) => [request, ...prev]);
    return request;
  }

  function completePickup(requestId: string, liters: number, pricePerLiterOMR: number) {
    setRequests((prev) =>
      prev.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: "completed",
              liters,
              pricePerLiterOMR,
              totalOMR: Math.round(liters * pricePerLiterOMR * 1000) / 1000,
              completedAt: new Date().toISOString(),
            }
          : r
      )
    );
  }

  function setCollectorWhatsapp(collectorId: string, whatsapp: string) {
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, whatsapp } : c))
    );
  }

  function toggleGeneratorActive(generatorId: string) {
    setGenerators((prev) =>
      prev.map((g) => (g.id === generatorId ? { ...g, active: !g.active } : g))
    );
  }

  function toggleCollectorActive(collectorId: string) {
    setCollectors((prev) =>
      prev.map((c) => (c.id === collectorId ? { ...c, active: !c.active } : c))
    );
  }

  return (
    <DataContext.Provider
      value={{
        generators,
        collectors,
        requests,
        addGenerator,
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
