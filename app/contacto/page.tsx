import { Mail, MessageCircle, UserPlus } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import contactImage from '../assets/familiaEMPATIA.jpg';
import '../style/ContactSection.css';


export default function ContactSection() {
  return (
    <section className="contact-section">
      <div className="contact-container">
        <div className="contact-text">
          <h2>¿Por qué contactarnos?</h2>
          <p>
            En <strong>Empatía Digital</strong> acompañamos el camino hacia una
            salud digital consciente en tiempos de inteligencia artificial. Como
            acompañante terapéutico formado en la Universidad Nacional de
            Rosario, ofrezco un espacio de escucha, contención y apoyo desde una
            mirada práctica y respetuosa, sin pretender diagnosticar ni
            sustituir roles clínicos.
          </p>
          <p>
            Contactarnos significa abrir un diálogo sincero para compartir
            inquietudes, encontrar herramientas y construir juntos estrategias
            que ayuden a cuidar el bienestar digital en el día a día. Tu
            experiencia y tu voz son el centro de este proceso.
          </p>

          <div className="contact-list">
            <div className="line"></div>
            <ul>
              <li>
                <div className="icon-wrapper">
                  <MessageCircle className="contact-icon" size={20} strokeWidth={1.8} />
                </div>
                <a
                  href="https://wa.me/5493413559329"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Enviar WhatsApp
                </a>
              </li>
              <li>
                <div className="icon-wrapper">
                  <Mail className="contact-icon" size={20} strokeWidth={1.8} />
                </div>
                <a href="mailto:empatiadigital2025@gmail.com">
                  empatiadigital2025@gmail.com
                </a>
              </li>
              <li>
                <div className="icon-wrapper">
                  <UserPlus className="contact-icon" size={20} strokeWidth={1.8} />
                </div>
                <Link href="/registro">Suscribite</Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="contact-image">
          <Image
            src={contactImage}
            alt="Contacto Empatía Digital"
            placeholder="blur"
          />
        </div>
      </div>
    </section>
  );
}
