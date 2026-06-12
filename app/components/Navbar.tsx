"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "../context/AuthContext";
import { Menu, X } from "lucide-react";
import logoImg from "../assets/empatialog.jpeg";
import "../style/Navbar.css";
// ── Interfaces de Tipado Estricto ────────────────────────────────────────
interface User {
  id: string;
  username: string;
  role: "superadmin" | "admin" | "socio" | string;
  nombre: string;
  avatar: string;
  PostId?: string;
  active?: boolean;
}
// Extendemos el tipo de evento nativo para soportar el prompt de instalación de las PWA
interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
  prompt(): Promise<void>;
}

const DEFAULT_AVATAR = "https://cdn-icons-png.flaticon.com/512/64/64572.png";

export default function Navbar() {
  // Consumimos el contexto tipando estrictamente lo que esperamos de él
  const { user, logout, loading } = useAuth() as {
    user: User | null;
    logout: () => void;
    loading: boolean;
  };

  const [menuOpen, setMenuOpen] = useState<boolean>(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [pwaInstalled, setPwaInstalled] = useState<boolean>(false);
  const [isIOS, setIsIOS] = useState<boolean>(false);
  const [showIOSHint, setShowIOSHint] = useState<boolean>(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Validación de modo PWA independiente
    const isStandalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      ("standalone" in window.navigator && (window.navigator as { standalone?: boolean }).standalone === true);
      
    if (isStandalone) {
      setPwaInstalled(true);
      return;
    }

    // Validación estricta de entorno iOS sin usar MSStream como objeto implícito
    const navigatorAgent = navigator.userAgent;
    const ios = /iphone|ipad|ipod/i.test(navigatorAgent) && !("MSStream" in window);
    setIsIOS(ios);

    // El manejador recibe explícitamente nuestro evento extendido de PWA
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    
    const handleAppInstalled = () => {
      setPwaInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async (): Promise<void> => {
    if (isIOS) {
      setShowIOSHint((prev) => !prev);
      return;
    }
    if (!deferredPrompt) return;
    
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === "accepted") {
      setPwaInstalled(true);
    }
    setDeferredPrompt(null);
  };

  const getDashboardLink = (): string => {
    if (!user) return "/";
    switch (user.role) {
      case "superadmin":
        return "/socio/dashboard";
      case "admin":
        return "/socio/dashboard";
      default:
        return "/socio/dashboard";
    }
  };

  const handleLogout = (): void => {
    if (typeof window !== "undefined") {
      sessionStorage.removeItem("loadingAlertShown");
    }
    logout();
  };

  const handleLinkClick = (): void => {
    setMenuOpen(false);
  };

  if (loading) {
    return (
      <nav className="navbar">
        <div className="logo-img animated-logo">
          <Image src={logoImg} alt="Logo Sentidos" className="logo-image" width={120} height={40} priority />
          <div className="light-shine" />
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      {/* Logo — izquierda */}
      <div className="logo-img animated-logo">
        <Image src={logoImg} alt="Logo Sentidos" className="logo-image" width={120} height={40} priority />
        <div className="light-shine" />
      </div>

      {/* PWA — centro */}
      <div className="pwa-center">
        {pwaInstalled ? (
          <button className="pwa-btn pwa-btn--open" onClick={() => window.location.reload()}>
            <span className="pwa-icon">⚡</span>
            <span className="pwa-label">Abrir app</span>
          </button>
        ) : deferredPrompt || isIOS ? (
          <div className="pwa-wrapper">
            <button className="pwa-btn pwa-btn--install" onClick={handleInstallClick}>
              <span className="pwa-icon">⬇</span>
              <span className="pwa-label">Descargar app</span>
            </button>
            {isIOS && showIOSHint && (
              <div className="pwa-ios-hint">
                <p>
                  Tocá <strong>Compartir</strong> ⎙ y luego <strong>"Agregar a inicio"</strong>
                </p>
              </div>
            )}
          </div>
        ) : null}
      </div>

      {/* Hamburguesa — derecha */}
      <button
        className="menu-toggle"
        onClick={() => setMenuOpen((prev) => !prev)}
        aria-label="Toggle menu"
      >
        {menuOpen ? <X size={28} /> : <Menu size={28} />}
      </button>

      {/* Links de Navegación */}
      <ul className={`nav-links ${menuOpen ? "show" : ""}`}>
        <li><Link href="/" onClick={handleLinkClick}>Inicio</Link></li>
        <li><Link href="/inscription" onClick={handleLinkClick}>Cursos</Link></li>
        <li><Link href="/contacto" onClick={handleLinkClick}>Contacto</Link></li>
        <li><Link href="/post" onClick={handleLinkClick}>Post</Link></li>
        <li><Link href="/descargas" onClick={handleLinkClick}>Guía gratis</Link></li>
        <li><Link href="/trivia" onClick={handleLinkClick}>Trivia</Link></li>
        
        {user ? (
          <>
            <li>
              <Link href={getDashboardLink()} onClick={handleLinkClick} className="dashboard-btn">
                Panel
              </Link>
            </li>
            {(user.role === "admin" || user.role === "superadmin") && (
              <>
                <li><Link href="/editar-publicaciones" onClick={handleLinkClick}>My Post</Link></li>
                <li><Link href="/crear" onClick={handleLinkClick}>Crear</Link></li>
                <li><Link href="/crear-actividades" onClick={handleLinkClick}>Act.</Link></li>
              </>
            )}
            {user.role === "superadmin" && (
              <>
                <li><Link href="/data-user" onClick={handleLinkClick}>Data</Link></li>
                <li><Link href="/superadmincourses" onClick={handleLinkClick}>Tutor</Link></li>
              </>
            )}
            <li className="user group">
              <div className="user-info">
                <img src={user.avatar || DEFAULT_AVATAR} alt="avatar" className="avatar-img" />
                <span><b>{user.nombre || "Usuario"}</b></span>
              </div>
            </li>
            <li>
              <button onClick={() => { handleLogout(); handleLinkClick(); }} style={{ cursor: "pointer" }}>
                <b>Cerrar sesión</b>
              </button>
            </li>
          </>
        ) : (
          <>
            <li><Link href="/registro" onClick={handleLinkClick} className="register-btn">Registrarse</Link></li>
            <li><Link href="/login" onClick={handleLinkClick} className="login-btn">Ingresar</Link></li>
          </>
        )}
      </ul>
    </nav>
  );
}
