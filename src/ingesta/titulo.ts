export interface TituloEpisodio {
  numero: number;
  titulo: string;
}

// Los dos formatos conocidos (ver docs/estructura-episodio.md):
//   "Anécdota #307 - CULEBRÓN ITALIANO"               (actual)
//   "Se Me APAGÓ La TELE En ÁMSTERDAM- Anécdotas #59"  (viejo)
const FORMATOS = [
  { regex: /^Anécdotas?\s*#(\d+)\s*-\s*(.+)$/iu, numero: 1, titulo: 2 },
  { regex: /^(.+?)\s*-\s*Anécdotas?\s*#(\d+)$/iu, numero: 2, titulo: 1 },
];

/**
 * Saca número y título de un título de YouTube con uno de los formatos conocidos.
 * Devuelve `null` si no matchea ninguno: puede no ser un Episodio, o ser un formato nuevo.
 */
export function parsearTituloEpisodio(tituloVideo: string): TituloEpisodio | null {
  const limpio = tituloVideo.normalize("NFC").trim();
  for (const formato of FORMATOS) {
    const match = formato.regex.exec(limpio);
    if (match) return { numero: Number(match[formato.numero]), titulo: match[formato.titulo].trim() };
  }
  return null;
}

/**
 * Para un título que ya se sabe que es de un Episodio pero no tiene formato conocido:
 * toma el primer "#N" como número y el resto como título. `null` si no hay número.
 */
export function extraerTituloLibre(tituloVideo: string): TituloEpisodio | null {
  const limpio = tituloVideo.normalize("NFC").trim();
  const match = /#\s*(\d+)/u.exec(limpio);
  if (!match) return null;
  const titulo = limpio
    .replace(match[0], "")
    .replace(/anécdotas?/giu, "")
    .replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/gu, "")
    .trim();
  return { numero: Number(match[1]), titulo };
}
