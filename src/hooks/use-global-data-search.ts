import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { SEARCH_SPECS, SearchResult, Row, escapeSearchTerm } from '@/lib/global-search-specs';

/**
 * Query pencarian data lintas modul (dipakai GlobalSearch di header dan
 * CommandPalette Ctrl+K), diekstrak jadi satu hook supaya keduanya konsisten.
 */
export function useGlobalDataSearch(term: string) {
  const trimmed = term.trim();

  const { data: results = [], isFetching } = useQuery({
    queryKey: ['global-search', trimmed],
    enabled: trimmed.length >= 2,
    staleTime: 1000 * 30,
    queryFn: async (): Promise<SearchResult[]> => {
      const safe = escapeSearchTerm(trimmed);
      if (safe.length < 2) return [];
      const settled = await Promise.all(
        SEARCH_SPECS.map(async (spec) => {
          try {
            const filter = spec.cols.map((c) => `${c}.ilike.%${safe}%`).join(',');
            const { data, error } = await (supabase as any)
              .from(spec.table)
              .select('*')
              .or(filter)
              .limit(5);
            if (error || !data) return [] as SearchResult[];
            return (data as Row[]).map((r) => ({
              id: `${spec.table}-${r.id}`,
              recordId: String(r.id),
              record: r,
              title: String(spec.title(r) ?? '-'),
              subtitle: String(spec.subtitle(r) ?? ''),
              module: spec.module,
              icon: spec.icon,
              href: typeof spec.href === 'function' ? spec.href(r) : spec.href,
              badgeColor: spec.badgeColor,
              editable: !!spec.editable,
            }));
          } catch {
            return [] as SearchResult[];
          }
        }),
      );
      return settled.flat();
    },
  });

  const groupedResults = useMemo(() => {
    const groups: Record<string, SearchResult[]> = {};
    results.forEach((r) => {
      if (!groups[r.module]) groups[r.module] = [];
      groups[r.module].push(r);
    });
    return groups;
  }, [results]);

  return { results, groupedResults, isFetching };
}
