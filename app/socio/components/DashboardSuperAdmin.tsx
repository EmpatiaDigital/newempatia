"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import Image from "next/image";
import Logo from "../../assets/empatialog.jpeg";

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface Socio {
  _id: string;
  nombre: string;
  apellido: string;
  role: string;
  active: boolean;
  freezeUntil: string | null;
  tipo: string;
}

interface Pago {
  _id: string;
  mes: number;
  anio: number;
  monto: number;
  estado: "comprobante_enviado" | "aceptado" | "rechazado" | string;
  comprobanteUrl: string;
  comprobanteNombre?: string;
  comprobanteTipo?: string;
  notaAdmin?: string;
  fechaAccion?: string;
  createdAt?: string;
  socioId?: {
    _id?: string;
    nombre?: string;
    apellido?: string;
    numeroSocio?: string;
    correo?: string;
    ciudad?: string;
    avatar?: string;
  };
}

type Vista = "dashboard" | "socios" | "pagos";

// ── Helpers ───────────────────────────────────────────────────────────────────

const NOMBRES_MESES = [
  "Enero","Febrero","Marzo","Abril","Mayo","Junio",
  "Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre",
];

function formatMonto(n: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency", currency: "ARS", maximumFractionDigits: 0,
  }).format(n);
}

const ESTADO_INFO: Record<string, { bg: string; color: string; label: string }> = {
  comprobante_enviado: { bg: "#fef3c7", color: "#92400e", label: "⏳ En revisión" },
  aceptado:           { bg: "#f0fdf4", color: "#166534", label: "✅ Aceptado"    },
  rechazado:          { bg: "#fef2f2", color: "#991b1b", label: "❌ Rechazado"   },
};

// ── ComprobanteModal ──────────────────────────────────────────────────────────
// Solo visualización para el admin: imagen o PDF, datos del socio, estado.

interface ModalProps {
  pago: Pago | null;
  onClose: () => void;
  onAceptar: (id: string) => Promise<void>;
  onRechazar: (id: string) => Promise<void>;
}

function ComprobanteModal({ pago, onClose, onAceptar, onRechazar }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const [accionando, setAccionando] = useState(false);

  // Cerrar con Escape
  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", fn);
    return () => document.removeEventListener("keydown", fn);
  }, [onClose]);

  // Bloquear scroll
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  if (!pago) return null;

  const esPdf =
    pago.comprobanteTipo === "application/pdf" ||
    pago.comprobanteUrl?.toLowerCase().endsWith(".pdf");

  const estadoInfo = ESTADO_INFO[pago.estado] ?? { bg: "#f1f5f9", color: "#475569", label: pago.estado };
  const socio = pago.socioId;
  const nombreMes = NOMBRES_MESES[(pago.mes ?? 1) - 1];

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === overlayRef.current) onClose();
  };

  const handleAceptar = async () => {
    setAccionando(true);
    await onAceptar(pago._id);
    setAccionando(false);
  };

  const handleRechazar = async () => {
    const { value: nota, isConfirmed } = await Swal.fire({
      title: "Motivo de rechazo",
      input: "textarea",
      inputPlaceholder: "Describí el motivo (opcional)...",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    setAccionando(true);
    await onRechazar(pago._id);
    setAccionando(false);
  };

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position: "fixed", inset: 0,
        backgroundColor: "rgba(0,0,0,0.65)",
        zIndex: 99999,
        display: "flex", alignItems: "center", justifyContent: "center",
        padding: "16px",
      }}
    >
      <div style={{
        background: "#fff", borderRadius: "16px",
        width: "100%", maxWidth: "560px", maxHeight: "90vh",
        overflowY: "auto", display: "flex", flexDirection: "column",
        boxShadow: "0 24px 64px rgba(0,0,0,0.35)",
      }}>

        {/* ── Header ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "20px 24px 16px", borderBottom: "1px solid #e2e8f0" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "17px", fontWeight: 700, color: "#0f172a" }}>
              Comprobante de pago
            </h2>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#64748b" }}>
              {nombreMes} {pago.anio}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Cerrar modal"
            style={{
              background: "#f1f5f9", border: "none", borderRadius: "8px",
              width: "36px", height: "36px", cursor: "pointer",
              fontSize: "18px", display: "flex", alignItems: "center",
              justifyContent: "center", color: "#475569", flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* ── Datos del socio ── */}
        {socio && (
          <div style={{ padding: "14px 24px", background: "#f8fafc", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <div style={{
              width: "40px", height: "40px", borderRadius: "50%",
              background: "#dbeafe", display: "flex", alignItems: "center",
              justifyContent: "center", fontSize: "15px", fontWeight: 700,
              color: "#1d4ed8", flexShrink: 0,
            }}>
              {(socio.nombre?.[0] ?? "?").toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "14px", fontWeight: 700, color: "#0f172a" }}>
                {socio.nombre} {socio.apellido}
              </p>
              <p style={{ margin: 0, fontSize: "12px", color: "#64748b" }}>
                N° {socio.numeroSocio} · {socio.ciudad} · {socio.correo}
              </p>
            </div>
            <span style={{
              padding: "4px 10px", borderRadius: "20px",
              fontSize: "12px", fontWeight: 700,
              background: estadoInfo.bg, color: estadoInfo.color,
              whiteSpace: "nowrap",
            }}>
              {estadoInfo.label}
            </span>
          </div>
        )}

        {/* ── Monto y archivo ── */}
        <div style={{ padding: "14px 24px", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "20px", flexWrap: "wrap", alignItems: "center" }}>
          <div>
            <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
              Monto declarado
            </p>
            <p style={{ margin: "2px 0 0", fontSize: "22px", fontWeight: 800, color: "#0f172a" }}>
              {formatMonto(pago.monto)}
            </p>
          </div>
          {pago.comprobanteNombre && (
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ margin: 0, fontSize: "11px", color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 700 }}>
                Archivo
              </p>
              <p style={{ margin: "2px 0 0", fontSize: "13px", color: "#475569", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                📎 {pago.comprobanteNombre}
              </p>
            </div>
          )}
        </div>

        {/* ── Imagen o PDF ── */}
        <div style={{ padding: "20px 24px" }}>
          {esPdf ? (
            <div style={{ textAlign: "center", background: "#f1f5f9", borderRadius: "12px", padding: "36px 20px" }}>
              <p style={{ margin: "0 0 6px", fontSize: "40px" }}>📄</p>
              <p style={{ margin: "0 0 16px", fontSize: "14px", color: "#475569", fontWeight: 600 }}>
                El comprobante es un PDF
              </p>
              <a
                href={pago.comprobanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: "inline-block", padding: "10px 24px",
                  background: "#1d4ed8", color: "#fff",
                  borderRadius: "8px", textDecoration: "none",
                  fontSize: "14px", fontWeight: 700,
                }}
              >
                Abrir PDF en nueva pestaña →
              </a>
            </div>
          ) : (
            <>
              <div style={{ borderRadius: "12px", overflow: "hidden", border: "1px solid #e2e8f0", background: "#f8fafc", textAlign: "center" }}>
                <img
                  src={pago.comprobanteUrl}
                  alt="Comprobante de pago"
                  crossOrigin="anonymous"
                  style={{ width: "100%", maxHeight: "400px", objectFit: "contain", display: "block", background: "#f8fafc" }}
                />
              </div>
              <div style={{ marginTop: "10px", textAlign: "center" }}>
                <a
                  href={pago.comprobanteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    display: "inline-block", padding: "7px 18px",
                    background: "#f1f5f9", color: "#475569",
                    borderRadius: "8px", textDecoration: "none",
                    fontSize: "13px", fontWeight: 600,
                    border: "1px solid #e2e8f0",
                  }}
                >
                  🔍 Ver imagen completa
                </a>
              </div>
            </>
          )}
        </div>

        {/* ── Nota del admin (si existe) ── */}
        {pago.notaAdmin && (
          <div style={{ padding: "0 24px 16px" }}>
            <div style={{ background: "#fef9c3", border: "1px solid #fde68a", borderRadius: "10px", padding: "12px 14px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "11px", color: "#92400e", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Nota del administrador
              </p>
              <p style={{ margin: 0, fontSize: "13px", color: "#78350f" }}>{pago.notaAdmin}</p>
            </div>
          </div>
        )}

        {/* ── Footer: acciones del admin ── */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e2e8f0", display: "flex", gap: "10px", justifyContent: "flex-end", flexWrap: "wrap" }}>
          {pago.estado === "comprobante_enviado" && (
            <>
              <button
                onClick={handleAceptar}
                disabled={accionando}
                style={{
                  padding: "9px 20px", background: "#16a34a", color: "#fff",
                  border: "none", borderRadius: "8px", cursor: accionando ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: 700, opacity: accionando ? 0.6 : 1,
                }}
              >
                ✓ Aceptar pago
              </button>
              <button
                onClick={handleRechazar}
                disabled={accionando}
                style={{
                  padding: "9px 20px", background: "#dc2626", color: "#fff",
                  border: "none", borderRadius: "8px", cursor: accionando ? "not-allowed" : "pointer",
                  fontSize: "14px", fontWeight: 700, opacity: accionando ? 0.6 : 1,
                }}
              >
                ✕ Rechazar
              </button>
            </>
          )}
          <button
            onClick={onClose}
            style={{
              padding: "9px 20px", background: "#1e293b", color: "#fff",
              border: "none", borderRadius: "8px", cursor: "pointer",
              fontSize: "14px", fontWeight: 700,
            }}
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Vista Pagos ───────────────────────────────────────────────────────────────

function VistaPagos({ onVolver }: { onVolver: () => void }) {
  const [pagos, setPagos]           = useState<Pago[]>([]);
  const [loading, setLoading]       = useState(true);
  const [filtro, setFiltro]         = useState("comprobante_enviado");
  const [pagoModal, setPagoModal]   = useState<Pago | null>(null);

  const fetchPagos = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const url = filtro
        ? `http://localhost:5000/api/pagos?estado=${filtro}`
        : "http://localhost:5000/api/pagos";
      const res  = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
      const data = await res.json();
      setPagos(Array.isArray(data) ? data : []);
    } catch {
      setPagos([]);
    } finally {
      setLoading(false);
    }
  }, [filtro]);

  useEffect(() => { fetchPagos(); }, [fetchPagos]);

  const handleAceptar = async (id: string) => {
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:5000/api/pagos/${id}/aceptar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ notaAdmin: "Comprobante verificado" }),
    });
    setPagos((prev) => prev.map((p) => p._id === id ? { ...p, estado: "aceptado" } : p));
    // actualizar también el pago del modal si está abierto
    setPagoModal((prev) => prev?._id === id ? { ...prev, estado: "aceptado" } : prev);
    Swal.fire({ icon: "success", title: "Pago aceptado", text: "La cuota quedó marcada como pagada.", timer: 2000, showConfirmButton: false });
  };

  const handleRechazar = async (id: string) => {
    const { value: nota, isConfirmed } = await Swal.fire({
      title: "Motivo de rechazo",
      input: "textarea",
      inputPlaceholder: "Describí el motivo (opcional)...",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
    });
    if (!isConfirmed) return;
    const token = localStorage.getItem("token");
    await fetch(`http://localhost:5000/api/pagos/${id}/rechazar`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ notaAdmin: nota ?? "" }),
    });
    setPagos((prev) => prev.map((p) => p._id === id ? { ...p, estado: "rechazado", notaAdmin: nota ?? "" } : p));
    setPagoModal((prev) => prev?._id === id ? { ...prev, estado: "rechazado", notaAdmin: nota ?? "" } : prev);
    Swal.fire({ icon: "info", title: "Pago rechazado", text: "El socio podrá reenviar el comprobante.", timer: 2000, showConfirmButton: false });
  };

  const FILTROS = [
    { value: "comprobante_enviado", label: "En revisión" },
    { value: "aceptado",            label: "Aceptados"   },
    { value: "rechazado",           label: "Rechazados"  },
    { value: "",                    label: "Todos"        },
  ];

  return (
    <div className="socio-dashboard-container">
      <div style={{ width: "100%", maxWidth: "960px" }}>

        {/* Volver */}
        <button
          onClick={onVolver}
          style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontWeight: 600, marginBottom: "24px", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
        >
          ← Volver al panel
        </button>

        {/* Título */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>
              Comprobantes de pago
            </h2>
            <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>
              Revisá, aceptá o rechazá los comprobantes enviados por los socios
            </p>
          </div>
          <span style={{ background: "#fef3c7", color: "#92400e", fontSize: "13px", fontWeight: 600, padding: "4px 14px", borderRadius: "20px" }}>
            {pagos.length} resultado{pagos.length !== 1 ? "s" : ""}
          </span>
        </div>

        {/* Filtros */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "20px" }}>
          {FILTROS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFiltro(value)}
              style={{
                padding: "7px 16px", borderRadius: "8px", cursor: "pointer",
                fontSize: "13px", fontWeight: 600, transition: "all 0.15s",
                border: `1.5px solid ${filtro === value ? "#1d4ed8" : "#e2e8f0"}`,
                background: filtro === value ? "#1d4ed8" : "#fff",
                color: filtro === value ? "#fff" : "#475569",
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Lista */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "16px" }}>
            <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#dc2626", animation: "spin 0.8s linear infinite" }} />
            <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Cargando comprobantes...</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        ) : pagos.length === 0 ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "#94a3b8" }}>
            <p style={{ fontSize: "32px", margin: "0 0 8px" }}>📭</p>
            <p style={{ margin: 0, fontSize: "14px", fontWeight: 600 }}>No hay comprobantes para mostrar.</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {pagos.map((pago) => {
              const socio     = pago.socioId;
              const nombreMes = NOMBRES_MESES[(pago.mes ?? 1) - 1];
              const ei        = ESTADO_INFO[pago.estado] ?? { bg: "#f1f5f9", color: "#475569", label: pago.estado };

              return (
                <div
                  key={pago._id}
                  style={{
                    background: "#fff", border: "1px solid #e5e7eb",
                    borderRadius: "12px", padding: "16px 20px",
                    display: "flex", alignItems: "center", gap: "14px",
                    flexWrap: "wrap", boxShadow: "0 1px 4px rgba(0,0,0,0.05)",
                  }}
                >
                  {/* Iniciales */}
                  <div style={{
                    width: "42px", height: "42px", borderRadius: "50%",
                    background: "#dbeafe", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "15px", fontWeight: 700, color: "#1d4ed8",
                  }}>
                    {(socio?.nombre?.[0] ?? "?").toUpperCase()}
                  </div>

                  {/* Info socio */}
                  <div style={{ flex: 1, minWidth: "160px" }}>
                    <p style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "#0f172a" }}>
                      {socio?.nombre} {socio?.apellido}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "12px", color: "#64748b" }}>
                      N° {socio?.numeroSocio} · {socio?.ciudad}
                    </p>
                  </div>

                  {/* Mes / monto */}
                  <div style={{ textAlign: "center", minWidth: "90px" }}>
                    <p style={{ margin: 0, fontSize: "12px", color: "#94a3b8", fontWeight: 600 }}>
                      {nombreMes} {pago.anio}
                    </p>
                    <p style={{ margin: "2px 0 0", fontSize: "16px", fontWeight: 800, color: "#0f172a" }}>
                      {formatMonto(pago.monto)}
                    </p>
                  </div>

                  {/* Badge estado */}
                  <span style={{ padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, background: ei.bg, color: ei.color, whiteSpace: "nowrap" }}>
                    {ei.label}
                  </span>

                  {/* Botón ver comprobante → abre modal */}
                  <button
                    onClick={() => setPagoModal(pago)}
                    style={{
                      padding: "8px 16px", background: "#1e293b", color: "#fff",
                      border: "none", borderRadius: "8px", cursor: "pointer",
                      fontSize: "13px", fontWeight: 600, whiteSpace: "nowrap",
                    }}
                  >
                    🖼 Ver comprobante
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {pagoModal && (
        <ComprobanteModal
          pago={pagoModal}
          onClose={() => setPagoModal(null)}
          onAceptar={handleAceptar}
          onRechazar={handleRechazar}
        />
      )}
    </div>
  );
}

// ── SuperAdminDashboard ───────────────────────────────────────────────────────

export default function SuperAdminDashboard() {
  const { user, logout } = useAuth();
  const router           = useRouter();
  const [vista, setVista]             = useState<Vista>("dashboard");
  const [socios, setSocios]           = useState<Socio[]>([]);
  const [loadingSocios, setLoadingSocios] = useState(false);

  // Guard: solo superadmin
  useEffect(() => {
    if (user && user.role !== "superadmin") router.replace("/");
  }, [user, router]);

  // Cargar socios
  useEffect(() => {
    if (vista !== "socios") return;
    setLoadingSocios(true);
    fetch("http://localhost:5000/api/active/accounts")
      .then((res) => res.json())
      .then((data: Socio[]) => {
        setSocios(data.filter((u) => u.tipo === "socio"));
        setLoadingSocios(false);
      })
      .catch(() => setLoadingSocios(false));
  }, [vista]);

  const handleLogout = (): void => {
    Swal.fire({
      title: "¿Cerrar sesión?", icon: "question",
      showCancelButton: true, confirmButtonText: "Sí, salir", cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626", cancelButtonColor: "#6b7280",
    }).then((result) => { if (result.isConfirmed) logout(); });
  };

  const manejarCongelado = async (socio: Socio) => {
    const { value: formValues, isConfirmed } = await Swal.fire({
      title: `Congelar a ${socio.nombre} ${socio.apellido}`,
      html: `
        <label style="display:block;text-align:left;margin-bottom:6px;font-size:14px">Medición de tiempo</label>
        <select id="swal-tipo" class="swal2-input" style="margin-bottom:12px">
          <option value="d">Días</option>
          <option value="h">Horas</option>
        </select>
        <label style="display:block;text-align:left;margin-bottom:6px;font-size:14px">Cantidad</label>
        <input id="swal-tiempo" type="number" min="1" class="swal2-input" placeholder="Ej: 7" />
      `,
      showCancelButton: true, confirmButtonText: "Confirmar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626", focusConfirm: false,
      preConfirm: () => {
        const tipo     = (document.getElementById("swal-tipo") as HTMLSelectElement).value;
        const cantidad = (document.getElementById("swal-tiempo") as HTMLInputElement).value;
        if (!tipo || !cantidad || Number(cantidad) <= 0) {
          Swal.showValidationMessage("Ingresá una cantidad válida.");
          return false;
        }
        return [tipo, cantidad];
      },
    });
    if (!isConfirmed || !formValues) return;
    const [tipo, cantidad] = formValues as [string, string];
    const ms = tipo === "h"
      ? Number(cantidad) * 60 * 60 * 1000
      : Number(cantidad) * 24 * 60 * 60 * 1000;
    const tiempoFinal = new Date(Date.now() + ms);
    try {
      await fetch(`http://localhost:5000/api/active/${socio._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: false, hasta: tiempoFinal, tipo: "socio" }),
      });
      Swal.fire("Cuenta pausada", `${socio.nombre} fue congelado correctamente.`, "success");
      setSocios((prev) => prev.map((s) =>
        s._id === socio._id ? { ...s, active: false, freezeUntil: tiempoFinal.toISOString() } : s
      ));
    } catch {
      Swal.fire("Error", "No se pudo congelar al usuario.", "error");
    }
  };

  const manejarHabilitar = async (socio: Socio) => {
    const { isConfirmed } = await Swal.fire({
      title: `¿Habilitar a ${socio.nombre}?`,
      text: "El socio recuperará el acceso de inmediato.",
      icon: "question", showCancelButton: true,
      confirmButtonText: "Sí, habilitar", cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
    });
    if (!isConfirmed) return;
    try {
      await fetch(`http://localhost:5000/api/active/${socio._id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activo: true, tipo: "socio" }),
      });
      Swal.fire("Habilitado", `${socio.nombre} vuelve a estar activo.`, "success");
      setSocios((prev) => prev.map((s) =>
        s._id === socio._id ? { ...s, active: true, freezeUntil: null } : s
      ));
    } catch {
      Swal.fire("Error", "No se pudo habilitar al usuario.", "error");
    }
  };

  if (!user || user.role !== "superadmin") return null;

  // ── Vista: Pagos ─────────────────────────────────────────────────────────
  if (vista === "pagos") {
    return <VistaPagos onVolver={() => setVista("dashboard")} />;
  }

  // ── Vista: Socios ────────────────────────────────────────────────────────
  if (vista === "socios") {
    return (
      <div className="socio-dashboard-container">
        <div style={{ width: "100%", maxWidth: "900px" }}>
          <button
            onClick={() => setVista("dashboard")}
            style={{ background: "none", border: "none", cursor: "pointer", color: "#64748b", fontSize: "14px", fontWeight: 600, marginBottom: "24px", display: "flex", alignItems: "center", gap: "6px", padding: 0 }}
          >
            ← Volver al panel
          </button>

          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "24px" }}>
            <div>
              <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "#1e293b" }}>Gestión de socios</h2>
              <p style={{ margin: "4px 0 0", fontSize: "13px", color: "#6b7280" }}>Congelá o habilitá cuentas de socios</p>
            </div>
            <span style={{ background: "#fee2e2", color: "#dc2626", fontSize: "13px", fontWeight: 600, padding: "4px 14px", borderRadius: "20px" }}>
              {socios.length} socios
            </span>
          </div>

          {loadingSocios ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: "16px" }}>
              <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #e5e7eb", borderTopColor: "#dc2626", animation: "spin 0.8s linear infinite" }} />
              <p style={{ color: "#6b7280", fontSize: "14px", margin: 0 }}>Cargando socios...</p>
              <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
          ) : socios.length === 0 ? (
            <p style={{ color: "#6b7280", textAlign: "center", padding: "48px 0" }}>No hay socios registrados.</p>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: "12px" }}>
              {socios.map((socio) => (
                <li
                  key={socio._id}
                  style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "16px 20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: "180px" }}>
                    <div style={{ width: "38px", height: "38px", borderRadius: "50%", background: socio.active ? "#dcfce7" : "#fee2e2", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "13px", fontWeight: 700, flexShrink: 0, color: socio.active ? "#16a34a" : "#dc2626" }}>
                      {socio.nombre[0]}{socio.apellido[0]}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 600, fontSize: "15px", color: "#111827" }}>
                        {socio.nombre} {socio.apellido}
                      </p>
                      <span style={{ fontSize: "11px", fontWeight: 600, color: socio.active ? "#16a34a" : "#dc2626", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        {socio.active ? "Activo" : "Congelado"}
                      </span>
                      {!socio.active && socio.freezeUntil && (
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "#92400e", background: "#fef3c7", borderRadius: "6px", padding: "2px 8px", display: "inline-block" }}>
                          Hasta el <strong>{new Date(socio.freezeUntil).toLocaleDateString("es-AR")}</strong> a las{" "}
                          {new Date(socio.freezeUntil).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })}hs
                        </p>
                      )}
                    </div>
                  </div>
                  {socio.active ? (
                    <button onClick={() => manejarCongelado(socio)} style={{ background: "#fee2e2", color: "#dc2626", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Congelar cuenta
                    </button>
                  ) : (
                    <button onClick={() => manejarHabilitar(socio)} style={{ background: "#dcfce7", color: "#16a34a", border: "none", borderRadius: "8px", padding: "8px 16px", fontSize: "13px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                      Habilitar cuenta
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    );
  }

  // ── Vista: Dashboard principal ────────────────────────────────────────────
  return (
    <div className="socio-dashboard-container">
      {/* Header */}
      <div style={{ width: "100%", maxWidth: "900px", display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "28px", padding: "0 4px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={user?.avatar}
            alt="Avatar"
            style={{ width: "46px", height: "46px", borderRadius: "10px", objectFit: "cover", border: "2px solid rgba(220,38,38,0.35)" }}
          />
          <div>
            <p style={{ margin: 0, fontSize: "12px", color: "#64748b", textTransform: "uppercase", letterSpacing: "1px" }}>Panel de</p>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "#1e293b" }}>Super Administrador</h2>
          </div>
        </div>
        <button
          onClick={handleLogout}
          style={{ backgroundColor: "#fee2e2", color: "#dc2626", border: "none", padding: "9px 18px", borderRadius: "8px", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* Cards */}
      <div className="cards-container">

        {/* Card: Perfil */}
        <div className="card-header-modern-complete">
          <div className="card-header" style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)" }}>
            <h1>Mi Perfil</h1>
            <Image src={Logo} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p><strong>Nombre:</strong> {user?.nombre || "No disponible"}</p>
            <p><strong>Correo:</strong> {user?.username || "No disponible"}</p>
            <p><strong>Rol:</strong> Super Administrador</p>
            <p><strong>ID:</strong> {user?.id || "No disponible"}</p>
          </div>
        </div>

        {/* Card: Gestión de admins */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-blue">
            <h1>Gestión de Administradores</h1>
            <Image src={Logo} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Creá, editá y desactivá cuentas de administradores.
            </p>
            <button className="card-changes" onClick={() => Swal.fire("Próximamente", "Esta función estará disponible en breve.", "info")}>
              Ver administradores
            </button>
            <button className="card-changes" onClick={() => Swal.fire("Próximamente", "Esta función estará disponible en breve.", "info")}>
              Crear administrador
            </button>
          </div>
        </div>

        {/* Card: Gestión global de socios */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-green">
            <h1>Gestión Global de Socios</h1>
            <Image src={Logo} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Accedé al listado completo de socios y realizá acciones masivas.
            </p>
            <button className="card-changes" onClick={() => Swal.fire("Próximamente", "Esta función estará disponible en breve.", "info")}>
              Ver todos los socios
            </button>
            <button className="card-changes" onClick={() => setVista("socios")}>
              Activar / Desactivar socios
            </button>
          </div>
        </div>

        {/* Card: Comprobantes de pago ← NUEVA */}
        <div className="card-header-modern-complete">
          <div className="card-header" style={{ background: "linear-gradient(135deg, #064e3b, #065f46)" }}>
            <h1>Comprobantes de Pago</h1>
            <Image src={Logo} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Revisá los comprobantes enviados por los socios y aceptá o rechazá cada uno.
            </p>
            <button className="card-changes" onClick={() => setVista("pagos")}>
              Ver comprobantes
            </button>
          </div>
        </div>

        {/* Card: Configuración del sistema */}
        <div className="card-header-modern-complete">
          <div className="card-header" style={{ background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)" }}>
            <h1>Configuración del Sistema</h1>
            <Image src={Logo} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Parámetros globales de la plataforma Empatía Digital.
            </p>
            <button className="card-changes" onClick={() => router.push("/socio/cuotas")}>
              Configurar cuotas
            </button>
            <button className="card-changes" onClick={() => Swal.fire("Próximamente", "Esta función estará disponible en breve.", "info")}>
              Ver logs del sistema
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}