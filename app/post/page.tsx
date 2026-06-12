'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import fondoImg from '../assets/Juego.jpeg';
import PostStatsMini from '../components/PostStatsMini';
import '../style/Post.css';

const DEFAULT_AVATAR = 'https://cdn-icons-png.flaticon.com/512/64/64572.png';
const POSTS_PER_PAGE = 6;

interface PostItem {
  _id: string;
  titulo: string;
  autor: string;
  portada?: string;
  avatar?: string;
  categoria?: string | string[];
}

interface PostsResponse {
  posts: PostItem[];
  totalPaginas: number;
}

export default function Post() {
  const router = useRouter();

  const [posts, setPosts]               = useState<PostItem[]>([]);
  const [cargando, setCargando]         = useState<boolean>(true);
  const [paginaActual, setPaginaActual] = useState<number>(1);
  const [totalPaginas, setTotalPaginas] = useState<number>(1);

  useEffect(() => {
    const fetchPostsPaginados = async (): Promise<void> => {
      setCargando(true);
      try {
        const res  = await fetch(
          `https://empatia-dominio-back.vercel.app/api/posts?page=${paginaActual}&limit=${POSTS_PER_PAGE}`
        );
        const data = await res.json() as PostsResponse;
        setPosts(data.posts ?? []);
        setTotalPaginas(data.totalPaginas ?? 1);
      } catch (error) {
        console.error('Error al obtener posts paginados:', error);
      } finally {
        setCargando(false);
      }
    };

    fetchPostsPaginados();
  }, [paginaActual]);

  const cambiarPagina = (numero: number): void => {
    if (numero >= 1 && numero <= totalPaginas) {
      setPaginaActual(numero);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const resolverCategoria = (categoria: PostItem['categoria']): string => {
    if (Array.isArray(categoria) && categoria.length > 0 && typeof categoria[0] === 'string') {
      return categoria[0].trim();
    }
    if (typeof categoria === 'string' && categoria.trim() !== '') {
      return categoria.trim();
    }
    return 'Sentidos';
  };

  const Paginacion = () => (
    <div className="post-paginacion">
      <button
        onClick={() => cambiarPagina(paginaActual - 1)}
        disabled={paginaActual === 1}
        className="paginacion-btn"
      >
        {'<'}
      </button>
      {Array.from({ length: totalPaginas }, (_, i) => (
        <button
          key={i + 1}
          className={`paginacion-btn ${paginaActual === i + 1 ? 'activo' : ''}`}
          onClick={() => cambiarPagina(i + 1)}
        >
          {i + 1}
        </button>
      ))}
      <button
        onClick={() => cambiarPagina(paginaActual + 1)}
        disabled={paginaActual === totalPaginas}
        className="paginacion-btn"
      >
        {'>'}
      </button>
    </div>
  );

  return (
    <div className="post-page">
      <h2 className="titulo-principal">Todas las Publicaciones</h2>

      {!cargando && posts.length > 0 && <Paginacion />}

      {cargando ? (
        <p className="post-loading">Cargando publicaciones...</p>
      ) : posts.length === 0 ? (
        <p className="post-no-data">No hay posts disponibles por el momento.</p>
      ) : (
        <>
          <div className="lista-posts-container">
            {posts.map((post, index) => {
              const categoria = resolverCategoria(post.categoria);
              const imageSrc  = post.portada ?? fondoImg.src;

              return (
                <div key={post._id} className="post-card">
                  <img
                    src={imageSrc}
                    alt={`Portada de ${post.titulo}`}
                    className="post-card-background-img"
                    fetchPriority={index === 0 ? 'high' : 'auto'}
                    loading={index === 0 ? 'eager' : 'lazy'}
                  />

                  <div className="post-card-overlay">
                    <div className="post-header">
                      <span className="card-badge">{categoria}</span>
                      <img
                        src={post.avatar ?? DEFAULT_AVATAR}
                        alt={`Avatar de ${post.autor}`}
                        className="avatar"
                        loading="lazy"
                      />
                      <div className="post-header-content">
                        <h3 className="post-title">{post.titulo}</h3>
                        <p className="post-autor">Por: {post.autor}</p>
                      </div>
                    </div>

                    <div className="card-footer">
                      <button
                        className="btn-ver-mas"
                        onClick={() => router.push(`/post/${post._id}`)}
                      >
                        Ver más
                      </button>
                      <PostStatsMini postId={post._id} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <Paginacion />
        </>
      )}
    </div>
  );
}