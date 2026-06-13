'use client';

// ─────────────────────────────────────────────────────────────────────────────
// app/pagos/[id]/page.tsx  —  Página de pago de cuotas para el socio
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, useRef, ChangeEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Image from 'next/image';
import "../../../style/Pago.css";

const API = 'http://localhost:5000';

const MESES = [
  'Enero','Febrero','Marzo','Abril','Mayo','Junio',
  'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre',
];

// ── Tipos ─────────────────────────────────────────────────────────────────────

interface SocioInfo {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  provincia: string;
  ciudad: string;
  numeroSocio: string;
  avatar: string | null;
  active: boolean;
  fechaInscripcion: string;
}

interface CuotaMes {
  _id?: string;
  mes: number;
  anio: number;
  pagada: boolean;
  monto: number | null;
  fechaPago: string | null;
  // campos del sistema de pagos
  estadoPago?: 'pendiente_comprobante' | 'comprobante_enviado' | 'aceptado' | 'rechazado';
  comprobanteUrl?: string | null;
  pagoId?: string | null;
}

interface ParametrosCuota {
  montoBase: number;
  diaCierre: number;
  moneda: 'ARS' | 'USD';
}

interface InscripcionCurso {
  _id: string;
  courseId: string;
  courseTitle: string;
  status: string;
  fechaInscripcion: string;
}

type EstadoCuota = 'pagada' | 'vencida' | 'vence-hoy' | 'pendiente' | 'no-era-socio';

// ── Helpers ───────────────────────────────────────────────────────────────────

function parsearFechaLocal(fechaStr: string): { anio: number; mes: number } {
  const partes = fechaStr.slice(0, 10).split('-');
  return { anio: Number(partes[0]), mes: Number(partes[1]) };
}

function mesAnteriorAInscripcion(
  vencMes: number, vencAnio: number, altaMes: number, altaAnio: number
): boolean {
  if (vencAnio < altaAnio) return true;
  if (vencAnio === altaAnio && vencMes < altaMes) return true;
  return false;
}

function estadoDeCuota(
  fechaInscripcion: string,
  mes: number,
  anio: number,
  cuota: CuotaMes | undefined,
  diaCierre: number
): EstadoCuota {
  const { anio: altaAnio, mes: altaMes } = parsearFechaLocal(fechaInscripcion);
  if (mesAnteriorAInscripcion(mes, anio, altaMes, altaAnio)) return 'no-era-socio';
  if (cuota?.pagada || cuota?.estadoPago === 'aceptado') return 'pagada';
  if (cuota?.estadoPago === 'comprobante_enviado') return 'pendiente'; // en revisión
  const hoy = new Date();
  const hoyLimpio = new Date(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
  const venc = new Date(anio, mes - 1, diaCierre);
  if (venc.getTime() === hoyLimpio.getTime()) return 'vence-hoy';
  if (venc < hoyLimpio) return 'vencida';
  return 'pendiente';
}

function formatMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

function etiquetaEstado(estado: EstadoCuota, cuota?: CuotaMes): string {
  if (cuota?.estadoPago === 'comprobante_enviado') return 'En revisión';
  if (cuota?.estadoPago === 'rechazado') return 'Rechazado';
  switch (estado) {
    case 'pagada': return 'Pagada';
    case 'vencida': return 'Vencida';
    case 'vence-hoy': return 'Vence hoy';
    case 'pendiente': return 'Pendiente';
    case 'no-era-socio': return '—';
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function PagoSocioPage() {
  const params = useParams();
  const router = useRouter();
  const socioId = params?.id as string;

  const [socio, setSocio] = useState<SocioInfo | null>(null);
  const [cuotas, setCuotas] = useState<CuotaMes[]>([]);
  const [parametros, setParametros] = useState<ParametrosCuota>({
    montoBase: 5000,
    diaCierre: 10,
    moneda: 'ARS',
  });
  const [cursos, setCursos] = useState<InscripcionCurso[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal de pago
  const [modalAbierto, setModalAbierto] = useState(false);
  const [cuotaSeleccionada, setCuotaSeleccionada] = useState<{ mes: number; anio: number } | null>(null);
  const [archivo, setArchivo] = useState<File | null>(null);
  const [previewArchivo, setPreviewArchivo] = useState<string | null>(null);
  const [subiendoPago, setSubiendoPago] = useState(false);
  const [mensajeExito, setMensajeExito] = useState<string | null>(null);
  const [mensajeError, setMensajeError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const anioActual = new Date().getFullYear();

  // ── Fetch datos ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socioId) return;

    const cargar = async () => {
      setLoading(true);
      try {
        const [socioRes, paramsRes, pagosRes, cursosRes] = await Promise.all([
          fetch(`${API}/api/cuotas/socio-detalle/${socioId}`),
          fetch(`${API}/api/cuotas/parametros`),
          fetch(`${API}/api/pagos/socio/${socioId}`),
          fetch(`${API}/api/inscriptions/socio/${socioId}`),
        ]);

        if (!socioRes.ok) throw new Error('Socio no encontrado');

        const socioData: SocioInfo & { cuotas: CuotaMes[] } = await socioRes.json();
        const paramsData: ParametrosCuota = await paramsRes.json();

        // Merge cuotas con pagos (comprobantes enviados)
        const pagosData: { mes: number; anio: number; estado: string; comprobanteUrl: string; _id: string }[] =
          pagosRes.ok ? await pagosRes.json() : [];

        const cuotasMerged: CuotaMes[] = (socioData.cuotas || []).map((c) => {
          const pago = pagosData.find((p) => p.mes === c.mes && p.anio === c.anio);
          return {
            ...c,
            estadoPago: pago
              ? (pago.estado as CuotaMes['estadoPago'])
              : c.pagada ? 'aceptado' : undefined,
            comprobanteUrl: pago?.comprobanteUrl ?? null,
            pagoId: pago?._id ?? null,
          };
        });

        // Añadir pagos enviados que no tienen cuota registrada aún
        pagosData.forEach((p) => {
          const existe = cuotasMerged.find((c) => c.mes === p.mes && c.anio === p.anio);
          if (!existe) {
            cuotasMerged.push({
              mes: p.mes,
              anio: p.anio,
              pagada: p.estado === 'aceptado',
              monto: null,
              fechaPago: null,
              estadoPago: p.estado as CuotaMes['estadoPago'],
              comprobanteUrl: p.comprobanteUrl,
              pagoId: p._id,
            });
          }
        });

        const cursosData: InscripcionCurso[] = cursosRes.ok ? await cursosRes.json() : [];

        setSocio({
          _id: socioData._id,
          nombre: socioData.nombre,
          apellido: socioData.apellido,
          correo: socioData.correo,
          telefono: socioData.telefono,
          provincia: socioData.provincia,
          ciudad: socioData.ciudad,
          numeroSocio: socioData.numeroSocio,
          avatar: socioData.avatar,
          active: socioData.active,
          fechaInscripcion: socioData.fechaInscripcion,
        });
        setCuotas(cuotasMerged);
        setParametros(paramsData);
        setCursos(cursosData);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error al cargar datos');
      } finally {
        setLoading(false);
      }
    };

    cargar();
  }, [socioId]);

  // ── Generar grilla 12 meses ──────────────────────────────────────────────
  const meses12 = Array.from({ length: 12 }, (_, i) => ({
    mes: i + 1,
    anio: anioActual,
  }));

  // ── Abrir modal ──────────────────────────────────────────────────────────
  const abrirModal = (mes: number, anio: number) => {
    setCuotaSeleccionada({ mes, anio });
    setArchivo(null);
    setPreviewArchivo(null);
    setMensajeExito(null);
    setMensajeError(null);
    setModalAbierto(true);
  };

  const cerrarModal = () => {
    setModalAbierto(false);
    setCuotaSeleccionada(null);
    setArchivo(null);
    setPreviewArchivo(null);
    setMensajeExito(null);
    setMensajeError(null);
    if (fileRef.current) fileRef.current.value = '';
  };

  // ── Manejar selección de archivo ─────────────────────────────────────────
  const handleArchivoChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validos = ['image/jpeg','image/jpg','image/png','image/webp','application/pdf'];
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
    if (file.type !== 'application/pdf') {
      setPreviewArchivo(URL.createObjectURL(file));
    } else {
      setPreviewArchivo(null);
    }
  };

  // ── Enviar comprobante ───────────────────────────────────────────────────
  const handleEnviarPago = async () => {
    if (!archivo || !cuotaSeleccionada || !socio) return;
    setSubiendoPago(true);
    setMensajeError(null);

    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const formData = new FormData();
      formData.append('socioId', socioId);
      formData.append('mes', String(cuotaSeleccionada.mes));
      formData.append('anio', String(cuotaSeleccionada.anio));
      formData.append('monto', String(parametros.montoBase));
      formData.append('comprobante', archivo);

      const res = await fetch(`${API}/api/pagos`, {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const data: { success: boolean; message?: string; error?: string; pago?: { _id: string; estado: string; comprobanteUrl: string } } =
        await res.json();

      if (!res.ok || !data.success) throw new Error(data.error ?? data.message ?? 'Error al enviar');

      // Actualizar estado local
      setCuotas((prev) => {
        const existe = prev.find(
          (c) => c.mes === cuotaSeleccionada.mes && c.anio === cuotaSeleccionada.anio
        );
        if (existe) {
          return prev.map((c) =>
            c.mes === cuotaSeleccionada.mes && c.anio === cuotaSeleccionada.anio
              ? { ...c, estadoPago: 'comprobante_enviado', comprobanteUrl: data.pago?.comprobanteUrl ?? null, pagoId: data.pago?._id ?? null }
              : c
          );
        }
        return [
          ...prev,
          {
            mes: cuotaSeleccionada.mes,
            anio: cuotaSeleccionada.anio,
            pagada: false,
            monto: parametros.montoBase,
            fechaPago: null,
            estadoPago: 'comprobante_enviado',
            comprobanteUrl: data.pago?.comprobanteUrl ?? null,
            pagoId: data.pago?._id ?? null,
          },
        ];
      });

      setMensajeExito('¡Comprobante enviado! El administrador lo revisará pronto.');
      setArchivo(null);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setMensajeError(err instanceof Error ? err.message : 'Error al enviar el comprobante');
    } finally {
      setSubiendoPago(false);
    }
  };

  // ── Resumen rápido ───────────────────────────────────────────────────────
  const pagadas = meses12.filter(({ mes, anio }) => {
    const c = cuotas.find((x) => x.mes === mes && x.anio === anio);
    const est = estadoDeCuota(socio?.fechaInscripcion ?? '2024-01-01', mes, anio, c, parametros.diaCierre);
    return est === 'pagada';
  }).length;

  const vencidas = meses12.filter(({ mes, anio }) => {
    const c = cuotas.find((x) => x.mes === mes && x.anio === anio);
    const est = estadoDeCuota(socio?.fechaInscripcion ?? '2024-01-01', mes, anio, c, parametros.diaCierre);
    return est === 'vencida';
  }).length;

  const enRevision = cuotas.filter((c) => c.estadoPago === 'comprobante_enviado').length;

  // ── Cuota seleccionada (para el modal) ───────────────────────────────────
  const cuotaDelModal = cuotaSeleccionada
    ? cuotas.find((c) => c.mes === cuotaSeleccionada.mes && c.anio === cuotaSeleccionada.anio)
    : undefined;

  const estadoModal = cuotaSeleccionada && socio
    ? estadoDeCuota(
        socio.fechaInscripcion,
        cuotaSeleccionada.mes,
        cuotaSeleccionada.anio,
        cuotaDelModal,
        parametros.diaCierre
      )
    : null;

  const puedeSubir =
    estadoModal === 'pendiente' ||
    estadoModal === 'vencida' ||
    estadoModal === 'vence-hoy' ||
    cuotaDelModal?.estadoPago === 'rechazado';

  // ── Loading / Error ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="pago-loading">
        <div className="pago-spinner" />
        <p>Cargando factura...</p>
      </div>
    );
  }

  if (error || !socio) {
    return (
      <div className="pago-error">
        <span>⚠️</span>
        <p>{error ?? 'Socio no encontrado'}</p>
        <button onClick={() => router.back()}>← Volver</button>
      </div>
    );
  }

  // ── Render principal ─────────────────────────────────────────────────────
  return (
    <div className="pago-root">

      {/* ── Encabezado ─────────────────────────────────────────────────── */}
      <header className="pago-header">
        <button className="pago-btn-back" onClick={() => router.back()}>← Volver</button>
        <div className="pago-header-info">
          <div className="pago-avatar-wrap">
            {socio.avatar ? (
              <Image src={socio.avatar} alt="Avatar" width={64} height={64} className="pago-avatar" />
            ) : (
              <div className="pago-avatar-fallback">
                {socio.nombre[0]}{socio.apellido[0]}
              </div>
            )}
            <span className={`pago-badge-activo ${socio.active ? 'activo' : 'inactivo'}`}>
              {socio.active ? 'Activo' : 'Inactivo'}
            </span>
          </div>
          <div>
            <h1 className="pago-nombre">{socio.nombre} {socio.apellido}</h1>
            <p className="pago-meta">
              Socio N° <strong>{String(socio.numeroSocio).padStart(4, '0')}</strong>
              &nbsp;·&nbsp;{socio.ciudad}, {socio.provincia}
            </p>
            <p className="pago-meta">{socio.correo}</p>
          </div>
        </div>
      </header>

      {/* ── Resumen stats ──────────────────────────────────────────────── */}
      <section className="pago-stats">
        <div className="pago-stat pago-stat-green">
          <span className="pago-stat-num">{pagadas}</span>
          <span className="pago-stat-label">Pagadas</span>
        </div>
        <div className="pago-stat pago-stat-red">
          <span className="pago-stat-num">{vencidas}</span>
          <span className="pago-stat-label">Vencidas</span>
        </div>
        <div className="pago-stat pago-stat-yellow">
          <span className="pago-stat-num">{enRevision}</span>
          <span className="pago-stat-label">En revisión</span>
        </div>
        <div className="pago-stat pago-stat-blue">
          <span className="pago-stat-num">{formatMonto(parametros.montoBase, parametros.moneda)}</span>
          <span className="pago-stat-label">Valor cuota</span>
        </div>
      </section>

      {/* ── Factura / grilla de cuotas ──────────────────────────────────── */}
      <section className="pago-seccion">
        <h2 className="pago-seccion-titulo">Cuotas {anioActual}</h2>
        <p className="pago-seccion-desc">
          Vencimiento mensual: día <strong>{parametros.diaCierre}</strong> de cada mes.
          Para pagar, hacé clic en la cuota y subí tu comprobante.
        </p>

        <div className="pago-grid">
          {meses12.map(({ mes, anio }) => {
            const cuota = cuotas.find((c) => c.mes === mes && c.anio === anio);
            const estado = estadoDeCuota(socio.fechaInscripcion, mes, anio, cuota, parametros.diaCierre);
            const etiqueta = etiquetaEstado(estado, cuota);
            const enRevisionLocal = cuota?.estadoPago === 'comprobante_enviado';
            const rechazada = cuota?.estadoPago === 'rechazado';

            const claseEstado =
              estado === 'pagada' ? 'estado-pagada'
              : enRevisionLocal ? 'estado-revision'
              : rechazada ? 'estado-rechazada'
              : estado === 'vencida' ? 'estado-vencida'
              : estado === 'vence-hoy' ? 'estado-vence-hoy'
              : estado === 'no-era-socio' ? 'estado-noera'
              : 'estado-pendiente';

            const clickable =
              estado !== 'no-era-socio' && estado !== 'pagada' && !enRevisionLocal;

            return (
              <button
                key={`${mes}-${anio}`}
                className={`pago-mes-card ${claseEstado} ${clickable ? 'clickable' : ''}`}
                onClick={() => clickable && abrirModal(mes, anio)}
                disabled={!clickable}
              >
                <span className="pago-mes-nombre">{MESES[mes - 1]}</span>
                <span className={`pago-mes-badge ${claseEstado}`}>{etiqueta}</span>
                {estado !== 'no-era-socio' && (
                  <span className="pago-mes-monto">
                    {estado === 'pagada'
                      ? formatMonto(cuota?.monto ?? parametros.montoBase, parametros.moneda)
                      : formatMonto(parametros.montoBase, parametros.moneda)}
                  </span>
                )}
                {enRevisionLocal && (
                  <span className="pago-mes-sub">Esperando confirmación</span>
                )}
                {rechazada && (
                  <span className="pago-mes-sub pago-mes-sub-red">Pago rechazado — podés reintentar</span>
                )}
                {clickable && (
                  <span className="pago-mes-cta">Subir comprobante →</span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {/* ── Cursos inscriptos ───────────────────────────────────────────── */}
      <section className="pago-seccion">
        <h2 className="pago-seccion-titulo">Cursos</h2>
        {cursos.length === 0 ? (
          <p className="pago-empty">Este socio no está inscripto en ningún curso.</p>
        ) : (
          <div className="pago-cursos-lista">
            {cursos.map((c) => (
              <div key={c._id} className="pago-curso-item">
                <div>
                  <p className="pago-curso-titulo">{c.courseTitle}</p>
                  <p className="pago-curso-meta">
                    Inscripto el {new Date(c.fechaInscripcion).toLocaleDateString('es-AR')}
                  </p>
                </div>
                <span className={`pago-curso-estado estado-${c.status}`}>{c.status}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Instrucciones ──────────────────────────────────────────────── */}
      <section className="pago-instrucciones">
        <h3>¿Cómo pagar?</h3>
        <ol>
          <li>Realizá la transferencia al CBU o alias de la asociación.</li>
          <li>Guardá el comprobante (captura de pantalla, PDF o foto).</li>
          <li>Hacé clic en el mes a pagar y subí el comprobante.</li>
          <li>El administrador lo revisará y marcará tu cuota como pagada.</li>
        </ol>
        <div className="pago-datos-bancarios">
          <p><strong>Banco:</strong> Bru Bank</p>
          <p><strong>Alias:</strong> gabodev</p>
          <p><strong>C.B.U:</strong> 1430001713024172800019</p>
          <p><strong>Titular:</strong> Gabriel Joaquín Reynoso</p>
        </div>
      </section>

      {/* ── Modal de pago ──────────────────────────────────────────────── */}
      {modalAbierto && cuotaSeleccionada && (
        <div className="pago-modal-overlay" onClick={cerrarModal}>
          <div className="pago-modal" onClick={(e) => e.stopPropagation()}>

            <button className="pago-modal-cerrar" onClick={cerrarModal}>✕</button>

            <h2 className="pago-modal-titulo">
              Pagar {MESES[cuotaSeleccionada.mes - 1]} {cuotaSeleccionada.anio}
            </h2>

            {/* Detalle factura */}
            <div className="pago-factura">
              <div className="pago-factura-fila">
                <span>Concepto</span>
                <span>Cuota mensual de socio</span>
              </div>
              <div className="pago-factura-fila">
                <span>Período</span>
                <span>{MESES[cuotaSeleccionada.mes - 1]} {cuotaSeleccionada.anio}</span>
              </div>
              <div className="pago-factura-fila">
                <span>Vencimiento</span>
                <span>
                  {parametros.diaCierre} de {MESES[cuotaSeleccionada.mes - 1]}
                </span>
              </div>
              <div className="pago-factura-fila pago-factura-total">
                <span>Total a pagar</span>
                <span>{formatMonto(parametros.montoBase, parametros.moneda)}</span>
              </div>
              {cuotaDelModal?.estadoPago === 'rechazado' && (
                <div className="pago-factura-fila pago-factura-rechazo">
                  <span>⚠️ Estado</span>
                  <span>Comprobante rechazado — por favor reenvíalo</span>
                </div>
              )}
            </div>

            {puedeSubir ? (
              <>
                <p className="pago-modal-instruccion">
                  Subí tu comprobante de transferencia (JPG, PNG, WEBP o PDF, máx. 10 MB).
                </p>

                <label className="pago-upload-label">
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
                    onChange={handleArchivoChange}
                    className="pago-upload-input"
                  />
                  <div className="pago-upload-zona">
                    {previewArchivo ? (
                      <Image src={previewArchivo} alt="Vista previa" width={200} height={140} className="pago-preview-img" />
                    ) : archivo ? (
                      <div className="pago-pdf-icon">
                        <span>📄</span>
                        <p>{archivo.name}</p>
                      </div>
                    ) : (
                      <>
                        <span className="pago-upload-icono">📎</span>
                        <p>Hacé clic o arrastrá el archivo aquí</p>
                        <p className="pago-upload-sub">JPG, PNG, WEBP o PDF</p>
                      </>
                    )}
                  </div>
                </label>

                {mensajeError && (
                  <div className="pago-msg pago-msg-error">{mensajeError}</div>
                )}

                {mensajeExito ? (
                  <div className="pago-msg pago-msg-exito">{mensajeExito}</div>
                ) : (
                  <button
                    className="pago-btn-enviar"
                    onClick={handleEnviarPago}
                    disabled={!archivo || subiendoPago}
                  >
                    {subiendoPago ? 'Enviando...' : 'Enviar comprobante'}
                  </button>
                )}
              </>
            ) : cuotaDelModal?.estadoPago === 'comprobante_enviado' ? (
              <div className="pago-msg pago-msg-info">
                Ya enviaste el comprobante. El administrador lo está revisando.
                {cuotaDelModal.comprobanteUrl && (
                  <a href={cuotaDelModal.comprobanteUrl} target="_blank" rel="noreferrer" className="pago-link-comprobante">
                    Ver comprobante enviado →
                  </a>
                )}
              </div>
            ) : (
              <div className="pago-msg pago-msg-exito">
                Esta cuota ya fue confirmada como pagada
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
}