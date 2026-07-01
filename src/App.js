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
const isStaffUser = (user) => Boolean(user?.email && isAllowedUser(user.email));


const AZP_CRM_FINANZAS_V13 = true;

const monthKeyV13 = (date = new Date()) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;

const loadOperationalLedgerV13 = () => {
  try { return JSON.parse(localStorage.getItem("azp_operational_ledger_v13") || "{}"); }
  catch { return {}; }
};

const saveOperationalLedgerV13 = (value) => {
  localStorage.setItem("azp_operational_ledger_v13", JSON.stringify(value));
};

const OPERATIONAL_PAYMENTS_V13 = [
  { key: "gasolina", label: "Gasolina", amount: 700 },
  { key: "paloma", label: "Paloma", amount: 600 },
  { key: "jarek", label: "Jarek", amount: 250 },
];

const AZP_PUBLICACIONES_HISTORIAS_V12 = true;

const NETWORK_LABELS_V12 = {
  facebook: "Facebook",
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  youtube: "YouTube",
  "instagram story": "Instagram Story",
  "facebook story": "Facebook Story",
  "historia instagram": "Instagram Story",
  "historia facebook": "Facebook Story",
};

const normalizeNetworkV12 = (value = "") => {
  const raw = String(value || "").trim();
  const clean = raw.toLowerCase().replace(/\s+/g, " ");
  return NETWORK_LABELS_V12[clean] || raw;
};

const getNetworksV12 = (redes) => {
  if (Array.isArray(redes)) return redes.map(normalizeNetworkV12).filter(Boolean);

  if (typeof redes === "string") {
    try {
      const parsed = JSON.parse(redes);
      if (Array.isArray(parsed)) return parsed.map(normalizeNetworkV12).filter(Boolean);
    } catch {}

    return redes.split(/[,|]/).map(normalizeNetworkV12).filter(Boolean);
  }

  return [];
};

const isStoryNetworkV12 = (network = "") => /story|historia/i.test(String(network || ""));
const mainNetworksV12 = (pub) => getNetworksV12(pub?.redes).filter((r) => !isStoryNetworkV12(r));
const storyNetworksV12 = (pub) => getNetworksV12(pub?.redes).filter(isStoryNetworkV12);
const publicationUnitsV12 = (pub) => mainNetworksV12(pub).length || 1;
const storyTextV12 = (pub) => storyNetworksV12(pub).length ? storyNetworksV12(pub).join(", ") : "Sin historias";
const countByUnitsV12 = (items = [], predicate = () => true) =>
  items.reduce((sum, item) => sum + (predicate(item) ? publicationUnitsV12(item) : 0), 0);


const AZP_PRODUCTION_CONTROL_V10B = true;

const PRODUCTION_PERMISSION_DEFAULTS = {
  luis: { guion: true, diseno: true, aprobar: true, publicar: true, metricas: true },
  thalia: { guion: true, diseno: true, aprobar: true, publicar: true, metricas: true },
  paloma: { guion: true, diseno: false, aprobar: false, publicar: false, metricas: true },
  jarek: { guion: false, diseno: true, aprobar: false, publicar: false, metricas: false },
};

const normalizePersonKey = (value = "") => {
  const clean = String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  if (clean.includes("luis")) return "luis";
  if (clean.includes("thalia") || clean.includes("talia")) return "thalia";
  if (clean.includes("paloma")) return "paloma";
  if (clean.includes("jarek")) return "jarek";
  return clean.split("@")[0] || "staff";
};

const isLuisMasterUser = (user) => {
  const haystack = `${user?.name || ""} ${user?.email || ""}`.toLowerCase();
  return haystack.includes("luis");
};

const isDirectorOrAdminUser = (user) =>
  user?.role === "Administrador" || user?.role === "Directora" || isLuisMasterUser(user);

const loadProductionPermissions = () => {
  try {
    const saved = JSON.parse(localStorage.getItem("azp_production_permissions_v10b") || "{}");
    return {
      luis: { ...PRODUCTION_PERMISSION_DEFAULTS.luis, ...(saved.luis || {}) },
      thalia: { ...PRODUCTION_PERMISSION_DEFAULTS.thalia, ...(saved.thalia || {}) },
      paloma: { ...PRODUCTION_PERMISSION_DEFAULTS.paloma, ...(saved.paloma || {}) },
      jarek: { ...PRODUCTION_PERMISSION_DEFAULTS.jarek, ...(saved.jarek || {}) },
    };
  } catch {
    return PRODUCTION_PERMISSION_DEFAULTS;
  }
};

const saveProductionPermissions = (value) => {
  localStorage.setItem("azp_production_permissions_v10b", JSON.stringify(value));
};

const getProductionPermissionsForUser = (user, permissionsMap = loadProductionPermissions()) => {
  if (isDirectorOrAdminUser(user)) {
    return { guion: true, diseno: true, aprobar: true, publicar: true, metricas: true };
  }

  const key = normalizePersonKey(user?.email || user?.name || "");
  return permissionsMap[key] || { guion: false, diseno: false, aprobar: false, publicar: false, metricas: false };
};


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

const AZP_FIX_FINAL_EXACT = true;

export default function App() {
  const [user, setUser] = useState(null);
  const [loginError, setLoginError] = useState("");
  const [tab, setTab] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth > 760;
  });
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
      setSystemMessage("Primero registra una empresa para poder crear una publicación.");
      return;
    }

    const admin = isAdminRole(user);
    const isNew = !data.id;
    const materialMissing = Boolean(data.material_missing || data.sin_material || data.estado === "Falta Material Drive");
    const estadoSeguro = materialMissing
      ? "Falta Material Drive"
      : (admin ? (data.estado || "Guion Pendiente") : (isNew ? "Guion Pendiente" : data.estado || "Guion Pendiente"));

    const redes = Array.isArray(data.redes) ? data.redes : [];

    if (redes.length === 0) {
      setSystemMessage("Selecciona al menos una red social para esta publicación.");
      return;
    }

    const selectedEmpresa = empresas.find((e) => sameId(e.id, data.empresa_id));
    const notaMaterial = materialMissing
      ? `Sin material de apoyo reportado por ${user.name}. Paloma y administración deben revisar recursos para esta publicación.`
      : (data.notas || "");

    const payload = {
      empresa_id: normalizeId(data.empresa_id),
      empresa_nombre: selectedEmpresa?.nombre || data.empresa_nombre || "",
      fecha: dateOnly(data.fecha) || today(),
      redes,
      formato: data.formato || "Reel",
      tema: safeString(data.tema),
      copy: data.copy || "",
      objetivo: data.objetivo || "",
      material_drive: materialMissing ? "" : safeString(data.material_drive),
      prioridad: data.prioridad || "Media",
      notas_internas: data.notas_internas || "",
      estado: estadoSeguro,
      notas: notaMaterial,
      creado_por: data.creado_por || user.name,
      disenado_por: estadoSeguro === "En Diseño" ? (data.disenado_por || user.name) : (data.disenado_por || ""),
      aprobado_por: data.aprobado_por || "",
      publicado_por: data.publicado_por || "",
      metricas: data.metricas || null,
    };

    const response = data.id
      ? await supabase.from("calendario").update(payload).eq("id", data.id).select().single()
      : await supabase.from("calendario").insert([payload]).select().single();

    if (response.error) {
      setSystemMessage(`ERROR AL GUARDAR PUBLICACIÓN:

${response.error.message}`);
    } else {
      setModalPub(null);
      const avisoPrioridad = ["Alta", "Urgente"].includes(payload.prioridad) ? `\n\n⚡ Prioridad ${payload.prioridad}: aparecerá en alertas operativas.` : "";
      const avisoMaterial = materialMissing ? `\n\n📁 Se registró como publicación sin material. Aparecerá en alertas para Paloma y administración.` : "";
      if (avisoPrioridad || avisoMaterial) setSystemMessage(`Publicación guardada correctamente.${avisoPrioridad}${avisoMaterial}`);
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
    const staff = isStaffUser(user);

    const current = calendario.find((p) => sameId(p.id, id));
    if (!current) {
      setSystemMessage("No encontré esta publicación en el calendario.");
      return;
    }

    const requiereAdmin = ["Aprobado", "Publicado", "Corrección"].includes(estado);
    const requiereDiseno = ["En Diseño", "Falta Material Drive", "Diseño Concluido"].includes(estado);
    const ownerDiseno = current.disenado_por || "";

    if (requiereAdmin && !admin) {
      setSystemMessage("Solo Thalia o Luis pueden aprobar, rechazar o marcar una publicación como publicada.");
      return;
    }

    if (requiereDiseno && !staff) {
      setSystemMessage("Solo el staff autorizado puede mover una publicación en producción/diseño.");
      return;
    }

    if (estado === "En Diseño" && current.estado === "En Diseño" && ownerDiseno && ownerDiseno !== user.name && !admin) {
      setSystemMessage(`🚨 Este diseño ya fue tomado por ${ownerDiseno}. Solo esa persona o administración puede moverlo.`);
      return;
    }

    if (estado === "Diseño Concluido" && ownerDiseno && ownerDiseno !== user.name && !admin) {
      setSystemMessage(`🚨 Este diseño lo debe terminar ${ownerDiseno}. Si no puede, Thalia o Luis pueden culminarlo.`);
      return;
    }

    const payload = { estado, ...extra };

    if (estado === "Falta Material Drive") {
      payload.material_drive = "";
      payload.notas = extra.notas || `Sin material de apoyo reportado por ${user.name}. Paloma y administración deben revisar recursos para esta publicación.`;
    }

    if (estado === "En Diseño") {
      payload.disenado_por = ownerDiseno || user.name;
      if (current.estado === "Falta Material Drive" && !extra.notas) payload.notas = "Material revisado. Listo para continuar diseño.";
    }

    if (estado === "Diseño Concluido") {
      payload.disenado_por = ownerDiseno || user.name;
      if (current.estado === "Corrección") payload.notas = "";
    }

    // AZP_V6_CLEAR_CORRECTION_NOTE
    if (["Diseño Concluido", "Aprobado", "Publicado"].includes(estado) && /error|errores|correcci/i.test(String(current.notas || ""))) {
      payload.notas = "";
    }

    
    // AZP_FIX_FLUJO_DISENO_CORRECTO
    if (estado === "Diseño Concluido") {
      payload.disenado_por = current.disenado_por || current.disenador || user.name;
      if (/error|errores|sin material|material/i.test(String(current.notas || ""))) {
        payload.notas = "";
      }
    }

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
    if (!isStaffUser(user)) {
      setSystemMessage("🚨 Solo el staff autorizado puede capturar métricas.");
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

  const deletePublication = async (pub) => {
    if (!isLuisMasterUser(user)) {
      setSystemMessage("Solo Luis Enrique puede eliminar publicaciones.");
      return;
    }

    const empresa = empresas.find((e) => sameId(e.id, pub.empresa_id));
    const label = `${empresa?.nombre || pub.empresa_nombre || "Sin empresa"} - ${pub.tema || pub.formato || "Publicación"}`;

    if (!window.confirm(`¿Eliminar definitivamente esta publicación?\n\n${label}\n\nEsta acción no se puede deshacer.`)) {
      return;
    }

    const { error } = await supabase.from("calendario").delete().eq("id", pub.id);

    if (error) {
      setSystemMessage(`ERROR AL ELIMINAR PUBLICACIÓN: ${error.message}`);
      return;
    }

    setSystemMessage("Publicación eliminada correctamente.");
    await fetchCloudData();
  };

  const canCreatePauta = isStaffUser(user);

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

        <nav onClick={(e) => {
          if (typeof window !== "undefined" && window.innerWidth <= 760 && e.target.closest("button")) {
            setSidebarOpen(false);
          }
        }}>
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
          {tab === "calendario" && <CalendarioView calendario={calendario} getEmpresa={getEmpresa} setModalPub={setModalPub} setModalMetricas={setModalMetricas} 
              updatePubState={updatePubState}
              user={user}/>}
          {tab === "produccion" && (
            <ProduccionView
              calendario={calendario}
              getEmpresa={getEmpresa}
              updatePubState={updatePubState}
              setModalPub={setModalPub}
              setModalRechazo={setModalRechazo}
              setModalMetricas={setModalMetricas}
              deletePublication={deletePublication}
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
      {modalFin !== null ? <ModalFinanza initial={modalFin} empresas={empresas} finanzas={finanzas} onSave={saveFinanza} onClose={() => setModalFin(null)} /> : null}
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
  const faltanMaterial = calendario.filter((p) => p.estado === "Guion Pendiente").slice(0, 8);

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
            <div className="ops-alert amber"><strong>📁 Material opcional:</strong> {stats.faltaMaterial} publicación(es) bloqueadas por falta de material en Drive.</div>
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
          <strong>🎨 Guiones listos para diseño:</strong> tienes {stats.guionesListosDiseno} publicación(es) con guion creado. Revisa quién lo creó y si hay material de apoyo opcional.
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
            <div className="card-head"><h3>Bloqueos y atrasos</h3><p>Material opcional pendiente o publicaciones que no se cumplieron.</p></div>
            <div className="mini-list">
              {faltanMaterial.map((p) => (<AlertMiniRow key={`m-${p.id}`} p={p} tone="red" label="Material opcional" />))}
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
                <Badge tone={p.material_drive ? "purple" : "red"}>{p.material_drive ? "Con material" : "Material opcional"}</Badge>
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
              const pubsMesItems = calendario.filter((c) => sameId(c.empresa_id, emp.id) && String(c.fecha || "").startsWith(curMonthStr()));
              const pubsMes = typeof countByUnitsV12 === "function" ? countByUnitsV12(pubsMesItems) : pubsMesItems.length;
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


function CalendarioView({ calendario, getEmpresa, setModalPub, setModalMetricas, updatePubState, user }) {
  const now = new Date();
  const [viewDate, setViewDate] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState(dateOnly(now.toISOString()));
  const [empresaFiltro, setEmpresaFiltro] = useState("__all");
  const [estadoFiltro, setEstadoFiltro] = useState("__all");

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const pad = (n) => String(n).padStart(2, "0");
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
  const cells = Array.from({ length: totalCells });
  const monthStart = `${year}-${pad(month + 1)}-01`;
  const monthEnd = `${year}-${pad(month + 1)}-${pad(daysInMonth)}`;

  const meses = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const normalizeCalendarStatus = (estado) => {
    if (["Falta Material Drive", "Material opcional pendiente", "Cliente no envió material"].includes(estado)) return "Guion Pendiente";
    return estado || "Guion Pendiente";
  };

  const statusLabel = (p) => {
    if (p.estado === "Cliente no envió material") return "Cliente no envió material";
    if (!hasMaterialDrive(p) && normalizeCalendarStatus(p.estado) !== "Publicado") return "Material pendiente";
    return normalizeCalendarStatus(p.estado);
  };

  const persona = normalizePersonKey(user?.email || user?.name || "");
  const isPaloma = persona === "paloma";
  const isJarek = persona === "jarek";
  const isThalia = persona === "thalia";
  const isLuis = isLuisMasterUser(user);

  const empresaOptions = Array.from(
    new Map(
      calendario.map((p) => {
        const emp = getEmpresa(p.empresa_id);
        const id = p.empresa_id || emp?.id || p.empresa_nombre || "sin";
        const nombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
        return [String(id), { id, nombre }];
      })
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const monthItems = calendario
    .filter((p) => {
      const fecha = dateOnly(p.fecha);
      const emp = getEmpresa(p.empresa_id);
      const empresaId = String(p.empresa_id || emp?.id || p.empresa_nombre || "sin");
      const estado = normalizeCalendarStatus(p.estado);

      const inMonth = fecha >= monthStart && fecha <= monthEnd;
      const byEmpresa = empresaFiltro === "__all" || empresaId === String(empresaFiltro);
      const byEstado =
        estadoFiltro === "__all" ||
        estado === estadoFiltro ||
        (estadoFiltro === "Sin material" && (p.estado === "Cliente no envió material" || (!hasMaterialDrive(p) && estado !== "Publicado")));

      return inMonth && byEmpresa && byEstado;
    })
    .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));

  const selectedItems = monthItems.filter((p) => dateOnly(p.fecha) === selectedDate);

  const stats = {
    total: countByUnitsV12(monthItems),
    guion: countByUnitsV12(monthItems, (p) => normalizeCalendarStatus(p.estado) === "Guion Pendiente"),
    diseno: countByUnitsV12(monthItems, (p) => ["En Diseño", "Corrección"].includes(normalizeCalendarStatus(p.estado))),
    revision: countByUnitsV12(monthItems, (p) => normalizeCalendarStatus(p.estado) === "Diseño Concluido"),
    publicadas: countByUnitsV12(monthItems, (p) => normalizeCalendarStatus(p.estado) === "Publicado"),
    sinMaterial: countByUnitsV12(monthItems, (p) => p.estado === "Cliente no envió material" || (!hasMaterialDrive(p) && normalizeCalendarStatus(p.estado) !== "Publicado")),
  };

  const monthName = `${meses[month]} ${year}`;

  const goMonth = (offset) => {
    setViewDate((prev) => {
      const next = new Date(prev.getFullYear(), prev.getMonth() + offset, 1);
      setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`);
      return next;
    });
  };

  const goToday = () => {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(dateOnly(today.toISOString()));
  };

  const setMonth = (newMonth) => {
    const next = new Date(year, Number(newMonth), 1);
    setViewDate(next);
    setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`);
  };

  const setYear = (newYear) => {
    const cleanYear = Number(newYear || year);
    if (cleanYear >= 2020 && cleanYear <= 2035) {
      const next = new Date(cleanYear, month, 1);
      setViewDate(next);
      setSelectedDate(`${next.getFullYear()}-${pad(next.getMonth() + 1)}-01`);
    }
  };

  const markNoMaterial = (p) => {
    if (!updatePubState) return;
    if (window.confirm("¿Marcar esta publicación como CLIENTE NO ENVIÓ MATERIAL? Se verá en calendario y estadísticas como material pendiente.")) {
      updatePubState(p.id, "Cliente no envió material");
    }
  };

  const handleCalendarClick = (p) => {
    const estado = normalizeCalendarStatus(p.estado);
    const materialOk = hasMaterialDrive(p);

    if (isPaloma) {
      if (estado === "Publicado") {
        if (setModalMetricas) setModalMetricas(p);
        return;
      }

      window.alert("NO HAY MÉTRICAS PENDIENTES. Las métricas solo se capturan cuando la publicación ya está marcada como Publicado.");
      return;
    }

    if (isJarek) {
      if (estado === "Guion Pendiente") {
        if (!materialOk || p.estado === "Cliente no envió material") {
          window.alert("Esta publicación todavía no puede pasar a diseño porque el cliente no ha enviado el material.");
          return;
        }

        if (window.confirm("¿DESEAS TOMAR ESTA PUBLICACIÓN PARA DISEÑAR?")) {
          updatePubState(p.id, "En Diseño");
        }
        return;
      }

      setModalPub(p);
      return;
    }

    if (isThalia && estado === "Diseño Concluido") {
      if (window.confirm("¿DESEA REVISAR LA PUBLICACIÓN ANTES DE APROBARLA?")) {
        setModalPub(p);
      }
      return;
    }

    if (isLuis && estado === "Publicado" && setModalMetricas) {
      setModalMetricas(p);
      return;
    }

    setModalPub(p);
  };

  const getDayItems = (dateStr) => monthItems.filter((p) => dateOnly(p.fecha) === dateStr);

  const renderPublicationMini = (p) => {
    const emp = getEmpresa(p.empresa_id);
    const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
    const label = statusLabel(p);
    const urgent = ["Alta", "Urgente"].includes(p.prioridad);
    const noMaterial = p.estado === "Cliente no envió material" || (!hasMaterialDrive(p) && normalizeCalendarStatus(p.estado) !== "Publicado");

    return (
      <button
        type="button"
        className={`calendar-v11-mini ${toneForState(normalizeCalendarStatus(p.estado))} ${noMaterial ? "no-material" : ""}`}
        key={p.id}
        onClick={(e) => {
          e.stopPropagation();
          handleCalendarClick(p);
        }}
      >
        <strong>{empresaNombre}</strong>
        <span>{p.tema || p.formato || "Publicación"}</span>
        <em>{urgent ? "Urgente · " : ""}{label}</em>
      </button>
    );
  };

  return (
    <div className="fade calendar-v11-page">
      <div className="calendar-v11-hero">
        <div>
          <span>Calendario profesional</span>
          <h2>{monthName}</h2>
          <p>Vista editorial por día, estado y responsable. Desde aquí se pueden revisar publicaciones, tomar diseño, capturar métricas y marcar material no recibido.</p>
        </div>

        <div className="calendar-v11-controls">
          <button type="button" onClick={() => goMonth(-1)}>Anterior</button>
          <button type="button" onClick={goToday}>Hoy</button>
          <button type="button" onClick={() => goMonth(1)}>Siguiente</button>
          <select value={month} onChange={(e) => setMonth(e.target.value)}>
            {meses.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
          </select>
          <input type="number" min="2020" max="2035" value={year} onChange={(e) => setYear(e.target.value)} />
        </div>
      </div>

      <div className="calendar-v11-stats">
        <div><strong>{stats.total}</strong><span>Total</span></div>
        <div><strong>{stats.guion}</strong><span>Guiones</span></div>
        <div><strong>{stats.diseno}</strong><span>Diseño</span></div>
        <div><strong>{stats.revision}</strong><span>Revisión</span></div>
        <div><strong>{stats.publicadas}</strong><span>Publicadas</span></div>
        <div><strong>{stats.sinMaterial}</strong><span>Sin material</span></div>
      </div>

      <div className="calendar-v11-filters">
        <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="__all">Todas las empresas</option>
          {empresaOptions.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
          <option value="__all">Todos los estados</option>
          <option value="Guion Pendiente">Guiones pendientes</option>
          <option value="En Diseño">En diseño</option>
          <option value="Diseño Concluido">Diseño concluido</option>
          <option value="Publicado">Publicadas</option>
          <option value="Sin material">Sin material</option>
        </select>
      </div>

      <div className="calendar-v11-layout">
        <section className="calendar-v11-board">
          <div className="calendar-v11-weekdays">
            {["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"].map((d) => <b key={d}>{d}</b>)}
          </div>

          <div className="calendar-v11-grid">
            {cells.map((_, idx) => {
              const day = idx - firstDay + 1;
              const valid = day >= 1 && day <= daysInMonth;
              const dateStr = valid ? `${year}-${pad(month + 1)}-${pad(day)}` : "";
              const items = valid ? getDayItems(dateStr) : [];
              const isSelected = valid && selectedDate === dateStr;
              const isToday = valid && dateOnly(new Date().toISOString()) === dateStr;
              const preview = items.slice(0, 3);
              const hidden = Math.max(items.length - preview.length, 0);

              return (
                <button
                  type="button"
                  className={`calendar-v11-day ${valid ? "" : "empty"} ${isSelected ? "selected" : ""} ${isToday ? "today" : ""}`}
                  key={idx}
                  onClick={() => valid && setSelectedDate(dateStr)}
                  disabled={!valid}
                >
                  {valid ? (
                    <>
                      <div className="calendar-v11-daytop">
                        <strong>{day}</strong>
                        {items.length ? <span>{items.length}</span> : null}
                      </div>
                      <div className="calendar-v11-dayitems">
                        {preview.map(renderPublicationMini)}
                        {hidden > 0 ? <small>+ {hidden} más</small> : null}
                      </div>
                    </>
                  ) : null}
                </button>
              );
            })}
          </div>
        </section>

        <aside className="calendar-v11-agenda">
          <div className="calendar-v11-agenda-head">
            <span>Detalle del día</span>
            <h3>{selectedDate}</h3>
            <p>{selectedItems.length} publicación(es)</p>
          </div>

          <div className="calendar-v11-agenda-list">
            {selectedItems.map((p) => {
              const emp = getEmpresa(p.empresa_id);
              const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
              const estado = normalizeCalendarStatus(p.estado);
              const noMaterial = p.estado === "Cliente no envió material" || (!hasMaterialDrive(p) && estado !== "Publicado");

              return (
                <article className={`calendar-v11-agenda-card ${noMaterial ? "no-material" : ""}`} key={p.id}>
                  <div className="agenda-v11-top">
                    <strong>{empresaNombre}</strong>
                    <small>{statusLabel(p)}</small>
                  </div>
                  <h4>{p.tema || "Publicación sin título"}</h4>
                  <p>{p.formato || "Contenido"} · {redesText(p.redes)}</p>
                  <div className="publication-units-v12">
                    Cuenta como <strong>{publicationUnitsV12(p)}</strong> publicación(es) del paquete.
                    {storyNetworksV12(p).length ? <span>Historias: {storyTextV12(p)}</span> : null}
                  </div>

                  <div className="agenda-v11-actions">
                    <button type="button" onClick={() => handleCalendarClick(p)}>
                      {isPaloma && estado === "Publicado" ? "Capturar métricas" : isJarek && estado === "Guion Pendiente" ? "Tomar diseño" : "Abrir"}
                    </button>
                    {estado !== "Publicado" && !hasMaterialDrive(p) && p.estado !== "Cliente no envió material" ? (
                      <button type="button" className="material-action" onClick={() => markNoMaterial(p)}>
                        Marcar: cliente no envió material
                      </button>
                    ) : null}

                    {estado !== "Publicado" && p.estado === "Cliente no envió material" ? (
                      <div className="material-marked-v12">Marcado como cliente no envió material</div>
                    ) : null}
                  </div>
                </article>
              );
            })}

            {!selectedItems.length ? (
              <div className="calendar-v11-empty">
                <strong>No hay publicaciones este día</strong>
                <span>Selecciona otro día o cambia los filtros para revisar el calendario.</span>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </div>
  );
}



function ProduccionView({ calendario, getEmpresa, updatePubState, setModalPub, setModalRechazo, setModalMetricas, deletePublication, user }) {
  const [query, setQuery] = useState("");
  const [empresaFiltro, setEmpresaFiltro] = useState("__all");
  const [estadoFiltro, setEstadoFiltro] = useState("__all");
  const [permissionsMap, setPermissionsMap] = useState(() => loadProductionPermissions());

  const isAdmin = isDirectorOrAdminUser(user);
  const isLuis = isLuisMasterUser(user);
  const myPermissions = getProductionPermissionsForUser(user, permissionsMap);

  const updatePermission = (person, key) => {
    if (!isLuis) return;
    const next = {
      ...permissionsMap,
      [person]: {
        ...(permissionsMap[person] || PRODUCTION_PERMISSION_DEFAULTS[person]),
        [key]: !(permissionsMap[person]?.[key] ?? PRODUCTION_PERMISSION_DEFAULTS[person]?.[key]),
      },
    };
    setPermissionsMap(next);
    saveProductionPermissions(next);
  };

  const empresaOptions = Array.from(
    new Map(
      calendario.map((p) => {
        const emp = getEmpresa(p.empresa_id);
        const id = p.empresa_id || emp?.id || p.empresa_nombre || "sin";
        const nombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
        return [String(id), { id, nombre }];
      })
    ).values()
  ).sort((a, b) => a.nombre.localeCompare(b.nombre));

  const normalizeEstado = (estado) => {
    if (["Falta Material Drive", "Material opcional pendiente", "Cliente no envió material"].includes(estado)) return "Guion Pendiente";
    return estado || "Guion Pendiente";
  };

  const visible = calendario
    .filter((p) => {
      const emp = getEmpresa(p.empresa_id);
      const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
      const haystack = `${empresaNombre} ${p.tema || ""} ${p.formato || ""} ${p.estado || ""} ${p.prioridad || ""}`.toLowerCase();
      const matchQuery = !query.trim() || haystack.includes(query.trim().toLowerCase());
      const matchEmpresa = empresaFiltro === "__all" || String(p.empresa_id || emp?.id || p.empresa_nombre) === String(empresaFiltro);
      const matchEstado = estadoFiltro === "__all" || normalizeEstado(p.estado) === estadoFiltro;
      return matchQuery && matchEmpresa && matchEstado;
    })
    .sort((a, b) => String(a.fecha || "").localeCompare(String(b.fecha || "")));

  const columns = [
    { key: "guion", title: "Guiones pendientes", states: ["Guion Pendiente"] },
    { key: "diseno", title: "En diseño", states: ["En Diseño", "Corrección"] },
    { key: "revision", title: "Revisión", states: ["Diseño Concluido"] },
    { key: "publicado", title: "Aprobadas / Publicadas", states: ["Aprobado", "Publicado"] },
  ];

  const stats = {
    total: visible.length,
    guiones: visible.filter((p) => normalizeEstado(p.estado) === "Guion Pendiente").length,
    diseno: visible.filter((p) => ["En Diseño", "Corrección"].includes(normalizeEstado(p.estado))).length,
    revision: visible.filter((p) => normalizeEstado(p.estado) === "Diseño Concluido").length,
    publicadas: visible.filter((p) => normalizeEstado(p.estado) === "Publicado").length,
    sinMaterial: visible.filter((p) => !hasMaterialDrive(p) && normalizeEstado(p.estado) !== "Publicado").length,
  };

  const canFinishDesign = (p) => {
    if (isAdmin) return true;
    const owner = normalizePersonKey(p.disenado_por || p.disenador || "");
    const me = normalizePersonKey(user?.email || user?.name || "");
    return myPermissions.diseno && owner && owner === me;
  };

  const takeDesign = (p) => {
    if (!myPermissions.diseno) return;
    updatePubState(p.id, "En Diseño");
  };

  const returnToScript = (p) => {
    if (!isAdmin) return;
    updatePubState(p.id, "Guion Pendiente");
  };

  const openMetrics = (p) => {
    if (setModalMetricas) setModalMetricas(p);
  };

  const renderCard = (p) => {
    const emp = getEmpresa(p.empresa_id);
    const empresaNombre = emp?.nombre || p.empresa_nombre || "Sin empresa";
    const estado = normalizeEstado(p.estado);
    const materialOk = hasMaterialDrive(p);
    const urgent = ["Alta", "Urgente"].includes(p.prioridad);
    const designOwner = p.disenado_por || p.disenador || "";
    const hasCorrectionNote = /error|errores|correcci/i.test(String(p.notas || ""));

    return (
      <article className={`production-card-v10b ${toneForState(estado)} ${!materialOk && estado !== "Publicado" ? "missing-material" : ""}`} key={p.id}>
        <div className="production-card-v10b-top">
          <div>
            <strong>{empresaNombre}</strong>
            <span>{p.fecha} · {p.formato || "Publicación"}</span>
          </div>
          <small>{estado}</small>
        </div>

        <h4>{p.tema || "Publicación sin título"}</h4>
        <p>{redesText(p.redes)}</p>
        <div className="publication-units-v12 compact">
          Cuenta como <strong>{publicationUnitsV12(p)}</strong> publicación(es)
          {storyNetworksV12(p).length ? <span> · Historias: {storyTextV12(p)}</span> : null}
        </div>

        <div className="production-card-v10b-tags">
          {urgent ? <span className="tag-priority">Prioridad {p.prioridad}</span> : null}
          {!materialOk && estado !== "Publicado" ? <span className="tag-danger">Material pendiente</span> : <span>Material listo</span>}
          {designOwner && estado !== "Guion Pendiente" ? <span>Diseño: {designOwner}</span> : null}
          {p.creado_por ? <span>Guion: {p.creado_por}</span> : null}
        </div>

        {hasCorrectionNote ? <div className="production-note-v10b">{p.notas}</div> : null}

        <div className="production-actions-v10b">
          <button type="button" onClick={() => setModalPub(p)}>Ver / Editar</button>

          {estado === "Guion Pendiente" && myPermissions.diseno ? (
            <button type="button" onClick={() => takeDesign(p)}>Tomar diseño</button>
          ) : null}

          {["En Diseño", "Corrección"].includes(estado) && canFinishDesign(p) ? (
            <button type="button" onClick={() => updatePubState(p.id, "Diseño Concluido")}>Terminar diseño</button>
          ) : null}

          {["En Diseño", "Corrección", "Diseño Concluido"].includes(estado) && isAdmin ? (
            <button type="button" onClick={() => returnToScript(p)}>Regresar a guion</button>
          ) : null}

          {estado === "Diseño Concluido" && myPermissions.aprobar ? (
            <>
              <button type="button" onClick={() => updatePubState(p.id, "Aprobado")}>Aprobar</button>
              <button type="button" onClick={() => setModalRechazo(p)}>Enviar corrección</button>
            </>
          ) : null}

          {estado === "Aprobado" && myPermissions.publicar ? (
            <button type="button" onClick={() => updatePubState(p.id, "Publicado")}>Marcar publicado</button>
          ) : null}

          {estado === "Publicado" && myPermissions.metricas ? (
            <button type="button" onClick={() => openMetrics(p)}>{p.metricas ? "Editar métricas" : "Capturar métricas"}</button>
          ) : null}

          {isLuis && deletePublication ? (
            <button className="danger-action" type="button" onClick={() => deletePublication(p)}>Eliminar</button>
          ) : null}
        </div>
      </article>
    );
  };

  return (
    <div className="fade production-v10b-page">
      <div className="production-v10b-header">
        <div>
          <span>Centro de producción</span>
          <h2>Flujo de publicaciones</h2>
          <p>Control por etapa, responsable y prioridad. Administración puede regresar piezas a guion. Solo Luis puede eliminar publicaciones.</p>
        </div>
        <div className="production-v10b-kpis">
          <div><strong>{stats.total}</strong><small>Total</small></div>
          <div><strong>{stats.guiones}</strong><small>Guiones</small></div>
          <div><strong>{stats.diseno}</strong><small>Diseño</small></div>
          <div><strong>{stats.revision}</strong><small>Revisión</small></div>
          <div><strong>{stats.publicadas}</strong><small>Publicadas</small></div>
          <div><strong>{stats.sinMaterial}</strong><small>Sin material</small></div>
        </div>
      </div>

      {isLuis ? (
        <div className="permissions-v10b card">
          <div className="permissions-v10b-head">
            <strong>Permisos operativos</strong>
            <span>Activa o desactiva qué pueden hacer Paloma y Jarek. Por defecto Paloma no puede tomar diseño.</span>
          </div>

          {["paloma", "jarek"].map((person) => (
            <div className="permission-person-v10b" key={person}>
              <b>{person === "paloma" ? "Paloma" : "Jarek"}</b>
              {[
                ["guion", "Crear / mover guion"],
                ["diseno", "Tomar / terminar diseño"],
                ["aprobar", "Aprobar"],
                ["publicar", "Publicar"],
                ["metricas", "Capturar métricas"],
              ].map(([key, label]) => (
                <label key={key}>
                  <input
                    type="checkbox"
                    checked={Boolean(permissionsMap[person]?.[key])}
                    onChange={() => updatePermission(person, key)}
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          ))}
        </div>
      ) : null}

      <div className="production-filters-v10b card">
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por cliente, título, formato o estado..." />
        <select value={empresaFiltro} onChange={(e) => setEmpresaFiltro(e.target.value)}>
          <option value="__all">Todas las empresas</option>
          {empresaOptions.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <select value={estadoFiltro} onChange={(e) => setEstadoFiltro(e.target.value)}>
          <option value="__all">Todos los estados</option>
          <option value="Guion Pendiente">Guion pendiente</option>
          <option value="En Diseño">En diseño</option>
          <option value="Corrección">Corrección</option>
          <option value="Diseño Concluido">Diseño concluido</option>
          <option value="Aprobado">Aprobado</option>
          <option value="Publicado">Publicado</option>
        </select>
      </div>

      <div className="production-board-v10b">
        {columns.map((col) => {
          const items = visible.filter((p) => col.states.includes(normalizeEstado(p.estado)));
          return (
            <section className="production-column-v10b" key={col.key}>
              <div className="production-column-v10b-head">
                <strong>{col.title}</strong>
                <span>{items.length}</span>
              </div>
              <div className="production-column-v10b-body">
                {items.map(renderCard)}
                {!items.length ? <div className="production-empty-v10b">Sin publicaciones en esta etapa.</div> : null}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}



function FinanzasView({ finanzas, empresas, setModalFin, agencia, getEmpresa }) {
  const [operationalLedgerV13, setOperationalLedgerV13] = useState(() => loadOperationalLedgerV13());
  const currentMonthV13 = monthKeyV13();
  const currentLedgerV13 = operationalLedgerV13[currentMonthV13] || {};
  const setOperationalPaidV13 = (key, value) => {
    const next = {
      ...operationalLedgerV13,
      [currentMonthV13]: {
        ...(operationalLedgerV13[currentMonthV13] || {}),
        [key]: value ? new Date().toISOString() : null,
      },
    };
    setOperationalLedgerV13(next);
    saveOperationalLedgerV13(next);
  };

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
        <button className={subTab === "Registro" ? "active" : ""} onClick={() => setSubTab("Registro")} type="button">Ingresos y distribución</button>
      </div>

      {subTab === "Registro" ? (
        <>
          <div className="kpi-grid">
            <KpiCard title="Ingreso Bruto" value={mx(totals.pago)} color="green" />
            <KpiCard title="Pago Jarek" value={mx(totals.jarek)} color="slate" />
            <KpiCard title="Pago Paloma" value={mx(totals.paloma)} color="slate" />
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
            
            <div className="ops-v13-panel">
              <div>
                <h3>Pagos operativos por liquidar</h3>
                <p>Control mensual de conceptos que solo deben incluirse una vez por mes cuando registres pagos en partes.</p>
              </div>
              <div className="ops-v13-grid">
                {OPERATIONAL_PAYMENTS_V13.map((item) => {
                  const paid = Boolean(currentLedgerV13[item.key]);
                  return (
                    <div className={`ops-v13-item ${paid ? "paid" : "pending"}`} key={item.key}>
                      <strong>{item.label}</strong>
                      <span>${item.amount.toLocaleString("es-MX")}</span>
                      <small>{paid ? "Incluido este mes" : "Pendiente por liquidar"}</small>
                      <button type="button" onClick={() => setOperationalPaidV13(item.key, !paid)}>
                        {paid ? "Marcar pendiente" : "Marcar incluido"}
                      </button>
                    </div>
                  );
                })}
              </div>
              <div className="ops-v13-note">
                Al registrar un pago parcial, confirma si en ese pago vas a incluir Gasolina, Paloma o Jarek. Si ya aparece como incluido este mes, no debe repetirse.
              </div>
            </div>

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
                      <td>{new Date(new Date().getFullYear(), new Date().getMonth(), new Date().getDate()) < new Date(2026, 6, 1) ? <Badge>Inicio de cobranza</Badge> : dif < 0 ? <Badge tone="red">Atrasado {Math.abs(dif)} días</Badge> : dif <= 5 ? <Badge tone="amber">Próximo</Badge> : <Badge>A tiempo</Badge>}</td>
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
  const [sendingReport, setSendingReport] = useState(false);
  const [reportMsg, setReportMsg] = useState("");

  useEffect(() => {
    if (!reportEmp) setReportEmp("__all");
  }, [reportEmp]);

  const reportAll = reportEmp === "__all";
  const emp = reportAll ? null : getEmpresa(reportEmp);

  const itemsPeriodo = calendario.filter((p) => {
    const fecha = dateOnly(p.fecha);
    const inRange = fecha >= startDate && fecha <= endDate;
    const matchEmpresa = reportAll || sameId(p.empresa_id, reportEmp);
    return inRange && matchEmpresa;
  });

  // REPORTE PARA CLIENTE: solo muestra piezas publicadas y métricas.
  // No muestra estados internos, responsables, guiones, diseño, aprobación ni pendientes.
  const publicados = itemsPeriodo.filter((p) => p.estado === "Publicado");
  const conMetricas = publicados.filter((p) => p.metricas && Object.keys(p.metricas || {}).length > 0);
  const ocultosInternos = itemsPeriodo.length - publicados.length;

  const metricFromPub = (pub) => {
    const metricas = pub.metricas || {};
    const redes = Array.isArray(pub.redes) && pub.redes.length ? pub.redes : Object.keys(metricas);
    return redes.reduce((acc, key) => {
      const item = metricas[key] || {};
      acc.alcance += Number(item.alcance || 0);
      acc.interacciones += Number(item.interacciones || 0);
      acc.comentarios += Number(item.comentarios || 0);
      acc.guardados += Number(item.guardados || 0);
      acc.compartidos += Number(item.compartidos || 0);
      if (item.enlace) acc.enlaces.push(item.enlace);
      return acc;
    }, { alcance: 0, interacciones: 0, comentarios: 0, guardados: 0, compartidos: 0, enlaces: [] });
  };

  const metricTotals = publicados.reduce((acc, p) => {
    const t = metricFromPub(p);
    acc.alcance += t.alcance;
    acc.interacciones += t.interacciones;
    acc.comentarios += t.comentarios;
    acc.guardados += t.guardados;
    acc.compartidos += t.compartidos;
    return acc;
  }, { alcance: 0, interacciones: 0, comentarios: 0, guardados: 0, compartidos: 0 });

  const totalAcciones = metricTotals.interacciones + metricTotals.comentarios + metricTotals.guardados + metricTotals.compartidos;
  const engagement = metricTotals.alcance ? ((totalAcciones / metricTotals.alcance) * 100).toFixed(1) : "0.0";

  const redResumen = SOCIAL_OPTIONS.map((opt) => {
    const redPubs = publicados.filter((p) => Array.isArray(p.redes) && p.redes.includes(opt.key));
    const totals = redPubs.reduce((acc, p) => {
      const item = p.metricas?.[opt.key] || {};
      acc.alcance += Number(item.alcance || 0);
      acc.interacciones += Number(item.interacciones || 0);
      acc.comentarios += Number(item.comentarios || 0);
      acc.guardados += Number(item.guardados || 0);
      acc.compartidos += Number(item.compartidos || 0);
      return acc;
    }, { alcance: 0, interacciones: 0, comentarios: 0, guardados: 0, compartidos: 0 });
    return { ...opt, publicaciones: redPubs.length, ...totals };
  }).filter((r) => r.publicaciones || r.alcance || r.interacciones || r.comentarios || r.guardados || r.compartidos);

  const emailDestino = emp ? (emp.email_cobranza || emp.email_facturacion || emp.email || emp.correo || "") : "";

  const sendReportToClient = async () => {
    setReportMsg("");

    if (reportAll || !emp) {
      setReportMsg("Selecciona una sola empresa para enviar el reporte al cliente.");
      return;
    }

    if (!isValidEmail(emailDestino)) {
      setReportMsg("La empresa no tiene un correo válido registrado en CRM.");
      return;
    }

    const reportNode = document.querySelector(".client-report-sheet");
    const html = reportNode?.outerHTML || "";

    if (!html) {
      setReportMsg("No se pudo preparar el reporte limpio del cliente.");
      return;
    }

    setSendingReport(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data?.session?.access_token || "";

      if (!token) {
        throw new Error("Sesión no válida. Cierra sesión y vuelve a entrar.");
      }

      const res = await fetch("https://slvquciaioxogeqvfefu.functions.supabase.co/enviar-reporte-cliente", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          to: emailDestino,
          empresa: emp.nombre,
          periodo: `${startDate} al ${endDate}`,
          subject: `Reporte de resultados - ${emp.nombre}`,
          html,
        }),
      });

      const body = await res.json().catch(() => ({}));

      if (!res.ok || !body.ok) {
        throw new Error(body.error || "No se pudo enviar el reporte.");
      }

      setReportMsg(`✓ Reporte limpio enviado a ${emailDestino}`);
    } catch (error) {
      setReportMsg(`🚨 ${error.message}`);
    } finally {
      setSendingReport(false);
    }
  };

  if (!clientes.length) return <div className="card empty">Aún no hay clientes para generar reportes.</div>;

  return (
    <div className="fade client-report-page">
      <div className="card report-controls client-report-controls">
        <select value={reportEmp} onChange={(e) => setReportEmp(e.target.value)}>
          <option value="__all">Vista general interna</option>
          {clientes.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}
        </select>
        <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        <button className="btn primary" type="button" onClick={() => window.print()}>Guardar PDF limpio</button>
        <button className="btn secondary" type="button" disabled={reportAll || sendingReport} onClick={sendReportToClient}>{sendingReport ? "Enviando..." : "Enviar al cliente"}</button>
        <div className="client-report-admin-note">
          {reportAll ? "Selecciona una empresa para enviar por correo." : `Destino: ${emailDestino || "sin correo registrado"}`}
          {ocultosInternos > 0 ? ` · ${ocultosInternos} pieza(s) internas no se muestran al cliente.` : " · Reporte listo para cliente."}
        </div>
        {reportMsg ? <div className="report-msg">{reportMsg}</div> : null}
      </div>

      <div className="client-report-sheet">
        <div className="client-report-hero">
          <div className="client-report-brand">
            <LogoAvatar logo={agencia.logo} name={agencia.nombre} size={74} />
            <div>
              <strong>{agencia.nombre}</strong>
              <span>Reporte ejecutivo de resultados digitales</span>
            </div>
          </div>
          <div className="client-report-title">
            <span>REPORTE PARA CLIENTE</span>
            <h1>{reportAll ? "Vista general" : emp?.nombre}</h1>
            <p>{startDate} al {endDate}</p>
          </div>
        </div>

        <div className="client-summary-card">
          <span>Resumen ejecutivo</span>
          <p>
            Durante este periodo se reportan <strong>{publicados.length}</strong> publicación(es) publicadas
            {conMetricas.length !== publicados.length ? `, de las cuales ${conMetricas.length} cuentan con métricas capturadas` : " con métricas capturadas"}.
            El reporte muestra únicamente resultados visibles para el cliente: alcance, interacciones, comentarios, guardados y compartidos.
          </p>
        </div>

        <div className="client-kpi-grid">
          <div><span>Publicaciones publicadas</span><strong>{publicados.length}</strong><small>piezas visibles</small></div>
          <div><span>Alcance total</span><strong>{metricTotals.alcance.toLocaleString("es-MX")}</strong><small>personas / vistas</small></div>
          <div><span>Interacciones</span><strong>{totalAcciones.toLocaleString("es-MX")}</strong><small>acciones totales</small></div>
          <div><span>Engagement estimado</span><strong>{engagement}%</strong><small>acciones / alcance</small></div>
        </div>

        <div className="client-section-head">
          <h3>Resultados por red social</h3>
          <p>Desglose de rendimiento por canal publicado.</p>
        </div>

        <div className="network-results-grid">
          {redResumen.map((red) => {
            const acciones = red.interacciones + red.comentarios + red.guardados + red.compartidos;
            return (
              <div className="network-result-card" key={red.key}>
                <div className="network-result-top"><span>{red.icon}</span><strong>{red.label}</strong></div>
                <div className="network-result-data">
                  <div><small>Piezas</small><b>{red.publicaciones}</b></div>
                  <div><small>Alcance</small><b>{red.alcance.toLocaleString("es-MX")}</b></div>
                  <div><small>Acciones</small><b>{acciones.toLocaleString("es-MX")}</b></div>
                </div>
              </div>
            );
          })}
          {!redResumen.length ? <div className="empty-client-report">No hay métricas por red social capturadas en este periodo.</div> : null}
        </div>

        <div className="client-section-head">
          <h3>Detalle de publicaciones</h3>
          <p>Contenido publicado y resultados principales. No se incluyen procesos internos de producción.</p>
        </div>

        <table className="client-report-table">
          <thead>
            <tr>
              <th>Fecha</th>
              <th>Contenido</th>
              <th>Redes</th>
              <th>Alcance</th>
              <th>Acciones</th>
              <th>Comentarios</th>
            </tr>
          </thead>
          <tbody>
            {publicados.map((p) => {
              const t = metricFromPub(p);
              const acciones = t.interacciones + t.guardados + t.compartidos;
              return (
                <tr key={p.id}>
                  <td>{p.fecha}</td>
                  <td>
                    <strong>{p.tema || p.formato || "Publicación"}</strong>
                    <span>{p.formato || "Contenido digital"}</span>
                  </td>
                  <td>{redesText(p.redes)}</td>
                  <td><strong>{t.alcance.toLocaleString("es-MX")}</strong></td>
                  <td>{acciones.toLocaleString("es-MX")}</td>
                  <td>{t.comentarios.toLocaleString("es-MX")}</td>
                </tr>
              );
            })}
            {!publicados.length ? (
              <tr><td colSpan="6" className="empty-cell">No hay publicaciones publicadas para mostrar al cliente en este periodo.</td></tr>
            ) : null}
          </tbody>
        </table>

        <div className="client-report-closing">
          <div>
            <strong>Preparado por {agencia.nombre}</strong>
            <span>Reporte limpio para cliente · No contiene flujo interno, responsables, pendientes ni aprobaciones.</span>
          </div>
          <p>Los resultados dependen de las métricas capturadas manualmente en cada red social.</p>
        </div>
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
              <input type="number" min="0" value={form.pago_mensual || ""} placeholder="0" onChange={(e) => setForm({ ...form, pago_mensual: Number(e.target.value) })} />
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
<option value={4}>Semanal: cuatro fechas de cobro al mes</option>
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
            <p className="muted small-copy">Ejemplo: si paga en 2 partes, puedes usar día 1 y día 15. Si paga semanalmente, usa 4 fechas de cobro al mes. El sistema podrá recordar cada fecha por separado.</p>
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
                        <input type="number" min="0" value={servicio.monto || ""} placeholder="0" onChange={(e) => updateServicioEmpresa(servicio.id, { monto: Number(e.target.value) })} />
                      </Field>

                      <Field label="Se pagará en">
                        <select value={servicio.partes || 1} onChange={(e) => updateServicioEmpresa(servicio.id, { partes: Number(e.target.value), pagadas: Math.min(Number(servicio.pagadas || 0), Number(e.target.value)) })}>
                          <option value={1}>1 parte</option>
                          <option value={2}>2 partes</option>
                          <option value={3}>3 partes</option>
<option value={4}>Semanal</option>
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
            {admin ? <Field label="Estado"><select value={form.estado || "Guion Pendiente"} onChange={(e) => setForm({ ...form, estado: e.target.value })}><option>Guion Pendiente</option><option>En Diseño</option><option value="Falta Material Drive">Material opcional pendiente</option><option>Corrección</option><option>Diseño Concluido</option><option>Aprobado</option><option>Publicado</option></select></Field> : <Field label="Estado"><input value={form.estado || "Guion Pendiente"} readOnly /></Field>}
            <Field label="Material de apoyo opcional"><input value={form.material_drive || ""} onChange={(e) => setForm({ ...form, material_drive: e.target.value, material_missing: false })} placeholder="Opcional: link de Drive, carpeta, referencia o briefing visual" /></Field>
            <label className="material-toggle">
              <input type="checkbox" checked={Boolean(form.material_missing || form.estado === "Falta Material Drive")} onChange={(e) => setForm({ ...form, material_missing: e.target.checked, material_drive: e.target.checked ? "" : form.material_drive, estado: e.target.checked ? "Falta Material Drive" : (form.estado === "Falta Material Drive" ? "Guion Pendiente" : form.estado) })} />
              <span>No hay material disponible para esta publicación</span>
            </label>
          </div>

          <div className="span-2"><Field label="Tema / Título"><input value={form.tema || ""} onChange={(e) => setForm({ ...form, tema: e.target.value })} placeholder="Ej. Lanzamiento de nuevo servicio, campaña del mes, promoción..." /></Field></div>
          <Field label="Objetivo estratégico"><textarea rows="3" value={form.objetivo || ""} onChange={(e) => setForm({ ...form, objetivo: e.target.value })} placeholder="Qué debe lograr esta publicación: alcance, leads, venta, interacción, posicionamiento..." /></Field>
          <Field label="Copy / Guion estratégico"><textarea rows="7" value={form.copy || ""} onChange={(e) => setForm({ ...form, copy: e.target.value })} placeholder="Guion, copy, CTA, texto sugerido y dirección creativa." /></Field>
          <Field label="Notas internas para diseño / aprobación"><textarea rows="3" value={form.notas_internas || ""} onChange={(e) => setForm({ ...form, notas_internas: e.target.value })} placeholder="Indicaciones internas, estilo visual, restricciones, referencias..." /></Field>
        </div>

        <aside className="pauta-side">
          <h4>Redes y ubicaciones donde se publicará</h4>
          <p>Cada red principal cuenta como una publicación. Las historias se muestran como ubicación adicional.</p>
          <div className="social-picker">
            {SOCIAL_OPTIONS.map((red) => (
              <label key={red.key} className={form.redes?.includes(red.key) ? "selected" : ""}>
                <input type="checkbox" checked={form.redes?.includes(red.key)} onChange={() => toggleRed(red.key)} />
                <span>{red.icon}</span><strong>{red.label}</strong>
              </label>
            ))}
          </div>
          <div className="pauta-note"><strong>Flujo flexible:</strong> el material es opcional. Cualquier miembro autorizado del staff puede tomar diseño, entregar, publicar o capturar métricas según su acceso.</div>
        </aside>
      </div>

      <div className="actions">
        <button className="btn secondary" type="button" onClick={onClose}>Cancelar</button>
        <button className="btn primary" type="button" onClick={() => onSave(form)}>Guardar Publicación</button>
      </div>
    </Modal>
  );
}

function ModalFinanza({ initial = {}, empresas, finanzas = [], onSave, onClose }) {
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

  // AZP_V6_PAYROLL_RULES
  const nombreEmpresaRegla = String(empresaActiva?.nombre || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  const mesPago = String(form.fecha || today()).slice(0, 7);

  const nominaYaAplicadaEsteMes = finanzas.some((f) =>
    sameId(f.empresa_id, form.empresa_id) &&
    !sameId(f.id, initial?.id) &&
    String(f.fecha || "").startsWith(mesPago) &&
    (f.tipo_ingreso || "Redes") !== "Servicio" &&
    (Number(f.paloma || 0) > 0 || Number(f.jarek || 0) > 0)
  );

  const getReglaNomina = () => {
    if (nombreEmpresaRegla.includes("troncos")) {
      return {
        paloma: 1900,
        jarek: 250,
        label: "Super Troncos: Paloma $1,900 y Jarek $250 una sola vez al mes."
      };
    }

    if (
      nombreEmpresaRegla.includes("morgan") ||
      nombreEmpresaRegla.includes("pajaretes") ||
      nombreEmpresaRegla.includes("chenta") ||
      nombreEmpresaRegla.includes("harmony")
    ) {
      return {
        paloma: 0,
        jarek: 0,
        label: "Este cliente no genera pago para Paloma ni Jarek."
      };
    }

    return {
      paloma: 600,
      jarek: 250,
      label: "Regla general: Paloma $600 y Jarek $250 una sola vez al mes."
    };
  };

  const reglaNomina = getReglaNomina();

  const autoCalcular = () => {
    const pago = Number(form.pago || 0);

    if (isServicio) {
      setForm({ ...form, gas: 0, paloma: 0, jarek: 0, luis: pago / 2, thalia: pago / 2 });
      return;
    }

    const gas = pago > 6900 ? 1000 : 700;
    const aplicarNomina = !nominaYaAplicadaEsteMes;
    const paloma = aplicarNomina ? Number(reglaNomina.paloma || 0) : 0;
    const jarek = aplicarNomina ? Number(reglaNomina.jarek || 0) : 0;
    const neto = Math.max(pago - gas - paloma - jarek, 0);
    setForm({ ...form, gas, paloma, jarek, luis: neto / 2, thalia: neto / 2 });
  };

  return (
    <Modal title="Registro de pago y distribución" onClose={onClose} width="840px">
      <div className="finance-modal-pro">
        <div className="finance-hero-box">
          <div>
            <strong>{isServicio ? "Ingreso por servicio" : "Ingreso por redes sociales"}</strong>
            <span>{isServicio ? "Se divide únicamente entre Thalia y Luis." : "Aplica la regla de nómina por cliente y solo una vez al mes."}</span>
          </div>
          <Badge tone={isServicio ? "purple" : "green"}>{isServicio ? "Servicio" : "Redes"}</Badge>
        </div>

        <div className="payroll-rule-box">
          <strong>Regla aplicada</strong>
          <span>
            {isServicio
              ? "Los servicios extra se dividen únicamente entre Thalia y Luis."
              : `${reglaNomina.label}${nominaYaAplicadaEsteMes ? " La nómina de Paloma/Jarek ya fue aplicada este mes, por eso este pago queda en $0 para ellos." : " Si el cliente paga en partes, se aplica en el primer pago y no se repite en el segundo."}`}
          </span>
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
            <input type="number" value={form.pago || ""} placeholder="0" onChange={(e) => setForm({ ...form, pago: Number(e.target.value) })} />
          </Field>

          <div className="field align-bottom">
            <button className="btn secondary full" type="button" onClick={autoCalcular}>Auto-calcular distribución</button>
          </div>
        </div>

        <div className="finance-split-grid">
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Gasolina Thalia</span>
            <input type="number" value={form.gas || ""} placeholder="0" disabled={isServicio} onChange={(e) => setForm({ ...form, gas: Number(e.target.value) })} />
          </div>
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Paloma</span>
            <input type="number" value={form.paloma || ""} placeholder="0" disabled={isServicio} onChange={(e) => setForm({ ...form, paloma: Number(e.target.value) })} />
          </div>
          <div className={isServicio ? "split-card disabled" : "split-card"}>
            <span>Jarek</span>
            <input type="number" value={form.jarek || ""} placeholder="0" disabled={isServicio} onChange={(e) => setForm({ ...form, jarek: Number(e.target.value) })} />
          </div>
          <div className="split-card highlight">
            <span>Neto Luis</span>
            <input type="number" value={form.luis || ""} placeholder="0" onChange={(e) => setForm({ ...form, luis: Number(e.target.value) })} />
          </div>
          <div className="split-card highlight">
            <span>Neto Thalia</span>
            <input type="number" value={form.thalia || ""} placeholder="0" onChange={(e) => setForm({ ...form, thalia: Number(e.target.value) })} />
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

function labelEstado(estado = "") {
  if (estado === "Falta Material Drive") return "Material opcional pendiente";
  return estado || "Sin estado";
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


/* FIX SOLO MÓVIL: menú lateral responsive sin afectar escritorio */
@media (max-width: 760px) {
  .app-shell {
    width: 100vw;
    height: 100dvh;
    overflow: hidden;
  }

  .sidebar {
    position: fixed !important;
    inset: 0 auto 0 0;
    width: min(84vw, 330px) !important;
    max-width: 330px;
    height: 100dvh;
    z-index: 1000;
    transform: translateX(0);
    box-shadow: 22px 0 55px rgba(15, 23, 42, .28);
    transition: transform .22s ease, box-shadow .22s ease;
  }

  .sidebar.collapsed {
    width: min(84vw, 330px) !important;
    transform: translateX(-105%);
    box-shadow: none;
  }

  .main {
    width: 100vw;
    min-width: 0;
    flex: 1 1 auto;
  }

  .topbar {
    height: 64px;
    padding: 0 14px;
    gap: 12px;
    position: sticky;
    top: 0;
    z-index: 20;
  }

  .topbar h2 {
    font-size: 15px;
  }

  .topbar p,
  .sync {
    display: none;
  }

  .content {
    padding: 14px;
    width: 100%;
    overflow-x: auto;
  }

  .calendar-shell,
  .calendar-grid,
  .calendar-board {
    max-width: 100%;
    overflow-x: auto;
  }

  .btn,
  .icon-btn {
    touch-action: manipulation;
  }
}


/* UPGRADE PRODUCCIÓN / CALENDARIO / REPORTES */
.kanban { gap: 18px; align-items: flex-start; }
.kanban-col { background: linear-gradient(180deg, #f8fafc, #eef2ff); border: 1px solid rgba(148,163,184,.28); border-radius: 24px; padding: 18px; box-shadow: 0 20px 50px rgba(15,23,42,.08); }
.kanban-col h3 { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; font-size: 15px; letter-spacing: .02em; text-transform: uppercase; color: #334155; }
.task { border: 1px solid rgba(148,163,184,.32); border-left: 6px solid var(--c-primary); border-radius: 22px; padding: 20px; background: rgba(255,255,255,.92); box-shadow: 0 16px 34px rgba(15,23,42,.08); transition: transform .18s ease, box-shadow .18s ease; }
.task:hover { transform: translateY(-3px); box-shadow: 0 24px 46px rgba(15,23,42,.12); }
.task.done { border-left-color: #16c784; background: linear-gradient(180deg,#ffffff,#f0fdf4); }
.task-title { font-size: 18px; line-height: 1.3; color: #1e293b; margin: 12px 0 8px; }
.task-meta { background: #f8fafc; border-radius: 16px; padding: 12px; margin-top: 12px; }
.task-actions { display: grid; grid-template-columns: repeat(2, minmax(0,1fr)); gap: 10px; margin-top: 16px; }
.task-actions button { min-height: 44px; border: 0; border-radius: 14px; font-weight: 900; background: #eef2ff; color: #334155; cursor: pointer; }
.task-actions button:hover { background: var(--c-primary); color: #fff; }
.calendar-grid { border-radius: 28px; overflow: hidden; box-shadow: 0 24px 60px rgba(15,23,42,.10); border: 1px solid rgba(148,163,184,.28); }
.day { min-height: 150px; background: linear-gradient(180deg,#ffffff,#f8fafc); }
.event { border-radius: 16px; padding: 12px; box-shadow: 0 12px 28px rgba(15,23,42,.12); transform: translateZ(0); transition: transform .16s ease, box-shadow .16s ease; }
.event:hover { transform: translateY(-2px); box-shadow: 0 18px 36px rgba(15,23,42,.18); }
.event.tone-green, .event.green { cursor: pointer; }
.pauta-layout { background: linear-gradient(135deg,#ffffff,#f8fafc); border-radius: 22px; }
.pauta-side { background: linear-gradient(180deg,#f8fafc,#eef2ff); border-left: 1px solid rgba(148,163,184,.26); }
.social-picker label { border-radius: 16px; transition: transform .16s ease, box-shadow .16s ease; }
.social-picker label:hover { transform: translateY(-2px); box-shadow: 0 14px 30px rgba(15,23,42,.10); }
.report-controls { grid-template-columns: 1.1fr 1fr 1fr auto auto; align-items: center; }
.report-msg { grid-column: 1 / -1; padding: 12px 14px; border-radius: 14px; background: #f8fafc; color: #475569; font-weight: 800; }
.report-sheet { background: #fff; border-radius: 24px; overflow: hidden; box-shadow: 0 30px 80px rgba(15,23,42,.10); }
.report-table-pro tbody tr { break-inside: avoid; }
@media (max-width: 900px) {
  .report-controls { grid-template-columns: 1fr; }
  .task-actions { grid-template-columns: 1fr; }
}

/* AZP_UPGRADE_PRO_V2 - mejoras visuales seguras */
.kanban-col {
  background: linear-gradient(180deg, #f8fafc, #eef2ff) !important;
  border: 1px solid rgba(148,163,184,.30) !important;
  border-radius: 24px !important;
  padding: 18px !important;
  box-shadow: 0 20px 50px rgba(15,23,42,.08) !important;
}
.task {
  border-radius: 22px !important;
  padding: 20px !important;
  background: rgba(255,255,255,.94) !important;
  box-shadow: 0 16px 34px rgba(15,23,42,.08) !important;
  transition: transform .18s ease, box-shadow .18s ease !important;
}
.task:hover {
  transform: translateY(-3px);
  box-shadow: 0 24px 46px rgba(15,23,42,.12) !important;
}
.task-actions button {
  min-height: 44px !important;
  border: 0 !important;
  border-radius: 14px !important;
  font-weight: 900 !important;
  background: #eef2ff !important;
  color: #334155 !important;
}
.task-actions button:hover {
  background: var(--c-primary) !important;
  color: #fff !important;
}
.calendar-grid {
  border-radius: 28px !important;
  overflow: hidden !important;
  box-shadow: 0 24px 60px rgba(15,23,42,.10) !important;
  border: 1px solid rgba(148,163,184,.28) !important;
}
.event {
  border-radius: 16px !important;
  padding: 12px !important;
  box-shadow: 0 12px 28px rgba(15,23,42,.12) !important;
  transition: transform .16s ease, box-shadow .16s ease !important;
}
.event:hover {
  transform: translateY(-2px);
  box-shadow: 0 18px 36px rgba(15,23,42,.18) !important;
}
.pauta-layout {
  background: linear-gradient(135deg,#ffffff,#f8fafc) !important;
  border-radius: 22px !important;
}
.pauta-side {
  background: linear-gradient(180deg,#f8fafc,#eef2ff) !important;
  border-left: 1px solid rgba(148,163,184,.26) !important;
}
.social-picker label {
  border-radius: 16px !important;
  transition: transform .16s ease, box-shadow .16s ease !important;
}
.social-picker label:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 30px rgba(15,23,42,.10) !important;
}
.report-sheet {
  background: #fff !important;
  border-radius: 24px !important;
  overflow: hidden !important;
  box-shadow: 0 30px 80px rgba(15,23,42,.10) !important;
}

@media print {
  .report-controls, .sidebar, .topbar { display: none !important; }
  .main, .content { padding: 0 !important; margin: 0 !important; width: 100% !important; }
  .report-sheet { box-shadow: none !important; border-radius: 0 !important; }
}



/* AZP FIX FINAL EXACT - mejoras visibles de producción, calendario y reportes */
.kanban { gap: 22px !important; align-items: stretch !important; }
.kanban-col { background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%) !important; border: 1px solid rgba(148,163,184,.32) !important; border-radius: 28px !important; padding: 16px !important; box-shadow: 0 24px 64px rgba(15,23,42,.10) !important; overflow: visible !important; }
.kanban-col h3 { padding: 4px 4px 16px !important; margin: 0 !important; color: #1e293b !important; font-size: 15px !important; letter-spacing: .02em !important; text-transform: uppercase !important; }
.task { border-radius: 24px !important; padding: 22px !important; background: rgba(255,255,255,.98) !important; border: 1px solid rgba(148,163,184,.30) !important; border-left: 6px solid var(--c-primary) !important; box-shadow: 0 18px 42px rgba(15,23,42,.10) !important; }
.task:hover { transform: translateY(-3px) !important; box-shadow: 0 28px 70px rgba(15,23,42,.15) !important; }
.task.done { border-left-color: var(--green) !important; background: linear-gradient(180deg,#ffffff,#f0fdf4) !important; }
.task-title { font-size: 18px !important; color: #1e293b !important; }
.task-meta { background: #f8fafc !important; border: 1px solid rgba(226,232,240,.9) !important; border-radius: 16px !important; padding: 12px !important; }
.task-meta .muted { color: #64748b !important; font-weight: 800 !important; }
.task-actions { gap: 10px !important; }
.task-actions button { min-height: 44px !important; border-radius: 15px !important; font-weight: 900 !important; background: #eef2ff !important; color: #334155 !important; }
.task-actions button:hover { background: var(--c-primary) !important; color: #fff !important; }
.calendar { border-radius: 30px !important; overflow: hidden !important; border: 1px solid rgba(148,163,184,.30) !important; box-shadow: 0 24px 70px rgba(15,23,42,.10) !important; }
.day { min-height: 150px !important; background: linear-gradient(180deg,#ffffff,#f8fafc) !important; }
.event { border-radius: 17px !important; padding: 12px !important; box-shadow: 0 12px 30px rgba(15,23,42,.14) !important; transition: transform .16s ease, box-shadow .16s ease !important; }
.event:hover { transform: translateY(-2px) !important; box-shadow: 0 18px 40px rgba(15,23,42,.20) !important; }
.pauta-layout { border-radius: 26px !important; background: linear-gradient(135deg,#ffffff,#f8fafc) !important; border: 1px solid rgba(148,163,184,.24) !important; overflow: hidden !important; }
.pauta-main { padding: 4px !important; }
.pauta-side { background: linear-gradient(180deg,#f8fafc,#eef2ff) !important; border: 1px solid rgba(148,163,184,.24) !important; border-radius: 22px !important; }
.social-picker label { border-radius: 17px !important; transition: transform .16s ease, box-shadow .16s ease !important; }
.social-picker label:hover { transform: translateY(-2px) !important; box-shadow: 0 14px 34px rgba(15,23,42,.12) !important; }
.report-controls { display: grid !important; grid-template-columns: minmax(240px,1.1fr) minmax(170px,.7fr) minmax(170px,.7fr) 160px 180px !important; align-items: stretch !important; gap: 14px !important; }
.report-controls .btn { min-height: 58px !important; white-space: normal !important; line-height: 1.25 !important; }
.report-controls .btn.secondary { background: #eef2ff !important; color: #334155 !important; border: 1px solid rgba(148,163,184,.28) !important; }
.report-msg { grid-column: 1 / -1 !important; padding: 14px 16px !important; border-radius: 16px !important; background: #f8fafc !important; color: #475569 !important; font-weight: 900 !important; }
.report-sheet { border-radius: 28px !important; overflow: hidden !important; box-shadow: 0 32px 90px rgba(15,23,42,.13) !important; }
@media (max-width: 1100px) { .report-controls { grid-template-columns: 1fr 1fr !important; } }
@media (max-width: 760px) { .report-controls { grid-template-columns: 1fr !important; } }

@media print {
  .sidebar, .topbar, .report-controls { display: none !important; }
  .app-shell, .main, .content { display: block; height: auto; overflow: visible; padding: 0; }
  .report-sheet { border: 0; box-shadow: none; }
}

/* AZP CLIENT REPORT V4 - reporte limpio para cliente y UI más premium */
.client-report-page {
  animation: fadeUp .22s ease both;
}

.client-report-controls {
  display: grid !important;
  grid-template-columns: minmax(240px, 1.1fr) 180px 180px 180px 190px !important;
  gap: 14px !important;
  align-items: stretch !important;
  border-radius: 24px !important;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%) !important;
  box-shadow: 0 22px 70px rgba(15,23,42,.08) !important;
}

.client-report-controls .btn {
  min-height: 58px !important;
  border-radius: 18px !important;
  font-weight: 950 !important;
  white-space: normal !important;
  line-height: 1.18 !important;
}

.client-report-admin-note {
  grid-column: 1 / -1;
  padding: 12px 16px;
  border-radius: 16px;
  background: #f8fafc;
  color: #64748b;
  font-size: 13px;
  font-weight: 850;
  border: 1px solid rgba(148,163,184,.25);
}

.client-report-sheet {
  margin-top: 22px;
  background: #fff;
  border-radius: 34px;
  overflow: hidden;
  border: 1px solid rgba(148,163,184,.24);
  box-shadow: 0 36px 100px rgba(15,23,42,.13);
}

.client-report-hero {
  min-height: 210px;
  padding: 42px 44px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 28px;
  color: #fff;
  background:
    radial-gradient(circle at 18% 20%, rgba(255,255,255,.18), transparent 28%),
    linear-gradient(135deg, #0f172a 0%, #37126f 46%, var(--c-primary) 100%);
}

.client-report-brand {
  display: flex;
  align-items: center;
  gap: 18px;
}

.client-report-brand strong {
  display: block;
  font-size: 24px;
  letter-spacing: -.03em;
}

.client-report-brand span {
  display: block;
  color: rgba(255,255,255,.76);
  margin-top: 4px;
  font-size: 14px;
}

.client-report-title {
  text-align: right;
}

.client-report-title span {
  display: block;
  color: rgba(255,255,255,.72);
  font-size: 12px;
  letter-spacing: .20em;
  font-weight: 950;
}

.client-report-title h1 {
  margin: 10px 0 6px;
  font-size: 32px;
  line-height: 1.05;
  letter-spacing: -.04em;
}

.client-report-title p {
  margin: 0;
  color: rgba(255,255,255,.82);
  font-weight: 700;
}

.client-summary-card {
  margin: 30px 34px 0;
  padding: 22px 24px;
  border-radius: 24px;
  background: linear-gradient(135deg, #f8fafc, #eef2ff);
  border: 1px solid rgba(148,163,184,.25);
}

.client-summary-card span {
  display: block;
  font-size: 12px;
  color: var(--c-primary);
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
  margin-bottom: 8px;
}

.client-summary-card p {
  margin: 0;
  color: #334155;
  line-height: 1.65;
  font-size: 15px;
}

.client-kpi-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(150px, 1fr));
  gap: 18px;
  padding: 28px 34px 8px;
}

.client-kpi-grid div {
  border: 1px solid rgba(148,163,184,.28);
  border-radius: 24px;
  padding: 22px;
  background: #fff;
  box-shadow: 0 16px 38px rgba(15,23,42,.06);
}

.client-kpi-grid span {
  display: block;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.client-kpi-grid strong {
  display: block;
  margin-top: 12px;
  color: #0f172a;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -.05em;
}

.client-kpi-grid small {
  display: block;
  margin-top: 9px;
  color: #94a3b8;
  font-weight: 750;
}

.client-section-head {
  padding: 28px 34px 12px;
}

.client-section-head h3 {
  margin: 0;
  font-size: 20px;
  color: #0f172a;
  letter-spacing: -.03em;
}

.client-section-head p {
  margin: 6px 0 0;
  color: #64748b;
  font-size: 14px;
}

.network-results-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(180px, 1fr));
  gap: 16px;
  padding: 0 34px 12px;
}

.network-result-card {
  border-radius: 24px;
  border: 1px solid rgba(148,163,184,.26);
  background: linear-gradient(180deg, #ffffff, #f8fafc);
  padding: 20px;
  box-shadow: 0 14px 34px rgba(15,23,42,.06);
}

.network-result-top {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 18px;
  color: #0f172a;
}

.network-result-top span {
  width: 38px;
  height: 38px;
  border-radius: 14px;
  display: grid;
  place-items: center;
  background: #eef2ff;
}

.network-result-data {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
}

.network-result-data small {
  display: block;
  color: #94a3b8;
  font-size: 10px;
  font-weight: 950;
  text-transform: uppercase;
}

.network-result-data b {
  display: block;
  margin-top: 5px;
  color: #0f172a;
  font-size: 17px;
}

.empty-client-report {
  grid-column: 1 / -1;
  padding: 24px;
  border-radius: 22px;
  background: #f8fafc;
  color: #64748b;
  font-weight: 850;
  text-align: center;
}

.client-report-table {
  width: calc(100% - 68px);
  margin: 0 34px 24px;
  border-collapse: separate;
  border-spacing: 0;
  overflow: hidden;
  border-radius: 24px;
  border: 1px solid rgba(148,163,184,.24);
}

.client-report-table th {
  padding: 16px;
  background: #f8fafc;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  text-transform: uppercase;
  letter-spacing: .08em;
  text-align: left;
}

.client-report-table td {
  padding: 18px 16px;
  border-top: 1px solid rgba(226,232,240,.9);
  color: #334155;
  vertical-align: top;
}

.client-report-table td strong {
  display: block;
  color: #0f172a;
  font-size: 15px;
}

.client-report-table td span {
  display: block;
  color: #64748b;
  margin-top: 4px;
  font-size: 12px;
}

.client-report-closing {
  margin: 8px 34px 34px;
  padding: 22px 24px;
  border-radius: 24px;
  background: #0f172a;
  color: #fff;
  display: flex;
  justify-content: space-between;
  gap: 22px;
  align-items: center;
}

.client-report-closing strong {
  display: block;
  font-size: 16px;
}

.client-report-closing span,
.client-report-closing p {
  color: rgba(255,255,255,.72);
  margin: 4px 0 0;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .client-report-controls,
  .client-kpi-grid,
  .network-results-grid {
    grid-template-columns: 1fr 1fr !important;
  }

  .client-report-hero,
  .client-report-closing {
    flex-direction: column;
    align-items: flex-start;
  }

  .client-report-title {
    text-align: left;
  }
}

@media (max-width: 760px) {
  .client-report-controls,
  .client-kpi-grid,
  .network-results-grid {
    grid-template-columns: 1fr !important;
  }

  .client-report-hero {
    padding: 30px 24px;
  }

  .client-summary-card,
  .client-section-head,
  .client-report-closing {
    margin-left: 20px;
    margin-right: 20px;
  }

  .client-kpi-grid,
  .network-results-grid {
    padding-left: 20px;
    padding-right: 20px;
  }

  .client-report-table {
    width: calc(100% - 40px);
    margin-left: 20px;
    margin-right: 20px;
    display: block;
    overflow-x: auto;
  }
}

@media print {
  .client-report-controls,
  .sidebar,
  .topbar {
    display: none !important;
  }

  .main,
  .content {
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  .client-report-sheet {
    margin: 0 !important;
    border: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .client-report-hero {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
}


/* AZP OPERACION PROFESIONAL V5 */
.production-pro { display: grid; gap: 22px; }
.ops-alert-grid { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 18px; }
.ops-alert-card { border-radius: 28px; padding: 22px; background: linear-gradient(135deg,#ffffff,#f8fafc); border: 1px solid rgba(148,163,184,.28); box-shadow: 0 24px 60px rgba(15,23,42,.09); }
.ops-alert-card div:first-child { display:flex; align-items:center; justify-content:space-between; gap:16px; }
.ops-alert-card span { color:#64748b; font-size:12px; font-weight:950; letter-spacing:.08em; text-transform:uppercase; }
.ops-alert-card strong { font-size:38px; line-height:1; color:#0f172a; letter-spacing:-.05em; }
.ops-alert-card p { color:#64748b; font-weight:750; line-height:1.45; margin:12px 0; }
.ops-alert-card button { width:100%; text-align:left; border:0; border-radius:16px; padding:12px 14px; margin-top:8px; background:#f1f5f9; color:#334155; font-weight:900; cursor:pointer; }
.ops-alert-card button:hover { background:var(--c-primary); color:#fff; }
.ops-alert-card.urgent { background:linear-gradient(135deg,#fff7ed,#ffffff); }
.ops-alert-card.material { background:linear-gradient(135deg,#eff6ff,#ffffff); }
.ops-alert-card.team { background:linear-gradient(135deg,#f5f3ff,#ffffff); }
.team-mini-table { display:grid; gap:8px; margin-top:10px; }
.team-mini-table div { display:flex; justify-content:space-between; gap:14px; padding:10px 12px; background:rgba(255,255,255,.75); border:1px solid rgba(148,163,184,.22); border-radius:14px; }
.team-mini-table b { color:#0f172a; }
.team-mini-table span { color:#64748b; font-size:12px; letter-spacing:0; text-transform:none; }
.urgent-task { border-left-color:#f59e0b !important; background:linear-gradient(180deg,#ffffff,#fffbeb) !important; }
.pro-meta .hot { color:#b45309 !important; font-weight:950 !important; }
.correction-note { border-color:#fed7aa !important; background:#fff7ed !important; color:#9a3412 !important; }
.material-note { border-color:#bfdbfe !important; background:#eff6ff !important; color:#1d4ed8 !important; }
.task-actions button:disabled { cursor:not-allowed !important; opacity:.68 !important; background:#e2e8f0 !important; color:#64748b !important; }
.material-toggle { display:flex; align-items:center; gap:10px; margin-top:-2px; padding:13px 14px; border-radius:16px; background:#eff6ff; border:1px solid rgba(59,130,246,.20); color:#1d4ed8; font-weight:900; cursor:pointer; }
.material-toggle input { width:18px; height:18px; }
.calendar-pro { display:grid; gap:18px; }
.calendar-hero { display:flex; justify-content:space-between; gap:22px; align-items:center; padding:28px; border-radius:30px; color:#fff; background:radial-gradient(circle at 15% 20%, rgba(255,255,255,.20), transparent 26%), linear-gradient(135deg,#0f172a,#4c1d95 48%, var(--c-primary)); box-shadow:0 28px 80px rgba(15,23,42,.18); }
.calendar-hero span { color:rgba(255,255,255,.68); font-size:12px; font-weight:950; letter-spacing:.16em; text-transform:uppercase; }
.calendar-hero h3 { margin:8px 0 4px; font-size:34px; letter-spacing:-.04em; text-transform:capitalize; }
.calendar-hero p { margin:0; color:rgba(255,255,255,.76); }
.calendar-mini-kpis { display:grid; grid-template-columns:repeat(4, minmax(82px,1fr)); gap:10px; min-width:420px; }
.calendar-mini-kpis div { padding:16px; border-radius:22px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.18); backdrop-filter:blur(12px); }
.calendar-mini-kpis strong { display:block; color:#fff; font-size:28px; }
.calendar-mini-kpis small { color:rgba(255,255,255,.76); font-weight:800; }
.calendar-legend { display:flex; flex-wrap:wrap; gap:10px; padding:0 4px; }
.calendar-legend span { display:flex; align-items:center; gap:8px; padding:10px 13px; border-radius:999px; background:#fff; border:1px solid rgba(148,163,184,.24); color:#64748b; font-weight:850; box-shadow:0 10px 24px rgba(15,23,42,.05); }
.calendar-legend i { width:10px; height:10px; border-radius:99px; display:inline-block; }
.dot-published { background:#22c55e; } .dot-design { background:#3b82f6; } .dot-review { background:#a855f7; } .dot-alert { background:#f59e0b; }
.calendar-premium { border-radius:30px !important; overflow:hidden; }
.premium-day { min-height:168px !important; position:relative; }
.day-events { display:grid; gap:8px; margin-top:26px; }
.premium-event { width:100%; text-align:left; border:0; }
.premium-event .event-row { display:flex; align-items:center; justify-content:space-between; gap:8px; }
.premium-event em { font-style:normal; font-size:10px; padding:4px 7px; border-radius:999px; background:rgba(255,255,255,.70); color:#334155; font-weight:950; }
.premium-event small { display:block; margin-top:5px; opacity:.86; }
.event-alert { display:block; margin-top:7px; padding:5px 7px; border-radius:10px; background:rgba(245,158,11,.16); color:#92400e; font-weight:950; font-size:11px; }
.premium-event.no-material { outline:2px solid rgba(59,130,246,.28); }
.premium-event.urgent { outline:2px solid rgba(245,158,11,.30); }
@media (max-width: 1100px) { .ops-alert-grid { grid-template-columns:1fr; } .calendar-hero { flex-direction:column; align-items:flex-start; } .calendar-mini-kpis { min-width:0; width:100%; grid-template-columns:repeat(2,1fr); } }
@media (max-width: 760px) { .calendar-mini-kpis { grid-template-columns:1fr; } .calendar-hero { padding:22px; } .calendar-hero h3 { font-size:26px; } }


/* AZP V6 - operación sobria y reglas financieras */
.ops-alert-card span,
.team-mini-table span,
.task-meta span,
.digital-footprint span {
  letter-spacing: 0 !important;
}

.team-mini-table div {
  align-items: flex-start !important;
  flex-direction: column !important;
}

.team-mini-table span {
  font-size: 12px !important;
  line-height: 1.45 !important;
  text-transform: none !important;
}

.ops-alert-card div:first-child span {
  font-size: 12px !important;
  letter-spacing: .09em !important;
}

.payroll-rule-box {
  margin: 16px 0 22px;
  padding: 16px 18px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148,163,184,.28);
  color: #334155;
}

.payroll-rule-box strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  font-weight: 950;
  letter-spacing: .08em;
  text-transform: uppercase;
  margin-bottom: 6px;
}

.payroll-rule-box span {
  display: block;
  color: #64748b;
  line-height: 1.5;
  font-weight: 800;
}

.finance-split-grid input::placeholder,
.grid input::placeholder {
  color: #94a3b8;
}



/* AZP V8 - calendario navegable profesional */
.calendar-pro-page {
  display: grid;
  gap: 18px;
}

.calendar-pro-hero {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto auto;
  gap: 18px;
  align-items: center;
  padding: 28px 30px;
  border-radius: 30px;
  color: #fff;
  background:
    radial-gradient(circle at 12% 18%, rgba(255,255,255,.16), transparent 30%),
    linear-gradient(135deg, #0f172a 0%, #4c147f 48%, var(--c-primary) 100%);
  box-shadow: 0 28px 80px rgba(15,23,42,.18);
}

.calendar-pro-hero .eyebrow {
  display: block;
  color: rgba(255,255,255,.70);
  text-transform: uppercase;
  letter-spacing: .16em;
  font-size: 11px;
  font-weight: 950;
  margin-bottom: 10px;
}

.calendar-pro-hero h2 {
  margin: 0;
  font-size: 32px;
  line-height: 1;
  letter-spacing: -.05em;
}

.calendar-pro-hero p {
  margin: 10px 0 0;
  color: rgba(255,255,255,.76);
  font-size: 14px;
}

.calendar-pro-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  flex-wrap: wrap;
}

.calendar-pro-actions button,
.calendar-pro-selectors select,
.calendar-pro-selectors input {
  height: 46px;
  border: 1px solid rgba(255,255,255,.20);
  border-radius: 15px;
  background: rgba(255,255,255,.12);
  color: #fff;
  font-weight: 950;
  padding: 0 16px;
  outline: none;
  backdrop-filter: blur(14px);
}

.calendar-pro-actions button:hover {
  background: rgba(255,255,255,.22);
  transform: translateY(-1px);
}

.calendar-pro-selectors {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.calendar-pro-selectors select option {
  color: #0f172a;
}

.calendar-pro-selectors input {
  width: 92px;
}

.calendar-pro-kpis {
  grid-column: 1 / -1;
  display: grid;
  grid-template-columns: repeat(4, minmax(120px, 1fr));
  gap: 12px;
}

.calendar-pro-kpis div {
  padding: 16px;
  border-radius: 18px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.15);
}

.calendar-pro-kpis strong {
  display: block;
  font-size: 28px;
  line-height: 1;
  letter-spacing: -.04em;
}

.calendar-pro-kpis span {
  display: block;
  color: rgba(255,255,255,.72);
  font-size: 11px;
  font-weight: 900;
  margin-top: 7px;
  text-transform: uppercase;
}

.calendar-pro-legend {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.calendar-pro-legend span {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 9px 13px;
  border-radius: 999px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.24);
  color: #64748b;
  font-size: 12px;
  font-weight: 950;
  box-shadow: 0 10px 24px rgba(15,23,42,.06);
}

.calendar-pro-legend .dot {
  width: 9px;
  height: 9px;
  border-radius: 50%;
  display: inline-block;
}

.done-dot { background: #10b981; }
.design-dot { background: #3b82f6; }
.review-dot { background: #8b5cf6; }
.warning-dot { background: #f59e0b; }

.calendar-pro-grid {
  border-radius: 28px !important;
  overflow: hidden !important;
  background: #fff !important;
  border: 1px solid rgba(148,163,184,.28) !important;
  box-shadow: 0 28px 90px rgba(15,23,42,.10) !important;
}

.calendar-pro-day {
  min-height: 164px !important;
  background: linear-gradient(180deg, #ffffff, #fbfdff) !important;
  position: relative;
}

.calendar-pro-day.today {
  background: linear-gradient(180deg, #f5f3ff, #ffffff) !important;
  box-shadow: inset 0 0 0 2px rgba(153,28,204,.18);
}

.calendar-day-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 22px;
}

.calendar-pro-event {
  text-align: left !important;
  padding: 12px !important;
  border-radius: 16px !important;
  border: 0 !important;
  color: #fff !important;
  box-shadow: 0 14px 30px rgba(15,23,42,.16) !important;
  transition: transform .16s ease, box-shadow .16s ease, filter .16s ease !important;
}

.calendar-pro-event:hover {
  transform: translateY(-2px) !important;
  box-shadow: 0 20px 44px rgba(15,23,42,.22) !important;
  filter: saturate(1.05);
}

.calendar-event-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.calendar-event-top strong {
  font-size: 13px;
  line-height: 1.1;
  text-transform: uppercase;
}

.calendar-event-top small {
  padding: 4px 8px;
  border-radius: 999px;
  background: rgba(255,255,255,.20);
  font-size: 9px;
  font-weight: 950;
  white-space: nowrap;
}

.calendar-pro-event span,
.calendar-pro-event em,
.calendar-pro-event i {
  display: block;
}

.calendar-pro-event span {
  margin-top: 7px;
  font-size: 12px;
  font-weight: 900;
  line-height: 1.25;
}

.calendar-pro-event em {
  margin-top: 4px;
  font-style: normal;
  color: rgba(255,255,255,.82);
  font-size: 10px;
  line-height: 1.25;
}

.calendar-pro-event i {
  margin-top: 7px;
  font-style: normal;
  color: #fff7ed;
  font-size: 10px;
  font-weight: 950;
}

.calendar-pro-event.is-urgent {
  outline: 2px solid rgba(245,158,11,.78);
}

.calendar-pro-event.is-missing-material {
  outline: 2px solid rgba(239,68,68,.62);
}

@media (max-width: 1100px) {
  .calendar-pro-hero {
    grid-template-columns: 1fr;
  }

  .calendar-pro-actions,
  .calendar-pro-selectors {
    justify-content: flex-start;
  }

  .calendar-pro-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .calendar-pro-hero {
    padding: 22px;
    border-radius: 24px;
  }

  .calendar-pro-actions,
  .calendar-pro-selectors {
    flex-direction: column;
  }

  .calendar-pro-kpis {
    grid-template-columns: 1fr;
  }

  .calendar-pro-grid {
    overflow-x: auto !important;
  }

  .calendar-pro-day {
    min-width: 190px;
  }
}


/* AZP V9B - Calendario compacto, ordenado y legible */
.calendar-pro-hero {
  padding: 22px 26px !important;
  border-radius: 26px !important;
  margin-bottom: 6px !important;
}

.calendar-pro-hero h2 {
  font-size: 28px !important;
}

.calendar-pro-hero p {
  font-size: 13px !important;
  max-width: 720px !important;
}

.calendar-pro-kpis {
  grid-template-columns: repeat(4, minmax(110px, 1fr)) !important;
  gap: 10px !important;
}

.calendar-pro-kpis div {
  padding: 12px 14px !important;
  border-radius: 16px !important;
}

.calendar-pro-kpis strong {
  font-size: 24px !important;
}

.calendar-pro-legend {
  margin: 8px 0 10px !important;
}

.calendar-pro-grid {
  table-layout: fixed !important;
  width: 100% !important;
}

.calendar-pro-day {
  min-height: 150px !important;
  max-height: 150px !important;
  padding: 8px !important;
  overflow: hidden !important;
  background: #ffffff !important;
}

.calendar-pro-day:hover {
  background: #f8fafc !important;
}

.calendar-pro-day .day-num,
.day-num {
  font-size: 12px !important;
  font-weight: 950 !important;
  color: #64748b !important;
}

.calendar-day-stack {
  margin-top: 8px !important;
  max-height: 112px !important;
  overflow-y: auto !important;
  display: flex !important;
  flex-direction: column !important;
  gap: 6px !important;
  padding-right: 2px !important;
}

.calendar-day-stack::-webkit-scrollbar {
  width: 4px !important;
}

.calendar-day-stack::-webkit-scrollbar-thumb {
  background: #cbd5e1 !important;
  border-radius: 999px !important;
}

.calendar-pro-event {
  width: 100% !important;
  min-height: auto !important;
  padding: 8px 9px !important;
  border-radius: 12px !important;
  background: #ffffff !important;
  color: #0f172a !important;
  border: 1px solid rgba(148,163,184,.30) !important;
  border-left: 5px solid var(--c-primary) !important;
  box-shadow: 0 8px 18px rgba(15,23,42,.07) !important;
  outline: none !important;
}

.calendar-pro-event:hover {
  transform: none !important;
  box-shadow: 0 10px 24px rgba(15,23,42,.10) !important;
}

.calendar-event-top {
  display: flex !important;
  align-items: center !important;
  gap: 6px !important;
}

.calendar-event-top strong {
  font-size: 10px !important;
  color: #0f172a !important;
  line-height: 1.1 !important;
  max-width: 120px !important;
  white-space: nowrap !important;
  overflow: hidden !important;
  text-overflow: ellipsis !important;
}

.calendar-event-top small {
  padding: 3px 6px !important;
  font-size: 8px !important;
  background: #f1f5f9 !important;
  color: #475569 !important;
}

.calendar-pro-event span {
  margin-top: 5px !important;
  color: #334155 !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
  display: -webkit-box !important;
  -webkit-line-clamp: 2 !important;
  -webkit-box-orient: vertical !important;
  overflow: hidden !important;
}

.calendar-pro-event em {
  display: none !important;
}

.calendar-pro-event i {
  display: inline-flex !important;
  width: fit-content !important;
  margin-top: 5px !important;
  padding: 3px 6px !important;
  border-radius: 999px !important;
  background: #fff7ed !important;
  color: #c2410c !important;
  font-size: 8px !important;
  font-weight: 950 !important;
}

.calendar-pro-event.is-urgent {
  border-left-color: #f59e0b !important;
}

.calendar-pro-event.is-missing-material {
  border-left-color: #ef4444 !important;
}

.calendar-pro-event.published,
.calendar-pro-event.Publicado {
  border-left-color: #10b981 !important;
}

.calendar-pro-event.design,
.calendar-pro-event.En-Diseño {
  border-left-color: #3b82f6 !important;
}

@media (max-width: 1200px) {
  .calendar-pro-grid {
    overflow-x: auto !important;
  }

  .calendar-pro-day {
    min-width: 180px !important;
  }
}


/* AZP V10B - Producción ordenada, permisos y control de eliminación */
.production-v10b-page {
  display: grid;
  gap: 18px;
}

.production-v10b-header {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  gap: 20px;
  align-items: center;
  padding: 26px 28px;
  border-radius: 28px;
  color: #fff;
  background: linear-gradient(135deg, #0f172a 0%, #3f1474 50%, var(--c-primary) 100%);
  box-shadow: 0 24px 72px rgba(15,23,42,.15);
}

.production-v10b-header span {
  display: block;
  color: rgba(255,255,255,.72);
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
  font-weight: 950;
  margin-bottom: 8px;
}

.production-v10b-header h2 {
  margin: 0;
  font-size: 30px;
  line-height: 1;
  letter-spacing: -.04em;
}

.production-v10b-header p {
  margin: 9px 0 0;
  color: rgba(255,255,255,.78);
  font-size: 14px;
  max-width: 780px;
}

.production-v10b-kpis {
  display: grid;
  grid-template-columns: repeat(3, 108px);
  gap: 10px;
}

.production-v10b-kpis div {
  padding: 13px 14px;
  border-radius: 18px;
  background: rgba(255,255,255,.13);
  border: 1px solid rgba(255,255,255,.15);
}

.production-v10b-kpis strong {
  display: block;
  font-size: 24px;
  line-height: 1;
}

.production-v10b-kpis small {
  display: block;
  margin-top: 6px;
  color: rgba(255,255,255,.72);
  font-weight: 900;
  font-size: 10px;
  text-transform: uppercase;
}

.permissions-v10b {
  display: grid;
  gap: 14px;
  border-radius: 24px !important;
}

.permissions-v10b-head strong,
.permission-person-v10b b {
  display: block;
  color: #0f172a;
  font-size: 16px;
  font-weight: 950;
}

.permissions-v10b-head span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 13px;
  font-weight: 750;
}

.permission-person-v10b {
  display: grid;
  grid-template-columns: 130px repeat(5, minmax(130px, 1fr));
  gap: 10px;
  align-items: center;
  padding: 14px;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px solid rgba(148,163,184,.24);
}

.permission-person-v10b label {
  min-height: 42px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 10px;
  border-radius: 14px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.22);
  color: #334155;
  font-size: 12px;
  font-weight: 850;
}

.permission-person-v10b input {
  width: 17px;
  height: 17px;
  accent-color: var(--c-primary);
}

.production-filters-v10b {
  display: grid !important;
  grid-template-columns: minmax(240px, 1fr) 260px 220px;
  gap: 12px;
  border-radius: 22px !important;
}

.production-filters-v10b input,
.production-filters-v10b select {
  min-height: 48px;
  border-radius: 15px;
  border: 1px solid rgba(148,163,184,.28);
  padding: 0 14px;
  color: #0f172a;
  font-weight: 800;
  outline: none;
  background: #fff;
}

.production-board-v10b {
  display: grid;
  grid-template-columns: repeat(4, minmax(260px, 1fr));
  gap: 16px;
  align-items: start;
}

.production-column-v10b {
  min-height: 540px;
  max-height: calc(100vh - 320px);
  display: flex;
  flex-direction: column;
  border-radius: 24px;
  background: #f8fafc;
  border: 1px solid rgba(148,163,184,.26);
  overflow: hidden;
}

.production-column-v10b-head {
  min-height: 58px;
  padding: 16px 18px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: #fff;
  border-bottom: 1px solid rgba(226,232,240,.95);
}

.production-column-v10b-head strong {
  color: #0f172a;
  font-size: 14px;
  font-weight: 950;
}

.production-column-v10b-head span {
  min-width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--c-primary);
  font-size: 12px;
  font-weight: 950;
}

.production-column-v10b-body {
  padding: 12px;
  display: grid;
  gap: 12px;
  overflow: auto;
}

.production-card-v10b {
  padding: 14px;
  border-radius: 18px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.25);
  border-left: 5px solid var(--c-primary);
  box-shadow: 0 14px 32px rgba(15,23,42,.07);
}

.production-card-v10b.missing-material {
  border-left-color: #ef4444;
}

.production-card-v10b-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.production-card-v10b-top strong {
  display: block;
  color: #0f172a;
  font-size: 13px;
  line-height: 1.1;
  text-transform: uppercase;
}

.production-card-v10b-top span {
  display: block;
  margin-top: 4px;
  color: #64748b;
  font-size: 11px;
  font-weight: 850;
}

.production-card-v10b-top small {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 9px;
  font-weight: 950;
  white-space: nowrap;
}

.production-card-v10b h4 {
  margin: 12px 0 5px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.18;
  letter-spacing: -.02em;
}

.production-card-v10b p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.production-card-v10b-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 7px;
  margin-top: 12px;
}

.production-card-v10b-tags span {
  padding: 6px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 10px;
  font-weight: 950;
}

.production-card-v10b-tags .tag-priority {
  background: #fff7ed;
  color: #c2410c;
}

.production-card-v10b-tags .tag-danger {
  background: #fef2f2;
  color: #b91c1c;
}

.production-note-v10b {
  margin-top: 12px;
  padding: 10px 11px;
  border-radius: 14px;
  background: #fff7ed;
  color: #9a3412;
  border: 1px solid #fed7aa;
  font-size: 12px;
  font-weight: 800;
  line-height: 1.35;
}

.production-actions-v10b {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
  margin-top: 13px;
}

.production-actions-v10b button {
  min-height: 40px;
  border: 0;
  border-radius: 13px;
  background: #eef2ff;
  color: #334155;
  font-weight: 950;
  font-size: 12px;
}

.production-actions-v10b .danger-action {
  background: #fee2e2;
  color: #991b1b;
}

.production-empty-v10b {
  padding: 26px 14px;
  text-align: center;
  color: #64748b;
  background: #fff;
  border: 1px dashed rgba(148,163,184,.35);
  border-radius: 18px;
  font-weight: 850;
}

@media (max-width: 1300px) {
  .production-board-v10b {
    grid-template-columns: repeat(2, minmax(260px, 1fr));
  }

  .permission-person-v10b {
    grid-template-columns: 1fr 1fr;
  }

  .permission-person-v10b b {
    grid-column: 1 / -1;
  }
}

@media (max-width: 820px) {
  .production-v10b-header,
  .production-filters-v10b,
  .production-board-v10b {
    grid-template-columns: 1fr;
  }

  .production-v10b-kpis {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .production-column-v10b {
    max-height: none;
  }

  .permission-person-v10b {
    grid-template-columns: 1fr;
  }
}


/* AZP V11 - Producción más elegante + calendario profesional */
.permissions-v10b {
  display: grid;
  gap: 12px;
  border: 1px solid rgba(148,163,184,.22) !important;
  box-shadow: 0 18px 50px rgba(15,23,42,.06) !important;
}

.production-v10b-header {
  padding: 28px 32px !important;
  border-radius: 32px !important;
  background:
    radial-gradient(circle at top right, rgba(255,255,255,.20), transparent 32%),
    linear-gradient(135deg, #0b1020 0%, #251052 48%, #9d19d8 100%) !important;
}

.production-v10b-header h2 {
  font-size: 34px !important;
  letter-spacing: -.05em !important;
}

.production-v10b-kpis div {
  background: rgba(255,255,255,.15) !important;
  backdrop-filter: blur(10px);
}

.production-board-v10b {
  gap: 18px !important;
}

.production-column-v10b {
  border-radius: 28px !important;
  background: #f7f9fc !important;
  border: 1px solid rgba(148,163,184,.22) !important;
  box-shadow: 0 16px 44px rgba(15,23,42,.05) !important;
}

.production-column-v10b-head {
  min-height: 64px !important;
}

.production-card-v10b {
  border-radius: 22px !important;
  box-shadow: 0 16px 36px rgba(15,23,42,.08) !important;
  transition: transform .16s ease, box-shadow .16s ease;
}

.production-card-v10b:hover {
  transform: translateY(-2px);
  box-shadow: 0 20px 48px rgba(15,23,42,.11) !important;
}

.production-actions-v10b button {
  border-radius: 15px !important;
}

.calendar-v11-page {
  display: grid;
  gap: 18px;
}

.calendar-v11-hero {
  display: grid;
  grid-template-columns: minmax(280px, 1fr) auto;
  gap: 18px;
  align-items: center;
  padding: 28px 32px;
  border-radius: 32px;
  color: #fff;
  background:
    radial-gradient(circle at top right, rgba(255,255,255,.18), transparent 34%),
    linear-gradient(135deg, #0b1020 0%, #261052 50%, #9d19d8 100%);
  box-shadow: 0 24px 72px rgba(15,23,42,.15);
}

.calendar-v11-hero span {
  display: block;
  margin-bottom: 8px;
  color: rgba(255,255,255,.72);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.calendar-v11-hero h2 {
  margin: 0;
  font-size: 34px;
  line-height: 1;
  letter-spacing: -.05em;
}

.calendar-v11-hero p {
  margin: 10px 0 0;
  color: rgba(255,255,255,.78);
  max-width: 820px;
  font-size: 14px;
  line-height: 1.45;
}

.calendar-v11-controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 10px;
}

.calendar-v11-controls button,
.calendar-v11-controls select,
.calendar-v11-controls input,
.calendar-v11-filters select {
  min-height: 44px;
  border-radius: 14px;
  border: 1px solid rgba(148,163,184,.28);
  padding: 0 14px;
  font-weight: 900;
  outline: none;
}

.calendar-v11-controls button,
.calendar-v11-controls select,
.calendar-v11-controls input {
  background: rgba(255,255,255,.14);
  color: #fff;
  border-color: rgba(255,255,255,.20);
}

.calendar-v11-controls select option {
  color: #0f172a;
}

.calendar-v11-controls input {
  width: 92px;
}

.calendar-v11-stats {
  display: grid;
  grid-template-columns: repeat(6, minmax(110px, 1fr));
  gap: 12px;
}

.calendar-v11-stats div {
  padding: 17px 18px;
  border-radius: 22px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.22);
  box-shadow: 0 14px 34px rgba(15,23,42,.05);
}

.calendar-v11-stats strong {
  display: block;
  color: #0f172a;
  font-size: 28px;
  line-height: 1;
}

.calendar-v11-stats span {
  display: block;
  margin-top: 7px;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
  letter-spacing: .05em;
  text-transform: uppercase;
}

.calendar-v11-filters {
  display: grid;
  grid-template-columns: 280px 240px;
  gap: 12px;
}

.calendar-v11-filters select {
  background: #fff;
  color: #0f172a;
}

.calendar-v11-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 390px;
  gap: 18px;
  align-items: start;
}

.calendar-v11-board,
.calendar-v11-agenda {
  overflow: hidden;
  border-radius: 28px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.22);
  box-shadow: 0 22px 62px rgba(15,23,42,.07);
}

.calendar-v11-weekdays {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  background: #f8fafc;
  border-bottom: 1px solid rgba(226,232,240,.92);
}

.calendar-v11-weekdays b {
  padding: 14px 12px;
  color: #64748b;
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .06em;
  text-transform: uppercase;
}

.calendar-v11-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
}

.calendar-v11-day {
  min-height: 148px;
  padding: 10px;
  border: 0;
  border-right: 1px solid rgba(226,232,240,.92);
  border-bottom: 1px solid rgba(226,232,240,.92);
  background: linear-gradient(180deg, #fff, #fbfdff);
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.calendar-v11-day:nth-child(7n) {
  border-right: 0;
}

.calendar-v11-day:hover {
  background: #f8fafc;
}

.calendar-v11-day.empty {
  background: #f8fafc;
  cursor: default;
}

.calendar-v11-day.selected {
  background: #fbf5ff;
  box-shadow: inset 0 0 0 2px rgba(157,25,216,.35);
}

.calendar-v11-day.today .calendar-v11-daytop strong {
  color: var(--c-primary);
}

.calendar-v11-daytop {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.calendar-v11-daytop strong {
  color: #334155;
  font-size: 13px;
  font-weight: 950;
}

.calendar-v11-daytop span {
  min-width: 24px;
  height: 24px;
  display: grid;
  place-items: center;
  border-radius: 999px;
  background: #eef2ff;
  color: var(--c-primary);
  font-size: 11px;
  font-weight: 950;
}

.calendar-v11-dayitems {
  display: grid;
  gap: 6px;
  margin-top: 10px;
}

.calendar-v11-mini {
  width: 100%;
  min-height: 46px;
  padding: 7px 8px;
  border: 1px solid rgba(148,163,184,.22);
  border-left: 4px solid var(--c-primary);
  border-radius: 13px;
  background: #fff;
  text-align: left;
  box-shadow: 0 8px 18px rgba(15,23,42,.05);
}

.calendar-v11-mini.no-material {
  border-left-color: #ef4444;
  background: #fffafa;
}

.calendar-v11-mini strong,
.calendar-v11-mini span,
.calendar-v11-mini em {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.calendar-v11-mini strong {
  color: #0f172a;
  font-size: 10px;
  line-height: 1.05;
  text-transform: uppercase;
}

.calendar-v11-mini span {
  margin-top: 3px;
  color: #334155;
  font-size: 10px;
  font-weight: 850;
}

.calendar-v11-mini em {
  margin-top: 3px;
  color: #64748b;
  font-size: 9px;
  font-style: normal;
  font-weight: 900;
}

.calendar-v11-dayitems small {
  width: fit-content;
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #64748b;
  font-size: 10px;
  font-weight: 950;
}

.calendar-v11-agenda {
  position: sticky;
  top: 88px;
}

.calendar-v11-agenda-head {
  padding: 22px 22px 18px;
  color: #fff;
  background: linear-gradient(135deg, #0f172a, #312e81);
}

.calendar-v11-agenda-head span {
  display: block;
  color: rgba(255,255,255,.72);
  font-size: 11px;
  font-weight: 950;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.calendar-v11-agenda-head h3 {
  margin: 8px 0 4px;
  font-size: 22px;
}

.calendar-v11-agenda-head p {
  margin: 0;
  color: rgba(255,255,255,.76);
  font-size: 13px;
}

.calendar-v11-agenda-list {
  display: grid;
  gap: 12px;
  padding: 15px;
  max-height: 680px;
  overflow: auto;
}

.calendar-v11-agenda-card {
  padding: 15px;
  border-radius: 20px;
  background: #fff;
  border: 1px solid rgba(148,163,184,.24);
  border-left: 5px solid var(--c-primary);
  box-shadow: 0 14px 34px rgba(15,23,42,.07);
}

.calendar-v11-agenda-card.no-material {
  border-left-color: #ef4444;
}

.agenda-v11-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  align-items: flex-start;
}

.agenda-v11-top strong {
  color: #0f172a;
  font-size: 12px;
  text-transform: uppercase;
  line-height: 1.15;
}

.agenda-v11-top small {
  padding: 5px 8px;
  border-radius: 999px;
  background: #f1f5f9;
  color: #475569;
  font-size: 9px;
  font-weight: 950;
  white-space: nowrap;
}

.calendar-v11-agenda-card h4 {
  margin: 10px 0 5px;
  color: #0f172a;
  font-size: 16px;
  line-height: 1.2;
}

.calendar-v11-agenda-card p {
  margin: 0;
  color: #64748b;
  font-size: 12px;
  font-weight: 800;
}

.agenda-v11-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
  margin-top: 13px;
}

.agenda-v11-actions button {
  min-height: 42px;
  border: 0;
  border-radius: 14px;
  background: #eef2ff;
  color: #334155;
  font-size: 12px;
  font-weight: 950;
}

.agenda-v11-actions .material-action {
  background: #fee2e2;
  color: #991b1b;
}

.calendar-v11-empty {
  padding: 28px 18px;
  text-align: center;
  border-radius: 18px;
  background: #f8fafc;
  border: 1px dashed rgba(148,163,184,.36);
}

.calendar-v11-empty strong,
.calendar-v11-empty span {
  display: block;
}

.calendar-v11-empty strong {
  color: #0f172a;
}

.calendar-v11-empty span {
  margin-top: 6px;
  color: #64748b;
  font-size: 13px;
}

@media (max-width: 1250px) {
  .calendar-v11-hero,
  .calendar-v11-layout {
    grid-template-columns: 1fr;
  }

  .calendar-v11-controls {
    justify-content: flex-start;
  }

  .calendar-v11-agenda {
    position: static;
  }

  .calendar-v11-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 820px) {
  .calendar-v11-stats,
  .calendar-v11-filters {
    grid-template-columns: 1fr;
  }

  .calendar-v11-board {
    overflow-x: auto;
  }

  .calendar-v11-weekdays,
  .calendar-v11-grid {
    min-width: 980px;
  }
}


/* AZP V12 - Conteo real por red + historias + material correcto */
.publication-units-v12 {
  margin-top: 9px;
  padding: 8px 10px;
  border-radius: 13px;
  background: #f8fafc;
  border: 1px solid rgba(148,163,184,.24);
  color: #475569;
  font-size: 11px;
  font-weight: 850;
  line-height: 1.35;
}

.publication-units-v12 strong {
  color: var(--c-primary);
  font-weight: 950;
}

.publication-units-v12 span {
  display: block;
  margin-top: 3px;
  color: #64748b;
}

.publication-units-v12.compact {
  font-size: 10px;
  padding: 7px 8px;
}

.publication-units-v12.compact span {
  display: inline;
  margin-top: 0;
}

.material-marked-v12 {
  min-height: 38px;
  display: grid;
  place-items: center;
  padding: 9px 10px;
  border-radius: 14px;
  background: #fee2e2;
  color: #991b1b;
  font-size: 12px;
  font-weight: 950;
  text-align: center;
}

.calendar-v11-agenda-card:not(.no-material) .material-action {
  display: none !important;
}

.calendar-v11-mini.no-material strong::after {
  content: " · Sin material";
  color: #ef4444;
  font-weight: 950;
}


/* AZP V13 - CRM por red y control mensual de pagos operativos */
.ops-v13-panel {
  margin-bottom: 18px;
  padding: 20px;
  border-radius: 22px;
  background: linear-gradient(135deg, #ffffff, #f8fafc);
  border: 1px solid rgba(148,163,184,.24);
  box-shadow: 0 14px 36px rgba(15,23,42,.05);
}
.ops-v13-panel h3 { margin: 0; color: #0f172a; font-size: 18px; font-weight: 950; }
.ops-v13-panel p { margin: 5px 0 0; color: #64748b; font-size: 13px; font-weight: 750; }
.ops-v13-grid { display: grid; grid-template-columns: repeat(3, minmax(160px, 1fr)); gap: 12px; margin-top: 15px; }
.ops-v13-item { padding: 15px; border-radius: 18px; background: #fff; border: 1px solid rgba(148,163,184,.28); }
.ops-v13-item strong, .ops-v13-item span, .ops-v13-item small { display: block; }
.ops-v13-item strong { color: #0f172a; font-size: 14px; font-weight: 950; }
.ops-v13-item span { margin-top: 5px; color: var(--c-primary); font-size: 22px; font-weight: 950; }
.ops-v13-item small { margin-top: 4px; color: #64748b; font-weight: 850; }
.ops-v13-item.pending { border-left: 5px solid #f59e0b; }
.ops-v13-item.paid { border-left: 5px solid #10b981; }
.ops-v13-item button { width: 100%; min-height: 38px; margin-top: 12px; border: 0; border-radius: 13px; background: #eef2ff; color: #334155; font-weight: 950; }
.ops-v13-note { margin-top: 14px; padding: 12px 14px; border-radius: 15px; background: #f8fafc; color: #475569; border: 1px dashed rgba(148,163,184,.35); font-size: 12px; font-weight: 800; }
@media (max-width: 900px) { .ops-v13-grid { grid-template-columns: 1fr; } }

`;
