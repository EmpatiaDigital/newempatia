"use client";

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
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

interface FormActividad {
  titulo: string;
  fecha: string;
  hora: string;
  imagen: string;
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
const API_URL                = "http://localhost:5000/api/actividades";

const FORM_INICIAL: FormActividad = {
  titulo:      "",
  fecha:       "",
  hora:        "",
  imagen:      "",
  direccion:   "",
  organizador: "Sentidos",
  objetivo:    "",
};

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

function getToken(): string {
  if (typeof window === "undefined") return "";
  return localStorage.getItem("token") ?? "";
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
    <div className="actividades-paginacion">
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
    </div>
  );
}

// ─────────────────────────────────────────────────
// SUBCOMPONENTE: CARD
// ─────────────────────────────────────────────────
interface ActividadCardProps {
  actividad:    Actividad;
  tienePermiso: boolean;
  onEditar:     (a: Actividad) => void;
  onEliminar:   (id: string) => void;
}

function ActividadCard({ actividad, tienePermiso, onEditar, onEliminar }: ActividadCardProps) {
  const fechaFormateada = formatearFecha(actividad.fecha);
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
    <article className="actividad-card">

      {/* ADMIN BUTTONS */}
      {tienePermiso && (
        <div className="actividad-card-admin">
          <button
            className="actividad-admin-btn actividad-admin-btn--edit"
            onClick={() => onEditar(actividad)}
            aria-label="Editar actividad"
            title="Editar"
          >✏️</button>
          <button
            className="actividad-admin-btn actividad-admin-btn--delete"
            onClick={() => onEliminar(actividad._id)}
            aria-label="Eliminar actividad"
            title="Eliminar"
          >🗑️</button>
        </div>
      )}

      {/* HERO: foto izquierda + título derecha */}
      <div className="actividad-hero">
        <div className="actividad-hero-img">
          <img
            src={actividad.imagen || "https://via.placeholder.com/300x200"}
            alt={actividad.titulo}
            loading="lazy"
          />
        </div>
        <div className="actividad-hero-info">
          <h2 className="actividad-card-titulo">{actividad.titulo}</h2>
          <div className="actividad-fecha-badge">
            <span>📅</span>
            <span>{fechaFormateada}</span>
          </div>
        </div>
      </div>

      {/* BODY */}
      <div className="actividad-card-body">

        {/* Hora destacada */}
        <div className="actividad-hora-badge">
          <span className="actividad-hora-badge-icon">🕐</span>
          <span className="actividad-hora-badge-label">Hora</span>
          <span className="actividad-hora-badge-valor">
            {actividad.hora || "A confirmar"}
          </span>
        </div>

        <div className="actividad-info-rows">
          <div className="actividad-info-row">
            <span className="actividad-info-label">Dirección</span>
            <span className="actividad-info-value">{actividad.direccion || "No definida"}</span>
          </div>
          <div className="actividad-info-row">
            <span className="actividad-info-label">Organizador</span>
            <span className="actividad-info-value">{actividad.organizador || "No definido"}</span>
          </div>
          <div className="actividad-info-row">
            <span className="actividad-info-label">Objetivo</span>
            <span className="actividad-info-value">{actividad.objetivo || "No definido"}</span>
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="actividad-card-actions">
        <button
          className="actividad-btn actividad-btn-compartir"
          onClick={handleCompartir}
          disabled={compartiendo}
        >
          {compartiendo ? "Compartiendo…" : "Compartir"}
        </button>
        <button
          className="actividad-btn actividad-btn-asistir"
          onClick={handleAsistir}
        >
          Asistir
        </button>
      </div>
    </article>
  );
}

// ─────────────────────────────────────────────────
// SUBCOMPONENTE: MODAL CREAR / EDITAR
// ─────────────────────────────────────────────────
interface ModalFormProps {
  inicial:    FormActividad;
  modo:       "crear" | "editar";
  onClose:    () => void;
  onGuardado: (a: Actividad) => void;
  idEditar?:  string;
}

function ModalFormActividad({ inicial, modo, onClose, onGuardado, idEditar }: ModalFormProps) {
  const [form, setForm]         = useState<FormActividad>(inicial);
  const [enviando, setEnviando] = useState(false);
  const [error, setError]       = useState("");

  useEffect(() => {
    function onKey(e: KeyboardEvent): void {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(): Promise<void> {
    if (!form.titulo || !form.fecha || !form.direccion || !form.objetivo) {
      setError("Completá los campos obligatorios: título, fecha, dirección y objetivo.");
      return;
    }
    setEnviando(true);
    setError("");
    try {
      const url    = modo === "editar" ? `${API_URL}/${idEditar}` : API_URL;
      const method = modo === "editar" ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${getToken()}`,
        },
        body: JSON.stringify(form),
      });

      if (!res.ok) {
        const body: { error?: string } = await res.json();
        throw new Error(body.error ?? `Error ${res.status}`);
      }

      const guardada: Actividad = await res.json();
      onGuardado(guardada);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al guardar la actividad.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div
      className="act-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-form-titulo"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="act-modal-card">
        <button className="act-modal-close" onClick={onClose} aria-label="Cerrar">✕</button>

        <h2 id="modal-form-titulo" className="act-modal-titulo">
          {modo === "crear" ? "Nueva Actividad" : "Editar Actividad"}
        </h2>

        {error && <p className="act-modal-error">{error}</p>}

        <div className="act-modal-fields">
          <label className="act-modal-label">
            Título *
            <input className="act-modal-input" name="titulo" value={form.titulo} onChange={handleChange} placeholder="Título del evento" />
          </label>
          <div className="act-modal-row">
            <label className="act-modal-label">
              Fecha *
              <input className="act-modal-input" name="fecha" type="date" value={form.fecha} onChange={handleChange} />
            </label>
            <label className="act-modal-label">
              Hora
              <input className="act-modal-input" name="hora" type="time" value={form.hora} onChange={handleChange} />
            </label>
          </div>
          <label className="act-modal-label">
            Imagen (URL)
            <input className="act-modal-input" name="imagen" value={form.imagen} onChange={handleChange} placeholder="https://..." />
          </label>
          <label className="act-modal-label">
            Dirección *
            <input className="act-modal-input" name="direccion" value={form.direccion} onChange={handleChange} placeholder="Calle y número" />
          </label>
          <label className="act-modal-label">
            Organizador
            <input className="act-modal-input" name="organizador" value={form.organizador} onChange={handleChange} />
          </label>
          <label className="act-modal-label">
            Objetivo *
            <textarea className="act-modal-textarea" name="objetivo" value={form.objetivo} onChange={handleChange} rows={3} placeholder="Descripción del objetivo" />
          </label>
        </div>

        <div className="act-modal-actions">
          <button className="act-modal-btn act-modal-btn--cancel" onClick={onClose}>Cancelar</button>
          <button className="act-modal-btn act-modal-btn--save" onClick={handleSubmit} disabled={enviando}>
            {enviando ? "Guardando…" : modo === "crear" ? "Crear" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────
export default function Actividades() {
  const { user } = useAuth();
  const tienePermiso = user?.role === "superadmin" || user?.role === "admin";

  const [actividades, setActividades]   = useState<Actividad[]>([]);
  const [loading, setLoading]           = useState(true);
  const [paginaActual, setPaginaActual] = useState(1);
  const [modalModo, setModalModo]       = useState<"crear" | "editar" | null>(null);
  const [editando, setEditando]         = useState<Actividad | null>(null);

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

  function handleActividadCreada(nueva: Actividad): void {
    setActividades((prev) =>
      [...prev, nueva].sort(
        (a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime()
      )
    );
  }

  function abrirEditar(actividad: Actividad): void {
    setEditando(actividad);
    setModalModo("editar");
  }

  function handleActividadEditada(actualizada: Actividad): void {
    setActividades((prev) =>
      prev.map((a) => (a._id === actualizada._id ? actualizada : a))
    );
  }

  async function handleEliminar(id: string): Promise<void> {
    const confirmar = window.confirm("¿Seguro que querés eliminar esta actividad?");
    if (!confirmar) return;
    try {
      const res = await fetch(`${API_URL}/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`Error ${res.status}`);
      setActividades((prev) => prev.filter((a) => a._id !== id));
    } catch (err: unknown) {
      if (err instanceof Error) alert(`No se pudo eliminar: ${err.message}`);
    }
  }

  function cerrarModal(): void {
    setModalModo(null);
    setEditando(null);
  }

  function cambiarPagina(nuevaPagina: number): void {
    if (nuevaPagina >= 1 && nuevaPagina <= totalPaginas) setPaginaActual(nuevaPagina);
  }

  const totalPaginas        = Math.ceil(actividades.length / ACTIVIDADES_POR_PAGINA);
  const indiceInicial       = (paginaActual - 1) * ACTIVIDADES_POR_PAGINA;
  const actividadesActuales = actividades.slice(indiceInicial, indiceInicial + ACTIVIDADES_POR_PAGINA);

  const formEditar: FormActividad | undefined = editando
    ? {
        titulo:      editando.titulo,
        fecha:       editando.fecha?.slice(0, 10) ?? "",
        hora:        editando.hora,
        imagen:      editando.imagen,
        direccion:   editando.direccion,
        organizador: editando.organizador,
        objetivo:    editando.objetivo,
      }
    : undefined;

  if (loading) {
    return (
      <div className="actividades-wrapper">
        <p className="actividades-empty">Cargando actividades...</p>
      </div>
    );
  }

  return (
    <>
      <div className="actividades-wrapper">

        <div className="actividades-header-row">
          <h1 className="actividades-titulo">
            <span className="actividades-titulo-eyebrow">Actividades</span>
            Actividades Programadas
            <span className="actividades-titulo-divider" aria-hidden="true" />
          </h1>

          {tienePermiso && (
            <button
              className="actividades-btn-nueva"
              onClick={() => setModalModo("crear")}
              aria-label="Crear nueva actividad"
            >
              + Nueva actividad
            </button>
          )}
        </div>

        {actividades.length === 0 ? (
          <p className="actividades-empty">No hay actividades para mostrar.</p>
        ) : (
          <>
            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              onCambiar={cambiarPagina}
            />
            <div className="actividades-grid">
              {actividadesActuales.map((act) => (
                <ActividadCard
                  key={act._id}
                  actividad={act}
                  tienePermiso={tienePermiso}
                  onEditar={abrirEditar}
                  onEliminar={handleEliminar}
                />
              ))}
            </div>
            <Paginacion
              paginaActual={paginaActual}
              totalPaginas={totalPaginas}
              onCambiar={cambiarPagina}
            />
          </>
        )}

      </div>

      {modalModo === "crear" && (
        <ModalFormActividad
          modo="crear"
          inicial={FORM_INICIAL}
          onClose={cerrarModal}
          onGuardado={handleActividadCreada}
        />
      )}

      {modalModo === "editar" && editando && formEditar && (
        <ModalFormActividad
          modo="editar"
          inicial={formEditar}
          idEditar={editando._id}
          onClose={cerrarModal}
          onGuardado={handleActividadEditada}
        />
      )}
    </>
  );
}