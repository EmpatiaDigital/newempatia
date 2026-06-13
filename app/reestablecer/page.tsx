"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import { useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import "../style/Reestablecer.css";

const API_BASE = "http://localhost:5000";

export default function Reestablecer() {
  const [correo, setCorreo]               = useState("");
  const [code, setCode]                   = useState("");
  const [nuevaPassword, setNuevaPassword] = useState("");
  const [codigoEnviado, setCodigoEnviado] = useState(false);
  const [showPassword, setShowPassword]   = useState(false);
  const router = useRouter();

  const handleSendCode = async () => {
    if (!correo) return;

    try {
      const response = await fetch(`${API_BASE}/api/sendCode`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo }),
      });

      if (!response.ok) throw new Error("Error de servidor");

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Respuesta inesperada del servidor");
      }

      const data: { message?: string } = await response.json();
      if (!data.message) throw new Error("No se recibió mensaje en la respuesta");

      setCodigoEnviado(true);
      await Swal.fire({
        title: "Código enviado",
        text: data.message,
        icon: "info",
        confirmButtonColor: "#3085d6",
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      console.error(err);
      await Swal.fire("Error", message, "error");
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!correo || !code || !nuevaPassword) return;

    try {
      const response = await fetch(`${API_BASE}/api/changePassword`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, code, nuevaPassword }),
      });

      if (!response.ok) throw new Error("Error de servidor");

      const contentType = response.headers.get("content-type");
      if (!contentType?.includes("application/json")) {
        throw new Error("Respuesta inesperada del servidor");
      }

      const data: { message?: string } = await response.json();
      if (!data.message) throw new Error("No se recibió mensaje en la respuesta");

      await Swal.fire("¡Éxito!", data.message, "success");
      router.push("/login");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error inesperado";
      console.error(err);
      await Swal.fire("Error", message, "error");
    }
  };

  return (
    <div className="reestablecer-container">
      <form onSubmit={handleSubmit} className="reestablecer-form">
        <h2>Reestablecer Contraseña</h2>

        <input
          type="email"
          placeholder="Correo electrónico"
          value={correo}
          onChange={(e) => setCorreo(e.target.value)}
          required
        />

        {!codigoEnviado && (
          <button type="button" onClick={handleSendCode}>
            Enviar Código
          </button>
        )}

        {codigoEnviado && (
          <>
            <input
              type="text"
              placeholder="Código de verificación"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
            />

            <div className="reestablecer-password-wrapper">
              <input
                type={showPassword ? "text" : "password"}
                placeholder="Nueva contraseña"
                value={nuevaPassword}
                onChange={(e) => setNuevaPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="reestablecer-eye"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            <button type="submit">Actualizar contraseña</button>
          </>
        )}
      </form>
    </div>
  );
}