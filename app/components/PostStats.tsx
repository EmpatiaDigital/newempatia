"use client";

import React, { useEffect, useState, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import "../style/PostStats.css";

const API = "https://newempatiabackend.vercel.app/api";

export interface FullStatsData {
  vistas: number;
  likes: number;
  dislikes: number;
  miVoto: string | null;
}

export interface PostRelacionado {
  _id: string;
  portada?: string;
  titulo: string;
  categoria?: string;
  epigrafe?: string;
  fecha: string;
}

export interface PostStatsProps {
  postId: string;
  postTitulo: string;
}

export const getVisitorId = (): string => {
  if (typeof window === "undefined") return "";

  const token = localStorage.getItem("token");
  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.userId) return `user_${payload.userId}`;
    } catch (_) {}
  }

  let fp = localStorage.getItem("empatia_fp");
  if (!fp) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.textBaseline = "top";
      ctx.font = "14px Arial";
      ctx.fillText("fingerprint_empatia", 2, 2);
    }
    const canvasData = canvas.toDataURL();

    const raw = [
      navigator.userAgent,
      navigator.language,
      window.screen.width + "x" + window.screen.height,
      new Date().getTimezoneOffset(),
      canvasData.slice(-50),
    ].join("|");

    let hash = 0;
    for (let i = 0; i < raw.length; i++) {
      hash = (Math.imul(31, hash) + raw.charCodeAt(i)) | 0;
    }
    fp = `anon_${Math.abs(hash)}_${Date.now()}`;
    localStorage.setItem("empatia_fp", fp);
  }
  return fp;
};

const PostStats = ({ postId, postTitulo }: PostStatsProps) => {
  const [stats, setStats] = useState<FullStatsData>({ vistas: 0, likes: 0, dislikes: 0, miVoto: null });
  const [relacionados, setRelacionados] = useState<PostRelacionado[]>([]);
  const [cargandoStats, setCargandoStats] = useState<boolean>(true);
  const [cargandoRel, setCargandoRel] = useState<boolean>(true);
  const [votando, setVotando] = useState<boolean>(false);
  const [visitorId, setVisitorId] = useState<string>("");

  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  const emitirGtagVoto = (actionType: string, valueLabel: string) => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      (window as any).gtag("event", "post_engagement", {
        interaction_type: actionType,
        interaction_value: valueLabel,
        item_id: postId,
        item_name: postTitulo || "Post sin título"
      });
    }
  };

  useEffect(() => {
    if (!postId || !visitorId) return;

    const cargarStats = async () => {
      try {
        const res = await fetch(
          `${API}/posts/${postId}/stats?visitorId=${encodeURIComponent(visitorId)}`
        );
        const data = await res.json();
        if (data && typeof data === "object") {
          setStats(data);
        }
      } catch (_) {}
      setCargandoStats(false);
    };

    cargarStats();
  }, [postId, visitorId]);

  useEffect(() => {
    if (!postId) return;
    const cargarRelacionados = async () => {
      try {
        const res = await fetch(`${API}/posts/${postId}/relacionados`);
        const data = await res.json();
        setRelacionados(Array.isArray(data) ? data : []);
      } catch (_) {
        setRelacionados([]);
      }
      setCargandoRel(false);
    };
    cargarRelacionados();
  }, [postId]);

  const handleVoto = useCallback(
    async (tipo: "like" | "dislike") => {
      if (votando || !visitorId) return;
      setVotando(true);

      const esQuitandoVoto = stats.miVoto === tipo;
      const accionGA = tipo;
      const estadoGA = esQuitandoVoto ? "removed" : "added";

      emitirGtagVoto(accionGA, estadoGA);

      if (stats.miVoto !== null && stats.miVoto !== tipo) {
        emitirGtagVoto(stats.miVoto, "removed");
      }

      setStats((prev) => {
        const quitandoActual = prev.miVoto === tipo;
        const cambiando = prev.miVoto !== null && prev.miVoto !== tipo;

        let nuevoLikes = prev.likes;
        let nuevoDislikes = prev.dislikes;

        if (quitandoActual) {
          if (tipo === "like") nuevoLikes--;
          else nuevoDislikes--;
        } else if (cambiando) {
          if (tipo === "like") { nuevoLikes++; nuevoDislikes--; }
          else { nuevoDislikes++; nuevoLikes--; }
        } else {
          if (tipo === "like") nuevoLikes++;
          else nuevoDislikes++;
        }

        return {
          ...prev,
          likes: Math.max(0, nuevoLikes),
          dislikes: Math.max(0, nuevoDislikes),
          miVoto: quitandoActual ? null : tipo,
        };
      });

      try {
        const res = await fetch(`${API}/posts/${postId}/like`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visitorId, tipo }),
        });
        const data = await res.json();
        setStats((prev) => ({
          ...prev,
          likes: data.likes,
          dislikes: data.dislikes,
          miVoto: data.miVoto,
        }));
      } catch (_) {
        try {
          const res = await fetch(
            `${API}/posts/${postId}/stats?visitorId=${encodeURIComponent(visitorId)}`
          );
          const data = await res.json();
          setStats(data);
        } catch (__) {}
      }

      setVotando(false);
    },
    [postId, visitorId, votando, stats.miVoto, postTitulo]
  );

  const formatNum = (n: number) => (n >= 1000 ? (n / 1000).toFixed(1) + "k" : n);

  return (
    <div className="ps-wrapper">
      <div className="ps-stats-bar">
        <div className="ps-stat-item ps-vistas">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ps-icon ps-icon-eye" width="18" height="18">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <span className="ps-count">
            {cargandoStats ? "—" : formatNum(stats.vistas)}
          </span>
        </div>

        <div className="ps-divider" />

        <button
          type="button"
          className={`ps-vote-btn ps-like ${stats.miVoto === "like" ? "ps-active" : ""}`}
          onClick={() => handleVoto("like")}
          disabled={votando}
          aria-label="Me gusta"
          title="Me gusta"
        >
          <svg viewBox="0 0 24 24" fill={stats.miVoto === "like" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ps-icon" width="18" height="18">
            <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
          </svg>
          <span className="ps-count">
            {cargandoStats ? "—" : formatNum(stats.likes)}
          </span>
        </button>

        <button
          type="button"
          className={`ps-vote-btn ps-dislike ${stats.miVoto === "dislike" ? "ps-active" : ""}`}
          onClick={() => handleVoto("dislike")}
          disabled={votando}
          aria-label="No me gusta"
          title="No me gusta"
        >
          <svg viewBox="0 0 24 24" fill={stats.miVoto === "dislike" ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ps-icon" width="18" height="18">
            <path d="M10 15v4a3 3 0 0 0 3 3l4-9V2H5.72a2 2 0 0 0-2 1.7l-1.38 9a2 2 0 0 0 2 2.3zm12-3h3a2 2 0 0 0 2-2V3a2 2 0 0 0-2-2h-3" />
          </svg>
          <span className="ps-count">
            {cargandoStats ? "—" : formatNum(stats.dislikes)}
          </span>
        </button>
      </div>

      {(cargandoRel || relacionados.length > 0) && (
        <div className="ps-relacionados">
          <div className="ps-rel-header">
            <span className="ps-rel-linea" />
            <h3 className="ps-rel-titulo">También te puede interesar</h3>
            <span className="ps-rel-linea" />
          </div>

          {cargandoRel ? (
            <div className="ps-rel-grid">
              {[1, 2, 3].map((i) => (
                <div key={i} className="ps-rel-card ps-rel-skeleton" />
              ))}
            </div>
          ) : (
            <div className="ps-rel-grid">
              {relacionados.map((rel) => (
                <Link key={rel._id} href={`/post/${rel._id}`} className="ps-rel-card">
                  {rel.portada && (
                    <div className="ps-rel-img-wrap" style={{ position: "relative", width: "100%", height: "140px", overflow: "hidden" }}>
                      <Image 
                        src={rel.portada} 
                        alt={rel.titulo || "Portada relacionada"} 
                        fill
                        sizes="(max-width: 768px) 100vw, 33vw"
                        style={{ objectFit: "cover" }}
                        loading="lazy" 
                      />
                    </div>
                  )}
                  <div className="ps-rel-body">
                    <span className="ps-rel-cat">{rel.categoria}</span>
                    <p className="ps-rel-post-titulo">{rel.titulo}</p>
                    {rel.epigrafe && <p className="ps-rel-epig">{rel.epigrafe}</p>}
                    <span className="ps-rel-fecha">
                      {new Date(rel.fecha).toLocaleDateString("es-AR", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PostStats;
