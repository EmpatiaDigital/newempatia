'use client';

import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import '../style/Superadmincourses.css';
import Link from 'next/link';

const API_BASE = 'https://newempatiabackend.vercel.app/api';

// ── Genera un código promo alfanumérico de 8 caracteres ──
const generarCodigoPromo = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 8 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

interface Horarios {
  manana: string;
  tarde: string;
}

interface Course {
  _id: string;
  titulo: string;
  descripcion: string;
  duracion: string;
  modalidad: string;
  precio: string;
  moneda: string;
  tieneDescuento: boolean;
  descuentoPorcentaje: string;
  tieneCodigoPromo: boolean;
  codigoPromo: string;
  cuposDisponibles: number;
  fechaInicio: string;
  horarios: Horarios;
  activo: boolean;
  imagenPrincipal?: string;
}

interface FormData {
  titulo: string;
  descripcion: string;
  duracion: string;
  modalidad: string;
  precio: string;
  moneda: string;
  tieneDescuento: boolean;
  descuentoPorcentaje: string;
  tieneCodigoPromo: boolean;
  codigoPromo: string;
  cuposDisponibles: number;
  fechaInicio: string;
  horarios: Horarios;
  activo: boolean;
}

const SuperAdminCourses = () => {
  const { user } = useAuth();
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [activeCourse, setActiveCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [formData, setFormData] = useState<FormData>({
    titulo: '',
    descripcion: '',
    duracion: '',
    modalidad: '',
    precio: '',
    moneda: 'ARS',
    tieneDescuento: false,
    descuentoPorcentaje: '',
    tieneCodigoPromo: false,
    codigoPromo: '',
    cuposDisponibles: 30,
    fechaInicio: '',
    horarios: {
      manana: '9:00 - 12:00',
      tarde: '14:00 - 17:00'
    },
    activo: false
  });

  // ── Protección de ruta ──
  useEffect(() => {
    if (!user || user.role !== 'superadmin') {
      Swal.fire({
        icon: 'error',
        title: 'Acceso Denegado',
        text: 'Solo el SuperAdmin puede acceder a esta sección',
        confirmButtonColor: '#4a90d9'
      });
      router.push('/');
    }
  }, [user, router]);

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    setLoading(true);
    try {
      const response = await fetch(`${API_BASE}/courses`);
      if (response.ok) {
        const data: Course[] = await response.json();
        setCourses(data);
        setActiveCourse(data.find(c => c.activo) ?? null);
      }
    } catch (error) {
      console.error('Error fetching courses:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudieron cargar los cursos', confirmButtonColor: '#4a90d9' });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const target = e.target as HTMLInputElement;
    const { name, value, type } = target;
    const checked = type === 'checkbox' ? target.checked : false;

    // ── Si se activa tieneCodigoPromo, genera código automáticamente ──
    if (name === 'tieneCodigoPromo') {
      setFormData(prev => ({
        ...prev,
        tieneCodigoPromo: checked,
        codigoPromo: checked ? generarCodigoPromo() : ''
      }));
      return;
    }

    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setFormData(prev => ({
        ...prev,
        [parent]: { ...(prev[parent as keyof FormData] as object), [child]: value }
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
    }
  };

  // ── Regenerar código promo manualmente ──
  const regenerarCodigo = () => {
    setFormData(prev => ({ ...prev, codigoPromo: generarCodigoPromo() }));
  };

  const emptyForm = (): FormData => ({
    titulo: '', descripcion: '', duracion: '', modalidad: '',
    precio: '', moneda: 'ARS',
    tieneDescuento: false, descuentoPorcentaje: '',
    tieneCodigoPromo: false, codigoPromo: '',
    cuposDisponibles: 30, fechaInicio: '',
    horarios: { manana: '9:00 - 12:00', tarde: '14:00 - 17:00' },
    activo: false
  });

  const openCreateModal = () => {
    setEditingCourse(null);
    setFormData(emptyForm());
    setShowModal(true);
  };

  const openEditModal = (course: Course) => {
    setEditingCourse(course);
    setFormData({
      titulo: course.titulo || '',
      descripcion: course.descripcion || '',
      duracion: course.duracion || '',
      modalidad: course.modalidad || '',
      precio: course.precio || '',
      moneda: course.moneda || 'ARS',
      tieneDescuento: course.tieneDescuento || false,
      descuentoPorcentaje: course.descuentoPorcentaje || '',
      tieneCodigoPromo: course.tieneCodigoPromo || false,
      codigoPromo: course.codigoPromo || '',
      cuposDisponibles: course.cuposDisponibles || 30,
      fechaInicio: course.fechaInicio ? course.fechaInicio.split('T')[0] : '',
      horarios: {
        manana: course.horarios?.manana || '9:00 - 12:00',
        tarde: course.horarios?.tarde || '14:00 - 17:00'
      },
      activo: course.activo || false
    });
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const payload = {
      ...formData,
      codigoPromo: formData.tieneCodigoPromo ? formData.codigoPromo : null,
      descuentoPorcentaje: formData.tieneDescuento ? formData.descuentoPorcentaje : null,
    };

    const url = editingCourse
      ? `${API_BASE}/courses/${editingCourse._id}`
      : `${API_BASE}/courses`;
    const method = editingCourse ? 'PUT' : 'POST';

    try {
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        Swal.fire({
          icon: 'success',
          title: editingCourse ? 'Curso Actualizado' : 'Curso Creado',
          text: editingCourse ? 'El curso se actualizó correctamente' : 'El curso se creó exitosamente',
          confirmButtonColor: '#4a90d9'
        });
        setShowModal(false);
        fetchCourses();
      } else {
        throw new Error('Error en la operación');
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo guardar el curso', confirmButtonColor: '#4a90d9' });
    }
  };

  const handleDelete = async (courseId: string) => {
    const result = await Swal.fire({
      title: '¿Estás seguro?',
      text: 'Esta acción no se puede deshacer',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e74c3c',
      cancelButtonColor: '#95a5a6',
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar'
    });
    if (result.isConfirmed) {
      try {
        const response = await fetch(`${API_BASE}/courses/${courseId}`, { method: 'DELETE' });
        if (response.ok) {
          Swal.fire({ icon: 'success', title: 'Eliminado', text: 'El curso se eliminó correctamente', confirmButtonColor: '#4a90d9' });
          fetchCourses();
        }
      } catch (error) {
        console.error('Error:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo eliminar el curso', confirmButtonColor: '#4a90d9' });
      }
    }
  };

  const handleToggleStatus = async (courseId: string) => {
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}/toggle-status`, { method: 'PATCH' });
      if (response.ok) {
        Swal.fire({ icon: 'success', title: 'Estado Actualizado', text: 'El estado del curso se actualizó correctamente', timer: 2000, showConfirmButton: false });
        fetchCourses();
      }
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo cambiar el estado del curso', confirmButtonColor: '#4a90d9' });
    }
  };

  const handleImageUpload = async (courseId: string, file: File, type: 'main' | 'gallery' = 'main') => {
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const endpoint = type === 'main' ? 'main' : 'gallery';
        const response = await fetch(`${API_BASE}/courses/${courseId}/image/${endpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: reader.result })
        });
        if (response.ok) {
          Swal.fire({ icon: 'success', title: 'Imagen Subida', text: 'La imagen se subió correctamente', timer: 2000, showConfirmButton: false });
          fetchCourses();
        }
      } catch (error) {
        console.error('Error:', error);
        Swal.fire({ icon: 'error', title: 'Error', text: 'No se pudo subir la imagen', confirmButtonColor: '#4a90d9' });
      }
    };
    reader.readAsDataURL(file);
  };

  const sendEnrollmentReportWhatsApp = async (courseId: string) => {
    try {
      const response = await fetch(`${API_BASE}/courses/${courseId}/enrollments`);
      if (!response.ok) throw new Error('No se pudieron obtener los inscritos');
      const enrollments = await response.json();
      const course = courses.find(c => c._id === courseId);
      if (!course) throw new Error('Curso no encontrado');

      let message = `📊 *REPORTE DE INSCRIPCIONES*\n\n`;
      message += `📚 *Curso:* ${course.titulo}\n`;
      message += `📅 *Fecha:* ${new Date().toLocaleDateString('es-AR')}\n`;
      message += `⏰ *Hora:* ${new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}\n\n`;
      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;

      if (enrollments.length === 0) {
        message += `ℹ️ *No hay inscripciones registradas*\n\n`;
      } else {
        message += `👥 *TOTAL INSCRITOS: ${enrollments.length}*\n\n`;
        const porTurno: Record<string, typeof enrollments> = {
          'mañana': enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'mañana'),
          'tarde': enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'tarde'),
          'indistinto': enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'indistinto')
        };
        const turnos: [string, string][] = [['mañana', '🌅'], ['tarde', '🌆'], ['indistinto', '🔄']];
        turnos.forEach(([turno, emoji]) => {
          if (porTurno[turno].length > 0) {
            message += `${emoji} *TURNO ${turno.toUpperCase()} (${porTurno[turno].length}):*\n\n`;
            porTurno[turno].forEach((enrollment: { nombre: string; apellido: string; celular: string; email: string; estado: string }, index: number) => {
              message += `${index + 1}. *${enrollment.nombre} ${enrollment.apellido}*\n`;
              message += `   📞 ${enrollment.celular || 'Sin teléfono'}\n`;
              message += `   📧 ${enrollment.email || 'Sin email'}\n`;
              message += `   ✅ Estado: ${enrollment.estado.toUpperCase()}\n\n`;
            });
          }
        });
      }

      message += `━━━━━━━━━━━━━━━━━━━━━━\n\n`;
      message += `📊 *RESUMEN DEL CURSO:*\n`;
      message += `• Total inscritos: ${enrollments.length}\n`;
      message += `• Cupos disponibles: ${course.cuposDisponibles}\n`;
      message += `• Precio: ${course.moneda === 'USD' ? 'USD' : '$'} ${course.precio}\n`;
      if (course.tieneDescuento) message += `• Descuento: ${course.descuentoPorcentaje}%\n`;
      if (course.tieneCodigoPromo) message += `• Código promo: ${course.codigoPromo}\n`;
      message += `• Duración: ${course.duracion}\n`;
      message += `• Modalidad: ${course.modalidad}\n\n`;

      const mananaCount = enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'mañana').length;
      const tardeCount = enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'tarde').length;
      const indistintoCount = enrollments.filter((e: { turnoPreferido: string }) => e.turnoPreferido === 'indistinto').length;
      message += `📈 *DISTRIBUCIÓN POR TURNO:*\n`;
      if (mananaCount > 0) message += `• Mañana: ${mananaCount}\n`;
      if (tardeCount > 0) message += `• Tarde: ${tardeCount}\n`;
      if (indistintoCount > 0) message += `• Indistinto: ${indistintoCount}\n`;
      message += `\n━━━━━━━━━━━━━━━━━━━━━━\n`;
      message += `_Reporte generado automáticamente_\n`;
      message += `_Sistema de Gestión Empatía Digital_`;

      window.open(`https://wa.me/5493413559329?text=${encodeURIComponent(message)}`, '_blank');
    } catch (error) {
      console.error('Error:', error);
      Swal.fire({ icon: 'error', title: 'Error', text: (error as Error).message || 'No se pudo generar el reporte', confirmButtonColor: '#4a90d9' });
    }
  };

  // ── Helpers de display ──
  const formatPrecio = (course: Course) => {
    if (!course.precio) return '—';
    const simbolo = course.moneda === 'USD' ? 'USD ' : '$ ';
    return `${simbolo}${course.precio}`;
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="spinner"></div>
        <p>Cargando cursos...</p>
      </div>
    );
  }

  return (
    <div className="superadmin-courses-container">

      {/* ── HEADER ── */}
      <div className="header">
        <div className="header-content">
          <h1>Gestión de Cursos</h1>
          <p>Panel exclusivo de SuperAdmin</p>
        </div>
        <button className="btn-create" onClick={openCreateModal}>
          + Crear Nuevo Curso
        </button>
      </div>

      {/* ── CURSO ACTIVO BANNER ── */}
      {activeCourse && (
        <div className="active-course-banner">
          <div className="banner-badge">★ CURSO ACTIVO</div>
          <h2>{activeCourse.titulo}</h2>
          <p>{activeCourse.descripcion}</p>
          <div className="banner-stats">
            <span>📅 {activeCourse.duracion}</span>
            <span>💰 {formatPrecio(activeCourse)}</span>
            {activeCourse.tieneDescuento && <span>🏷 -{activeCourse.descuentoPorcentaje}%</span>}
            {activeCourse.tieneCodigoPromo && <span>🎟 {activeCourse.codigoPromo}</span>}
            <span>👥 {activeCourse.cuposDisponibles} cupos</span>
          </div>
        </div>
      )}

      {/* ── GRID DE CURSOS ── */}
      <div className="courses-grid">
        {courses.map((course) => (
          <div key={course._id} className={`course-card ${course.activo ? 'active' : ''}`}>
            {course.activo && <div className="active-badge">★ ACTIVO</div>}

            {course.imagenPrincipal && (
              <div className="course-image">
                <img src={course.imagenPrincipal} alt={course.titulo} />
              </div>
            )}

            <div className="course-content">
              <h3>{course.titulo}</h3>
              <p className="course-description">{course.descripcion}</p>

              <div className="course-details">
                <div className="detail-item">
                  <span className="label">Duración</span>
                  <span className="value">{course.duracion}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Modalidad</span>
                  <span className="value">{course.modalidad}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Precio</span>
                  <span className="value">{formatPrecio(course)}</span>
                </div>
                {course.tieneDescuento && (
                  <div className="detail-item">
                    <span className="label">Descuento</span>
                    <span className="value promo-tag">−{course.descuentoPorcentaje}%</span>
                  </div>
                )}
                {course.tieneCodigoPromo && (
                  <div className="detail-item">
                    <span className="label">Código Promo</span>
                    <span className="value promo-tag">{course.codigoPromo}</span>
                  </div>
                )}
                <div className="detail-item">
                  <span className="label">Cupos</span>
                  <span className="value">{course.cuposDisponibles}</span>
                </div>
              </div>

              <div className="course-actions">
                <button className={`btn-toggle ${course.activo ? 'active' : ''}`} onClick={() => handleToggleStatus(course._id)}>
                  {course.activo ? '🔴 Desactivar' : '🟢 Activar'}
                </button>
                <button className="btn-edit" onClick={() => openEditModal(course)}>✏️ Editar</button>
                <button className="btn-delete" onClick={() => handleDelete(course._id)}>🗑️ Eliminar</button>
                <button className="btn-whatsapp" onClick={() => sendEnrollmentReportWhatsApp(course._id)} title="Enviar lista de inscritos por WhatsApp">
                  📱 Enviar Reporte
                </button>
                <Link href="/cursantes">Post</Link>
              </div>

              <div className="image-uploads">
                <div className="upload-section">
                  <label>📸 Imagen Principal</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(course._id, e.target.files[0], 'main');
                    }}
                    className="file-input"
                  />
                </div>
                <div className="upload-section">
                  <label>🖼️ Galería</label>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      if (e.target.files?.[0]) handleImageUpload(course._id, e.target.files[0], 'gallery');
                    }}
                    className="file-input"
                  />
                </div>
              </div>
            </div>
          </div>
        ))}

        {courses.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📚</div>
            <h3>No hay cursos creados</h3>
            <p>Crea tu primer curso para comenzar</p>
            <button className="btn-create" onClick={openCreateModal}>Crear Curso</button>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editingCourse ? '✏️ Editar Curso' : '➕ Crear Nuevo Curso'}</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>✕</button>
            </div>

            <form onSubmit={handleSubmit} className="course-form">

              <div className="form-group">
                <label>Título del Curso *</label>
                <input type="text" name="titulo" value={formData.titulo} onChange={handleInputChange} required placeholder="Ej: Curso de Formación en Empatía" />
              </div>

              <div className="form-group">
                <label>Descripción *</label>
                <textarea name="descripcion" value={formData.descripcion} onChange={handleInputChange} required rows={4} placeholder="Descripción detallada del curso" />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Duración</label>
                  <input type="text" name="duracion" value={formData.duracion} onChange={handleInputChange} placeholder="Ej: 3 meses" />
                </div>
                <div className="form-group">
                  <label>Modalidad</label>
                  <input type="text" name="modalidad" value={formData.modalidad} onChange={handleInputChange} placeholder="Ej: Presencial/Online" />
                </div>
              </div>

              {/* ── PRECIO + MONEDA ── */}
              <div className="form-row">
                <div className="form-group">
                  <label>Precio</label>
                  <div className="precio-input-group">
                    <select name="moneda" value={formData.moneda} onChange={handleInputChange} className="moneda-select">
                      <option value="ARS">$ ARS</option>
                      <option value="USD">USD</option>
                    </select>
                    <input type="text" name="precio" value={formData.precio} onChange={handleInputChange} placeholder="Ej: 50000" className="precio-input" />
                  </div>
                </div>
                <div className="form-group">
                  <label>Cupos Disponibles</label>
                  <input type="number" name="cuposDisponibles" value={formData.cuposDisponibles} onChange={handleInputChange} min="0" />
                </div>
              </div>

              {/* ── DESCUENTO ── */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="tieneDescuento" checked={formData.tieneDescuento} onChange={handleInputChange} />
                  <span>Aplicar descuento</span>
                </label>
                {formData.tieneDescuento && (
                  <div className="promo-field">
                    <input
                      type="number"
                      name="descuentoPorcentaje"
                      value={formData.descuentoPorcentaje}
                      onChange={handleInputChange}
                      placeholder="Porcentaje de descuento (ej: 20)"
                      min="1"
                      max="99"
                    />
                    <span className="promo-suffix">%</span>
                  </div>
                )}
              </div>

              {/* ── CÓDIGO PROMO ── */}
              <div className="form-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="tieneCodigoPromo" checked={formData.tieneCodigoPromo} onChange={handleInputChange} />
                  <span>Generar código promocional</span>
                </label>
                {formData.tieneCodigoPromo && (
                  <div className="promo-field">
                    <input
                      type="text"
                      name="codigoPromo"
                      value={formData.codigoPromo}
                      onChange={handleInputChange}
                      placeholder="Código promo"
                      readOnly
                      className="codigo-input"
                    />
                    <button type="button" className="btn-regenerar" onClick={regenerarCodigo} title="Generar nuevo código">
                      🔄
                    </button>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Fecha de Inicio</label>
                <input type="date" name="fechaInicio" value={formData.fechaInicio} onChange={handleInputChange} />
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Horario Mañana</label>
                  <input type="text" name="horarios.manana" value={formData.horarios.manana} onChange={handleInputChange} placeholder="9:00 - 12:00" />
                </div>
                <div className="form-group">
                  <label>Horario Tarde</label>
                  <input type="text" name="horarios.tarde" value={formData.horarios.tarde} onChange={handleInputChange} placeholder="14:00 - 17:00" />
                </div>
              </div>

              <div className="form-group checkbox-group">
                <label className="checkbox-label">
                  <input type="checkbox" name="activo" checked={formData.activo} onChange={handleInputChange} />
                  <span>Activar curso inmediatamente</span>
                </label>
              </div>

              <div className="modal-actions">
                <button type="button" className="btn-cancel" onClick={() => setShowModal(false)}>Cancelar</button>
                <button type="submit" className="btn-save">{editingCourse ? 'Actualizar' : 'Crear'} Curso</button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SuperAdminCourses;
