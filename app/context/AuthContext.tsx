"use client";

import React, { createContext, useState, useEffect, useContext } from "react";
import { useRouter } from "next/navigation";

// ── INTERFACES ──────────────────────────────────────────────────────────────

export interface User {
  username: string;
  role: string;
  id: string;
  nombre: string;
  PostId: string;
  avatar: string;
  active?: boolean;
}

export interface AuthContextType {
  user: User | null;
  login: (correo: string, password: string, username: string) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

// ── CONTEXTO ─────────────────────────────────────────────────────────────────

export const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  loading: true,
});

// ── PROVEEDOR ─────────────────────────────────────────────────────────────────

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token");

      if (!token) {
        setLoading(false);
        return;
      }

      const storedUser: User = {
        username: localStorage.getItem("username") || "",
        role:     localStorage.getItem("role")     || "",
        id:       localStorage.getItem("userId")   || "",
        nombre:   localStorage.getItem("nombre")   || "Usuario",
        PostId:   localStorage.getItem("PostId")   || "No hay Post",
        avatar:
          localStorage.getItem("avatar") ||
          "https://cdn-icons-png.flaticon.com/512/64/64572.png",
      };

      if (storedUser.username && storedUser.role && storedUser.id) {
        setUser(storedUser);
      }

      setLoading(false);
    }
  }, []);

  const login = async (
    correo: string,
    password: string,
    username: string
  ): Promise<void> => {
    const res = await fetch(
      "http://localhost:5000/api/auth/login",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ correo, password, username }),
      }
    );

    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.message || "Error en el login");
    }

    const data = await res.json();

    const avatarUrl =
      data.avatar && data.avatar.trim() !== ""
        ? data.avatar
        : "https://cdn-icons-png.flaticon.com/512/64/64572.png";

    if (typeof window !== "undefined") {
      localStorage.setItem("token",     data.token);
      localStorage.setItem("role",      data.role);
      localStorage.setItem("username",  data.username);
      localStorage.setItem("nombre",    data.nombre);
      localStorage.setItem("habilitado", String(data.active));
      localStorage.setItem("userId",    data._id);
      localStorage.setItem("PostId",    data.PostId);
      localStorage.setItem("avatar",    avatarUrl);
    }

    const fetchedUser: User = {
      role:     data.role,
      username: data.username,
      id:       data._id,
      nombre:   data.nombre,
      active:   data.active,
      PostId:   data.PostId,   // ← corregido: era data.userId (bug original)
      avatar:   avatarUrl,
    };

    setUser(fetchedUser);

    // ── Todos van a /socio/dashboard; el componente decide qué mostrar según rol ──
    switch (data.role) {
      case "superadmin":
        router.push("/socio/dashboard");
        break;
      case "admin":
        router.push("/socio/dashboard");
        break;
      case "socio":
        router.push("/socio/dashboard");
        break;
      default:
        router.push("/");
    }
  };

  const logout = (): void => {
    if (typeof window !== "undefined") {
      localStorage.clear();
    }
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);