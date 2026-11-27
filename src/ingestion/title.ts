export interface EpisodeTitle {
  number: number;
  title: string;
}

// Los dos formatos conocidos (ver docs/estructura-episodio.md):
//   "Anécdota #307 - CULEBRÓN ITALIANO"               (actual)
//   "Se Me APAGÓ La TELE En ÁMSTERDAM- Anécdotas #59"  (viejo)
const FORMATS = [
  { regex: /^Anécdotas?\s*#(\d+)\s*-\s*(.+)$/iu, number: 1, title: 2 },
  { regex: /^(.+?)\s*-\s*Anécdotas?\s*#(\d+)$/iu, number: 2, title: 1 },
];

/**
 * Saca número y título de un título de YouTube con uno de los formatos conocidos.
 * Devuelve `null` si no matchea ninguno: puede no ser un Episodio, o ser un formato nuevo.
 */
export function parseEpisodeTitle(videoTitle: string): EpisodeTitle | null {
  const clean = videoTitle.normalize("NFC").trim();
  for (const format of FORMATS) {
    const match = format.regex.exec(clean);
    if (match) return { number: Number(match[format.number]), title: match[format.title].trim() };
  }
  return null;
}

/**
 * Para un título que ya se sabe que es de un Episodio pero no tiene formato conocido:
 * toma el primer "#N" como número y el resto como título. `null` si no hay número.
 */
export function extractFreeformTitle(videoTitle: string): EpisodeTitle | null {
  const clean = videoTitle.normalize("NFC").trim();
  const match = /#\s*(\d+)/u.exec(clean);
  if (!match) return null;
  const title = clean
    .replace(match[0], "")
    .replace(/anécdotas?/giu, "")
    .replace(/^[\s\-–—|:]+|[\s\-–—|:]+$/gu, "")
    .trim();
  return { number: Number(match[1]), title };
}
