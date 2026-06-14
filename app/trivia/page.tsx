'use client';

import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import html2canvas from 'html2canvas';
import preguntasData from '../data/preguntas.json';
import '../style/TestJuego.css';

const PREGUNTAS_POR_JUEGO = 5;
const PUNTOS_POR_CORRECTA = 20;
const API = 'https://newempatiabackend.vercel.app/api';
const STORAGE_KEY = 'empatia_trivia_vistas';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface PreguntaRaw {
  pregunta: string;
  opciones: string[];
  respuestaCorrecta: number;
  feedback: string;
}

interface Pregunta extends PreguntaRaw {
  _originalIndex: number;
}

interface HistorialItem {
  pregunta: string;
  correcta: boolean;
  seleccionada: number;
  correctaIndex: number;
}

interface JugadorTop3 {
  nombre: string;
  mejorPuntaje: number;
  rango: string;
  tiempoSegundos?: number;
}

interface JugadorRanking {
  nombre: string;
  mejorPuntaje: number;
  mejorRango: string;
  totalPartidas: number;
  tiempoSegundos?: number;
}

interface ConfigRango {
  id: string;
  texto: string;
  clase: string;
  color: string;
  subtitulo: string;
}

type Pantalla = 'inicio' | 'juego' | 'resultados';

const rangoColores: Record<string, string> = {
  PRO: '#059669',
  MEDIUM: '#2563eb',
  APRENDIZ: '#d97706',
};

// ─── Fingerprint ──────────────────────────────────────────────────────────────

const getVisitorId = (): string => {
  const token = localStorage.getItem('token');
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split('.')[1])) as { userId?: string };
      if (payload.userId) return `user_${payload.userId}`;
    } catch {}
  }
  let fp = localStorage.getItem('empatia_fp');
  if (!fp) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('fingerprint_empatia', 2, 2);
    }
    const raw = [
      navigator.userAgent,
      navigator.language,
      `${window.screen.width}x${window.screen.height}`,
      new Date().getTimezoneOffset(),
      canvas.toDataURL().slice(-50),
    ].join('|');
    let hash = 0;
    for (let i = 0; i < raw.length; i++) hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
    fp = `anon_${Math.abs(hash)}_${Date.now()}`;
    localStorage.setItem('empatia_fp', fp);
  }
  return fp;
};

// ─── Aleatorizar opciones ────────────────────────────────────────────────────

const aleatorizar = (pregunta: PreguntaRaw & { _originalIndex: number }): Pregunta => {
  const opcionesConIndice = pregunta.opciones.map((texto, i) => ({
    texto,
    esCorrecta: i === pregunta.respuestaCorrecta,
  }));
  for (let i = opcionesConIndice.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [opcionesConIndice[i], opcionesConIndice[j]] = [opcionesConIndice[j], opcionesConIndice[i]];
  }
  const nuevaCorrecta = opcionesConIndice.findIndex((o) => o.esCorrecta);
  return {
    ...pregunta,
    opciones: opcionesConIndice.map((o) => o.texto),
    respuestaCorrecta: nuevaCorrecta,
  };
};

// ─── Selección sin repetición — solo se llama en el cliente ──────────────────

const seleccionarPreguntas = (): Pregunta[] => {
  const data = preguntasData as PreguntaRaw[];
  if (!data || data.length === 0) return [];

  let vistas: number[] = [];
  try { vistas = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as number[]; } catch { vistas = []; }

  const disponibles = data.filter((_, i) => !vistas.includes(i));
  const pool = disponibles.length >= PREGUNTAS_POR_JUEGO ? disponibles : data;
  if (disponibles.length < PREGUNTAS_POR_JUEGO) {
    localStorage.setItem(STORAGE_KEY, '[]');
  }

  const seleccionadas: Pregunta[] = [...pool]
    .map((p) => ({ ...p, _originalIndex: data.indexOf(p) }))
    .sort(() => Math.random() - 0.5)
    .slice(0, PREGUNTAS_POR_JUEGO)
    .map(aleatorizar);

  const nuevasVistas = [...new Set([
    ...(disponibles.length >= PREGUNTAS_POR_JUEGO ? vistas : []),
    ...seleccionadas.map((p) => p._originalIndex),
  ])];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nuevasVistas));

  return seleccionadas;
};

const formatTiempo = (seg: number | null): string => {
  if (seg === null || seg === undefined) return '—';
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
};

// ─── Componente principal ─────────────────────────────────────────────────────

export default function TestJuego() {
  const router      = useRouter();
  const insigniaRef = useRef<HTMLDivElement>(null);

  // Se inicializa vacío y se rellena en useEffect (solo cliente)
  const [preguntasSeleccionadas, setPreguntasSeleccionadas] = useState<Pregunta[]>([]);
  const [listo, setListo] = useState<boolean>(false);

  const [pantalla, setPantalla]                      = useState<Pantalla>('inicio');
  const [preguntaActual, setPreguntaActual]           = useState<number>(0);
  const [opcionSeleccionada, setOpcionSeleccionada]   = useState<number | null>(null);
  const [respondido, setRespondido]                   = useState<boolean>(false);
  const [respuestasCorrectas, setRespuestasCorrectas] = useState<number>(0);
  const [historial, setHistorial]                     = useState<HistorialItem[]>([]);
  const [capturando, setCapturando]                   = useState<boolean>(false);
  const [guardando, setGuardando]                     = useState<boolean>(false);
  const [partidaGuardada, setPartidaGuardada]         = useState<boolean>(false);
  const [top3, setTop3]                               = useState<JugadorTop3[]>([]);
  const [cargandoTop3, setCargandoTop3]               = useState<boolean>(true);
  const [ranking, setRanking]                         = useState<JugadorRanking[]>([]);
  const [cargandoRanking, setCargandoRanking]         = useState<boolean>(false);
  const [mostrarRanking, setMostrarRanking]           = useState<boolean>(false);
  const [nombreInput, setNombreInput]                 = useState<string>('');
  const [inscripto, setInscripto]                     = useState<boolean>(false);
  const [guardandoNombre, setGuardandoNombre]         = useState<boolean>(false);
  const [errorNombre, setErrorNombre]                 = useState<string>('');
  const [tiempoInicio, setTiempoInicio]               = useState<number | null>(null);
  const [tiempoFinal, setTiempoFinal]                 = useState<number | null>(null);

  // ─── Inicializar preguntas solo en el cliente ─────────────────────────────
  useEffect(() => {
    setPreguntasSeleccionadas(seleccionarPreguntas());
    setListo(true);
  }, []);

  const totalPreguntas = preguntasSeleccionadas.length;
  const itemActivo     = preguntasSeleccionadas[preguntaActual] ?? null;
  const puntajeFinal   = respuestasCorrectas * PUNTOS_POR_CORRECTA;
  const puntajeMaximo  = totalPreguntas * PUNTOS_POR_CORRECTA;
  const porcentaje     = puntajeMaximo > 0 ? Math.round((puntajeFinal / puntajeMaximo) * 100) : 0;

  const configRango = useMemo<ConfigRango>(() => {
    if (porcentaje >= 80) return { id: 'PRO',      texto: 'CIUDADANO DIGITAL PRO',  clase: 'tj-rango-pro',      color: '#059669', subtitulo: 'Dominio excepcional de seguridad y convivencia' };
    if (porcentaje >= 40) return { id: 'MEDIUM',   texto: 'NIVEL DIGITAL MEDIUM',   clase: 'tj-rango-medium',   color: '#2563eb', subtitulo: 'Criterio sólido con herramientas de protección' };
    return                       { id: 'APRENDIZ', texto: 'NIVEL APRENDIZ DIGITAL', clase: 'tj-rango-aprendiz', color: '#d97706', subtitulo: 'Explorando las bases del bienestar web' };
  }, [porcentaje]);

  // ─── Cargar top 3 al montar ───────────────────────────────────────────────
  useEffect(() => {
    const fetchTop3 = async (): Promise<void> => {
      try {
        const res  = await fetch(`${API}/trivia/top3`);
        const data = await res.json() as JugadorTop3[];
        setTop3(Array.isArray(data) ? data : []);
      } catch {
        setTop3([]);
      }
      setCargandoTop3(false);
    };
    fetchTop3();
  }, []);

  // ─── Guardar partida al llegar a resultados ───────────────────────────────
  useEffect(() => {
    if (pantalla !== 'resultados' || partidaGuardada) return;

    const tiempoSegundos = tiempoInicio
      ? Math.round((Date.now() - tiempoInicio) / 1000)
      : null;
    setTiempoFinal(tiempoSegundos);

    const guardarPartida = async (): Promise<void> => {
      setGuardando(true);
      try {
        const token = localStorage.getItem('token');
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        await fetch(`${API}/trivia/partida`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            visitorId: getVisitorId(),
            preguntasJugadas: preguntasSeleccionadas.map((p) => p._originalIndex),
            puntaje: puntajeFinal,
            puntajeMaximo,
            porcentaje,
            respuestasCorrectas,
            totalPreguntas,
            rango: configRango.id,
            tiempoSegundos,
          }),
        });
        setPartidaGuardada(true);
      } catch (err) {
        console.error('Error guardando partida:', err);
      } finally {
        setGuardando(false);
      }
    };

    guardarPartida();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pantalla]);

  // ─── Inscribir nombre al ranking ─────────────────────────────────────────
  const handleInscribir = async (): Promise<void> => {
    const nombre = nombreInput.trim();
    if (!nombre || nombre.length < 2) {
      setErrorNombre('Ingresá al menos 2 caracteres.');
      return;
    }
    setErrorNombre('');
    setGuardandoNombre(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      await fetch(`${API}/trivia/partida`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          visitorId: getVisitorId(),
          preguntasJugadas: preguntasSeleccionadas.map((p) => p._originalIndex),
          puntaje: puntajeFinal,
          puntajeMaximo,
          porcentaje,
          respuestasCorrectas,
          totalPreguntas,
          rango: configRango.id,
          tiempoSegundos: tiempoFinal,
          nombre,
        }),
      });
      setInscripto(true);
      const res  = await fetch(`${API}/trivia/top3`);
      const data = await res.json() as JugadorTop3[];
      setTop3(Array.isArray(data) ? data : []);
    } catch {
      setErrorNombre('No se pudo guardar. Intentá de nuevo.');
    } finally {
      setGuardandoNombre(false);
    }
  };

  // ─── Ranking completo ────────────────────────────────────────────────────
  const handleVerRanking = async (): Promise<void> => {
    setMostrarRanking(true);
    if (ranking.length > 0) return;
    setCargandoRanking(true);
    try {
      const res  = await fetch(`${API}/trivia/ranking`);
      const data = await res.json() as JugadorRanking[];
      setRanking(Array.isArray(data) ? data : []);
    } catch {
      setRanking([]);
    }
    setCargandoRanking(false);
  };

  const handleIniciar = (): void => {
    setTiempoInicio(Date.now());
    setPantalla('juego');
  };

  const handleSeleccionarOpcion = (index: number): void => {
    if (respondido) return;
    setOpcionSeleccionada(index);
  };

  const handleValidarRespuesta = (): void => {
    if (opcionSeleccionada === null || !itemActivo) return;
    const esCorrecta = opcionSeleccionada === itemActivo.respuestaCorrecta;
    if (esCorrecta) setRespuestasCorrectas((prev) => prev + 1);
    setHistorial((prev) => [
      ...prev,
      {
        pregunta:      itemActivo.pregunta,
        correcta:      esCorrecta,
        seleccionada:  opcionSeleccionada,
        correctaIndex: itemActivo.respuestaCorrecta,
      },
    ]);
    setRespondido(true);
  };

  const handleSiguientePregunta = (): void => {
    setOpcionSeleccionada(null);
    setRespondido(false);
    if (preguntaActual + 1 < totalPreguntas) {
      setPreguntaActual((prev) => prev + 1);
    } else {
      setPantalla('resultados');
    }
  };

  const handleReiniciar = (): void => {
    setPreguntaActual(0);
    setOpcionSeleccionada(null);
    setRespondido(false);
    setRespuestasCorrectas(0);
    setHistorial([]);
    setPartidaGuardada(false);
    setMostrarRanking(false);
    setInscripto(false);
    setNombreInput('');
    setErrorNombre('');
    setTiempoInicio(null);
    setTiempoFinal(null);
    setPreguntasSeleccionadas(seleccionarPreguntas());
    setPantalla('inicio');
  };

  const handleCompartir = async (): Promise<void> => {
    if (!insigniaRef.current || capturando) return;
    setCapturando(true);
    try {
      const canvas = await html2canvas(insigniaRef.current, {
        scale: 2, useCORS: true, backgroundColor: '#ffffff',
        logging: false, allowTaint: true, foreignObjectRendering: false,
      });
      const urlJuego = `${window.location.origin}/trivia`;
      const texto = `Mira la insignia que obtuve en el Desafío Empatía Digital\nIntentalo en: ${urlJuego}`;
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
      if (!blob) return;
      const file = new File([blob], 'mi-insignia-empatia.png', { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: texto });
      } else {
        const link = document.createElement('a');
        link.download = 'mi-insignia-empatia.png';
        link.href = canvas.toDataURL('image/png');
        link.click();
        await new Promise<void>((resolve) => setTimeout(resolve, 400));
        window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(texto)}`, '_blank');
      }
    } catch (err) {
      if (err instanceof Error && err.name !== 'AbortError') {
        console.error('Error al compartir:', err);
      }
    } finally {
      setCapturando(false);
    }
  };

  const getFeedbackFinal = (): string => {
    if (porcentaje === 100) return 'Resultado perfecto. Demostrás un dominio excepcional sobre seguridad y bienestar digital.';
    if (porcentaje >= 80)  return 'Excelente nivel de conocimiento. Tenés criterios sólidos para proteger y acompañar a tu comunidad.';
    if (porcentaje >= 60)  return 'Buen desempeño. Conocés los conceptos clave; seguir explorando estos temas te dará aún más herramientas.';
    if (porcentaje >= 40)  return 'Vas por buen camino. Te invitamos a revisar nuestros recursos gratuitos para reforzar lo aprendido.';
    return 'Este es un buen punto de partida. Descubrí nuestras guías y talleres para seguir creciendo en este tema.';
  };

  // ─── Componente Top 3 ────────────────────────────────────────────────────
  const Top3Widget = ({ compact = false }: { compact?: boolean }) => (
    <div className={`tj-top3 ${compact ? 'tj-top3-compact' : ''}`}>
      <div className="tj-top3-header">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15">
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
        <span>Top 3 global</span>
      </div>
      {cargandoTop3 ? (
        <p className="tj-top3-empty">Cargando...</p>
      ) : top3.length === 0 ? (
        <p className="tj-top3-empty">Todavía no hay jugadores. ¡Sé el primero!</p>
      ) : (
        top3.map((j, i) => (
          <div key={i} className="tj-top3-row">
            <span className="tj-top3-pos">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
            <span className="tj-top3-nombre">{j.nombre}</span>
            <span className="tj-top3-pts" style={{ color: rangoColores[j.rango] ?? '#1e3a5f' }}>{j.mejorPuntaje} pts</span>
            {j.tiempoSegundos !== undefined && (
              <span className="tj-top3-tiempo">{formatTiempo(j.tiempoSegundos)}</span>
            )}
          </div>
        ))
      )}
    </div>
  );

  // ─── Loading hasta que el cliente esté listo ──────────────────────────────
  if (!listo) {
    return (
      <div className="tj-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '300px', color: '#64748b', fontSize: '0.95rem' }}>
        Cargando desafío...
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="tj-container">

      {/* ── PANTALLA INICIO ────────────────────────────────────────────────── */}
      {pantalla === 'inicio' && (
        <div className="tj-inicio">
          <div className="tj-inicio-header">
            <svg className="tj-inicio-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            <span className="tj-inicio-eyebrow">Trivia interactiva</span>
          </div>
          <h2 className="tj-inicio-titulo">Desafío Empatía Digital</h2>
          <p className="tj-inicio-descripcion">
            Poné a prueba tus conocimientos sobre seguridad, bienestar y convivencia en entornos digitales. Cinco preguntas, respuestas inmediatas y explicaciones detalladas.
          </p>
          <div className="tj-inicio-chips">
            <div className="tj-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {PREGUNTAS_POR_JUEGO} preguntas sin repetir
            </div>
            <div className="tj-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              El tiempo cuenta para el ranking
            </div>
            <div className="tj-chip">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="15" height="15">
                <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
              </svg>
              {PUNTOS_POR_CORRECTA} pts por acierto
            </div>
          </div>

          <Top3Widget />

          <button onClick={handleIniciar} className="tj-btn-iniciar">
            <span>Comenzar desafío</span>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="17" height="17">
              <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
            </svg>
          </button>
          <p className="tj-inicio-aviso">
            Las preguntas rotan automáticamente — no verás las mismas dos veces seguidas.
          </p>
        </div>
      )}

      {/* ── PANTALLA JUEGO ─────────────────────────────────────────────────── */}
      {pantalla === 'juego' && itemActivo && (
        <>
          <div className="tj-header">
            <div className="tj-header-title-wrap">
              <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: '20px', height: '20px' }}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              <h3>Desafío Empatía Digital</h3>
            </div>
            <span className="tj-counter">{preguntaActual + 1} / {totalPreguntas}</span>
          </div>

          <div className="tj-progreso-barra-wrap">
            <div className="tj-progreso-barra-fill" style={{ width: `${((preguntaActual + (respondido ? 1 : 0)) / totalPreguntas) * 100}%` }} />
          </div>

          <div className="tj-body">
            <div className="tj-pregunta-numero">Pregunta {preguntaActual + 1}</div>
            <h4 className="tj-pregunta">{itemActivo.pregunta}</h4>

            <div className="tj-opciones-list">
              {itemActivo.opciones.map((opcion, index) => {
                let claseDinamica = '';
                if (opcionSeleccionada === index && !respondido) claseDinamica = 'tj-selected';
                if (respondido) {
                  if (index === itemActivo.respuestaCorrecta) claseDinamica = 'tj-correcta';
                  else if (opcionSeleccionada === index) claseDinamica = 'tj-incorrecta';
                  else claseDinamica = 'tj-opaca';
                }
                return (
                  <button
                    key={index}
                    disabled={respondido}
                    onClick={() => handleSeleccionarOpcion(index)}
                    className={`tj-opcion-btn ${claseDinamica}`}
                  >
                    <span className="tj-opcion-letra">{String.fromCharCode(65 + index)}</span>
                    <span className="tj-opcion-texto">{opcion}</span>
                    {respondido && index === itemActivo.respuestaCorrecta && (
                      <svg className="tj-icon-estado" fill="none" viewBox="0 0 24 24" stroke="#059669" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    )}
                    {respondido && opcionSeleccionada === index && index !== itemActivo.respuestaCorrecta && (
                      <svg className="tj-icon-estado" fill="none" viewBox="0 0 24 24" stroke="#dc2626" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    )}
                  </button>
                );
              })}
            </div>

            {respondido && (
              <div className={`tj-feedback-box ${opcionSeleccionada === itemActivo.respuestaCorrecta ? 'tj-feedback-ok' : 'tj-feedback-error'}`}>
                <div className="tj-feedback-label">
                  {opcionSeleccionada === itemActivo.respuestaCorrecta ? 'Correcto' : 'Incorrecto'}
                </div>
                <p>{itemActivo.feedback}</p>
              </div>
            )}

            <div className="tj-footer-actions">
              {!respondido ? (
                <button
                  disabled={opcionSeleccionada === null}
                  onClick={handleValidarRespuesta}
                  className="tj-btn-primary tj-comprobar"
                >
                  Comprobar respuesta
                </button>
              ) : (
                <button onClick={handleSiguientePregunta} className="tj-btn-primary tj-siguiente">
                  <span>{preguntaActual + 1 === totalPreguntas ? 'Ver resultados' : 'Siguiente'}</span>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width="16" height="16">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── PANTALLA RESULTADOS ────────────────────────────────────────────── */}
      {pantalla === 'resultados' && (
        <div className="tj-resultados">
          <div className="tj-res-header">
            <div className="tj-header">
              <div className="tj-header-title-wrap">
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} style={{ width: '20px', height: '20px' }}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <h3>Desafío Empatía Digital</h3>
              </div>
              {guardando && <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.6)' }}>Guardando...</span>}
            </div>
          </div>

          <div className="tj-res-body">

            <div ref={insigniaRef} style={{ backgroundColor: '#ffffff', padding: '8px', borderRadius: '16px', width: '100%' }}>
              <div
                className={`tj-insignia-card ${configRango.clase}`}
                style={{
                  background: configRango.id === 'PRO'
                    ? 'linear-gradient(to right, #f0fdf4, #f8fafc)'
                    : configRango.id === 'MEDIUM'
                    ? 'linear-gradient(to right, #eff6ff, #f8fafc)'
                    : 'linear-gradient(to right, #fffbeb, #f8fafc)',
                  border: `2px solid ${configRango.color}`,
                  borderRadius: '16px', padding: '20px', marginBottom: '24px',
                  boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                  <div style={{ position: 'relative', width: '70px', height: '70px', flexShrink: 0 }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: '12px', padding: '14px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke={configRango.color} strokeWidth={2} style={{ width: '100%', height: '100%' }}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                      </svg>
                    </div>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', letterSpacing: '0.05em' }}>INSIGNIA OTORGADA</span>
                    <span style={{ fontSize: '1.15rem', fontWeight: 800, color: configRango.color, margin: '2px 0' }}>{configRango.texto}</span>
                    <span style={{ fontSize: '0.85rem', color: '#475569' }}>{configRango.subtitulo}</span>
                  </div>
                </div>
              </div>

              <h4 style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.75rem', fontWeight: 700, color: '#0f172a', margin: '0 0 1rem 0', textAlign: 'center' }}>
                Resultados del Desafío
              </h4>

              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', gap: '0.4rem', marginBottom: '1rem' }}>
                <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '3.25rem', fontWeight: 700, color: '#1e3a5f', lineHeight: 1 }}>{puntajeFinal}</span>
                <span style={{ fontSize: '1.1rem', color: '#94a3b8', fontWeight: 600 }}>/ {puntajeMaximo} puntos</span>
              </div>

              <div style={{ width: '100%', maxWidth: '360px', height: '10px', backgroundColor: '#e2e8f0', borderRadius: '50px', overflow: 'hidden', margin: '0 auto 1.5rem auto' }}>
                <div style={{ height: '100%', width: `${porcentaje}%`, background: 'linear-gradient(90deg, #4a90d9, #1e3a5f)', borderRadius: '50px' }} />
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1.5rem', padding: '1rem 1.5rem', backgroundColor: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', width: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', fontWeight: 700, color: '#059669', lineHeight: 1.2 }}>{respuestasCorrectas}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>correctas</span>
                </div>
                <div style={{ width: '1px', height: '38px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', fontWeight: 700, color: '#dc2626', lineHeight: 1.2 }}>{totalPreguntas - respuestasCorrectas}</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>incorrectas</span>
                </div>
                <div style={{ width: '1px', height: '38px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                  <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.65rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{porcentaje}%</span>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>aciertos</span>
                </div>
                {tiempoFinal !== null && (
                  <>
                    <div style={{ width: '1px', height: '38px', backgroundColor: '#e2e8f0', flexShrink: 0 }} />
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flex: 1 }}>
                      <span style={{ fontFamily: "'Playfair Display', serif", fontSize: '1.35rem', fontWeight: 700, color: '#0f172a', lineHeight: 1.2 }}>{formatTiempo(tiempoFinal)}</span>
                      <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em' }}>tiempo</span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <button onClick={handleCompartir} disabled={capturando} className="tj-btn-compartir-wa">
              <svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18">
                <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.176.001 6.165 1.24 8.407 3.485 2.242 2.246 3.476 5.237 3.475 8.417-.004 6.598-5.342 11.946-11.893 11.946-1.999-.001-3.965-.51-5.708-1.479L0 24zm6.59-4.846c1.62.962 3.376 1.47 5.291 1.47 5.274 0 9.563-4.307 9.566-9.607.002-2.569-1.002-4.985-2.827-6.812C16.8 2.376 14.39 1.373 11.83 1.373c-5.278 0-9.567 4.31-9.57 9.61-.001 1.925.499 3.805 1.447 5.463L2.73 21.08l4.814-1.26c-.46-.24-.46-.24 0 0z" />
              </svg>
              <span>{capturando ? 'Generando imagen...' : 'Compartir logro en WhatsApp'}</span>
            </button>

            <Top3Widget compact />

            {!inscripto ? (
              <div className="tj-inscripcion-box">
                <div className="tj-inscripcion-header">
                  <svg viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth={2} width="18" height="18" style={{ flexShrink: 0 }}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <span>¿Querés aparecer en el ranking?</span>
                </div>
                <p className="tj-inscripcion-desc">
                  Dejá tu nombre y tu puntaje quedará guardado. Sin registro, sin contraseña.
                </p>
                <div className="tj-inscripcion-form">
                  <input
                    type="text"
                    placeholder="Tu nombre o apodo"
                    value={nombreInput}
                    onChange={(e) => setNombreInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleInscribir(); }}
                    maxLength={40}
                    className="tj-inscripcion-input"
                  />
                  <button
                    onClick={handleInscribir}
                    disabled={guardandoNombre || !nombreInput.trim()}
                    className="tj-inscripcion-btn"
                  >
                    {guardandoNombre ? 'Guardando...' : 'Guardar'}
                  </button>
                </div>
                {errorNombre && <p className="tj-inscripcion-error">{errorNombre}</p>}
              </div>
            ) : (
              <div className="tj-inscripcion-ok">
                <svg viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth={2.5} width="20" height="20">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span>¡Listo! Tu puntaje aparece en el ranking como <strong>{nombreInput.trim()}</strong>.</span>
              </div>
            )}

            <div style={{ width: '100%', marginTop: '0.75rem' }}>
              <button onClick={handleVerRanking} className="tj-btn-ver-ranking">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width="16" height="16">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
                {mostrarRanking ? 'Ocultar ranking completo' : 'Ver ranking completo (top 10)'}
              </button>

              {mostrarRanking && (
                <div style={{ marginTop: '0.75rem', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                  <div style={{ padding: '0.85rem 1rem', backgroundColor: '#0f172a', color: '#fff' }}>
                    <p style={{ margin: 0, fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>Top 10 — Mejores puntajes</p>
                  </div>
                  {cargandoRanking ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Cargando ranking...</div>
                  ) : ranking.length === 0 ? (
                    <div style={{ padding: '1.5rem', textAlign: 'center', color: '#94a3b8', fontSize: '0.9rem' }}>Todavía no hay jugadores en el ranking.</div>
                  ) : (
                    ranking.map((jugador, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.85rem 1rem', borderBottom: i < ranking.length - 1 ? '1px solid #f1f5f9' : 'none', backgroundColor: i === 0 ? '#fefce8' : '#fff' }}>
                        <span style={{ fontSize: i === 0 ? '1.25rem' : '0.9rem', fontWeight: 700, color: i === 0 ? '#d97706' : i === 1 ? '#94a3b8' : i === 2 ? '#b45309' : '#cbd5e1', minWidth: '24px', textAlign: 'center' }}>
                          {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
                        </span>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ margin: 0, fontSize: '0.92rem', fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{jugador.nombre}</p>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8' }}>
                            {jugador.totalPartidas} {jugador.totalPartidas === 1 ? 'partida' : 'partidas'}
                            {jugador.tiempoSegundos !== undefined ? ` · ${formatTiempo(jugador.tiempoSegundos)}` : ''}
                          </p>
                        </div>
                        <div style={{ textAlign: 'right', flexShrink: 0 }}>
                          <p style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: rangoColores[jugador.mejorRango] ?? '#1e3a5f' }}>{jugador.mejorPuntaje} pts</p>
                          <p style={{ margin: 0, fontSize: '0.7rem', color: rangoColores[jugador.mejorRango] ?? '#94a3b8', fontWeight: 600 }}>{jugador.mejorRango}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="tj-res-feedback" style={{ marginTop: '1.25rem' }}>
              <p>Gracias por participar y por tu interés en aprender sobre estos temas. Más allá del resultado, informarse y reflexionar es el primer paso para construir entornos digitales más humanos.</p>
              <p className="tj-res-feedback-personalizado">{getFeedbackFinal()}</p>
            </div>

            <div className="tj-res-historial">
              <p className="tj-historial-titulo">Resumen de respuestas</p>
              {historial.map((item, i) => (
                <div key={i} className={`tj-historial-item ${item.correcta ? 'tj-hist-ok' : 'tj-hist-mal'}`}>
                  <div className={`tj-hist-dot ${item.correcta ? 'tj-dot-ok' : 'tj-dot-mal'}`} />
                  <span className="tj-hist-texto">{item.pregunta}</span>
                </div>
              ))}
            </div>

            <div className="tj-res-acciones">
              <button onClick={() => router.push('/descargas')} className="tj-btn-accion tj-btn-accion-primary">Descargar guías y recursos gratuitos</button>
              <button onClick={() => router.push('/inscription')} className="tj-btn-accion tj-btn-accion-dark">Inscribirse a los próximos talleres</button>
              <button onClick={handleReiniciar} className="tj-btn-accion tj-btn-accion-ghost">Volver a jugar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
