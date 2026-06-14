import React from "react";

const Descargo: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: "#eaf6ff",
        borderLeft: "6px solid #007acc",
        borderRadius: "8px",
        padding: "1.5em",
        margin: "2em auto",
        maxWidth: "800px",
        fontFamily: "Arial, sans-serif",
        color: "#333",
        lineHeight: "1.6",
        boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
      }}
    >
      <h2
        style={{ marginBottom: "0.75em", fontSize: "1.5em", color: "#007acc" }}
      >
        Descargo de Responsabilidad
      </h2>
      <p style={{ fontStyle: "italic", marginBottom: "1em" }}>
        La información publicada en este sitio tiene fines{" "}
        <strong>educativos, informativos y orientativos</strong>. Está destinada
        a brindar herramientas de reflexión y comprensión sobre el uso de
        tecnologías como la Inteligencia Artificial (IA), sus implicancias en la
        vida cotidiana, la crianza, la salud emocional, y los roles sociales en
        distintos contextos.
      </p>
      <p style={{ fontStyle: "italic", marginBottom: "1em" }}>
        Este contenido{" "}
        <strong>
          no reemplaza el asesoramiento, diagnóstico ni tratamiento de
          profesionales de la salud
        </strong>{" "}
        (médicos, psicólogos, psiquiatras u otros especialistas). Como
        Acompañante Terapéutico, mi rol se basa en la escucha activa, la
        contención y el acompañamiento desde una mirada integral y contextual,
        sin emitir juicios clínicos ni diagnósticos.
      </p>
      <p style={{ fontStyle: "italic" }}>
        El uso de cualquier información aquí compartida queda bajo la
        responsabilidad personal de quien la consulte. En caso de requerir
        atención específica, se recomienda siempre acudir a profesionales
        habilitados en salud mental o medicina.
      </p>
    </div>
  );
};

export default Descargo;