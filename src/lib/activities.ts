// src/lib/activities.ts
import { supabase } from './supabase';
import { toSlug } from './slug';

/** Schéma minimal utile d'après ta table réelle */
type ActivitiesTableRow = {
  id: string;
  name: string;
  parc_sort_order: number | null;
  // Champs présents mais non utilisés ici :
  // description?: string | null;
  // icon?: string | null;
  // is_parc_product?: boolean | null;
  // parc_price?: string | null; // numeric -> string
  // parc_description?: string | null;
  // parc_category?: string | null;
  // parc_requires_time_slot?: boolean | null;
  // parc_image_url?: string | null;
};

export type ActivityRow = {
  id: string;
  name: string; // libellé affiché
  slug: string; // dérivé de `name` via toSlug
  parc_sort_order: number | null;
};

/** Charge les activités et fabrique un slug stable pour le front */
export async function fetchActivities(): Promise<ActivityRow[]> {
  const { data, error } = await supabase
    .from('activities')
    .select('id,name,parc_sort_order')
    .order('parc_sort_order', { ascending: true })
    .order('name', { ascending: true })
    .returns<ActivitiesTableRow[]>(); // ✅ typage explicite du résultat

  if (error) {
    // Fallback raisonnable si la BDD n’est pas joignable
    return [
      { id: 'fallback-1', name: 'Poney', slug: 'poney', parc_sort_order: 1 },
      {
        id: 'fallback-2',
        name: 'Tir à l’arc',
        slug: 'tir_arc',
        parc_sort_order: 2,
      },
    ];
  }

  const rows: ActivitiesTableRow[] = Array.isArray(data) ? data : [];

  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    slug: toSlug(r.name),
    parc_sort_order: r.parc_sort_order,
  }));
}
