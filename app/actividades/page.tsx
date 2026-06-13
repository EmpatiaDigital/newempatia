"use client";

import { useEffect, useState } from "react";
import "../style/Actividades.css";

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface Actividad {
  _id: string;
  titulo: string;
  imagen: string;
  fecha: string;
  hora: string;
  direccion: string;
  organizador: string;
  objetivo: string;
}

// ─────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────
const ACTIVIDADES_POR_PAGINA = 3;
const TELEFONO_WHATSAPP      = "543413559329";
const URL_SITIO              = "https://empatidigital.com.ar/actividades";
const API_URL                = "https://empatia-dominio-back.vercel.app/api/actividades";

// ─────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────
function formatearFecha(fechaISO: string): string {
  if (!fechaISO) return "Fecha no disponible";
  const fecha = new Date(fechaISO);
  if (isNaN(fecha.getTime())) return "Fecha inválida";
  return fecha.toLocaleDateString("es-AR", {
    day: "numeric", month: "long", year: "numeric",
  });
}

// ─────────────────────────────────────────────────
// SUBCOMPONENTE: PAGINACIÓN
// ─────────────────────────────────────────────────
interface PaginacionProps {
  paginaActual: number;
  totalPaginas: number;
  onCambiar:    (pagina: number) => void;
}

function Paginacion({ paginaActual, totalPaginas, onCambiar }: PaginacionProps) {
  if (totalPaginas <= 1) return null;
  return (
    <nav className="actividades-paginacion" aria-label="Paginación de actividades">
      <button
        className="actividades-paginacion-btn"
        onClick={() => onCambiar(paginaActual - 1)}
        disabled={paginaActual === 1}
        aria-label="Página anterior"
      >{"<"}</button>

      {Array.from({ length: totalPaginas }, (_, i) => i + 1).map((num) => (
        <button
          key={num}
          className={`actividades-paginacion-btn${paginaActual === num ? " activa" : ""}`}
          onClick={() => onCambiar(num)}
          aria-current={paginaActual === num ? "page" : undefined}
          aria-label={`Página ${num}`}
        >{num}</button>
      ))}

      <button
        className="actividades-paginacion-btn"
        onClick={() => onCambiar(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        aria-label="Página siguiente"
      >{">"}</button>
    </nav>
  );
}

// ─────────────────────────────────────────────────
// SUBCOMPONENTE: CARD PÚBLICA
// ─────────────────────────────────────────────────
interface ActividadCardPublicaProps {
  actividad: Actividad;
}

function ActividadCardPublica({ actividad }: ActividadCardPublicaProps) {
  const fechaFormateada = formatearFecha(actividad.fecha);
  const fechaISO        = actividad.fecha
    ? new Date(actividad.fecha).toISOString()
    : "";
  const [compartiendo, setCompartiendo] = useState(false);

  async function handleCompartir(): Promise<void> {
    if (compartiendo) return;
    const texto = `Este evento va a estar genial, ¿querés asistir conmigo?\n${actividad.titulo}\n${URL_SITIO}`;
    if (navigator.share) {
      setCompartiendo(true);
      try {
        await navigator.share({ title: actividad.titulo, text: texto, url: URL_SITIO });
      } catch (err: unknown) {
        if (err instanceof Error && err.name !== "AbortError") {
          console.error("Error al compartir:", err.message);
        }
      } finally {
        setCompartiendo(false);
      }
    } else {
      alert("Tu navegador no admite la función de compartir.");
    }
  }

  function handleAsistir(): void {
    const mensaje = `Me gustaría asistir a este evento: ${actividad.titulo} el día ${fechaFormateada}`;
    const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <article
      className="actividad-card"
      itemScope
      itemType="https://schema.org/Event"
    >
      {/* JSON-LD por card — indexable por crawlers */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Event",
            name: actividad.titulo,
            startDate: fechaISO,
            description: actividad.objetivo,
            organizer: {
              "@type": "Organization",
              name: actividad.organizador,
            },
            location: {
              "@type": "Place",
              name: actividad.direccion,
              address: {
                "@type": "PostalAddress",
                streetAddress: actividad.direccion,
              },
            },
            image: actividad.imagen || undefined,
            url: URL_SITIO,
          }),
        }}
      />

      {/* ── HERO: foto izquierda + título derecha ── */}
      <div className="actividad-hero">
        <div className="actividad-hero-img">
          <img
            src={actividad.imagen || "https://via.placeholder.com/300x200"}
            alt={`Imagen del evento: ${actividad.titulo}`}
            loading="lazy"
            itemProp="image"
          />
        </div>
        <div className="actividad-hero-info">
          <h2
            className="actividad-card-titulo"
            itemProp="name"
          >
            {actividad.titulo}
          </h2>
          <div
            className="actividad-fecha-badge"
            aria-label={`Fecha: ${fechaFormateada}`}
          >
            <span aria-hidden="true">📅</span>
            <time dateTime={fechaISO} itemProp="startDate">
              {fechaFormateada}
            </time>
          </div>
        </div>
      </div>

      {/* ── BODY ── */}
      <section
        className="actividad-card-body"
        aria-label="Información del evento"
      >
        {/* Hora destacada */}
        <div
          className="actividad-hora-badge"
          aria-label={`Hora del evento: ${actividad.hora || "A confirmar"}`}
        >
          <span className="actividad-hora-badge-icon" aria-hidden="true">🕐</span>
          <span className="actividad-hora-badge-label">Hora</span>
          <span className="actividad-hora-badge-valor">
            {actividad.hora || "A confirmar"}
          </span>
        </div>

        {/* Info estructurada con dl/dt/dd */}
        <dl
          className="actividad-info-rows"
          itemProp="location"
          itemScope
          itemType="https://schema.org/Place"
        >
          <div className="actividad-info-row">
            <dt className="actividad-info-label">
              <span aria-hidden="true">📍</span> Dirección
            </dt>
            <dd className="actividad-info-value" itemProp="address">
              {actividad.direccion || "No definida"}
            </dd>
          </div>

          <div className="actividad-info-row">
            <dt className="actividad-info-label">
              <span aria-hidden="true">🏢</span> Organizador
            </dt>
            <dd className="actividad-info-value" itemProp="name">
              {actividad.organizador || "No definido"}
            </dd>
          </div>

          <div className="actividad-info-row">
            <dt className="actividad-info-label">
              <span aria-hidden="true">🎯</span> Objetivo
            </dt>
            <dd className="actividad-info-value" itemProp="description">
              {actividad.objetivo || "No definido"}
            </dd>
          </div>
        </dl>
      </section>

      {/* ── ACCIONES ── */}
      <footer className="actividad-card-actions">
        <button
          className="actividad-btn actividad-btn-compartir"
          onClick={handleCompartir}
          disabled={compartiendo}
          aria-label={`Compartir evento: ${actividad.titulo}`}
        >
          {compartiendo ? "Compartiendo…" : "Compartir"}
        </button>
        <button
          className="actividad-btn actividad-btn-asistir"
          onClick={handleAsistir}
          aria-label={`Asistir al evento: ${actividad.titulo}`}
        >
          Asistir
        </button>
      </footer>
    </article>
  );
}

// ─────────────────────────────────────────────────
// COMPONENTE PRINCIPAL PÚBLICO
// ─────────────────────────────────────────────────
export default function ActividadesPublicas() {
  const [actividades, setActividades]   = useState<Actividad[]>([]);
  const [loading, setLoading]           = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);

  useEffect(() => {
    async function fetchActividades(): Promise<void> {
      try {
        const res = await fetch(API_URL);
        if (!res.ok) throw new Error(`Error ${res.status}: ${res.statusText}`);
        const data: Actividad[] = await res.json();
        setActividades(data);
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
        setActividades([]);
      } finally {
        setLoading(false);
      }
    }
    fetchActividades();
  }, []);

  function cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) {
      setPaginaActual(nuevaPagina);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }

  const totalPaginas        = Math.ceil(actividades.length / ACTIVIDADES_POR_PAGINA);
  const indiceInicial       = (paginaActual - 1) * ACTIVIDADES_POR_PAGINA;
  const actividadesActuales = actividades.slice(indiceInicial, indiceInicial + ACTIVIDADES_POR_PAGINA);

  if (loading) {
    return (
      <div className="actividades-wrapper">
        <p className="actividades-empty" aria-live="polite">
          Cargando actividades...
        </p>
      </div>
    );
  }

  return (
    <main className="actividades-wrapper">

      {/* Cabecera semántica */}
      <header className="actividades-header-row">
        <h1 className="actividades-titulo">
          <span className="actividades-titulo-eyebrow">Actividades</span>
          Actividades Programadas
          <span className="actividades-titulo-divider" aria-hidden="true" />
        </h1>
      </header>

      {actividades.length === 0 ? (
        <p className="actividades-empty" role="status">
          No hay actividades para mostrar.
        </p>
      ) : (
        <>
          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiar={cambiarPagina}
          />

          <section
            className="actividades-grid"
            aria-label={`Actividades — página ${paginaActual} de ${totalPaginas}`}
          >
            {actividadesActuales.map((act) => (
              <ActividadCardPublica
                key={act._id}
                actividad={act}
              />
            ))}
          </section>

          <Paginacion
            paginaActual={paginaActual}
            totalPaginas={totalPaginas}
            onCambiar={cambiarPagina}
          />
        </>
      )}
    </main>
  );
}
