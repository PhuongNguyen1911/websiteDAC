/**
 * Cloudflare Pages Function: POST /api/tra-cuu
 * Tra cứu trạng thái đơn lắp đặt qua Google Apps Script gắn với file Google Sheets.
 *
 * Biến môi trường (Cloudflare Pages → Settings → Variables and Secrets):
 *   TRACK_SCRIPT_URL  → URL Web App của Apps Script (…/exec)
 *   TRACK_KEY         → khóa bí mật, trùng với Script Property TRACK_KEY trong Apps Script
 *
 * Body JSON: { "code": "MÃ ĐƠN", "phone": "3 số cuối SĐT" }
 * Trả về: { ok:true, order:{…} } | { ok:false, error:"invalid|not_found|locked|not_configured|upstream" }
 */

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" }
  });
}

const FIELDS = ["code", "status", "orderDate", "installDate", "province", "service", "note"];

export async function onRequestPost({ request, env }) {
  let raw;
  try {
    raw = await request.json();
  } catch {
    return json({ ok: false, error: "invalid" }, 400);
  }

  const code = String(raw.code ?? "").replace(/\s+/g, "").toUpperCase();
  const last3 = String(raw.phone ?? "").replace(/\D/g, "");
  if (!/^[A-Z0-9._\-\/]{4,40}$/.test(code) || last3.length !== 3) {
    return json({ ok: false, error: "invalid" }, 422);
  }

  if (!env.TRACK_SCRIPT_URL || !env.TRACK_KEY) {
    return json({ ok: false, error: "not_configured" }, 503);
  }

  const url = new URL(env.TRACK_SCRIPT_URL);
  url.searchParams.set("key", env.TRACK_KEY);
  url.searchParams.set("code", code);
  url.searchParams.set("p", last3);

  let data;
  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 15000);
    const res = await fetch(url.toString(), { redirect: "follow", signal: ctrl.signal });
    clearTimeout(timer);
    data = await res.json();
  } catch {
    return json({ ok: false, error: "upstream" }, 502);
  }

  if (data && data.ok && data.order) {
    const order = {};
    for (const k of FIELDS) order[k] = String(data.order[k] ?? "").slice(0, 300);
    return json({ ok: true, order });
  }

  const err = data && data.error;
  if (err === "not_found") return json({ ok: false, error: "not_found" }, 404);
  if (err === "locked") return json({ ok: false, error: "locked", minutes: Number(data.minutes) || 15 }, 429);
  if (err === "invalid") return json({ ok: false, error: "invalid" }, 422);
  return json({ ok: false, error: "upstream" }, 502); // unauthorized hoặc lỗi khác: không lộ chi tiết
}

export function onRequest() {
  return json({ ok: false, error: "method_not_allowed" }, 405);
}
