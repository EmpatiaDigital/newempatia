"use client";

import { useEffect, useState } from "react";
import '../style/UserData.css';

// ── tipos ──────────────────────────────────────────────────────────────────────

interface Actividad {
  _id: string;
  visitorId: string;
  ruta?: string;
  evento: string;
  postId?: string;
  duracion?: number;
  url?: string;
  timestamp: string;
}

interface PostVisitado {
  postId: string;
  visitas: number;
  url: string;
  titulo: string;
}

interface PostPermanencia {
  postId: string;
  duracionTotal: number;
  duracionPromedio: number;
  url: string;
  titulo: string;
}

interface Balance {
  visitantesUnicos: number;
  eventosTotales: number;
  postsCompartidos: number;
  postsMasVisitados: PostVisitado[];
  postsMayorPermanencia: PostPermanencia[];
  descargasPDF: number;
  descargasLibro: number;
}

// ── helpers ────────────────────────────────────────────────────────────────────

const fmtDuracion = (seg: number): string => {
  if (seg >= 3600) return `${Math.floor(seg / 3600)}h ${Math.floor((seg % 3600) / 60)}m`;
  if (seg >= 60) return `${Math.floor(seg / 60)}m ${seg % 60}s`;
  return `${seg}s`;
};

const fetchTitulo = async (postId: string): Promise<string> => {
  try {
    const res = await fetch(`http://localhost:5000/api/posts/${postId}`);
    if (!res.ok) return postId;
    const data = await res.json();
    return (data.titulo as string) ?? postId;
  } catch {
    return postId;
  }
};

const calcularBalance = (actividades: Actividad[]) => {
  const visitantesUnicos = new Set(actividades.map((a) => a.visitorId)).size;
  const eventosTotales = actividades.length;
  const postsCompartidos = actividades.filter((a) => a.evento === "compartido").length;

  const visitasPorPost: Record<string, number> = {};
  const permanenciaPorPost: Record<string, { total: number; count: number }> = {};
  const urlPorPost: Record<string, string> = {};
  let descargasPDF = 0;
  let descargasLibro = 0;

  actividades.forEach((a) => {
    if (a.evento === "visita" && a.postId) {
      visitasPorPost[a.postId] = (visitasPorPost[a.postId] ?? 0) + 1;
      if (a.url && !urlPorPost[a.postId]) urlPorPost[a.postId] = a.url;
    }
    if (a.evento === "permanencia" && a.postId && a.duracion) {
      if (!permanenciaPorPost[a.postId]) permanenciaPorPost[a.postId] = { total: 0, count: 0 };
      permanenciaPorPost[a.postId].total += a.duracion;
      permanenciaPorPost[a.postId].count += 1;
      if (a.url && !urlPorPost[a.postId]) urlPorPost[a.postId] = a.url;
    }
    if (a.evento === "PDFguiaDescarga") descargasPDF++;
    if (a.evento === "PDFlibroDescarga") descargasLibro++;
  });

  const topVisitados = Object.entries(visitasPorPost)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([postId, visitas]) => ({
      postId,
      visitas,
      url: urlPorPost[postId] ?? `https://empatiadigital.com.ar/post/${postId}`,
    }));

  const topPermanencia = Object.entries(permanenciaPorPost)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 3)
    .map(([postId, { total, count }]) => ({
      postId,
      duracionTotal: total,
      duracionPromedio: Math.round(total / count),
      url: urlPorPost[postId] ?? `https://empatiadigital.com.ar/post/${postId}`,
    }));

  return {
    visitantesUnicos,
    eventosTotales,
    postsCompartidos,
    topVisitados,
    topPermanencia,
    descargasPDF,
    descargasLibro,
  };
};

// ── componente ─────────────────────────────────────────────────────────────────

const UserDataPage = () => {
  const [balance, setBalance] = useState<Balance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/user-actividad");
        if (!res.ok) throw new Error("Error al obtener datos");
        const actividades: Actividad[] = await res.json();
        const raw = calcularBalance(actividades);

        // fetch títulos en paralelo
        const idsUnicos = [...new Set([
          ...raw.topVisitados.map((p) => p.postId),
          ...raw.topPermanencia.map((p) => p.postId),
        ])];

        const titulosMap: Record<string, string> = {};
        await Promise.all(
          idsUnicos.map(async (id) => {
            titulosMap[id] = await fetchTitulo(id);
          })
        );

        const postsMasVisitados: PostVisitado[] = raw.topVisitados.map((p) => ({
          ...p,
          titulo: titulosMap[p.postId] ?? p.postId,
        }));

        const postsMayorPermanencia: PostPermanencia[] = raw.topPermanencia.map((p) => ({
          ...p,
          titulo: titulosMap[p.postId] ?? p.postId,
        }));

        setBalance({
          visitantesUnicos: raw.visitantesUnicos,
          eventosTotales: raw.eventosTotales,
          postsCompartidos: raw.postsCompartidos,
          postsMasVisitados,
          postsMayorPermanencia,
          descargasPDF: raw.descargasPDF,
          descargasLibro: raw.descargasLibro,
        });
      } catch {
        setError("No se pudieron cargar los datos.");
      } finally {
        setLoading(false);
      }
    };

    void fetchData();
  }, []);

  if (loading) return <div className="user-data-container"><p className="loading">Cargando datos…</p></div>;
  if (error) return <div className="user-data-container"><p className="ud-error">{error}</p></div>;
  if (!balance) return null;

  return (
    <div className="user-data-container">
      <h2>Resumen de Actividad</h2>

      <div className="ud-stats-grid">
        <div className="ud-stat-card">
          <span className="ud-stat-value">{balance.visitantesUnicos}</span>
          <span className="ud-stat-label">Visitantes únicos</span>
        </div>
        <div className="ud-stat-card">
          <span className="ud-stat-value">{balance.eventosTotales}</span>
          <span className="ud-stat-label">Eventos totales</span>
        </div>
        <div className="ud-stat-card">
          <span className="ud-stat-value">{balance.postsCompartidos}</span>
          <span className="ud-stat-label">Compartidos</span>
        </div>
      </div>

      <h3>Posts más visitados</h3>
      <ul>
        {balance.postsMasVisitados.length > 0 ? (
          balance.postsMasVisitados.map(({ postId, visitas, url, titulo }, i) => (
            <li key={postId} className="ud-item ud-item--green" style={{ ["--delay" as string]: `${i * 0.08}s` }}>
              <span className="ud-rank">#{i + 1}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="ud-link ud-link--green">
                {titulo}
              </a>
              <span className="ud-badge ud-badge--green">{visitas} visitas</span>
            </li>
          ))
        ) : (
          <li className="ud-empty">No hay datos de visitas aún</li>
        )}
      </ul>

      <h3>Mayor permanencia</h3>
      <ul>
        {balance.postsMayorPermanencia.length > 0 ? (
          balance.postsMayorPermanencia.map(({ postId, duracionPromedio, duracionTotal, url, titulo }, i) => (
            <li key={postId} className="ud-item ud-item--red" style={{ ["--delay" as string]: `${i * 0.08}s` }}>
              <span className="ud-rank">#{i + 1}</span>
              <a href={url} target="_blank" rel="noopener noreferrer" className="ud-link ud-link--red">
                {titulo}
              </a>
              <span className="ud-badge ud-badge--red">
                ⌀ {fmtDuracion(duracionPromedio)}
                <small> / total {fmtDuracion(duracionTotal)}</small>
              </span>
            </li>
          ))
        ) : (
          <li className="ud-empty">No hay datos de permanencia aún</li>
        )}
      </ul>

      <h3>Descargas</h3>
      <ul>
        <li className="ud-item ud-item--purple" style={{ ["--delay" as string]: "0s" }}>
          <span className="ud-icon">📄</span>
          <span className="ud-desc">PDF Guía descargado</span>
          <span className="ud-badge ud-badge--purple">{balance.descargasPDF}</span>
        </li>
        <li className="ud-item ud-item--blue" style={{ ["--delay" as string]: "0.08s" }}>
          <span className="ud-icon">📘</span>
          <span className="ud-desc">Libro clickeado</span>
          <span className="ud-badge ud-badge--blue">{balance.descargasLibro}</span>
        </li>
      </ul>
    </div>
  );
};

export default UserDataPage;