interface RouteStop {
  lat: number;
  lng: number;
}

function distance(a: RouteStop, b: RouteStop): number {
  const dLat = a.lat - b.lat;
  const dLng = a.lng - b.lng;
  return Math.sqrt(dLat * dLat + dLng * dLng);
}

// ترتيب التوقفات بأقرب-جار (nearest neighbor) بدءًا من موقع السائق الحالي —
// عشان يمرّ عليها بمسار متتالي مدروس بدل ترتيب عشوائي يخلّيه يروح ويرجع
export function orderStopsFromOrigin<T extends RouteStop>(origin: RouteStop, stops: T[]): T[] {
  const remaining = [...stops];
  const ordered: T[] = [];
  let current = origin;
  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = distance(current, remaining[0]);
    for (let i = 1; i < remaining.length; i++) {
      const d = distance(current, remaining[i]);
      if (d < nearestDist) {
        nearestDist = d;
        nearestIdx = i;
      }
    }
    const [next] = remaining.splice(nearestIdx, 1);
    ordered.push(next);
    current = next;
  }
  return ordered;
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
