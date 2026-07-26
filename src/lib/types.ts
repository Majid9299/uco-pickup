export interface Generator {
  id: string;
  name: string;
  whatsapp: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  registeredAt: string;
  active: boolean;
}

export interface Collector {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  active: boolean;
}

export type RequestStatus = "pending" | "completed";

export interface PickupRequest {
  id: string;
  generatorId: string;
  generatorName: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  collectorId: string;
  status: RequestStatus;
  createdAt: string;
  liters?: number;
  pricePerLiterOMR?: number;
  totalOMR?: number;
  completedAt?: string;
}

export interface GovernorateGroup {
  name: string;
  wilayats: string[];
}
