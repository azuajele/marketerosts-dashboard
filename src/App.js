import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "./supabaseClient";

const DEFAULT_AGENCIA = {
  id: 1,
  nombre: "Marketerosts",
  color: "#991ccc",
  logo: "",
};

const DEFAULT_ALLOWED_EMAILS = [
  "thalia@marketeros.com",
  "thalia@marketerosts.com",
  "luisazuaje@marketeros.com",
  "luis@marketeros.com",
  "palomaguionista@marketeros.com",
  "paloma@marketeros.com",
  "jarek@marketeros.com",
  "jarekeditor@marketeros.com",
];

const ALLOWED_EMAILS = (process.env.REACT_APP_ALLOWED_EMAILS || DEFAULT_ALLOWED_EMAILS.join(","))
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ADMIN_EMAILS = (process.env.REACT_APP_ADMIN_EMAILS || "thalia@marketeros.com,thalia@marketerosts.com,luisazuaje@marketeros.com,luis@marketeros.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ICONS = {
  dash: "◱",
  crm: "👥",
  cal: "📅",
  prod: "🎨",
  fin: "💰",
  rep: "📊",
  audit: "🕵️",
  config: "⚙️",
  out: "🚪",
};

const SOCIAL_OPTIONS = [
  { key: "facebook", label: "Facebook", icon: "📘", short: "fb" },
  { key: "instagram", label: "Instagram", icon: "📸", short: "ig" },
  { key: "tiktok", label: "TikTok", icon: "🎵", short: "tiktok" },
  { key: "linkedin", label: "LinkedIn", icon: "💼", short: "linkedin" },
  { key: "youtube", label: "YouTube", icon: "▶️", short: "youtube" },
];

const DEFAULT_SEGUIDORES = {
  fb: 0,
  ig: 0,
  tiktok: 0,
  linkedin: 0,
  youtube: 0,
  _activos: ["facebook", "instagram"],
};

const normalizeSeguidores = (value = {}) => {
  const base = { ...DEFAULT_SEGUIDORES, ...(value || {}) };
  const activos = Array.isArray(base._activos)
    ? base._activos
    : SOCIAL_OPTIONS.filter((opt) => Number(base[opt.short] || 0) > 0).map((opt) => opt.key);
  return { ...base, _activos: activos.length ? activos : ["facebook", "instagram"] };
};

const redesText = (redes = []) => {
  if (!Array.isArray(redes) || redes.length === 0) return "Sin redes";
  return redes.map((key) => SOCIAL_OPTIONS.find((r) => r.key === key)?.label || key).join(", ");
};

const seguidoresRedesActivas = (seguidores = {}) => {
  const normalized = normalizeSeguidores(seguidores);
  return SOCIAL_OPTIONS
    .filter((opt) => (normalized._activos || []).includes(opt.key))
    .map((opt) => ({
      ...opt,
      value: Number(normalized[opt.short] || 0),
    }));
};

const totalSeguidoresEmpresa = (seguidores = {}) =>
  seguidoresRedesActivas(seguidores).reduce((acc, item) => acc + Number(item.value || 0), 0);

const SERVICE_OPTIONS = [
  "Gestión mensual de redes sociales",
  "Diseño de Logos",
  "Diseño de Página Web",
  "Mantenimiento de Página Web",
  "Otros diseños",
];

const normalizeServicios = (value = []) => {
  if (!Array.isArray(value)) return [];
  return value.map((item, index) => {
    if (typeof item === "string") {
      return {
        id: `${Date.now()}-${index}`,
        nombre: item || "Diseño de Logos",
        descripcion: "",
        monto: 0,
        partes: 1,
        pagadas: 0,
        estado: "Pendiente",
      };
    }
    return {
      id: item?.id || `${Date.now()}-${index}`,
      nombre: item?.nombre || "Diseño de Logos",
      descripcion: item?.descripcion || "",
      monto: Number(item?.monto || 0),
      partes: Number(item?.partes || 1),
      pagadas: Number(item?.pagadas || 0),
      estado: item?.estado || "Pendiente",
    };
  });
};

const totalServiciosEmpresa = (servicios = []) =>
  normalizeServicios(servicios).reduce((acc, item) => acc + Number(item.monto || 0), 0);

const totalPendienteServicios = (servicios = []) =>
  normalizeServicios(servicios).reduce((acc, item) => {
    const partes = Math.max(Number(item.partes || 1), 1);
    const pagadas = Math.min(Number(item.pagadas || 0), partes);
    const pendiente = Number(item.monto || 0) * ((partes - pagadas) / partes);
    return acc + pendiente;
  }, 0);

const normalizePagoFechas = (value = [], partes = 1) => {
  const total = Math.min(Math.max(Number(partes || 1), 1), 3);
  const base = Array.isArray(value) ? value : [];
  const defaults = total === 1 ? [1] : total === 2 ? [1, 15] : [1, 10, 20];
  return Array.from({ length: total }, (_, i) => {
    const n = Number(base[i] ?? defaults[i] ?? 1);
    return Math.min(Math.max(n || 1, 1), 31);
  });
};

const DAYS_OF_MONTH = Array.from({ length: 31 }, (_, i) => i + 1);

const getPagoFechasText = (empresa = {}) =>
  normalizePagoFechas(empresa.pago_fechas || [empresa.dia_pago || 1], empresa.pago_partes || 1)
    .map((day, index) => `${index + 1}ª parte: día ${day}`)
    .join(" · ");

const getNextPaymentStatus = (empresa = {}, hoy = new Date().getDate()) => {
  const fechas = normalizePagoFechas(empresa.pago_fechas || [empresa.dia_pago || 1], empresa.pago_partes || 1).sort((a, b) => a - b);
  const next = fechas.find((d) => d >= hoy) || fechas[fechas.length - 1] || 1;
  const dif = next - hoy;
  return { next, dif, fechas };
};

const totalMetricas = (metricas = {}) => {
  return Object.values(metricas || {}).reduce(
    (acc, item) => {
      acc.alcance += Number(item?.alcance || 0);
      acc.interacciones += Number(item?.interacciones || 0);
      acc.comentarios += Number(item?.comentarios || 0);
      return acc;
    },
    { alcance: 0, interacciones: 0, comentarios: 0 }
  );
};

const isPastDate = (date) => Boolean(date && String(date).slice(0, 10) < today());
const isToday = (date) => String(date || "").slice(0, 10) === today();

const mx = (n) =>
  Number(n || 0).toLocaleString("es-MX", {
    style: "currency",
    currency: "MXN",
  });

const today = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};
const curMonthStr = () => today().slice(0, 7);
const cleanEmail = (email) => String(email || "").trim().toLowerCase();
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail(email));

const isAllowedUser = (email) => ALLOWED_EMAILS.includes(cleanEmail(email));
const isAdminEmail = (email) => ADMIN_EMAILS.includes(cleanEmail(email));
const isAdminRole = (user) => ["Directora", "Administrador"].includes(user?.role);
const isWriterRole = (user) => String(user?.role || "").toLowerCase().includes("guionista");
const isDesignerRole = (user) => String(user?.role || "").toLowerCase().includes("diseñador") || String(user?.role || "").toLowerCase().includes("disenador");

const getRoleByEmail = (email) => {
  const e = cleanEmail(email);
  if (e.includes("thalia")) return { name: "Thalia", role: "Directora" };
  if (e.includes("luis")) return { name: "Luis Enrique", role: "Administrador" };
  if (e.includes("paloma")) return { name: "Paloma", role: "Guionista / Editora" };
  if (e.includes("jarek")) return { name: "Jarek", role: "Diseñador / Editor" };
  return { name: e.split("@")[0] || "Usuario", role: "Colaborador" };
};

const getCachedAgencia = () => {
  try {
    const saved = localStorage.getItem("azp_agencia_config");
    return saved ? { ...DEFAULT_AGENCIA, ...JSON.parse(saved) } : DEFAULT_AGENCIA;
  } catch {
    return DEFAULT_AGENCIA;
  }
};

const safeString = (value, fallback = "") => String(value ?? fallback).trim();
const normalizeId = (value) => String(value ?? "").trim();
const sameId = (a, b) => normalizeId(a) !== "" && normalizeId(a) === normalizeId(b);
const dateOnly = (value) => String(value || "").slice(0, 10);
const hasMaterialDrive = (pub) => safeString(pub?.material_drive).length > 0;


const getInitials = (name = "Empresa") =>
  name
    .split(" ")
    .map((x) => x[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

const compressImageAndExtractColor = (file, maxSize = 420, quality = 0.75) =>
  new Promise((resolve, reject) => {
    if (!file) {
      resolve({ optimizedImage: "", color: DEFAULT_AGENCIA.color });
      return;
    }

    const reader = new FileReader();

    reader.onerror = () => reject(new Error("No se pudo leer la imagen."));

    reader.onload = () => {
      const img = new Image();

      img.onerror = () => reject(new Error("La imagen no se pudo procesar."));

      img.onload = () => {
        let { width, height } = img;

        if (width > height && width > maxSize) {
          height = Math.round(height * (maxSize / width));
          width = maxSize;
        } else if (height >= width && height > maxSize) {
          width = Math.round(width * (maxSize / height));
          height = maxSize;
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        let r = 0;
        let g = 0;
        let b = 0;
        let count = 0;

        try {
          const data = ctx.getImageData(0, 0, width, height).data;
          for (let i = 0; i < data.length; i += 64) {
            const alpha = data[i + 3];
            if (alpha < 40) continue;
            r += data[i];
            g += data[i + 1];
            b += data[i + 2];
            count += 1;
          }
        } catch {
          count = 0;
        }

        const color =
          count > 0
            ? `#${((1 << 24) + (Math.floor(r / count) << 16) + (Math.floor(g / count) << 8) + Math.floor(b / count))
                .toString(16)
                .slice(1)}`
            : DEFAULT_AGENCIA.color;

        resolve({
          optimizedImage: canvas.toDataURL("image/jpeg", quality),
          color,
        });
      };

      img.src = reader.result;
    };

    reader.readAsDataURL(file);
  });

function Modal({ title, children, onClose, width = "680px" }) {
  return (
    <div className="azp-modal-layer" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="azp-modal" style={{ maxWidth: width }}>
        <div className="azp-modal-head">
          <h3>{title}</h3>
          <button type="button" onClick={onClose}>×</button>
        </div>
        <div className="azp-modal-body">{children}</div>
      </div>
    </div>
  );
}

function Field({ label, children }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

function Badge({ children, tone = "gray" }) {
  return <span className={`badge tone-${tone}`}>{children}</span>;
}

function KpiCard({ title, value, sub, color = "purple" }) {
  return (
    <div className={`kpi color-${color}`}>
      <span>{title}</span>
      <strong>{value}</strong>
      {sub ? <small>{sub}</small> : null}
    </div>
  );
}

function LogoAvatar({ logo, name, size = 38 }) {
  if (logo) {
    return (
      <img
        className="logo-avatar"
        src={logo}
        alt={name || "Logo"}
        style={{ width: size, height: size }}
      />
    );
  }

  return (
    <div className="logo-avatar fallback" style={{ width: size, height: size }}>
      {getInitials(name)}
    </div>
  );
}

function NavBtn({ icon, label, active, onClick, count }) {
  return (
    <button className={`nav-btn ${active ? "active" : ""}`} type="button" onClick={onClick}>
      <span className="nav-icon">{icon}</span>
      <span>{label}</span>
      {count > 0 ? <em>{count}</em> : null}
    </button>
  );
}

export default function App() {
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [systemMessage, setSystemMessage] = useState("");

  const [agencia, setAgencia] = useState(getCachedAgencia);
  const [empresas, setEmpresas] = useState([]);
  const [calendario, setCalendario] = useState([]);
  const [finanzas, setFinanzas] = useState([]);
  const [accessLogs, setAccessLogs] = useState([]);

  const [modalCRM, setModalCRM] = useState(null);
  const [modalConfirmDelete, setModalConfirmDelete] = useState(null);
  const [modalPub, setModalPub] = useState(null);
  const [modalFin, setModalFin] = useState(null);
  const [modalMetricas, setModalMetricas] = useState(null);
  const [modalRechazo, setModalRechazo] = useState(null);
  const [modalConsult, setModalConsult] = useState(null);

  const fetchAgenciaPublicConfig = async () => {
    const { data, error } = await supabase
      .from("agencia_config")
      .select("id,nombre,color,logo,updated_at")
      .eq("id", 1)
      .maybeSingle();

    if (!error && data) {
      setAgencia({ ...DEFAULT_AGENCIA, ...data });
      localStorage.setItem("azp_agencia_config", JSON.stringify({ ...DEFAULT_AGENCIA, ...data }));
    }
  };

  const loadUserFromSession = (session) => {
    if (!session?.user) {
      setUser(null);
      return;
    }

    const email = cleanEmail(session.user.email);

    if (!isAllowedUser(email)) {
      setUser(null);
      setLoginError("Este panel solo está autorizado para Thalia, Luis, Paloma o Jarek.");
      supabase.auth.signOut();
      return;
    }

    const roleInfo = getRoleByEmail(email);
    setUser({ ...roleInfo, id: session.user.id, email });
  };

  useEffect(() => {
    fetchAgenciaPublicConfig();

    supabase.auth.getSession().then(({ data, error }) => {
      if (error) console.error("Error comprobando sesión:", error);
      loadUserFromSession(data?.session);
      setIsLoading(false);
    });

    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUserFromSession(session);
      setIsLoading(false);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, []);

  useEffect(() => {
    if (user) fetchCloudData();
  }, [user]);

  useEffect(() => {
    document.documentElement.style.setProperty("--c-primary", agencia.color || DEFAULT_AGENCIA.color);
  }, [agencia.color]);

  const fetchCloudData = async () => {
    setIsLoading(true);

    try {
      const admin = isAdminRole(user);

      const empRes = await supabase.from("empresas").select("*").order("fecha_inicio", { ascending: false });
      const calRes = await supabase.from("calendario").select("*").order("fecha", { ascending: true });
      const confRes = await supabase.from("agencia_config").select("*").eq("id", 1).maybeSingle();

      const finRes = admin
        ? await supabase.from("finanzas").select("*").order("fecha", { ascending: false })
        : { data: [], error: null };

      const logsRes = admin
        ? await supabase.from("auditoria_logs").select("*").order("fecha", { ascending: false }).limit(80)
        : { data: [], error: null };

      const errors = [];
      if (empRes.error) errors.push(`Empresas: ${empRes.error.message}`);
      if (calRes.error) errors.push(`Calendario: ${calRes.error.message}`);
      if (confRes.error) errors.push(`Configuración: ${confRes.error.message}`);
      if (admin && finRes.error) errors.push(`Finanzas: ${finRes.error.message}`);
      if (admin && logsRes.error) errors.push(`Auditoría: ${logsRes.error.message}`);

      if (errors.length) {
        setSystemMessage(`🚨 Hay un problema leyendo Supabase:

${errors.join("\n\n")}

Revisa que ya corriste el SQL y que tu usuario esté permitido en RLS.`);
      }

      setEmpresas(empRes.data || []);
      setFinanzas(finRes.data || []);
      setCalendario(calRes.data || []);
      setAccessLogs(logsRes.data || []);

      if (confRes.data) {
        setAgencia({ ...DEFAULT_AGENCIA, ...confRes.data });
        localStorage.setItem("azp_agencia_config", JSON.stringify({ ...DEFAULT_AGENCIA, ...confRes.data }));
      }
    } catch (error) {
      setSystemMessage(`🚨 Fallo crítico conectando a Supabase:

${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const stats = useMemo(() => {
    const pendientes = calendario.filter((c) => c.estado === "Guion Pendiente").length;
    const produccion = calendario.filter((c) => ["En Diseño", "Corrección", "Falta Material Drive"].includes(c.estado)).length;
    const revision = calendario.filter((c) => c.estado === "Diseño Concluido").length;
    const listos = calendario.filter((c) => c.estado === "Aprobado").length;
    const publicados = calendario.filter((c) => c.estado === "Publicado").length;
    const programadasMes = calendario.filter((c) => String(c.fecha || "").startsWith(curMonthStr())).length;
    const publicadasMes = calendario.filter((c) => String(c.fecha || "").startsWith(curMonthStr()) && c.estado === "Publicado").length;
    const publicacionesSinMetricas = calendario.filter((c) => c.estado === "Publicado" && !c.metricas).length;
    const guionesListosDiseno = calendario.filter((c) => c.estado === "Guion Pendiente").length;
    const faltaMaterial = calendario.filter((c) => c.estado === "Falta Material Drive").length;
    const vencidas = calendario.filter((c) => isPastDate(c.fecha) && c.estado !== "Publicado").length;
    const paraHoy = calendario.filter((c) => isToday(c.fecha) && c.estado !== "Publicado").length;
    const alertas = faltaMaterial + vencidas + paraHoy;

    return { pendientes, produccion, revision, listos, publicados, programadasMes, publicadasMes, publicacionesSinMetricas, guionesListosDiseno, faltaMaterial, vencidas, paraHoy, alertas };
  }, [calendario]);

  const getEmpresa = (id) => empresas.find((e) => sameId(e.id, id)) || null;

  const handleLogin = async ({ email, password }) => {
    setIsLoading(true);
    setLoginError("");

    const emailClean = cleanEmail(email);

    if (!isAllowedUser(emailClean)) {
      setLoginError("Acceso bloqueado. Este panel solo está autorizado para Thalia, Luis, Paloma o Jarek.");
      setIsLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: emailClean,
        password,
      });

      if (error) {
        setLoginError(`Acceso denegado: ${error.message}`);
        return;
      }

      if (data?.user) {
        const roleInfo = getRoleByEmail(data.user.email);

        await supabase.from("auditoria_logs").insert([
          {
            usuario: roleInfo.name,
            role: roleInfo.role,
            dispositivo: navigator.userAgent.slice(0, 90),
            ip: "Autenticado con Supabase",
          },
        ]);
      }
    } catch (err) {
      setLoginError(`Fallo de conexión: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setTab("dashboard");
  };

  const saveAgenciaConfig = async (nuevaConfig) => {
    setIsLoading(true);

    const payload = {
      id: 1,
      nombre: safeString(nuevaConfig.nombre, DEFAULT_AGENCIA.nombre) || DEFAULT_AGENCIA.nombre,
      color: safeString(nuevaConfig.color, DEFAULT_AGENCIA.color) || DEFAULT_AGENCIA.color,
      logo: nuevaConfig.logo || "",
      updated_at: new Date().toISOString(),
    };

    try {
      const { data, error } = await supabase
        .from("agencia_config")
        .upsert(payload, { onConflict: "id" })
        .select()
        .single();

      if (error) {
        setSystemMessage(`🚨 Error guardando configuración:\n\n${error.message}`);
      } else {
        const nextConfig = { ...DEFAULT_AGENCIA, ...data };
        setAgencia(nextConfig);
        localStorage.setItem("azp_agencia_config", JSON.stringify(nextConfig));
        setSystemMessage("✓ Configuración de agencia guardada correctamente.");
      }
    } catch (err) {
      setSystemMessage(`🚨 Error inesperado guardando configuración:\n\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const saveEmpresa = async (data) => {
    setIsLoading(true);

    const payload = {
      nombre: safeString(data.nombre),
      tipo: data.tipo === "Prospecto" ? "Prospecto" : "Cliente",
      contacto: safeString(data.contacto),
      email: safeString(data.email).toLowerCase(),
      telefono: safeString(data.telefono),
      pago_mensual: Number(data.pago_mensual || 0),
      dia_pago: Number(data.dia_pago || 1),
      cuota_mensual: Number(data.cuota_mensual || 12),
      pago_partes: Number(data.pago_partes || 1),
      pago_fechas: normalizePagoFechas(data.pago_fechas, Number(data.pago_partes || 1)),
      fecha_inicio: data.fecha_inicio || today(),
      logo: data.logo || "",
      seguidores: normalizeSeguidores(data.seguidores),
      servicios: normalizeServicios(data.servicios),
    };

    if (!payload.nombre) {
      setSystemMessage("🚨 Escribe el nombre de la empresa antes de guardar.");
      setIsLoading(false);
      return;
    }

    if (!payload.email || !isValidEmail(payload.email)) {
      setSystemMessage("🚨 El correo de cobranza es obligatorio y debe ser válido. Ahí llegarán avisos de pago y recordatorios automáticos.");
      setIsLoading(false);
      return;
    }

    try {
      const response = data.id
        ? await supabase.from("empresas").update(payload).eq("id", data.id).select().single()
        : await supabase.from("empresas").insert([payload]).select().single();

      if (response.error) {
        setSystemMessage(`🚨 ERROR AL GUARDAR EMPRESA:\n\n${response.error.message}`);
      } else {
        setSystemMessage("✓ Empresa guardada correctamente.");
        setModalCRM(null);
        await fetchCloudData();
      }
    } catch (err) {
      setSystemMessage(`🚨 Error inesperado al guardar empresa:\n\n${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteEmpresa = async (id) => {
    setIsLoading(true);

    const { error } = await supabase.from("empresas").delete().eq("id", id);

    if (error) {
      setSystemMessage(`🚨 No se pudo eliminar la empresa:\n\n${error.message}`);
    } else {
      setSystemMessage("✓ Empresa eliminada.");
      await fetchCloudData();
    }

    setModalConfirmDelete(null);
    setIsLoading(false);
  };

  const savePub = async (data) => {
    if (!data.empresa_id) {
      setSystemMessage("🚨 Primero registra una empresa para poder crear una publicación.");
      return;
    }

    const admin = isAdminRole(user);
    const isNew = !data.id;
    const estadoSeguro = admin
      ? (data.estado || "Guion Pendiente")
      : (isNew ? "Guion Pendiente" : data.estado || "Guion Pendiente");

    const redes = Array.isArray(data.redes) ? data.redes : [];

    if (redes.length === 0) {
      setSystemMessage("🚨 Selecciona al menos una red social para esta publicación.");
      return;
    }

    const selectedEmpresa = empresas.find((e) => sameId(e.id, data.empresa_id));

    const payload = {
      empresa_id: normalizeId(data.empresa_id),
      empresa_nombre: selectedEmpresa?.nombre || data.empresa_nombre || "",
      fecha: dateOnly(data.fecha) || today(),
      redes,
      formato: data.formato || "Reel",
      tema: safeString(data.tema),
      copy: data.copy || "",
      objetivo: data.objetivo || "",
      material_drive: safeString(data.material_drive),
      prioridad: data.prioridad || "Media",
      notas_internas: data.notas_internas || "",
      estado: estadoSeguro,
      notas: data.notas || "",
      creado_por: data.creado_por || user.name,
      disenado_por: data.disenado_por || "",
      aprobado_por: data.aprobado_por || "",
      publicado_por: data.publicado_por || "",
      metricas: data.metricas || null,
    };

    const response = data.id
      ? await supabase.from("calendario").update(payload).eq("id", data.id).select().single()
      : await supabase.from("calendario").insert([payload]).select().single();

    if (response.error) {
      setSystemMessage(`🚨 ERROR AL GUARDAR PUBLICACIÓN:

${response.error.message}`);
    } else {
      setModalPub(null);
      await fetchCloudData();
    }
  };

  const saveFinanza = async (data) => {
    if (!data.empresa_id) {
      setSystemMessage("🚨 Primero registra una empresa para poder registrar un pago.");
      return;
    }

    const payload = {
      empresa_id: normalizeId(data.empresa_id),
      fecha: dateOnly(data.fecha) || today(),
      tipo_ingreso: data.tipo_ingreso || "Redes",
      servicio_nombre: data.servicio_nombre || "",
      pago: Number(data.pago || 0),
      gas: Number(data.gas || 0),
      paloma: Number(data.paloma || 0),
      jarek: Number(data.jarek || 0),
      luis: Number(data.luis || 0),
      thalia: Number(data.thalia || 0),
    };

    const response = data.id
      ? await supabase.from("finanzas").update(payload).eq("id", data.id).select().single()
      : await supabase.from("finanzas").insert([payload]).select().single();

    if (response.error) {
      setSystemMessage(`🚨 ERROR AL GUARDAR FINANZA:\n\n${response.error.message}`);
    } else {
      setModalFin(null);
      await fetchCloudData();
    }
  };

  const updatePubState = async (id, estado, extra = {}) => {
    const admin = isAdminRole(user);
    const writer = isWriterRole(user);
    const designer = isDesignerRole(user);

    const current = calendario.find((p) => sameId(p.id, id));
    const requiereAdmin = ["Aprobado", "Publicado", "Corrección"].includes(estado);
    const requiereDiseno = ["En Diseño", "Falta Material Drive", "Diseño Concluido"].includes(estado);

    if (current?.estado === "Falta Material Drive" && ["En Diseño", "Diseño Concluido"].includes(estado)) {
      setSystemMessage("🚨 Esta publicación está bloqueada por falta de material en Drive. Primero Thalia, Luis o Paloma deben resolver el material y regresarla a Guion Pendiente.");
      return;
    }

    if (estado === "En Diseño" && !hasMaterialDrive(current)) {
      setSystemMessage("🚨 No se puede pasar a diseño porque no hay link/material de Drive registrado. Marca 'Sin material' para que Thalia y Luis reciban la alerta.");
      return;
    }

    if (requiereAdmin && !admin) {
      setSystemMessage("🚨 Solo Thalia o Luis pueden aprobar, rechazar o marcar una publicación como publicada.");
      return;
    }

    if (requiereDiseno && !(admin || designer)) {
      setSystemMessage("🚨 Solo Jarek, Thalia o Luis pueden mover una publicación en producción/diseño.");
      return;
    }

    const payload = { estado, ...extra };
    if (estado === "Falta Material Drive") payload.material_drive = "";

    if (["En Diseño", "Corrección", "Diseño Concluido"].includes(estado)) payload.disenado_por = user.name;
    if (estado === "Aprobado") payload.aprobado_por = user.name;
    if (estado === "Publicado") payload.publicado_por = user.name;

    const { error } = await supabase.from("calendario").update(payload).eq("id", id);

    if (error) {
      setSystemMessage(`🚨 Error al cambiar estado:

${error.message}`);
    } else {
      await fetchCloudData();
    }
  };

  const saveMetricas = async (id, metricas) => {
    if (!(isAdminRole(user) || isWriterRole(user))) {
      setSystemMessage("🚨 Solo Paloma, Thalia o Luis pueden capturar métricas.");
      return;
    }

    const { error } = await supabase
      .from("calendario")
      .update({ metricas, metricas_capturadas_por: user.name })
      .eq("id", id);

    if (error) {
      setSystemMessage(`🚨 Error guardando métricas:

${error.message}`);
    } else {
      setModalMetricas(null);
      await fetchCloudData();
    }
  };


  useEffect(() => {
    if (user && !isAdminRole(user) && ["crm", "finanzas", "reportes", "auditoria", "configuracion"].includes(tab)) {
      setTab("dashboard");
    }
  }, [user, tab]);

  if (!user) {
    return (
      <>
        <style>{CSS}</style>
        <LoginScreen onLogin={handleLogin} error={loginError} agencia={agencia} isLoading={isLoading} />
      </>
    );
  }

  const canAdmin = isAdminRole(user);
  const canCreatePauta = canAdmin || isWriterRole(user);

  return (
    <div className="app-shell">
      <style>{CSS}</style>

      <aside className={`sidebar ${sidebarOpen ? "" : "collapsed"}`}>
        <div className="brand">
          <LogoAvatar logo={agencia.logo} name={agencia.nombre} size={42} />
          <div>
            <strong>{agencia.nombre}</strong>
            <span>AZP Suite</span>
          </div>
        </div>

        <div className="profile">
          <div className="avatar">{user.name[0]}</div>
          <div>
            <strong>{user.name}</strong>
            <span>{user.role}</span>
          </div>
        </div>

        <nav>
          <small>Principal</small>
          <NavBtn icon={ICONS.dash} label="Dashboard" active={tab === "dashboard"} onClick={() => setTab("dashboard")} />
          <NavBtn icon={ICONS.cal} label="Calendario Visual" active={tab === "calendario"} onClick={() => setTab("calendario")} />
          <NavBtn icon={ICONS.prod} label="Flujo de Producción" active={tab === "produccion"} onClick={() => setTab("produccion")} count={stats.alertas} />

          {canAdmin ? (
            <>
              <small>Administración</small>
              <NavBtn icon={ICONS.crm} label="Directorio CRM" active={tab === "crm"} onClick={() => setTab("crm")} />
              <NavBtn icon={ICONS.fin} label="Control Financiero" active={tab === "finanzas"} onClick={() => setTab("finanzas")} />
              <NavBtn icon={ICONS.rep} label="Reportes PDF" active={tab === "reportes"} onClick={() => setTab("reportes")} />
              <NavBtn icon={ICONS.audit} label="Auditoría" active={tab === "auditoria"} onClick={() => setTab("auditoria")} />

              <small>Sistema</small>
              <NavBtn icon={ICONS.config} label="Configuración" active={tab === "configuracion"} onClick={() => setTab("configuracion")} />
            </>
          ) : null}
        </nav>

        <button className="logout" type="button" onClick={handleLogout}>
          {ICONS.out} Cerrar sesión
        </button>
      </aside>

      <main className="main">
        <header className="topbar">
          <button className="icon-btn" type="button" onClick={() => setSidebarOpen((v) => !v)}>☰</button>
          <div>
            <h2>{tab.toUpperCase()}</h2>
            <p>{agencia.nombre} - Nube Activa</p>
          </div>
          <div className="topbar-actions">
            {isLoading ? <span className="sync">☁️ Sincronizando...</span> : null}
            {canCreatePauta ? <button className="btn primary" type="button" onClick={() => setModalPub({})}>+ Nueva Publicación</button> : null}
          </div>
        </header>

        <section className="content">
          {tab === "dashboard" && <DashboardView user={user} stats={stats} empresas={empresas} calendario={calendario} />}
          {tab === "crm" && canAdmin && (
            <CRMView
              empresas={empresas}
              calendario={calendario}
              setModalCRM={setModalCRM}
              setModalConsult={setModalConsult}
              setModalConfirmDelete={setModalConfirmDelete}
            />
          )}
          {tab === "calendario" && <CalendarioView calendario={calendario} getEmpresa={getEmpresa} setModalPub={setModalPub} />}
          {tab === "produccion" && (
            <ProduccionView
              calendario={calendario}
              getEmpresa={getEmpresa}
              updatePubState={updatePubState}
              setModalPub={setModalPub}
              setModalRechazo={setModalRechazo}
              setModalMetricas={setModalMetricas}
              user={user}
            />
          )}
          {tab === "finanzas" && canAdmin && <FinanzasView finanzas={finanzas} empresas={empresas} setModalFin={setModalFin} agencia={agencia} getEmpresa={getEmpresa} />}
          {tab === "reportes" && canAdmin && <ReportesView empresas={empresas} calendario={calendario} getEmpresa={getEmpresa} agencia={agencia} />}
          {tab === "auditoria" && canAdmin && <AuditoriaView accessLogs={accessLogs} />}
          {tab === "configuracion" && canAdmin && <ConfiguracionAgencia agencia={agencia} onSave={saveAgenciaConfig} />}
        </section>
      </main>

      {systemMessage ? (
        <Modal title="Atención del Sistema" onClose={() => setSystemMessage("")}>
          <pre className="message">{systemMessage}</pre>
          <button className="btn primary full" type="button" onClick={() => setSystemMessage("")}>Entendido</button>
        </Modal>
      ) : null}

      {modalConfirmDelete ? (
        <Modal title="Confirmar eliminación" onClose={() => setModalConfirmDelete(null)}>
          <p>¿Seguro que deseas eliminar a <strong>{modalConfirmDelete.nombre}</strong>?</p>
          <p className="muted mt">También se eliminarán sus publicaciones y finanzas si corriste el SQL con <strong>ON DELETE CASCADE</strong>.</p>
          <div className="actions two">
            <button className="btn secondary" type="button" onClick={() => setModalConfirmDelete(null)}>Cancelar</button>
            <button className="btn danger" type="button" onClick={() => deleteEmpresa(modalConfirmDelete.id)}>Eliminar</button>
          </div>
        </Modal>
      ) : null}

      {modalCRM !== null ? <ModalCRM initial={modalCRM} onSave={saveEmpresa} onClose={() => setModalCRM(null)} /> : null}
      {modalPub !== null ? <ModalPub initial={modalPub} empresas={empresas} onSave={savePub} onClose={() => setModalPub(null)} user={user} /> : null}
      {modalFin !== null ? <ModalFinanza initial={modalFin} empresas={empresas} onSave={saveFinanza} onClose={() => setModalFin(null)} /> : null}
      {modalMetricas ? (
        <ModalMetricas
          pub={modalMetricas}
          onSave={saveMetricas}
          onClose={() => setModalMetricas(null)}
        />
      ) : null}
      {modalConsult ? <ModalHistorial empresa={modalConsult} calendario={calendario} onClose={() => setModalConsult(null)} /> : null}

      {modalRechazo ? (
        <Modal title="Rechazar y enviar a corrección" onClose={() => setModalRechazo(null)}>
          <RechazoForm
            onCancel={() => setModalRechazo(null)}
            onSave={(notas) => {
              updatePubState(modalRechazo, "Corrección", { notas });
              setModalRechazo(null);
            }}
          />
        </Modal>
      ) : null}
    </div>
  );
}

function DashboardView({ user, stats, empresas, calendario }) {
  const publicacionesMes = calendario.filter((p) => String(p.fecha || "").startsWith(curMonthStr())).length;
  const empresasActivas = empresas.filter((e) => e.tipo !== "Prospecto").length;
  const writer = isWriterRole(user);
  const designer = isDesignerRole(user);
  const admin = isAdminRole(user);
  const guionesPendientes = calendario.filter((p) => p.estado === "Guion Pendiente").slice(0, 8);
  const publicacionesSinMetricas = calendario.filter((p) => p.estado === "Publicado" && !p.metricas).slice(0, 8);
  const publicacionesHoy = calendario.filter((p) => isToday(p.fecha) && p.estado !== "Publicado").slice(0, 8);
  const publicacionesVencidas = calendario.filter((p) => isPastDate(p.fecha) && p.estado !== "Publicado").slice(0, 8);
  const faltanMaterial = calendario.filter((p) => p.estado === "Falta Material Drive").slice(0, 8);

  return (
    <div className="fade">
      <div className="welcome">
        <h1>Hola, {user.name}</h1>
        <p>Resumen operativo. Rol: <strong>{user.role}</strong></p>
      </div>

      {admin && (stats.paraHoy > 0 || stats.vencidas > 0 || stats.faltaMaterial > 0) ? (
        <div className="alert-grid">
          {stats.paraHoy > 0 ? (
            <div className="ops-alert today"><strong>📅 Toca hoy:</strong> {stats.paraHoy} publicación(es) programada(s) para hoy aún no están publicadas.</div>
          ) : null}
          {stats.vencidas > 0 ? (
            <div className="ops-alert danger"><strong>🚨 Atrasadas:</strong> {stats.vencidas} publicación(es) no cumplieron el calendario.</div>
          ) : null}
          {stats.faltaMaterial > 0 ? (
            <div className="ops-alert amber"><strong>📁 Falta material:</strong> {stats.faltaMaterial} publicación(es) bloqueadas por falta de material en Drive.</div>
          ) : null}
        </div>
      ) : null}

      {writer && stats.publicacionesSinMetricas > 0 ? (
        <div className="role-alert purple">
          <strong>📊 Métricas pendientes:</strong> hay {stats.publicacionesSinMetricas} publicación(es) ya publicadas esperando estadísticas por red social.
        </div>
      ) : null}

      {designer && stats.guionesListosDiseno > 0 ? (
        <div className="role-alert blue">
          <strong>🎨 Guiones listos para diseño:</strong> tienes {stats.guionesListosDiseno} publicación(es) con guion creado. Revisa quién lo creó y si hay material en Drive.
        </div>
      ) : null}

      <div className="kpi-grid">
        <KpiCard title={admin ? "Empresas activas" : "Clientes visibles"} value={empresasActivas} color="slate" />
        <KpiCard title="Publicaciones programadas mes" value={stats.programadasMes} sub={`${stats.publicadasMes} publicadas`} color="green" />
        <KpiCard title="En producción" value={stats.produccion} color="blue" />
        <KpiCard title="Alertas operativas" value={stats.alertas} color="purple" />
      </div>

      {admin ? (
        <div className="dashboard-panels mt">
          <div className="card">
            <div className="card-head"><h3>Agenda crítica de hoy</h3><p>Lo que Thalia y Luis deben vigilar para cumplir calendario.</p></div>
            <div className="mini-list">
              {publicacionesHoy.map((p) => (<AlertMiniRow key={p.id} p={p} tone="amber" label="Toca hoy" />))}
              {publicacionesHoy.length === 0 ? <div className="empty">No hay pendientes para hoy.</div> : null}
            </div>
          </div>
          <div className="card">
            <div className="card-head"><h3>Bloqueos y atrasos</h3><p>Falta de material o publicaciones que no se cumplieron.</p></div>
            <div className="mini-list">
              {faltanMaterial.map((p) => (<AlertMiniRow key={`m-${p.id}`} p={p} tone="red" label="Falta material" />))}
              {publicacionesVencidas.map((p) => (<AlertMiniRow key={`v-${p.id}`} p={p} tone="red" label="Atrasada" />))}
              {faltanMaterial.length + publicacionesVencidas.length === 0 ? <div className="empty">Sin bloqueos ni atrasos.</div> : null}
            </div>
          </div>
        </div>
      ) : null}

      {designer ? (
        <div className="card mt">
          <div className="card-head"><h3>Guiones listos para diseñar</h3><p>Aparece quién creó cada guion y si ya hay material.</p></div>
          <div className="mini-list">
            {guionesPendientes.map((p) => (
              <div key={p.id} className="mini-row">
                <div><strong>{p.tema || "Sin tema"}</strong><span>{p.fecha} · {redesText(p.redes)} · Creado por: {p.creado_por || "Sin registro"}</span></div>
                <Badge tone={p.material_drive ? "purple" : "red"}>{p.material_drive ? "Listo para diseño" : "Sin Drive"}</Badge>
              </div>
            ))}
            {guionesPendientes.length === 0 ? <div className="empty">No hay guiones pendientes para diseño.</div> : null}
          </div>
        </div>
      ) : null}

      {writer ? (
        <div className="card mt">
          <div className="card-head"><h3>Publicaciones sin estadísticas</h3><p>Captura métricas por Facebook, Instagram, TikTok y LinkedIn.</p></div>
          <div className="mini-list">
            {publicacionesSinMetricas.map((p) => (
              <div key={p.id} className="mini-row">
                <div><strong>{p.tema || "Sin tema"}</strong><span>{p.fecha} · {redesText(p.redes)} · Publicó: {p.publicado_por || "Sin registro"}</span></div>
                <Badge tone="green">Faltan métricas</Badge>
              </div>
            ))}
            {publicacionesSinMetricas.length === 0 ? <div className="empty">No tienes métricas pendientes.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AlertMiniRow({ p, tone, label }) {
  return (
    <div className="mini-row">
      <div>
        <strong>{p.tema || "Sin tema"}</strong>
        <span>{p.fecha} · {p.formato} · {redesText(p.redes)} · Creó: {p.creado_por || "Sin registro"}</span>
      </div>
      <Badge tone={tone}>{label}</Badge>
    </div>
  );
}

function CRMView({ empresas, calendario, setModalCRM, setModalConsult, setModalConfirmDelete }) {
  const [subTab, setSubTab] = useState("Clientes");

  const filtered = empresas.filter((e) => {
    const tipo = e.tipo === "Prospecto" ? "Prospecto" : "Cliente";
    return tipo === (subTab === "Clientes" ? "Cliente" : "Prospecto");
  });

  return (
    <div className="card fade">
      <div className="card-head row">
        <div className="tabs">
          <button className={subTab === "Clientes" ? "active" : ""} onClick={() => setSubTab("Clientes")} type="button">Clientes Activos</button>
          <button className={subTab === "Prospectos" ? "active" : ""} onClick={() => setSubTab("Prospectos")} type="button">Prospectos</button>
        </div>
        <button className="btn primary" type="button" onClick={() => setModalCRM({})}>+ Agregar Empresa</button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Empresa</th>
              <th>Mensualidad</th>
              {subTab === "Clientes" ? <th>Avance entregables</th> : null}
              <th>Contacto</th>
              <th>Seguidores</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((emp) => {
              const pubsMes = calendario.filter((c) => sameId(c.empresa_id, emp.id) && String(c.fecha || "").startsWith(curMonthStr())).length;
              const cuota = Number(emp.cuota_mensual || 12);
              const pct = Math.min((pubsMes / cuota) * 100, 100);

              return (
                <tr key={emp.id}>
                  <td>
                    <div className="company-cell">
                      <LogoAvatar logo={emp.logo} name={emp.nombre} size={40} />
                      <div>
                        <strong>{emp.nombre}</strong>
                        <span>Ingreso: {emp.fecha_inicio || "-"}</span>
                      </div>
                    </div>
                  </td>
                  <td><strong>{mx(emp.pago_mensual)}</strong></td>
                  {subTab === "Clientes" ? (
                    <td>
                      <div className="progress-label">
                        <span>{pubsMes} de {cuota}</span>
                        <span>{Math.round(pct)}%</span>
                      </div>
                      <div className="progress"><i style={{ width: `${pct}%` }} /></div>
                    </td>
                  ) : null}
                  <td>
                    {emp.contacto || "Sin asignar"}
                    <span>{emp.email || emp.telefono || ""}</span>
                  </td>
                  <td>
                    <div className="company-network-stack">
                      <div className="network-total-pill">
                        <strong>{totalSeguidoresEmpresa(emp.seguidores).toLocaleString("es-MX")}</strong>
                        <span>comunidad total</span>
                      </div>
                      <div className="followers-mini-list premium">
                        {seguidoresRedesActivas(emp.seguidores).map((opt) => (
                          <span key={opt.key} title={opt.label}>{opt.icon} {opt.value.toLocaleString("es-MX")}</span>
                        ))}
                      </div>
                    </div>
                  </td>
                  <td>
                    <div className="table-actions">
                      {subTab === "Clientes" ? <button type="button" onClick={() => setModalConsult(emp)}>📊</button> : null}
                      <button type="button" onClick={() => setModalCRM(emp)}>✏️</button>
                      <button type="button" onClick={() => setModalConfirmDelete(emp)}>🗑️</button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={subTab === "Clientes" ? 6 : 5} className="empty-cell">Aún no hay registros aquí en la Nube.</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function CalendarioView({ calendario, getEmpresa, setModalPub }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells });

  return (
    <div className="card fade">
      <div className="card-head">
        <h3>Calendario Editorial</h3>
        <p>Haz clic en cualquier publicación para editarla.</p>
      </div>

      <div className="calendar">
        {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => <b key={d}>{d}</b>)}

        {cells.map((_, idx) => {
          const day = idx - firstDay + 1;
          const valid = day >= 1 && day <= daysInMonth;
          const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const items = valid ? calendario.filter((p) => dateOnly(p.fecha) === dateStr) : [];

          return (
            <div className={`day ${valid ? "" : "off"}`} key={idx}>
              {valid ? <span className="day-num">{day}</span> : null}
              {items.map((p) => {
                const emp = getEmpresa(p.empresa_id);
                const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";

                return (
                  <button className={`event ${toneForState(p.estado)}`} type="button" key={p.id} onClick={() => setModalPub(p)}>
                    <strong>{empresaNombre}</strong>
                    <small>{p.formato}</small>
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ProduccionView({ calendario, getEmpresa, updatePubState, setModalPub, setModalRechazo, setModalMetricas, user }) {
  const admin = isAdminRole(user);
  const writer = isWriterRole(user);
  const designer = isDesignerRole(user);
  const columns = [
    { title: "Guiones Pendientes", states: ["Guion Pendiente"] },
    { title: "Bloqueados / Diseño", states: ["Falta Material Drive", "En Diseño", "Corrección"] },
    { title: "Para Revisión", states: ["Diseño Concluido"] },
    { title: "Aprobados / Publicados", states: ["Aprobado", "Publicado"] },
  ];

  return (
    <div className="kanban fade">
      {columns.map((col) => {
        const items = calendario.filter((p) => col.states.includes(p.estado));
        return (
          <section className="kanban-col" key={col.title}>
            <h3>{col.title} <Badge>{items.length}</Badge></h3>
            <div className="kanban-stack">
              {items.map((p) => {
                const emp = getEmpresa(p.empresa_id);
                const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
                const materialOk = hasMaterialDrive(p);
                const blocked = p.estado === "Falta Material Drive";
                return (
                  <article className={`task ${p.estado === "Publicado" ? "done" : ""} ${blocked ? "blocked" : ""}`} key={p.id}>
                    <div className="task-top"><strong>{empresaNombre}</strong><Badge tone={toneForState(p.estado)}>{p.estado}</Badge></div>
                    <p className="task-title">{p.tema || "Sin tema"}</p>
                    <small>{p.fecha} · {p.formato} · {redesText(p.redes)}</small>
                    <div className="task-meta">
                      <span>🎯 {p.objetivo || "Sin objetivo"}</span>
                      <span>🚦 Prioridad: {p.prioridad || "Media"}</span>
                      <span className={materialOk ? "ok" : "bad"}>📁 {materialOk ? "Material Drive cargado" : "Sin material Drive"}</span>
                    </div>
                    <div className="digital-footprint">
                      <span>✍️ Creado por: {p.creado_por || "Sin registro"}</span>
                      {p.disenado_por ? <span>🎨 Diseño: {p.disenado_por}</span> : null}
                      {p.aprobado_por ? <span>✅ Aprobó: {p.aprobado_por}</span> : null}
                      {p.publicado_por ? <span>🚀 Publicó: {p.publicado_por}</span> : null}
                      {p.metricas_capturadas_por ? <span>📊 Métricas: {p.metricas_capturadas_por}</span> : null}
                    </div>
                    {p.notas ? <div className="note">Nota: {p.notas}</div> : null}
                    {blocked ? <div className="note danger-note">Bloqueada: no puede pasar a diseño hasta resolver material.</div> : null}

                    <div className="task-actions">
                      <button type="button" onClick={() => setModalPub(p)}>Ver / Editar</button>

                      {designer && p.estado === "Guion Pendiente" && materialOk ? (
                        <button type="button" onClick={() => updatePubState(p.id, "En Diseño")}>Tomar diseño</button>
                      ) : null}

                      {designer && p.estado === "Guion Pendiente" && !materialOk ? (
                        <button type="button" onClick={() => updatePubState(p.id, "Falta Material Drive", { notas: "Jarek reportó que no hay material suficiente en Drive.", material_drive: "" })}>Reportar sin material</button>
                      ) : null}

                      {designer && ["En Diseño", "Corrección"].includes(p.estado) ? (
                        <button type="button" onClick={() => updatePubState(p.id, "Diseño Concluido")}>Entregar diseño</button>
                      ) : null}

                      {(admin || writer) && p.estado === "Falta Material Drive" ? (
                        <button type="button" onClick={() => updatePubState(p.id, "Guion Pendiente", { notas: "Material revisado / listo para diseño." })}>Material resuelto</button>
                      ) : null}

                      {admin && p.estado === "Diseño Concluido" ? (
                        <>
                          <button type="button" onClick={() => updatePubState(p.id, "Aprobado")}>Aprobar</button>
                          <button type="button" onClick={() => setModalRechazo(p.id)}>Rechazar</button>
                        </>
                      ) : null}

                      {admin && p.estado === "Aprobado" ? (
                        <button type="button" onClick={() => updatePubState(p.id, "Publicado")}>Marcar publicado</button>
                      ) : null}

                      {(admin || writer) && p.estado === "Publicado" ? (
                        <button type="button" onClick={() => setModalMetricas(p)}>{p.metricas ? "Editar métricas" : "Capturar métricas"}</button>
                      ) : null}
                    </div>
                  </article>
                );
              })}
              {items.length === 0 ? <div className="empty">Sin elementos.</div> : null}
            </div>
          </section>
        );
      })}
    </div>
  );
}

function FinanzasView({ finanzas, empresas, setModalFin, agencia, getEmpresa }) {
  const [subTab, setSubTab] = useState("Cobranza");
  const hoy = new Date().getDate();
  const registrosMes = finanzas.filter((f) => String(f.fecha || "").startsWith(curMonthStr()));
  const pagaron = new Set(registrosMes.map((f) => normalizeId(f.empresa_id)));
  const clientes = empresas.filter((e) => e.tipo !== "Prospecto");

  const totals = registrosMes.reduce(
    (acc, f) => {
      acc.pago += Number(f.pago || 0);
      acc.gas += Number(f.gas || 0);
      acc.paloma += Number(f.paloma || 0);
      acc.jarek += Number(f.jarek || 0);
      acc.luis += Number(f.luis || 0);
      acc.thalia += Number(f.thalia || 0);
      return acc;
    },
    { pago: 0, gas: 0, paloma: 0, jarek: 0, luis: 0, thalia: 0 }
  );

  const enviarWhatsApp = (cliente) => {
    const phone = String(cliente.telefono || "").replace(/\D/g, "");
    if (!phone) return alert("Este cliente no tiene teléfono.");
    const texto = `Hola ${cliente.contacto || cliente.nombre}, de ${agencia.nombre}. Te recordamos tu pago por ${mx(cliente.pago_mensual)}. Calendario de pago: ${getPagoFechasText(cliente)}. Quedamos atentos a tu comprobante.`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(texto)}`, "_blank");
  };

  return (
    <div className="fade">
      <div className="tabs mb">
        <button className={subTab === "Cobranza" ? "active" : ""} onClick={() => setSubTab("Cobranza")} type="button">Cobranza y Avisos</button>
        <button className={subTab === "Registro" ? "active" : ""} onClick={() => setSubTab("Registro")} type="button">Ingresos y Nómina</button>
      </div>

      {subTab === "Registro" ? (
        <>
          <div className="kpi-grid">
            <KpiCard title="Ingreso Bruto" value={mx(totals.pago)} color="green" />
            <KpiCard title="Comisiones Jarek" value={mx(totals.jarek)} color="slate" />
            <KpiCard title="Comisiones Paloma" value={mx(totals.paloma)} color="slate" />
            <KpiCard title="Neto Agencia" value={mx(totals.luis + totals.thalia)} color="blue" />
          </div>

          <div className="card mt">
            <div className="card-head row">
              <div>
                <h3>Ingresos del Mes</h3>
                <p>Registros financieros de {curMonthStr()}.</p>
              </div>
              <button className="btn primary" type="button" onClick={() => setModalFin({})}>+ Registrar Pago</button>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Fecha</th><th>Cliente</th><th>Tipo</th><th>Servicio</th><th>Bruto</th><th>Gas</th><th>Paloma</th><th>Jarek</th><th>Luis</th><th>Thalia</th>
                  </tr>
                </thead>
                <tbody>
                  {registrosMes.map((f) => (
                    <tr key={f.id}>
                      <td>{f.fecha}</td>
                      <td><strong>{getEmpresa(f.empresa_id)?.nombre || "-"}</strong></td>
                      <td><Badge tone={f.tipo_ingreso === "Servicio" ? "purple" : "green"}>{f.tipo_ingreso || "Redes"}</Badge></td>
                      <td>{f.servicio_nombre || "-"}</td>
                      <td>{mx(f.pago)}</td>
                      <td>{mx(f.gas)}</td>
                      <td>{mx(f.paloma)}</td>
                      <td>{mx(f.jarek)}</td>
                      <td>{mx(f.luis)}</td>
                      <td>{mx(f.thalia)}</td>
                    </tr>
                  ))}
                  {registrosMes.length === 0 ? <tr><td colSpan="10" className="empty-cell">Aún no hay registros este mes.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="card">
          <div className="card-head">
            <h3>Panel de Cobranza</h3>
            <p>Clientes pendientes de pago en el mes actual.</p>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Cliente</th><th>Monto</th><th>Fechas de pago</th><th>Próximo vencimiento</th><th>Estatus</th><th>Acciones</th></tr>
              </thead>
              <tbody>
                {clientes.filter((e) => !pagaron.has(normalizeId(e.id))).map((e) => {
                  const status = getNextPaymentStatus(e, hoy);
                  const dif = status.dif;
                  return (
                    <tr key={e.id}>
                      <td><strong>{e.nombre}</strong><span>{e.email || "Sin email"}</span></td>
                      <td>{mx(e.pago_mensual)}</td>
                      <td><span>{getPagoFechasText(e)}</span></td>
                      <td>Día {status.next}</td>
                      <td>{dif < 0 ? <Badge tone="red">Atrasado {Math.abs(dif)} días</Badge> : dif <= 5 ? <Badge tone="amber">Próximo</Badge> : <Badge>A tiempo</Badge>}</td>
                      <td><button className="btn small green" type="button" onClick={() => enviarWhatsApp(e)}>WhatsApp</button></td>
                    </tr>
                  );
                })}
                {clientes.length === 0 ? <tr><td colSpan="6" className="empty-cell">Aún no hay clientes.</td></tr> : null}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

function ReportesView({ empresas, calendario, getEmpresa, agencia }) {
  const clientes = empresas.filter((e) => e.tipo !== "Prospecto");
  const [reportEmp, setReportEmp] = useState("__all");
  const now = new Date();
  const [startDate, setStartDate] = useState(new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10));

  useEffect(() => {
    if (!reportEmp) setReportEmp("__all");
  }, [reportEmp]);

  const reportAll = reportEmp === "__all";
  const emp = reportAll ? null : getEmpresa(reportEmp);
  const items = calendario.filter((p) => {
    const fecha = dateOnly(p.fecha);
    const inRange = fecha >= startDate && fecha <= endDate;
    const matchEmpresa = reportAll || sameId(p.empresa_id, reportEmp);
    return inRange && matchEmpresa;
  });
  const publicados = items.filter((p) => p.estado === "Publicado");
  const pendientes = items.filter((p) => p.estado !== "Publicado");
  const cumplimiento = items.length ? Math.round((publicados.length / items.length) * 100) : 0;
  const metricTotals = publicados.reduce((acc, p) => {
    const t = totalMetricas(p.metricas);
    acc.alcance += t.alcance;
    acc.interacciones += t.interacciones;
    acc.comentarios += t.comentarios;
    return acc;
  }, { alcance: 0, interacciones: 0, comentarios: 0 });

  if (!clientes.length) return <div className="card empty">Aún no hay clientes para generar reportes.</div>;

  return (
    <div className="fade">
      <div className="card report-controls">
        <select value={reportEmp} onChange={(e) => setReportEmp(e.target.value)}><option value="__all">Todas las empresas</option>{clientes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn primary" type="button" onClick={() => window.print()}>Guardar PDF</button>
      </div>

      <div className="report-sheet premium-report">
        <div className="report-hero">
          <div className="report-brand">
            <LogoAvatar logo={agencia.logo} name={agencia.nombre} size={68} />
            <div><strong>{agencia.nombre}</strong><span>Reporte Ejecutivo de Marketing</span></div>
          </div>
          <div className="report-title-box">
            <span>REPORTE DE RESULTADOS</span>
            <h1>{reportAll ? "Todas las empresas" : emp?.nombre}</h1>
            <p>{startDate} al {endDate}</p>
          </div>
        </div>

        <div className="report-executive-grid">
          <div><span>Publicaciones programadas</span><strong>{items.length}</strong></div>
          <div><span>Publicadas</span><strong>{publicados.length}</strong></div>
          <div><span>Cumplimiento</span><strong>{cumplimiento}%</strong></div>
          <div><span>Alcance total</span><strong>{metricTotals.alcance.toLocaleString("es-MX")}</strong></div>
        </div>

        <div className="report-section-title">Resumen por estado</div>
        <div className="status-summary">
          {['Guion Pendiente','Falta Material Drive','En Diseño','Corrección','Diseño Concluido','Aprobado','Publicado'].map((estado) => {
            const count = items.filter((p) => p.estado === estado).length;
            return <div key={estado}><Badge tone={toneForState(estado)}>{estado}</Badge><strong>{count}</strong></div>;
          })}
        </div>

        <div className="report-section-title">Publicaciones y desempeño</div>
        <table className="report-table-pro">
          <thead><tr><th>Fecha</th><th>Publicación</th><th>Redes</th><th>Estado</th><th>Equipo</th><th>Métricas</th></tr></thead>
          <tbody>
            {items.map((p) => {
              const t = totalMetricas(p.metricas);
              return (
                <tr key={p.id}>
                  <td>{p.fecha}</td>
                  <td><strong>{p.formato}</strong><span>{p.tema || "Sin tema"}</span><span>{getEmpresa(p.empresa_id)?.nombre || p.empresa_nombre || "Sin empresa asignada"}</span></td>
                  <td>{redesText(p.redes)}</td>
                  <td><Badge tone={toneForState(p.estado)}>{p.estado}</Badge></td>
                  <td><span>Guion: {p.creado_por || "-"}</span><span>Diseño: {p.disenado_por || "-"}</span><span>Aprobó: {p.aprobado_por || "-"}</span></td>
                  <td><strong>{t.alcance.toLocaleString("es-MX")}</strong><span>{t.interacciones} interacciones · {t.comentarios} comentarios</span></td>
                </tr>
              );
            })}
            {!items.length ? <tr><td colSpan="6" className="empty-cell">No hay publicaciones en este periodo.</td></tr> : null}
          </tbody>
        </table>

        {pendientes.length > 0 ? <p className="report-warning">Hay {pendientes.length} publicación(es) del periodo que todavía no están publicadas. Revisar calendario y flujo de producción.</p> : null}
      </div>
    </div>
  );
}

function AuditoriaView({ accessLogs }) {
  return (
    <div className="card fade">
      <div className="card-head">
        <h3>Auditoría de accesos</h3>
        <p>Últimos inicios de sesión registrados.</p>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Usuario</th><th>Rol</th><th>Fecha</th><th>Seguridad</th></tr>
          </thead>
          <tbody>
            {accessLogs.map((log) => (
              <tr key={log.id}>
                <td><strong>{log.usuario}</strong></td>
                <td><Badge>{log.role}</Badge></td>
                <td>{log.fecha ? new Date(log.fecha).toLocaleString("es-MX") : "-"}</td>
                <td><code>{log.ip || "-"}</code></td>
              </tr>
            ))}
            {!accessLogs.length ? <tr><td colSpan="4" className="empty-cell">Sin registros de auditoría.</td></tr> : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ConfiguracionAgencia({ agencia, onSave }) {
  const [form, setForm] = useState({ ...DEFAULT_AGENCIA, ...agencia });
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setForm({ ...DEFAULT_AGENCIA, ...agencia });
  }, [agencia]);

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { optimizedImage, color } = await compressImageAndExtractColor(file, 520, 0.78);
      setForm((prev) => ({ ...prev, logo: optimizedImage, color }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="card config-card fade">
      <div className="card-head">
        <h3>Configuración de Agencia / Marca Blanca</h3>
        <p>Este nombre, logo y color se guardan en Supabase y se cargan también en el login.</p>
      </div>

      <div className="grid two">
        <Field label="Nombre Comercial">
          <input value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} />
        </Field>

        <Field label="Color Base">
          <div className="color-row">
            <input type="color" value={form.color || DEFAULT_AGENCIA.color} onChange={(e) => setForm({ ...form, color: e.target.value })} />
            <input value={form.color || ""} onChange={(e) => setForm({ ...form, color: e.target.value })} />
          </div>
        </Field>

        <div className="span-2">
          <Field label="Subir Logo de la Agencia">
            <input type="file" accept="image/*" onChange={handleLogoUpload} />
          </Field>
          {uploading ? <p className="muted">Optimizando logo...</p> : null}
          {form.logo ? (
            <div className="logo-preview">
              <img src={form.logo} alt="Preview logo" />
              <button className="btn secondary" type="button" onClick={() => setForm({ ...form, logo: "" })}>Quitar logo</button>
            </div>
          ) : null}
        </div>
      </div>

      <button className="btn primary full mt" type="button" onClick={() => onSave(form)}>
        Guardar Configuración en la Nube
      </button>
    </div>
  );
}

function ModalCRM({ initial = {}, onSave, onClose }) {
  const defaultValues = {
    nombre: "",
    tipo: "Cliente",
    contacto: "",
    email: "",
    telefono: "",
    pago_mensual: 0,
    dia_pago: 1,
    cuota_mensual: 12,
    pago_partes: 1,
    pago_fechas: [1],
    fecha_inicio: today(),
    logo: "",
    seguidores: normalizeSeguidores(),
    servicios: [],
  };

  const [form, setForm] = useState(initial?.id ? { ...defaultValues, ...initial, seguidores: normalizeSeguidores(initial.seguidores), servicios: normalizeServicios(initial.servicios), pago_fechas: normalizePagoFechas(initial.pago_fechas || [initial.dia_pago || 1], initial.pago_partes || 1) } : defaultValues);
  const [uploading, setUploading] = useState(false);
  const [localError, setLocalError] = useState("");

  const emailOk = isValidEmail(form.email);
  const nombreOk = safeString(form.nombre).length > 1;
  const canSubmit = nombreOk && emailOk;

  const toggleEmpresaRed = (key) => {
    setForm((prev) => {
      const seguidores = normalizeSeguidores(prev.seguidores);
      const activos = seguidores._activos.includes(key)
        ? seguidores._activos.filter((item) => item !== key)
        : [...seguidores._activos, key];
      return { ...prev, seguidores: { ...seguidores, _activos: activos } };
    });
  };

  const addServicioEmpresa = () => {
    setForm((prev) => ({
      ...prev,
      servicios: [
        ...normalizeServicios(prev.servicios),
        {
          id: `${Date.now()}`,
          nombre: "Diseño de Logos",
          descripcion: "",
          monto: 0,
          partes: 1,
          pagadas: 0,
          estado: "Pendiente",
        },
      ],
    }));
  };

  const updateServicioEmpresa = (id, patch) => {
    setForm((prev) => ({
      ...prev,
      servicios: normalizeServicios(prev.servicios).map((servicio) =>
        servicio.id === id ? { ...servicio, ...patch } : servicio
      ),
    }));
  };

  const removeServicioEmpresa = (id) => {
    setForm((prev) => ({
      ...prev,
      servicios: normalizeServicios(prev.servicios).filter((servicio) => servicio.id !== id),
    }));
  };

  const handleLogoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const { optimizedImage } = await compressImageAndExtractColor(file, 360, 0.72);
      setForm((prev) => ({ ...prev, logo: optimizedImage }));
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = () => {
    setLocalError("");

    if (!nombreOk) {
      setLocalError("Escribe el nombre comercial de la empresa.");
      return;
    }

    if (!emailOk) {
      setLocalError("El correo de cobranza es obligatorio y debe ser válido. Ahí llegarán recordatorios y avisos de pago.");
      return;
    }

    onSave(form);
  };

  return (
    <Modal title={form.id ? "Editar Empresa" : "Nueva Empresa"} onClose={onClose} width="980px">
      <div className="crm-modal-pro">
        <aside className="crm-company-preview">
          <div className="crm-preview-logo">
            <LogoAvatar logo={form.logo} name={form.nombre || "Empresa"} size={82} />
          </div>
          <h3>{form.nombre || "Nueva empresa"}</h3>
          <Badge tone={form.tipo === "Prospecto" ? "amber" : "green"}>{form.tipo || "Cliente"}</Badge>
          <div className="crm-preview-data">
            <div><span>Cobranza mensual</span><strong>{mx(form.pago_mensual)}</strong></div>
            <div><span>Pago mensual en</span><strong>{form.pago_partes || 1} parte(s)</strong></div>
            <div><span>Días de pago</span><strong>{normalizePagoFechas(form.pago_fechas, form.pago_partes).join(" / ")}</strong></div>
            <div><span>Primer pago</span><strong>Día {normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], form.pago_partes || 1)[0]}</strong></div>
            <div><span>Cuota mensual</span><strong>{form.cuota_mensual || 12} publicaciones</strong></div>
            <div><span>Servicios extra</span><strong>{mx(totalServiciosEmpresa(form.servicios))}</strong></div>
          </div>
          <p className="crm-required-note">El correo es obligatorio porque será el canal para avisos automáticos de pago y comprobantes.</p>
        </aside>

        <section className="crm-form-pro">
          {localError ? <div className="form-error-box">{localError}</div> : null}

          <div className="form-section-title">
            <span>01</span>
            <div><strong>Datos comerciales</strong><small>Información base para operación y reportes.</small></div>
          </div>

          <div className="grid two">
            <Field label="Tipo">
              <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
                <option value="Cliente">Cliente</option>
                <option value="Prospecto">Prospecto</option>
              </select>
            </Field>

            <Field label="Nombre comercial *">
              <input required value={form.nombre || ""} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Ej. Harmony Arte en Movimiento" />
            </Field>

            <Field label="Contacto principal">
              <input value={form.contacto || ""} onChange={(e) => setForm({ ...form, contacto: e.target.value })} placeholder="Nombre del responsable" />
            </Field>

            <Field label="Correo de cobranza *">
              <input
                required
                type="email"
                className={form.email && !emailOk ? "input-error" : ""}
                value={form.email || ""}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="pagos@cliente.com"
              />
            </Field>

            <Field label="Teléfono / WhatsApp">
              <input value={form.telefono || ""} onChange={(e) => setForm({ ...form, telefono: e.target.value })} placeholder="Ej. 4491234567" />
            </Field>

            <Field label="Fecha de inicio">
              <input type="date" value={form.fecha_inicio || today()} onChange={(e) => setForm({ ...form, fecha_inicio: e.target.value })} />
            </Field>
          </div>

          <div className="form-section-title mt-section">
            <span>02</span>
            <div><strong>Cobranza y entregables</strong><small>Estos campos alimentan CRM, cobranza y reportes.</small></div>
          </div>

          <div className="grid three">
            <Field label="Pago mensual">
              <input type="number" min="0" value={form.pago_mensual || 0} onChange={(e) => setForm({ ...form, pago_mensual: Number(e.target.value) })} />
            </Field>

            <Field label="Primer día de pago">
              <select
                value={normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], form.pago_partes || 1)[0] || 1}
                onChange={(e) => {
                  const next = normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], form.pago_partes || 1);
                  next[0] = Number(e.target.value);
                  setForm({ ...form, dia_pago: next[0], pago_fechas: next });
                }}
              >
                {DAYS_OF_MONTH.map((day) => <option key={day} value={day}>Día {day}</option>)}
              </select>
            </Field>

            <Field label="Publicaciones mensuales">
              <input type="number" min="1" value={form.cuota_mensual || 12} onChange={(e) => setForm({ ...form, cuota_mensual: Number(e.target.value) })} />
            </Field>

            <Field label="¿En cuántas partes pagará?">
              <select value={form.pago_partes || 1} onChange={(e) => {
                const partes = Number(e.target.value);
                setForm({ ...form, pago_partes: partes, pago_fechas: normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], partes) });
              }}>
                <option value={1}>1 parte: una fecha de cobro</option>
                <option value={2}>2 partes: dos fechas de cobro</option>
                <option value={3}>3 partes: tres fechas de cobro</option>
              </select>
            </Field>
          </div>

          <div className="payment-schedule-pro highlight-payment">
            <div className="panel-title-line">
              <strong>Calendario automático de cobranza</strong>
              <span>Estos días alimentarán los recordatorios por correo.</span>
            </div>
            <div className="payment-days-grid">
              {normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], form.pago_partes || 1).map((day, index) => (
                <div className="payment-day-card" key={index}>
                  <div className="payment-day-number">{index + 1}</div>
                  <Field label={`${index + 1}ª fecha de cobro`}>
                    <select
                      value={day}
                      onChange={(e) => {
                        const next = normalizePagoFechas(form.pago_fechas || [form.dia_pago || 1], form.pago_partes || 1);
                        next[index] = Number(e.target.value);
                        setForm({ ...form, pago_fechas: next, dia_pago: next[0] || form.dia_pago });
                      }}
                    >
                      {DAYS_OF_MONTH.map((d) => <option key={d} value={d}>Día {d}</option>)}
                    </select>
                  </Field>
                  <small>Recordatorio automático para la {index + 1}ª parte.</small>
                </div>
              ))}
            </div>
            <p className="muted small-copy">Ejemplo: si paga en 2 partes, puedes usar día 1 y día 15. El sistema podrá recordar cada fecha por separado.</p>
          </div>

          <div className="form-section-title mt-section">
            <span>03</span>
            <div><strong>Servicios contratados</strong><small>Agrega servicios únicos o recurrentes y define en cuántas partes se pagarán.</small></div>
          </div>

          <div className="servicios-pro-panel">
            <div className="servicios-summary">
              <div><span>Total servicios</span><strong>{mx(totalServiciosEmpresa(form.servicios))}</strong></div>
              <div><span>Pendiente servicios</span><strong>{mx(totalPendienteServicios(form.servicios))}</strong></div>
              <button className="btn secondary" type="button" onClick={addServicioEmpresa}>+ Agregar servicio</button>
            </div>
            <div className="service-rule-note">Los servicios extra se dividen únicamente entre Thalia y Luis. No generan pago automático para Paloma ni Jarek.</div>

            {normalizeServicios(form.servicios).length === 0 ? (
              <div className="service-empty">Aún no hay servicios extra. Puedes agregar logo, página web, mantenimiento u otros diseños.</div>
            ) : null}

            <div className="servicios-list">
              {normalizeServicios(form.servicios).map((servicio) => {
                const partes = Math.max(Number(servicio.partes || 1), 1);
                const montoParte = Number(servicio.monto || 0) / partes;
                return (
                  <div className="servicio-card" key={servicio.id}>
                    <div className="grid two compact">
                      <Field label="Servicio">
                        <select value={servicio.nombre} onChange={(e) => updateServicioEmpresa(servicio.id, { nombre: e.target.value })}>
                          {SERVICE_OPTIONS.map((option) => <option key={option} value={option}>{option}</option>)}
                        </select>
                      </Field>

                      <Field label="Estado">
                        <select value={servicio.estado} onChange={(e) => updateServicioEmpresa(servicio.id, { estado: e.target.value })}>
                          <option>Pendiente</option>
                          <option>En proceso</option>
                          <option>Entregado</option>
                          <option>Pagado</option>
                        </select>
                      </Field>

                      <Field label="Monto del servicio">
                        <input type="number" min="0" value={servicio.monto || 0} onChange={(e) => updateServicioEmpresa(servicio.id, { monto: Number(e.target.value) })} />
                      </Field>

                      <Field label="Se pagará en">
                        <select value={servicio.partes || 1} onChange={(e) => updateServicioEmpresa(servicio.id, { partes: Number(e.target.value), pagadas: Math.min(Number(servicio.pagadas || 0), Number(e.target.value)) })}>
                          <option value={1}>1 parte</option>
                          <option value={2}>2 partes</option>
                          <option value={3}>3 partes</option>
                        </select>
                      </Field>

                      <Field label="Partes pagadas">
                        <input type="number" min="0" max={servicio.partes || 1} value={servicio.pagadas || 0} onChange={(e) => updateServicioEmpresa(servicio.id, { pagadas: Number(e.target.value) })} />
                      </Field>

                      <Field label="Monto por parte">
                        <input type="text" value={mx(montoParte)} readOnly />
                      </Field>

                      <div className="span-2">
                        <Field label="Descripción / alcance">
                          <textarea rows="2" value={servicio.descripcion || ""} onChange={(e) => updateServicioEmpresa(servicio.id, { descripcion: e.target.value })} placeholder="Ej. Logo principal + versión circular / Página web informativa / Mantenimiento mensual..." />
                        </Field>
                      </div>
                    </div>
                    <button className="btn danger small" type="button" onClick={() => removeServicioEmpresa(servicio.id)}>Eliminar servicio</button>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="form-section-title mt-section">
            <span>04</span>
            <div><strong>Presencia digital</strong><small>Datos visibles en reportes ejecutivos.</small></div>
          </div>

          <div className="social-presence-pro">
            <div className="social-selector-grid">
              {SOCIAL_OPTIONS.map((opt) => {
                const seguidores = normalizeSeguidores(form.seguidores);
                const active = seguidores._activos.includes(opt.key);
                return (
                  <button
                    key={opt.key}
                    type="button"
                    className={`social-select-card ${active ? "active" : ""}`}
                    onClick={() => toggleEmpresaRed(opt.key)}
                  >
                    <span className="social-icon">{opt.icon}</span>
                    <span className="social-copy">
                      <strong>{opt.label}</strong>
                      <small>{active ? "Seleccionada para la marca" : "Agregar presencia"}</small>
                    </span>
                    <span className={`social-check ${active ? "on" : ""}`}>{active ? "✓" : "+"}</span>
                  </button>
                );
              })}
            </div>

            <div className="grid two compact mt-12">
              {SOCIAL_OPTIONS.filter((opt) => normalizeSeguidores(form.seguidores)._activos.includes(opt.key)).map((opt) => (
                <Field key={opt.key} label={`Seguidores ${opt.label}`}>
                  <input
                    type="number"
                    min="0"
                    value={normalizeSeguidores(form.seguidores)[opt.short] || 0}
                    onChange={(e) => setForm({
                      ...form,
                      seguidores: {
                        ...normalizeSeguidores(form.seguidores),
                        [opt.short]: Number(e.target.value),
                      },
                    })}
                  />
                </Field>
              ))}
            </div>
          </div>

          <div className="form-section-title mt-section">
            <span>05</span>
            <div><strong>Identidad visual</strong><small>Logo usado en CRM y reportes.</small></div>
          </div>

          <div className="logo-upload-pro">
            <div>
              <Field label="Subir logo del cliente">
                <input type="file" accept="image/*" onChange={handleLogoUpload} />
              </Field>
              {uploading ? <p className="muted">Optimizando logo...</p> : null}
            </div>
            {form.logo ? (
              <div className="logo-preview small">
                <img src={form.logo} alt="Preview cliente" />
                <button className="btn secondary" type="button" onClick={() => setForm({ ...form, logo: "" })}>Quitar logo</button>
              </div>
            ) : <div className="logo-empty-state">Sin logo cargado</div>}
          </div>
        </section>
      </div>

      <div className="actions crm-actions-pro">
        <span className="save-hint">* Campos obligatorios para operar cobranza.</span>
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn primary" type="button" onClick={handleSubmit} disabled={!canSubmit}>Guardar empresa</button>
      </div>
    </Modal>
  );
}

function ModalPub({ initial = {}, empresas, onSave, onClose, user }) {
  const clientes = empresas.filter((e) => e.tipo !== "Prospecto");
  const admin = isAdminRole(user);
  const defaultForm = {
    empresa_id: clientes[0]?.id || "",
    fecha: today(),
    redes: ["instagram"],
    formato: "Reel",
    tema: "",
    copy: "",
    objetivo: "",
    material_drive: "",
    prioridad: "Media",
    notas_internas: "",
    estado: "Guion Pendiente",
  };
  const [form, setForm] = useState(initial?.id ? { ...defaultForm, ...initial, empresa_id: normalizeId(initial.empresa_id), redes: initial.redes || [] } : defaultForm);

  const toggleRed = (key) => {
    setForm((prev) => {
      const redes = Array.isArray(prev.redes) ? prev.redes : [];
      const next = redes.includes(key) ? redes.filter((r) => r !== key) : [...redes, key];
      return { ...prev, redes: next };
    });
  };

  return (
    <Modal title={form.id ? "Editar Publicación" : "Programar Publicación Profesional"} onClose={onClose} width="980px">
      <div className="pauta-layout">
        <div className="pauta-main">
          <div className="grid two">
            <Field label="Cliente"><select value={form.empresa_id || ""} onChange={(e) => setForm({ ...form, empresa_id: e.target.value })}><option value="">Selecciona cliente</option>{clientes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></Field>
            <Field label="Fecha de publicación"><input type="date" value={form.fecha || today()} onChange={(e) => setForm({ ...form, fecha: e.target.value })} /></Field>
            <Field label="Formato"><select value={form.formato || "Reel"} onChange={(e) => setForm({ ...form, formato: e.target.value })}><option>Reel</option><option>Post</option><option>Carrusel</option><option>Historia</option><option>Video</option><option>Live</option></select></Field>
            <Field label="Prioridad"><select value={form.prioridad || "Media"} onChange={(e) => setForm({ ...form, prioridad: e.target.value })}><option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option></select></Field>
            {admin ? <Field label="Estado"><select value={form.estado || "Guion Pendiente"} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option>Guion Pendiente</option><option>En Diseño</option><option>Falta Material Drive</option><option>Corrección</option><option>Diseño Concluido</option><option>Aprobado</option><option>Publicado</option></select></Field> : <Field label="Estado"><input value={form.estado || "Guion Pendiente"} readOnly /></Field>}
            <Field label="Material / Drive"><input value={form.material_drive || ""} onChange={(e) => setForm({ ...form, material_drive: e.target.value })} placeholder="Pega el link de Drive o carpeta de recursos" /></Field>
          </div>

          <div className="span-2"><Field label="Tema / Título"><input value={form.tema || ""} onChange={(e) => setForm({ ...form, tema: e.target.value })} placeholder="Ej. Lanzamiento de nuevo servicio, campaña del mes, promoción..." /></Field></div>
          <Field label="Objetivo estratégico"><textarea rows="3" value={form.objetivo || ""} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Qué debe lograr esta publicación: alcance, leads, venta, interacción, posicionamiento..." /></Field>
          <Field label="Copy / Guion estratégico"><textarea rows="7" value={form.copy || ""} onChange={(e) => setForm({ ...form, copy: e.target.value })} placeholder="Guion, copy, CTA, texto sugerido y dirección creativa." /></Field>
          <Field label="Notas internas para diseño / aprobación"><textarea rows="3" value={form.notas_internas || ""} onChange={(e) => setForm({ ...form, notas_internas: e.target.value })} placeholder="Indicaciones internas, estilo visual, restricciones, referencias..." /></Field>
        </div>

        <aside className="pauta-side">
          <h4>Redes donde se publicará</h4>
          <p>Esto alimenta métricas y reporte PDF.</p>
          <div className="social-picker">
            {SOCIAL_OPTIONS.map((red) => (
              <label key={red.key} className={form.redes?.includes(red.key) ? "selected" : ""}>
                <input type="checkbox" checked={form.redes?.includes(red.key)} onChange={() => toggleRed(red.key)} />
                <span>{red.icon}</span><strong>{red.label}</strong>
              </label>
            ))}
          </div>
          <div className="pauta-note"><strong>Regla operativa:</strong> si no hay material en Drive, Jarek puede bloquear la publicación y Thalia/Luis verán alerta automática.</div>
        </aside>
      </div>

      <div className="actions">
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn primary" type="button" onClick={() => onSave(form)}>Guardar Publicación</button>
      </div>
    </Modal>
  );
}

function ModalFinanza({ initial = {}, empresas, onSave, onClose }) {
  const clientes = empresas.filter((e) => e.tipo !== "Prospecto");
  const selectedEmpresa = clientes.find((e) => sameId(e.id, initial?.empresa_id || clientes[0]?.id));
  const [form, setForm] = useState(
    initial?.id
      ? { tipo_ingreso: "Redes", servicio_nombre: "", ...initial }
      : {
          empresa_id: clientes[0]?.id || "",
          fecha: today(),
          tipo_ingreso: "Redes",
          servicio_nombre: "",
          pago: 0,
          gas: 0,
          paloma: 0,
          jarek: 0,
          luis: 0,
          thalia: 0,
        }
  );

  const empresaActiva = clientes.find((e) => sameId(e.id, form.empresa_id)) || selectedEmpresa;
  const serviciosEmpresa = normalizeServicios(empresaActiva?.servicios);
  const isServicio = form.tipo_ingreso === "Servicio";

  const autoCalcular = () => {
    const pago = Number(form.pago || 0);

    if (isServicio) {
      setForm({ ...form, gas: 0, paloma: 0, jarek: 0, luis: pago / 2, thalia: pago / 2 });
      return;
    }

    const gas = pago > 6900 ? 1000 : 700;
    const paloma = 600;
    const jarek = 250;
    const neto = Math.max(pago - gas - paloma - jarek, 0);
    setForm({ ...form, gas, paloma, jarek, luis: neto / 2, thalia: neto / 2 });
  };

  return (
    <Modal title="Registro contable profesional" onClose={onClose} width="840px">
      <div className="finance-modal-pro">
        <div className="finance-hero-box">
          <div>
            <strong>{isServicio ? "Ingreso por servicio" : "Ingreso por redes sociales"}</strong>
            <span>{isServicio ? "Se divide únicamente entre Thalia y Luis." : "Mantiene el cálculo actual de operación, Paloma, Jarek, Luis y Thalia."}</span>
          </div>
          <Badge tone={isServicio ? "purple" : "green"}>{isServicio ? "Servicio" : "Redes"}</Badge>
        </div>

        <div className="grid two">
          <Field label="Cliente">
            <select value={form.empresa_id || ""} onChange={(e) => setForm({ ...form, empresa_id: e.target.value, servicio_nombre: "" })}>
              <option value="">Selecciona cliente</option>
              {clientes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
            </select>
          </Field>

          <Field label="Fecha de depósito">
            <input type="date" value={form.fecha || today()} onChange={(e) => setForm({ ...form, fecha: e.target.value })} />
          </Field>

          <Field label="Tipo de ingreso">
            <select value={form.tipo_ingreso || "Redes"} onChange={(e) => setForm({ ...form, tipo_ingreso: e.target.value, paloma: 0, jarek: 0, gas: 0 })}>
              <option value="Redes">Pago mensual de redes</option>
              <option value="Servicio">Servicio extra</option>
            </select>
          </Field>

          {isServicio ? (
            <Field label="Servicio asociado">
              <select value={form.servicio_nombre || ""} onChange={(e) => setForm({ ...form, servicio_nombre: e.target.value })}>
                <option value="">Selecciona servicio</option>
                {serviciosEmpresa.map((s) => <option key={s.id} value={s.nombre}>{s.nombre} · {mx(s.monto)}</option>)}
                <option value="Otro servicio">Otro servicio</option>
              </select>
            </Field>
          ) : (
            <Field label="Calendario de pago del cliente">
              <input type="text" readOnly value={empresaActiva ? getPagoFechasText(empresaActiva) : "Sin calendario"} />
            </Field>
          )}

          <Field label="Ingreso bruto">
            <input type="number" value={form.pago || 0} onChange={(e) => setForm({ ...form, pago: Number(e.target.value) })} />
          </Field>

          <div className="field align-bottom">
            <button className="btn secondary full" type="button" onClick={autoCalcular}>Auto-calcular distribución</button>
          </div>
        </div>

        <div className="finance-split-grid">
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Gasolina Thalia</span>
            <input type="number" value={form.gas || 0} disabled={isServicio} onChange={(e) => setForm({ ...form, gas: Number(e.target.value) })} />
          </div>
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Paloma</span>
            <input type="number" value={form.paloma || 0} disabled={isServicio} onChange={(e) => setForm({ ...form, paloma: Number(e.target.value) })} />
          </div>
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Jarek</span>
            <input type="number" value={form.jarek || 0} disabled={isServicio} onChange={(e) => setForm({ ...form, jarek: Number(e.target.value) })} />
          </div>
          <div className="split-card highlight">
            <span>Neto Luis</span>
            <input type="number" value={form.luis || 0} onChange={(e) => setForm({ ...form, luis: Number(e.target.value) })} />
          </div>
          <div className="split-card highlight">
            <span>Neto Thalia</span>
            <input type="number" value={form.thalia || 0} onChange={(e) => setForm({ ...form, thalia: Number(e.target.value) })} />
          </div>
        </div>
      </div>

      <div className="actions">
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn primary" type="button" onClick={() => onSave(form)}>Guardar en la Nube</button>
      </div>
    </Modal>
  );
}

function ModalMetricas({ pub, onSave, onClose }) {
  const defaultMetrics = SOCIAL_OPTIONS.reduce((acc, opt) => {
    acc[opt.key] = { publicado: false, enlace: "", alcance: 0, interacciones: 0, comentarios: 0, guardados: 0, compartidos: 0 };
    return acc;
  }, {});

  const selectedRedes = Array.isArray(pub.redes) && pub.redes.length
    ? SOCIAL_OPTIONS.filter((opt) => pub.redes.includes(opt.key))
    : SOCIAL_OPTIONS;

  const [metrics, setMetrics] = useState({ ...defaultMetrics, ...(pub.metricas || {}) });

  const setRed = (red, key, value) => {
    setMetrics((prev) => ({
      ...prev,
      [red]: {
        ...prev[red],
        [key]: value,
      },
    }));
  };

  const totals = selectedRedes.reduce((acc, opt) => {
    const item = metrics[opt.key] || {};
    acc.alcance += Number(item.alcance || 0);
    acc.interacciones += Number(item.interacciones || 0);
    acc.comentarios += Number(item.comentarios || 0);
    return acc;
  }, { alcance: 0, interacciones: 0, comentarios: 0 });

  return (
    <Modal title="Captura profesional de métricas" onClose={onClose} width="980px">
      <div className="metrics-pro-header">
        <div>
          <strong>{pub.tema || "Publicación sin título"}</strong>
          <span>{pub.fecha} · {pub.formato} · El enlace es opcional.</span>
        </div>
        <div className="metrics-totals-mini">
          <span><strong>{totals.alcance.toLocaleString("es-MX")}</strong> alcance</span>
          <span><strong>{totals.interacciones.toLocaleString("es-MX")}</strong> interacciones</span>
          <span><strong>{totals.comentarios.toLocaleString("es-MX")}</strong> comentarios</span>
        </div>
      </div>

      <div className="metrics-grid metrics-grid-pro">
        {selectedRedes.map((opt) => {
          const key = opt.key;
          return (
            <div className="metric-card metric-card-pro" key={key}>
              <div className="metric-platform-head">
                <div className="platform-icon">{opt.icon}</div>
                <div><strong>{opt.label}</strong><span>Estadísticas capturadas manualmente</span></div>
                <label className="switch-mini">
                  <input type="checkbox" checked={Boolean(metrics[key]?.publicado)} onChange={(e) => setRed(key, "publicado", e.target.checked)} />
                  <i />
                </label>
              </div>

              <Field label="URL publicada (opcional)">
                <input value={metrics[key]?.enlace || ""} onChange={(e) => setRed(key, "enlace", e.target.value)} placeholder="Puedes dejarlo vacío si no tienes el link" />
              </Field>

              <div className="grid three compact">
                <Field label="Alcance / vistas">
                  <input type="number" value={metrics[key]?.alcance || 0} onChange={(e) => setRed(key, "alcance", Number(e.target.value))} />
                </Field>
                <Field label="Interacciones">
                  <input type="number" value={metrics[key]?.interacciones || 0} onChange={(e) => setRed(key, "interacciones", Number(e.target.value))} />
                </Field>
                <Field label="Comentarios">
                  <input type="number" value={metrics[key]?.comentarios || 0} onChange={(e) => setRed(key, "comentarios", Number(e.target.value))} />
                </Field>
                <Field label="Guardados">
                  <input type="number" value={metrics[key]?.guardados || 0} onChange={(e) => setRed(key, "guardados", Number(e.target.value))} />
                </Field>
                <Field label="Compartidos">
                  <input type="number" value={metrics[key]?.compartidos || 0} onChange={(e) => setRed(key, "compartidos", Number(e.target.value))} />
                </Field>
              </div>
            </div>
          );
        })}
      </div>
      <div className="actions">
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn primary" type="button" onClick={() => onSave(pub.id, metrics)}>Guardar Métricas</button>
      </div>
    </Modal>
  );
}

function ModalHistorial({ empresa, calendario, onClose }) {
  const items = calendario.filter((p) => sameId(p.empresa_id, empresa.id));
  const redesEmpresa = seguidoresRedesActivas(empresa.seguidores);

  return (
    <Modal title={`Ficha ejecutiva de ${empresa.nombre}`} onClose={onClose} width="900px">
      <div className="company-detail-premium">
        <div className="company-detail-hero">
          <LogoAvatar logo={empresa.logo} name={empresa.nombre} size={74} />
          <div>
            <h2>{empresa.nombre}</h2>
            <p>{empresa.contacto || "Sin contacto asignado"} · {empresa.email || "Sin correo"}</p>
          </div>
          <Badge tone={empresa.tipo === "Prospecto" ? "amber" : "green"}>{empresa.tipo || "Cliente"}</Badge>
        </div>

        <div className="company-metric-grid">
          <div><span>Mensualidad</span><strong>{mx(empresa.pago_mensual)}</strong></div>
          <div><span>Días de pago</span><strong>{getPagoFechasText(empresa)}</strong></div>
          <div><span>Cuota mensual</span><strong>{empresa.cuota_mensual || 12} publicaciones</strong></div>
          <div><span>Comunidad total</span><strong>{totalSeguidoresEmpresa(empresa.seguidores).toLocaleString("es-MX")}</strong></div>
          <div><span>Servicios extra</span><strong>{mx(totalServiciosEmpresa(empresa.servicios))}</strong></div>
        </div>

        <div className="company-services-panel">
          <div className="panel-title-line">
            <strong>Servicios contratados</strong>
            <span>{normalizeServicios(empresa.servicios).length} servicio(s) registrados</span>
          </div>
          <div className="services-chip-list">
            {normalizeServicios(empresa.servicios).map((servicio) => (
              <div className="service-chip" key={servicio.id}>
                <strong>{servicio.nombre}</strong>
                <span>{mx(servicio.monto)} · {servicio.partes || 1} parte(s) · {servicio.estado}</span>
              </div>
            ))}
            {normalizeServicios(empresa.servicios).length === 0 ? <div className="empty">Sin servicios extra registrados.</div> : null}
          </div>
        </div>

        <div className="company-network-panel">
          <div className="panel-title-line">
            <strong>Presencia digital activa</strong>
            <span>Redes configuradas para reportes y estrategia</span>
          </div>
          <div className="network-cards-row">
            {redesEmpresa.map((opt) => (
              <div className="network-card" key={opt.key}>
                <div className="network-card-icon">{opt.icon}</div>
                <div>
                  <strong>{opt.value.toLocaleString("es-MX")}</strong>
                  <span>{opt.label}</span>
                </div>
              </div>
            ))}
            {redesEmpresa.length === 0 ? <div className="empty">Sin redes configuradas.</div> : null}
          </div>
        </div>

        <div className="panel-title-line mt">
          <strong>Historial operativo</strong>
          <span>{items.length} publicaciones registradas para esta empresa</span>
        </div>
        <div className="mini-list">
          {items.map((p) => (
            <div className="mini-row" key={p.id}>
              <div>
                <strong>{p.tema || "Sin tema"}</strong>
                <span>{p.fecha} · {p.formato} · {redesText(p.redes)}</span>
              </div>
              <Badge tone={toneForState(p.estado)}>{p.estado}</Badge>
            </div>
          ))}
          {items.length === 0 ? <div className="empty">Este cliente todavía no tiene publicaciones.</div> : null}
        </div>
      </div>
    </Modal>
  );
}

function RechazoForm({ onSave, onCancel }) {
  const [notas, setNotas] = useState("");

  return (
    <>
      <Field label="Notas para corrección">
        <textarea rows="5" value={notas} onChange={(e) => setNotas(e.target.value)} placeholder="Ej. Cambiar tipografía, ajustar color, corregir copy..." />
      </Field>
      <div className="actions">
        <button className="btn secondary" type="button" onClick={onCancel}>Cancelar</button>
        <button className="btn danger" type="button" onClick={() => onSave(notas)}>Enviar a Corrección</button>
      </div>
    </>
  );
}

function LoginScreen({ onLogin, error, agencia, isLoading }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="glow" />
        <div className="login-copy">
          <span className="pill">AZP Marketing Suite</span>
          <h1>El control operativo total de tu agencia.</h1>
          <p>Producción, finanzas, reportes y métricas centralizados en una plataforma inteligente de alto rendimiento en la nube.</p>

          <div className="mock-panel">
            <div className="mock-dots"><i /><i /><i /></div>
            <div className="mock-body">
              <div className="bars"><i /><i /><i /><i /><i /></div>
              <div className="score"><strong>85%</strong><span>Eficiencia Operativa<br />Óptima</span></div>
            </div>
          </div>
        </div>
      </div>

      <div className="login-right">
        <form
          className="login-card"
          onSubmit={(e) => {
            e.preventDefault();
            onLogin({ email, password });
          }}
        >
          <div className="login-logo">
            <LogoAvatar logo={agencia.logo} name={agencia.nombre} size={66} />
          </div>
          <h2>{agencia.nombre}</h2>
          <p>Acceso seguro en tiempo real</p>

          <Field label="Usuario (correo electrónico)">
            <input type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@marketeros.com" />
          </Field>

          <Field label="Contraseña de seguridad">
            <input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" />
          </Field>

          {error ? <div className="error-box">{error}</div> : null}

          <button className="login-btn" type="submit" disabled={isLoading}>
            {isLoading ? "Verificando..." : "Acceder a la Nube"}
          </button>
        </form>
      </div>
    </div>
  );
}

function toneForState(estado = "") {
  if (estado === "Publicado") return "green";
  if (estado === "Aprobado") return "teal";
  if (estado === "Diseño Concluido") return "purple";
  if (estado === "En Diseño") return "blue";
  if (estado === "Corrección") return "amber";
  if (estado === "Falta Material Drive") return "red";
  return "gray";
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');

:root {
  --c-primary: #991ccc;
  --bg: #f7f9fc;
  --sidebar: #0f172a;
  --text: #172033;
  --muted: #65748b;
  --border: #dfe7f1;
  --white: #ffffff;
  --green: #10b981;
  --red: #ef4444;
  --amber: #f59e0b;
  --blue: #3b82f6;
  --purple: #8b5cf6;
  --teal: #14b8a6;
  --shadow: 0 18px 50px rgba(15, 23, 42, .08);
}

* { box-sizing: border-box; }
body { margin: 0; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: var(--bg); color: var(--text); }
button, input, select, textarea { font: inherit; }
button { cursor: pointer; }
input, select, textarea {
  width: 100%;
  border: 1px solid var(--border);
  border-radius: 10px;
  padding: 11px 12px;
  outline: none;
  background: white;
  color: var(--text);
}
textarea { resize: vertical; }
input:focus, select:focus, textarea:focus { border-color: var(--c-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 16%, transparent); }

.app-shell { height: 100vh; display: flex; overflow: hidden; }
.sidebar {
  width: 285px;
  background: var(--sidebar);
  color: white;
  display: flex;
  flex-direction: column;
  transition: width .25s ease;
  flex: 0 0 auto;
}
.sidebar.collapsed { width: 82px; }
.sidebar.collapsed .brand div:not(.logo-avatar), .sidebar.collapsed .profile div:not(.avatar), .sidebar.collapsed nav small, .sidebar.collapsed .nav-btn span:not(.nav-icon), .sidebar.collapsed .logout { font-size: 0; }
.brand { height: 74px; padding: 16px 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.08); }
.brand strong, .profile strong { display: block; font-weight: 800; }
.brand span, .profile span { display: block; color: #94a3b8; font-size: 12px; margin-top: 3px; }
.profile { padding: 20px; display: flex; align-items: center; gap: 12px; border-bottom: 1px solid rgba(255,255,255,.06); }
.avatar { width: 42px; height: 42px; display: grid; place-items: center; border-radius: 50%; background: var(--c-primary); color: white; font-weight: 900; flex: 0 0 auto; }

.logo-avatar { object-fit: contain; border-radius: 10px; background: white; flex: 0 0 auto; }
.logo-avatar.fallback { display: grid; place-items: center; background: var(--c-primary); color: white; font-weight: 900; }

nav { padding: 16px 12px; overflow-y: auto; flex: 1; }
nav small { display: block; color: #64748b; text-transform: uppercase; font-weight: 800; font-size: 11px; margin: 18px 10px 8px; }
.nav-btn { width: 100%; border: 0; border-radius: 10px; background: transparent; color: #cbd5e1; display: flex; align-items: center; gap: 12px; padding: 12px 12px; margin-bottom: 5px; text-align: left; }
.nav-btn:hover, .nav-btn.active { background: var(--c-primary); color: white; }
.nav-icon { width: 22px; flex: 0 0 auto; }
.nav-btn em { margin-left: auto; background: var(--red); color: white; font-style: normal; font-size: 11px; padding: 2px 7px; border-radius: 999px; }
.logout { margin: 16px; border: 0; border-radius: 10px; padding: 13px; background: rgba(255,255,255,.08); color: #cbd5e1; }

.main { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.topbar { height: 74px; background: white; border-bottom: 1px solid var(--border); display: flex; align-items: center; gap: 18px; padding: 0 28px; }
.topbar h2 { margin: 0; font-size: 20px; letter-spacing: .02em; }
.topbar p { margin: 3px 0 0; color: var(--muted); font-size: 13px; }
.topbar-actions { margin-left: auto; display: flex; align-items: center; gap: 12px; }
.sync { color: var(--muted); font-size: 13px; }
.icon-btn { border: 0; background: transparent; font-size: 22px; color: var(--muted); }
.content { padding: 30px; overflow: auto; flex: 1; }

.fade { animation: fadeIn .18s ease-out; }
@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: none; } }

.welcome h1 { margin: 0 0 6px; font-size: 20px; }
.welcome p { margin: 0 0 22px; color: var(--text); }
.role-alert { border-radius: 14px; padding: 14px 18px; margin: 0 0 18px; border: 1px solid var(--border); background: white; box-shadow: 0 2px 12px rgba(15,23,42,.04); }
.role-alert.purple { border-left: 5px solid var(--purple); }
.role-alert.blue { border-left: 5px solid var(--blue); }
.digital-footprint { display: grid; gap: 4px; margin-top: 10px; color: var(--muted); font-size: 11px; }
.digital-footprint span { display: block; }
.metrics-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.metric-card { border: 1px solid var(--border); border-radius: 14px; padding: 14px; background: #f8fafc; }
.check-row { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.check-row input { width: auto; }
.grid.two.compact { gap: 10px; }

.kpi-grid { display: grid; grid-template-columns: repeat(4, minmax(180px, 1fr)); gap: 18px; }
.kpi { background: white; border: 1px solid var(--border); border-left: 5px solid var(--c-primary); border-radius: 14px; padding: 20px; box-shadow: 0 2px 12px rgba(15,23,42,.04); }
.kpi span { display: block; color: var(--muted); font-size: 13px; font-weight: 800; margin-bottom: 10px; }
.kpi strong { font-size: 34px; line-height: 1; }
.kpi small { display: block; margin-top: 8px; color: var(--muted); }
.kpi.color-green { border-left-color: var(--green); }
.kpi.color-blue { border-left-color: var(--blue); }
.kpi.color-purple { border-left-color: var(--purple); }
.kpi.color-slate { border-left-color: #64748b; }

.card { background: white; border: 1px solid var(--border); border-radius: 14px; box-shadow: 0 2px 12px rgba(15,23,42,.04); overflow: hidden; }
.card-head { padding: 22px 24px; border-bottom: 1px solid var(--border); }
.card-head.row { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.card-head h3 { margin: 0; font-size: 17px; }
.card-head p { margin: 5px 0 0; color: var(--muted); font-size: 13px; }
.mt { margin-top: 22px; }
.mb { margin-bottom: 18px; }
.muted { color: var(--muted); }
.message { white-space: pre-wrap; font-family: inherit; color: var(--text); background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 14px; }

.tabs { display: flex; gap: 12px; align-items: center; }
.tabs button { border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--muted); font-weight: 800; padding: 10px 16px; }
.tabs button.active { color: var(--c-primary); border-bottom-color: var(--c-primary); }

.btn { border: 0; border-radius: 10px; padding: 11px 16px; font-weight: 800; display: inline-flex; align-items: center; justify-content: center; gap: 8px; }
.btn.primary { background: var(--c-primary); color: white; }
.btn.secondary { background: #edf2f7; color: #334155; }
.btn.danger { background: var(--red); color: white; }
.btn.green { background: var(--green); color: white; }
.btn.small { padding: 8px 12px; font-size: 12px; }
.btn.full { width: 100%; }

.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px 18px; border-bottom: 1px solid var(--border); text-align: left; vertical-align: middle; font-size: 14px; }
th { color: #64748b; text-transform: uppercase; font-size: 11px; letter-spacing: .04em; background: #f8fafc; }
td span { display: block; color: var(--muted); font-size: 12px; margin-top: 3px; }
.empty-cell, .empty { text-align: center; color: var(--muted); padding: 24px; }
.company-cell { display: flex; align-items: center; gap: 12px; }
.table-actions { display: flex; gap: 8px; }
.table-actions button { border: 0; width: 34px; height: 34px; border-radius: 8px; background: #f1f5f9; }
.progress-label { display: flex; justify-content: space-between; color: var(--muted); font-size: 12px; margin-bottom: 6px; }
.progress { height: 7px; background: #e2e8f0; border-radius: 99px; overflow: hidden; }
.progress i { display: block; height: 100%; background: var(--c-primary); }

.badge { display: inline-flex; align-items: center; white-space: nowrap; border-radius: 999px; padding: 4px 9px; font-size: 11px; font-weight: 800; background: #f1f5f9; color: #475569; }
.tone-green { background: #dcfce7; color: #15803d; }
.tone-blue { background: #dbeafe; color: #1d4ed8; }
.tone-purple { background: #ede9fe; color: #6d28d9; }
.tone-teal { background: #ccfbf1; color: #0f766e; }
.tone-amber { background: #fef3c7; color: #b45309; }
.tone-red { background: #fee2e2; color: #b91c1c; }
.tone-gray { background: #f1f5f9; color: #475569; }

.calendar { display: grid; grid-template-columns: repeat(7, 1fr); gap: 1px; background: var(--border); }
.calendar b { background: #f8fafc; padding: 12px; color: var(--muted); font-size: 12px; text-transform: uppercase; }
.day { min-height: 138px; background: white; padding: 10px; position: relative; }
.day.off { background: #f8fafc; }
.day-num { font-size: 12px; color: var(--muted); font-weight: 800; }
.event { width: 100%; border: 0; border-radius: 8px; padding: 8px; margin-top: 7px; text-align: left; color: white; background: var(--c-primary); }
.event strong, .event small { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.event.green { background: var(--green); }
.event.blue { background: var(--blue); }
.event.purple { background: var(--purple); }
.event.teal { background: var(--teal); }
.event.amber { background: var(--amber); }
.event.red { background: var(--red); }
.event.gray { background: #64748b; }

.kanban { display: grid; grid-template-columns: repeat(4, minmax(260px, 1fr)); gap: 18px; align-items: start; }
.kanban-col { background: #eef2f7; border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.kanban-col h3 { margin: 0; padding: 15px; display: flex; justify-content: space-between; align-items: center; font-size: 14px; }
.kanban-stack { padding: 12px; display: grid; gap: 12px; }
.task { background: white; border: 1px solid var(--border); border-left: 4px solid var(--c-primary); border-radius: 12px; padding: 14px; }
.task.done { opacity: .75; }
.task-top { display: flex; justify-content: space-between; gap: 8px; align-items: start; }
.task-title { font-weight: 800; margin: 12px 0 4px; }
.task small { color: var(--muted); }
.note { margin-top: 10px; background: #fff7ed; color: #9a3412; border: 1px solid #fed7aa; border-radius: 8px; padding: 8px; font-size: 12px; }
.task-actions { margin-top: 12px; display: grid; grid-template-columns: repeat(2, 1fr); gap: 7px; }
.task-actions button { border: 0; border-radius: 8px; padding: 8px; background: #f1f5f9; font-size: 12px; font-weight: 800; }


.crm-modal-pro { display: grid; grid-template-columns: 280px 1fr; gap: 22px; }
.crm-company-preview { background: linear-gradient(160deg, #0f172a, color-mix(in srgb, var(--c-primary) 45%, #111827)); color: white; border-radius: 18px; padding: 24px; min-height: 100%; box-shadow: 0 18px 45px rgba(15,23,42,.16); }
.crm-preview-logo { width: 98px; height: 98px; display: grid; place-items: center; background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.18); border-radius: 22px; margin-bottom: 18px; }
.crm-company-preview h3 { margin: 0 0 10px; font-size: 22px; line-height: 1.15; }
.crm-preview-data { display: grid; gap: 10px; margin: 24px 0; }
.crm-preview-data div { background: rgba(255,255,255,.10); border: 1px solid rgba(255,255,255,.12); border-radius: 14px; padding: 12px; }
.crm-preview-data span { display: block; color: #cbd5e1; font-size: 11px; text-transform: uppercase; font-weight: 900; letter-spacing: .04em; }
.crm-preview-data strong { display: block; margin-top: 4px; font-size: 18px; }
.crm-required-note { margin: 0; color: #e2e8f0; line-height: 1.45; font-size: 13px; }
.crm-form-pro { min-width: 0; }
.form-section-title { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.form-section-title > span { width: 34px; height: 34px; display: grid; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--c-primary) 12%, white); color: var(--c-primary); font-weight: 900; }
.form-section-title strong { display: block; font-size: 15px; }
.form-section-title small { display: block; color: var(--muted); margin-top: 2px; }
.mt-section { margin-top: 20px; padding-top: 18px; border-top: 1px dashed var(--border); }
.grid.three { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.input-error { border-color: var(--red) !important; box-shadow: 0 0 0 3px rgba(239,68,68,.12) !important; }
.form-error-box { background: #fee2e2; border: 1px solid #fecaca; color: #991b1b; padding: 12px 14px; border-radius: 12px; margin-bottom: 16px; font-weight: 700; }
.social-presence-pro { display: grid; gap: 14px; }
.social-selector-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.social-select-card { border: 1px solid var(--border); background: #fff; border-radius: 16px; padding: 14px; display: flex; align-items: center; gap: 12px; text-align: left; transition: .2s ease; }
.social-select-card:hover { transform: translateY(-1px); box-shadow: 0 10px 24px rgba(15,23,42,.08); border-color: color-mix(in srgb, var(--c-primary) 35%, var(--border)); }
.social-select-card.active { border-color: color-mix(in srgb, var(--c-primary) 50%, white); background: color-mix(in srgb, var(--c-primary) 6%, white); box-shadow: 0 12px 24px rgba(153,28,204,.10); }
.social-icon { width: 42px; height: 42px; border-radius: 14px; display: grid; place-items: center; background: #f8fafc; font-size: 20px; }
.social-copy { display: grid; flex: 1; }
.social-copy strong { font-size: 14px; color: #0f172a; }
.social-copy small { color: var(--muted); margin-top: 2px; }
.social-check { width: 28px; height: 28px; border-radius: 999px; display: grid; place-items: center; background: #f1f5f9; color: #64748b; font-weight: 900; }
.social-check.on { background: var(--c-primary); color: white; }
.followers-mini-list { display: flex; flex-wrap: wrap; gap: 8px; }
.followers-mini-list span { padding: 6px 10px; border-radius: 999px; background: #f8fafc; border: 1px solid var(--border); font-size: 12px; font-weight: 800; color: #334155; }
.mt-12 { margin-top: 12px; }
.logo-upload-pro { display: grid; grid-template-columns: 1fr auto; gap: 14px; align-items: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 14px; padding: 14px; }
.logo-empty-state { min-width: 160px; min-height: 76px; display: grid; place-items: center; border: 1px dashed var(--border); border-radius: 12px; color: var(--muted); font-weight: 800; }
.crm-actions-pro { align-items: center; border-top: 1px solid var(--border); padding-top: 16px; }
.save-hint { margin-right: auto; color: var(--muted); font-size: 12px; font-weight: 700; }
.btn:disabled { opacity: .55; cursor: not-allowed; }


.company-network-stack { display: grid; gap: 8px; min-width: 210px; }
.network-total-pill { display: inline-flex; align-items: baseline; gap: 6px; width: fit-content; padding: 7px 10px; border-radius: 999px; background: linear-gradient(135deg, color-mix(in srgb, var(--c-primary) 12%, white), #f8fafc); border: 1px solid color-mix(in srgb, var(--c-primary) 20%, var(--border)); }
.network-total-pill strong { color: var(--c-primary); }
.network-total-pill span { color: var(--muted); font-size: 11px; font-weight: 800; margin: 0; }
.followers-mini-list.premium span { box-shadow: 0 6px 14px rgba(15,23,42,.05); }

.company-detail-premium { display: grid; gap: 18px; }
.company-detail-hero { display: flex; align-items: center; gap: 16px; padding: 18px; border-radius: 18px; background: linear-gradient(135deg, #0f172a, color-mix(in srgb, var(--c-primary) 45%, #111827)); color: white; }
.company-detail-hero h2 { margin: 0 0 4px; }
.company-detail-hero p { margin: 0; color: #cbd5e1; }
.company-detail-hero .badge { margin-left: auto; }
.company-metric-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.company-metric-grid div { padding: 16px; border-radius: 16px; background: #f8fafc; border: 1px solid var(--border); }
.company-metric-grid span { display: block; color: var(--muted); font-size: 11px; text-transform: uppercase; font-weight: 900; margin-bottom: 7px; }
.company-metric-grid strong { font-size: 22px; }
.company-network-panel, .report-social-panel { padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.panel-title-line { display: flex; align-items: end; justify-content: space-between; gap: 14px; margin-bottom: 14px; }
.panel-title-line strong { font-size: 15px; text-transform: uppercase; letter-spacing: .03em; }
.panel-title-line span { color: var(--muted); font-size: 12px; }
.network-cards-row, .report-social-grid { display: grid; grid-template-columns: repeat(5, minmax(140px, 1fr)); gap: 12px; }
.network-card, .report-social-card { display: flex; align-items: center; gap: 12px; border: 1px solid var(--border); border-radius: 16px; padding: 14px; background: linear-gradient(180deg, #ffffff, #f8fafc); box-shadow: 0 10px 24px rgba(15,23,42,.05); }
.network-card-icon, .report-social-card > span { width: 42px; height: 42px; border-radius: 14px; background: color-mix(in srgb, var(--c-primary) 9%, white); display: grid; place-items: center; font-size: 20px; }
.network-card strong, .report-social-card strong { display: block; font-size: 18px; }
.network-card span, .report-social-card small { color: var(--muted); font-size: 12px; font-weight: 800; }
.compact-kpis { margin-top: 14px; grid-template-columns: repeat(1, minmax(220px, 340px)); }
.metricas-report-list { display: grid; gap: 4px; }
.metricas-report-list span { color: #334155; font-size: 12px; margin: 0; }


.servicios-pro-panel { display: grid; gap: 14px; }
.servicios-summary { display: grid; grid-template-columns: 1fr 1fr auto; gap: 12px; align-items: center; background: #f8fafc; border: 1px solid var(--border); border-radius: 16px; padding: 14px; }
.servicios-summary div { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 12px; }
.servicios-summary span { display: block; color: var(--muted); text-transform: uppercase; font-size: 11px; font-weight: 900; margin-bottom: 4px; }
.servicios-summary strong { font-size: 20px; }
.service-empty { border: 1px dashed var(--border); border-radius: 14px; padding: 18px; text-align: center; color: var(--muted); font-weight: 800; background: #fff; }
.servicios-list { display: grid; gap: 14px; }
.servicio-card { border: 1px solid var(--border); border-radius: 18px; padding: 16px; background: linear-gradient(180deg, #ffffff, #f8fafc); box-shadow: 0 10px 24px rgba(15,23,42,.05); }
.company-services-panel, .report-services-panel { padding: 18px; border: 1px solid var(--border); border-radius: 18px; background: #fff; }
.services-chip-list, .report-services-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.service-chip, .report-service-card { border: 1px solid var(--border); border-radius: 14px; padding: 14px; background: linear-gradient(180deg, #ffffff, #f8fafc); }
.service-chip strong, .report-service-card strong { display: block; color: #0f172a; margin-bottom: 6px; }
.service-chip span, .report-service-card span, .report-service-card small { display: block; color: var(--muted); font-size: 12px; }


.payment-schedule-pro { margin-top: 14px; padding: 16px; border: 1px solid var(--border); border-radius: 18px; background: linear-gradient(180deg, #ffffff, #f8fafc); }
.highlight-payment { border-color: color-mix(in srgb, var(--c-primary) 35%, var(--border)); box-shadow: 0 16px 34px rgba(153,28,204,.08); }
.payment-day-card { position: relative; border: 1px solid var(--border); border-radius: 16px; padding: 16px; background: #fff; box-shadow: 0 10px 22px rgba(15,23,42,.05); }
.payment-day-card .field { margin-bottom: 8px; }
.payment-day-card small { color: var(--muted); font-size: 12px; }
.payment-day-number { width: 34px; height: 34px; border-radius: 12px; display: grid; place-items: center; font-weight: 900; color: white; background: var(--c-primary); margin-bottom: 10px; }
.payment-days-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.small-copy { font-size: 12px; margin: 2px 0 0; }
.service-rule-note { border: 1px solid color-mix(in srgb, var(--c-primary) 18%, var(--border)); background: color-mix(in srgb, var(--c-primary) 6%, white); color: #334155; border-radius: 14px; padding: 12px 14px; font-size: 12px; font-weight: 800; }
.finance-modal-pro { display: grid; gap: 18px; }
.finance-hero-box { display: flex; justify-content: space-between; align-items: center; gap: 18px; padding: 18px; border-radius: 18px; color: white; background: linear-gradient(135deg, #0f172a, color-mix(in srgb, var(--c-primary) 50%, #111827)); box-shadow: 0 18px 40px rgba(15,23,42,.16); }
.finance-hero-box strong { display: block; font-size: 18px; }
.finance-hero-box span { display: block; color: #e2e8f0; margin-top: 4px; font-size: 13px; }
.finance-split-grid { display: grid; grid-template-columns: repeat(5, 1fr); gap: 12px; }
.split-card { border: 1px solid var(--border); border-radius: 16px; padding: 12px; background: #fff; }
.split-card span { display: block; font-size: 11px; color: var(--muted); text-transform: uppercase; font-weight: 900; margin-bottom: 8px; }
.split-card input { width: 100%; border: 1px solid var(--border); border-radius: 10px; padding: 10px; font-weight: 800; }
.split-card.highlight { border-color: color-mix(in srgb, var(--c-primary) 30%, var(--border)); background: color-mix(in srgb, var(--c-primary) 5%, white); }
.split-card.disabled { opacity: .55; background: #f1f5f9; }
.metrics-pro-header { display: flex; justify-content: space-between; gap: 18px; align-items: center; margin-bottom: 18px; padding: 18px; border-radius: 18px; color: white; background: linear-gradient(135deg, #0f172a, color-mix(in srgb, var(--c-primary) 50%, #111827)); }
.metrics-pro-header strong { display: block; font-size: 18px; }
.metrics-pro-header span { color: #e2e8f0; font-size: 13px; }
.metrics-totals-mini { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-end; }
.metrics-totals-mini span { background: rgba(255,255,255,.12); border: 1px solid rgba(255,255,255,.16); border-radius: 12px; padding: 10px; }
.metrics-grid-pro { align-items: stretch; }
.metric-card-pro { border-radius: 18px; box-shadow: 0 12px 28px rgba(15,23,42,.06); }
.metric-platform-head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.metric-platform-head strong { display: block; }
.metric-platform-head span { color: var(--muted); font-size: 12px; }
.platform-icon { width: 44px; height: 44px; border-radius: 14px; display: grid; place-items: center; background: color-mix(in srgb, var(--c-primary) 10%, white); font-size: 21px; }
.switch-mini { margin-left: auto; position: relative; display: inline-flex; align-items: center; }
.switch-mini input { display: none; }
.switch-mini i { width: 44px; height: 24px; border-radius: 999px; background: #cbd5e1; position: relative; transition: .2s; }
.switch-mini i:after { content: ""; width: 18px; height: 18px; border-radius: 999px; background: white; position: absolute; top: 3px; left: 3px; transition: .2s; box-shadow: 0 2px 6px rgba(15,23,42,.25); }
.switch-mini input:checked + i { background: var(--c-primary); }
.switch-mini input:checked + i:after { transform: translateX(20px); }

.azp-modal-layer { position: fixed; inset: 0; background: rgba(15, 23, 42, .55); display: flex; align-items: center; justify-content: center; padding: 24px; z-index: 1000; }
.azp-modal { width: 100%; background: white; border-radius: 16px; box-shadow: var(--shadow); max-height: 90vh; display: flex; flex-direction: column; }
.azp-modal-head { display: flex; align-items: center; justify-content: space-between; padding: 18px 22px; border-bottom: 1px solid var(--border); }
.azp-modal-head h3 { margin: 0; }
.azp-modal-head button { border: 0; background: #f1f5f9; width: 34px; height: 34px; border-radius: 9px; font-size: 22px; }
.azp-modal-body { padding: 22px; overflow: auto; }

.field { display: grid; gap: 7px; margin-bottom: 14px; }
.field span { font-size: 12px; font-weight: 800; text-transform: uppercase; color: #475569; }
.align-bottom { align-content: end; }
.grid.two { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.span-2 { grid-column: span 2; }
.actions { display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; }
.actions.two { display: grid; grid-template-columns: 1fr 1fr; }
.color-row { display: flex; gap: 8px; }
.color-row input[type="color"] { width: 50px; padding: 4px; }
.logo-preview { margin-top: 12px; background: #f8fafc; border: 1px solid var(--border); border-radius: 12px; padding: 14px; display: flex; align-items: center; gap: 14px; }
.logo-preview img { max-height: 90px; max-width: 240px; object-fit: contain; }
.logo-preview.small img { max-height: 58px; max-width: 120px; }

.mini-list { padding: 10px; }
.mini-row { display: flex; justify-content: space-between; align-items: center; gap: 14px; padding: 12px; border-bottom: 1px solid var(--border); }
.mini-row strong { display: block; }
.mini-row span { color: var(--muted); font-size: 12px; }

.report-controls { padding: 16px; display: flex; gap: 12px; align-items: center; margin-bottom: 18px; }
.report-controls select { max-width: 320px; }
.report-sheet { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 32px; }
.report-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid var(--border); padding-bottom: 20px; margin-bottom: 20px; }
.report-header h1 { color: var(--c-primary); margin: 0; }
.report-header h2 { margin: 6px 0; }
.report-kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 20px; }

.login-page { min-height: 100vh; display: grid; grid-template-columns: 1.15fr .95fr; background: #f8fafc; }
.login-left { position: relative; overflow: hidden; background: radial-gradient(circle at 20% 25%, #24205a 0, #111827 45%, #0b1223 100%); color: white; display: flex; align-items: center; padding: 70px; }
.glow { position: absolute; width: 420px; height: 420px; border-radius: 50%; background: color-mix(in srgb, var(--c-primary) 30%, transparent); filter: blur(70px); left: -120px; top: 140px; }
.login-copy { position: relative; max-width: 620px; }
.pill { display: inline-flex; border: 1px solid rgba(255,255,255,.25); border-radius: 999px; padding: 8px 16px; font-weight: 800; background: rgba(255,255,255,.12); }
.login-copy h1 { font-size: clamp(42px, 5vw, 62px); line-height: 1.05; margin: 32px 0 22px; letter-spacing: -.04em; }
.login-copy p { color: #cbd5e1; font-size: 19px; line-height: 1.6; max-width: 600px; }
.mock-panel { margin-top: 50px; width: min(560px, 100%); border: 1px solid rgba(255,255,255,.12); border-radius: 18px; background: rgba(255,255,255,.04); overflow: hidden; box-shadow: 0 30px 80px rgba(0,0,0,.25); }
.mock-dots { display: flex; gap: 8px; padding: 14px 18px; border-bottom: 1px solid rgba(255,255,255,.08); }
.mock-dots i { width: 10px; height: 10px; border-radius: 50%; background: #ef4444; }
.mock-dots i:nth-child(2) { background: #f59e0b; }
.mock-dots i:nth-child(3) { background: #10b981; }
.mock-body { display: flex; justify-content: space-between; align-items: end; padding: 32px; gap: 28px; }
.bars { display: flex; align-items: end; gap: 14px; height: 90px; }
.bars i { width: 34px; border-radius: 5px 5px 0 0; background: linear-gradient(180deg, #38bdf8, var(--c-primary)); }
.bars i:nth-child(1) { height: 45%; } .bars i:nth-child(2) { height: 72%; } .bars i:nth-child(3) { height: 55%; } .bars i:nth-child(4) { height: 92%; } .bars i:nth-child(5) { height: 66%; }
.score { display: flex; align-items: center; gap: 14px; background: rgba(0,0,0,.25); border-radius: 16px; padding: 18px; }
.score strong { width: 54px; height: 54px; border-radius: 50%; display: grid; place-items: center; border: 8px solid var(--c-primary); }
.score span { color: #cbd5e1; font-size: 13px; }
.login-right { display: grid; place-items: center; padding: 30px; }
.login-card { width: min(430px, 100%); background: white; border-radius: 24px; box-shadow: var(--shadow); padding: 42px; }
.login-logo { display: flex; justify-content: center; margin-bottom: 20px; }
.login-card h2, .login-card p { text-align: center; }
.login-card h2 { margin: 0 0 8px; font-size: 26px; }
.login-card p { margin: 0 0 28px; color: var(--muted); }
.login-btn { width: 100%; border: 0; border-radius: 11px; padding: 14px; background: var(--c-primary); color: white; font-weight: 900; margin-top: 10px; }
.error-box { background: #fee2e2; color: #991b1b; border: 1px solid #fecaca; padding: 12px; border-radius: 10px; margin-bottom: 14px; font-size: 13px; }

@media (max-width: 1100px) {
  .kpi-grid, .kanban { grid-template-columns: repeat(2, 1fr); }
  .login-page { grid-template-columns: 1fr; }
  .login-left { display: none; }
}

@media (max-width: 760px) {
  .sidebar { position: fixed; z-index: 10; height: 100vh; transform: translateX(0); }
  .content { padding: 18px; }
  .kpi-grid, .kanban, .grid.two, .grid.three, .crm-modal-pro, .report-kpis, .metrics-grid { grid-template-columns: 1fr; }
  .social-selector-grid { grid-template-columns: 1fr; }
  .network-cards-row, .report-social-grid, .company-metric-grid, .servicios-summary, .services-chip-list, .report-services-grid, .payment-days-grid, .finance-split-grid { grid-template-columns: 1fr; }
  .span-2 { grid-column: auto; }
  .topbar { padding: 0 14px; }
  .topbar-actions .sync { display: none; }
}


.alert-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; margin-bottom: 18px; }
.ops-alert, .role-alert { border-radius: 14px; padding: 15px 17px; border: 1px solid var(--border); background: white; box-shadow: 0 2px 12px rgba(15,23,42,.04); }
.ops-alert.today { border-left: 5px solid var(--blue); }
.ops-alert.danger, .ops-alert.amber { border-left: 5px solid var(--red); }
.ops-alert.amber { border-left-color: var(--amber); }
.role-alert { margin-bottom: 18px; border-left: 5px solid var(--purple); }
.role-alert.blue { border-left-color: var(--blue); }
.dashboard-panels { display: grid; grid-template-columns: 1fr 1fr; gap: 18px; }
.task.blocked { border-left-color: var(--red); background: #fffafa; }
.task-meta { display: grid; gap: 4px; margin-top: 10px; font-size: 12px; color: var(--muted); }
.task-meta .ok { color: #15803d; font-weight: 800; }
.task-meta .bad { color: #b91c1c; font-weight: 800; }
.danger-note { background: #fee2e2; color: #991b1b; border-color: #fecaca; }
.pauta-layout { display: grid; grid-template-columns: 1fr 280px; gap: 22px; }
.pauta-main { min-width: 0; }
.pauta-side { background: #f8fafc; border: 1px solid var(--border); border-radius: 16px; padding: 18px; }
.pauta-side h4 { margin: 0 0 6px; }
.pauta-side p { margin: 0 0 14px; color: var(--muted); font-size: 13px; }
.social-picker { display: grid; gap: 10px; }
.social-picker label { display: flex; align-items: center; gap: 10px; border: 1px solid var(--border); border-radius: 12px; padding: 12px; background: white; cursor: pointer; }
.social-picker label.selected { border-color: var(--c-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--c-primary) 12%, transparent); }
.social-picker input { width: auto; }
.pauta-note { margin-top: 16px; font-size: 12px; color: #475569; line-height: 1.45; background: #fff; border: 1px dashed var(--border); padding: 12px; border-radius: 12px; }
.premium-report { padding: 0; overflow: hidden; }
.report-hero { display: flex; justify-content: space-between; align-items: center; padding: 34px; background: linear-gradient(135deg, #0f172a, #26114a 55%, var(--c-primary)); color: white; }
.report-brand { display: flex; align-items: center; gap: 14px; }
.report-brand strong { display: block; font-size: 18px; }
.report-brand span { color: #d8e0ef; font-size: 12px; }
.report-title-box { text-align: right; }
.report-title-box span { font-size: 12px; letter-spacing: .12em; font-weight: 900; color: #e9d5ff; }
.report-title-box h1 { margin: 8px 0; color: white; }
.report-title-box p { margin: 0; color: #d8e0ef; }
.report-executive-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 14px; padding: 24px 34px; background: #f8fafc; }
.report-executive-grid div { background: white; border: 1px solid var(--border); border-radius: 14px; padding: 16px; }
.report-executive-grid span { display: block; color: var(--muted); font-size: 12px; font-weight: 800; text-transform: uppercase; }
.report-executive-grid strong { display: block; margin-top: 8px; font-size: 28px; }
.report-section-title { padding: 22px 34px 10px; font-size: 14px; font-weight: 900; color: var(--text); text-transform: uppercase; letter-spacing: .05em; }
.status-summary { display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; padding: 0 34px 24px; }
.status-summary div { border: 1px solid var(--border); border-radius: 12px; padding: 12px; display: grid; gap: 10px; }
.status-summary strong { font-size: 22px; }
.report-table-pro { margin: 0 34px 24px; width: calc(100% - 68px); border: 1px solid var(--border); border-radius: 14px; overflow: hidden; }
.report-warning { margin: 0 34px 30px; padding: 14px; background: #fff7ed; border: 1px solid #fed7aa; color: #9a3412; border-radius: 12px; font-weight: 700; }

@media print {
  .sidebar, .topbar, .report-controls { display: none !important; }
  .app-shell, .main, .content { display: block; height: auto; overflow: visible; padding: 0; }
  .report-sheet { border: 0; box-shadow: none; }
}
`;
