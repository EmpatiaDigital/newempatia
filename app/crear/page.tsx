"use client";

import { useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Swal from "sweetalert2";
import "../style/Editor.css";
// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface ColorRecuadro {
  nombre: string;
  value: string;
}

interface NuevoPost {
  titulo: string;
  autor: string;
  epigrafe: string;
  portada: string | null;
  contenido: string;
  imagenes: string[];
  epigrafes: string[];
  tamanos: number[];
  categoria: string;
  fecha: string;
  avatar: string;
  PostId: string | null;
}

// ─────────────────────────────────────────────────
// EXTENSIÓN TIPTAP: RECUADRO DINÁMICO
// ─────────────────────────────────────────────────
const CalloutBox = Node.create({
  name: "calloutBox",
  group: "block",
  content: "block+",
  defining: true,

  addAttributes() {
    return {
      color: {
        default: "azul",
        parseHTML: (element: HTMLElement) => element.getAttribute("data-color"),
        renderHTML: (attributes: Record<string, string>) => ({
          "data-color": attributes.color,
          class: `recuadro-dinamico recuadro-${attributes.color}`,
        }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.recuadro-dinamico" }];
  },

  renderHTML({ HTMLAttributes }: { HTMLAttributes: Record<string, string> }) {
    return ["div", HTMLAttributes, 0];
  },
});

// ─────────────────────────────────────────────────
// HELPERS CLOUDINARY
// ─────────────────────────────────────────────────
function optimizarCloudinary(url: string, params = "f_auto,q_auto,w_1200"): string {
  if (!url || !url.includes("res.cloudinary.com")) return url;
  if (url.includes("/upload/f_auto") || url.includes("/upload/q_auto")) return url;
  return url.replace("/upload/", `/upload/${params}/`);
}

const optimizarPortada = (url: string): string =>
  optimizarCloudinary(url, "f_auto,q_auto,w_800");

const optimizarContenido = (url: string): string =>
  optimizarCloudinary(url, "f_auto,q_auto,w_1200");

// ─────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────
const API_BASE = "https://empatia-dominio-back.vercel.app/api";

const COLORES_RECUADRO: ColorRecuadro[] = [
  { nombre: "Azul",     value: "azul"     },
  { nombre: "Rojo",     value: "rojo"     },
  { nombre: "Verde",    value: "verde"    },
  { nombre: "Amarillo", value: "amarillo" },
  { nombre: "Violeta",  value: "violeta"  },
];

const CATEGORIAS = [
  "Noticias",
  "Tutoriales",
  "Opinión",
  "Eventos",
  "Sociedad Digital",
];

// ─────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────
export default function CrearPost() {
  const [autor, setAutor] = useState<string>(
    typeof window !== "undefined" ? localStorage.getItem("nombre") ?? "Sentidos" : "Sentidos"
  );
  const [titulo, setTitulo]       = useState<string>("");
  const [epigrafe, setEpigrafe]   = useState<string>("");
  const [portada, setPortada]     = useState<string | null>(null);
  const [imagenes, setImagenes]   = useState<string[]>([]);
  const [epigrafes, setEpigrafes] = useState<string[]>([]);
  const [tamanos, setTamanos]     = useState<number[]>([]);
  const [categoria, setCategoria] = useState<string>("");
  const [cargando, setCargando]   = useState<boolean>(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      CalloutBox,
      Image.configure({ HTMLAttributes: { class: "imagen-fija-1200" } }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: "",
  });

  // ── Subir imagen a Cloudinary ──
  async function subirImagenACloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error al subir la imagen");

    const data: { secure_url: string } = await res.json();
    return data.secure_url;
  }

  // ── Insertar recuadro en el editor ──
  function agregarRecuadroDestacado(color: string): void {
    if (!editor) return;
    editor.chain().focus().insertContent({
      type: "calloutBox",
      attrs: { color },
      content: [
        {
          type: "paragraph",
          content: [{ type: "text", text: "Escribí el contenido destacado acá..." }],
        },
      ],
    }).run();
  }

  // ── Manejar imágenes del cuerpo ──
  async function handleImagenesSeleccionadas(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setCargando(true);
    const urls: string[] = [];

    try {
      for (const file of files) {
        const urlOriginal  = await subirImagenACloudinary(file);
        const urlOptimizada = optimizarContenido(urlOriginal);
        urls.push(urlOptimizada);

        if (editor) {
          editor.chain().focus().insertContent(`<img src="${urlOptimizada}" />`).run();
        }
      }

      setImagenes((prev) => [...prev, ...urls]);
      setEpigrafes((prev) => [...prev, ...urls.map(() => "")]);
      setTamanos((prev)   => [...prev, ...urls.map(() => 100)]);
    } catch (error: unknown) {
      if (error instanceof Error) console.error(error.message);
      Swal.fire({
        icon: "error",
        title: "Error al subir imágenes",
        text: "No se pudieron cargar una o más imágenes dentro del contenido.",
      });
    } finally {
      setCargando(false);
    }
  }

  // ── Manejar portada ──
  async function handlePortadaSeleccionada(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const file = e.target.files?.[0];
    if (!file) return;

    setCargando(true);
    try {
      const urlOriginal   = await subirImagenACloudinary(file);
      const urlOptimizada = optimizarPortada(urlOriginal);
      setPortada(urlOptimizada);
    } catch (error: unknown) {
      if (error instanceof Error) console.error(error.message);
      Swal.fire({
        icon: "error",
        title: "Error de Portada",
        text: "Hubo un problema al subir la imagen de portada.",
      });
    } finally {
      setCargando(false);
    }
  }

  // ── Guardar post ──
  async function guardarPost(): Promise<void> {
    const contenido = editor?.getHTML() ?? "";

    if (!titulo || !autor || !contenido || contenido === "<p></p>" || !categoria) {
      Swal.fire({
        icon: "warning",
        title: "Faltan datos obligatorios",
        text: "Completá título, autor, contenido y categoría antes de publicar.",
      });
      return;
    }

    const avatar = localStorage.getItem("avatar") ?? "";
    const PostId = localStorage.getItem("userId");

    const nuevoPost: NuevoPost = {
      titulo,
      autor,
      epigrafe,
      portada,
      contenido,
      imagenes,
      epigrafes,
      tamanos,
      categoria,
      fecha: new Date().toISOString(),
      avatar,
      PostId,
    };

    try {
      Swal.fire({
        title: "Subiendo post...",
        html: "Por favor esperá un momento.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); },
      });

      const res = await fetch(`${API_BASE}/posts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(nuevoPost),
      });

      Swal.close();

      if (res.ok) {
        await Swal.fire({
          icon: "success",
          title: "¡Post creado!",
          text: "Tu post se publicó correctamente.",
          timer: 2000,
          showConfirmButton: false,
        });

        window.location.reload();

        setTitulo("");
        setAutor("");
        setEpigrafe("");
        setPortada(null);
        editor?.commands.setContent("");
        setImagenes([]);
        setEpigrafes([]);
        setTamanos([]);
        setCategoria("");
      } else {
        Swal.fire({
          icon: "error",
          title: "Error al guardar",
          text: "Ocurrió un problema al intentar guardar el post.",
        });
      }
    } catch (err: unknown) {
      Swal.close();
      if (err instanceof Error) console.error(err.message);
      Swal.fire({
        icon: "error",
        title: "Error inesperado",
        text: "Revisá la consola o contactá al administrador.",
      });
    }
  }

  // ── Insertar enlace ──
  async function handleEnlace(): Promise<void> {
    const previousUrl = editor?.getAttributes("link").href as string ?? "";

    const { value: url } = await Swal.fire<string>({
      title: "Insertar enlace",
      input: "url",
      inputLabel: "URL del enlace",
      inputValue: previousUrl,
      showCancelButton: true,
      confirmButtonText: "Insertar",
      cancelButtonText: "Cancelar",
      inputValidator: (value) => {
        if (value && !/^https?:\/\/|^\/|^[\w\-]/.test(value)) {
          return "Ingresá una URL válida o dejala vacía para quitar el enlace";
        }
        return null;
      },
    });

    if (url === undefined) return;

    if (url === "") {
      editor?.chain().focus().unsetLink().run();
      return;
    }

    let cleanedUrl = url;
    const isExternal = /^https?:\/\//i.test(url);
    if (!isExternal && url.startsWith("https://www.empatiadigital.com.ar")) {
      cleanedUrl = url.replace("https://www.empatiadigital.com.ar", "");
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: cleanedUrl }).run();
  }

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  return (
    <div className="editor-container">
      <h2 className="editor-title">Crear nuevo post</h2>

      <input
        type="text"
        placeholder="Título del post"
        value={titulo}
        onChange={(e) => setTitulo(e.target.value)}
        className="editor-input"
      />

      <input
        type="text"
        placeholder="Autor"
        value={autor}
        onChange={(e) => {
          const soloLetrasEspacios = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
          setAutor(soloLetrasEspacios);
          localStorage.setItem("nombre", soloLetrasEspacios);
        }}
        className="editor-input"
      />

      <textarea
        placeholder="Epígrafe general del post..."
        value={epigrafe}
        onChange={(e) => setEpigrafe(e.target.value)}
        className="editor-textarea"
      />

      <label className="editor-label">Categoría</label>
      <select
        value={categoria}
        onChange={(e) => setCategoria(e.target.value)}
        className="editor-select"
      >
        <option value="">-- Seleccioná una categoría --</option>
        {CATEGORIAS.map((cat) => (
          <option key={cat} value={cat}>{cat}</option>
        ))}
      </select>

      <label className="editor-label">Imagen de portada</label>
      <input
        type="file"
        accept="image/*"
        onChange={handlePortadaSeleccionada}
        className="editor-file"
      />

      {portada && (
        <div className="preview-portada-block">
          <img
            src={portada}
            alt="portada"
            className="preview-portada"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      {/* ── TOOLBAR ── */}
      <div className="toolbar">
        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBold().run()}
          className={editor?.isActive("bold") ? "active" : ""}
        >
          Negrita
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive("italic") ? "active" : ""}
        >
          Itálica
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={editor?.isActive("bulletList") ? "active" : ""}
        >
          Lista
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor?.isActive("heading", { level: 1 }) ? "active" : ""}
        >
          Título 1
        </button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor?.isActive("heading", { level: 2 }) ? "active" : ""}
        >
          Título 2
        </button>

        <button
          type="button"
          onClick={handleEnlace}
          className={editor?.isActive("link") ? "active" : ""}
        >
          Enlace
        </button>

        {/* ── Selector visual de recuadros ── */}
        <div className="recuadro-picker-group">
          <span className="recuadro-picker-label">Recuadro</span>
          {COLORES_RECUADRO.map((col) => (
            <button
              key={col.value}
              type="button"
              title={`Insertar bloque ${col.nombre}`}
              className={`swatch-btn swatch-${col.value}${
                editor?.isActive("calloutBox", { color: col.value }) ? " active" : ""
              }`}
              onClick={() => agregarRecuadroDestacado(col.value)}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => editor?.chain().focus().unsetAllMarks().run()}
        >
          Limpiar
        </button>
      </div>

      <EditorContent editor={editor} className="tiptap" />

      <label className="editor-label">Añadir imágenes al cuerpo del post</label>
      <input
        type="file"
        multiple
        accept="image/*"
        onChange={handleImagenesSeleccionadas}
        className="editor-file"
      />

      {cargando && <p className="uploading-text">Procesando archivos multimedia...</p>}

      <button
        type="button"
        onClick={guardarPost}
        className="publish-button"
        disabled={cargando}
      >
        Publicar
      </button>
    </div>
  );
}
