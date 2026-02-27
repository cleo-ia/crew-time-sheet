import { supabase } from "@/integrations/supabase/client";

const BATCH_CHUNK_SIZE = 100;

/**
 * Exécute une requête Supabase avec un `.in(column, ids)` par paquets de 100
 * pour éviter la troncature d'URL PostgREST (~8KB).
 */
export async function batchQueryIn<T = any>(
  table: string,
  select: string,
  column: string,
  ids: string[],
  options?: {
    order?: { column: string; ascending: boolean };
    extraFilters?: (query: any) => any;
    limitPerChunk?: number;
  }
): Promise<T[]> {
  if (!ids || ids.length === 0) return [];

  const results: T[] = [];

  for (let i = 0; i < ids.length; i += BATCH_CHUNK_SIZE) {
    const chunk = ids.slice(i, i + BATCH_CHUNK_SIZE);
    let query = supabase
      .from(table as any)
      .select(select)
      .in(column, chunk) as any;

    if (options?.extraFilters) {
      query = options.extraFilters(query);
    }

    const { data, error } = await query;

    if (error) throw error;
    if (data) results.push(...(data as T[]));
  }

  // Si un order est demandé, re-trier le résultat agrégé
  if (options?.order) {
    const col = options.order.column;
    const asc = options.order.ascending;
    results.sort((a: any, b: any) => {
      const va = a[col];
      const vb = b[col];
      if (va < vb) return asc ? -1 : 1;
      if (va > vb) return asc ? 1 : -1;
      return 0;
    });
  }

  return results;
}
