"use client";

import { useEffect } from "react";

// Solo en desarrollo: pasás el mouse sobre un elemento y Cmd+C copia su componente y archivo para el agente.
export function ReactGrab() {
  useEffect(() => {
    void import("react-grab");
  }, []);
  return null;
}
