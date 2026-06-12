// ─────────────────────────────────────────────────────────────────────────────
// SocioDashboard.tsx
// ─────────────────────────────────────────────────────────────────────────────

import { useState, useEffect, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../../context/AuthContext';
import Swal from 'sweetalert2';
import Logo from '../../assets/empatialog.jpeg';
import socioLogo from '../../assets/empatialog.jpeg';
import html2canvas from 'html2canvas';
import '../../style/Socio.css';

const API = 'http://localhost:5000';


interface SocioData {
  _id: string;
  nombre: string;
  apellido: string;
  correo: string;
  telefono: string;
  provincia: string;
  ciudad: string;
  numeroSocio: string;
  cuotaEstado: string;
  active: boolean;
  avatar?: string;
  fechaInscripcion?: string;
}

interface CuotaMes {
  _id?: string;
  mes: number;
  anio: number;
  pagada: boolean;
  monto?: number | null;
  fechaPago?: string | null;
}

interface ParametrosCuota {
  montoBase: number;
  diaCierre: number;
  moneda: 'ARS' | 'USD';
}

interface ApiResponse {
  success: boolean;
  message?: string;
  error?: string;
  socio?: SocioData;
}

interface CuotaVencidaInfo {
  mes: number;
  anio: number;
  nombreMes: string;
}

type EditedData = Partial<SocioData>;

// ── Helpers de cuotas ─────────────────────────────────────────────────────────

const HOY = new Date();

const NOMBRES_MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

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
  pagada: boolean,
  diaCierre: number
): 'pagada' | 'vencida' | 'vence-hoy' | 'pendiente' | 'no-era-socio' {
  const { anio: altaAnio, mes: altaMes } = parsearFechaLocal(fechaInscripcion);
  if (mesAnteriorAInscripcion(mes, anio, altaMes, altaAnio)) return 'no-era-socio';
  if (pagada) return 'pagada';
  const hoy = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
  const venc = new Date(anio, mes - 1, diaCierre);
  if (venc.getTime() === hoy.getTime()) return 'vence-hoy';
  if (venc < hoy) return 'vencida';
  return 'pendiente';
}

interface ResumenCuotas {
  pagadas: number;
  total: number;
  vencidas: number;
  cuotasVencidasDetalle: CuotaVencidaInfo[];
  mesActualPagado: boolean;
  proximaVenc: Date | null;
  diasHastaProxima: number | null;
}

function calcularResumen(
  cuotas: CuotaMes[],
  fechaInscripcion: string,
  diaCierre: number
): ResumenCuotas {
  const anioActual = HOY.getFullYear();
  const mesActual  = HOY.getMonth() + 1;
  const meses12 = Array.from({ length: 12 }, (_, i) => ({ mes: i + 1, anio: anioActual }));

  let pagadas = 0;
  let vencidas = 0;
  const cuotasVencidasDetalle: CuotaVencidaInfo[] = [];
  let mesActualPagado = false;
  let proximaVenc: Date | null = null;

  meses12.forEach(({ mes, anio }) => {
    const cuota = cuotas.find((c) => c.mes === mes && c.anio === anio);
    const estado = estadoDeCuota(
      fechaInscripcion, mes, anio, cuota?.pagada ?? false, diaCierre
    );

    if (estado === 'pagada') {
      pagadas++;
      if (mes === mesActual && anio === anioActual) mesActualPagado = true;
    }
    if (estado === 'vencida') {
      vencidas++;
      cuotasVencidasDetalle.push({ mes, anio, nombreMes: NOMBRES_MESES[mes - 1] });
    }
    if ((estado === 'pendiente' || estado === 'vence-hoy') && proximaVenc === null) {
      proximaVenc = new Date(anio, mes - 1, diaCierre);
    }
  });

  let diasHastaProxima: number | null = null;
  if (proximaVenc !== null) {
    const hoyLimpio = new Date(HOY.getFullYear(), HOY.getMonth(), HOY.getDate());
    diasHastaProxima = Math.round(
      ((proximaVenc as Date).getTime() - hoyLimpio.getTime()) / (1000 * 60 * 60 * 24)
    );
  }

  return { pagadas, total: 12, vencidas, cuotasVencidasDetalle, mesActualPagado, proximaVenc, diasHastaProxima };
}

function formatMonto(monto: number, moneda: string) {
  return new Intl.NumberFormat('es-AR', {
    style: 'currency',
    currency: moneda,
    maximumFractionDigits: 0,
  }).format(monto);
}

// ── Capturar comprobante y compartir por WhatsApp (igual que logro de trivia) ─

async function capturarYEnviarWhatsApp(
  socioData: SocioData,
  parametros: ParametrosCuota,
  resumen: ResumenCuotas
): Promise<void> {
  const container = document.createElement('div');
  container.style.cssText = `
    position: fixed; top: -9999px; left: -9999px;
    width: 380px; z-index: -1;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    background: #f8fafc; padding: 24px; box-sizing: border-box;
  `;

  const montoAdeudado = resumen.mesActualPagado
    ? 0
    : resumen.vencidas * parametros.montoBase;

  const nombreMesActual = NOMBRES_MESES[HOY.getMonth()];
  const anioActual = HOY.getFullYear();

  container.innerHTML = `
    <div style="background: #0f172a; border-radius: 16px; padding: 24px; color: white; text-align: center;">
      <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 1.5px; text-transform: uppercase; color: #94a3b8;">Comprobante de Estado</p>
      <h2 style="margin: 0 0 16px; font-size: 20px; font-weight: 600; color: #f1f5f9;">
        ${socioData.nombre} ${socioData.apellido}
      </h2>
      <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">N° Socio</p>
      <p style="margin: 0 0 20px; font-size: 16px; font-weight: 600; color: #7dd3fc;">${socioData.numeroSocio}</p>

      <div style="background: rgba(255,255,255,0.06); border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">Cuotas pagadas ${anioActual}</p>
        <p style="margin: 0; font-size: 32px; font-weight: 700; color: ${resumen.vencidas > 0 ? '#f87171' : '#34d399'};">
          ${resumen.pagadas} <span style="font-size: 16px; color: #64748b;">/ ${resumen.total}</span>
        </p>
      </div>

      <div style="background: ${montoAdeudado === 0 ? 'rgba(52,211,153,0.12)' : 'rgba(248,113,113,0.12)'}; border-radius: 12px; padding: 16px; margin-bottom: 16px;">
        <p style="margin: 0 0 4px; font-size: 11px; color: #64748b; text-transform: uppercase; letter-spacing: 1px;">
          ${montoAdeudado === 0 ? `Cuota ${nombreMesActual}` : 'Monto adeudado'}
        </p>
        <p style="margin: 0; font-size: 24px; font-weight: 700; color: ${montoAdeudado === 0 ? '#34d399' : '#f87171'};">
          ${montoAdeudado === 0 ? '✓ Al día' : formatMonto(montoAdeudado, parametros.moneda)}
        </p>
      </div>

      ${resumen.cuotasVencidasDetalle.length > 0 ? `
        <div style="background: rgba(248,113,113,0.08); border-radius: 10px; padding: 12px; text-align: left;">
          <p style="margin: 0 0 8px; font-size: 11px; color: #f87171; font-weight: 600; text-transform: uppercase; letter-spacing: 1px;">Cuotas vencidas</p>
          ${resumen.cuotasVencidasDetalle.map(c => `
            <div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
              <span style="font-size: 13px; color: #cbd5e1;">${c.nombreMes} ${c.anio}</span>
              <span style="font-size: 13px; color: #f87171; font-weight: 600;">${formatMonto(parametros.montoBase, parametros.moneda)}</span>
            </div>
          `).join('')}
        </div>
      ` : ''}

      <p style="margin: 16px 0 0; font-size: 11px; color: #475569;">
        Generado el ${HOY.toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
      </p>
    </div>
  `;

  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      useCORS: true,
      scale: 2,
      backgroundColor: '#f8fafc',
      logging: false,
      width: 380,
      windowWidth: 380,
    });
    document.body.removeChild(container);

    const telefono = '3413559329';
    const texto = `Mi estado de cuotas como socio de Empatía Digital`;

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, 'image/png')
    );
    if (!blob) return;

    const file = new File([blob], `Estado_Cuotas_${socioData.nombre}_${socioData.apellido}.png`, {
      type: 'image/png',
    });

    // Mismo flujo que el logro de trivia:
    // Si el navegador soporta compartir archivos, usamos navigator.share
    // (funciona en móvil y abre directamente el selector de apps incluyendo WhatsApp)
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], text: texto });
    } else {
      // Fallback: descargar la imagen y abrir WhatsApp con el número del admin
      const link = document.createElement('a');
      link.download = file.name;
      link.href = canvas.toDataURL('image/png');
      link.click();

      await new Promise<void>((resolve) => setTimeout(resolve, 400));
      window.open(
        `https://wa.me/${telefono}?text=${encodeURIComponent(texto)}`,
        '_blank'
      );
    }
  } catch (err) {
    if (document.body.contains(container)) document.body.removeChild(container);
    if (err instanceof Error && err.name !== 'AbortError') {
      Swal.fire('Error', 'No se pudo generar el comprobante. Intentá de nuevo.', 'error');
    }
  }
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function SocioDashboard() {
  const { user } = useAuth();
  const router = useRouter();

  const [socioData, setSocioData]         = useState<SocioData | null>(null);
  const [loading, setLoading]             = useState<boolean>(true);
  const [error, setError]                 = useState<string | null>(null);
  const [isEditing, setIsEditing]         = useState<boolean>(false);
  const [editedData, setEditedData]       = useState<EditedData>({});
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage]   = useState<string | null>(null);

  const [cuotas, setCuotas]               = useState<CuotaMes[]>([]);
  const [parametros, setParametros]       = useState<ParametrosCuota>({ montoBase: 5000, diaCierre: 10, moneda: 'ARS' });
  const [loadingCuotas, setLoadingCuotas] = useState(false);
  const [enviandoWhatsApp, setEnviandoWhatsApp] = useState(false);

  // ── Fetch socio ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const fetchSocioData = async (): Promise<void> => {
      const token = localStorage.getItem('token');
      if (!token) { setLoading(false); return; }

      try {
        const res = await fetch(`${API}/api/socios/obtener`, {
          method: 'GET',
          headers: { Authorization: `Bearer ${token}`, Correo: user.username },
        });
        const data: ApiResponse = await res.json();
        if (data.success && data.socio) {
          setSocioData({ ...data.socio });
          setEditedData(data.socio);
          if (data.socio.avatar) setPreviewImage(data.socio.avatar);
          if (!data.socio.active) showInactiveAlert();
        } else {
          setError('Socio no encontrado');
        }
      } catch {
        setError('Ocurrió un error al obtener los datos');
      } finally {
        setLoading(false);
      }
    };

    fetchSocioData();
  }, [user]);

  // ── Fetch cuotas + parámetros ────────────────────────────────────────────
  useEffect(() => {
    if (!socioData?._id) return;

    const fetchCuotas = async () => {
      setLoadingCuotas(true);
      try {
        const [cuotasRes, paramsRes] = await Promise.all([
          fetch(`${API}/api/cuotas/socio/${socioData._id}`),
          fetch(`${API}/api/cuotas/parametros`),
        ]);
        const cuotasData: CuotaMes[] = await cuotasRes.json();
        const paramsData: ParametrosCuota = await paramsRes.json();
        setCuotas(Array.isArray(cuotasData) ? cuotasData : []);
        setParametros(paramsData);
      } catch {
        // silencioso
      } finally {
        setLoadingCuotas(false);
      }
    };

    fetchCuotas();
  }, [socioData?._id]);

  // ── Resumen calculado ────────────────────────────────────────────────────
  const resumen = socioData?.fechaInscripcion
    ? calcularResumen(cuotas, socioData.fechaInscripcion, parametros.diaCierre)
    : null;

  // ── Banner de vencimiento ────────────────────────────────────────────────
  function textoBannerVencimiento(): { texto: string; tipo: 'ok' | 'alerta' | 'vencida' | 'neutro' } {
    if (!resumen) return { texto: '', tipo: 'neutro' };
    if (resumen.vencidas > 0) {
      return {
        texto: resumen.vencidas === 1 ? 'Tenés 1 cuota vencida.' : `Tenés ${resumen.vencidas} cuotas vencidas.`,
        tipo: 'vencida',
      };
    }
    if (resumen.diasHastaProxima === null) return { texto: 'Todas tus cuotas del año están al día.', tipo: 'ok' };
    if (resumen.diasHastaProxima === 0) return { texto: `Tu cuota vence HOY (día ${parametros.diaCierre}).`, tipo: 'alerta' };
    if (resumen.diasHastaProxima <= 3) {
      const fecha = resumen.proximaVenc!.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
      return { texto: `Tu cuota vence el ${fecha} — faltan ${resumen.diasHastaProxima} día${resumen.diasHastaProxima === 1 ? '' : 's'}.`, tipo: 'alerta' };
    }
    const fecha = resumen.proximaVenc!.toLocaleDateString('es-AR', { day: 'numeric', month: 'long' });
    return { texto: `Próxima cuota: vence el ${fecha} (en ${resumen.diasHastaProxima} días).`, tipo: 'ok' };
  }

  const banner = textoBannerVencimiento();
  const colorBanner = {
    ok:      { bg: '#f0fdf4', border: '#86efac', text: '#166534', icono: '✅' },
    alerta:  { bg: '#fef3c7', border: '#fde68a', text: '#92400e', icono: '⚠️' },
    vencida: { bg: '#fef2f2', border: '#fca5a5', text: '#991b1b', icono: '🔴' },
    neutro:  { bg: '#f8fafc', border: '#e2e8f0', text: '#64748b', icono: '📋' },
  }[banner.tipo];

  const montoAdeudado = resumen
    ? (resumen.mesActualPagado ? 0 : resumen.vencidas * parametros.montoBase)
    : 0;

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleGoToPagos = (): void => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    router.push(`/socio/pagos/${socioData._id}`);
  };

  const handleEnviarComprobante = async (): Promise<void> => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    if (!resumen) return;
    setEnviandoWhatsApp(true);
    try {
      await capturarYEnviarWhatsApp(socioData, parametros, resumen);
    } finally {
      setEnviandoWhatsApp(false);
    }
  };

  const handleCaptureCarnet = (): void => {
    const carnetElement = document.getElementById('carnet-socio');
    if (!carnetElement || !socioData) return;
    const allImgs = carnetElement.querySelectorAll('img');
    for (const img of Array.from(allImgs)) {
      if (!img.complete) { img.onload = () => handleCaptureCarnet(); return; }
    }
    const clone = carnetElement.cloneNode(true) as HTMLElement;
    const wrapper = document.createElement('div');
    wrapper.style.cssText = `position:fixed;top:-9999px;left:-9999px;width:360px;z-index:-1;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;`;
    clone.style.cssText = `background:linear-gradient(155deg,#0a0f1e 0%,#0f2040 45%,#6b1010 100%);padding:28px 24px 20px;color:white;text-align:center;position:relative;overflow:hidden;width:360px;box-sizing:border-box;border-radius:0;`;

    const applyChildStyles = (cloneEl: Element, originalEl: Element): void => {
      const cloneChildren = Array.from(cloneEl.children);
      const origChildren  = Array.from(originalEl.children);
      cloneChildren.forEach((cloneChild, i) => {
        const origChild = origChildren[i];
        if (!origChild) return;
        const tag     = (cloneChild as HTMLElement).tagName;
        const classes = origChild.className ?? '';
        if (classes.includes('card-avatar') && tag === 'IMG') {
          (cloneChild as HTMLElement).style.cssText = `width:100px;height:100px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,0.30);background:#1e2d45;margin:14px auto 12px;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
        }
        if (classes.includes('logo-cuadrado') && tag === 'IMG') {
          (cloneChild as HTMLElement).style.cssText = `width:110px;height:70px;object-fit:contain;margin:12px auto 10px;display:block;opacity:0.92;filter:brightness(1.1);`;
        }
        if (tag === 'H1') (cloneChild as HTMLElement).style.cssText = `font-size:12px;font-weight:600;padding:6px 16px;border-radius:20px;background:linear-gradient(90deg,#7f1d1d,#991b1b);color:#ffffff;margin:10px auto 6px;letter-spacing:1.5px;text-transform:uppercase;display:inline-block;box-shadow:0 2px 8px rgba(127,29,29,0.5);`;
        if (tag === 'H2') (cloneChild as HTMLElement).style.cssText = `font-size:18px;font-weight:600;margin:6px 0 4px;color:#f1f5f9;letter-spacing:0.3px;`;
        if (tag === 'STRONG') {
          const cls = origChild.className ?? '';
          (cloneChild as HTMLElement).style.cssText = `font-size:13px;font-weight:600;color:${cls.includes('activo') ? '#34d399' : '#f87171'};display:inline;`;
        }
        if (classes.includes('card-header-orange')) {
          (cloneChild as HTMLElement).style.cssText = `text-align:center;padding:4px 0 0;`;
          const innerImg = (cloneChild as HTMLElement).querySelector('img');
          if (innerImg) innerImg.style.cssText = `width:100px;height:100px;border-radius:12px;object-fit:cover;border:2px solid rgba(255,255,255,0.30);background:#1e2d45;margin:14px auto 12px;display:block;box-shadow:0 4px 16px rgba(0,0,0,0.4);`;
        }
        if (classes.includes('carnet-divider')) (cloneChild as HTMLElement).style.cssText = `width:100%;height:1px;background:rgba(255,255,255,0.08);margin:10px 0;display:block;`;
        if (classes.includes('carnet-label'))   (cloneChild as HTMLElement).style.cssText = `font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:#64748b;margin:0;display:block;`;
        if (classes.includes('carnet-value'))   (cloneChild as HTMLElement).style.cssText = `font-size:13px;color:#cbd5e1;margin:2px 0 8px;display:block;`;
      });
    };

    applyChildStyles(clone, carnetElement);
    clone.querySelectorAll('*').forEach((el) => {
      const htmlEl = el as HTMLElement;
      if (!htmlEl.style.color && htmlEl.tagName !== 'IMG') htmlEl.style.color = '#cbd5e1';
    });
    wrapper.appendChild(clone);
    document.body.appendChild(wrapper);

    html2canvas(clone, { useCORS: true, scale: 3, backgroundColor: null, logging: false, width: 360, windowWidth: 360 })
      .then((canvas) => {
        document.body.removeChild(wrapper);
        const finalCanvas = document.createElement('canvas');
        const radius = 18;
        finalCanvas.width  = canvas.width;
        finalCanvas.height = canvas.height;
        const ctx = finalCanvas.getContext('2d');
        if (!ctx) return;
        const r = radius * 3, w = finalCanvas.width, h = finalCanvas.height;
        ctx.beginPath();
        ctx.moveTo(r, 0); ctx.lineTo(w - r, 0); ctx.quadraticCurveTo(w, 0, w, r);
        ctx.lineTo(w, h - r); ctx.quadraticCurveTo(w, h, w - r, h);
        ctx.lineTo(r, h); ctx.quadraticCurveTo(0, h, 0, h - r);
        ctx.lineTo(0, r); ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath(); ctx.clip(); ctx.drawImage(canvas, 0, 0);
        const link = document.createElement('a');
        link.download = `Carnet_Socio_${socioData.nombre}.png`;
        link.href = finalCanvas.toDataURL('image/png');
        link.click();
      })
      .catch(() => {
        document.body.removeChild(wrapper);
        Swal.fire('Error', 'No se pudo capturar el carnet. Intentá de nuevo.', 'error');
      });
  };

  const showInactiveAlert = (): void => {
    Swal.fire({
      title: 'Cuenta Inactiva',
      html: `<div style="text-align:center;"><p style="color:#dc2626;font-weight:600;margin-bottom:16px;">Estás inhabilitado para usar las funciones del sistema.</p><p style="margin-bottom:16px;color:#6b7280;">Para más información, enviá un WhatsApp haciendo clic en el botón de abajo.</p></div>`,
      icon: 'warning', showCancelButton: true, confirmButtonText: 'Enviar WhatsApp',
      cancelButtonText: 'Cerrar', confirmButtonColor: '#25D366', cancelButtonColor: '#d33',
      allowOutsideClick: false, allowEscapeKey: false,
    }).then((result) => { if (result.isConfirmed) sendWhatsAppMessage(); });
  };

  const sendWhatsAppMessage = (): void => {
    const phoneNumber = '3413559329';
    const message = 'Hola, me sale un mensaje que dice, estas inhabilitado, ¿a qué se debe, esto?';
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleFunctionBlocked = (): void => {
    Swal.fire({
      title: 'Función Bloqueada',
      html: `<div style="text-align:center;"><p style="color:#dc2626;font-weight:600;">Estás inactivo. Contactá con soporte por favor.</p></div>`,
      icon: 'error', showCancelButton: true, confirmButtonText: 'Enviar WhatsApp',
      cancelButtonText: 'Cerrar', confirmButtonColor: '#25D366', cancelButtonColor: '#d33',
      allowOutsideClick: false, allowEscapeKey: false,
    }).then((result) => { if (result.isConfirmed) sendWhatsAppMessage(); });
  };

  const handleEditClick = (): void => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    setIsEditing(true);
    setEditedData({ ...socioData });
  };

  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>): void => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    const { name, value } = e.target;
    setEditedData((prev) => ({ ...prev, [name]: value }));
  };

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>): void => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      Swal.fire('Error', 'Por favor seleccioná una imagen válida (JPG, PNG, GIF, WEBP)', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      Swal.fire('Error', 'La imagen no puede superar los 5MB', 'error');
      return;
    }
    setSelectedImage(file);
    setPreviewImage(URL.createObjectURL(file));
  };

  const handleSaveChanges = async (): Promise<void> => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    const token = localStorage.getItem('token');
    if (!token) { await Swal.fire('Error', 'No estás autenticado', 'error'); return; }
    Swal.fire({ title: 'Guardando cambios...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => { Swal.showLoading(); } });
    try {
      const formData = new FormData();
      formData.append('_id', socioData._id);
      formData.append('nombre', editedData.nombre ?? socioData.nombre ?? '');
      formData.append('apellido', editedData.apellido ?? socioData.apellido ?? '');
      formData.append('telefono', editedData.telefono ?? socioData.telefono ?? '');
      formData.append('provincia', editedData.provincia ?? socioData.provincia ?? '');
      formData.append('ciudad', editedData.ciudad ?? socioData.ciudad ?? '');
      if (selectedImage) formData.append('avatar', selectedImage);
      const res = await fetch(`${API}/api/socios/editar`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const data: ApiResponse = await res.json();
      if (res.ok && data.success) {
        await Swal.fire({ icon: 'success', title: '¡Éxito!', text: 'Datos actualizados correctamente', confirmButtonColor: '#3085d6' });
        const updatedSocio: SocioData = { ...socioData, ...editedData, avatar: data.socio?.avatar ?? socioData.avatar } as SocioData;
        setSocioData(updatedSocio);
        setEditedData(updatedSocio);
        setIsEditing(false);
        setSelectedImage(null);
        if (data.socio?.avatar) setPreviewImage(data.socio.avatar);
      } else {
        throw new Error(data.message ?? data.error ?? 'Error al actualizar los datos');
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Ocurrió un error al actualizar los datos';
      await Swal.fire({ icon: 'error', title: 'Error', text: message, confirmButtonColor: '#d33' });
    }
  };

  const handleConfirmPasswordChange = (): void => {
    if (!socioData?.active) { handleFunctionBlocked(); return; }
    let showPasswordFlag = false;
    Swal.fire({
      title: '¿Seguro que querés cambiar la contraseña?',
      html: `<input id="swal-input-password" type="password" class="swal2-input" placeholder="Nueva contraseña" /><button type="button" id="toggle-password" class="swal2-styled" style="margin-top:10px;">👁️ Mostrar</button>`,
      focusConfirm: false, showCancelButton: true, confirmButtonText: 'Cambiar',
      cancelButtonText: 'Cancelar', showLoaderOnConfirm: true,
      didOpen: () => {
        const popup = Swal.getPopup();
        if (!popup) return;
        const passwordInput = popup.querySelector<HTMLInputElement>('#swal-input-password');
        const toggleBtn     = popup.querySelector<HTMLButtonElement>('#toggle-password');
        if (!passwordInput || !toggleBtn) return;
        toggleBtn.addEventListener('click', () => {
          showPasswordFlag = !showPasswordFlag;
          passwordInput.type = showPasswordFlag ? 'text' : 'password';
          toggleBtn.textContent = showPasswordFlag ? '🙈 Ocultar' : '👁️ Mostrar';
        });
      },
      preConfirm: async () => {
        const popup = Swal.getPopup();
        if (!popup) return false;
        const newPassword = popup.querySelector<HTMLInputElement>('#swal-input-password')?.value ?? '';
        if (!newPassword || newPassword.length < 6) { Swal.showValidationMessage('La contraseña debe tener al menos 6 caracteres'); return false; }
        const token = localStorage.getItem('token');
        try {
          const res = await fetch(`${API}/api/cambiar-password-logueado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
            body: JSON.stringify({ nuevaPassword: newPassword }),
          });
          const data: ApiResponse = await res.json();
          if (!res.ok || !data.success) throw new Error(data.error ?? 'Error al cambiar la contraseña');
          return true;
        } catch (err) {
          const message = err instanceof Error ? err.message : 'Error desconocido';
          Swal.showValidationMessage(`Error: ${message}`);
          return false;
        }
      },
      allowOutsideClick: () => !Swal.isLoading(),
    }).then((result) => { if (result.isConfirmed) Swal.fire('Éxito', 'Contraseña cambiada correctamente', 'success'); });
  };

  // ── Estados de carga / error ─────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.1rem', color: '#64748b' }}>
        Cargando datos del socio...
      </div>
    );
  }
  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.1rem', color: '#dc2626' }}>
        {error}
      </div>
    );
  }
  if (!socioData) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', fontSize: '1.1rem', color: '#64748b' }}>
        No se encontraron datos del socio.
      </div>
    );
  }

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="socio-dashboard-container">

      {/* Overlay cuenta inactiva */}
      {!socioData.active && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 9999, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ backgroundColor: '#fff', padding: '36px 32px', borderRadius: '14px', textAlign: 'center', maxWidth: '400px', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
            <h2 style={{ color: '#dc2626', marginBottom: '16px', fontSize: '1.2rem' }}>⚠️ Cuenta Inactiva</h2>
            <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '15px', marginBottom: '12px' }}>Estás inhabilitado para usar las funciones del sistema.</p>
            <p style={{ marginBottom: '24px', color: '#6b7280', fontSize: '14px' }}>Para más información y reactivar tu cuenta, enviá un WhatsApp.</p>
            <button onClick={sendWhatsAppMessage} style={{ backgroundColor: '#25D366', color: 'white', border: 'none', padding: '13px 28px', borderRadius: '8px', cursor: 'pointer', fontSize: '15px', fontWeight: 600, width: '100%' }}>
              📱 Enviar WhatsApp a Soporte
            </button>
          </div>
        </div>
      )}

      {/* Banner inactivo */}
      {!socioData.active && (
        <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', borderRadius: '10px', padding: '14px 20px', marginBottom: '20px', textAlign: 'center', width: '100%', maxWidth: '700px' }}>
          <p style={{ color: '#dc2626', fontWeight: 600, fontSize: '15px', margin: '0 0 10px' }}>Estás inactivo. Contactá con soporte por favor.</p>
          <button onClick={sendWhatsAppMessage} style={{ backgroundColor: '#25D366', color: 'white', border: 'none', padding: '9px 20px', borderRadius: '6px', cursor: 'pointer', fontSize: '13px', fontWeight: 600 }}>
            📱 Enviar WhatsApp
          </button>
        </div>
      )}

      <div className="cards-container">

        {/* ─── Carnet de Socio ────────────────────────────────────────────── */}
        <div className="card-header-modern-complete">
          <div className="card-header-modern" id="carnet-socio">
            <div className="card-header-orange">
              <img src={previewImage ?? Logo.src} alt="Foto de carnet" className="card-avatar" crossOrigin="anonymous" />
            </div>
            <span className="carnet-label">Socio</span>
            <strong className={socioData.numeroSocio ? 'activo' : 'inactivo'}>
              {socioData.numeroSocio}
            </strong>
            <h2>{socioData.nombre} {socioData.apellido}</h2>
            <span className="carnet-label">Localidad</span>
            <strong className={socioData.ciudad ? 'activo' : 'inactivo'}>
              {socioData.ciudad || 'No disponible'}
            </strong>
            <div className="carnet-divider" />
            <img src={socioLogo.src} alt="Logo Sentidos" className="logo-cuadrado" crossOrigin="anonymous" />
            <h1>Carnet de Socio</h1>
          </div>

          <button className="btn-captura" onClick={handleCaptureCarnet}>
            Capturar Carnet
          </button>

          <div className="card-body">
            {isEditing ? (
              <>
                <h3>Nombre</h3>
                <input type="text" name="nombre" value={editedData.nombre ?? ''} onChange={handleChange} disabled={!socioData.active} style={{ opacity: socioData.active ? 1 : 0.5 }} />
                <h3>Apellido</h3>
                <input type="text" name="apellido" value={editedData.apellido ?? ''} onChange={handleChange} disabled={!socioData.active} style={{ opacity: socioData.active ? 1 : 0.5 }} />
                <h3>Teléfono</h3>
                <input type="text" name="telefono" value={editedData.telefono ?? ''} onChange={handleChange} disabled={!socioData.active} style={{ opacity: socioData.active ? 1 : 0.5 }} />
                <h3>Cambiar Foto de Perfil</h3>
                <input type="file" accept="image/jpeg,image/jpg,image/png,image/gif,image/webp" onChange={handleImageChange} disabled={!socioData.active} style={{ opacity: socioData.active ? 1 : 0.5, marginTop: '8px' }} />
                {previewImage && selectedImage && (
                  <div style={{ marginTop: '14px', textAlign: 'center' }}>
                    <p style={{ fontSize: '12px', color: '#94a3b8', marginBottom: '8px' }}>Vista previa:</p>
                    <img src={previewImage} alt="Preview" style={{ maxWidth: '130px', maxHeight: '130px', borderRadius: '10px', objectFit: 'cover', border: '2px solid rgba(74,144,217,0.25)' }} />
                  </div>
                )}
                <p style={{ marginTop: '16px', textAlign: 'center', fontSize: '12px', color: '#94a3b8' }}>
                  Para otros cambios, comunicate con el administrador.
                </p>
              </>
            ) : (
              <>
                <p><strong>Correo:</strong> {socioData.correo || 'No disponible'}</p>
                <p><strong>Teléfono:</strong> {socioData.telefono || 'No disponible'}</p>
                <p><strong>Provincia:</strong> {socioData.provincia || 'No disponible'}</p>
                <p><strong>Ciudad:</strong> {socioData.ciudad || 'No disponible'}</p>
              </>
            )}
          </div>
        </div>

        {/* ─── Estado de Cuotas ────────────────────────────────────────────── */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-green">
            <h1>Estado de Cuotas</h1>
            <img src={Logo.src} alt="Logo" className="card-avatar" />
          </div>

          <div className="card-body">
            {loadingCuotas ? (
              <p style={{ color: '#94a3b8', fontSize: '14px', textAlign: 'center', padding: '12px 0' }}>
                Cargando cuotas...
              </p>
            ) : (
              <>
                {/* Contador pagadas / 12 */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', padding: '14px 16px', background: '#f8fafc', borderRadius: '10px', border: '1px solid #e2e8f0' }}>
                  <div>
                    <p style={{ margin: 0, fontSize: '12px', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700 }}>
                      Cuotas pagadas
                    </p>
                    <p style={{ margin: '4px 0 0', fontSize: '28px', fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>
                      {resumen?.pagadas ?? 0}
                      <span style={{ fontSize: '16px', fontWeight: 500, color: '#94a3b8' }}> / {resumen?.total ?? 12}</span>
                    </p>
                  </div>
                  <div style={{ width: '80px' }}>
                    <div style={{ height: '8px', borderRadius: '4px', background: '#e2e8f0', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: '4px', background: (resumen?.vencidas ?? 0) > 0 ? '#dc2626' : '#16a34a', width: `${((resumen?.pagadas ?? 0) / 12) * 100}%`, transition: 'width 0.4s ease' }} />
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '10px', color: '#94a3b8', textAlign: 'right' }}>
                      {Math.round(((resumen?.pagadas ?? 0) / 12) * 100)}%
                    </p>
                  </div>
                </div>

                {/* Banner estado vencimiento */}
                {banner.texto && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '12px 14px', background: colorBanner.bg, border: `1px solid ${colorBanner.border}`, borderRadius: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '16px', flexShrink: 0, marginTop: '1px' }}>{colorBanner.icono}</span>
                    <p style={{ margin: 0, fontSize: '13px', color: colorBanner.text, fontWeight: 600, lineHeight: 1.5 }}>
                      {banner.texto}
                    </p>
                  </div>
                )}

                {/* Lista de cuotas vencidas por mes */}
                {(resumen?.cuotasVencidasDetalle?.length ?? 0) > 0 && (
                  <div style={{ marginBottom: '16px', border: '1px solid #fca5a5', borderRadius: '10px', overflow: 'hidden' }}>
                    <div style={{ background: '#fef2f2', padding: '8px 14px', borderBottom: '1px solid #fca5a5' }}>
                      <p style={{ margin: 0, fontSize: '12px', color: '#991b1b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Detalle de cuotas vencidas
                      </p>
                    </div>
                    {resumen!.cuotasVencidasDetalle.map((cuota) => (
                      <div
                        key={`${cuota.mes}-${cuota.anio}`}
                        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', borderBottom: '1px solid #fee2e2', background: '#fff5f5' }}
                      >
                        <span style={{ fontSize: '14px', color: '#7f1d1d', fontWeight: 600 }}>
                          {cuota.nombreMes} {cuota.anio}
                        </span>
                        <span style={{ fontSize: '14px', color: '#dc2626', fontWeight: 700 }}>
                          {formatMonto(parametros.montoBase, parametros.moneda)}
                        </span>
                      </div>
                    ))}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 14px', background: '#fef2f2' }}>
                      <span style={{ fontSize: '13px', color: '#991b1b', fontWeight: 700 }}>Total adeudado</span>
                      <span style={{ fontSize: '15px', color: '#991b1b', fontWeight: 800 }}>
                        {formatMonto(montoAdeudado, parametros.moneda)}
                      </span>
                    </div>
                  </div>
                )}

                {/* Si el mes actual está pagado y no hay vencidas → adeuda $0 */}
                {resumen?.mesActualPagado && (resumen?.vencidas ?? 0) === 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 14px', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: '10px', marginBottom: '16px' }}>
                    <span style={{ fontSize: '16px' }}>✅</span>
                    <p style={{ margin: 0, fontSize: '13px', color: '#166534', fontWeight: 600 }}>
                      Cuota de {NOMBRES_MESES[HOY.getMonth()]} pagada — adeudás $0
                    </p>
                  </div>
                )}

                {/* Valor de cuota mensual */}
                <p style={{ margin: '0 0 4px', fontSize: '12px', color: '#94a3b8' }}>Valor de cuota mensual</p>
                <p style={{ margin: '0 0 16px', fontSize: '18px', fontWeight: 700, color: '#1e293b' }}>
                  {formatMonto(parametros.montoBase, parametros.moneda)}
                </p>
              </>
            )}
          </div>

          <div className="card-footer" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <button
              onClick={handleGoToPagos}
              disabled={!socioData.active || loadingCuotas}
              style={{ opacity: socioData.active ? 1 : 0.5, cursor: socioData.active ? 'pointer' : 'not-allowed' }}
            >
              Pagar Cuota
            </button>

            {/* Enviar comprobante por WhatsApp — mismo flujo que logro de trivia */}
            <button
              onClick={handleEnviarComprobante}
              disabled={!socioData.active || loadingCuotas || enviandoWhatsApp || !resumen}
              style={{
                opacity: (socioData.active && !enviandoWhatsApp) ? 1 : 0.5,
                cursor: (socioData.active && !enviandoWhatsApp) ? 'pointer' : 'not-allowed',
                backgroundColor: '#25D366',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: 600,
              }}
            >
              {enviandoWhatsApp ? 'Generando...' : 'Enviar estado por WhatsApp'}
            </button>
          </div>
        </div>

        {/* ─── Card de Cambios ─────────────────────────────────────────────── */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-blue">
            <h1>Card de Cambios</h1>
            <img src={Logo.src} alt="Logo" className="card-avatar" />
            <p><strong>ID de Socio:</strong> {socioData._id || 'No disponible'}</p>
          </div>
          <div className="card-body">
            <button
              className="card-changes"
              onClick={handleEditClick}
              disabled={!socioData.active}
              style={{ opacity: socioData.active ? 1 : 0.5, cursor: socioData.active ? 'pointer' : 'not-allowed' }}
            >
              Editar Datos
            </button>
            <button
              className="card-changes"
              onClick={handleConfirmPasswordChange}
              disabled={!socioData.active}
              style={{ opacity: socioData.active ? 1 : 0.5, cursor: socioData.active ? 'pointer' : 'not-allowed' }}
            >
              Cambiar Contraseña
            </button>
            {isEditing && (
              <button
                className="card-changes"
                onClick={handleSaveChanges}
                disabled={!socioData.active}
                style={{ backgroundColor: socioData.active ? '#166534' : '#374151', color: '#bbf7d0', opacity: socioData.active ? 1 : 0.5, cursor: socioData.active ? 'pointer' : 'not-allowed' }}
              >
                Guardar Cambios
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
