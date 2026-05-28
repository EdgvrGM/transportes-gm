import { PATIO_LAT, PATIO_LNG, PATIO_RADIO_M } from "@/components/gps/constants";

export function distanciaMetros(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export function estaEnPatio(lat, lng) {
  return distanciaMetros(lat, lng, PATIO_LAT, PATIO_LNG) <= PATIO_RADIO_M;
}
