"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "../context/AuthContext";
import Swal from "sweetalert2";
import "../style/StatsBanner.css";

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface BannerConfig {
  _id?: string;
  textoBase: string;
  activo: boolean;
  mostrarStats: boolean;
  seguidoresRedes: number;
}

interface ActividadVisitor {
  visitorId: string;
}

interface StatsBannerProps {
  apiBase?: string;
}

// ── Constantes ────────────────────────────────────────────────────────────────

const TEXTO_DEFAULT =
  "Miles de personas ya conocieron Empatía Digital y accedieron a contenidos sobre seguridad, ciudadanía y bienestar digital.";

const CONFIG_DEFAULT: BannerConfig = {
  textoBase: TEXTO_DEFAULT,
  activo: true,
  mostrarStats: false,
  seguidoresRedes: 0,
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatearNumero(n: number): string {
  if (n >= 1000) {
    const k = n / 1000;
    return `${k % 1 === 0 ? k.toFixed(0) : k.toFixed(1)}k`;
  }
  return `${n}`;
}

// ── Hook: animación de conteo ascendente ───────────────────────────────────────

function useCountUp(target: number, start: boolean, duration = 1400): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!start) return;

    // Si el target es 0, no hay nada que animar
    if (target <= 0) {
      setValue(0);
      return;
    }

    let startTime: number | null = null;
    let frameId: number;

    const step = (timestamp: number) => {
      if (startTime === null) startTime = timestamp;
      const progress = Math.min((timestamp - startTime) / duration, 1);

      // ease-out cúbico: arranca rápido y desacelera al final
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.floor(eased * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(step);
      } else {
        setValue(target);
      }
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [target, start, duration]);

  return value;
}

// ── Componente ────────────────────────────────────────────────────────────────

export default function StatsBanner({ apiBase = "https://newempatiabackend.vercel.app" }: StatsBannerProps) {
  const { user } = useAuth();

  const [config, setConfig]     = useState<BannerConfig | null>(null);
  const [borrador, setBorrador] = useState<BannerConfig | null>(null);
  const [visitantes, setVisitantes] = useState<number>(0);

  const [loading, setLoading]   = useState(true);
  const [editando, setEditando] = useState(false);
  const [guardando, setGuardando] = useState(false);

  // ── Visibilidad para disparar la animación ──
  const statsRef = useRef<HTMLDivElement | null>(null);
  const [enVista, setEnVista] = useState(false);

  const esSuperAdmin = user?.role === "superadmin";

  // ── Cargar configuración ──
  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/banner-config`);
      if (!res.ok) throw new Error("No se pudo obtener la configuración");
      const data: BannerConfig = await res.json();
      setConfig(data);
      setBorrador(data);
    } catch {
      setConfig(CONFIG_DEFAULT);
      setBorrador(CONFIG_DEFAULT);
    } finally {
      setLoading(false);
    }
  }, [apiBase]);

  // ── Cargar visitantes únicos (solo si mostrarStats) ──
  const fetchVisitantes = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/api/user-actividad`);
      if (!res.ok) throw new Error("No se pudo obtener actividad");
      const actividades: ActividadVisitor[] = await res.json();
      const unicos = new Set(actividades.map((a) => a.visitorId)).size;
      setVisitantes(unicos);
    } catch {
      setVisitantes(0);
    }
  }, [apiBase]);

  useEffect(() => {
    void fetchConfig();
  }, [fetchConfig]);

  useEffect(() => {
    if (config?.mostrarStats) void fetchVisitantes();
  }, [config?.mostrarStats, fetchVisitantes]);

  // ── Observer: detectar cuando los números entran en pantalla ──
  useEffect(() => {
    if (!config?.mostrarStats) return;
    const el = statsRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setEnVista(true);
          observer.disconnect(); // solo animamos una vez
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [config?.mostrarStats]);

  // ── Valores animados ──
  const visitantesAnimado = useCountUp(visitantes, enVista);
  const seguidoresAnimado = useCountUp(config?.seguidoresRedes ?? 0, enVista);

  // ── Guardar cambios (solo superadmin) ──
  const handleGuardar = async () => {
    if (!borrador) return;
    setGuardando(true);
    try {
      const token = localStorage.getItem("token");
      const res = await fetch(`${apiBase}/api/banner-config`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(borrador),
      });
      if (!res.ok) throw new Error("Error al guardar");
      const data: BannerConfig = await res.json();
      setConfig(data);
      setBorrador(data);
      setEditando(false);
      Swal.fire({ icon: "success", title: "Banner actualizado", timer: 1500, showConfirmButton: false });
    } catch {
      Swal.fire("Error", "No se pudo guardar la configuración.", "error");
    } finally {
      setGuardando(false);
    }
  };

  if (loading || !config) return null;

  // Si está desactivado y no es superadmin, no se renderiza nada
  if (!config.activo && !esSuperAdmin) return null;

  return (
    <section className="stats-banner">

      {/* Panel de edición — solo superadmin */}
      {esSuperAdmin && (
        <div className="stats-banner-admin">
          <button
            className="stats-banner-admin-toggle"
            onClick={() => setEditando((e) => !e)}
          >
            {editando ? "Cerrar edición" : "⚙ Editar banner"}
          </button>

          {editando && borrador && (
            <div className="stats-banner-admin-panel">
              <label className="stats-banner-admin-label">
                Texto base
                <textarea
                  className="stats-banner-admin-textarea"
                  value={borrador.textoBase}
                  onChange={(e) => setBorrador({ ...borrador, textoBase: e.target.value })}
                  rows={3}
                />
              </label>

              <div className="stats-banner-admin-row">
                <label className="stats-banner-admin-switch">
                  <input
                    type="checkbox"
                    checked={borrador.activo}
                    onChange={(e) => setBorrador({ ...borrador, activo: e.target.checked })}
                  />
                  <span>Mostrar componente</span>
                </label>

                <label className="stats-banner-admin-switch">
                  <input
                    type="checkbox"
                    checked={borrador.mostrarStats}
                    onChange={(e) => setBorrador({ ...borrador, mostrarStats: e.target.checked })}
                  />
                  <span>Mostrar números dinámicos</span>
                </label>
              </div>

              {borrador.mostrarStats && (
                <label className="stats-banner-admin-label">
                  Seguidores en redes (manual)
                  <input
                    type="number"
                    min={0}
                    className="stats-banner-admin-input"
                    value={borrador.seguidoresRedes}
                    onChange={(e) => setBorrador({ ...borrador, seguidoresRedes: Number(e.target.value) })}
                  />
                </label>
              )}

              <button
                className="stats-banner-admin-save"
                onClick={handleGuardar}
                disabled={guardando}
              >
                {guardando ? "Guardando..." : "Guardar cambios"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Contenido visible al público */}
      {config.activo && (
        <div className="stats-banner-content">
          <p className="stats-banner-text">{config.textoBase}</p>

          {config.mostrarStats && (
            <div className="stats-banner-stats" ref={statsRef}>
              <div className="stats-banner-box">
                <span className="stats-banner-number">{formatearNumero(visitantesAnimado)}</span>
                <span className="stats-banner-label">nos visitaron</span>
              </div>
              <div className="stats-banner-box">
                <span className="stats-banner-number">{formatearNumero(seguidoresAnimado)}</span>
                <span className="stats-banner-label">nos siguen en redes</span>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
