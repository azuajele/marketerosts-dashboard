// Supabase Edge Function: cobranza-diaria
// Corre en la nube. No depende de node server.js ni de tu Mac.
// Deploy: supabase functions deploy cobranza-diaria --no-verify-jwt

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const TZ = "America/Mexico_City";

function getMexicoDateParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const values = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    date: `${values.year}-${values.month}-${values.day}`,
    monthPrefix: `${values.year}-${values.month}`,
  };
}

function mx(n: unknown) {
  return Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });
}

function normalizePagoFechas(value: unknown, partes: number, fallbackDay = 1) {
  let arr: number[] = [];

  if (Array.isArray(value)) {
    arr = value.map((x) => Number(x)).filter((x) => x >= 1 && x <= 31);
  } else if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        arr = parsed.map((x) => Number(x)).filter((x) => x >= 1 && x <= 31);
      }
    } catch {
      arr = [];
    }
  }

  const defaults = [fallbackDay || 1, 15, 30];
  const count = Math.min(Math.max(Number(partes || 1), 1), 3);

  while (arr.length < count) arr.push(defaults[arr.length] || fallbackDay || 1);
  return arr.slice(0, count);
}

function emailHtml({
  cliente,
  mensaje,
  agenciaNombre,
  parte,
  totalPartes,
  montoParte,
}: {
  cliente: any;
  mensaje: string;
  agenciaNombre: string;
  parte: number;
  totalPartes: number;
  montoParte: number;
}) {
  return `
    <div style="font-family:Arial,sans-serif;background:#f8fafc;padding:24px">
      <div style="max-width:680px;margin:auto;background:white;border:1px solid #e2e8f0;border-radius:18px;overflow:hidden">
        <div style="background:linear-gradient(135deg,#0f172a,#991ccc);color:white;padding:24px 28px">
          <h2 style="margin:0;font-size:23px">Aviso de cobranza</h2>
          <p style="margin:7px 0 0;color:#e2e8f0">${agenciaNombre}</p>
        </div>
        <div style="padding:28px;color:#0f172a">
          <p>Hola ${cliente.contacto || cliente.nombre},</p>
          <p style="font-size:18px;line-height:1.45"><strong>${mensaje}</strong></p>

          <div style="margin-top:22px;padding:16px;border-radius:14px;background:#f1f5f9;color:#334155">
            <strong>Cliente:</strong> ${cliente.nombre}<br/>
            <strong>Pago:</strong> Parte ${parte} de ${totalPartes}<br/>
            <strong>Monto estimado de esta parte:</strong> ${mx(montoParte)}<br/>
            <strong>Monto mensual total:</strong> ${mx(cliente.pago_mensual)}
          </div>

          <p style="margin-top:22px">Por favor, envíanos tu comprobante para mantener tu servicio al día.</p>
          <p style="margin-top:28px;color:#64748b">Atentamente,<br/><strong>${agenciaNombre}</strong></p>
        </div>
      </div>
    </div>`;
}

async function sendEmail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const apiKey = Deno.env.get("RESEND_API_KEY");
  const from = Deno.env.get("RESEND_FROM") || "AZP Marketing Suite <pagos@azpmarketing.org>";

  if (!apiKey) throw new Error("Falta RESEND_API_KEY en Supabase secrets.");

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from, to: [to], subject, html }),
  });

  const body = await res.text();
  if (!res.ok) throw new Error(`Resend error ${res.status}: ${body}`);
  return body;
}

serve(async (req) => {
  try {
    const cronSecret = Deno.env.get("CRON_SECRET");
    const auth = req.headers.get("authorization") || "";

    if (cronSecret && auth !== `Bearer ${cronSecret}`) {
      return new Response(JSON.stringify({ ok: false, error: "No autorizado" }), { status: 401 });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceKey) {
      throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY en Supabase secrets.");
    }

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const mxDate = getMexicoDateParts();
    const dryRun = new URL(req.url).searchParams.get("dryRun") === "1";

    const { data: agencia } = await supabase
      .from("agencia_config")
      .select("nombre")
      .eq("id", 1)
      .maybeSingle();

    const agenciaNombre = agencia?.nombre || "AZP Marketing Suite";

    const { data: clientes, error: errClientes } = await supabase
      .from("empresas")
      .select("*")
      .eq("tipo", "Cliente");

    if (errClientes) throw errClientes;

    const { data: pagosDelMes, error: errPagos } = await supabase
      .from("finanzas")
      .select("empresa_id,fecha")
      .gte("fecha", `${mxDate.monthPrefix}-01`)
      .lte("fecha", `${mxDate.monthPrefix}-31`);

    if (errPagos) throw errPagos;

    const resultados: any[] = [];

    for (const cliente of clientes || []) {
      if (!cliente.email) {
        resultados.push({ cliente: cliente.nombre, accion: "omitido", motivo: "Sin correo" });
        continue;
      }

      const totalPartes = Math.min(Math.max(Number(cliente.pago_partes || 1), 1), 3);
      const pagoFechas = normalizePagoFechas(cliente.pago_fechas, totalPartes, Number(cliente.dia_pago || 1));
      const pagosClienteMes = (pagosDelMes || []).filter((p: any) => String(p.empresa_id) === String(cliente.id)).length;
      const siguienteParte = Math.min(pagosClienteMes + 1, totalPartes);

      if (pagosClienteMes >= totalPartes) {
        resultados.push({ cliente: cliente.nombre, accion: "omitido", motivo: "Ya pagó todas las partes del mes" });
        continue;
      }

      const diaPago = pagoFechas[siguienteParte - 1] || Number(cliente.dia_pago || 1);
      const difDias = diaPago - mxDate.day;
      const montoParte = Number(cliente.pago_mensual || 0) / totalPartes;

      let mensaje = "";
      if (difDias === 5) mensaje = `Faltan 5 días para la parte ${siguienteParte} de ${totalPartes}. Monto estimado: ${mx(montoParte)}.`;
      else if (difDias === 3) mensaje = `Aviso amigable: faltan 3 días para la parte ${siguienteParte} de ${totalPartes}. Monto estimado: ${mx(montoParte)}.`;
      else if (difDias === 0) mensaje = `Hoy corresponde la parte ${siguienteParte} de ${totalPartes}. Monto estimado: ${mx(montoParte)}.`;
      else if (difDias === -1) mensaje = `Tienes 1 día de atraso en la parte ${siguienteParte} de ${totalPartes}. Monto estimado: ${mx(montoParte)}.`;
      else if (difDias < -1) mensaje = `URGENTE: tienes ${Math.abs(difDias)} días de atraso en la parte ${siguienteParte} de ${totalPartes}. Monto estimado: ${mx(montoParte)}.`;

      if (!mensaje) {
        resultados.push({
          cliente: cliente.nombre,
          accion: "omitido",
          motivo: `No toca aviso. Parte ${siguienteParte}/${totalPartes}. Día pago: ${diaPago}. Diferencia: ${difDias}`,
        });
        continue;
      }

      if (dryRun) {
        resultados.push({ cliente: cliente.nombre, accion: "dry_run", email: cliente.email, mensaje });
        continue;
      }

      await sendEmail({
        to: cliente.email,
        subject: `Estado de cuenta - ${cliente.nombre}`,
        html: emailHtml({
          cliente,
          mensaje,
          agenciaNombre,
          parte: siguienteParte,
          totalPartes,
          montoParte,
        }),
      });

      resultados.push({ cliente: cliente.nombre, accion: "email_enviado", email: cliente.email, parte: `${siguienteParte}/${totalPartes}` });
    }

    return new Response(JSON.stringify({ ok: true, fechaMexico: mxDate.date, resultados }, null, 2), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ ok: false, error: String(err?.message || err) }, null, 2), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
