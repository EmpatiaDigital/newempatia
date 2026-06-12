"use client";

import React, { useState } from "react";
import Swal from "sweetalert2";
import { User, Mail, Phone, MapPin, UserPlus, Loader2 } from "lucide-react";
import "../style/Register.css";

// ── Types ──────────────────────────────────────────────────────────────────

const EMPTY_FORM = {
  nombre: "",
  apellido: "",
  correo: "",
  telefono: "",
  ciudad: "",
};

export default function SocioRegister() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    setSubmitting(true);

    const { nombre, apellido, correo, telefono, ciudad } = form;
    const payload = { nombre, apellido, correo, telefono, ciudad };

    try {
      const res = await fetch(
        "http://localhost:5000/api/register",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (data.success) {
        await Swal.fire({
          icon: "success",
          title: "¡Registro exitoso!",
          html: `Tu usuario y contraseña fueron enviados a <b>${form.correo}</b>.`,
          confirmButtonColor: "#10b981",
        });
        window.location.href = "/login";
        setForm(EMPTY_FORM);
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.message ?? "Fallo en el registro",
          confirmButtonColor: "#7c3aed",
        });
      }
    } catch {
      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Fallo del servidor",
        confirmButtonColor: "#7c3aed",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="register-page">
      <div className="register-card">
        {/* Vertical accent spine */}
        <div className="register-spine" aria-hidden="true" />

        <div className="register-inner">
          {/* Header */}
          <header className="register-header">
            <span className="register-eyebrow">Bienvenido</span>
            <h1 className="register-title">Crear cuenta</h1>
            <p className="register-subtitle">
              Completá tus datos y te enviamos el acceso por correo.
            </p>
          </header>

          {/* Form */}
          <form onSubmit={handleSubmit} className="register-form" noValidate>
            {/* Row: Nombre + Apellido */}
            <div className="register-row">
              <Field
                icon={<User size={16} />}
                label="Nombre"
                name="nombre"
                type="text"
                placeholder="Juan"
                value={form.nombre}
                onChange={handleChange}
                required
              />
              <Field
                icon={<User size={16} />}
                label="Apellido"
                name="apellido"
                type="text"
                placeholder="Pérez"
                value={form.apellido}
                onChange={handleChange}
                required
              />
            </div>

            {/* Correo */}
            <Field
              icon={<Mail size={16} />}
              label="Correo electrónico"
              name="correo"
              type="email"
              placeholder="juan@ejemplo.com"
              value={form.correo}
              onChange={handleChange}
              required
            />

            {/* Teléfono */}
            <Field
              icon={<Phone size={16} />}
              label="Teléfono"
              name="telefono"
              type="text"
              placeholder="+54 9 11 0000-0000 (opcional)"
              value={form.telefono}
              onChange={handleChange}
            />

            {/* Ciudad */}
            <Field
              icon={<MapPin size={16} />}
              label="Ciudad"
              name="ciudad"
              type="text"
              placeholder="Buenos Aires"
              value={form.ciudad}
              onChange={handleChange}
            />

            <button
              type="submit"
              className="register-submit"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 size={18} className="register-spin" />
                  Registrando…
                </>
              ) : (
                <>
                  <UserPlus size={18} />
                  Registrarse
                </>
              )}
            </button>
          </form>

          <p className="register-login-hint">
            ¿Ya tenés cuenta?{" "}
            <a href="/login" className="register-login-link">
              Iniciar sesión
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Field sub-component ────────────────────────────────────────────────────

function Field({ icon, label, name, type, placeholder, value, onChange, required = false }: {
  icon: React.ReactNode;
  label: string;
  name: string;
  type: string;
  placeholder: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
}) {
  return (
    <div className="register-field">
      <label className="register-label" htmlFor={name}>
        <span className="register-label-icon">{icon}</span>
        {label}
        {required && <span className="register-required">*</span>}
      </label>
      <div className="register-input-wrap">
        <input
          id={name}
          className="register-input"
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          required={required}
          autoComplete="off"
        />
      </div>
    </div>
  );
}