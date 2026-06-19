"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Plus, ChevronLeft, ChevronRight,
  FileText, BookOpen
} from "lucide-react";
import Swal from "sweetalert2";
import "../style/Recursos.css";

import ResourceCard from "../components/ResourceCard";
import ResourceFilters from "../components/ResourceFilters";
import AdminDrawer from "../components/AdminDrawer";
import { useAuth } from "../context/AuthContext";
import type { Resource, ResourceType } from "../types/recursos";

const API_BASE = "https://empatia-dominio-back.vercel.app";
const POR_PAGINA = 6;

type FilterValue = "todos" | ResourceType;

export default function RecursosPage() {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "superadmin";

  const [materialDB, setMaterialDB] = useState<Resource[]>([]);
  const [filtro, setFiltro] = useState<FilterValue>("todos");
  const [pagina, setPagina] = useState(1);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editItem, setEditItem] = useState<Resource | null>(null);
  const [loading, setLoading] = useState(true);

  const getToken = () => localStorage.getItem("token") ?? "";

  const cargarMateriales = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/descarga`);
      if (!res.ok) { setMaterialDB([]); return; }
      const data: unknown = await res.json();
      if (!Array.isArray(data)) { setMaterialDB([]); return; }

      const normalized = (data as Resource[]).map((r) => ({
        ...r,
        file: r.fileData ?? r.file,
        videoUrl: r.type === "video" ? (r.fileData ?? r.videoUrl) : r.videoUrl,
      }));

      setMaterialDB(normalized);
    } catch {
      setMaterialDB([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { cargarMateriales(); }, [cargarMateriales]);

  const eliminarItem = async (id: string) => {
    const { isConfirmed } = await Swal.fire({
      title: "¿Eliminar recurso?",
      text: "Esta acción no se puede deshacer.",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Sí, eliminar",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#c0392b",
    });
    if (!isConfirmed) return;

    try {
      const res = await fetch(`${API_BASE}/api/descarga/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        setMaterialDB((prev) => prev.filter((item) => item._id !== id));
        await Swal.fire("Eliminado", "El recurso fue eliminado.", "success");
      } else {
        const err = await res.json();
        await Swal.fire("Error", err.error ?? "No se pudo eliminar.", "error");
      }
    } catch {
      await Swal.fire("Error", "No se pudo eliminar el recurso.", "error");
    }
  };

  const handleEdit = (item: Resource) => {
    setEditItem(item);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setEditItem(null);
  };

  const registrarActividad = async (evento: string, titulo: string) => {
    const visitorId = localStorage.getItem("visitorId") ?? (() => {
      const id = crypto.randomUUID();
      localStorage.setItem("visitorId", id);
      return id;
    })();
    try {
      await fetch(`${API_BASE}/api/user-actividad`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visitorId, evento, titulo, timestamp: new Date().toISOString() }),
      });
    } catch { /* silencioso */ }
  };

  const filtrados = filtro === "todos" ? materialDB : materialDB.filter((r) => r.type === filtro);
  const totalPaginas = Math.ceil(filtrados.length / POR_PAGINA);
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);

  type CountsType = Record<FilterValue, number>;
  const counts: CountsType = {
    todos:  materialDB.length,
    pdf:    materialDB.filter((r) => r.type === "pdf").length,
    video:  materialDB.filter((r) => r.type === "video").length,
    imagen: materialDB.filter((r) => r.type === "imagen").length,
    libro:  materialDB.filter((r) => r.type === "libro").length,
  };

  const handleFiltro = (v: FilterValue) => { setFiltro(v); setPagina(1); };

  return (
    <>
      <main className="rp-main">

        {/* ── Hero ── */}
        <section className="rp-hero" aria-label="Recursos educativos">
          <div className="rp-hero-inner">
            <span className="rp-eyebrow">
              <FileText size={12} />
              Recursos gratuitos
            </span>
            <h1 className="rp-hero-title">Material recomendado</h1>
            <p className="rp-hero-sub">
              Guías, libros y materiales audiovisuales para acompañar el vínculo
              con la tecnología en familia.
            </p>

            <div className="rp-stats">
              <div className="rp-stat">
                <span className="rp-stat-num">{counts.pdf}</span>
                <span className="rp-stat-lbl">PDFs</span>
              </div>
              <div className="rp-stat-divider" />
              <div className="rp-stat">
                <span className="rp-stat-num">{counts.video}</span>
                <span className="rp-stat-lbl">Videos</span>
              </div>
              <div className="rp-stat-divider" />
              <div className="rp-stat">
                <span className="rp-stat-num">{counts.libro}</span>
                <span className="rp-stat-lbl">Libros</span>
              </div>
            </div>
          </div>

          <div className="rp-hero-deco" aria-hidden="true">
            <div className="rp-deco-ring rp-deco-ring--1" />
            <div className="rp-deco-ring rp-deco-ring--2" />
            <div className="rp-deco-ring rp-deco-ring--3" />
            <BookOpen size={64} className="rp-deco-icon" />
          </div>
        </section>

        {/* ── Controles ── */}
        <div className="rp-controls">
          <ResourceFilters active={filtro} onChange={handleFiltro} counts={counts} />
          {isSuperAdmin && (
            <button
              className="rp-btn-add"
              onClick={() => { setEditItem(null); setDrawerOpen(true); }}
              aria-label="Agregar nuevo recurso"
            >
              <Plus size={15} />
              Nuevo recurso
            </button>
          )}
        </div>

        {/* ── Grid ── */}
        <section className="rp-grid-section">
          {loading ? (
            <div className="rp-grid">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rc-skeleton">
                  <div className="rc-skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : filtrados.length === 0 ? (
            <div className="rp-empty">
              <FileText size={40} />
              <p>No hay recursos en esta categoría todavía.</p>
            </div>
          ) : (
            <>
              {pagina === 1 && visibles.length > 0 && (
                <div className="rp-featured">
                  <ResourceCard
                    item={visibles[0]}
                    isAdmin={isSuperAdmin}
                    onDelete={eliminarItem}
                    onEdit={handleEdit}
                    onActivity={registrarActividad}
                    priority
                  />
                </div>
              )}

              <div className="rp-grid">
                {(pagina === 1 ? visibles.slice(1) : visibles).map((item, i) => (
                  <ResourceCard
                    key={item._id ?? i}
                    item={item}
                    isAdmin={isSuperAdmin}
                    onDelete={eliminarItem}
                    onEdit={handleEdit}
                    onActivity={registrarActividad}
                  />
                ))}
              </div>
            </>
          )}

          {totalPaginas > 1 && (
            <nav className="rp-pagination" aria-label="Paginación de recursos">
              <button
                className="rp-page-btn"
                disabled={pagina === 1}
                onClick={() => setPagina(pagina - 1)}
                aria-label="Página anterior"
              >
                <ChevronLeft size={16} />
              </button>
              <div className="rp-page-dots">
                {Array.from({ length: totalPaginas }).map((_, i) => (
                  <button
                    key={i}
                    className={`rp-dot${pagina === i + 1 ? " rp-dot--active" : ""}`}
                    onClick={() => setPagina(i + 1)}
                    aria-label={`Página ${i + 1}`}
                    aria-current={pagina === i + 1 ? "page" : undefined}
                  />
                ))}
              </div>
              <button
                className="rp-page-btn"
                disabled={pagina === totalPaginas}
                onClick={() => setPagina(pagina + 1)}
                aria-label="Página siguiente"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          )}
        </section>

      </main>

      {isSuperAdmin && (
        <AdminDrawer
          open={drawerOpen}
          onClose={handleDrawerClose}
          onUploaded={cargarMateriales}
          token={getToken()}
          editItem={editItem}
        />
      )}
    </>
  );
}
