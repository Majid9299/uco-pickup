export interface Generator {
  id: string;
  collectorId: string;
  // لو معبّأ، هذا المولّد فرعٌ ضمن مجموعة (GeneratorGroup)؛ وإلا فهو مولّد مفرد
  groupId?: string;
  name: string;
  whatsapp: string;
  governorate: string;
  wilayat: string;
  lat: number;
  lng: number;
  registeredAt: string;
  active: boolean;
  // بيانات الإقرار الذاتي ISCC (نقطة المنشأ)
  address?: string;
  postCode?: string;
  country?: string;
  maxCapacityYear?: number;
  renewableCapacityYear?: number;
  monthlyOver5t?: boolean;
  animalOrigin?: boolean;
  // حالة العقد الإلكتروني
  contractStatus?: "draft" | "sent" | "approved";
  contractApprovedAt?: string;
  contractValidFrom?: string;
  contractValidUntil?: string;
}

// مجموعة فروع لمولّد واحد (شركة/مالك) بإدارة ورقم واتساب واحد.
// كل فرع = صف Generator مربوط بهذه المجموعة عبر groupId.
export interface GeneratorGroup {
  id: string;
  collectorId: string;
  name: string;
  whatsapp: string;
}

export interface Collector {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  active: boolean;
  pin?: string;
  companyName?: string;
  taxNumber?: string;
  crNumber?: string;
  invoiceStartNumber?: number;
  invoicePrefix?: string;
  invoicePageSize?: "a4" | "a5";
  invoiceLetterhead?: string;
  invoiceStamp?: string;
  email?: string;
  website?: string;
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
  driverId?: string;
  status: RequestStatus;
  createdAt: string;
  liters?: number;
  pricePerLiterOMR?: number;
  totalOMR?: number;
  completedAt?: string;
}

export interface Driver {
  id: string;
  collectorId: string;
  name: string;
  whatsapp: string;
  active: boolean;
  lat?: number;
  lng?: number;
  locationUpdatedAt?: string;
  pin?: string;
}

export interface GovernorateGroup {
  name: string;
  wilayats: string[];
}

// مصنع إعادة التدوير — الجهة المشترية النهائية اللي يبيع لها المجمّع
export interface Factory {
  id: string;
  name: string;
  whatsapp: string;
  governorates: string[];
  taxNumber?: string;
  crNumber?: string;
  active: boolean;
  lat?: number;
  lng?: number;
}

// عملية بيع: مجمّع يبيع زيته لمجمّع آخر أو لمصنع (الحلقة التالية بالسلسلة)
export interface Sale {
  id: string;
  sellerCollectorId: string;
  buyerType: "collector" | "factory";
  buyerCollectorId?: string;
  buyerFactoryId?: string;
  buyerName: string;
  liters?: number;
  pricePerLiterOMR?: number;
  totalOMR?: number;
  commissionOMR?: number;
  vatOMR?: number;
  status: RequestStatus;
  // من بدأ المعاملة؛ الطرف الآخر يقبل أو يرفض
  initiatedBy?: "seller" | "buyer";
  driverId?: string;
  sourcePickupIds: string[];
  createdAt: string;
  completedAt?: string;
}

export type AdminRole = "user" | "manager";

export interface AdminUser {
  id: string;
  name: string;
  whatsapp: string;
  role: AdminRole;
  active: boolean;
}
