import { useEffect, useState } from 'react';
import { isSupabaseConfigured, supabase, type Database } from '../lib/supabase';
import { addActivityVariantToCart } from '../lib/cart';
import { formatPrice } from '../lib/money';

type Variant = {
  id: string;
  name: string;
  price: number;
  remaining_stock?: number;
  sort_order?: number;
  image_url?: string | null;
};

type ActivityGroup = {
  id: string;
  name: string;
  icon: string;
  description?: string;
  parc_description?: string | null;
  category?: string;
  requires_time_slot: boolean;
  image_url?: string | null;
  variants: Variant[];
};

export default function ParkProducts() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [groups, setGroups] = useState<ActivityGroup[]>([]);
  const [isEventDay, setIsEventDay] = useState<boolean>(false);
  const [qtyByVariant, setQtyByVariant] = useState<Record<string, number>>({});

  const renderChips = (group: ActivityGroup) => {
    // Chips pilotées par la BDD (parc_description). Pas d'heuristiques côté code.

    const base: string[] = [group.requires_time_slot ? 'Créneau requis' : 'Accès libre'];
    const extraSource = group.parc_description || group.description || '';
    const extra = extraSource
      .split(/[•\-;:,\n]+/g)
      .map((s) => s.trim())
      .filter((s) => s.length > 2);

    // Normalize and deduplicate (exact + near-duplicates)
    const candidates = [...base, ...extra];

    const toExactKey = (s: string) => s
      .replace(/\s*\(.*?\)\s*/g, ' ')
      .replace(/[’`´]/g, "'")
      .replace(/[.]+$/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();

    const toTokens = (s: string) => {
      const stop = new Set([
        'de','du','des','la','le','les','d','l','à','a','au','aux','et','sur','sous','dans','avec','un','une','pour','par',
        'obligatoire?','obligatoire', 'minimum','maximum','min','max','mois','ans','an','place','fourni','fournie'
      ]);
      const base = s
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // strip accents
        .replace(/[’`´]/g, "'")
        .toLowerCase()
        .replace(/\s*\(.*?\)\s*/g, ' ')
        .replace(/[^a-z0-9]+/g, ' ');
      return base.trim().split(/\s+/).filter(t => t && !stop.has(t));
    };

    type ChipItem = { display: string; key: string; tokens: Set<string> };
    const items: ChipItem[] = [];

    for (const raw of candidates) {
      const display = raw.trim().replace(/[.]+$/g, '');
      const key = toExactKey(display);
      if (!key) continue;
      const tokens = new Set(toTokens(display));
      items.push({ display, key, tokens });
    }

    // First pass: exact key dedupe (keep first)
    const byKey = new Map<string, ChipItem>();
    for (const it of items) {
      if (!byKey.has(it.key)) byKey.set(it.key, it);
    }

    // Second pass: drop near-duplicates by token subset, keep the more specific (more tokens)
    const unique: ChipItem[] = [];
    outer: for (const it of byKey.values()) {
      for (let i = 0; i < unique.length; i++) {
        const u = unique[i];
        const isSubset = (a: Set<string>, b: Set<string>) => {
          if (a.size === 0) return true;
          for (const t of a) if (!b.has(t)) return false;
          return true;
        };
        if (isSubset(it.tokens, u.tokens)) {
          // Current is less or equal specific → skip it
          continue outer;
        }
        if (isSubset(u.tokens, it.tokens)) {
          // Replace previous with more specific current
          unique[i] = it;
          continue outer;
        }
      }
      unique.push(it);
    }

    const chips = unique.map(it => it.display);
    return (
      <div className="mt-1 flex flex-wrap gap-2">
        {chips.map((c, i) => (
          <span
            key={i}
            className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-gray-100 text-gray-700 border border-gray-200"
          >
            {c}
          </span>
        ))}
      </div>
    );
  };

  useEffect(() => {
    const load = async () => {
      if (!isSupabaseConfigured()) {
        setLoading(false);
        setError("Supabase n'est pas configuré");
        return;
      }
      try {
        setLoading(true);
        type ParcActivitiesWithVariants = Database['public']['Functions']['get_parc_activities_with_variants']['Returns'];
        const rpc = await supabase.rpc('get_parc_activities_with_variants');
        if (rpc.error) throw rpc.error;
        setGroups((rpc.data || []) as ParcActivitiesWithVariants as unknown as ActivityGroup[]);
        setError(null);
      } catch {
        setError('Impossible de charger les produits');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  useEffect(() => {
    const checkEventDay = async () => {
      if (!isSupabaseConfigured()) return;
      try {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date(start);
        end.setDate(end.getDate() + 1);
        const { data } = await supabase
          .from('events')
          .select('id')
          .eq('status', 'published')
          .gte('event_date', start.toISOString())
          .lt('event_date', end.toISOString())
          .limit(1);
        setIsEventDay(!!(data && data.length > 0));
      } catch {
        setIsEventDay(false);
      }
    };
    checkEventDay();
  }, []);

  return (
    <section className="mb-12" aria-labelledby="park-products-title">
      <h2 id="park-products-title" className="text-2xl font-bold text-gray-900 mb-1">Activités à la carte</h2>
      <p className="text-xs text-gray-500 mb-4">
        {isEventDay ? (
          <span className="text-red-600">Indisponibles aujourd'hui (jour d'événement)</span>
        ) : (
          <span>Les activités à la carte ne sont pas disponibles les jours d'événement.</span>
        )}
      </p>
      {loading && <div className="text-sm text-gray-500">Chargement des produits...</div>}
      {error && !loading && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md p-3 mb-3">{error}</div>
      )}
      {!loading && !error && groups.length === 0 && (
        <div className="text-gray-600">Aucun billet du parc disponible pour le moment.</div>
      )}
      {!loading && groups.length > 0 && (
        <div className="space-y-8">
          {groups.map((group) => (
            <div key={group.id} className="bg-white border border-gray-200 rounded-lg p-4 sm:p-5 w-full flex flex-col">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{group.icon}</span>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{group.name}</h3>
                    {group.category && (
                      <div className="mt-1 text-xs text-gray-500">{group.category}</div>
                    )}
                  </div>
                </div>
                {group.requires_time_slot && (
                  <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Créneau requis</span>
                )}
              </div>
              <div className="mt-4 flex gap-4">
                {/* Image commune */}
                <div className="w-32 h-32 sm:w-40 sm:h-40 rounded-md overflow-hidden bg-gray-100 flex-shrink-0">
                  {group.image_url ? (
                    <img
                      src={group.image_url}
                      alt={group.name}
                      loading="lazy"
                      decoding="async"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-r from-indigo-500 to-purple-500 flex items-center justify-center text-3xl">
                      <span className="drop-shadow-sm" aria-hidden="true">{group.icon}</span>
                    </div>
                  )}
                </div>

                {/* Infos activité + variantes */}
                <div className="flex-1 space-y-3">
                  {renderChips(group)}
                  {group.variants.map((v) => (
                    <div key={v.id} className="border border-gray-200 rounded-md p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="font-medium text-gray-900">{v.name}</div>
                          <div className="text-xs text-gray-500">{group.requires_time_slot ? 'Créneau requis' : 'Accès libre'}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-base sm:text-lg font-semibold text-blue-600">{formatPrice(v.price)}</div>
                          {typeof v.remaining_stock === 'number' && v.remaining_stock < 999999 && (
                            <div className="text-[11px] text-gray-500">{v.remaining_stock <= 0 ? 'Épuisé' : `${v.remaining_stock} restant(s)`}</div>
                          )}
                        </div>
                      </div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <div className="flex items-center gap-2 mr-1">
                          <button
                            onClick={() => setQtyByVariant(prev => ({ ...prev, [v.id]: Math.max(1, (prev[v.id] || 1) - 1) }))}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            aria-label="Diminuer la quantité"
                          >
                            -
                          </button>
                          <span className="text-lg font-semibold w-10 text-center">{qtyByVariant[v.id] || 1}</span>
                          <button
                            onClick={() => setQtyByVariant(prev => ({ ...prev, [v.id]: Math.min(99, (prev[v.id] || 1) + 1) }))}
                            className="p-2 border border-gray-300 rounded-md hover:bg-gray-50"
                            aria-label="Augmenter la quantité"
                          >
                            +
                          </button>
                        </div>
                        <button
                          onClick={() => addActivityVariantToCart(v.id, qtyByVariant[v.id] || 1)}
                          disabled={isEventDay || (typeof v.remaining_stock === 'number' && v.remaining_stock <= 0)}
                          className="px-4 py-2 rounded-md font-medium transition-colors text-white disabled:bg-gray-300 disabled:cursor-not-allowed bg-blue-600 hover:bg-blue-700"
                        >
                          Ajouter au panier
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
