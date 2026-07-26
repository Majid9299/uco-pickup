interface RouteStop {
  lat: number;
  lng: number;
}

// يبني رابط Google Maps بخط سير متعدد التوقفات، الوجهة الأخيرة هي آخر توقف
// والتوقفات الوسيطة تُمرَّر عبر waypoints — يفتح بضغطة زر واحدة على تطبيق أو متصفح الخرائط
export function buildGoogleMapsRouteUrl(stops: RouteStop[]): string {
  if (stops.length === 0) return "";
  const destination = stops[stops.length - 1];
  const waypoints = stops.slice(0, -1);

  const params = new URLSearchParams({
    api: "1",
    destination: `${destination.lat},${destination.lng}`,
    travelmode: "driving",
  });
  if (waypoints.length > 0) {
    params.set("waypoints", waypoints.map((w) => `${w.lat},${w.lng}`).join("|"));
  }
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
