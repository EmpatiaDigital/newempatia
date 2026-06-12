"use client";

import React, { useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./context/AuthContext";

export default function AppClientInitializer({ children }: { children: React.ReactNode }) {
  // Traemos el contexto de autenticación tal cual lo tenías
  const { logout, user } = useAuth() as any; 
  const router = useRouter();
  
  // En Next.js, useLocation() se divide en estos dos hooks nativos:
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  // Referencia para el temporizador de inactividad
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── 🚀 ESCUCHADOR DINÁMICO DE RUTAS (Google Analytics 4) ────────────────
  useEffect(() => {
    // Reportamos proactivamente la ruta virtual exacta a GA4 en cada transición de Next.js
    if (typeof window !== "undefined" && (window as any).gtag) {
      const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      (window as any).gtag("config", "G-1PQVGSKJGE", {
        page_path: fullPath,
      });
    }
  }, [pathname, searchParams]);

  // ── ⏱️ LOGOUT POR INACTIVIDAD (10 Minutos) ─────────────────────────────
  const handleLogout = () => {
    if (logout) {
      logout();
      router.push("/login"); // Reemplaza a navigate('/login')
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user) {
      timeoutRef.current = setTimeout(handleLogout, 10 * 60 * 1000); // 10 minutos
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const events = ["click", "mousemove", "keydown", "scroll", "touchstart"];
    
    // Agregamos los escuchadores globales de eventos
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer(); // Inicializa el contador
    
    // Limpieza al desmontar el componente
    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]);

  return (
    <>
      
      {/* Aquí Next.js va a inyectar el Navbar, las páginas y el Footer */}
      {children}
    </>
  );
}