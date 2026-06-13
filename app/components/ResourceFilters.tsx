"use client";

import { LayoutGrid, FileText, Video, Image, BookOpen } from "lucide-react";
import type { ResourceType } from "../types/recursos";
import "../style/Recursos.css";

type FilterValue = "todos" | ResourceType;

interface ResourceFiltersProps {
  active: FilterValue;
  onChange: (v: FilterValue) => void;
  counts: Record<FilterValue, number>;
}

const FILTERS: { value: FilterValue; label: string; Icon: React.FC<{ size?: number }> }[] = [
  { value: "todos",  label: "Todos",    Icon: ({ size }) => <LayoutGrid size={size ?? 14} /> },
  { value: "pdf",    label: "PDFs",     Icon: ({ size }) => <FileText size={size ?? 14} /> },
  { value: "video",  label: "Videos",   Icon: ({ size }) => <Video size={size ?? 14} /> },
  { value: "imagen", label: "Imágenes", Icon: ({ size }) => <Image size={size ?? 14} /> },
  { value: "libro",  label: "Libros",   Icon: ({ size }) => <BookOpen size={size ?? 14} /> },
];

export default function ResourceFilters({ active, onChange, counts }: ResourceFiltersProps) {
  return (
    <div className="rf-container" role="tablist" aria-label="Filtrar recursos">
      {FILTERS.map(({ value, label, Icon }) => (
        <button
          key={value}
          role="tab"
          aria-selected={active === value}
          className={`rf-tab${active === value ? " rf-tab--active" : ""}`}
          onClick={() => onChange(value)}
        >
          <Icon size={14} />
          <span>{label}</span>
          {counts[value] > 0 && (
            <span className="rf-count">{counts[value]}</span>
          )}
        </button>
      ))}
    </div>
  );
}