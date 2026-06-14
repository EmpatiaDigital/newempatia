"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import "../style/BannerActividad.css";

const API_URL = "https://newempatiabackend.vercel.app/api/actividades";

interface ActividadData {
  titulo: string;
  fecha: string;
  hora: string;
  imagen?: string;
}

interface ApiResponse {
  actividades?: ActividadData[];
}

function formatearFechaCorta(fecha: string): string {
  if (!fecha) return "";
  return new Date(fecha).toLocaleDateString("es-AR", {
    day: "2-digit",
    month: "long",
  });
}

export default function BannerActividad() {
  const [actividad, setActividad] = useState<ActividadData | null>(null);
  const [visible, setVisible] = useState(false);
  const router = useRouter();

  useEffect(() => {
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

        const ahora = new Date();
        const futuras = lista.filter(
          (act) => act && act.fecha && new Date(act.fecha) > ahora
        );

        if (futuras.length === 0) return;

        futuras.sort(
          (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
        );

        const fechaMin = new Date(futuras[0].fecha).toDateString();
        const empate = futuras.filter(
          (act) => new Date(act.fecha).toDateString() === fechaMin
        );
        const elegida = empate[Math.floor(Math.random() * empate.length)];

        setActividad(elegida);
        setVisible(true);
      })
      .catch(() => {});
  }, []);

  if (!visible || !actividad) return null;

  return (
    <div className="banner-actividad" role="region" aria-label="Próxima actividad">
      <div className="banner-inner">

        {/* Fila superior solo en móvil: pill + close */}
        <div className="banner-top-row">
          <span className="banner-pill">Próximo evento</span>
          <button
            className="banner-close"
            onClick={() => setVisible(false)}
            aria-label="Cerrar notificación"
          >
            ✕
          </button>
        </div>

        {/* Pill visible solo en desktop (oculto en móvil) */}
        <span className="banner-pill banner-pill--desktop">Próximo evento</span>

        <div className="banner-content">
          <span className="banner-titulo">{actividad.titulo}</span>
          <span className="banner-fecha">
            {formatearFechaCorta(actividad.fecha)}
            {actividad.hora ? ` · ${actividad.hora} hs` : ""}
          </span>
        </div>

        <button
          className="banner-btn"
          onClick={() => router.push("/actividades")}
          aria-label={`Ver más sobre: ${actividad.titulo}`}
        >
          Ver más
        </button>

        {/* Close visible solo en desktop */}
        <button
          className="banner-close banner-close--desktop"
          onClick={() => setVisible(false)}
          aria-label="Cerrar notificación"
        >
          ✕
        </button>

      </div>
    </div>
  );
}
