export type ResourceType = "pdf" | "video" | "imagen" | "libro";

export interface Resource {
  _id?: string;
  type: ResourceType;
  title: string;
  filename: string;
  portada: string;
  fileData?: string;
  file?: string;
  videoUrl?: string;
  esFijo?: boolean;
  createdAt?: string;
}

export interface UploadPayload {
  title: string;
  type: ResourceType;
  filename: string;
  portada: string;
  fileData?: string;
  videoUrl?: string;
  email?: string;
}