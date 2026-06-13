"use client";

import {
  FileText, Video, Image, BookOpen,
  Download, MessageCircle, Trash2, Pencil,
  type LucideIcon,
} from "lucide-react";
import type { Resource } from "../types/recursos";
import "../style/Recursos.css";

interface ResourceCardProps {
  item: Resource;
  isAdmin: boolean;
  onDelete: (id: string) => void | Promise<void>;
  onEdit?: (item: Resource) => void;
  onActivity: (evento: string, titulo: string) => void | Promise<void>;
  priority?: boolean;
}

interface TypeConfig {
  label: string;
  Icon: LucideIcon;
}

const TYPE_CONFIG: Record<string, TypeConfig> = {
  pdf:    { label: "PDF",    Icon: FileText },
  video:  { label: "Video",  Icon: Video },
  imagen: { label: "Imagen", Icon: Image },
  libro:  { label: "Libro",  Icon: BookOpen },
};

function getEmbedUrl(url: string): string | null {
  const ytMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (ytMatch) return `https://www.youtube.com/embed/${ytMatch[1]}?rel=0`;

  const vmMatch = url.match(/vimeo\.com\/(\d+)/);
  if (vmMatch) return `https://player.vimeo.com/video/${vmMatch[1]}`;

  return null;
}

function getCloudinaryPoster(videoUrl: string): string | undefined {
  if (!videoUrl || !videoUrl.includes("res.cloudinary.com")) return undefined;
  return videoUrl
    .replace("/upload/", "/upload/so_0,q_auto,f_auto/")
    .replace(/\.(mp4|webm|mov|avi|mkv)$/i, ".jpg");
}

export default function ResourceCard({
  item, isAdmin, onDelete, onEdit, onActivity,
}: ResourceCardProps) {
  if (!item || !item.type) return null;

  const config: TypeConfig = TYPE_CONFIG[item.type] ?? TYPE_CONFIG["pdf"];
  const { Icon } = config;

  const isLibro = item.type === "libro";
  const isVideo = item.type === "video";

  const archivoSrc = item.fileData ?? item.file ?? "#";

  const videoSrc = isVideo
    ? (item.videoUrl || item.fileData || item.file || null)
    : null;
  const embedUrl = videoSrc ? getEmbedUrl(videoSrc) : null;
  const videoPoster = item.portada || (videoSrc ? getCloudinaryPoster(videoSrc) : undefined);

  /* ── Botones admin ── */
  const AdminActions = () => (
    <>
      {isAdmin && item._id && (
        <div className="rc-admin-actions">
          <button
            className="rc-btn rc-btn--secondary"
            onClick={() => onEdit?.(item)}
            aria-label="Editar recurso"
            title="Editar"
          >
            <Pencil size={13} />
          </button>
          <button
            className="rc-btn rc-btn--danger"
            onClick={() => onDelete(item._id!)}
            aria-label="Eliminar recurso"
            title="Eliminar"
          >
            <Trash2 size={13} />
          </button>
        </div>
      )}
    </>
  );

  /* ── Card de video ── */
  if (isVideo) {
    return (
      <article className="rc-card rc-card--video" tabIndex={0}>
        <span className={`rc-badge rc-badge--${item.type}`}>
          <Icon size={10} />
          {config.label}
        </span>

        <div className="rc-video-wrapper">
          {embedUrl ? (
            <iframe
              src={embedUrl}
              title={item.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              className="rc-video-iframe"
            />
          ) : videoSrc ? (
            <video
              src={videoSrc}
              controls
              preload="metadata"
              poster={videoPoster}
              className="rc-video-native"
              onPlay={() => onActivity("videoPlay", item.title)}
            >
              Tu navegador no soporta reproducción de video.
            </video>
          ) : (
            <div className="rc-video-empty">
              <Video size={32} />
              <span>Video no disponible</span>
            </div>
          )}
        </div>

        <div className="rc-video-footer">
          <h3 className="rc-video-title">{item.title}</h3>
          <AdminActions />
        </div>
      </article>
    );
  }

  /* ── Card estándar (pdf / imagen / libro) ── */
  return (
    <article
      className="rc-card"
      style={{ "--portada": `url(${item.portada})` } as React.CSSProperties}
      tabIndex={0}
    >
      <span className={`rc-badge rc-badge--${item.type}`}>
        <Icon size={10} />
        {config.label}
      </span>

      <div className="rc-title-static">{item.title}</div>

      <div className="rc-overlay">
        <h3 className="rc-title">{item.title}</h3>

        <div className="rc-actions">
          {isLibro ? (
            <a
              href={`https://wa.me/543413559329?text=${encodeURIComponent(
                `Hola, tengo interés en colaborar con "${item.title}".`
              )}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rc-btn rc-btn--primary"
              onClick={() => onActivity("libroWhatsApp", item.title)}
            >
              <MessageCircle size={13} />
              Colaborar
            </a>
          ) : (
            <a
              href={archivoSrc}
              download={item.filename}
              className="rc-btn rc-btn--primary"
              onClick={() => onActivity("pdfDescarga", item.title)}
            >
              <Download size={13} />
              Descargar
            </a>
          )}

          <AdminActions />
        </div>

        <p className="rc-disclaimer">
          Contenido educativo · no sustituye asesoramiento clínico.
        </p>
      </div>
    </article>
  );
}