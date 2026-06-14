'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import '../style/MyPost.css';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/64/64572.png';
const API = 'https://newempatiabackend.vercel.app/api';

interface Publicacion {
  _id: string;
  titulo: string;
  autor: string;
  portada?: string;
  avatar?: string;
  PostId?: string;
}

export default function MyPost() {
  const { user } = useAuth();
  const router   = useRouter();

  const [publicaciones, setPublicaciones] = useState<Publicacion[]>([]);
  const [cargando, setCargando]           = useState<boolean>(true);

  useEffect(() => {
    const fetchPosts = async (): Promise<void> => {
      try {
        const res    = await fetch(`${API}/posts`);
        const data   = await res.json() as Publicacion[];
        const userId = localStorage.getItem('userId');

        const filtradas = data.filter(
          (item) => String(item.PostId) === String(userId)
        );

        setPublicaciones(filtradas);
      } catch (error) {
        console.error('Error al obtener publicaciones:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchPosts();
  }, []);

  const handleEliminar = async (id: string): Promise<void> => {
    const confirm = await Swal.fire({
      title: '¿Querés eliminar esta publicación?',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
    });

    if (!confirm.isConfirmed) return;

    try {
      const token = localStorage.getItem('token') ?? '';
      const res   = await fetch(`${API}/posts/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) throw new Error('No se pudo eliminar la publicación');

      await Swal.fire('Eliminado', 'La publicación fue eliminada correctamente', 'success');
      setPublicaciones((prev) => prev.filter((item) => item._id !== id));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo eliminar la publicación';
      await Swal.fire('Error', message, 'error');
    }
  };

  if (!user)    return <p>Debés iniciar sesión para ver tus publicaciones.</p>;
  if (cargando) return <p>Cargando publicaciones...</p>;

  return (
    <div className="contenedor-publicaciones">
      <h2 className="titulo-publicaciones">Mis Publicaciones</h2>
      {publicaciones.length === 0 ? (
        <p>No tenés publicaciones aún.</p>
      ) : (
        <div className="grid-publicaciones">
          {publicaciones.map((item) => {
            const bg = item.portada
              ? `url(${item.portada})`
              : 'url(/assets/Juego.webp)';

            return (
              <div
                key={item._id}
                className="card-publicacion"
                style={{
                  backgroundImage: bg,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                }}
              >
                <div className="contenido-card">
                  <div className="cabecera">
                    <img
                      src={item.avatar ?? DEFAULT_AVATAR}
                      alt="avatar"
                      className="avatar-img"
                    />
                    <div>
                      <h3>{item.titulo}</h3>
                      <h4 className="autor">Por: {item.autor}</h4>
                    </div>
                  </div>
                </div>
                <div className="acciones">
                  <button
                    className="btn-my-post-editar"
                    onClick={() => router.push(`/editar/${item._id}`)}
                  >
                    Editar
                  </button>
                  <button
                    className="btn-my-post-eliminar"
                    onClick={() => handleEliminar(item._id)}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
