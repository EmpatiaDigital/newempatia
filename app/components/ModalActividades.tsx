"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "../style/ModalActividades.css";

const API_URL = "https://empatia-dominio-back.vercel.app/api/actividades";
const TELEFONO_WHATSAPP = "543413559329";
const URL_SITIO         = "https://empatiadigital.com.ar/actividades";

export interface ActividadData {
  titulo: string;
  fecha: string;
  hora: string;
  imagen?: string;
}

interface ApiResponse {
  actividades?: ActividadData[];
}

export default function ModalActividades() {
  const [actividad, setActividad] = useState<ActividadData | null>(null);
  const [visible, setVisible]     = useState<boolean>(false);
  const [compartiendo, setCompartiendo] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window === "undefined") return;
    const modalDismissed = localStorage.getItem("actividadModalDismissed");

    fetch(API_URL)
      .then((res) => {
        if (!res.ok) throw new Error("Error de red");
        return res.json();
      })
      .then((data: ActividadData[] | ApiResponse) => {
        let lista: ActividadData[] = [];
        if (Array.isArray(data)) {
          lista = data;
        } else if (data && Array.isArray(data.actividades)) {
          lista = data.actividades;
        }

        // Solo actividades futuras
        const ahora = new Date();
        const futuras = lista.filter(
          (act) => act && act.fecha && new Date(act.fecha) > ahora
        );

        if (futuras.length === 0) return;

        // Ordenar por fecha ascendente → la que vence primero queda primera
        futuras.sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        // Fecha mínima (la que vence antes)
        const fechaMin = new Date(futuras[0].fecha).toDateString();

        // Todas las que comparten esa fecha mínima
        const empate = futuras.filter(
          (act) => new Date(act.fecha).toDateString() === fechaMin
        );

        // Si hay más de una con la misma fecha, elegir al azar
        const elegida = empate[Math.floor(Math.random() * empate.length)];

        setTimeout(() => {
          setActividad(elegida);
          if (!modalDismissed) setVisible(true);
        }, 50);
      })
      .catch(() => {});
  }, []);

  function formatearFecha(fecha: string): string {
    if (!fecha) return "";
    const f = new Date(fecha).toLocaleDateString("es-AR", {
      weekday: "long",
      day:     "2-digit",
      month:   "long",
      year:    "numeric",
    });
    return f.charAt(0).toUpperCase() + f.slice(1);
  }

  function cerrarModal(): void {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("actividadModalDismissed", "true");
    }
  }

  async function handleCompartir(): Promise<void> {
    if (compartiendo || !actividad) return;
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
    if (!actividad) return;
    const mensaje = `Me gustaría asistir a este evento: ${actividad.titulo} el día ${formatearFecha(actividad.fecha)}`;
    const url = `https://wa.me/${TELEFONO_WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  if (!visible || !actividad) return null;

  const fechaISO = actividad.fecha
    ? new Date(actividad.fecha).toISOString()
    : "";

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-actividad-titulo"
      onClick={(e) => { if (e.target === e.currentTarget) cerrarModal(); }}
    >
      <article className="modal-card" itemScope itemType="https://schema.org/Event">

        <button
          className="modal-close"
          onClick={cerrarModal}
          aria-label="Cerrar modal de actividad"
        >
          ✕
        </button>

        <div className="modal-hero">
          <div className="modal-card-img">
            <Image
              src={actividad.imagen || "https://via.placeholder.com/300x200"}
              alt={`Imagen del evento: ${actividad.titulo}`}
              fill
              sizes="(max-width: 600px) 100vw, 200px"
              style={{ objectFit: "cover" }}
              itemProp="image"
              priority
            />
          </div>

          <div className="modal-hero-text">
            <h1
              id="modal-actividad-titulo"
              className="modal-hero-titulo"
              itemProp="name"
            >
              {actividad.titulo}
            </h1>
            <div className="modal-hero-badge" aria-label={`Fecha: ${formatearFecha(actividad.fecha)}`}>
              <span aria-hidden="true">📅</span>
              <time dateTime={fechaISO} itemProp="startDate">
                {formatearFecha(actividad.fecha)}
              </time>
            </div>
          </div>
        </div>

        <div className="modal-body">
          <div
            className="modal-hora-badge"
            aria-label={`Hora del evento: ${actividad.hora || "A confirmar"}`}
          >
            <span className="modal-hora-icon" aria-hidden="true">🕐</span>
            <span className="modal-hora-label">Hora</span>
            <span className="modal-hora-valor" itemProp="startDate">
              {actividad.hora ? `${actividad.hora} hs` : "A confirmar"}
            </span>
          </div>

          <p className="modal-invitacion">
            ¡Te esperamos en este evento! Hacé clic en <strong>Asistir</strong> para
            avisarnos por WhatsApp o compartilo con quien quieras.
          </p>
        </div>

        <footer className="modal-card-actions">
          <button
            className="btn-compartir"
            onClick={handleCompartir}
            disabled={compartiendo}
            aria-label={`Compartir evento: ${actividad.titulo}`}
          >
            {compartiendo ? "Compartiendo…" : "Compartir"}
          </button>

          <button
            className="btn-asistir"
            onClick={handleAsistir}
            aria-label={`Asistir al evento: ${actividad.titulo}`}
          >
            Asistir
          </button>

          <button
            className="btn-ver-mas"
            onClick={() => { cerrarModal(); router.push("/actividades"); }}
            aria-label="Ver todas las actividades"
          >
            Ver más
          </button>
        </footer>

      </article>
    </div>
  );
}