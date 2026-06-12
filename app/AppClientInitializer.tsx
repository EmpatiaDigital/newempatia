"use client";

import React, { Suspense, useEffect, useRef } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "./context/AuthContext";

// ── Componente interno que usa useSearchParams ────────────────────────────────
// Debe estar separado para poder envolverlo en <Suspense> desde el padre
function AppClientInitializerInner({ children }: { children: React.ReactNode }) {
  const { logout, user } = useAuth() as any;
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  // ── ESCUCHADOR DINÁMICO DE RUTAS (Google Analytics 4) ──────────────────────
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).gtag) {
      const fullPath = pathname + (searchParams.toString() ? `?${searchParams.toString()}` : "");
      (window as any).gtag("config", "G-1PQVGSKJGE", {
        page_path: fullPath,
      });
    }
  }, [pathname, searchParams]);

  // ── LOGOUT POR INACTIVIDAD (10 minutos) ────────────────────────────────────
  const handleLogout = () => {
    if (logout) {
      logout();
      router.push("/login");
    }
  };

  const resetTimer = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    if (user) {
      timeoutRef.current = setTimeout(handleLogout, 10 * 60 * 1000);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    const events = ["click", "mousemove", "keydown", "scroll", "touchstart"];
    events.forEach((event) => window.addEventListener(event, resetTimer));
    resetTimer();

    return () => {
      events.forEach((event) => window.removeEventListener(event, resetTimer));
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [user]);

  return <>{children}</>;
}

// ── Componente exportado: envuelve el inner en Suspense ───────────────────────
// Esto es requerido por Next.js cuando useSearchParams se usa fuera de un
// Suspense boundary — sin esto el build falla con el error de prerender.
export default function AppClientInitializer({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <AppClientInitializerInner>{children}</AppClientInitializerInner>
    </Suspense>
  );
}
