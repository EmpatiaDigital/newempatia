"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import ModalActividades from "./components/ModalActividades";
import PostStatsMini from "./components/PostStatsMini";
import "./style/HomePage.css";

const FALLBACK_COVER = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=1200&auto=format&fit=crop";
const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/64/64572.png";

const CAROUSEL_STYLE = {
  height: "clamp(320px, 55vw, 600px)",
  minHeight: "320px",
  background: "#111827",
  position: "relative" as const,
  overflow: "hidden" as const,
};

export interface Post {
  _id: string;
  titulo: string;
  portada?: string;
  imagen?: string;
  img?: string;
  categoria?: string | string[];
  autor?: string;
  avatar?: string;
  votos?: number;
  likes?: number;
}

interface ApiPostResponse {
  posts?: Post[];
}

export default function HomePage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [destacados, setDestacados] = useState<Post[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [slideIndex, setSlideIndex] = useState<number>(0);
  
  const router = useRouter();

  const fetchPosts = async () => {
    try {
      setCargando(true);
      const res = await fetch("https://empatia-dominio-back.vercel.app/api/posts?limit=6");

      if (!res.ok) throw new Error(`Error de red: ${res.status}`);

      const data: Post[] | ApiPostResponse = await res.json();
      
      let final: Post[] = [];
      if (Array.isArray(data)) {
        final = data;
      } else if (data && Array.isArray(data.posts)) {
        final = data.posts;
      }

      setPosts(final);
      
      const votados = [...final]
        .sort((a, b) => (b.votos || b.likes || 0) - (a.votos || a.likes || 0))
        .slice(0, 3);
      
      setDestacados(votados);
    } catch (error) {
      console.error("Error al obtener posts:", error);
      setPosts([]);
      setDestacados([]);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  useEffect(() => {
    if (destacados.length <= 1) return;
    const interval = setInterval(() => {
      setSlideIndex((prev) => (prev + 1) % destacados.length);
    }, 6000);
    return () => clearInterval(interval);
  }, [destacados.length]);

  const handlePrev = () => setSlideIndex((prev) => (prev - 1 + destacados.length) % destacados.length);
  const handleNext = () => setSlideIndex((prev) => (prev + 1) % destacados.length);

  const postsToShow = posts.slice(0, 6);
  const currentSlidePost = destacados[slideIndex];

  return (
    <>
      <ModalActividades />

      <div className="homepage">

        {/* ── CARRUSEL ─────────────────────────────────────────────────────────── */}
        <div className="carousel-wrapper" style={CAROUSEL_STYLE}>
          {cargando ? (
            <div style={{ position: "absolute", inset: 0, background: "#1e293b" }} />
          ) : destacados.length === 0 ? (
            <div className="carousel-empty">No hay publicaciones destacadas.</div>
          ) : (
            <>
              {destacados.map((post, i) => {
                // Eliminamos la mutación por string basada en window.innerWidth
                const imgSrc = post.portada || post.imagen || post.img || FALLBACK_COVER;

                return (
                  <div 
                    key={post._id || i} 
                    className={`carousel-image-container ${i === slideIndex ? "active" : ""}`}
                    style={{ position: "absolute", inset: 0, opacity: i === slideIndex ? 1 : 0, transition: "opacity 0.5s ease" }}
                  >
                    <Image
                      src={imgSrc}
                      alt={post.titulo || "Publicación destacada"}
                      fill
                      priority={i === 0}
                      // Dejamos que Next.js y Cloudinary optimicen el tamaño automáticamente según el viewport
                      sizes="(max-width: 768px) 100vw, 1200px"
                      style={{ objectFit: "cover" }}
                    />
                  </div>
                );
              })}

              {currentSlidePost && (
                <div className="overlay">
                  <span className="overlay-eyebrow">
                    Destacado · {Array.isArray(currentSlidePost.categoria) ? currentSlidePost.categoria[0] : currentSlidePost.categoria || "General"}
                  </span>
                  <h1>{currentSlidePost.titulo}</h1>
                  <button
                    className="btn-hero"
                    onClick={() => router.push(`/post/${currentSlidePost._id}`)}
                  >
                    Leer artículo completo
                    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                      <path d="M3 8h10M9 4l4 4-4 4" />
                    </svg>
                  </button>
                </div>
              )}

              <button className="carousel-btn left" onClick={handlePrev} aria-label="Anterior">❮</button>
              <button className="carousel-btn right" onClick={handleNext} aria-label="Siguiente">❯</button>

              <div className="carousel-dots" role="tablist">
                {destacados.map((_, i) => (
                  <button
                    key={i}
                    role="tab"
                    aria-selected={i === slideIndex}
                    className={`dot ${i === slideIndex ? "active" : ""}`}
                    onClick={() => setSlideIndex(i)}
                    aria-label={`Slide ${i + 1}`}
                  />
                ))}
              </div>
            </>
          )}
        </div>

        {/* ── POSTS RECIENTES ──────────────────────────────────────────────────── */}
        <section className="posts-section">
          <div className="posts-section-header">
            <div>
              <h2 className="titulo-principal">Publicaciones recientes</h2>
            </div>
            <button className="section-ver-todas" onClick={() => router.push("/post")}>
              Ver todas
              <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path d="M3 8h10M9 4l4 4-4 4" />
              </svg>
            </button>
          </div>

          {cargando ? (
            <div className="posts-skeleton">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <div key={n} className="skeleton-card">
                  <div className="skeleton-shimmer" />
                </div>
              ))}
            </div>
          ) : postsToShow.length === 0 ? (
            <p className="posts-empty">No hay publicaciones para mostrar.</p>
          ) : (
            <div className="lista-posts-container">
              {postsToShow.map((post, idx) => {
                let categoria = "Sentidos";
                if (Array.isArray(post.categoria) && post.categoria.length > 0 && typeof post.categoria[0] === "string") {
                  categoria = post.categoria[0].trim();
                } else if (typeof post.categoria === "string" && post.categoria.trim() !== "") {
                  categoria = post.categoria.trim();
                }

                const bgUrl = post.portada || FALLBACK_COVER;

                return (
                  <div
                    key={post._id}
                    className={`post-card${idx === 0 ? " post-card--featured" : ""}`}
                    onClick={() => router.push(`/post/${post._id}`)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => e.key === "Enter" && router.push(`/post/${post._id}`)}
                  >
                    <div className="post-card-img-wrapper" style={{ position: "absolute", inset: 0, zIndex: 0 }}>
                      <Image
                        src={bgUrl}
                        alt={post.titulo || "Portada del artículo"}
                        fill
                        priority={idx === 0}
                        sizes="(max-width: 768px) 100vw, 50vw"
                        style={{ objectFit: "cover", objectPosition: "center" }}
                      />
                    </div>

                    <span className="card-badge">{categoria}</span>

                    <div className="post-content-overlay-home">
                      <div className="card-meta">
                        <div className="avatar-wrapper" style={{ position: "relative", width: "32px", height: "32px", borderRadius: "50%", overflow: "hidden" }}>
                          <Image
                            src={post.avatar || DEFAULT_AVATAR}
                            alt={`Avatar de ${post.autor || "autor"}`}
                            fill
                            sizes="32px"
                            style={{ objectFit: "cover" }}
                          />
                        </div>
                        <span className="autor">Por {post.autor || "Redacción"}</span>
                      </div>

                      <h3>{post.titulo}</h3>

                      <div className="card-footer">
                        <button
                          className="btn-ver-mas"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/post/${post._id}`);
                          }}
                        >
                          Leer artículo
                          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                            <path d="M3 8h10M9 4l4 4-4 4" />
                          </svg>
                        </button>

                        <PostStatsMini postId={post._id} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
