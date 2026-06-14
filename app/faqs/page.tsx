"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Swal from "sweetalert2";
import "../style/AdminFaqs.css";

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface Faq {
  _id: string;
  pregunta: string;
  respuesta: string;
  orden: number;
  activo: boolean;
}

interface FaqFormData {
  pregunta: string;
  respuesta: string;
  orden: number;
  activo: boolean;
}

// ─────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────
const API_BASE = "https://newempatiabackend.vercel.app/api";

const FAQ_VACIA: FaqFormData = {
  pregunta: "",
  respuesta: "",
  orden: 0,
  activo: true,
};

// ─────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────
export default function AdminFaqs() {
  const router = useRouter();

  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [formData, setFormData] = useState<FaqFormData>(FAQ_VACIA);
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [autorizado, setAutorizado] = useState<boolean>(false);

  // ── Verificación de rol ──────────────────────────
  useEffect(() => {
    const role = localStorage.getItem("role");

    if (role !== "superadmin") {
      Swal.fire({
        icon: "error",
        title: "Acceso denegado",
        text: "Solo el superadmin puede acceder a esta sección.",
      });
      router.push("/");
      return;
    }

    setAutorizado(true);
  }, [router]);

  // ── Fetch de FAQs ─────────────────────────────────
  useEffect(() => {
    if (!autorizado) return;

    async function fetchFaqs(): Promise<void> {
      const token = localStorage.getItem("token") ?? "";

      try {
        const res = await fetch(`${API_BASE}/faqs/admin`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!res.ok) throw new Error("No se pudieron obtener las preguntas frecuentes");

        const data: Faq[] = await res.json();
        setFaqs(data);
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
        Swal.fire("Error", "No se pudieron cargar las preguntas frecuentes.", "error");
      } finally {
        setCargando(false);
      }
    }

    fetchFaqs();
  }, [autorizado]);

  // ── Form handlers ─────────────────────────────────
  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ): void {
    const { name, value, type } = e.target;

    if (type === "checkbox") {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => ({ ...prev, [name]: checked }));
      return;
    }

    if (name === "orden") {
      setFormData((prev) => ({ ...prev, orden: Number(value) }));
      return;
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
  }

  function resetForm(): void {
    setFormData(FAQ_VACIA);
    setEditandoId(null);
  }

  function cargarParaEditar(faq: Faq): void {
    setFormData({
      pregunta: faq.pregunta,
      respuesta: faq.respuesta,
      orden: faq.orden,
      activo: faq.activo,
    });
    setEditandoId(faq._id);
  }

  // ── Guardar (crear o actualizar) ──────────────────
  async function guardarFaq(): Promise<void> {
    if (!formData.pregunta.trim() || !formData.respuesta.trim()) {
      Swal.fire({
        icon: "warning",
        title: "Faltan datos",
        text: "Completá la pregunta y la respuesta.",
      });
      return;
    }

    const token = localStorage.getItem("token") ?? "";
    const esEdicion = Boolean(editandoId);

    const url = esEdicion
      ? `${API_BASE}/faqs/${editandoId}`
      : `${API_BASE}/faqs`;

    const method = esEdicion ? "PUT" : "POST";

    try {
      Swal.fire({
        title: esEdicion ? "Actualizando pregunta..." : "Creando pregunta...",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); },
      });

      const res = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      Swal.close();

      if (!res.ok) {
        Swal.fire("Error", "El servidor rechazó la operación.", "error");
        return;
      }

      const faqGuardada: Faq = await res.json();

      if (esEdicion) {
        setFaqs((prev) =>
          prev.map((f) => (f._id === faqGuardada._id ? faqGuardada : f))
        );
      } else {
        setFaqs((prev) => [...prev, faqGuardada]);
      }

      await Swal.fire({
        icon: "success",
        title: esEdicion ? "Pregunta actualizada" : "Pregunta creada",
        timer: 1500,
        showConfirmButton: false,
      });

      resetForm();
    } catch (err: unknown) {
      Swal.close();
      if (err instanceof Error) console.error(err.message);
      Swal.fire("Error inesperado", "Revisá la conexión o la consola del desarrollador.", "error");
    }
  }

  // ── Eliminar ───────────────────────────────────────
  async function eliminarFaq(id: string): Promise<void> {
    const confirmacion = await Swal.fire({
      icon: "warning",
      title: "¿Eliminar pregunta?",
      text: "Esta acción no se puede deshacer.",
      showCancelButton: true,
      confirmButtonText: "Eliminar",
      cancelButtonText: "Cancelar",
    });

    if (!confirmacion.isConfirmed) return;

    const token = localStorage.getItem("token") ?? "";

    try {
      const res = await fetch(`${API_BASE}/faqs/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error("No se pudo eliminar la pregunta");

      setFaqs((prev) => prev.filter((f) => f._id !== id));

      Swal.fire({
        icon: "success",
        title: "Pregunta eliminada",
        timer: 1200,
        showConfirmButton: false,
      });
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      Swal.fire("Error", "No se pudo eliminar la pregunta.", "error");
    }
  }

  // ── Toggle activo rápido ───────────────────────────
  async function toggleActivo(faq: Faq): Promise<void> {
    const token = localStorage.getItem("token") ?? "";

    try {
      const res = await fetch(`${API_BASE}/faqs/${faq._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ...faq, activo: !faq.activo }),
      });

      if (!res.ok) throw new Error("No se pudo actualizar el estado");

      const faqActualizada: Faq = await res.json();
      setFaqs((prev) =>
        prev.map((f) => (f._id === faqActualizada._id ? faqActualizada : f))
      );
    } catch (err: unknown) {
      if (err instanceof Error) console.error(err.message);
      Swal.fire("Error", "No se pudo cambiar el estado de la pregunta.", "error");
    }
  }

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  if (!autorizado) return null;

  return (
    <div className="admin-faqs-container">
      <h2 className="admin-faqs-title">Gestión de preguntas frecuentes</h2>

      <div className="admin-faqs-form">
        <input
          type="text"
          name="pregunta"
          placeholder="Pregunta"
          value={formData.pregunta}
          onChange={handleChange}
          className="admin-faqs-input"
        />

        <textarea
          name="respuesta"
          placeholder="Respuesta"
          value={formData.respuesta}
          onChange={handleChange}
          className="admin-faqs-textarea"
        />

        <div className="admin-faqs-form-row">
          <label className="admin-faqs-label">
            Orden
            <input
              type="number"
              name="orden"
              value={formData.orden}
              onChange={handleChange}
              className="admin-faqs-input-small"
            />
          </label>

          <label className="admin-faqs-checkbox-label">
            <input
              type="checkbox"
              name="activo"
              checked={formData.activo}
              onChange={handleChange}
            />
            Activa
          </label>
        </div>

        <div className="admin-faqs-form-actions">
          <button type="button" onClick={guardarFaq} className="admin-faqs-save-button">
            {editandoId ? "Guardar cambios" : "Agregar pregunta"}
          </button>

          {editandoId && (
            <button type="button" onClick={resetForm} className="admin-faqs-cancel-button">
              Cancelar
            </button>
          )}
        </div>
      </div>

      {cargando && <p className="admin-faqs-loading">Cargando preguntas...</p>}

      <div className="admin-faqs-list">
        {faqs.map((faq) => (
          <div className="admin-faqs-item" key={faq._id}>
            <div className="admin-faqs-item-content">
              <p className="admin-faqs-item-pregunta">
                {faq.orden}. {faq.pregunta}
              </p>
              <p className="admin-faqs-item-respuesta">{faq.respuesta}</p>
              <span className={`admin-faqs-badge ${faq.activo ? "activa" : "inactiva"}`}>
                {faq.activo ? "Activa" : "Inactiva"}
              </span>
            </div>

            <div className="admin-faqs-item-actions">
              <button
                type="button"
                onClick={() => cargarParaEditar(faq)}
                className="admin-faqs-edit-button"
              >
                Editar
              </button>

              <button
                type="button"
                onClick={() => toggleActivo(faq)}
                className="admin-faqs-toggle-button"
              >
                {faq.activo ? "Desactivar" : "Activar"}
              </button>

              <button
                type="button"
                onClick={() => eliminarFaq(faq._id)}
                className="admin-faqs-delete-button"
              >
                Eliminar
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}