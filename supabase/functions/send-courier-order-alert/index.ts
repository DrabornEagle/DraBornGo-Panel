const dkd_cors_headers_value = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-dkd-webhook-secret',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function dkd_text_value(dkd_value: unknown): string { return String(dkd_value ?? '').trim(); }
function dkd_object_value(dkd_value: unknown): Record<string, unknown> { return dkd_value && typeof dkd_value === 'object' && !Array.isArray(dkd_value) ? dkd_value as Record<string, unknown> : {}; }
function dkd_array_value(dkd_value: unknown): Record<string, unknown>[] { return Array.isArray(dkd_value) ? dkd_value.map(dkd_object_value) : []; }

async function dkd_supabase_get_value(dkd_path_value: string): Promise<unknown> {
  const dkd_url_value = dkd_text_value(Deno.env.get('SUPABASE_URL'));
  const dkd_key_value = dkd_text_value(Deno.env.get('SUPABASE_SERVICE_ROLE_KEY'));
  if (!dkd_url_value || !dkd_key_value) throw new Error('dkd_missing_supabase_edge_env');
  const dkd_response_value = await fetch(`${dkd_url_value}${dkd_path_value}`, {
    headers: { apikey: dkd_key_value, authorization: `Bearer ${dkd_key_value}` },
  });
  const dkd_text_response_value = await dkd_response_value.text();
  if (!dkd_response_value.ok) throw new Error(dkd_text_response_value || `dkd_supabase_http_${dkd_response_value.status}`);
  return dkd_text_response_value ? JSON.parse(dkd_text_response_value) : [];
}

async function dkd_expected_webhook_secret_value(): Promise<string> {
  const dkd_rows_value = dkd_array_value(await dkd_supabase_get_value('/rest/v1/dkd_internal_webhook_config?select=dkd_secret&dkd_key=eq.courier_order_alert&limit=1'));
  return dkd_text_value(dkd_rows_value[0]?.dkd_secret);
}

async function dkd_verified_job_value(dkd_payload_value: Record<string, unknown>): Promise<Record<string, unknown> | null> {
  const dkd_record_value = dkd_object_value(dkd_payload_value.record || dkd_payload_value.new || dkd_payload_value.data || dkd_payload_value);
  const dkd_job_id_value = Number(dkd_record_value.id || dkd_record_value.job_id || dkd_record_value.dkd_job_id || 0);
  if (!Number.isFinite(dkd_job_id_value) || dkd_job_id_value <= 0) return null;
  const dkd_rows_value = dkd_array_value(await dkd_supabase_get_value(`/rest/v1/dkd_courier_jobs?select=id,title,product_title,status,pickup_status,is_active,assigned_user_id,dkd_business_id,dkd_order_ref_text,job_type&id=eq.${encodeURIComponent(String(dkd_job_id_value))}&limit=1`));
  return dkd_rows_value[0] || null;
}

function dkd_job_event_value(dkd_job_value: Record<string, unknown>): 'new_order' | 'accepted' | 'delivered' | '' {
  const dkd_status_value = dkd_text_value(dkd_job_value.status).toLowerCase();
  const dkd_pickup_status_value = dkd_text_value(dkd_job_value.pickup_status).toLowerCase();
  if (['completed','delivered','done','finished'].includes(dkd_status_value) || ['delivered','completed'].includes(dkd_pickup_status_value) || dkd_job_value.is_active === false) return 'delivered';
  if (['accepted','assigned','to_pickup'].includes(dkd_status_value)) return 'accepted';
  if (['open','ready','published','pending','courier_pool','new','waiting'].includes(dkd_status_value) && !dkd_text_value(dkd_job_value.assigned_user_id) && dkd_job_value.is_active !== false) return 'new_order';
  return '';
}

async function dkd_business_target_value(dkd_business_id_value: string): Promise<{ ownerId: string; courierIds: string[] }> {
  if (!dkd_business_id_value) return { ownerId: '', courierIds: [] };
  const [dkd_business_rows_value, dkd_member_rows_value] = await Promise.all([
    dkd_supabase_get_value(`/rest/v1/dkd_businesses?select=dkd_owner_user_id&dkd_id=eq.${encodeURIComponent(dkd_business_id_value)}&dkd_is_active=is.true&limit=1`),
    dkd_supabase_get_value(`/rest/v1/dkd_business_couriers?select=dkd_courier_user_id&dkd_business_id=eq.${encodeURIComponent(dkd_business_id_value)}&dkd_is_active=is.true`),
  ]);
  const dkd_owner_id_value = dkd_text_value(dkd_array_value(dkd_business_rows_value)[0]?.dkd_owner_user_id);
  const dkd_courier_ids_value = [...new Set(dkd_array_value(dkd_member_rows_value).map((dkd_row_value) => dkd_text_value(dkd_row_value.dkd_courier_user_id)).filter(Boolean))];
  return { ownerId: dkd_owner_id_value, courierIds: dkd_courier_ids_value };
}

async function dkd_token_rows_value(dkd_user_ids_value: string[]): Promise<Record<string, unknown>[]> {
  const dkd_ids_value = [...new Set(dkd_user_ids_value.map(dkd_text_value).filter(Boolean))];
  if (!dkd_ids_value.length) return [];
  const dkd_filter_value = dkd_ids_value.map((dkd_value) => `\"${dkd_value}\"`).join(',');
  return dkd_array_value(await dkd_supabase_get_value(`/rest/v1/dkd_push_tokens?select=user_id,expo_push_token,token,app_mode,is_active,last_seen_at&is_active=is.true&user_id=in.(${encodeURIComponent(dkd_filter_value)})&order=last_seen_at.desc&limit=100`));
}

function dkd_token_text_value(dkd_row_value: Record<string, unknown>): string { return dkd_text_value(dkd_row_value.expo_push_token || dkd_row_value.token); }
function dkd_is_panel_token_value(dkd_row_value: Record<string, unknown>): boolean { return dkd_text_value(dkd_row_value.app_mode).toLowerCase().includes('panel'); }

function dkd_latest_tokens_value(dkd_rows_value: Record<string, unknown>[]): Record<string, unknown>[] {
  const dkd_seen_value = new Set<string>();
  const dkd_output_value: Record<string, unknown>[] = [];
  for (const dkd_row_value of dkd_rows_value) {
    const dkd_token_value = dkd_token_text_value(dkd_row_value);
    if (!dkd_token_value.startsWith('ExponentPushToken')) continue;
    const dkd_key_value = `${dkd_text_value(dkd_row_value.user_id)}:${dkd_is_panel_token_value(dkd_row_value) ? 'panel' : 'core'}`;
    if (dkd_seen_value.has(dkd_key_value)) continue;
    dkd_seen_value.add(dkd_key_value);
    dkd_output_value.push(dkd_row_value);
  }
  return dkd_output_value;
}

async function dkd_send_messages_value(dkd_messages_value: Record<string, unknown>[]): Promise<unknown> {
  if (!dkd_messages_value.length) return [];
  const dkd_response_value = await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json' },
    body: JSON.stringify(dkd_messages_value),
  });
  const dkd_response_text_value = await dkd_response_value.text();
  if (!dkd_response_value.ok) throw new Error(dkd_response_text_value || `dkd_expo_push_http_${dkd_response_value.status}`);
  try { return JSON.parse(dkd_response_text_value); } catch { return dkd_response_text_value; }
}

Deno.serve(async (dkd_request_value: Request) => {
  if (dkd_request_value.method === 'OPTIONS') return new Response('ok', { headers: dkd_cors_headers_value });
  if (dkd_request_value.method !== 'POST') return new Response(JSON.stringify({ ok: false, reason: 'method_not_allowed' }), { status: 405, headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });
  try {
    const dkd_expected_secret_value = await dkd_expected_webhook_secret_value();
    const dkd_received_secret_value = dkd_text_value(dkd_request_value.headers.get('x-dkd-webhook-secret'));
    if (!dkd_expected_secret_value || dkd_received_secret_value !== dkd_expected_secret_value) return new Response(JSON.stringify({ ok: false, reason: 'unauthorized' }), { status: 401, headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });

    const dkd_payload_value = dkd_object_value(await dkd_request_value.json().catch(() => ({})));
    const dkd_job_value = await dkd_verified_job_value(dkd_payload_value);
    if (!dkd_job_value) return new Response(JSON.stringify({ ok: true, ignored: 'job_not_found' }), { headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });

    const dkd_derived_event_value = dkd_job_event_value(dkd_job_value);
    const dkd_requested_event_value = dkd_text_value(dkd_payload_value.event).toLowerCase();
    if (!dkd_derived_event_value || (dkd_requested_event_value && dkd_requested_event_value !== dkd_derived_event_value)) return new Response(JSON.stringify({ ok: true, ignored: 'state_not_notifiable', dkd_derived_event_value }), { headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });

    const dkd_business_id_value = dkd_text_value(dkd_job_value.dkd_business_id);
    const dkd_assigned_user_id_value = dkd_text_value(dkd_job_value.assigned_user_id);
    const dkd_targets_value = await dkd_business_target_value(dkd_business_id_value);
    const dkd_courier_user_ids_value = dkd_derived_event_value === 'new_order' ? (dkd_assigned_user_id_value ? [dkd_assigned_user_id_value] : dkd_targets_value.courierIds) : [];
    const dkd_target_user_ids_value = [...new Set([...dkd_courier_user_ids_value, dkd_targets_value.ownerId].filter(Boolean))];
    const dkd_token_rows = dkd_latest_tokens_value(await dkd_token_rows_value(dkd_target_user_ids_value));
    const dkd_title_value = dkd_text_value(dkd_job_value.title || dkd_job_value.product_title) || 'Teslimat görevi';
    const dkd_order_ref_value = dkd_text_value(dkd_job_value.dkd_order_ref_text || dkd_job_value.id);
    const dkd_job_id_value = Number(dkd_job_value.id);
    const dkd_messages_value: Record<string, unknown>[] = [];

    for (const dkd_row_value of dkd_token_rows) {
      const dkd_token_value = dkd_token_text_value(dkd_row_value);
      const dkd_user_id_value = dkd_text_value(dkd_row_value.user_id);
      const dkd_panel_token_value = dkd_is_panel_token_value(dkd_row_value);
      if (dkd_derived_event_value === 'new_order' && dkd_courier_user_ids_value.includes(dkd_user_id_value) && !dkd_panel_token_value) dkd_messages_value.push({ to: dkd_token_value, title: 'Yeni Kurye Görevi', body: `#${dkd_order_ref_value} • ${dkd_title_value}`, channelId: 'draborngo-core', priority: 'high', data: { route: 'courier', screen: 'courier', jobId: dkd_job_id_value, dkd_business_id: dkd_business_id_value, dkd_event_key: 'new_order' } });
      if (dkd_user_id_value === dkd_targets_value.ownerId && dkd_panel_token_value) {
        if (dkd_derived_event_value === 'new_order') dkd_messages_value.push({ to: dkd_token_value, title: 'Yeni Sipariş Geldi', body: `#${dkd_order_ref_value} • ${dkd_title_value}`, channelId: 'draborngo-panel', priority: 'high', data: { route: 'orders', screen: 'orders', dkd_job_id: dkd_job_id_value, dkd_event_key: 'new_order' } });
        else if (dkd_derived_event_value === 'accepted') dkd_messages_value.push({ to: dkd_token_value, title: 'Kurye Görevi Kabul Etti', body: `#${dkd_order_ref_value} • ${dkd_title_value} kurye tarafından kabul edildi.`, channelId: 'draborngo-panel', priority: 'high', data: { route: 'dashboard', screen: 'dashboard', dkd_job_id: dkd_job_id_value, dkd_event_key: 'accepted' } });
        else if (dkd_derived_event_value === 'delivered') dkd_messages_value.push({ to: dkd_token_value, title: 'Sipariş Teslim Edildi', body: `#${dkd_order_ref_value} • ${dkd_title_value} teslimatı tamamlandı.`, channelId: 'draborngo-panel', priority: 'high', data: { route: 'orders', screen: 'orders', dkd_job_id: dkd_job_id_value, dkd_event_key: 'delivered' } });
      }
    }

    const dkd_push_result_value = await dkd_send_messages_value(dkd_messages_value);
    return new Response(JSON.stringify({ ok: true, dkd_event_value: dkd_derived_event_value, dkd_sent_count_value: dkd_messages_value.length, dkd_push_result_value }), { headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });
  } catch (dkd_error_value) {
    return new Response(JSON.stringify({ ok: false, dkd_error_value: dkd_error_value instanceof Error ? dkd_error_value.message : String(dkd_error_value) }), { status: 200, headers: { ...dkd_cors_headers_value, 'content-type': 'application/json' } });
  }
});
