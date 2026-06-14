"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
import "../../style/Cuotas.css";

// ── Tipos ─────────────────────────────────────────────────────────────────────

type RolCuotas = "superadmin" | "admin" | "socio";

type EstadoCuota =
  | "pagada"
  | "vencida"
  | "vence-hoy"
  | "pendiente"
  | "no-era-socio";

// Estado del comprobante enviado por el socio
type EstadoPago =
  | "pendiente_comprobante"
  | "comprobante_enviado"
  | "aceptado"
  | "rechazado";

interface CuotaMes {
  _id?: string;
  mes: number;
  anio: number;
  pagada: boolean;
  fechaPago?: string | null;
  monto?: number | null;
}

// Registro de pago / comprobante
interface PagoComprobante {
  _id: string;
  socioId: string;
  mes: number;
  anio: number;
  monto: number;
  estado: EstadoPago;
  comprobanteUrl: string;
  comprobanteNombre?: string;
  notaAdmin?: string;
  fechaAccion?: string;
  createdAt: string;
}

interface SocioConCuotas {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  fechaInscripcion: string;
  cuotas: CuotaMes[];
}

interface ParametrosCuota {
  montoBase: number;
  diaCierre: number;
  moneda: "ARS" | "USD";
}

// ── Constantes ────────────────────────────────────────────────────────────────

const API = "https://newempatiabackend.vercel.app";
const HOY = new Date();

const MESES_MOSTRAR = (() => {
  const meses: { mes: number; anio: number }[] = [];
  const inicio = new Date(HOY.getFullYear(), HOY.getMonth() - 2, 1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    meses.push({ mes: d.getMonth() + 1, anio: d.getFullYear() });
  }
  return meses;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsearFechaLocal(fechaStr: string): { anio: number; mes: number } {
  const partes = fechaStr.slice(0, 10).split("-");
  return { anio: Number(partes[0]), mes: Number(partes[1]) };
}

function mesAnteriorAInscripcion(
  vencMes: number,
  vencAnio: number,
  altaMes: number,
  altaAnio: number
): boolean {
  if (vencAnio < altaAnio) return true;
  if (vencAnio === altaAnio && vencMes < altaMes) return true;
  return false;
}

function calcularEstado(
  socio: SocioConCuotas,
  mes: number,
  anio: number,
  pagada: boolean,
  diaCierre: number
): EstadoCuota {
  const { anio: altaAnio, mes: altaMes } = parsearFechaLocal(socio.fechaInscripcion);
  if (mesAnteriorAInscripcion(mes, anio, altaMes, altaAnio)) return "no-era-socio";
  if (pagada) return "pagada";
  const hoy = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  const venc = new Date(anio, mes - 1, diaCierre);
  if (venc.getTime() === hoy.getTime()) return "vence-hoy";
  if (venc < hoy) return "vencida";
  return "pendiente";
}

function labelMes(mes: number): string {
  return new Date(2000, mes - 1, 1)
    .toLocaleString("es-AR", { month: "short" })
    .replace(".", "")
    .toUpperCase();
}

function formatMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

// ── Chip de estado ────────────────────────────────────────────────────────────

function Chip({ estado }: { estado: EstadoCuota }) {
  const map: Record<EstadoCuota, { label: string; cls: string }> = {
    pagada:         { label: "Pagada",    cls: "cq-chip cq-pagada"    },
    vencida:        { label: "Vencida",   cls: "cq-chip cq-vencida"   },
    "vence-hoy":    { label: "Vence hoy", cls: "cq-chip cq-hoy"       },
    pendiente:      { label: "Pendiente", cls: "cq-chip cq-pendiente" },
    "no-era-socio": { label: "—",         cls: "cq-chip cq-noera"     },
  };
  const { label, cls } = map[estado];
  return <span className={cls}>{label}</span>;
}

// ── Badge de comprobante en revisión ─────────────────────────────────────────

function BadgeRevision({ pago, onAceptar, onRechazar }: {
  pago: PagoComprobante;
  onAceptar: (pagoId: string) => void;
  onRechazar: (pagoId: string) => void;
}) {
  const nombreMes = new Date(pago.anio, pago.mes - 1, 1)
    .toLocaleString("es-AR", { month: "long", year: "numeric" });

  return (
    <div className="cq-revision-banner">
      <div className="cq-revision-info">
        <span className="cq-revision-dot" />
        <div>
          <span className="cq-revision-titulo">Comprobante en revisión</span>
          <span className="cq-revision-sub">
            {nombreMes} · {pago.comprobanteNombre ?? "comprobante"}
          </span>
        </div>
      </div>
      <div className="cq-revision-acciones">
        <a
          href={pago.comprobanteUrl}
          target="_blank"
          rel="noreferrer"
          className="cq-btn-ver-comprobante"
        >
          Ver →
        </a>
        <button
          className="cq-btn-rechazar-comp"
          onClick={() => onRechazar(pago._id)}
        >
          Rechazar
        </button>
        <button
          className="cq-btn-aceptar-comp"
          onClick={() => onAceptar(pago._id)}
        >
          Aceptar ✓
        </button>
      </div>
    </div>
  );
}

// ── Modal: editar cuota individual ────────────────────────────────────────────

interface ModalCuotaProps {
  socio: SocioConCuotas;
  mes: number;
  anio: number;
  cuotaActual: CuotaMes | null;
  parametros: ParametrosCuota;
  onClose: () => void;
  onGuardar: (socioId: string, cuota: CuotaMes) => void;
}

function ModalCuota({
  socio, mes, anio, cuotaActual, parametros, onClose, onGuardar,
}: ModalCuotaProps) {
  const [pagada, setPagada] = useState(cuotaActual?.pagada ?? false);
  const [monto, setMonto] = useState<string>(
    cuotaActual?.monto?.toString() ?? parametros.montoBase.toString()
  );
  const [fechaPago, setFechaPago] = useState<string>(
    cuotaActual?.fechaPago
      ? cuotaActual.fechaPago.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    if (pagada && !fechaPago) {
      Swal.fire("Falta fecha", "Indicá la fecha de pago.", "warning");
      return;
    }
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum < 0) {
      Swal.fire("Monto inválido", "Ingresá un monto válido.", "warning");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/cuotas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socioId: socio._id,
          mes, anio, pagada,
          monto: montoNum,
          fechaPago: pagada ? fechaPago : null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onGuardar(socio._id, { _id: data._id, mes, anio, pagada, monto: montoNum, fechaPago: pagada ? fechaPago : null });
      onClose();
    } catch {
      Swal.fire("Error", "No se pudo guardar la cuota.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="cq-modal-overlay" onClick={onClose}>
      <div className="cq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cq-modal-header">
          <div>
            <h2 className="cq-modal-titulo">{labelMes(mes)} {anio}</h2>
            <p className="cq-modal-subtitulo">{socio.nombre} {socio.apellido}</p>
          </div>
          <button className="cq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cq-modal-body">
          <div className="cq-field">
            <label className="cq-label">Estado de la cuota</label>
            <div className="cq-toggle-row">
              <button className={`cq-toggle-btn${!pagada ? " cq-toggle-active-red" : ""}`} onClick={() => setPagada(false)}>No pagada</button>
              <button className={`cq-toggle-btn${pagada ? " cq-toggle-active-green" : ""}`} onClick={() => setPagada(true)}>Pagada ✓</button>
            </div>
          </div>
          <div className="cq-field">
            <label className="cq-label">Monto ({parametros.moneda})</label>
            <input className="cq-input" type="number" min="0" value={monto} onChange={(e) => setMonto(e.target.value)} placeholder={`Ej: ${parametros.montoBase}`} />
          </div>
          {pagada && (
            <div className="cq-field">
              <label className="cq-label">Fecha de pago</label>
              <input className="cq-input" type="date" value={fechaPago} onChange={(e) => setFechaPago(e.target.value)} />
            </div>
          )}
        </div>
        <div className="cq-modal-footer">
          <button className="cq-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="cq-btn-guardar" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar cuota"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal: parámetros globales ─────────────────────────────────────────────────

interface ModalParametrosProps {
  parametros: ParametrosCuota;
  onClose: () => void;
  onGuardar: (p: ParametrosCuota) => void;
}

function ModalParametros({ parametros, onClose, onGuardar }: ModalParametrosProps) {
  const [monto, setMonto] = useState(parametros.montoBase.toString());
  const [dia, setDia] = useState(parametros.diaCierre.toString());
  const [moneda, setMoneda] = useState<"ARS" | "USD">(parametros.moneda);
  const [guardando, setGuardando] = useState(false);

  const handleGuardar = async () => {
    const montoNum = parseFloat(monto);
    const diaNum = parseInt(dia);
    if (isNaN(montoNum) || montoNum <= 0) { Swal.fire("Monto inválido", "Ingresá un monto base válido.", "warning"); return; }
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 28) { Swal.fire("Día inválido", "El día debe estar entre 1 y 28.", "warning"); return; }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/cuotas/parametros`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ montoBase: montoNum, diaCierre: diaNum, moneda }),
      });
      if (!res.ok) throw new Error();
      onGuardar({ montoBase: montoNum, diaCierre: diaNum, moneda });
      onClose();
    } catch {
      Swal.fire("Error", "No se pudieron guardar los parámetros.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="cq-modal-overlay" onClick={onClose}>
      <div className="cq-modal" onClick={(e) => e.stopPropagation()}>
        <div className="cq-modal-header">
          <div>
            <h2 className="cq-modal-titulo">Parámetros de cuotas</h2>
            <p className="cq-modal-subtitulo">Configuración global del sistema</p>
          </div>
          <button className="cq-modal-close" onClick={onClose}>✕</button>
        </div>
        <div className="cq-modal-body">
          <div className="cq-field">
            <label className="cq-label">Monto base mensual</label>
            <input className="cq-input" type="number" min="1" value={monto} onChange={(e) => setMonto(e.target.value)} />
          </div>
          <div className="cq-field">
            <label className="cq-label">Día de vencimiento (1–28)</label>
            <input className="cq-input" type="number" min="1" max="28" value={dia} onChange={(e) => setDia(e.target.value)} />
          </div>
          <div className="cq-field">
            <label className="cq-label">Moneda</label>
            <div className="cq-toggle-row">
              <button className={`cq-toggle-btn${moneda === "ARS" ? " cq-toggle-active-blue" : ""}`} onClick={() => setMoneda("ARS")}>ARS $</button>
              <button className={`cq-toggle-btn${moneda === "USD" ? " cq-toggle-active-blue" : ""}`} onClick={() => setMoneda("USD")}>USD $</button>
            </div>
          </div>
        </div>
        <div className="cq-modal-footer">
          <button className="cq-btn-cancelar" onClick={onClose}>Cancelar</button>
          <button className="cq-btn-guardar" onClick={handleGuardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar parámetros"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Fila de socio ─────────────────────────────────────────────────────────────

interface FilaSocioProps {
  socio: SocioConCuotas;
  rolActual: RolCuotas;
  soloVencidas: boolean;
  parametros: ParametrosCuota;
  // mapa de comprobantes: key = `${socioId}-${mes}-${anio}`
  pagosMap: Map<string, PagoComprobante>;
  onEditarCuota?: (socio: SocioConCuotas, mes: number, anio: number) => void;
  onCuotaPagada?: (socioId: string, cuota: CuotaMes) => void;
  onPagoAceptado?: (pagoId: string, socioId: string, mes: number, anio: number) => void;
  onPagoRechazado?: (pagoId: string, socioId: string, mes: number, anio: number) => void;
}

function FilaSocio({
  socio, rolActual, soloVencidas, parametros, pagosMap,
  onEditarCuota, onCuotaPagada, onPagoAceptado, onPagoRechazado,
}: FilaSocioProps) {
  const router = useRouter();

  const cuotasEvaluadas = MESES_MOSTRAR.map(({ mes, anio }) => {
    const cuota = socio.cuotas.find((c) => c.mes === mes && c.anio === anio);
    const pagoKey = `${socio._id}-${mes}-${anio}`;
    const pago = pagosMap.get(pagoKey);
    return {
      mes, anio,
      pagada: cuota?.pagada ?? false,
      monto: cuota?.monto ?? null,
      estado: calcularEstado(socio, mes, anio, cuota?.pagada ?? false, parametros.diaCierre),
      pago,
    };
  });

  const tieneVencida = cuotasEvaluadas.some((c) => c.estado === "vencida");
  const pagosEnRevision = cuotasEvaluadas
    .filter((c) => c.pago?.estado === "comprobante_enviado")
    .map((c) => c.pago!);

  const tieneEnRevision = pagosEnRevision.length > 0;

  if (soloVencidas && !tieneVencida) return null;

  // ── Determinar estado del botón "Confirmar pago" ─────────────────────────
  // Verde habilitado: hay comprobante en revisión
  // Rojo deshabilitado: hay cuota pendiente/vencida pero sin comprobante
  const primerPendienteSinComprobante = MESES_MOSTRAR.find(({ mes, anio }) => {
    const cuota = socio.cuotas.find((c) => c.mes === mes && c.anio === anio);
    const estado = calcularEstado(socio, mes, anio, cuota?.pagada ?? false, parametros.diaCierre);
    const pagoKey = `${socio._id}-${mes}-${anio}`;
    const pago = pagosMap.get(pagoKey);
    const tienePendienteOVencida = estado === "vencida" || estado === "vence-hoy" || estado === "pendiente";
    const sinComprobante = !pago || pago.estado === "rechazado";
    return tienePendienteOVencida && sinComprobante;
  });

  const hayAlgoPendiente = !!primerPendienteSinComprobante;
  // El botón confirmar pago solo está verde+habilitado si hay un comprobante en revisión
  const confirmarHabilitado = tieneEnRevision;
  // Mostrar el botón si hay pendiente SIN comprobante, o si hay comprobante en revisión
  const mostrarBotonConfirmar = rolActual === "superadmin" || rolActual === "admin";

  const enviarRecordatorio = () => {
    Swal.fire({
      title: "¿Enviar recordatorio?",
      html: `Se enviará un mail a <strong>${socio.correo}</strong> sobre su/s cuota/s vencida/s.`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, enviar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#d97706",
      cancelButtonColor: "#6b7280",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const res = await fetch(`${API}/api/cuotas/recordatorio/${socio._id}`, { method: "POST" });
          const data = await res.json();
          if (!res.ok) { Swal.showValidationMessage(data?.error ?? "No se pudo enviar el correo."); return false; }
          return data;
        } catch {
          Swal.showValidationMessage("Error de red. Revisá la conexión.");
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        Swal.fire({ icon: "success", title: "Recordatorio enviado", text: `El correo fue enviado a ${socio.correo}.`, confirmButtonColor: "#d97706" });
      }
    });
  };

  // ── Confirmar pago: acepta el primer comprobante en revisión ──────────────
  const confirmarPago = () => {
    if (!confirmarHabilitado) return;
    const primerPagoEnRevision = pagosEnRevision[0];
    const nombreMes = new Date(primerPagoEnRevision.anio, primerPagoEnRevision.mes - 1, 1)
      .toLocaleString("es-AR", { month: "long", year: "numeric" });

    Swal.fire({
      title: "¿Aceptar comprobante?",
      html: `
        <p style="margin:0 0 6px;font-size:14px;color:#374151;">
          Socio: <strong>${socio.nombre} ${socio.apellido}</strong>
        </p>
        <p style="margin:0 0 8px;font-size:14px;">Cuota de <strong>${nombreMes}</strong></p>
        <p style="font-size:22px;font-weight:800;color:#166534;margin:0;">
          ${formatMonto(primerPagoEnRevision.monto, parametros.moneda)}
        </p>
        <p style="margin-top:10px;font-size:12px;color:#6b7280;">
          Esto marcará la cuota como pagada y notificará al socio.
        </p>
      `,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, aceptar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        try {
          const res = await fetch(`${API}/api/pagos/${primerPagoEnRevision._id}/aceptar`, { method: "PUT" });
          const data = await res.json();
          if (!res.ok || !data.success) { Swal.showValidationMessage(data?.error ?? "No se pudo aceptar."); return false; }
          return data;
        } catch {
          Swal.showValidationMessage("Error de red.");
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        onPagoAceptado?.(primerPagoEnRevision._id, socio._id, primerPagoEnRevision.mes, primerPagoEnRevision.anio);
        Swal.fire({ icon: "success", title: "¡Pago aceptado!", text: `Cuota de ${nombreMes} marcada como pagada.`, confirmButtonColor: "#16a34a" });
      }
    });
  };

  // ── Aceptar desde el badge inline ────────────────────────────────────────
  const handleAceptarBadge = (pagoId: string) => {
    const pago = pagosEnRevision.find((p) => p._id === pagoId);
    if (!pago) return;
    const nombreMes = new Date(pago.anio, pago.mes - 1, 1).toLocaleString("es-AR", { month: "long", year: "numeric" });
    Swal.fire({
      title: "¿Aceptar este comprobante?",
      html: `Cuota <strong>${nombreMes}</strong> de <strong>${socio.nombre} ${socio.apellido}</strong>`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Aceptar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#16a34a",
      cancelButtonColor: "#6b7280",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const res = await fetch(`${API}/api/pagos/${pagoId}/aceptar`, { method: "PUT" });
        const data = await res.json();
        if (!res.ok || !data.success) { Swal.showValidationMessage(data?.error ?? "Error"); return false; }
        return data;
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        onPagoAceptado?.(pagoId, socio._id, pago.mes, pago.anio);
        Swal.fire({ icon: "success", title: "¡Pago aceptado!", confirmButtonColor: "#16a34a" });
      }
    });
  };

  // ── Rechazar desde el badge inline ──────────────────────────────────────
  const handleRechazarBadge = (pagoId: string) => {
    const pago = pagosEnRevision.find((p) => p._id === pagoId);
    if (!pago) return;
    const nombreMes = new Date(pago.anio, pago.mes - 1, 1).toLocaleString("es-AR", { month: "long", year: "numeric" });
    Swal.fire({
      title: "¿Rechazar este comprobante?",
      html: `Cuota <strong>${nombreMes}</strong> — el socio podrá reenviar.<br><br>
        <input id="nota-rechazo" class="swal2-input" placeholder="Motivo del rechazo (opcional)" style="font-size:13px" />`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Rechazar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
      showLoaderOnConfirm: true,
      preConfirm: async () => {
        const nota = (document.getElementById("nota-rechazo") as HTMLInputElement)?.value ?? "";
        const res = await fetch(`${API}/api/pagos/${pagoId}/rechazar`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ notaAdmin: nota }),
        });
        const data = await res.json();
        if (!res.ok || !data.success) { Swal.showValidationMessage(data?.error ?? "Error"); return false; }
        return data;
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => {
      if (result.isConfirmed && result.value) {
        onPagoRechazado?.(pagoId, socio._id, pago.mes, pago.anio);
        Swal.fire({ icon: "info", title: "Comprobante rechazado", text: "El socio puede reenviar el comprobante.", confirmButtonColor: "#dc2626" });
      }
    });
  };

  return (
    <div className={`cq-fila${tieneEnRevision ? " cq-fila-revision" : ""}`}>
      <div className="cq-fila-header">
        {/* Iniciales */}
        <div
          className="cq-iniciales"
          style={{ background: tieneEnRevision ? "#eff6ff" : tieneVencida ? "#fee2e2" : "#dcfce7" }}
        >
          <span style={{ color: tieneEnRevision ? "#2563eb" : tieneVencida ? "#dc2626" : "#16a34a" }}>
            {socio.nombre[0]}{socio.apellido[0]}
          </span>
        </div>

        <div className="cq-socio-info">
          <div className="cq-nombre-wrap">
            <span className="cq-nombre">{socio.apellido}, {socio.nombre}</span>
            {/* Notificación de comprobante en revisión */}
            {tieneEnRevision && rolActual === "superadmin" && (
              <span className="cq-notif-revision">
                {pagosEnRevision.length === 1
                  ? "📎 1 comprobante en revisión"
                  : `📎 ${pagosEnRevision.length} comprobantes en revisión`}
              </span>
            )}
          </div>
          <span className="cq-correo">{socio.correo}</span>
        </div>

        <div className="cq-acciones">
          {/* Recordatorio */}
          {(rolActual === "superadmin" || rolActual === "admin") && tieneVencida && (
            <button className="cq-btn-recordatorio" onClick={enviarRecordatorio}>
              ✉ Recordatorio
            </button>
          )}

          {/* Confirmar pago — verde si hay comprobante, rojo si no */}
          {mostrarBotonConfirmar && (
            <button
              className={`cq-btn-pago${confirmarHabilitado ? " cq-btn-pago-verde" : hayAlgoPendiente ? " cq-btn-pago-rojo" : ""}`}
              onClick={confirmarPago}
              disabled={!confirmarHabilitado}
              title={
                confirmarHabilitado
                  ? "Hay un comprobante esperando tu revisión"
                  : hayAlgoPendiente
                  ? "El socio todavía no envió el comprobante"
                  : "Sin cuotas pendientes"
              }
            >
              {confirmarHabilitado
                ? "✓ Confirmar pago"
                : hayAlgoPendiente
               }
            </button>
          )}

          {rolActual === "superadmin" && (
            <button className="cq-btn-detalle" onClick={() => router.push(`/socio/socios/${socio._id}`)}>
              Ver socio →
            </button>
          )}
        </div>
      </div>

      {/* Banners de comprobantes en revisión (superadmin) */}
      {rolActual === "superadmin" && pagosEnRevision.map((pago) => (
        <BadgeRevision
          key={pago._id}
          pago={pago}
          onAceptar={handleAceptarBadge}
          onRechazar={handleRechazarBadge}
        />
      ))}

      {/* Cuotas scrolleables */}
      <div className="cq-cuotas-scroll">
        {cuotasEvaluadas.map((c) => {
          const editable = rolActual === "superadmin" && c.estado !== "no-era-socio";
          const enRevisionMes = c.pago?.estado === "comprobante_enviado";
          const rechazadoMes = c.pago?.estado === "rechazado";

          return (
            <div
              key={`${c.mes}-${c.anio}`}
              className={`cq-celda${editable ? " cq-celda-editable" : ""}${enRevisionMes ? " cq-celda-revision" : ""}${rechazadoMes ? " cq-celda-rechazada" : ""}`}
              onClick={() => editable && onEditarCuota?.(socio, c.mes, c.anio)}
              title={editable ? "Clic para editar cuota" : undefined}
            >
              <span className="cq-mes-label">{labelMes(c.mes)} {c.anio.toString().slice(2)}</span>
              {enRevisionMes ? (
                <span className="cq-chip cq-revision">En revisión</span>
              ) : rechazadoMes ? (
                <span className="cq-chip cq-rechazada">Rechazado</span>
              ) : (
                <Chip estado={c.estado} />
              )}
              {c.pagada && c.monto != null && (
                <span className="cq-monto-chip">{formatMonto(c.monto, parametros.moneda)}</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function CuotasPage() {
  const { user } = useAuth();
  const router = useRouter();
  const userId: string | undefined = user?.id;
  const rolActual = (user?.role ?? "socio") as RolCuotas;

  const [socios, setSocios] = useState<SocioConCuotas[]>([]);
  const [parametros, setParametros] = useState<ParametrosCuota>({ montoBase: 5000, diaCierre: 10, moneda: "ARS" });
  const [loading, setLoading] = useState(true);
  const [busqueda, setBusqueda] = useState("");
  const [modalCuota, setModalCuota] = useState<{ socio: SocioConCuotas; mes: number; anio: number } | null>(null);
  const [modalParams, setModalParams] = useState(false);

  // Mapa de comprobantes: key = `${socioId}-${mes}-${anio}`
  const [pagosMap, setPagosMap] = useState<Map<string, PagoComprobante>>(new Map());

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};

      const fetchList = [
        fetch(`${API}/api/cuotas/socios`, { headers }),
        fetch(`${API}/api/cuotas/parametros`, { headers }),
      ];

      // Solo superadmin y admin cargan los comprobantes globales
      if (rolActual === "superadmin" || rolActual === "admin") {
        fetchList.push(fetch(`${API}/api/pagos?estado=comprobante_enviado`, { headers }));
      }

      const results = await Promise.all(fetchList);
      const [sociosRes, paramsRes, pagosRes] = results;

      const sociosData: SocioConCuotas[] = await sociosRes.json();
      const paramsData: ParametrosCuota = await paramsRes.json();

      // Construir mapa de pagos en revisión
      if (pagosRes && (rolActual === "superadmin" || rolActual === "admin")) {
        const pagosData: PagoComprobante[] = pagosRes.ok ? await pagosRes.json() : [];
        const nuevoMapa = new Map<string, PagoComprobante>();
        pagosData.forEach((p) => {
          const key = `${p.socioId}-${p.mes}-${p.anio}`;
          nuevoMapa.set(key, p);
        });
        setPagosMap(nuevoMapa);
      }

      if (rolActual === "socio" && userId) {
        const detalleRes = await fetch(`${API}/api/cuotas/socio-detalle-by-user/${userId}`, { headers });
        if (detalleRes.ok) {
          const detalle: SocioConCuotas = await detalleRes.json();
          setSocios([detalle]);
        } else {
          const propios = sociosData.filter((s) => (s as SocioConCuotas & { userId?: string }).userId === userId);
          setSocios(propios);
        }
      } else {
        setSocios(sociosData);
      }

      setParametros(paramsData);
    } catch {
      Swal.fire("Error", "No se pudieron cargar los datos de cuotas.", "error");
    } finally {
      setLoading(false);
    }
  }, [rolActual, userId]);

  useEffect(() => {
    if (!user) return;
    fetchData();
  }, [user, fetchData]);

  const handleGuardarCuota = (socioId: string, cuotaNueva: CuotaMes) => {
    setSocios((prev) =>
      prev.map((s) => {
        if (s._id !== socioId) return s;
        const sinEsta = s.cuotas.filter((c) => !(c.mes === cuotaNueva.mes && c.anio === cuotaNueva.anio));
        return { ...s, cuotas: [...sinEsta, cuotaNueva] };
      })
    );
  };

  // ── Cuando se acepta un pago: marcar cuota pagada y quitar del mapa ──────
  const handlePagoAceptado = (pagoId: string, socioId: string, mes: number, anio: number) => {
    setPagosMap((prev) => {
      const nuevo = new Map(prev);
      nuevo.delete(`${socioId}-${mes}-${anio}`);
      return nuevo;
    });
    const cuotaNueva: CuotaMes = {
      mes, anio,
      pagada: true,
      monto: parametros.montoBase,
      fechaPago: new Date().toISOString().slice(0, 10),
    };
    handleGuardarCuota(socioId, cuotaNueva);
  };

  // ── Cuando se rechaza un pago: actualizar estado en el mapa ──────────────
  const handlePagoRechazado = (pagoId: string, socioId: string, mes: number, anio: number) => {
    setPagosMap((prev) => {
      const nuevo = new Map(prev);
      const key = `${socioId}-${mes}-${anio}`;
      const pagoActual = nuevo.get(key);
      if (pagoActual) nuevo.set(key, { ...pagoActual, estado: "rechazado" });
      return nuevo;
    });
  };

  const handleGuardarParams = (p: ParametrosCuota) => {
    setParametros(p);
    Swal.fire("Parámetros actualizados", `Monto base: ${formatMonto(p.montoBase, p.moneda)} · Vence el día ${p.diaCierre}`, "success");
  };

  const soloVencidas = rolActual === "admin";

  const lista = rolActual === "socio"
    ? socios
    : socios.filter((s) => {
        const q = busqueda.toLowerCase();
        return s.nombre.toLowerCase().includes(q) || s.apellido.toLowerCase().includes(q) || s.correo.toLowerCase().includes(q);
      });

  const titulo = rolActual === "socio" ? "Mis cuotas" : rolActual === "admin" ? "Socios con cuotas vencidas" : "Gestión de cuotas";

  const cuotaActualModal = modalCuota
    ? (modalCuota.socio.cuotas.find((c) => c.mes === modalCuota.mes && c.anio === modalCuota.anio) ?? null)
    : null;

  // Conteo de revisiones pendientes para el header
  const totalEnRevision = pagosMap.size;

  if (!user) return null;

  return (
    <div className="cq-page">
      <div className="cq-inner">
        <button className="cq-btn-volver" onClick={() => router.back()}>← Volver al panel</button>

        <div className="cq-header">
          <div>
            <h1 className="cq-titulo">
              {titulo}
              {/* Badge global de revisiones en el header */}
              {rolActual === "superadmin" && totalEnRevision > 0 && (
                <span className="cq-header-badge-revision">{totalEnRevision}</span>
              )}
            </h1>
            <p className="cq-subtitulo">
              Vence el día {parametros.diaCierre} de cada mes ·{" "}
              {HOY.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" })}
            </p>
          </div>

          <div className="cq-toolbar">
            {rolActual !== "socio" && (
              <div className="cq-busqueda-wrap">
                <svg className="cq-busqueda-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <circle cx={11} cy={11} r={8} />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <input
                  className="cq-busqueda-input"
                  type="text"
                  placeholder="Buscar por nombre o correo..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                />
              </div>
            )}
            {rolActual === "superadmin" && (
              <button className="cq-btn-params" onClick={() => setModalParams(true)}>⚙ Parámetros</button>
            )}
          </div>
        </div>

        {/* Leyenda */}
        <div className="cq-leyenda">
          <span className="cq-leyenda-label">Estados:</span>
          <Chip estado="pagada" />
          <Chip estado="vencida" />
          <Chip estado="vence-hoy" />
          <Chip estado="pendiente" />
          <Chip estado="no-era-socio" />
          <span className="cq-chip cq-revision">En revisión</span>
          {rolActual === "superadmin" && (
            <span className="cq-params-badge">
              Base: {formatMonto(parametros.montoBase, parametros.moneda)} · Día {parametros.diaCierre}
            </span>
          )}
        </div>

        {/* Lista */}
        {loading ? (
          <div className="cq-spinner-wrap">
            <div className="cq-spinner" />
            <p style={{ color: "#6b7280", fontSize: "14px" }}>Cargando cuotas...</p>
          </div>
        ) : (
          <div className="cq-lista">
            {lista.length === 0 ? (
              <div className="cq-vacio">
                <div className="cq-vacio-icono">🔍</div>
                {soloVencidas ? "No hay socios con cuotas vencidas." : "No se encontraron socios."}
              </div>
            ) : (
              lista.map((s) => (
                <FilaSocio
                  key={s._id}
                  socio={s}
                  rolActual={rolActual}
                  soloVencidas={soloVencidas}
                  parametros={parametros}
                  pagosMap={pagosMap}
                  onEditarCuota={(socio, mes, anio) => setModalCuota({ socio, mes, anio })}
                  onCuotaPagada={handleGuardarCuota}
                  onPagoAceptado={handlePagoAceptado}
                  onPagoRechazado={handlePagoRechazado}
                />
              ))
            )}
          </div>
        )}
      </div>

      {modalCuota && (
        <ModalCuota
          socio={modalCuota.socio}
          mes={modalCuota.mes}
          anio={modalCuota.anio}
          cuotaActual={cuotaActualModal}
          parametros={parametros}
          onClose={() => setModalCuota(null)}
          onGuardar={handleGuardarCuota}
        />
      )}

      {modalParams && (
        <ModalParametros
          parametros={parametros}
          onClose={() => setModalParams(false)}
          onGuardar={handleGuardarParams}
        />
      )}
    </div>
  );
}
