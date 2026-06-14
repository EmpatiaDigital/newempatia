"use client";

import React, { useEffect, useState } from "react";
// Ruta relativa clásica
import "../style/PostStatsMini.css";

const API = "https://newempatiabackend.vercel.app/api";

// ── 1. DEFINICIÓN DE INTERFACES (Soluciona la inferencia a 'never') ──
export interface PostStatsMiniData {
  vistas: number;
  likes: number;
}

export interface PostStatsMiniProps {
  postId: string;
}

export default function PostStatsMini({ postId }: PostStatsMiniProps) {
  // ── 2. TIPADO DEL ESTADO: Permitimos la estructura de datos o null ──
  const [stats, setStats] = useState<PostStatsMiniData | null>(null);

  useEffect(() => {
    if (!postId) return;
    
    let isMounted = true;

    const cargar = async () => {
      try {
        const res = await fetch(`${API}/posts/${postId}/stats`);
        
        // ── BLINDAJE 1: Si el servidor devuelve errores de disponibilidad, frena silenciosamente ──
        if (!res.ok) return;

        const data = await res.json();
        
        // ── BLINDAJE 2: Validar la integridad del objeto antes del guardado ──
        if (isMounted && data && typeof data === "object") {
          setStats(data);
        }
      } catch (_) {
        // Silencio absoluto ante respuestas en formato HTML erróneo o cortes de red
      }
    };
    
    cargar();
    return () => { 
      isMounted = false; 
    };
  }, [postId]);

  const fmt = (n: number | undefined | null) => {
    if (n === undefined || n === null || isNaN(n)) return "—";
    return n >= 1000 ? (n / 1000).toFixed(1) + "k" : n;
  };

  return (
    <div className="psm-bar">
      <span className="psm-item">
        {/* SVG Nativo equivalente a FiEye */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="psm-icon psm-eye" width="16" height="16">
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
        <span>{stats ? fmt(stats.vistas) : "—"}</span>
      </span>
      <span className="psm-sep" />
      <span className="psm-item">
        {/* SVG Nativo equivalente a FiThumbsUp */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="psm-icon psm-like" width="16" height="16">
          <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
        </svg>
        <span>{stats ? fmt(stats.likes) : "—"}</span>
      </span>
    </div>
  );
}
