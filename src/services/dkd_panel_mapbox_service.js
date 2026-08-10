import { dkd_generated_public_env_value } from '../lib/dkd_public_env.generated';

const dkd_mapbox_public_token_fallback_value = [
  'pk.eyJ1IjoiZHJh',
  'Ym9ybmVhZ2xlIiwiYSI6',
  'ImNtb2w4bzJqNTBnZDcyc3Ni',
  'Zzd5anJpYWYifQ.',
  'dtxvJcDCckwWCFGCk7ialg',
].join('');
const dkd_mapbox_token_value = String(
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  || dkd_generated_public_env_value.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  || dkd_mapbox_public_token_fallback_value
  || ''
).trim();

function dkd_number_value(dkd_value) { const dkd_number = Number(dkd_value); return Number.isFinite(dkd_number) ? dkd_number : null; }
function dkd_point_value(dkd_lat_value, dkd_lng_value) {
  const dkd_lat = dkd_number_value(dkd_lat_value); const dkd_lng = dkd_number_value(dkd_lng_value);
  return dkd_lat == null || dkd_lng == null ? null : { latitude: dkd_lat, longitude: dkd_lng };
}

export function dkd_panel_mapbox_ready() { return /^pk\./.test(dkd_mapbox_token_value); }

export async function dkd_panel_geocode_address(dkd_address_value) {
  const dkd_address_text = String(dkd_address_value || '').trim();
  if (!dkd_address_text || !dkd_panel_mapbox_ready()) return null;
  const dkd_query_value = /ankara|türkiye|turkiye/i.test(dkd_address_text) ? dkd_address_text : `${dkd_address_text}, Ankara, Türkiye`;
  const dkd_url_value = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(dkd_query_value)}.json?access_token=${encodeURIComponent(dkd_mapbox_token_value)}&country=TR&language=tr&limit=1`;
  const dkd_response_value = await fetch(dkd_url_value);
  const dkd_json_value = await dkd_response_value.json();
  const dkd_feature_value = Array.isArray(dkd_json_value?.features) ? dkd_json_value.features[0] : null;
  const dkd_center_value = Array.isArray(dkd_feature_value?.center) ? dkd_feature_value.center : null;
  const dkd_point = dkd_center_value ? dkd_point_value(dkd_center_value[1], dkd_center_value[0]) : null;
  return dkd_point ? { ...dkd_point, dkd_label_value: String(dkd_feature_value?.place_name || dkd_address_text) } : null;
}

export async function dkd_panel_fetch_route(dkd_origin_value, dkd_destination_value) {
  const dkd_origin = dkd_point_value(dkd_origin_value?.latitude ?? dkd_origin_value?.lat, dkd_origin_value?.longitude ?? dkd_origin_value?.lng);
  const dkd_destination = dkd_point_value(dkd_destination_value?.latitude ?? dkd_destination_value?.lat, dkd_destination_value?.longitude ?? dkd_destination_value?.lng);
  if (!dkd_origin || !dkd_destination || !dkd_panel_mapbox_ready()) return { dkd_points_value: [], dkd_distance_km_value: null, dkd_duration_min_value: null };
  const dkd_url_value = `https://api.mapbox.com/directions/v5/mapbox/driving/${dkd_origin.longitude},${dkd_origin.latitude};${dkd_destination.longitude},${dkd_destination.latitude}?access_token=${encodeURIComponent(dkd_mapbox_token_value)}&geometries=geojson&overview=full&steps=false`;
  const dkd_response_value = await fetch(dkd_url_value);
  const dkd_json_value = await dkd_response_value.json();
  const dkd_route_value = Array.isArray(dkd_json_value?.routes) ? dkd_json_value.routes[0] : null;
  const dkd_coordinates_value = Array.isArray(dkd_route_value?.geometry?.coordinates) ? dkd_route_value.geometry.coordinates : [];
  return {
    dkd_points_value: dkd_coordinates_value.map((dkd_coordinate_value) => ({ latitude: Number(dkd_coordinate_value[1]), longitude: Number(dkd_coordinate_value[0]) })).filter((dkd_point) => Number.isFinite(dkd_point.latitude) && Number.isFinite(dkd_point.longitude)),
    dkd_distance_km_value: Number.isFinite(Number(dkd_route_value?.distance)) ? Number(dkd_route_value.distance) / 1000 : null,
    dkd_duration_min_value: Number.isFinite(Number(dkd_route_value?.duration)) ? Math.max(1, Math.round(Number(dkd_route_value.duration) / 60)) : null,
  };
}
