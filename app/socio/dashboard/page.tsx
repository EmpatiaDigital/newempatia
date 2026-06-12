"use client";

import { useAuth } from "../../context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import SocioDashboard      from "../components/SocioDashboard";
import AdminDashboard      from "../components/DashboardAdmin";
import SuperAdminDashboard from "../components/DashboardSuperAdmin";

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          minHeight: "100vh",
          fontSize: "1.1rem",
          color: "#64748b",
        }}
      >
        Cargando...
      </div>
    );
  }

  if (!user) return null;

  // ── Renderiza el componente correcto según el rol ──────────────────────────
  switch (user.role) {
    case "superadmin":
      return <SuperAdminDashboard />;
    case "admin":
      return <AdminDashboard />;
    case "socio":
    default:
      return <SocioDashboard />;
  }
}