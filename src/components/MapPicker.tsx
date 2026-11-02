"use client";

import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";
import type { Map as LeafletMap, Marker as LeafletMarker } from "leaflet";

// خريطة تفاعلية لاختيار موقع المولّد: تنقر على الخريطة أو تسحب الدبوس فيتحدّث
// الإحداثيات. مبنية على Leaflet + بلاطات OpenStreetMap (مجانية بدون مفتاح API).
// نحمّل مكتبة leaflet ديناميكيًا داخل useEffect حتى ما تتعارض مع التصدير الثابت.
export function MapPicker({
  lat,
  lng,
  onChange,
}: {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const markerRef = useRef<LeafletMarker | null>(null);
  // نمرّر onChange عبر ref حتى ما نعيد تهيئة الخريطة كل ما تتغيّر الدالة
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !containerRef.current || mapRef.current) return;

      const start: [number, number] = [
        Number.isFinite(lat) ? lat : 23.588,
        Number.isFinite(lng) ? lng : 58.408,
      ];

      const map = L.map(containerRef.current).setView(start, 14);
      mapRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "© OpenStreetMap",
      }).addTo(map);

      // دبوس مخصّص بالـ HTML بدل صورة Leaflet الافتراضية (نتفادى مشاكل مسار الصور)
      const pin = L.divIcon({
        className: "",
        html: '<div style="font-size:30px;line-height:30px;filter:drop-shadow(0 1px 2px rgba(0,0,0,.4))">📍</div>',
        iconSize: [30, 30],
        iconAnchor: [15, 30],
      });

      const marker = L.marker(start, { draggable: true, icon: pin }).addTo(map);
      markerRef.current = marker;

      marker.on("dragend", () => {
        const p = marker.getLatLng();
        onChangeRef.current(p.lat, p.lng);
      });

      map.on("click", (e) => {
        marker.setLatLng(e.latlng);
        onChangeRef.current(e.latlng.lat, e.latlng.lng);
      });

      // نصحّح حجم الخريطة بعد ظهور العنصر (مهم لما تُفتح داخل قسم مخفي)
      setTimeout(() => map.invalidateSize(), 120);
    })();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
    // نهيّئ مرة واحدة فقط
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // لو تغيّرت الإحداثيات من الخارج (مثلاً بعد استخدام GPS)، نحرّك الدبوس ونركّز عليه
  useEffect(() => {
    if (mapRef.current && markerRef.current && Number.isFinite(lat) && Number.isFinite(lng)) {
      markerRef.current.setLatLng([lat, lng]);
      mapRef.current.setView([lat, lng]);
    }
  }, [lat, lng]);

  return (
    <div className="overflow-hidden rounded-xl border border-neutral-200">
      <div ref={containerRef} className="h-64 w-full" style={{ zIndex: 0 }} />
    </div>
  );
}
