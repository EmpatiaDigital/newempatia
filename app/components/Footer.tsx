"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { FaInstagram, FaWhatsapp, FaFacebook } from "react-icons/fa";
import "../style/Footer.css";

// 💡 Cambiamos JSX.Element por React.ReactElement para cumplir con el estándar estricto
export default function Footer(): React.ReactElement {
  const whatsappNumber: string = "3413559329";
  const whatsappMessage: string = encodeURIComponent("Me interesa comunicarme con vos");

  const [currentYear, setCurrentYear] = useState<number>(2026);

  useEffect(() => {
    setCurrentYear(new Date().getFullYear());
  }, []);

  return (
    <footer className="footer-container">
      <div className="footer-links">
        <Link href="#" className="footer-link">
          Nosotros
        </Link>
        <Link href="/descargo-de-responsabilidad" className="footer-link">
          Descargo de responsabilidad
        </Link>
        <Link href="/registro" className="footer-link">
          Regístrate
        </Link>
      </div>

      <div className="footer-socials">
        <a
          href={`https://wa.me/${whatsappNumber}?text=${whatsappMessage}`}
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          aria-label="WhatsApp"
        >
          <FaWhatsapp className="social-icon" />
        </a>
        <a
          href="https://www.facebook.com"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          aria-label="Facebook"
        >
          <FaFacebook className="social-icon" />
        </a>
        <a
          href="https://www.instagram.com"
          target="_blank"
          rel="noopener noreferrer"
          className="social-link"
          aria-label="Instagram"
        >
          <FaInstagram className="social-icon" />
        </a>
      </div>
      <p className="footer-copy">
        © {currentYear} Empatia Digital. Todos los derechos reservados.
      </p>
    </footer>
  );
}