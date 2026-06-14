"use client";

import { useEffect, useRef, useState } from "react";
import { X, Upload, Link, Loader2 } from "lucide-react";
import Swal from "sweetalert2";
import type { Resource, ResourceType } from "../types/recursos";
import "../style/Recursos.css";

const API_BASE = "https://newempatiabackend.vercel.app";

const TIPOS: { value: ResourceType; label: string }[] = [
  { value: "pdf",    label: "PDF" },
  { value: "video",  label: "Video" },
  { value: "imagen", label: "Imagen" },
  { value: "libro",  label: "Libro" },
];

interface AdminDrawerProps {
  open: boolean;
  onClose: () => void;
  onUploaded: () => void;
  token: string;
  editItem?: Resource | null;
}

export default function AdminDrawer({
  open, onClose, onUploaded, token, editItem,
}: AdminDrawerProps) {
  const isEditing = !!editItem;

  // ── Form state ──────────────────────────────────────────────────────────────
  const [title,      setTitle]      = useState("");
  const [type,       setType]       = useState<ResourceType>("pdf");
  const [filename,   setFilename]   = useState("");
  const [fileUrl,    setFileUrl]    = useState("");
  const [portadaUrl, setPortadaUrl] = useState("");
  const [email,      setEmail]      = useState("");

  const [archivoFile, setArchivoFile] = useState<File | null>(null);
  const [portadaFile, setPortadaFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);

  const archivoRef = useRef<HTMLInputElement>(null);
  const portadaRef = useRef<HTMLInputElement>(null);

  // ── Pre-rellenar al editar ───────────────────────────────────────────────────
  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title ?? "");
      setType(editItem.type ?? "pdf");
      setFilename(editItem.filename ?? "");
      setFileUrl(editItem.fileData ?? editItem.file ?? "");
      setPortadaUrl(editItem.portada ?? "");
      setEmail("");
      setArchivoFile(null);
      setPortadaFile(null);
    } else {
      resetForm();
    }
  }, [editItem, open]);

  const resetForm = () => {
    setTitle("");
    setType("pdf");
    setFilename("");
    setFileUrl("");
    setPortadaUrl("");
    setEmail("");
    setArchivoFile(null);
    setPortadaFile(null);
    if (archivoRef.current) archivoRef.current.value = "";
    if (portadaRef.current) portadaRef.current.value = "";
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!title.trim() || !filename.trim()) {
      await Swal.fire("Campos incompletos", "Completá título y nombre de archivo.", "warning");
      return;
    }
    if (!isEditing && !archivoFile && !fileUrl.trim()) {
      await Swal.fire("Sin archivo", "Subí un archivo o ingresá una URL.", "warning");
      return;
    }

    setLoading(true);

    try {
      const formData = new FormData();
      formData.append("title",    title.trim());
      formData.append("type",     type);
      formData.append("filename", filename.trim());
      if (email.trim())      formData.append("email",      email.trim());
      if (fileUrl.trim())    formData.append("fileUrl",    fileUrl.trim());
      if (portadaUrl.trim()) formData.append("portada",    portadaUrl.trim());
      if (archivoFile)       formData.append("file",       archivoFile);
      if (portadaFile)       formData.append("portadaFile", portadaFile);

      const url    = isEditing
        ? `${API_BASE}/api/descarga/${editItem!._id}`
        : `${API_BASE}/api/descarga`;
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      if (res.ok) {
        await Swal.fire(
          isEditing ? "Actualizado" : "Creado",
          isEditing ? "El recurso fue actualizado." : "El recurso fue creado.",
          "success"
        );
        onUploaded();
        onClose();
      } else {
        const err = await res.json();
        await Swal.fire("Error", err.error ?? "No se pudo guardar.", "error");
      }
    } catch {
      await Swal.fire("Error", "Ocurrió un error inesperado.", "error");
    } finally {
      setLoading(false);
    }
  };

  // ── Render — siempre en el DOM, clases controlan visibilidad ────────────────
  return (
    <>
      {/* Backdrop */}
      <div
        className={`ad-backdrop${open ? " ad-backdrop--open" : ""}`}
        onClick={onClose}
        aria-hidden="true"
      />

      <aside
        className={`ad-drawer${open ? " ad-drawer--open" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label={isEditing ? "Editar recurso" : "Nuevo recurso"}
      >
        {/* Header */}
        <div className="ad-header">
          <h2 className="ad-title">
            {isEditing ? "Editar recurso" : "Nuevo recurso"}
          </h2>
          <button className="ad-close" onClick={onClose} aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="ad-body">

          {/* Tipo */}
          <label className="ad-label">
            Tipo de recurso
            <select
              className="ad-input"
              value={type}
              onChange={(e) => setType(e.target.value as ResourceType)}
            >
              {TIPOS.map((t) => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </label>

          {/* Título */}
          <label className="ad-label">
            Título
            <input
              className="ad-input"
              type="text"
              placeholder="Ej: Guía de empatía digital"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
            />
          </label>

          {/* Nombre de archivo */}
          <label className="ad-label">
            Nombre de archivo / etiqueta
            <input
              className="ad-input"
              type="text"
              placeholder="Ej: guia-empatia.pdf"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
            />
          </label>

          {/* Archivo o URL */}
          <fieldset className="ad-fieldset">
            <legend className="ad-legend">
              Archivo {isEditing ? "(dejá vacío para mantener el actual)" : "*"}
            </legend>

            <label className="ad-label">
              <span className="ad-sublabel"><Upload size={13} /> Subir archivo</span>
              <input
                ref={archivoRef}
                className="ad-file"
                type="file"
                accept={
                  type === "video"  ? "video/*" :
                  type === "imagen" ? "image/*" :
                  type === "pdf"    ? "application/pdf" :
                  "*/*"
                }
                onChange={(e) => {
                  setArchivoFile(e.target.files?.[0] ?? null);
                  if (e.target.files?.[0]) setFileUrl("");
                }}
              />
              {archivoFile && (
                <span className="ad-file-name">{archivoFile.name}</span>
              )}
            </label>

            <span className="ad-or">— o —</span>

            <label className="ad-label">
              <span className="ad-sublabel"><Link size={13} /> URL externa (YouTube, Vimeo, libro…)</span>
              <input
                className="ad-input"
                type="url"
                placeholder="https://..."
                value={fileUrl}
                onChange={(e) => {
                  setFileUrl(e.target.value);
                  if (e.target.value) {
                    setArchivoFile(null);
                    if (archivoRef.current) archivoRef.current.value = "";
                  }
                }}
              />
            </label>
          </fieldset>

          {/* Portada */}
          <fieldset className="ad-fieldset">
            <legend className="ad-legend">
              Portada {isEditing ? "(opcional, para reemplazar)" : "(opcional)"}
            </legend>

            <label className="ad-label">
              <span className="ad-sublabel"><Upload size={13} /> Subir imagen de portada</span>
              <input
                ref={portadaRef}
                className="ad-file"
                type="file"
                accept="image/*"
                onChange={(e) => {
                  setPortadaFile(e.target.files?.[0] ?? null);
                  if (e.target.files?.[0]) setPortadaUrl("");
                }}
              />
              {portadaFile && (
                <span className="ad-file-name">{portadaFile.name}</span>
              )}
            </label>

            <span className="ad-or">— o —</span>

            <label className="ad-label">
              <span className="ad-sublabel"><Link size={13} /> URL de imagen de portada</span>
              <input
                className="ad-input"
                type="url"
                placeholder="https://..."
                value={portadaUrl}
                onChange={(e) => {
                  setPortadaUrl(e.target.value);
                  if (e.target.value) {
                    setPortadaFile(null);
                    if (portadaRef.current) portadaRef.current.value = "";
                  }
                }}
              />
            </label>

            {/* Preview portada actual al editar */}
            {isEditing && editItem?.portada && !portadaFile && (
              <div className="ad-portada-preview">
                <span className="ad-sublabel">Portada actual:</span>
                <img src={editItem.portada} alt="Portada actual" className="ad-portada-img" />
              </div>
            )}
          </fieldset>

          {/* Email — solo al crear */}
          {!isEditing && (
            <label className="ad-label">
              Email de notificación (opcional)
              <input
                className="ad-input"
                type="email"
                placeholder="destinatario@ejemplo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
          )}

        </div>

        {/* Footer */}
        <div className="ad-footer">
          <button
            className="ad-btn-cancel"
            onClick={onClose}
            disabled={loading}
          >
            Cancelar
          </button>
          <button
            className="ad-btn-submit"
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading
              ? <><Loader2 size={14} className="ad-spin" /> Guardando…</>
              : isEditing ? "Guardar cambios" : "Crear recurso"
            }
          </button>
        </div>
      </aside>
    </>
  );
}
