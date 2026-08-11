import { supabase } from '../lib/supabase';
import { dkd_generated_public_env_value } from '../lib/dkd_public_env.generated';

const dkd_mapbox_token_value = String(
  process.env.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  || dkd_generated_public_env_value?.EXPO_PUBLIC_MAPBOX_ACCESS_TOKEN
  || '',
).trim();

function dkd_number_or_null_value(dkd_value) {
  if (dkd_value === null || dkd_value === undefined || dkd_value === '') return null;
  const dkd_number_value = Number(dkd_value);
  return Number.isFinite(dkd_number_value) ? dkd_number_value : null;
}

export function dkd_panel_coordinate_value(dkd_lat_value, dkd_lng_value) {
  const dkd_lat_number_value = dkd_number_or_null_value(dkd_lat_value);
  const dkd_lng_number_value = dkd_number_or_null_value(dkd_lng_value);
  if (dkd_lat_number_value == null || dkd_lng_number_value == null) return null;
  if (Math.abs(dkd_lat_number_value) > 90 || Math.abs(dkd_lng_number_value) > 180) return null;
  if (Math.abs(dkd_lat_number_value) < 0.0001 && Math.abs(dkd_lng_number_value) < 0.0001) return null;
  return {
    dkd_lat_value: dkd_lat_number_value,
    dkd_lng_value: dkd_lng_number_value,
    dkd_coordinate_value: [dkd_lng_number_value, dkd_lat_number_value],
  };
}

export function dkd_panel_haversine_km_value(dkd_start_value, dkd_end_value) {
  if (!dkd_start_value || !dkd_end_value) return null;
  const dkd_to_radian_value = (dkd_degree_value) => Number(dkd_degree_value) * Math.PI / 180;
  const dkd_delta_lat_value = dkd_to_radian_value(dkd_end_value.dkd_lat_value - dkd_start_value.dkd_lat_value);
  const dkd_delta_lng_value = dkd_to_radian_value(dkd_end_value.dkd_lng_value - dkd_start_value.dkd_lng_value);
  const dkd_start_lat_radian_value = dkd_to_radian_value(dkd_start_value.dkd_lat_value);
  const dkd_end_lat_radian_value = dkd_to_radian_value(dkd_end_value.dkd_lat_value);
  const dkd_arc_value = Math.sin(dkd_delta_lat_value / 2) ** 2
    + Math.cos(dkd_start_lat_radian_value) * Math.cos(dkd_end_lat_radian_value) * Math.sin(dkd_delta_lng_value / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(dkd_arc_value), Math.sqrt(1 - dkd_arc_value));
}

function dkd_mapbox_query_text_value(dkd_value) {
  return String(dkd_value || '').trim().replace(/\s+/g, ' ');
}
function dkd_mapbox_token_values(dkd_value) {
  return dkd_mapbox_query_text_value(dkd_value)
    .toLocaleLowerCase('tr-TR')
    .split(/[^0-9a-zçğıöşü]+/i)
    .filter((dkd_token_value) => dkd_token_value.length >= 3);
}
const dkd_generic_place_token_values = new Set([
  'ankara','turkiye','türkiye','mahallesi','mahalle','sokak','sokağı','cadde','caddesi','avm','mall',
  'alışveriş','alisveris','merkezi','center','centre','otel','hotel','hastane','hospital','market','restoran','restaurant',
]);
function dkd_important_place_token_values(dkd_query_value) {
  return dkd_mapbox_token_values(dkd_query_value).filter((dkd_token_value) => !dkd_generic_place_token_values.has(dkd_token_value));
}
function dkd_named_place_query_value(dkd_query_value) {
  return /\b(avm|mall|alışveriş|alisveris|hastane|hospital|üniversite|universite|otel|hotel|market|restoran|restaurant|plaza|rezidans|residence)\b/i.test(dkd_query_value);
}
function dkd_mapbox_feature_point_value(dkd_feature_value) {
  const dkd_routable_value = dkd_feature_value?.properties?.coordinates?.routable_points?.[0];
  if (dkd_routable_value) {
    const dkd_point_value = dkd_panel_coordinate_value(dkd_routable_value.latitude, dkd_routable_value.longitude);
    if (dkd_point_value) return dkd_point_value;
  }
  const dkd_properties_coordinate_value = dkd_feature_value?.properties?.coordinates;
  if (dkd_properties_coordinate_value) {
    const dkd_point_value = dkd_panel_coordinate_value(dkd_properties_coordinate_value.latitude, dkd_properties_coordinate_value.longitude);
    if (dkd_point_value) return dkd_point_value;
  }
  const dkd_geometry_value = dkd_feature_value?.geometry?.coordinates;
  if (Array.isArray(dkd_geometry_value) && dkd_geometry_value.length >= 2) {
    return dkd_panel_coordinate_value(dkd_geometry_value[1], dkd_geometry_value[0]);
  }
  return null;
}
function dkd_mapbox_feature_text_value(dkd_feature_value) {
  const dkd_properties_value = dkd_feature_value?.properties || {};
  const dkd_context_value = dkd_properties_value?.context || {};
  const dkd_context_text_value = Object.keys(dkd_context_value)
    .map((dkd_key_value) => String(dkd_context_value?.[dkd_key_value]?.name || '').trim())
    .filter(Boolean)
    .join(' ');
  return [
    dkd_properties_value.name,
    dkd_properties_value.name_preferred,
    dkd_properties_value.full_address,
    dkd_properties_value.address,
    dkd_properties_value.place_formatted,
    dkd_context_text_value,
  ].map((dkd_value) => String(dkd_value || '').trim()).filter(Boolean).join(' ');
}
function dkd_mapbox_feature_match_value(dkd_feature_value, dkd_query_value) {
  const dkd_feature_text_value = dkd_mapbox_feature_text_value(dkd_feature_value).toLocaleLowerCase('tr-TR');
  const dkd_important_values = dkd_important_place_token_values(dkd_query_value);
  if (!dkd_important_values.length) return true;
  const dkd_matched_value = dkd_important_values.filter((dkd_token_value) => dkd_feature_text_value.includes(dkd_token_value));
  return dkd_named_place_query_value(dkd_query_value)
    ? dkd_matched_value.length >= Math.min(1, dkd_important_values.length)
    : dkd_matched_value.length >= Math.ceil(dkd_important_values.length * 0.4);
}
function dkd_mapbox_feature_score_value(dkd_feature_value, dkd_query_value) {
  const dkd_feature_text_value = dkd_mapbox_feature_text_value(dkd_feature_value).toLocaleLowerCase('tr-TR');
  const dkd_query_token_values = dkd_mapbox_token_values(dkd_query_value);
  const dkd_important_values = dkd_important_place_token_values(dkd_query_value);
  const dkd_match_count_value = dkd_query_token_values.reduce(
    (dkd_total_value, dkd_token_value) => dkd_total_value + (dkd_feature_text_value.includes(dkd_token_value) ? 1 : 0), 0,
  );
  const dkd_important_match_value = dkd_important_values.reduce(
    (dkd_total_value, dkd_token_value) => dkd_total_value + (dkd_feature_text_value.includes(dkd_token_value) ? 1 : 0), 0,
  );
  const dkd_type_value = String(dkd_feature_value?.properties?.feature_type || '').toLowerCase();
  const dkd_type_bonus_value = dkd_type_value === 'poi' ? 70 : dkd_type_value === 'address' ? 35 : 0;
  const dkd_ankara_bonus_value = /ankara|etimesgut|eryaman|çankaya|yenimahalle|sincan|keçiören|mamak/i.test(dkd_feature_text_value) ? 45 : 0;
  const dkd_missing_important_penalty_value = Math.max(0, dkd_important_values.length - dkd_important_match_value) * 160;
  const dkd_mismatch_penalty_value = dkd_mapbox_feature_match_value(dkd_feature_value, dkd_query_value) ? 0 : 1000;
  return dkd_match_count_value * 45
    + dkd_important_match_value * 100
    + dkd_type_bonus_value
    + dkd_ankara_bonus_value
    - dkd_missing_important_penalty_value
    - dkd_mismatch_penalty_value;
}

export async function dkd_panel_geocode_delivery_address_value(dkd_address_value, dkd_options_value = {}) {
  const dkd_query_value = dkd_mapbox_query_text_value(dkd_address_value);
  if (!dkd_query_value) return null;
  const dkd_context_city_value = dkd_mapbox_query_text_value(dkd_options_value?.dkd_city_value || 'Ankara') || 'Ankara';

  try {
    const { data: dkd_verified_value } = await supabase.rpc('dkd_delivery_place_resolve_dkd', {
      dkd_param_query: dkd_query_value,
      dkd_param_city: dkd_context_city_value,
    });
    if (dkd_verified_value?.dkd_ok_value) {
      const dkd_verified_point_value = dkd_panel_coordinate_value(dkd_verified_value.dkd_lat, dkd_verified_value.dkd_lng);
      if (dkd_verified_point_value) {
        return {
          ...dkd_verified_point_value,
          dkd_place_name_value: String(dkd_verified_value.dkd_name || dkd_query_value),
          dkd_address_text_value: String(dkd_verified_value.dkd_address_text || dkd_query_value),
          dkd_is_verified_place_value: true,
        };
      }
    }
  } catch {}

  if (!dkd_mapbox_token_value.startsWith('pk.')) return null;
  const dkd_query_with_context_value = /\b(ankara|türkiye|turkiye)\b/i.test(dkd_query_value)
    ? dkd_query_value
    : [dkd_query_value, dkd_context_city_value, 'Türkiye'].filter(Boolean).join(', ');
  const dkd_parameters_value = new URLSearchParams({
    access_token: dkd_mapbox_token_value,
    q: dkd_query_with_context_value,
    country: 'TR',
    language: 'tr',
    limit: '10',
    types: 'poi,address,street,neighborhood,district,place,locality',
    auto_complete: 'true',
  });
  const dkd_proximity_value = dkd_options_value?.dkd_proximity_value;
  if (!dkd_named_place_query_value(dkd_query_value) && dkd_proximity_value?.dkd_coordinate_value) {
    dkd_parameters_value.set('proximity', dkd_proximity_value.dkd_coordinate_value.join(','));
  }

  try {
    const dkd_response_value = await fetch(`https://api.mapbox.com/search/searchbox/v1/forward?${dkd_parameters_value.toString()}`);
    const dkd_json_value = await dkd_response_value.json().catch(() => ({}));
    if (!dkd_response_value.ok) return null;
    const dkd_feature_values = Array.isArray(dkd_json_value?.features) ? dkd_json_value.features : [];
    const dkd_ranked_values = dkd_feature_values
      .map((dkd_feature_value) => ({
        dkd_feature_value,
        dkd_point_value: dkd_mapbox_feature_point_value(dkd_feature_value),
        dkd_score_value: dkd_mapbox_feature_score_value(dkd_feature_value, dkd_query_value),
      }))
      .filter((dkd_item_value) => dkd_item_value.dkd_point_value && dkd_mapbox_feature_match_value(dkd_item_value.dkd_feature_value, dkd_query_value))
      .sort((dkd_left_value, dkd_right_value) => dkd_right_value.dkd_score_value - dkd_left_value.dkd_score_value);
    const dkd_best_value = dkd_ranked_values[0];
    if (!dkd_best_value) return null;
    const dkd_feature_text_value = dkd_mapbox_feature_text_value(dkd_best_value.dkd_feature_value) || dkd_query_value;
    return {
      ...dkd_best_value.dkd_point_value,
      dkd_place_name_value: dkd_feature_text_value,
      dkd_address_text_value: dkd_feature_text_value,
      dkd_is_verified_place_value: false,
    };
  } catch {
    return null;
  }
}

export async function dkd_panel_fetch_live_route_value(dkd_start_value, dkd_end_value) {
  if (!dkd_start_value || !dkd_end_value) return null;
  const dkd_straight_distance_value = dkd_panel_haversine_km_value(dkd_start_value, dkd_end_value);
  if (!dkd_mapbox_token_value.startsWith('pk.')) {
    return {
      dkd_distance_km_value: dkd_straight_distance_value,
      dkd_duration_min_value: dkd_straight_distance_value == null ? null : Math.max(1, Math.round((dkd_straight_distance_value / 27) * 60 + 3)),
      dkd_route_coordinate_values: [dkd_start_value.dkd_coordinate_value, dkd_end_value.dkd_coordinate_value],
      dkd_is_fallback_value: true,
    };
  }
  const dkd_coordinate_text_value = `${dkd_start_value.dkd_lng_value},${dkd_start_value.dkd_lat_value};${dkd_end_value.dkd_lng_value},${dkd_end_value.dkd_lat_value}`;
  const dkd_parameters_value = new URLSearchParams({
    access_token: dkd_mapbox_token_value,
    geometries: 'geojson',
    overview: 'full',
    steps: 'false',
  });
  try {
    const dkd_response_value = await fetch(`https://api.mapbox.com/directions/v5/mapbox/driving-traffic/${dkd_coordinate_text_value}?${dkd_parameters_value.toString()}`);
    const dkd_json_value = await dkd_response_value.json().catch(() => ({}));
    const dkd_route_value = Array.isArray(dkd_json_value?.routes) ? dkd_json_value.routes[0] : null;
    if (!dkd_response_value.ok || !dkd_route_value) throw new Error('route_unavailable');
    const dkd_distance_value = dkd_number_or_null_value(dkd_route_value.distance);
    const dkd_duration_value = dkd_number_or_null_value(dkd_route_value.duration);
    return {
      dkd_distance_km_value: dkd_distance_value == null ? dkd_straight_distance_value : dkd_distance_value / 1000,
      dkd_duration_min_value: dkd_duration_value == null ? null : Math.max(1, dkd_duration_value / 60),
      dkd_route_coordinate_values: Array.isArray(dkd_route_value?.geometry?.coordinates)
        ? dkd_route_value.geometry.coordinates
        : [dkd_start_value.dkd_coordinate_value, dkd_end_value.dkd_coordinate_value],
      dkd_is_fallback_value: false,
      dkd_route_created_at_value: Date.now(),
    };
  } catch {
    return {
      dkd_distance_km_value: dkd_straight_distance_value,
      dkd_duration_min_value: dkd_straight_distance_value == null ? null : Math.max(1, Math.round((dkd_straight_distance_value / 27) * 60 + 3)),
      dkd_route_coordinate_values: [dkd_start_value.dkd_coordinate_value, dkd_end_value.dkd_coordinate_value],
      dkd_is_fallback_value: true,
      dkd_route_created_at_value: Date.now(),
    };
  }
}

export function dkd_panel_live_route_progress_value(dkd_route_value, dkd_current_point_value) {
  const dkd_coordinate_values = Array.isArray(dkd_route_value?.dkd_route_coordinate_values)
    ? dkd_route_value.dkd_route_coordinate_values
    : [];
  if (!dkd_current_point_value || dkd_coordinate_values.length < 2) return null;
  const dkd_point_values = dkd_coordinate_values
    .map((dkd_coordinate_value) => dkd_panel_coordinate_value(dkd_coordinate_value?.[1], dkd_coordinate_value?.[0]))
    .filter(Boolean);
  if (dkd_point_values.length < 2) return null;

  let dkd_nearest_index_value = 0;
  let dkd_nearest_distance_value = Number.POSITIVE_INFINITY;
  dkd_point_values.forEach((dkd_point_value, dkd_index_value) => {
    const dkd_distance_value = dkd_panel_haversine_km_value(dkd_current_point_value, dkd_point_value);
    if (Number.isFinite(dkd_distance_value) && dkd_distance_value < dkd_nearest_distance_value) {
      dkd_nearest_distance_value = dkd_distance_value;
      dkd_nearest_index_value = dkd_index_value;
    }
  });

  let dkd_remaining_km_value = Number.isFinite(dkd_nearest_distance_value) ? dkd_nearest_distance_value : 0;
  for (let dkd_index_value = dkd_nearest_index_value; dkd_index_value < dkd_point_values.length - 1; dkd_index_value += 1) {
    dkd_remaining_km_value += dkd_panel_haversine_km_value(dkd_point_values[dkd_index_value], dkd_point_values[dkd_index_value + 1]) || 0;
  }
  const dkd_initial_distance_value = dkd_number_or_null_value(dkd_route_value?.dkd_distance_km_value) || 0;
  const dkd_initial_duration_value = dkd_number_or_null_value(dkd_route_value?.dkd_duration_min_value) || 0;
  const dkd_ratio_value = dkd_initial_distance_value > 0
    ? Math.min(1.25, Math.max(0, dkd_remaining_km_value / dkd_initial_distance_value))
    : 1;
  const dkd_remaining_min_value = dkd_initial_duration_value > 0
    ? Math.max(1, dkd_initial_duration_value * dkd_ratio_value)
    : Math.max(1, (dkd_remaining_km_value / 27) * 60 + 2);
  return {
    dkd_distance_km_value: Math.max(0, dkd_remaining_km_value),
    dkd_duration_min_value: Math.max(1, dkd_remaining_min_value),
    dkd_nearest_route_index_value: dkd_nearest_index_value,
  };
}

export function dkd_panel_route_geojson_value(dkd_coordinate_values) {
  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'LineString',
      coordinates: Array.isArray(dkd_coordinate_values) ? dkd_coordinate_values : [],
    },
  };
}
