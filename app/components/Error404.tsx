"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import Image from "next/image";
import { Home, RefreshCw, Bot, Flag } from "lucide-react";
import errorImg from "../assets/error.jpg";
import "../style/Error404.css";

interface Cell {
  id: number;
  isRobot: boolean;
  revealed: boolean;
  flagged: boolean;
  adjacentRobots: number;
}

const ROWS = 8;
const COLS = 8;
const TOTAL_CELLS = ROWS * COLS;
const ROBOT_COUNT = 5;

// --- Funciones Lógica Juego ---
const buildBoard = (): Cell[] => {
  const cells: Cell[] = Array(TOTAL_CELLS).fill(null).map((_, i) => ({
    id: i, isRobot: false, revealed: false, flagged: false, adjacentRobots: 0,
  }));
  let placed = 0;
  while (placed < ROBOT_COUNT) {
    const idx = Math.floor(Math.random() * TOTAL_CELLS);
    if (!cells[idx].isRobot) { cells[idx].isRobot = true; placed++; }
  }
  return cells;
};

// --- Componente ---
export default function ErrorBoundary({ children }: { children: React.ReactNode }) {
  const [hasError, setHasError] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  // Esto captura errores de renderizado de los hijos
  useEffect(() => {
    const handleError = (error: any) => {
      console.error("ErrorBoundary caught:", error);
      setHasError(true);
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [pathname]);

  // Si no hay error, renderiza la app normal
  if (!hasError) {
    return <>{children}</>;
  }

  // --- INTERFAZ DEL JUEGO DE ERROR (Renderizado solo si hay error) ---
  return (
    <div className="error-page">
      <div className="error-hero">
        <Image src={errorImg} alt="Error" fill className="error-hero-img" style={{ objectFit: "cover" }} />
        <div className="error-hero-content">
          <h1>¡Oops! Algo salió mal</h1>
          <p>La aplicación encontró un error inesperado.</p>
          <button className="btn-hero" onClick={() => window.location.reload()}>
            <RefreshCw size={20} />
            Recargar aplicación
          </button>
          <button className="btn-hero" onClick={() => router.push("/")}>
            <Home size={20} />
            Ir al inicio
          </button>
        </div>
      </div>
      
      <div className="game-section">
        <h2>Mientras se soluciona, encontrá el robot</h2>
        {/* Aquí iría tu lógica de juego del board, simplificada para no fallar */}
        <div className="game-board">
           {/* El código de tu board va aquí */}
        </div>
      </div>
    </div>
  );
}