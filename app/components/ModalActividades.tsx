"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import "../style/ModalActividades.css";

const API_URL = "http://localhost:5000/api/actividades";

// ── 1. INTERFAZ DE TIPADO PARA LA ACTIVIDAD ──
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
  // ── 2. BLINDAJE DEL ESTADO ──
  const [actividad, setActividad] = useState<ActividadData | null>(null);
  const [visible, setVisible] = useState<boolean>(false);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const modalDismissed = localStorage.getItem("actividadModalDismissed");

      fetch(API_URL)
        .then((res) => {
          if (!res.ok) throw new Error("Error de red");
          return res.json();
        })
        .then((data: ActividadData[] | ApiResponse) => {
          // Normalizamos la lista asegurando el tipo
          let lista: ActividadData[] = [];
          if (Array.isArray(data)) {
            lista = data;
          } else if (data && Array.isArray(data.actividades)) {
            lista = data.actividades;
          }
          
          // Filtramos las actividades futuras
          const futuras = lista.filter((act) => act && act.fecha && new Date(act.fecha) > new Date());
          
          if (futuras.length > 0) {
            const ultima = futuras[futuras.length - 1];
            
            // ── FIX DE HIDRATACIÓN PARA PRODUCCIÓN ──
            // Retrasamos levemente el renderizado del modal para dejar que la página principal 
            // se asiente en el navegador y no rompa la sincronización del árbol de componentes.
            setTimeout(() => {
              setActividad(ultima);
              if (!modalDismissed) {
                setVisible(true);
              }
            }, 50);
          }
        })
        .catch((_) => {
          // Silencio controlado ante caídas de la API de actividades
        });
    }
  }, []);

  const formatearFecha = (fecha: string): string => {
    if (!fecha) return "";
    const fechaFormateada = new Date(fecha).toLocaleDateString("es-AR", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
    return fechaFormateada.charAt(0).toUpperCase() + fechaFormateada.slice(1);
  };

  const cerrarModal = (): void => {
    setVisible(false);
    if (typeof window !== "undefined") {
      localStorage.setItem("actividadModalDismissed", "true");
    }
  };

  if (!visible || !actividad) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-card">
        <div className="modal-titulo">
          <h1>{actividad.titulo}</h1>
        </div>
        <button className="modal-close" onClick={cerrarModal} aria-label="Cerrar modal">
          ✕
        </button>

        <div className="title-content">
          <h2>Acercate el {formatearFecha(actividad.fecha)}</h2>
          <h3>{actividad.hora} hs</h3>
        </div>
        
        <div className="modal-card-actions">
          <button
            className="btn-ver-mas"
            onClick={() => {
              cerrarModal();
              router.push("/actividades");
            }}
          >
            Ver más
          </button>
        </div>
        
        <div className="modal-card-img" style={{ position: "relative", width: "100%", height: "200px", marginTop: "15px", overflow: "hidden", borderRadius: "8px" }}>
          <Image
            src={actividad.imagen || "https://via.placeholder.com/300x200"}
            alt={actividad.titulo || "Imagen de la actividad"}
            fill
            sizes="(max-width: 768px) 100vw, 300px"
            style={{ objectFit: "cover" }}
          />
        </div>
      </div>
    </div>
  );
}
