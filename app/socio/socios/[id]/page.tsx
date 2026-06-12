"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "../../../context/AuthContext";
import Swal from "sweetalert2";
import "../../../style/SocioDetalle.css";

interface CuotaMes {
  _id?: string;
  mes: number;
  anio: number;
  pagada: boolean;
  monto: number | null;
  fechaPago: string | null;
}

interface SocioDetalle {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  provincia: string;
  ciudad: string;
  numeroSocio: number;
  avatar?: string;
  active: boolean;
  freezeUntil: string | null;
  fechaInscripcion: string;
  cuotas: CuotaMes[];
}

interface Parametros {
  montoBase: number;
  diaCierre: number;
  moneda: "ARS" | "USD";
}

// ── Constantes ────────────────────────────────────────────────────────────────

const API = "http://localhost:5000";
const HOY = new Date();

const MESES_MOSTRAR = (() => {
  const arr: { mes: number; anio: number }[] = [];
  const inicio = new Date(HOY.getFullYear(), HOY.getMonth() - 2, 1);
  for (let i = 0; i < 6; i++) {
    const d = new Date(inicio.getFullYear(), inicio.getMonth() + i, 1);
    arr.push({ mes: d.getMonth() + 1, anio: d.getFullYear() });
  }
  return arr;
})();

// ── Helpers ───────────────────────────────────────────────────────────────────

type EstadoCuota = "pagada" | "vencida" | "vence-hoy" | "pendiente" | "no-era-socio";

function calcularEstado(
  fechaInscripcion: string,
  mes: number,
  anio: number,
  pagada: boolean
): EstadoCuota {
  const inscripcion = new Date(fechaInscripcion);
  const venc = new Date(anio, mes - 1, 10);
  const alta = new Date(
    inscripcion.getFullYear(),
    inscripcion.getMonth(),
    inscripcion.getDate()
  );
  if (venc < alta) return "no-era-socio";
  if (pagada) return "pagada";
  const hoy = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  if (venc.getTime() === hoy.getTime()) return "vence-hoy";
  if (venc < hoy) return "vencida";
  return "pendiente";
}

function labelMes(mes: number): string {
  return new Date(2000, mes - 1, 1)
    .toLocaleString("es-AR", { month: "long" })
    .replace(".", "");
}

function labelMesCorto(mes: number): string {
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

// ── Modal pagar cuota ─────────────────────────────────────────────────────────

interface ModalPagoProps {
  mes: number;
  anio: number;
  cuotaActual: CuotaMes | null;
  parametros: Parametros;
  onClose: () => void;
  onGuardar: (cuota: CuotaMes) => void;
}

function ModalPago({
  mes,
  anio,
  cuotaActual,
  parametros,
  onClose,
  onGuardar,
}: ModalPagoProps) {
  const [pagada, setPagada] = useState(cuotaActual?.pagada ?? false);
  const [monto, setMonto] = useState(
    cuotaActual?.monto?.toString() ?? parametros.montoBase.toString()
  );
  const [fechaPago, setFechaPago] = useState(
    cuotaActual?.fechaPago
      ? cuotaActual.fechaPago.slice(0, 10)
      : new Date().toISOString().slice(0, 10)
  );
  const [guardando, setGuardando] = useState(false);

  const { id } = useParams<{ id: string }>();

  const handleGuardar = async () => {
    const montoNum = parseFloat(monto);
    if (isNaN(montoNum) || montoNum < 0) {
      Swal.fire("Monto inválido", "Ingresá un monto válido.", "warning");
      return;
    }
    if (pagada && !fechaPago) {
      Swal.fire("Falta fecha", "Indicá la fecha de pago.", "warning");
      return;
    }
    setGuardando(true);
    try {
      const res = await fetch(`${API}/api/cuotas`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          socioId: id,
          mes,
          anio,
          pagada,
          monto: montoNum,
          fechaPago: pagada ? fechaPago : null,
        }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onGuardar({
        _id: data._id,
        mes,
        anio,
        pagada,
        monto: montoNum,
        fechaPago: pagada ? fechaPago : null,
      });
      onClose();
    } catch {
      Swal.fire("Error", "No se pudo guardar la cuota.", "error");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div className="sd-modal-overlay" onClick={onClose}>
      <div className="sd-modal" onClick={(e) => e.stopPropagation()}>
        <div className="sd-modal-header">
          <div>
            <h2 className="sd-modal-titulo">
              {labelMes(mes)} {anio}
            </h2>
            <p className="sd-modal-subtitulo">Registrar pago de cuota</p>
          </div>
          <button className="sd-modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="sd-modal-body">
          <div className="sd-field">
            <label className="sd-label">Estado</label>
            <div className="sd-toggle-row">
              <button
                className={`sd-toggle-btn${!pagada ? " sd-toggle-red" : ""}`}
                onClick={() => setPagada(false)}
              >
                No pagada
              </button>
              <button
                className={`sd-toggle-btn${pagada ? " sd-toggle-green" : ""}`}
                onClick={() => setPagada(true)}
              >
                Pagada ✓
              </button>
            </div>
          </div>

          <div className="sd-field">
            <label className="sd-label">Monto ({parametros.moneda})</label>
            <input
              className="sd-input"
              type="number"
              min="0"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
            />
          </div>

          {pagada && (
            <div className="sd-field">
              <label className="sd-label">Fecha de pago</label>
              <input
                className="sd-input"
                type="date"
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
              />
            </div>
          )}
        </div>

        <div className="sd-modal-footer">
          <button className="sd-btn-cancelar" onClick={onClose}>
            Cancelar
          </button>
          <button
            className="sd-btn-guardar"
            onClick={handleGuardar}
            disabled={guardando}
          >
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function SocioDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user } = useAuth();

  const [socio, setSocio] = useState<SocioDetalle | null>(null);
  const [parametros, setParametros] = useState<Parametros>({
    montoBase: 5000,
    diaCierre: 10,
    moneda: "ARS",
  });
  const [loading, setLoading] = useState(true);
  const [modalMes, setModalMes] = useState<{ mes: number; anio: number } | null>(null);

  // Guard
  useEffect(() => {
    if (user && user.role !== "superadmin") router.replace("/");
  }, [user, router]);

  // Fetch socio + parámetros
  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      fetch(`${API}/api/cuotas/socio-detalle/${id}`).then((r) => r.json()),
      fetch(`${API}/api/cuotas/parametros`).then((r) => r.json()),
    ])
      .then(([socioData, paramsData]) => {
        setSocio(socioData);
        setParametros(paramsData);
      })
      .catch(() =>
        Swal.fire("Error", "No se pudo cargar el socio.", "error")
      )
      .finally(() => setLoading(false));
  }, [id]);

  const handleGuardarCuota = (cuotaNueva: CuotaMes) => {
    setSocio((prev) => {
      if (!prev) return prev;
      const sinEsta = prev.cuotas.filter(
        (c) => !(c.mes === cuotaNueva.mes && c.anio === cuotaNueva.anio)
      );
      return { ...prev, cuotas: [...sinEsta, cuotaNueva] };
    });
  };

  if (!user || user.role !== "superadmin") return null;

  if (loading) {
    return (
      <div className="sd-page">
        <div className="sd-spinner-wrap">
          <div className="sd-spinner" />
          <p>Cargando socio...</p>
        </div>
      </div>
    );
  }

  if (!socio) {
    return (
      <div className="sd-page">
        <div className="sd-spinner-wrap">
          <p style={{ color: "#94a3b8" }}>Socio no encontrado.</p>
          <button className="sd-btn-volver" onClick={() => router.back()}>
            ← Volver
          </button>
        </div>
      </div>
    );
  }

  const cuotasRender = MESES_MOSTRAR.map(({ mes, anio }) => {
    const cuota = socio.cuotas.find((c) => c.mes === mes && c.anio === anio);
    const estado = calcularEstado(
      socio.fechaInscripcion,
      mes,
      anio,
      cuota?.pagada ?? false
    );
    return { mes, anio, cuota: cuota ?? null, estado };
  });

  const modalCuotaActual = modalMes
    ? (socio.cuotas.find(
        (c) => c.mes === modalMes.mes && c.anio === modalMes.anio
      ) ?? null)
    : null;

  const totalPagadas = cuotasRender.filter((c) => c.estado === "pagada").length;
  const totalVencidas = cuotasRender.filter((c) => c.estado === "vencida").length;

  return (
    <>
      <div className="sd-page">
        <div className="sd-inner">

          {/* Volver */}
          <button className="sd-btn-volver" onClick={() => router.back()}>
            ← Volver
          </button>

          {/* Perfil del socio */}
          <div className="sd-perfil-card">
            <div className="sd-perfil-avatar-wrap">
              {socio.avatar ? (
                <img
                  src={socio.avatar}
                  alt={`${socio.nombre} ${socio.apellido}`}
                  className="sd-avatar"
                />
              ) : (
                <div className="sd-avatar-placeholder">
                  {socio.nombre[0]}{socio.apellido[0]}
                </div>
              )}
              <span className={`sd-estado-badge ${socio.active ? "sd-activo" : "sd-congelado"}`}>
                {socio.active ? "Activo" : "Congelado"}
              </span>
            </div>

            <div className="sd-perfil-info">
              <div className="sd-perfil-nombre-row">
                <h1 className="sd-nombre">
                  {socio.nombre} {socio.apellido}
                </h1>
                <span className="sd-numero-socio">
                  N° {socio.numeroSocio.toString().padStart(4, "0")}
                </span>
              </div>

              <div className="sd-perfil-datos">
                <div className="sd-dato">
                  <span className="sd-dato-label">Correo</span>
                  <span className="sd-dato-valor">{socio.correo}</span>
                </div>
                {socio.telefono && (
                  <div className="sd-dato">
                    <span className="sd-dato-label">Teléfono</span>
                    <span className="sd-dato-valor">{socio.telefono}</span>
                  </div>
                )}
                <div className="sd-dato">
                  <span className="sd-dato-label">Ubicación</span>
                  <span className="sd-dato-valor">
                    {socio.ciudad}, {socio.provincia}
                  </span>
                </div>
                <div className="sd-dato">
                  <span className="sd-dato-label">Socio desde</span>
                  <span className="sd-dato-valor">
                    {new Date(socio.fechaInscripcion).toLocaleDateString("es-AR", {
                      day: "numeric",
                      month: "long",
                      year: "numeric",
                    })}
                  </span>
                </div>
              </div>

              {/* Stats rápidas */}
              <div className="sd-stats-row">
                <div className="sd-stat sd-stat-green">
                  <span className="sd-stat-num">{totalPagadas}</span>
                  <span className="sd-stat-label">Pagadas</span>
                </div>
                <div className="sd-stat sd-stat-red">
                  <span className="sd-stat-num">{totalVencidas}</span>
                  <span className="sd-stat-label">Vencidas</span>
                </div>
                <div className="sd-stat sd-stat-blue">
                  <span className="sd-stat-num">
                    {formatMonto(parametros.montoBase, parametros.moneda)}
                  </span>
                  <span className="sd-stat-label">Cuota base</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cuotas */}
          <div className="sd-cuotas-section">
            <h2 className="sd-section-titulo">
              Situación societaria
              <span className="sd-section-sub">
                · Vence el día {parametros.diaCierre} de cada mes
              </span>
            </h2>

            <div className="sd-cuotas-grid">
              {cuotasRender.map(({ mes, anio, cuota, estado }) => {
                if (estado === "no-era-socio") return null;

                const esPagada = estado === "pagada";
                const esVencida = estado === "vencida";
                const esHoy = estado === "vence-hoy";

                return (
                  <div
                    key={`${mes}-${anio}`}
                    className={`sd-cuota-card ${esPagada ? "sd-cuota-pagada" : esVencida ? "sd-cuota-vencida" : esHoy ? "sd-cuota-hoy" : "sd-cuota-pendiente"}`}
                  >
                    <div className="sd-cuota-mes">
                      {labelMesCorto(mes)}
                      <span className="sd-cuota-anio">{anio.toString().slice(2)}</span>
                    </div>

                    <div className="sd-cuota-estado-label">
                      {esPagada ? "Pagada" : esVencida ? "Vencida" : esHoy ? "Vence hoy" : "Pendiente"}
                    </div>

                    {esPagada && cuota?.monto != null && (
                      <div className="sd-cuota-monto">
                        {formatMonto(cuota.monto, parametros.moneda)}
                      </div>
                    )}

                    {esPagada && cuota?.fechaPago && (
                      <div className="sd-cuota-fecha">
                        {new Date(cuota.fechaPago).toLocaleDateString("es-AR", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    )}

                    {!esPagada && (
                      <button
                        className="sd-btn-pagar"
                        onClick={() => setModalMes({ mes, anio })}
                      >
                        {esVencida ? "Regularizar" : "Registrar pago"}
                      </button>
                    )}

                    {esPagada && (
                      <button
                        className="sd-btn-editar"
                        onClick={() => setModalMes({ mes, anio })}
                      >
                        Editar
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

        </div>
      </div>

      {modalMes && (
        <ModalPago
          mes={modalMes.mes}
          anio={modalMes.anio}
          cuotaActual={modalCuotaActual}
          parametros={parametros}
          onClose={() => setModalMes(null)}
          onGuardar={handleGuardarCuota}
        />
      )}
    </>
  );
}
