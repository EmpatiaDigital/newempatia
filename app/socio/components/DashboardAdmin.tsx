"use client";

import { useAuth } from "../../context/AuthContext";
import Swal from "sweetalert2";
import Logo from "../../assets/empatialog.jpeg";

export default function AdminDashboard() {
  const { user, logout } = useAuth();
  const handleLogout = (): void => {
    Swal.fire({
      title: "¿Cerrar sesión?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Sí, salir",
      cancelButtonText: "Cancelar",
      confirmButtonColor: "#dc2626",
      cancelButtonColor: "#6b7280",
    }).then((result) => {
      if (result.isConfirmed) logout();
    });
  };

  return (
    <div className="socio-dashboard-container">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div
        style={{
          width: "100%",
          maxWidth: "900px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "28px",
          padding: "0 4px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
          <img
            src={user?.avatar}
            alt="Avatar"
            style={{
              width: "46px",
              height: "46px",
              borderRadius: "10px",
              objectFit: "cover",
              border: "2px solid rgba(74,144,217,0.3)",
            }}
          />
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                color: "#64748b",
                textTransform: "uppercase",
                letterSpacing: "1px",
              }}
            >
              Panel de
            </p>
            <h2
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "#1e293b",
              }}
            >
              Administrador
            </h2>
          </div>
        </div>

        <button
          onClick={handleLogout}
          style={{
            backgroundColor: "#fee2e2",
            color: "#dc2626",
            border: "none",
            padding: "9px 18px",
            borderRadius: "8px",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
          }}
        >
          Cerrar sesión
        </button>
      </div>

      {/* ── Cards ──────────────────────────────────────────────────────── */}
      <div className="cards-container">

        {/* Card: Perfil del admin */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-blue">
            <h1>Mi Perfil</h1>
            <img src={Logo.src} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p>
              <strong>Nombre:</strong> {user?.nombre || "No disponible"}
            </p>
            <p>
              <strong>Correo:</strong> {user?.username || "No disponible"}
            </p>
            <p>
              <strong>Rol:</strong> Administrador
            </p>
            <p>
              <strong>ID:</strong> {user?.id || "No disponible"}
            </p>
          </div>
        </div>

        {/* Card: Gestión de socios */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-green">
            <h1>Gestión de Socios</h1>
            <img src={Logo.src} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Desde aquí podés gestionar los socios de la organización.
            </p>
            <button
              className="card-changes"
              onClick={() =>
                Swal.fire(
                  "Próximamente",
                  "Esta función estará disponible en breve.",
                  "info"
                )
              }
            >
              Ver listado de socios
            </button>
            <button
              className="card-changes"
              onClick={() =>
                Swal.fire(
                  "Próximamente",
                  "Esta función estará disponible en breve.",
                  "info"
                )
              }
            >
              Registrar nuevo socio
            </button>
          </div>
        </div>

        {/* Card: Cuotas */}
        <div className="card-header-modern-complete">
          <div className="card-header card-header-orange" style={{ background: "linear-gradient(135deg, #d97706, #f59e0b)" }}>
            <h1>Control de Cuotas</h1>
            <img src={Logo.src} alt="Logo" className="card-avatar" />
          </div>
          <div className="card-body">
            <p style={{ color: "#64748b", fontSize: "14px", marginBottom: "16px" }}>
              Revisá y actualizá el estado de cuotas de los socios.
            </p>
            <button
              className="card-changes"
              onClick={() =>
                Swal.fire(
                  "Próximamente",
                  "Esta función estará disponible en breve.",
                  "info"
                )
              }
            >
              Ver cuotas pendientes
            </button>
            <button
              className="card-changes"
              onClick={() =>
                Swal.fire(
                  "Próximamente",
                  "Esta función estará disponible en breve.",
                  "info"
                )
              }
            >
              Marcar cuota como pagada
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
