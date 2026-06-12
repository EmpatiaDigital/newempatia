"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import avatarSrc from "../assets/avatar.jpeg";
import "../style/Informacion.css";

const GUIA_PDF_DEFAULT = "/Guía Empatía Digital.pdf";

const BASE_URL = "http://localhost:5000/api";

/* ── tipos ── */
interface ContenidoItem {
  icono?: string;
  titulo: string;
  descripcion: string;
}

interface CourseData {
  _id: string;
  titulo: string;
  descripcion?: string;
  duracion?: string;
  clases?: string;
  duracionClase?: string;
  cargaTotal?: string;
  modalidad?: string;
  nivel?: string;
  precio?: number | string;
  moneda?: string;
  tieneDescuento?: boolean;
  descuentoPorcentaje?: number;
  contenidos?: ContenidoItem[];
  audiencia?: string[];
  tieneCodigoPromo?: boolean;
}

/* ── íconos inline ── */
const ICON_PATHS: Record<string, React.ReactNode> = {
  lightbulb: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  ),
  warning: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
  ),
  shield: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  ),
  settings: (
    <>
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </>
  ),
  smile: (
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  ),
};

function renderIcono(nombre: string): React.ReactNode {
  return (
    ICON_PATHS[nombre] ?? (
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    )
  );
}

/* ── helper precio ── */
function parsePrecio(raw: number | string | undefined): number {
  if (raw === undefined || raw === null) return 0;
  const str = raw.toString().replace(/[^\d.,]/g, "").replace(",", ".");
  const n = parseFloat(str);
  return isNaN(n) ? 0 : n;
}

/* ── íconos SVG reutilizables ── */
function IconGift() {
  return (
    <svg className="ic-gift-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 12v10H4V12M22 7H2v5h20V7zM12 22V7M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" />
    </svg>
  );
}

function IconBook() {
  return (
    <svg className="ic-gift-icon ic-gift-icon--reveal" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  );
}

function IconMail() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
      <path d="M1 3h12v8.5a.5.5 0 0 1-.5.5h-11A.5.5 0 0 1 1 11.5V3ZM1 3l6 5.5L13 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ══════════════════════════════════════════
   COMPONENTE PRINCIPAL
═══════════════════════════════════════════ */
export default function Informaccion() {
  const router = useRouter();

  const [course, setCourse] = useState<CourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* Regalo: estado de revelación */
  const [giftRevealed, setGiftRevealed] = useState(false);

  /* Guía PDF: URL activa (asset local por defecto, reemplazable por superadmin) */
  const [guiaUrl, setGuiaUrl] = useState<string>(GUIA_PDF_DEFAULT);
  const guiaInputRef = useRef<HTMLInputElement>(null);

  /* Simula contexto de auth — reemplazar con tu useAuth() real */
  const isSuperAdmin = false; // ← reemplazar: const { user } = useAuth(); isSuperAdmin = user?.role === "superadmin"

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        const res = await fetch(`${BASE_URL}/courses/active`);
        if (!res.ok) throw new Error("No se encontró ningún curso activo en este momento.");
        const ct = res.headers.get("content-type");
        if (!ct?.includes("application/json"))
          throw new Error("Error en la respuesta del servidor (No se recibió JSON).");
        const data: unknown = await res.json();
        if (data && typeof data === "object" && "_id" in data) {
          setCourse(data as CourseData);
        } else {
          throw new Error("El curso encontrado no contiene una estructura válida.");
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido.");
      } finally {
        setLoading(false);
      }
    };
    fetchCourse();
  }, []);

  const scrollToPrivacy = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    document.getElementById("privacy-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const handleInscription = useCallback(() => {
    router.push("/inscription");
  }, [router]);

  /* Superadmin: reemplazar PDF de la guía */
  const handleGuiaUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const objectUrl = URL.createObjectURL(file);
    setGuiaUrl(objectUrl);
  }, []);

  /* Valores seguros del curso */
  const {
    titulo = "",
    descripcion = "",
    duracion = "",
    clases = "",
    duracionClase = "",
    cargaTotal = "",
    modalidad = "",
    nivel = "",
    precio,
    moneda = "ARS",
    tieneDescuento = false,
    descuentoPorcentaje = 0,
    contenidos = [],
    audiencia = [],
    tieneCodigoPromo = false,
  } = course ?? {};

  const precioNumero = parsePrecio(precio);
  const precioMostrado = Math.round(precioNumero).toLocaleString("es-AR");
  const monedaMostrada = moneda === "USD" ? "U$D" : "$";
  const precioConDesc =
    tieneDescuento && precioNumero > 0
      ? Math.round(precioNumero * (1 - descuentoPorcentaje / 100))
      : null;

  const hasCourse = !loading && !error && course !== null;

  return (
    <div className="ic-container">

      {/* ── Banner privacidad ── */}
      <div className="ic-privacy-banner">
        <a href="#privacy-section" onClick={scrollToPrivacy} className="ic-privacy-link">
          <svg className="ic-privacy-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          Uso de Datos Personales
        </a>
      </div>

      {/* ══════════════════ HERO ══════════════════ */}
      <section className="ic-hero">
        <div className="ic-hero-bg-orb" aria-hidden="true" />
        <div className="ic-hero-content">
          <div className="ic-badge">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="ic-badge-icon">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
            </svg>
            <span>Certificación Avalada</span>
          </div>

          <h1 className="ic-hero-title">
            {loading ? "Cargando curso…" : (titulo || "Introducción a la I.A. y Cuidados Digitales")}
          </h1>

          <p className="ic-hero-desc">
            {descripcion ||
              "Aprenderás a dar tus primeros pasos con herramientas de I.A. y, en paralelo, a proteger tu identidad digital, cuidar tu privacidad en línea y desarrollar el pensamiento crítico necesario para navegar internet de forma segura, responsable y saludable."}
          </p>

          <p className="ic-hero-tagline">
            Este curso nace con una idea simple:{" "}
            <strong>acercar el conocimiento a las personas</strong>, sin miedo, sin tecnicismos y con sentido humano.
          </p>

          {hasCourse && (
            <button className="ic-cta-hero" onClick={handleInscription}>
              Inscribirme Ahora
            </button>
          )}
        </div>
      </section>

      {/* ══════════════════ ESTADOS DE CARGA/ERROR ══════════════════ */}
      {loading && (
        <div className="ic-status-box ic-status-loading">
          <span className="ic-spinner" aria-hidden="true" />
          Cargando información del curso…
        </div>
      )}

      {!loading && (error || !course) && (
        <div className="ic-status-box ic-status-error">
          <svg style={{ width: 40, height: 40, color: "#ef4444", marginBottom: "0.75rem" }} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <h3>Información temporalmente no disponible</h3>
          <p>{error ?? "No pudimos conectar con el servidor de inscripciones."}</p>
        </div>
      )}

      {hasCourse && (
        <>
          {/* ══════════════════ CONTENIDOS ══════════════════ */}
          {contenidos.length > 0 && (
            <section className="ic-section ic-section--light">
              <div className="ic-section-inner">
                <h2 className="ic-section-title">
                  {duracion ? `Durante ${duracion} vas a aprender` : "¿Qué vas a aprender?"}
                </h2>
                <div className="ic-cards-grid">
                  {contenidos.map((item, i) => (
                    <div className="ic-card" key={i}>
                      <div className="ic-card-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
                          {renderIcono(item.icono ?? "")}
                        </svg>
                      </div>
                      <h3>{item.titulo}</h3>
                      <p>{item.descripcion}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ MODALIDAD ══════════════════ */}
          <section className="ic-section">
            <div className="ic-section-inner">
              <h2 className="ic-section-title">Modalidad del Curso</h2>
              <div className="ic-modality-grid">
                {duracion && <ModalidadItem label="Duración" value={duracion} />}
                {clases && <ModalidadItem label="Clases" value={clases} />}
                {duracionClase && <ModalidadItem label="Duración por encuentro" value={duracionClase} />}
                {cargaTotal && <ModalidadItem label="Carga total" value={cargaTotal} />}
                {modalidad && <ModalidadItem label="Modalidad" value={modalidad} />}
                {nivel && <ModalidadItem label="Nivel" value={nivel} />}
              </div>
            </div>
          </section>

          {/* ══════════════════ AUDIENCIA ══════════════════ */}
          {audiencia.length > 0 && (
            <section className="ic-section ic-section--light">
              <div className="ic-section-inner ic-text-center">
                <h2 className="ic-section-title">¿Para quién es este curso?</h2>
                <div className="ic-tags">
                  {audiencia.map((tag, i) => (
                    <span className="ic-tag" key={i}>{tag}</span>
                  ))}
                </div>
              </div>
            </section>
          )}

          {/* ══════════════════ PRECIO ══════════════════ */}
          <section className="ic-pricing-wrap">
            <div className="ic-section-inner">
              <div className="ic-pricing-card">
                <div className="ic-pricing-card-stripe" aria-hidden="true" />
                <h2 className="ic-pricing-title">Inversión en tu Aprendizaje</h2>

                <div className="ic-prices">
                  {tieneDescuento && (
                    <div className="ic-price ic-price--original">
                      <span className="ic-currency">{monedaMostrada}</span>
                      <span className="ic-amount">{precioMostrado}</span>
                    </div>
                  )}
                  <div className="ic-price ic-price--current">
                    <span className="ic-currency">{monedaMostrada}</span>
                    <span className="ic-amount">
                      {tieneDescuento && precioConDesc !== null
                        ? precioConDesc.toLocaleString("es-AR")
                        : precioMostrado}
                    </span>
                  </div>
                </div>

                <p className="ic-price-desc">
                  {tieneDescuento ? `Precio con ${descuentoPorcentaje}% de descuento · ` : ""}
                  Valor total{duracion ? ` por ${duracion}` : ""}
                </p>

                {tieneCodigoPromo && (
                  <div className="ic-promo-aviso">
                    <strong>¡Inscribite y puede que te lleves algo más!</strong>{" "}
                    Sorteamos códigos de descuento exclusivos entre los participantes.
                  </div>
                )}

                <button className="ic-cta" onClick={handleInscription}>
                  Inscribirme Ahora
                </button>
              </div>
            </div>
          </section>
        </>
      )}

      {/* ══════════════════ REGALO / ANTICIPACIÓN ══════════════════ */}
      <section className="ic-section ic-section--light">
        <div className="ic-section-inner ic-text-center">
          <div className={`ic-gift-card${giftRevealed ? " ic-gift-card--open" : ""}`}>
            <div className="ic-gift-ribbon" aria-hidden="true" />

            {!giftRevealed ? (
              <div className="ic-gift-front">
                <IconGift />
                <h3 className="ic-gift-title">Hay algo esperándote</h3>
                <p className="ic-gift-hint">Al inscribirte, recibís recursos exclusivos antes de la primera clase.</p>
                <button
                  className="ic-gift-btn"
                  onClick={() => setGiftRevealed(true)}
                  aria-label="Abrir regalo"
                >
                  Ver qué es →
                </button>
              </div>
            ) : (
              <div className="ic-gift-reveal">
                <IconBook />
                <h3 className="ic-gift-title">Guía de Empatía Digital para Familias</h3>
                <p>
                  Un PDF gratuito con herramientas prácticas para acompañar a niños y adultos mayores
                  en el mundo digital, pensado con calidez y sin tecnicismos.
                </p>
                <a
                  href={guiaUrl}
                  download="Guía Empatía Digital.pdf"
                  className="ic-gift-download-btn"
                >
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                    <path d="M7 2v7M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Descargar Guía PDF
                </a>
                <p className="ic-gift-coming">
                  + Más materiales se irán desbloqueando durante el curso.
                </p>

                {/* Control superadmin para reemplazar el PDF */}
                {isSuperAdmin && (
                  <div className="ic-gift-admin">
                    <span className="ic-gift-admin-label">Superadmin · Reemplazar PDF</span>
                    <label htmlFor="guia-upload" className="ic-gift-admin-btn">
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                        <path d="M7 10V3M4 6l3-3 3 3M2 11h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Subir nueva guía
                    </label>
                    <input
                      id="guia-upload"
                      type="file"
                      accept=".pdf"
                      ref={guiaInputRef}
                      style={{ display: "none" }}
                      onChange={handleGuiaUpload}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ══════════════════ PRESENTACIÓN DOCENTE ══════════════════ */}
      <section className="ic-section">
        <div className="ic-section-inner">
          <h2 className="ic-section-title">Quién está detrás del curso</h2>
          <div className="ic-author-card">
            <div className="ic-author-avatar-wrap">
              <Image
                src={avatarSrc}
                alt="Foto de Gabriel Reynoso"
                width={100}
                height={100}
                className="ic-author-avatar"
              />
              <div className="ic-author-badge-dot" aria-hidden="true" />
            </div>
            <div className="ic-author-body">
              <p className="ic-author-name">Gabriel Reynoso</p>
              <p className="ic-author-role">Acompañante Terapéutico · Desarrollador IA · Rosario, desde 2012</p>
              <p className="ic-author-bio">
                Desde 2014 comencé a explorar el mundo digital creando aplicaciones educativas con App Inventor
                del MIT, y en 2017 leí por primera vez sobre los modelos <strong>transformer</strong>, lo que
                despertó en mí un profundo interés por la inteligencia artificial. Ese recorrido técnico se fue
                integrando con mi vocación por el acompañamiento en salud mental.
              </p>
              <p className="ic-author-bio">
                En <strong>2024</strong> unifiqué mis conocimientos en IA y programación con mi formación como
                acompañante terapéutico, modalidad avalada por la{" "}
                <strong>Universidad Nacional de Rosario (UNR)</strong> y que ejerzo empíricamente desde 2012.
                Hoy acompaño a personas y familias a tomar decisiones más conscientes frente a la tecnología,
                combinando calidez humana con comprensión técnica.
              </p>

              <Link href="/registro" className="ic-author-subscribe-btn">
                <IconMail />
                Suscribite para recibir novedades
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════ TÉRMINOS Y CONDICIONES ══════════════════ */}
      <section className="ic-section ic-section--light ic-privacy-section" id="privacy-section">
        <div className="ic-section-inner">
          <div className="ic-privacy-container">
            <h2 className="ic-privacy-title">Términos y Condiciones de Uso de Datos Personales</h2>
            <div className="ic-privacy-content">

              <PrivacyBlock num="1" title="Recopilación de Datos">
                Al inscribirte en {titulo ? `el curso "${titulo}"` : "nuestras capacitaciones"}, recopilamos
                información personal básica como tu nombre completo, número de documento, correo electrónico,
                número de teléfono o WhatsApp y país de residencia, con el fin único de gestionar el acceso,
                la facturación y la comunicación directa del trayecto formativo.
              </PrivacyBlock>

              <PrivacyBlock num="2" title="Consentimiento Informado">
                Al completar de forma voluntaria el formulario de inscripción y aceptar las presentes
                condiciones, nos otorgás tu consentimiento expreso para que procesemos tus datos estrictamente
                dentro de los límites aquí descritos, cumpliendo con la normativa vigente sobre el cuidado
                de la información.
              </PrivacyBlock>

              <PrivacyBlock num="3" title="Finalidad del Tratamiento">
                <p>Tus datos personales recolectados serán utilizados únicamente para los siguientes propósitos específicos:</p>
                <ul>
                  <li>Validar la identidad del alumno y tramitar su inscripción formal.</li>
                  <li>Enviar confirmaciones de pago, accesos técnicos al aula virtual y material complementario.</li>
                  <li>Establecer canales de comunicación grupal o individual de soporte mediante correo o plataformas de mensajería (como WhatsApp).</li>
                  <li>Confeccionar y emitir la certificación final del curso una vez cumplidos los requisitos académicos.</li>
                </ul>
              </PrivacyBlock>

              <PrivacyBlock num="4" title="Confidencialidad y Custodia">
                Nos comprometemos de manera ineludible a no vender, alquilar, transferir, ceder, ni divulgar
                bajo ningún concepto tus datos personales a terceros comerciales, empresas externas o agencias
                de marketing sin tu autorización explícita previa.
              </PrivacyBlock>

              <PrivacyBlock num="5" title="Seguridad del Almacenamiento">
                La información recopilada se almacena en bases de datos protegidas mediante firewalls,
                protocolos seguros de transferencia de datos y restricciones estrictas de acceso. Solo
                personal autorizado tiene acceso físico o digital a tus registros.
              </PrivacyBlock>

              <PrivacyBlock num="6" title="Comunicaciones Académicas y Promocionales">
                Podremos utilizar tu dirección de correo electrónico o número de WhatsApp para notificarte
                sobre avisos urgentes de clases, actualizaciones críticas de contenido o avisos puntuales de
                nuevas convocatorias formativas organizadas por nosotros, contando siempre con la posibilidad
                de solicitar la baja de dichos envíos.
              </PrivacyBlock>

              <PrivacyBlock num="7" title="Retención de la Información">
                Conservaremos tus datos de alumno y la constancia de tu cursada por un período prudencial
                para garantizar la validez a largo plazo del certificado emitido y permitirte solicitar
                duplicados en el futuro si así lo requirieras.
              </PrivacyBlock>

              <PrivacyBlock num="8" title="Uso de Cookies y Tecnologías de Terceros">
                Nuestra plataforma puede emplear cookies técnicas y herramientas analíticas internas
                estándar para optimizar el rendimiento del proceso de inscripción y mejorar la experiencia
                de usuario dentro de la web, sin perfilar de forma invasiva tus hábitos de navegación.
              </PrivacyBlock>

              <PrivacyBlock num="9" title="Limitación de Responsabilidad Técnica">
                Si bien implementamos las mejores prácticas de seguridad digital, no nos hacemos responsables
                por filtraciones maliciosas fortuitas derivadas de ciberataques imprevisibles que escapen a
                las capacidades de control técnico estándar del mercado actual.
              </PrivacyBlock>

              <PrivacyBlock num="10" title="Menores de Edad">
                Nuestras capacitaciones están orientadas a mayores de edad o a menores que cuenten con la
                expresa supervisión y autorización formal de sus progenitores o tutores legales al momento
                de enviar el formulario.
              </PrivacyBlock>

              <PrivacyBlock num="11" title="Modificaciones en la Política">
                Nos reservamos el derecho de actualizar o modificar estas cláusulas para adaptarlas a nuevas
                exigencias legales o estructurales del servicio. Cualquier cambio sustancial se notificará de
                forma transparente a través de los canales de contacto provistos o mediante la actualización
                de la fecha de cabecera de este documento.
              </PrivacyBlock>

              <PrivacyBlock num="12" title="Canales de Contacto Oficiales">
                <p>
                  Para ejercer tus derechos de acceso, rectificación o eliminación de tus datos personales,
                  podés contactarnos de forma directa mediante cualquiera de las siguientes vías de atención:
                </p>
                <div className="ic-contact-channels">
                  <div className="ic-contact-item">
                    <span className="ic-contact-label">Email</span>
                    <div className="ic-contact-value">
                      <a className="ic-link-cel" href="mailto:empatiadigital2025@gmail.com">
                        empatiadigital2025@gmail.com
                      </a>
                    </div>
                  </div>
                  <div className="ic-contact-item">
                    <span className="ic-contact-label">WhatsApp</span>
                    <div className="ic-contact-value">
                      <a className="ic-link-cel" href="https://wa.me/5493413559329" target="_blank" rel="noopener noreferrer">
                        +54 341 355-9329
                      </a>
                    </div>
                  </div>
                </div>
              </PrivacyBlock>

              <div className="ic-privacy-footer">
                <p>Última actualización: Junio 2026</p>
                <p>Empatía Digital</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Botón flotante ── */}
      {hasCourse && (
        <button className="ic-floating-btn" onClick={handleInscription}>
          Inscribirme Ahora
        </button>
      )}
    </div>
  );
}

/* ── Sub-componentes internos ── */
function ModalidadItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="ic-modality-item">
      <span className="ic-modality-label">{label}</span>
      <span className="ic-modality-value">{value}</span>
    </div>
  );
}

function PrivacyBlock({
  num,
  title,
  children,
}: {
  num: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="ic-privacy-block">
      <h3>
        <span className="ic-privacy-num">{num}.</span> {title}
      </h3>
      {typeof children === "string" ? <p>{children}</p> : children}
    </div>
  );
}
