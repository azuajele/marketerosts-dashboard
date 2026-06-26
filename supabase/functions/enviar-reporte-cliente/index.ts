import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ADMIN_EMAILS = [
  "thalia@marketeros.com",
  "thalia@marketerosts.com",
  "luisazuaje@marketeros.com",
  "luis@marketeros.com",
];

function cleanEmail(email: string) {
  return String(email || "").trim().toLowerCase();
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email));
}

serve(async (req) => {
  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ ok: false, error: "Método no permitido" }), {
        status: 405,
        headers: { "Content-Type": "application/json" },
      });
    }

    const auth = req.headers.get("Authorization") || "";
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "";
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const resendKey = Deno.env.get("RESEND_API_KEY") || "";
    const from = Deno.env.get("RESEND_FROM") || "AZP Marketing Suite <pagos@azpmarketing.org>";

    if (!supabaseUrl || !anonKey) throw new Error("Faltan variables internas de Supabase.");
    if (!resendKey) throw new Error("Falta RESEND_API_KEY.");

    const supabase = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: auth } },
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const { data: userData, error: userError } = await supabase.auth.getUser();

    if (userError || !userData?.user?.email) {
      return new Response(JSON.stringify({ ok: false, error: "No autorizado" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const email = cleanEmail(userData.user.email);

    if (!ADMIN_EMAILS.includes(email)) {
      return new Response(JSON.stringify({ ok: false, error: "Solo administradores pueden enviar reportes al cliente." }), {
        status: 403,
        headers: { "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const to = cleanEmail(body.to);
    const empresa = String(body.empresa || "Cliente");
    const periodo = String(body.periodo || "");
    const subject = String(body.subject || `Reporte de resultados - ${empresa}`);
    const htmlReport = String(body.html || "");

    if (!isValidEmail(to)) throw new Error("Correo del cliente inválido.");
    if (!htmlReport) throw new Error("Reporte vacío.");

    const html = `
      <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
        <div style="max-width:980px;margin:auto">
          <div style="background:#0f172a;color:white;border-radius:18px;padding:22px 26px;margin-bottom:18px">
            <h2 style="margin:0">Reporte de resultados</h2>
            <p style="margin:6px 0 0;color:#cbd5e1">${empresa} · ${periodo}</p>
          </div>
          ${htmlReport}
        </div>
      </div>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject,
        html,
      }),
    });

    const result = await res.text();

    if (!res.ok) {
      throw new Error(`Resend error ${res.status}: ${result}`);
    }

    return new Response(JSON.stringify({ ok: true, to, result }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
