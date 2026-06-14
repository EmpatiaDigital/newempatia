"use client";

import { useState, useEffect, Fragment } from "react";
import Link from "next/link";
import "../style/FaqWidget.css";

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface Faq {
  _id: string;
  pregunta: string;
  respuesta: string;
}

// ─────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────
const API_BASE = "https://newempatiabackend.vercel.app/api";

// Detecta URLs completas (con protocolo, www, dominio y path/query/hash)
const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;

// ─────────────────────────────────────────────────
// RENDER DE TEXTO CON LINKS DETECTADOS
// ─────────────────────────────────────────────────
function renderConLinks(texto: string) {
  const partes = texto.split(URL_REGEX);

  return partes.map((parte, i) => {
    const esUrl = /^(https?:\/\/|www\.)/.test(parte);

    if (!esUrl) {
      return <Fragment key={i}>{parte}</Fragment>;
    }

    // Limpiar puntuación final que no forma parte de la URL (. , ) etc.)
    const match = parte.match(/^(.*?)([.,;:)\]]*)$/);
    const urlLimpia = match ? match[1] : parte;
    const sufijo = match ? match[2] : "";

    // Normalizar URL (agregar https:// si empieza con www.)
    const href = urlLimpia.startsWith("http")
      ? urlLimpia
      : `https://${urlLimpia}`;

    // ¿Es un link interno del sitio?
    const esInterno = urlLimpia.includes("empatiadigital.com.ar");

    if (esInterno) {
      const path = href.split("empatiadigital.com.ar")[1] || "/";
      return (
        <Fragment key={i}>
          <Link href={path || "/"} className="faq-link">
            {urlLimpia}
          </Link>
          {sufijo}
        </Fragment>
      );
    }

    return (
      <Fragment key={i}>
        <a href={href} target="_blank" rel="noopener noreferrer" className="faq-link">
          {urlLimpia}
        </a>
        {sufijo}
      </Fragment>
    );
  });
}

// ─────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────
export default function FaqWidget() {
  const [open, setOpen] = useState<boolean>(false);
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [cargando, setCargando] = useState<boolean>(true);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  // ── Fetch de FAQs activas (solo una vez) ──────────
  useEffect(() => {
    async function fetchFaqs(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/faqs`);
        if (!res.ok) throw new Error("No se pudieron obtener las preguntas frecuentes");

        const data: Faq[] = await res.json();
        setFaqs(data);
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
      } finally {
        setCargando(false);
      }
    }

    fetchFaqs();
  }, []);

  function toggleRespuesta(index: number): void {
    setOpenIndex((prev) => (prev === index ? null : index));
  }

  function abrirPanel(): void {
    setOpen(true);
  }

  function cerrarPanel(): void {
    setOpen(false);
    setOpenIndex(null);
  }

  return (
    <>
      {/* ── BOT FLOTANTE (video en loop) ── */}
      <button
        type="button"
        className="faq-bot-trigger"
        onClick={abrirPanel}
        aria-label="Abrir preguntas frecuentes"
      >
        <video
          className="faq-bot-video"
          src="/bot-pregunta.mp4"
          autoPlay
          loop
          muted
          playsInline
        />
      </button>

      {/* ── PANEL DE PREGUNTAS FRECUENTES ── */}
      {open && (
        <div className="faq-overlay" onClick={cerrarPanel}>
          <div className="faq-panel" onClick={(e) => e.stopPropagation()}>
            <div className="faq-header">
              <h3>Preguntas frecuentes</h3>
              <button
                type="button"
                className="faq-close"
                onClick={cerrarPanel}
                aria-label="Cerrar"
              >
                &times;
              </button>
            </div>

            <div className="faq-body">
              {cargando && <p className="faq-loading">Cargando...</p>}

              {!cargando && faqs.length === 0 && (
                <p className="faq-empty">No hay preguntas disponibles.</p>
              )}

              {faqs.map((faq, index) => (
                <div className="faq-item" key={faq._id}>
                  <button
                    type="button"
                    className="faq-question"
                    onClick={() => toggleRespuesta(index)}
                  >
                    {faq.pregunta}
                    <span className="faq-icon">
                      {openIndex === index ? "−" : "+"}
                    </span>
                  </button>

                  {openIndex === index && (
                    <div className="faq-answer">{renderConLinks(faq.respuesta)}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}