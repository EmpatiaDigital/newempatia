"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import Swal from 'sweetalert2';
import '../style/Inscription.css';

import logo1 from '../assets/logo1.png';
import logo2 from '../assets/logo2.png';
import logo3 from '../assets/empatialog.jpeg';

const BASE_URL = 'https://empatia-dominio-back.vercel.app/api';

const TURNO_VALUE_MAP: Record<string, string> = {
  manana:     'mañana',
  tarde:      'tarde',
  indistinto: 'indistinto',
};

interface Course {
  _id: string;
  titulo: string;
  descripcion?: string;
  imagenPrincipal?: string;
  duracion?: string;
  modalidad?: string;
  precio?: string | number;
  moneda?: string;
  cuposTotal?: number;
  cuposDisponibles?: number;
  turnosHabilitados?: string[];
  tieneDescuento?: boolean;
  descuentoPorcentaje?: number;
  tieneCodigoPromo?: boolean;
  imagenesGaleria?: { url: string }[];
}

interface InscriptionsStats {
  manana: number;
  tarde: number;
  indistinto: number;
  total: number;
  cuposTotal: number;
  cuposDisponibles: number;
}

interface FormData {
  nombre: string;
  apellido: string;
  email: string;
  celular: string;
  turnoPreferido: string;
  aceptaTerminos: boolean;
}

const Inscription = () => {
  const router = useRouter();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [inscriptionsStats, setInscriptionsStats] = useState<InscriptionsStats>({
    manana: 0, tarde: 0, indistinto: 0,
    total: 0, cuposTotal: 0, cuposDisponibles: 0,
  });
  const [formData, setFormData] = useState<FormData>({
    nombre: '', apellido: '', email: '', celular: '',
    turnoPreferido: '', aceptaTerminos: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState<boolean>(false);

  const courseIdRef = useRef<string | null>(null);

  const avaladores = [
    { id: 'logo1', logo: logo1, nombre: 'Grupo Educativo Austral' },
    { id: 'logo2', logo: logo2, nombre: 'Comisión Psicosocial Latinoamericana' },
    { id: 'logo3', logo: logo3, nombre: 'Salud Digital' },
  ];

  const refreshAll = useCallback(async () => {
    try {
      const courseRes = await fetch(`${BASE_URL}/courses/active`);
      if (!courseRes.ok) {
        setCourse(null);
        return;
      }
      const freshCourse: Course = await courseRes.json();
      if (!freshCourse || !freshCourse._id) {
        setCourse(null);
        return;
      }
      setCourse(freshCourse);
      courseIdRef.current = freshCourse._id;

      const statsRes = await fetch(
        `${BASE_URL}/inscriptions/estadisticas/${freshCourse._id}`
      );
      if (!statsRes.ok) return;
      const data = await statsRes.json();
      const stats = data.data || data;

      setInscriptionsStats({
        manana:           stats.porTurno?.manana     || stats.porTurno?.mañana || 0,
        tarde:            stats.porTurno?.tarde      || 0,
        indistinto:       stats.porTurno?.indistinto || 0,
        total:            stats.activos              || 0,
        cuposTotal:       freshCourse.cuposTotal     || freshCourse.cuposDisponibles || 0,
        cuposDisponibles: stats.cuposDisponibles     ?? 0,
      });
    } catch {
      setCourse(null);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await refreshAll();
      setLoading(false);
    };
    init();
  }, [refreshAll]);

  useEffect(() => {
    const interval = setInterval(refreshAll, 10000);
    return () => clearInterval(interval);
  }, [refreshAll]);

  const getCuposDisponiblesPorTurno = (turno: string): number => {
    const cuposTotal = inscriptionsStats.cuposTotal || course?.cuposTotal || 0;
    if (!cuposTotal) return 0;
    const mitad = Math.floor(cuposTotal / 2);
    const mitadIndistinto = Math.floor(inscriptionsStats.indistinto / 2);
    if (turno === 'manana') {
      return Math.max(0, mitad - inscriptionsStats.manana - mitadIndistinto);
    }
    if (turno === 'tarde') {
      const restoIndistinto = inscriptionsStats.indistinto - mitadIndistinto;
      return Math.max(0, mitad - inscriptionsStats.tarde - restoIndistinto);
    }
    return 0;
  };

  const isTurnoLleno = (turno: string): boolean => getCuposDisponiblesPorTurno(turno) <= 0;

  const isCursoLleno = (): boolean => {
    const cuposTotal = inscriptionsStats.cuposTotal || course?.cuposTotal || 0;
    if (!cuposTotal) return false;
    return inscriptionsStats.total >= cuposTotal;
  };

  const getTurnosHabilitados = (): string[] => {
    if (course?.turnosHabilitados && course.turnosHabilitados.length > 0) {
      return course.turnosHabilitados;
    }
    return ['manana', 'tarde', 'indistinto'];
  };

  const renderTurnoLabel = (turno: string): string => {
    const labels: Record<string, string> = { manana: 'Mañana', tarde: 'Tarde', indistinto: 'Indistinto' };
    return labels[turno] || turno;
  };

  const renderTurnoText = (turno: string): string => {
    const lleno = isTurnoLleno(turno);
    return lleno ? `${renderTurnoLabel(turno)} - Cupo Lleno` : renderTurnoLabel(turno);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!formData.nombre.trim())   newErrors.nombre         = 'El nombre es obligatorio';
    if (!formData.apellido.trim()) newErrors.apellido       = 'El apellido es obligatorio';
    if (!formData.email.trim()) {
      newErrors.email = 'El email es obligatorio';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email inválido';
    }
    if (!formData.celular.trim())  newErrors.celular        = 'El celular es obligatorio';
    if (!formData.turnoPreferido)  newErrors.turnoPreferido = 'Debe seleccionar un turno';
    if (!formData.aceptaTerminos)  newErrors.aceptaTerminos = 'Debe aceptar los términos y condiciones';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!validateForm()) {
      Swal.fire({
        icon: 'warning',
        title: 'Formulario incompleto',
        text: 'Por favor complete todos los campos requeridos',
        confirmButtonColor: '#3085d6',
      });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...formData,
        turnoPreferido: TURNO_VALUE_MAP[formData.turnoPreferido] ?? formData.turnoPreferido,
        courseId: course!._id,
      };

      const response = await fetch(`${BASE_URL}/inscriptions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok) {
        await refreshAll();

        await Swal.fire({
          icon: 'success',
          title: 'Inscripción Exitosa',
          html: `
            <div style="text-align: left; padding: 20px;">
              <p style="font-size: 16px; margin-bottom: 15px;">
                Gracias por inscribirte al curso <strong>${course!.titulo}</strong>
              </p>
              <div style="background-color: #f0f8ff; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin-bottom: 10px;">
                  Te hemos enviado un <strong>correo electrónico</strong> a <strong>${formData.email}</strong> con:
                </p>
                <div style="margin-left: 20px;">
                  <p style="margin: 5px 0;">- Confirmación de tu inscripción</p>
                  <p style="margin: 5px 0;">- Detalles del curso</p>
                  <p style="margin: 5px 0;">- <strong>Enlace al grupo de WhatsApp</strong> del curso</p>
                </div>
              </div>
              <div style="background-color: #e8f5e9; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                <p style="margin-top: 10px;">
                  <strong>No olvides revisar tu correo y unirte al grupo de WhatsApp.</strong>
                  <br />
                  Allí compartiremos información importante sobre el curso.
                </p>
              </div>
              <p style="font-size: 14px; color: #666; text-align: center;">
                Serás redirigido al inicio en 10 segundos...
              </p>
            </div>
          `,
          confirmButtonText: 'Volver al Inicio Ahora',
          confirmButtonColor: '#3085d6',
          showCancelButton: true,
          cancelButtonText: 'Nueva Inscripción',
          cancelButtonColor: '#6c757d',
          allowOutsideClick: false,
          timer: 10000,
          timerProgressBar: true,
        }).then((result) => {
          if (result.isConfirmed || result.dismiss === Swal.DismissReason.timer) {
            router.push('/information');
          } else if (result.dismiss === Swal.DismissReason.cancel) {
            setFormData({
              nombre: '', apellido: '', email: '', celular: '',
              turnoPreferido: '', aceptaTerminos: false,
            });
            setErrors({});
          }
        });

      } else {
        Swal.fire({
          icon: 'error',
          title: 'Error al inscribirse',
          text: data.message || 'Error al enviar la inscripción. Por favor, intente nuevamente.',
          confirmButtonColor: '#3085d6',
        });
      }
    } catch {
      Swal.fire({
        icon: 'error',
        title: 'Error de conexión',
        text: 'Error de conexión. Por favor, intente nuevamente.',
        confirmButtonColor: '#3085d6',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleVolverInicio      = () => router.push('/');
  const handleConsultarWhatsApp = () => {
    const mensaje = encodeURIComponent(
      'Hola! Me interesa obtener información sobre próximos cursos. ¿Podrían ayudarme?'
    );
    window.open(`https://wa.me/5493413559329?text=${mensaje}`, '_blank');
  };

  if (loading) {
    return (
      <div className="inscription-container">
        <div className="loading">Cargando...</div>
      </div>
    );
  }

  if (!course) {
    return (
      <div className="inscription-container">
        <div className="no-courses-container">
          <div className="no-courses-content">
            <div className="no-courses-icon">Cursos</div>
            <h2 className="no-courses-title">Por el momento no hay cursos disponibles</h2>
            <p className="no-courses-text">Estamos preparando nuevos cursos para ti.</p>
            <p className="no-courses-subtext">
              Si deseas obtener información sobre próximas fechas y nuevos cursos,
              <br />
              <strong>contáctanos por WhatsApp.</strong>
            </p>
            <div className="no-courses-actions">
              <button className="btn-whatsapp" onClick={handleConsultarWhatsApp}>
                Consultar por WhatsApp
              </button>
              <button className="btn-volver" onClick={handleVolverInicio}>
                Volver al Inicio
              </button>
            </div>
            <div className="contact-info">
              <p>También puedes contactarnos al:</p>
              <a href="tel:+5493413559329" className="phone-link">+54 9 341 355 9329</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isCursoLleno()) {
    return (
      <div className="inscription-container">
        <div className="no-courses-container">
          <div className="no-courses-content">
            <div className="no-courses-icon">Curso Completo</div>
            <h2 className="no-courses-title">Curso Completo</h2>
            <p className="no-courses-text">
              El curso <strong>"{course.titulo}"</strong> ha alcanzado su capacidad máxima de inscripciones.
            </p>
            <p className="no-courses-subtext">
              ¿Te interesa este curso? Contáctanos por WhatsApp para conocer las próximas fechas.
            </p>
            <div className="no-courses-actions">
              <button className="btn-whatsapp" onClick={handleConsultarWhatsApp}>
                Consultar Próximas Fechas
              </button>
              <button className="btn-volver" onClick={handleVolverInicio}>
                Volver al Inicio
              </button>
            </div>
            <div className="contact-info">
              <p>También puedes contactarnos al:</p>
              <a href="tel:+5493413559329" className="phone-link">+54 9 341 355 9329</a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const cuposTotales      = inscriptionsStats.cuposTotal || course.cuposTotal || 0;
  const cuposRestantes    = Math.max(0, cuposTotales - inscriptionsStats.total);
  const porcentajeOcupado = cuposTotales > 0
    ? Math.min((inscriptionsStats.total / cuposTotales) * 100, 100)
    : 0;

  const turnosHabilitados = getTurnosHabilitados();

  return (
    <div className="inscription-container">

      {/* Hero */}
      <div className="course-hero">
        {course.imagenPrincipal && (
          <div style={{ position: 'relative', width: '100%', height: '100%' }}>
            <Image
              src={course.imagenPrincipal}
              alt={course.titulo}
              fill
              className="course-hero-image"
              style={{ objectFit: 'cover' }}
              sizes="100vw"
              priority
            />
          </div>
        )}
        <div className="course-hero-overlay">
          <div className="avaladores-section">
            <p className="avaladores-title">Curso avalado por:</p>
            <div className="avaladores-logos">
              {avaladores.map((avalador) => (
                <div key={avalador.id} className="avalador-logo-circle">
                  <Image
                    src={avalador.logo}
                    alt={avalador.nombre}
                    className="avalador-logo"
                    width={60}
                    height={60}
                    style={{ objectFit: 'contain' }}
                  />
                </div>
              ))}
            </div>
          </div>
          <h1 className="course-title">{course.titulo}</h1>
          <h4 className="course-description" style={{ color: '#ffffff' }}>{course.descripcion}</h4>
          <Link href="/information" className="btn-conocer-mas">Conocer Más</Link>
        </div>
      </div>

      <div className="form-wrapper">

        <div className="course-info">
          <h2>Información del Curso</h2>
          <div className="info-grid">
            <div className="info-item">
              <span className="info-label">Duración</span>
              <span className="info-value">{course.duracion || '30 horas cátedra'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Modalidad</span>
              <span className="info-value">{course.modalidad || 'Teórico-práctica'}</span>
            </div>
            <div className="info-item">
              <span className="info-label">Precio</span>
              <span className="info-value">{course.precio}</span>
            </div>
            {cuposTotales > 0 && (
              <div className="info-item">
                <span className="info-label">Cupos Totales</span>
                <span className="info-value">{cuposTotales} cupos</span>
              </div>
            )}
          </div>

          {/* Descuento */}
          {course.tieneDescuento && course.descuentoPorcentaje && (() => {
            const precioNumero = parseFloat(
              (course.precio || '').toString().replace(/[^\d.,]/g, '').replace(',', '.')
            );
            const descuento = course.descuentoPorcentaje;
            const precioConDescuento = !isNaN(precioNumero)
              ? Math.round(precioNumero * (1 - descuento / 100))
              : null;
            return (
              <div className="descuento-banner">
                <div className="descuento-badge">
                  <span className="descuento-porcentaje">-{descuento}%</span>
                  <span className="descuento-label">DESCUENTO ESPECIAL</span>
                </div>
                <div className="descuento-precios">
                  <span className="precio-original">Precio original: <s>{course.precio}</s></span>
                  {precioConDescuento !== null && (
                    <span className="precio-final">
                      Precio con descuento:{' '}
                      <strong>
                        {course.moneda === 'USD' ? 'U$D' : '$'}
                        {precioConDescuento.toLocaleString('es-AR')}
                      </strong>
                    </span>
                  )}
                </div>
              </div>
            );
          })()}

          {/* Código promo */}
          {course.tieneCodigoPromo && (
            <div className="promo-aviso promo-aviso--posible">
              <strong>¡Inscribite y puede que te lleves algo más!</strong>{' '}
              Sorteamos códigos de descuento exclusivos entre los participantes.
            </div>
          )}

          {/* Programa */}
          <div className="course-program-section" style={{ marginTop: '25px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
            <h3 style={{ fontSize: '20px', marginBottom: '15px', color: '#333' }}>Programa / Itinerario del Curso</h3>
            <div className="program-modules" style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>

              <div className="program-module" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '5px' }}>
                  <strong style={{ color: '#0056b3' }}>Módulo 1: Qué es la Inteligencia Artificial</strong>
                  <span style={{ fontSize: '12px', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>6 horas cátedra</span>
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                  <li>Conceptos básicos de Inteligencia Artificial</li>
                  <li>Mitos y verdades sobre la IA</li>
                  <li>Alcances y limitaciones: qué hace y qué no hace</li>
                  <li>Presencia de la IA en la vida cotidiana</li>
                  <li>Análisis de casos reales (mensajería, búsquedas, generación de textos e imágenes)</li>
                </ul>
              </div>

              <div className="program-module" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '5px' }}>
                  <strong style={{ color: '#0056b3' }}>Módulo 2: Inteligencia Artificial y personas</strong>
                  <span style={{ fontSize: '12px', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>8 horas cátedra</span>
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                  <li>Impacto de la IA en adultos mayores, jóvenes y niños</li>
                  <li>Cambios en los modos de comunicación, aprendizaje y trabajo</li>
                  <li>Dependencia digital y automatización</li>
                  <li>Sesgos, errores y límites de los sistemas de IA</li>
                  <li>El rol humano frente a la tecnología y la toma de decisiones</li>
                </ul>
              </div>

              <div className="program-module" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '5px' }}>
                  <strong style={{ color: '#0056b3' }}>Módulo 3: Cuidados digitales</strong>
                  <span style={{ fontSize: '12px', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>8 horas cátedra</span>
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                  <li>Privacidad y protección de datos personales</li>
                  <li>Riesgos digitales actuales: estafas, engaños y deepfakes</li>
                  <li>Uso responsable y consciente de herramientas de IA</li>
                  <li>Límites y responsabilidades (marco legal) en el uso de la tecnología</li>
                  <li>Prevención y criterio personal en entornos digitales</li>
                </ul>
              </div>

              <div className="program-module" style={{ background: '#f9f9f9', padding: '15px', borderRadius: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px', flexWrap: 'wrap', gap: '5px' }}>
                  <strong style={{ color: '#0056b3' }}>Módulo 4: Uso práctico y consciente de la IA</strong>
                  <span style={{ fontSize: '12px', background: '#e1f5fe', color: '#0288d1', padding: '2px 8px', borderRadius: '12px', fontWeight: 'bold' }}>6 horas cátedra</span>
                </div>
                <ul style={{ margin: '0', paddingLeft: '20px', fontSize: '14px', color: '#555', lineHeight: '1.5' }}>
                  <li>La IA como asistente o tutor, no como reemplazo</li>
                  <li>Aplicaciones prácticas para la organización personal, escritura, estudio y trabajo</li>
                  <li>Ejercicios simples y guiados</li>
                  <li>Buenas prácticas para un uso ético, humano y responsable</li>
                </ul>
              </div>

            </div>
          </div>

          {/* Barra de cupos */}
          <div className="cupos-progress-wrapper" style={{ marginTop: '25px' }}>
            <div className="cupos-progress-bar-track">
              <div
                className={`cupos-progress-bar-fill ${
                  porcentajeOcupado >= 83 ? 'urgente' : porcentajeOcupado >= 60 ? 'medio' : ''
                }`}
                style={{ width: `${porcentajeOcupado}%` }}
              />
            </div>
            <div className="cupos-progress-info">
              <p className="cupos-progress-texto">
                <strong>{cuposRestantes}</strong> cupos disponibles de <strong>{cuposTotales}</strong>
              </p>
              {cuposRestantes <= 5 && cuposRestantes > 0 && (
                <span className="cupos-urgencia">⚡ ¡Últimos lugares!</span>
              )}
            </div>
            {turnosHabilitados.filter((t: string) => t !== 'indistinto').length > 1 && (
              <div className="cupos-turnos">
                {turnosHabilitados.includes('manana') && (
                  <span className="cupos-turno-item">
                    Mañana: <strong>{getCuposDisponiblesPorTurno('manana')}</strong> disponibles
                  </span>
                )}
                {turnosHabilitados.includes('tarde') && (
                  <span className="cupos-turno-item">
                    Tarde: <strong>{getCuposDisponiblesPorTurno('tarde')}</strong> disponibles
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Galería */}
          {course.imagenesGaleria && course.imagenesGaleria.length > 0 && (
            <div className="gallery">
              <h3>Galería</h3>
              <div className="gallery-grid">
                {course.imagenesGaleria.map((img, index) => (
                  <div key={index} style={{ position: 'relative', aspectRatio: '4/3', overflow: 'hidden', borderRadius: '8px' }}>
                    <Image
                      src={img.url}
                      alt={`Imagen ${index + 1}`}
                      fill
                      className="gallery-image"
                      style={{ objectFit: 'cover' }}
                      sizes="(max-width: 768px) 100vw, 33vw"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Formulario */}
        <div className="form-container">
          <h2>Inscribite Ahora</h2>
          <form onSubmit={handleSubmit} className="inscription-form">

            <div className="form-group">
              <label htmlFor="nombre">Nombre *</label>
              <input type="text" id="nombre" name="nombre" value={formData.nombre}
                onChange={handleChange} className={errors.nombre ? 'error' : ''} placeholder="Tu nombre" />
              {errors.nombre && <span className="error-text">{errors.nombre}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="apellido">Apellido *</label>
              <input type="text" id="apellido" name="apellido" value={formData.apellido}
                onChange={handleChange} className={errors.apellido ? 'error' : ''} placeholder="Tu apellido" />
              {errors.apellido && <span className="error-text">{errors.apellido}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="email">Email *</label>
              <input type="email" id="email" name="email" value={formData.email}
                onChange={handleChange} className={errors.email ? 'error' : ''} placeholder="@email.com" />
              {errors.email && <span className="error-text">{errors.email}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="celular">Celular *</label>
              <input type="tel" id="celular" name="celular" value={formData.celular}
                onChange={handleChange} className={errors.celular ? 'error' : ''} placeholder="+54 xxx xxxx xxxx" />
              {errors.celular && <span className="error-text">{errors.celular}</span>}
            </div>

            <div className="form-group">
              <label>Turno Preferido *</label>
              <div className="radio-group">
                {turnosHabilitados.includes('manana') && (
                  <label className={`radio-label ${isTurnoLleno('manana') ? 'turno-lleno' : ''}`}>
                    <input type="radio" name="turnoPreferido" value="manana"
                      checked={formData.turnoPreferido === 'manana'}
                      onChange={handleChange} disabled={isTurnoLleno('manana')} />
                    <span>{renderTurnoText('manana')}</span>
                    {!isTurnoLleno('manana') && (
                      <span className="cupos-restantes">({getCuposDisponiblesPorTurno('manana')} cupos)</span>
                    )}
                  </label>
                )}
                {turnosHabilitados.includes('tarde') && (
                  <label className={`radio-label ${isTurnoLleno('tarde') ? 'turno-lleno' : ''}`}>
                    <input type="radio" name="turnoPreferido" value="tarde"
                      checked={formData.turnoPreferido === 'tarde'}
                      onChange={handleChange} disabled={isTurnoLleno('tarde')} />
                    <span>{renderTurnoText('tarde')}</span>
                    {!isTurnoLleno('tarde') && (
                      <span className="cupos-restantes">({getCuposDisponiblesPorTurno('tarde')} cupos)</span>
                    )}
                  </label>
                )}
                {turnosHabilitados.includes('indistinto') && (
                  <label className="radio-label">
                    <input type="radio" name="turnoPreferido" value="indistinto"
                      checked={formData.turnoPreferido === 'indistinto'} onChange={handleChange} />
                    <span>Indistinto</span>
                  </label>
                )}
              </div>
              {errors.turnoPreferido && <span className="error-text">{errors.turnoPreferido}</span>}
            </div>

            <div className="form-group checkbox-group">
              <label className="checkbox-label">
                <input type="checkbox" name="aceptaTerminos"
                  checked={formData.aceptaTerminos} onChange={handleChange} />
                <span>
                  Acepto los términos y condiciones y el tratamiento de mis datos personales
                  conforme a la política de privacidad *
                </span>
              </label>
              {errors.aceptaTerminos && <span className="error-text">{errors.aceptaTerminos}</span>}
            </div>

            <button type="submit" className="btn-submit" disabled={submitting}>
              {submitting ? 'Enviando...' : 'Inscribirme'}
            </button>

          </form>
        </div>
      </div>
    </div>
  );
};

export default Inscription;
