'use client';

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import "../../../style/Tuscursos.css";

const API = 'http://localhost:5000';

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface PagoInfo {
  pagoId: string | null;
  estadoPago: 'sin_pago' | 'pendiente_comprobante' | 'comprobante_enviado' | 'pagado' | 'rechazado';
  monto: number | null;
  moneda: 'ARS' | 'USD';
  comprobanteUrl: string | null;
  fechaPago: string | null;
}

interface CursoItem {
  inscriptionId: string;
  courseId: string;
  courseTitle: string;
  courseDescription: string;
  courseImage: string | null;
  fechaInicio: string | null;
  fechaFin: string | null;
  duracion: string | null;
  modalidad: string | null;
  turnoPreferido: string;
  estadoInscripcion: 'pendiente' | 'confirmado' | 'cancelado';
  fechaInscripcion: string;
  pago: PagoInfo;
}

interface SocioInfo {
  nombre: string;
  apellido: string;
  correo: string;
}

type ModalTipo = 'pago' | 'cancelar' | null;

interface ResultadoCancelacion {
  monto: number;
  porcentaje: number;
  moneda: string;
}

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
// DESPUÉS
function formatMonto(monto: number | string | null | undefined, moneda: string): string {
  const valor = Number(monto);
  if (isNaN(valor)) return '—';

  if (moneda === 'USD') {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'USD',
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(valor);
  }

  // ARS
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: 'ARS',
    maximumFractionDigits: 0,
  }).format(valor);
}

function formatFecha(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('es-AR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  });
}

function estaAMenosDeUnDia(fechaInicio: string | null): boolean {
  if (!fechaInicio) return false;
  const diff = new Date(fechaInicio).getTime() - Date.now();
  const horas = diff / (1000 * 60 * 60);
  return horas <= 24 && horas >= 0;
}

function etiquetaPago(estado: PagoInfo['estadoPago']): string {
  const map: Record<PagoInfo['estadoPago'], string> = {
    sin_pago: 'Sin pago',
    pendiente_comprobante: 'Pendiente',
    comprobante_enviado: 'En revisión',
    pagado: 'Pagado',
    rechazado: 'Rechazado',
  };
  return map[estado] ?? estado;
}

// ─────────────────────────────────────────────────
// ICONOS SVG
// ─────────────────────────────────────────────────
function Icon({ name }: { name: string }): React.ReactElement | null {
  const icons: Record<string, React.ReactElement> = {
  calendar: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="12" rx="2" />
      <path d="M1 7h14M5 1v4M11 1v4" />
    </svg>
  ),
  clock: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="7" />
      <path d="M8 4v4l3 2" />
    </svg>
  ),
  map: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M6 2L1 4v10l5-2 4 2 5-2V2l-5 2-4-2z" />
      <path d="M6 2v10M10 4v10" />
    </svg>
  ),
  sun: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.2 3.2l1.4 1.4M11.4 11.4l1.4 1.4M3.2 12.8l1.4-1.4M11.4 4.6l1.4-1.4" />
    </svg>
  ),
  check: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M2 8l4 4 8-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  alert: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1L1 14h14L8 1z" />
      <path d="M8 6v4M8 11.5v.5" strokeLinecap="round" />
    </svg>
  ),
  book: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 2h8a2 2 0 012 2v9a2 2 0 01-2 2H2V2z" />
      <path d="M12 4a2 2 0 012 2v7a2 2 0 01-2 2" />
      <path d="M5 6h4M5 9h4" strokeLinecap="round" />
    </svg>
  ),
  user: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="5" r="3" />
      <path d="M1 14c0-3.314 3.134-6 7-6s7 2.686 7 6" strokeLinecap="round" />
    </svg>
  ),
  mail: (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="1" y="3" width="14" height="10" rx="2" />
      <path d="M1 5l7 5 7-5" />
    </svg>
  ),
};
  return icons[name] ?? null;
}

// ─────────────────────────────────────────────────
// BADGE DE PAGO
// ─────────────────────────────────────────────────
function PagoBadge({ estado }: { estado: PagoInfo['estadoPago'] }) {
  return (
    <span className={`tc-pago-badge tc-pago-badge--${estado}`}>
      {etiquetaPago(estado)}
    </span>
  );
}

// ─────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────
export default function TusCursosPage() {
  const params  = useParams();
  const router  = useRouter();
  const socioId = params?.id as string;

  const [cursos,   setCursos]  = useState<CursoItem[]>([]);
  const [socio,    setSocio]   = useState<SocioInfo | null>(null);
  const [loading,  setLoading] = useState<boolean>(true);
  const [error,    setError]   = useState<string | null>(null);

  // Modal
  const [modalTipo,         setModalTipo]         = useState<ModalTipo>(null);
  const [cursoSeleccionado, setCursoSeleccionado] = useState<CursoItem | null>(null);

  // Pago
  const [archivo,        setArchivo]        = useState<File | null>(null);
  const [previewArchivo, setPreviewArchivo] = useState<string | null>(null);
  const [subiendoPago,   setSubiendoPago]   = useState<boolean>(false);
  const [mensajeExito,   setMensajeExito]   = useState<string | null>(null);
  const [mensajeError,   setMensajeError]   = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Cancelación
  const [cancelando,           setCancelando]           = useState<boolean>(false);
  const [resultadoCancelacion, setResultadoCancelacion] = useState<ResultadoCancelacion | null>(null);

  // ── Fetch cursos del socio ──
  useEffect(() => {
    if (!socioId) return;

    async function cargar(): Promise<void> {
      setLoading(true);
      try {
        const res = await fetch(`${API}/api/tuscursos/${socioId}`);
        if (!res.ok) throw new Error('Error al obtener los cursos');
        const data: {
          success: boolean;
          socio?: SocioInfo;
          cursos: CursoItem[];
          error?: string;
        } = await res.json();
        if (!data.success) throw new Error(data.error ?? 'Error desconocido');
        setCursos(data.cursos);
        if (data.socio) setSocio(data.socio);
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Error al cargar');
      } finally {
        setLoading(false);
      }
    }

    cargar();
  }, [socioId]);

  // ── Modal helpers ──
  function abrirModal(tipo: ModalTipo, curso: CursoItem): void {
    setCursoSeleccionado(curso);
    setModalTipo(tipo);
    setArchivo(null);
    setPreviewArchivo(null);
    setMensajeExito(null);
    setMensajeError(null);
    setResultadoCancelacion(null);
  }

  function cerrarModal(): void {
    setModalTipo(null);
    setCursoSeleccionado(null);
    setArchivo(null);
    setPreviewArchivo(null);
    setMensajeExito(null);
    setMensajeError(null);
    setResultadoCancelacion(null);
    if (fileRef.current) fileRef.current.value = '';
  }

  // ── Archivo ──
  function handleArchivoChange(e: ChangeEvent<HTMLInputElement>): void {
    const file = e.target.files?.[0];
    if (!file) return;
    const validos = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
    if (!validos.includes(file.type)) {
      setMensajeError('Formato inválido. Usá JPG, PNG, WEBP o PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setMensajeError('El archivo no puede superar 10 MB.');
      return;
    }
    setMensajeError(null);
    setArchivo(file);
    setPreviewArchivo(file.type !== 'application/pdf' ? URL.createObjectURL(file) : null);
  }

  // ── Enviar comprobante ──
  async function handleEnviarPago(): Promise<void> {
    if (!archivo || !cursoSeleccionado) return;
    setSubiendoPago(true);
    setMensajeError(null);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const formData = new FormData();
      formData.append('inscriptionId', cursoSeleccionado.inscriptionId);
      if (cursoSeleccionado.pago.monto) {
        formData.append('monto', String(cursoSeleccionado.pago.monto));
      }
      formData.append('comprobante', archivo);

      const res = await fetch(`${API}/api/tuscursos/${socioId}/pago`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      const data: { success: boolean; pago?: PagoInfo; error?: string } = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al enviar');

      setCursos((prev) =>
        prev.map((c) =>
          c.inscriptionId === cursoSeleccionado.inscriptionId
            ? {
                ...c,
                pago: {
                  ...c.pago,
                  estadoPago: 'comprobante_enviado',
                  comprobanteUrl: data.pago?.comprobanteUrl ?? null,
                  pagoId: data.pago?.pagoId ?? null,
                },
              }
            : c
        )
      );

      setMensajeExito('¡Comprobante enviado! El administrador lo revisará a la brevedad.');
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err: unknown) {
      setMensajeError(err instanceof Error ? err.message : 'Error inesperado');
    } finally {
      setSubiendoPago(false);
    }
  }

  // ── Cancelar curso ──
  async function handleCancelar(): Promise<void> {
    if (!cursoSeleccionado) return;
    setCancelando(true);
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(`${API}/api/tuscursos/${socioId}/cancelar`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ inscriptionId: cursoSeleccionado.inscriptionId }),
      });
      const data: {
        success: boolean;
        reembolso?: { aplica: boolean; porcentaje: number; monto: number; moneda: string };
        message?: string;
        error?: string;
      } = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al cancelar');

      setCursos((prev) =>
        prev.filter((c) => c.inscriptionId !== cursoSeleccionado.inscriptionId)
      );

      if (data.reembolso?.aplica) {
        setResultadoCancelacion({
          monto: data.reembolso.monto,
          porcentaje: data.reembolso.porcentaje,
          moneda: data.reembolso.moneda,
          
        });
      } else {
        cerrarModal();
      }
    } catch (err: unknown) {
      setMensajeError(err instanceof Error ? err.message : 'Error al cancelar');
    } finally {
      setCancelando(false);
    }
  }

  // ─────────────────────────────────────────────────
  // ESTADOS DE CARGA / ERROR
  // ─────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="tc-root tc-centered">
        <div className="tc-spinner" />
        <p className="tc-loading-text">Cargando tus cursos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="tc-root tc-centered">
        <div className="tc-error-icon"><Icon name="alert" /></div>
        <p className="tc-error-msg">{error}</p>
        <button className="tc-btn tc-btn-primary" onClick={() => router.back()}>← Volver</button>
      </div>
    );
  }

  // ─────────────────────────────────────────────────
  // RENDER PRINCIPAL
  // ─────────────────────────────────────────────────
  return (
    <div className="tc-root">

      {/* ── HEADER ── */}
      <header className="tc-header">
        <div className="tc-header-inner">
          <button className="tc-btn-back" onClick={() => router.back()}>← Volver</button>
          <div className="tc-header-text">
            <p className="tc-header-eyebrow">Tus inscripciones</p>
            {socio ? (
              <h1 className="tc-header-title">
                {socio.nombre} {socio.apellido}
              </h1>
            ) : (
              <h1 className="tc-header-title">Mis Cursos</h1>
            )}
            {socio && (
              <p className="tc-header-correo">
                <Icon name="mail" />
                {socio.correo}
              </p>
            )}
          </div>
          {cursos.length > 0 && (
            <div className="tc-header-badge">
              <span className="tc-header-badge-num">{cursos.length}</span>
              <span className="tc-header-badge-label">
                curso{cursos.length !== 1 ? 's' : ''} activo{cursos.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="tc-content">
        {cursos.length === 0 ? (
          <div className="tc-empty">
            <div className="tc-empty-icon"><Icon name="book" /></div>
            <h3 className="tc-empty-title">Todo tranquilo por acá</h3>
            <p className="tc-empty-sub">
              Cuando te inscribas en un curso, lo vas a encontrar en esta sección.
            </p>
          </div>
        ) : (
          <div className="tc-lista">
            {cursos.map((curso) => {
              const { pago } = curso;
              const unDiaAntes = estaAMenosDeUnDia(curso.fechaInicio);
              const puedeSubir =
                pago.estadoPago === 'sin_pago' ||
                pago.estadoPago === 'pendiente_comprobante' ||
                pago.estadoPago === 'rechazado';

              return (
                <div key={curso.inscriptionId} className={`tc-card tc-card--${pago.estadoPago}`}>
                  <div className={`tc-card-bar tc-card-bar--${pago.estadoPago}`} />

                  <div className="tc-card-inner">
                    {/* ── Imagen + datos ── */}
                    <div className="tc-card-main">
                      {curso.courseImage && (
                        <div className="tc-card-img-wrap">
                          <Image
                            src={curso.courseImage}
                            alt={curso.courseTitle}
                            fill
                            sizes="(max-width:600px) 100vw, 140px"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                      )}

                      <div className="tc-card-data">
                        <div className="tc-card-title-row">
                          <h2 className="tc-course-title">{curso.courseTitle}</h2>
                          <PagoBadge estado={pago.estadoPago} />
                        </div>

                        {curso.courseDescription && (
                          <p className="tc-course-desc">{curso.courseDescription}</p>
                        )}

                        <div className="tc-course-meta">
                          {curso.fechaInicio && (
                            <span className="tc-meta-chip">
                              <Icon name="calendar" />
                              Inicia {formatFecha(curso.fechaInicio)}
                            </span>
                          )}
                          {curso.fechaFin && (
                            <span className="tc-meta-chip">
                              <Icon name="calendar" />
                              Finaliza {formatFecha(curso.fechaFin)}
                            </span>
                          )}
                          {curso.duracion && (
                            <span className="tc-meta-chip">
                              <Icon name="clock" />
                              {curso.duracion}
                            </span>
                          )}
                          {curso.modalidad && (
                            <span className="tc-meta-chip">
                              <Icon name="map" />
                              {curso.modalidad}
                            </span>
                          )}
                          {curso.turnoPreferido && (
                            <span className="tc-meta-chip">
                              <Icon name="sun" />
                              Turno {curso.turnoPreferido}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* ── Sección pago ── */}
                    {pago.monto !== null && (
                      <div className="tc-pago-seccion">
                        <div className="tc-pago-left">
                          <span className="tc-pago-label">Valor del curso</span>
                          <span className="tc-pago-monto">
                            {formatMonto(pago.monto, pago.moneda)}
                          </span>
                          {pago.fechaPago && (
                            <span className="tc-pago-fecha">
                              Pagado el {formatFecha(pago.fechaPago)}
                            </span>
                          )}
                        </div>
                        <div className="tc-pago-right">
                          {pago.estadoPago === 'comprobante_enviado' && (
                            <span className="tc-pago-estado tc-pago-estado--revision">
                              ⏳ Esperando confirmación
                            </span>
                          )}
                          {pago.estadoPago === 'pagado' && (
                            <span className="tc-pago-estado tc-pago-estado--ok">
                              <Icon name="check" /> Pago confirmado
                            </span>
                          )}
                          {pago.estadoPago === 'rechazado' && (
                            <span className="tc-pago-estado tc-pago-estado--error">
                              <Icon name="alert" /> Comprobante rechazado
                            </span>
                          )}
                        </div>
                      </div>
                    )}

                    {/* ── Aviso 24 h ── */}
                    {unDiaAntes && (
                      <div className="tc-aviso tc-aviso--warning">
                        <Icon name="alert" />
                        <span>
                          El curso inicia en menos de 24 horas. Si cancelás ahora, se te
                          reembolsará solo el <strong>40 %</strong> del pago realizado.
                        </span>
                      </div>
                    )}

                    {/* ── Acciones ── */}
                    <div className="tc-acciones">
                      {puedeSubir && (
                        <button
                          className="tc-btn tc-btn-primary"
                          onClick={() => abrirModal('pago', curso)}
                        >
                          📎 {pago.estadoPago === 'rechazado' ? 'Reenviar comprobante' : 'Subir comprobante'}
                        </button>
                      )}
                      {pago.comprobanteUrl && pago.estadoPago === 'comprobante_enviado' && (
                        <a
                          href={`${API}${pago.comprobanteUrl}`}
                          target="_blank"
                          rel="noreferrer"
                          className="tc-btn tc-btn-ghost"
                        >
                          Ver comprobante →
                        </a>
                      )}
                      <button
                        className="tc-btn tc-btn-danger"
                        onClick={() => abrirModal('cancelar', curso)}
                      >
                        Cancelar inscripción
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ════════════════════
          MODAL PAGO
      ════════════════════ */}
      {modalTipo === 'pago' && cursoSeleccionado && (
        <div className="tc-modal-overlay" onClick={cerrarModal}>
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header">
              <div>
                <span className="tc-modal-eyebrow">Pago de curso</span>
                <h2 className="tc-modal-titulo">{cursoSeleccionado.courseTitle}</h2>
                {socio && (
                  <p className="tc-modal-socio">
                    <Icon name="user" />
                    {socio.nombre} {socio.apellido} · {socio.correo}
                  </p>
                )}
              </div>
              <button className="tc-modal-close" onClick={cerrarModal} aria-label="Cerrar">✕</button>
            </div>

            <div className="tc-modal-body">
              {/* Factura */}
              <div className="tc-factura">
                <div className="tc-factura-fila">
                  <span>Concepto</span>
                  <span>Inscripción a curso</span>
                </div>
                <div className="tc-factura-fila">
                  <span>Turno preferido</span>
                  <span>{cursoSeleccionado.turnoPreferido}</span>
                </div>
                {cursoSeleccionado.fechaInicio && (
                  <div className="tc-factura-fila">
                    <span>Fecha de inicio</span>
                    <span>{formatFecha(cursoSeleccionado.fechaInicio)}</span>
                  </div>
                )}
                {cursoSeleccionado.pago.monto !== null && (
                  <div className="tc-factura-total">
                    <span>Total a pagar</span>
                    <span>{formatMonto(cursoSeleccionado.pago.monto, cursoSeleccionado.pago.moneda)}</span>
                  </div>
                )}
                {cursoSeleccionado.pago.estadoPago === 'rechazado' && (
                  <div className="tc-factura-fila tc-factura-rechazado">
                    <span>⚠️ Estado</span>
                    <span>Comprobante rechazado — reenvíalo</span>
                  </div>
                )}
              </div>

              {/* Datos bancarios */}
              <div className="tc-datos-banco">
                <p className="tc-datos-banco-titulo">Datos para la transferencia</p>
                <div className="tc-datos-banco-grid">
                  <span>Banco</span><span>Bru Bank</span>
                  <span>Alias</span><strong>gabodev</strong>
                  <span>CBU</span><strong>1430001713024172800019</strong>
                  <span>Titular</span><span>Gabriel Joaquín Reynoso</span>
                </div>
              </div>

              {/* Upload */}
              {!mensajeExito ? (
                <>
                  <label className="tc-upload-label">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                      onChange={handleArchivoChange}
                      className="tc-upload-input"
                    />
                    <div className="tc-upload-zona">
                      {previewArchivo ? (
                        <Image
                          src={previewArchivo}
                          alt="Vista previa"
                          width={200}
                          height={140}
                          className="tc-preview-img"
                        />
                      ) : archivo ? (
                        <div className="tc-pdf-icon">
                          <span>📄</span>
                          <p>{archivo.name}</p>
                        </div>
                      ) : (
                        <>
                          <span className="tc-upload-icono">📎</span>
                          <p className="tc-upload-text">Hacé clic o arrastrá el archivo aquí</p>
                          <p className="tc-upload-sub">JPG, PNG, WEBP o PDF · máx. 10 MB</p>
                        </>
                      )}
                    </div>
                  </label>
                  {mensajeError && (
                    <div className="tc-aviso tc-aviso--error">{mensajeError}</div>
                  )}
                  <button
                    className="tc-btn tc-btn-primary tc-btn-full"
                    onClick={handleEnviarPago}
                    disabled={!archivo || subiendoPago}
                  >
                    {subiendoPago ? 'Enviando...' : 'Enviar comprobante'}
                  </button>
                </>
              ) : (
                <div className="tc-aviso tc-aviso--exito">{mensajeExito}</div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ════════════════════
          MODAL CANCELACIÓN
      ════════════════════ */}
      {modalTipo === 'cancelar' && cursoSeleccionado && (
        <div
          className="tc-modal-overlay"
          onClick={!resultadoCancelacion ? cerrarModal : undefined}
        >
          <div className="tc-modal" onClick={(e) => e.stopPropagation()}>
            <div className="tc-modal-header tc-modal-header--danger">
              <div>
                <span className="tc-modal-eyebrow">Cancelar inscripción</span>
                <h2 className="tc-modal-titulo">{cursoSeleccionado.courseTitle}</h2>
              </div>
              {!resultadoCancelacion && (
                <button className="tc-modal-close" onClick={cerrarModal} aria-label="Cerrar">✕</button>
              )}
            </div>

            <div className="tc-modal-body">
              {resultadoCancelacion ? (
                <>
                  <div className="tc-aviso tc-aviso--exito">
                    ✓ Inscripción cancelada. Procesaremos un reembolso del{' '}
                    <strong>{resultadoCancelacion.porcentaje} %</strong> (
                    {formatMonto(resultadoCancelacion.monto, resultadoCancelacion.moneda)}).
                    Nos contactaremos para coordinar la devolución.
                  </div>
                  <div className="tc-aviso tc-aviso--info" style={{ marginTop: '10px' }}>
                    📬 Te enviamos un email con la información del proceso.
                  </div>
                  <div className="tc-cancelar-actions">
                    <button className="tc-btn tc-btn-primary" onClick={cerrarModal}>
                      Entendido
                    </button>
                  </div>
                </>
              ) : (
                <>
                  {estaAMenosDeUnDia(cursoSeleccionado.fechaInicio) &&
                    cursoSeleccionado.pago.estadoPago === 'pagado' && (
                      <div className="tc-cancelar-aviso">
                        <p>
                          ⚠️ El curso inicia en <strong>menos de 24 horas</strong>. Al cancelar,
                          solo se te reembolsará el <strong>40 %</strong> de lo abonado (
                          {formatMonto(
                            Math.round((cursoSeleccionado.pago.monto ?? 0) * 0.4),
                            cursoSeleccionado.pago.moneda
                          )}).
                        </p>
                      </div>
                    )}
                  <div className="tc-aviso tc-aviso--warning">
                    ¿Estás seguro de que querés cancelar tu inscripción a{' '}
                    <strong>"{cursoSeleccionado.courseTitle}"</strong>? Esta acción no se puede deshacer.
                  </div>
                  {mensajeError && (
                    <div className="tc-aviso tc-aviso--error" style={{ marginTop: '10px' }}>
                      {mensajeError}
                    </div>
                  )}
                  <div className="tc-cancelar-actions">
                    <button className="tc-btn tc-btn-ghost" onClick={cerrarModal} disabled={cancelando}>
                      No, mantener
                    </button>
                    <button
                      className="tc-btn tc-btn-danger-solid"
                      onClick={handleCancelar}
                      disabled={cancelando}
                    >
                      {cancelando ? 'Cancelando...' : 'Sí, cancelar'}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

