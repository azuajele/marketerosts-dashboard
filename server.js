require("dotenv").config();

const express = require("express");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const { Resend } = require("resend");
const { createClient } = require("@supabase/supabase-js");
const WebSocket = require("ws");

const app = express();
const PORT = process.env.PORT || 3001;

const allowedOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      callback(new Error(`No permitido por CORS: ${origin}`));
    },
  })
);

app.use(express.json({ limit: "3mb" }));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
      ok: false,
      error: "Demasiadas peticiones desde esta IP. Intenta más tarde.",
    },
  })
);

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error("Faltan SUPABASE_URL o SUPABASE_SERVICE_KEY en el .env del backend.");
}

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: WebSocket,
  },
});

const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;

const mx = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

function currentMonthRange() {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const start = new Date(y, m, 1).toISOString().slice(0, 10);
  const end = new Date(y, m + 1, 0).toISOString().slice(0, 10);
  return { start, end };
}

async function getAgenciaNombre() {
  const { data } = await supabase
    .from("agencia_config")
    .select("nombre")
    .eq("id", 1)
    .maybeSingle();

  return data?.nombre || "AZP Marketing Suite";
}

async function enviarAvisoCobranza(cliente, mensajeEmail, difDias) {
  if (!resend) {
    console.log("RESEND_API_KEY no configurada. No se envió correo.");
    return { skipped: true };
  }

  if (!cliente.email) {
    console.log(`Cliente sin email: ${cliente.nombre}`);
    return { skipped: true };
  }

  const agenciaNombre = await getAgenciaNombre();

  return resend.emails.send({
    from: process.env.RESEND_FROM || "AZP Marketing Suite <pagos@azpmarketing.org>",
    to: [cliente.email],
    subject: `Estado de Cuenta - ${cliente.nombre}`,
    html: `
      <div style="font-family:Arial,sans-serif;padding:22px;border:1px solid #e5e7eb;border-radius:12px;max-width:620px">
        <h2 style="color:#2563eb;margin:0 0 16px">Aviso de Cobranza</h2>
        <p>Hola ${cliente.contacto || cliente.nombre},</p>
        <p><strong>${mensajeEmail}</strong></p>
        <p>Por favor, envíanos tu comprobante para mantener tu servicio al día.</p>
        <hr style="border:none;border-top:1px solid #e5e7eb;margin:22px 0"/>
        <p style="color:#64748b">Atentamente,<br/><strong>${agenciaNombre}</strong></p>
        <small style="color:#94a3b8">Referencia interna: ${difDias} días respecto a corte.</small>
      </div>
    `,
  });
}

async function runCobranzaJob({ dryRun = false } = {}) {
  console.log("⏰ Iniciando escaneo de cobranza en Supabase...");

  const { data: clientes, error: errClientes } = await supabase
    .from("empresas")
    .select("*")
    .eq("tipo", "Cliente");

  if (errClientes) throw errClientes;

  const { start, end } = currentMonthRange();

  const { data: pagosDelMes, error: errPagos } = await supabase
    .from("finanzas")
    .select("empresa_id,fecha")
    .gte("fecha", start)
    .lte("fecha", end);

  if (errPagos) throw errPagos;

  const clientesPagados = new Set((pagosDelMes || []).map((p) => Number(p.empresa_id)));
  const hoy = new Date().getDate();
  const resultados = [];

  for (const cliente of clientes || []) {
    if (clientesPagados.has(Number(cliente.id))) {
      resultados.push({
        cliente: cliente.nombre,
        accion: "omitido",
        motivo: "Ya registró pago este mes",
      });
      continue;
    }

    const diaPago = Number(cliente.dia_pago || 1);
    const difDias = diaPago - hoy;
    let mensajeEmail = "";

    if (difDias === 5) {
      mensajeEmail = `Faltan 5 días para tu fecha de corte. Tu monto pendiente es de ${mx(cliente.pago_mensual)}.`;
    } else if (difDias === 3) {
      mensajeEmail = `Aviso amigable: faltan 3 días para tu corte por ${mx(cliente.pago_mensual)}.`;
    } else if (difDias === 0) {
      mensajeEmail = `Hoy es tu fecha de pago por ${mx(cliente.pago_mensual)}. Esperamos tu comprobante.`;
    } else if (difDias === -1) {
      mensajeEmail = `Tienes 1 día de atraso en tu mensualidad de ${mx(cliente.pago_mensual)}.`;
    } else if (difDias < -1) {
      mensajeEmail = `URGENTE: tienes ${Math.abs(difDias)} días de atraso. Tu monto pendiente es de ${mx(cliente.pago_mensual)}.`;
    }

    if (!mensajeEmail) {
      resultados.push({
        cliente: cliente.nombre,
        accion: "omitido",
        motivo: `No toca aviso hoy. Diferencia: ${difDias} días`,
      });
      continue;
    }

    if (dryRun) {
      resultados.push({
        cliente: cliente.nombre,
        accion: "dry_run",
        mensaje: mensajeEmail,
      });
      continue;
    }

    try {
      await enviarAvisoCobranza(cliente, mensajeEmail, difDias);
      resultados.push({
        cliente: cliente.nombre,
        accion: "email_enviado",
        email: cliente.email,
      });
      console.log(`✉️ Aviso enviado a ${cliente.email}`);
    } catch (err) {
      resultados.push({
        cliente: cliente.nombre,
        accion: "error",
        error: err.message,
      });
      console.error("❌ Error enviando correo a", cliente.email, err);
    }
  }

  return resultados;
}

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "AZP Marketing Suite Backend",
    time: new Date().toISOString(),
  });
});

app.post("/api/cobranza/run", async (req, res) => {
  try {
    const adminSecret = req.headers["x-admin-secret"];

    if (process.env.ADMIN_JOB_SECRET && adminSecret !== process.env.ADMIN_JOB_SECRET) {
      res.status(401).json({ ok: false, error: "No autorizado" });
      return;
    }

    const resultados = await runCobranzaJob({ dryRun: Boolean(req.body?.dryRun) });
    res.json({ ok: true, resultados });
  } catch (err) {
    console.error("Error en /api/cobranza/run:", err);
    res.status(500).json({ ok: false, error: err.message });
  }
});

cron.schedule(
  "0 9 * * *",
  async () => {
    try {
      await runCobranzaJob();
    } catch (err) {
      console.error("❌ Error en cron de cobranza:", err);
    }
  },
  {
    timezone: process.env.TZ || "America/Mexico_City",
  }
);

app.listen(PORT, () => {
  console.log(`🚀 Backend activo en http://localhost:${PORT}`);
});
