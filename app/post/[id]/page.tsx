"use client";

import React, { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { FaFacebook, FaWhatsapp, FaInstagram } from "react-icons/fa";
import Swal from "sweetalert2";
import PostStats, { getVisitorId } from "../../components/PostStats";
import '../../style/PostCompleto.css';

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/64/64572.png";

interface Post {
  _id: string;
  titulo: string;
  autor: string;
  avatar?: string;
  portada?: string;
  categoria: string | string[];
  contenido: string;
  epigrafe?: string;
  recuadro?: string;
  fecha: string;
}

type GtagParams = Record<string, string | number>;

declare global {
  interface Window {
    gtag?: (command: string, event: string, params: GtagParams) => void;
  }
}

const optimizarCloudinary = (url: string, params = "f_auto,q_auto,w_1200"): string => {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return url;
  return url.replace("/upload/", `/upload/${params}/`);
};

const optimizarPortada = (url: string): string => optimizarCloudinary(url, "f_auto,q_auto,w_800");
const optimizarAvatar = (url: string): string => optimizarCloudinary(url, "f_auto,q_auto,w_150,h_150,c_fill");

const optimizarImagenesEnHtml = (html: string): string => {
  if (!html) return html;
  return html.replace(
    /(src=")(https:\/\/res\.cloudinary\.com\/[^"]+)(")/g,
    (match, pre, url, post) => {
      if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return match;
      const urlOptimizada = url.replace("/upload/", "/upload/f_auto,q_auto,w_800/");
      return `${pre}${urlOptimizada}${post}`;
    }
  );
};

const resolverCategoria = (categoriaData: string | string[]): string => {
  if (Array.isArray(categoriaData) && categoriaData.length > 0 && typeof categoriaData[0] === "string") {
    return categoriaData[0].trim();
  }
  if (typeof categoriaData === "string" && categoriaData.trim() !== "") {
    return categoriaData.trim();
  }
  return "Sentidos";
};

const emitirGtagEvent = (eventName: string, params: GtagParams): void => {
  if (typeof window !== "undefined" && window.gtag) {
    window.gtag("event", eventName, params);
  }
};

export default function PostCompleto(): React.ReactElement {
  const params = useParams();
  const id =
    typeof params.id === "string"
      ? params.id
      : Array.isArray(params.id)
      ? params.id[0]
      : "";
  const router = useRouter();

  const [post, setPost] = useState<Post | null>(null);
  const [postsRelacionados, setPostsRelacionados] = useState<Post[]>([]);
  const [cargando, setCargando] = useState(true);
  const startTimeRef = useRef<number | null>(null);

  const shareUrl = `https://empatia-dominio-back.vercel.app/api/posts/${id}/preview`;
  const currentUrl =
    typeof window !== "undefined" ? `${window.location.origin}/post/${id}` : "";

  const handleShareClick = (platform: string): void => {
    if (!post) return;
    emitirGtagEvent("share", {
      method: platform,
      content_type: "Post de Blog",
      item_id: id,
      item_name: post.titulo,
    });
  };

  const handlePdfDownloadClick = (): void => {
    if (!post) return;
    emitirGtagEvent("file_download", {
      file_extension: "pdf",
      file_name: "guia_gratuita_introduccion_ia",
      link_url: "https://empatiadigital.com.ar/descargas",
      item_id: id,
      item_name: post.titulo,
    });
  };

  const handleRelatedPostClick = (relPost: Post): void => {
    emitirGtagEvent("select_content", {
      content_type: "Articulo Relacionado",
      item_id: relPost._id,
      item_name: relPost.titulo,
      origin_item_id: id,
    });
    router.push(`/post/${relPost._id}`);
    window.scrollTo(0, 0);
  };

  useEffect(() => {
    const fetchPostYRegistrarVista = async () => {
      try {
        setCargando(true);
        const visitorId = getVisitorId();
        try {
          await fetch(`https://empatia-dominio-back.vercel.app/api/posts/${id}/vista`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ visitorId }),
          });
        } catch (err) {
          console.error("Error al registrar vista:", err);
        }
        const res = await fetch(`https://empatia-dominio-back.vercel.app/api/posts/${id}`);
        const data: Post = await res.json();
        setPost(data);
        setCargando(false);
      } catch (error) {
        console.error("Error al obtener el post:", error);
        setCargando(false);
      }
    };
    fetchPostYRegistrarVista();
  }, [id]);

  useEffect(() => {
    if (!post) return;
    const fetchRelacionados = async () => {
      try {
        const res = await fetch("https://empatia-dominio-back.vercel.app/api/posts");
        const todosLosPosts: Post[] = await res.json();
        const categoriaActual = resolverCategoria(post.categoria);
        const filtrados = todosLosPosts
          .filter((p) => {
            const categoriaFiltro = resolverCategoria(p.categoria);
            return (
              categoriaFiltro.toLowerCase() === categoriaActual.toLowerCase() &&
              p._id !== id
            );
          })
          .slice(0, 3);
        setPostsRelacionados(filtrados);
      } catch (error) {
        console.error("Error al cargar posts relacionados:", error);
      }
    };
    fetchRelacionados();
  }, [post, id]);

  useEffect(() => {
    if (!post) return;
    startTimeRef.current = performance.now();

    const enlaces = document.querySelectorAll<HTMLAnchorElement>(".imagen-fija-1200 a, .post-content a");
    enlaces.forEach((a) => {
      const href = a.getAttribute("href");
      if (href && href.startsWith("http")) {
        a.setAttribute("target", "_blank");
        a.setAttribute("rel", "noopener noreferrer");
      }
    });

    const imgs = document.querySelectorAll<HTMLImageElement>(".imagen-fija-1200 img, .post-content img");
    imgs.forEach((img) => {
      img.setAttribute("loading", "lazy");
      img.setAttribute("decoding", "async");
    });

    return () => {
      if (startTimeRef.current && post) {
        const endTime = performance.now();
        const segundosLectura = Math.round((endTime - startTimeRef.current) / 1000);
        emitirGtagEvent("post_reading_time", {
          item_id: id,
          item_name: post.titulo,
          category: resolverCategoria(post.categoria),
          reading_time_seconds: segundosLectura,
        });
      }
    };
  }, [post, id]);

  if (cargando) {
    return (
      <div className="post-detalle">
        <p>Cargando post...</p>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="post-detalle">
        <p>No se encontró el post.</p>
      </div>
    );
  }

  const mensaje = encodeURIComponent(
    `${post.titulo} – Leé este post en Empatía Digital este es lo nuevo: ${shareUrl} `
  );
  const contenidoOptimizado = optimizarImagenesEnHtml(post.contenido);
  const portadaOptimizada = post.portada ? optimizarPortada(post.portada) : null;
  const avatarOptimizado = post.avatar ? optimizarAvatar(post.avatar) : DEFAULT_AVATAR;
  const categoriaFormateada = resolverCategoria(post.categoria);

  return (
    <div className="post-detalle">
      <h2 className="post-completo-title">{post.titulo}</h2>

      <div className="post-header">
        <img
          src={avatarOptimizado}
          alt="avatar"
          className="avatar"
          loading="lazy"
          decoding="async"
          width={50}
          height={50}
        />
        <div>
          <p style={{ color: "#000", fontSize: "0.9rem", display: "inline", fontStyle: "italic", fontWeight: "bold" }}>
            Por: {post.autor}
          </p>
          <div>
            <p>
              <b>Fecha:</b> {new Date(post.fecha).toLocaleDateString()}
              &nbsp;&nbsp;&nbsp;
              <b>Categoría:</b> {categoriaFormateada}
            </p>
          </div>
        </div>
      </div>

      <div className="share-section">
        <PostStats postId={id} postTitulo={post.titulo} />
        <h3>Compartir en redes:</h3>
        <div className="share-buttons">
<a href={`https://api.whatsapp.com/send?text=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn whatsapp"
            onClick={() => handleShareClick("WhatsApp")}
          >
            <FaWhatsapp size={30} />
          </a>
          
           <a href={`https://www.facebook.com/sharer/sharer.php?u=${mensaje}`}
            target="_blank"
            rel="noopener noreferrer"
            className="share-btn facebook"
            onClick={() => handleShareClick("Facebook")}
          >
            <FaFacebook size={30} />
          </a>
          <button
            onClick={() => {
              navigator.clipboard.writeText(currentUrl);
              handleShareClick("Instagram Stories (Link Copiado)");
              Swal.fire({
                icon: "success",
                title: "¡Link copiado!",
                text: "Pegalo en tus historias de Instagram.",
                confirmButtonText: "Ok",
                timer: 2500,
                timerProgressBar: true,
              });
            }}
            className="share-btn instagram"
            title="Copiá el link y compartilo en tus historias"
            style={{ cursor: "pointer", background: "none", border: "none", padding: 0 }}
          >
            <FaInstagram size={30} />
          </button>
        </div>
      </div>

      {portadaOptimizada && (
        <img
          src={portadaOptimizada}
          alt="portada"
          className="preview-portada"
          loading="eager"
          decoding="async"
          width={800}
        />
      )}

      <p><i>{post.epigrafe}</i></p>

      <div
        className="imagen-fija-1200"
        dangerouslySetInnerHTML={{ __html: contenidoOptimizado }}
      />

      {post.recuadro ? (
        <div
          className="recuadro-dinamico-container"
          style={{ backgroundColor: "#fff3cd", borderLeft: "6px solid #ffc107", padding: "1rem", borderRadius: "8px", fontFamily: "sans-serif", color: "#856404", marginBottom: "1.5rem", marginTop: "2rem" }}
          dangerouslySetInnerHTML={{ __html: optimizarImagenesEnHtml(post.recuadro) }}
        />
      ) : (
        <div style={{ backgroundColor: "#fff3cd", borderLeft: "6px solid #ffc107", padding: "1rem", borderRadius: "8px", fontFamily: "sans-serif", color: "#856404", marginBottom: "1.5rem", marginTop: "2rem" }}>
          <p style={{ margin: "0 0 0.5rem 0" }}>
            <strong style={{ display: "block", fontSize: "1.1rem", marginBottom: "0.5rem" }}>
              ⚠️ Aviso importante:
            </strong>
            Este contenido es informativo y refleja la experiencia desde el acompañamiento terapéutico. No reemplaza la consulta con profesionales de la salud mental. Si experimentás síntomas persistentes o preocupantes, te recomendamos buscar ayuda especializada.
          </p>
          <p style={{ margin: "0.5rem 0 0 0" }}>
            Si conocés a alguien que le pueda interesar este tema, compartile este post. Además, te invito a descargar la guía gratuita en PDF sobre la introducción de IA en la parte de abajo 👇
          </p>
        </div>
      )}

      <div style={{ borderLeft: "30px solid #42a5f5", backgroundColor: "#194542", justifyContent: "center", alignItems: "center", borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "3rem", fontSize: "1.5rem", fontWeight: "500", display: "flex" }}>
        
          <a style={{ borderBottom: "2px solid white", borderRadius: "6px", padding: "0.75rem 1rem", marginBottom: "0.5rem", fontSize: "1.5rem", fontWeight: "500", display: "flex", textDecoration: "none", color: "white", backgroundColor: "transparent", cursor: "pointer" }}
          href="https://empatiadigital.com.ar/descargas"
          onClick={handlePdfDownloadClick}
        >
          Descarga la guía PDF GRATIS
        </a>
      </div>

      {postsRelacionados.length > 0 && (
        <div className="contenido-interes-section" style={{ marginTop: "3rem", borderTop: "2px solid #eaeaea", paddingTop: "2rem" }}>
          <h3 style={{ fontSize: "1.5rem", fontWeight: "700", marginBottom: "1.5rem", color: "#1a1a1a" }}>
            Artículos relacionados de {categoriaFormateada}:
          </h3>
          <div className="relacionados-grid" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1.5rem" }}>
            {postsRelacionados.map((relPost) => (
              <div
                key={relPost._id}
                onClick={() => handleRelatedPostClick(relPost)}
                style={{ cursor: "pointer", border: "1px solid #e2e8f0", borderRadius: "10px", overflow: "hidden", backgroundColor: "#fff", boxShadow: "0 4px 6px -1px rgba(0,0,0,0.05)", transition: "transform 0.2s ease", display: "flex", flexDirection: "column" }}
                onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")}
                onMouseLeave={(e) => (e.currentTarget.style.transform = "translateY(0)")}
              >
                <img
                  src={relPost.portada ? optimizarPortada(relPost.portada) : "/Juego.jpeg"}
                  alt={relPost.titulo}
                  style={{ width: "100%", height: "150px", objectFit: "cover" }}
                  loading="lazy"
                />
                <div style={{ padding: "1rem", flexGrow: 1, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
                  <h4 style={{ fontSize: "1.1rem", fontWeight: "600", margin: "0 0 0.5rem 0", color: "#2d3748", lineBreak: "anywhere" }}>
                    {relPost.titulo.length > 60 ? `${relPost.titulo.substring(0, 60)}...` : relPost.titulo}
                  </h4>
                  <p style={{ fontSize: "0.85rem", color: "#718096", margin: "auto 0 0 0", fontStyle: "italic" }}>
                    Por: {relPost.autor}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
