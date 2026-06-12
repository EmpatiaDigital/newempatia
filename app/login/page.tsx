'use client';

import { useState, FormEvent, ChangeEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import Swal from 'sweetalert2';
import '../style/Login.css';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const [correo, setCorreo] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [mostrarPassword, setMostrarPassword] = useState<boolean>(false);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();

    try {
      const response = await login(correo, password, '');
      console.log('Respuesta del backend EN EL LOGIN:', response);

      await Swal.fire({
        title: '¡Bienvenido!',
        text: 'Has iniciado sesión correctamente.',
        icon: 'success',
        confirmButtonColor: '#28a745',
        confirmButtonText: 'Continuar',
      });

      // router.push('/');
    } catch (err) {
      const message =
        err instanceof Error ? err.message : 'Hubo un problema al iniciar sesión.';

      await Swal.fire({
        title: 'Error',
        text: message,
        icon: 'error',
        confirmButtonColor: '#d33',
        confirmButtonText: 'Intentar de nuevo',
      });
    }
  };

  return (
    <div className="login-container">
      <form onSubmit={handleSubmit} className="login-form">
        <h2 className="login-title">Iniciar sesión</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={correo}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setCorreo(e.target.value)}
          required
        />

        <div className="input-password-container">
          <input
            type={mostrarPassword ? 'text' : 'password'}
            placeholder="Contraseña"
            value={password}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
            required
          />
          <span
            className="toggle-password"
            onClick={() => setMostrarPassword((prev) => !prev)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                setMostrarPassword((prev) => !prev);
              }
            }}
            title={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
            aria-label={mostrarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          >
            {mostrarPassword ? '🙈' : '👁️'}
          </span>
        </div>

        <button type="submit" className="login-button">
          Entrar
        </button>

        <div className="login-links">
          <Link href="/registro" className="link-register">
            <strong>¿No tenés cuenta? Registrate</strong>
          </Link>
          <Link href="/reestablecer" className="link-reset">
            <strong>¿Olvidaste tu contraseña?</strong>
          </Link>
        </div>
      </form>
    </div>
  );
}