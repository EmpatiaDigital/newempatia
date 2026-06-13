"use client";

import { useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { EditorContent, useEditor } from "@tiptap/react";
import { Node } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import LinkExtension from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Swal from "sweetalert2";
import "../../style/Editor.css";

// ─────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────
interface ColorRecuadro {
  nombre: string;
  value: string;
}

interface PostResponse {
  titulo: string;
  autor: string;
  epigrafe: string;
  portada: string;
  contenido: string;
  imagenes: string[];
  epigrafes: string[];
  tamanos: number[];
  categoria: string;
}

interface PostData {
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
        parseHTML: (element: HTMLElement) =>
          element.getAttribute("data-color"),
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

const optimizarPortada   = (url: string): string => optimizarCloudinary(url, "f_auto,q_auto,w_800");
const optimizarContenido = (url: string): string => optimizarCloudinary(url, "f_auto,q_auto,w_1200");

// ─────────────────────────────────────────────────
// CONSTANTES
// ─────────────────────────────────────────────────
const API_BASE = "http://localhost:5000/api";

const COLORES_RECUADRO: ColorRecuadro[] = [
  { nombre: "Azul",     value: "azul"     },
  { nombre: "Rojo",     value: "rojo"     },
  { nombre: "Verde",    value: "verde"    },
  { nombre: "Amarillo", value: "amarillo" },
  { nombre: "Violeta",  value: "violeta"  },
];

const CATEGORIAS: string[] = [
  "Noticias",
  "Tutoriales",
  "Opinión",
  "Eventos",
  "Sociedad Digital",
];

// ─────────────────────────────────────────────────
// COMPONENTE
// ─────────────────────────────────────────────────
export default function EditPost() {
  const params = useParams();
  const router = useRouter();

  const postId = Array.isArray(params?.id)
    ? params.id[0]
    : (params?.id ?? "");

  const [autor,       setAutor]       = useState<string>("");
  const [titulo,      setTitulo]      = useState<string>("");
  const [epigrafe,    setEpigrafe]    = useState<string>("");
  const [portada,     setPortada]     = useState<string | null>(null);
  const [imagenes,    setImagenes]    = useState<string[]>([]);
  const [epigrafes,   setEpigrafes]   = useState<string[]>([]);
  const [tamanos,     setTamanos]     = useState<number[]>([]);
  const [categoria,   setCategoria]   = useState<string>("");
  const [cargando,    setCargando]    = useState<boolean>(false);
  // Estado que guarda el HTML traído del backend
  const [htmlPost,    setHtmlPost]    = useState<string>("");
  // Estado que indica si el editor ya está montado
  const [editorListo, setEditorListo] = useState<boolean>(false);
  // Evita cargar el contenido más de una vez
  const yaInyecto = useRef<boolean>(false);

  // ── EDITOR ───────────────────────────────────────
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      CalloutBox,
      Image.configure({ HTMLAttributes: { class: "imagen-fija-1200" } }),
      LinkExtension.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
    ],
    content: "",
    onCreate() {
      // Avisamos que el editor ya está listo
      setEditorListo(true);
    },
  });

  // ── Fetch del post ────────────────────────────────
  useEffect(() => {
    if (!postId) return;

    async function fetchPost(): Promise<void> {
      try {
        const res = await fetch(`${API_BASE}/posts/${postId}`);
        if (!res.ok) throw new Error("No se pudo obtener el post");

        const data: PostResponse = await res.json();

        setTitulo(data.titulo       || "");
        setAutor(data.autor         || "");
        setEpigrafe(data.epigrafe   || "");
        setPortada(data.portada ? optimizarPortada(data.portada) : null);
        setCategoria(data.categoria || "");
        setImagenes(data.imagenes   || []);
        setEpigrafes(data.epigrafes || []);
        setTamanos(data.tamanos     || []);

        // Guardamos el HTML en estado para que el useEffect de abajo lo aplique
        setHtmlPost(data.contenido || "");
      } catch (err: unknown) {
        if (err instanceof Error) console.error(err.message);
        Swal.fire("Error", "No se pudo cargar el post.", "error");
      }
    }

    fetchPost();
  }, [postId]);

  // ── Inyectar contenido cuando AMBOS están listos ──
  // Se dispara cada vez que cambia htmlPost o editorListo
  useEffect(() => {
    if (!editor || !editorListo || !htmlPost || yaInyecto.current) return;
    editor.commands.setContent(htmlPost);
    yaInyecto.current = true;
  }, [editor, editorListo, htmlPost]);

  // ── Subir imagen ──────────────────────────────────
  async function subirImagenACloudinary(file: File): Promise<string> {
    const formData = new FormData();
    formData.append("image", file);

    const res = await fetch(`${API_BASE}/upload`, { method: "POST", body: formData });
    if (!res.ok) throw new Error("Error al subir imagen");

    const data: { secure_url: string } = await res.json();
    return data.secure_url;
  }

  // ── Recuadro ──────────────────────────────────────
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

  // ── Imágenes del cuerpo ───────────────────────────
  async function handleImagenesSeleccionadas(
    e: React.ChangeEvent<HTMLInputElement>
  ): Promise<void> {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    setCargando(true);
    const urls: string[] = [];

    try {
      for (const file of files) {
        const urlOriginal   = await subirImagenACloudinary(file);
        const urlOptimizada = optimizarContenido(urlOriginal);
        urls.push(urlOptimizada);

        if (editor) {
          editor.chain().focus().insertContent(`<img src="${urlOptimizada}" />`).run();
        }
      }

      setImagenes((prev)  => [...prev, ...urls]);
      setEpigrafes((prev) => [...prev, ...urls.map(() => "")]);
      setTamanos((prev)   => [...prev, ...urls.map(() => 100)]);
    } catch (error: unknown) {
      if (error instanceof Error) console.error(error.message);
      Swal.fire("Error", "Hubo un problema al cargar las imágenes.", "error");
    } finally {
      setCargando(false);
    }
  }

  // ── Portada ───────────────────────────────────────
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
      Swal.fire("Error de Portada", "No se pudo reemplazar la imagen de portada.", "error");
    } finally {
      setCargando(false);
    }
  }

  // ── Guardar cambios ───────────────────────────────
  async function actualizarPost(): Promise<void> {
    const contenido = editor?.getHTML() ?? "";

    if (!titulo || !autor || !contenido || contenido === "<p></p>" || !categoria) {
      Swal.fire({
        icon: "warning",
        title: "Faltan datos obligatorios",
        text: "Completá título, autor, contenido y categoría.",
      });
      return;
    }

    const token  = localStorage.getItem("token")  ?? "";
    const avatar = localStorage.getItem("avatar") ?? "";

    const postActualizado: PostData = {
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
    };

    try {
      Swal.fire({
        title: "Guardando cambios...",
        html: "Actualizando la información del post.",
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => { Swal.showLoading(); },
      });

      const res = await fetch(`${API_BASE}/posts/${postId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(postActualizado),
      });

      Swal.close();

      if (res.ok) {
        await Swal.fire({
          icon: "success",
          title: "¡Post actualizado!",
          text: "Los cambios se guardaron con éxito.",
          timer: 2000,
          showConfirmButton: false,
        });
        router.push("/");
      } else {
        Swal.fire("Error", "El servidor rechazó la actualización del post.", "error");
      }
    } catch (err: unknown) {
      Swal.close();
      if (err instanceof Error) console.error(err.message);
      Swal.fire("Error inesperado", "Revisá la conexión o la consola del desarrollador.", "error");
    }
  }

  // ── Enlace ────────────────────────────────────────
  async function handleEnlace(): Promise<void> {
    const previousUrl = (editor?.getAttributes("link").href as string) ?? "";

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
          return "Ingresá una URL válida o dejalo vacío para quitar el enlace";
        }
        return null;
      },
    });

    if (url === undefined) return;
    if (url === "") { editor?.chain().focus().unsetLink().run(); return; }

    let cleanedUrl = url;
    if (!/^https?:\/\//i.test(url) && url.startsWith("http://localhost:3000")) {
      cleanedUrl = url.replace("http://localhost:3000", "");
    }

    editor?.chain().focus().extendMarkRange("link").setLink({ href: cleanedUrl }).run();
  }

  // ─────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────
  return (
    <div className="editor-container">
      <h2 className="editor-title">Editar Publicación</h2>

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
          const limpio = e.target.value.replace(/[^a-zA-ZÀ-ÿ\s]/g, "");
          setAutor(limpio);
          localStorage.setItem("nombre", limpio);
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
        >Negrita</button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleItalic().run()}
          className={editor?.isActive("italic") ? "active" : ""}
        >Itálica</button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleBulletList().run()}
          className={editor?.isActive("bulletList") ? "active" : ""}
        >Lista</button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
          className={editor?.isActive("heading", { level: 1 }) ? "active" : ""}
        >Título 1</button>

        <button
          type="button"
          onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
          className={editor?.isActive("heading", { level: 2 }) ? "active" : ""}
        >Título 2</button>

        <button
          type="button"
          onClick={handleEnlace}
          className={editor?.isActive("link") ? "active" : ""}
        >Enlace</button>

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
        >Limpiar</button>
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
        onClick={actualizarPost}
        className="publish-button"
        disabled={cargando}
      >
        Guardar cambios
      </button>
    </div>
  );
}