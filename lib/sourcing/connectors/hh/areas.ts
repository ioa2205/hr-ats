/**
 * Curated hh.uz region catalog for the Uzbek market. IDs are the canonical hh
 * area ids (GET https://api.hh.ru/areas/97). The full tree has ~175 entries;
 * this is the shortlist of regional centers a recruiter actually targets. The
 * API still accepts any area id, so power users aren't boxed in.
 *
 * Pure data (no server-only imports) so the config dialog can import it too.
 */
export interface HhArea {
  /** hh area id (digits). */
  id: string;
  /** display name (Russian, exactly as it appears on hh.uz). */
  name: string;
}

/** Whole country — the hh area id for Uzbekistan. */
export const HH_UZBEKISTAN_AREA_ID = "97";

export const HH_UZ_AREAS: HhArea[] = [
  { id: "97", name: "Узбекистан" },
  { id: "2759", name: "Ташкент" },
  { id: "2778", name: "Самарканд" },
  { id: "2768", name: "Андижан" },
  { id: "2779", name: "Наманган" },
  { id: "2782", name: "Фергана" },
  { id: "2781", name: "Бухара" },
  { id: "2783", name: "Карши" },
  { id: "2784", name: "Коканд" },
  { id: "2785", name: "Маргилан" },
  { id: "2786", name: "Джизак" },
  { id: "2788", name: "Ургенч" },
  { id: "2789", name: "Термез" },
  { id: "2790", name: "Навои" },
  { id: "2780", name: "Нукус" },
  { id: "2787", name: "Чирчик" },
  { id: "2791", name: "Шахрисабз" },
  { id: "2870", name: "Гулистан" },
];

/** Display name for a curated area id (null for "all regions" or a custom id). */
export function hhAreaName(id: string | null | undefined): string | null {
  if (!id) return null;
  return HH_UZ_AREAS.find((a) => a.id === id)?.name ?? null;
}
