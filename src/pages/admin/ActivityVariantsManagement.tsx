import { useEffect, useState } from 'react';
import { supabase, isSupabaseConfigured } from '../../lib/supabase';
import { Plus, Trash2, Save, ListOrdered, Image as ImageIcon } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { logger } from '../../lib/logger';
import { processAndUploadPublicImage, validateImageFile, deletePublicImage } from '../../lib/upload';

interface Activity { id: string; name: string; }
interface Variant { id: string; name: string; price: number; is_active: boolean; sort_order: number; variant_stock: number | null; }
type DraftVariant = Partial<Variant> & { imageFile?: File | null };

export default function ActivityVariantsManagement() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [selectedActivity, setSelectedActivity] = useState<string>('');
  const [variants, setVariants] = useState<(Variant & { image_url?: string | null })[]>([]);
  const [drafts, setDrafts] = useState<Record<string, DraftVariant>>({});
  const [newVariant, setNewVariant] = useState<{ name: string; price: number; stock: number | ''; imageFile?: File | null; imagePreview?: string | null }>({ name: '', price: 0, stock: '', imageFile: null, imagePreview: null });

  useEffect(() => { init(); }, []);
  useEffect(() => { if (selectedActivity) loadVariants(selectedActivity); }, [selectedActivity]);

  const init = async () => {
    try {
      if (!isSupabaseConfigured()) { setLoading(false); return; }
      setLoading(true);
      const { data, error } = await supabase.from('activities').select('id, name').order('name');
      if (error) throw error;
      setActivities(data || []);
      if ((data || []).length > 0) setSelectedActivity(data![0].id);
    } catch (err) {
      logger.error('Erreur chargement activités', { error: err });
      toast.error('Chargement impossible');
    } finally { setLoading(false); }
  };

  const loadVariants = async (activityId: string) => {
    try {
      const { data, error } = await supabase
        .from('activity_variants')
        .select('id, name, price, is_active, sort_order, variant_stock, image_url')
        .eq('activity_id', activityId)
        .order('sort_order');
      if (error) throw error;
      setVariants(data || []);
      setDrafts({});
    } catch (err) {
      logger.error('Erreur chargement variantes', { error: err });
      toast.error('Chargement impossible');
    }
  };

  const createVariant = async () => {
    if (!selectedActivity || !newVariant.name) return;
    try {
      let image_url: string | null | undefined = undefined;
      if (newVariant.imageFile) {
        try {
          const err = validateImageFile(newVariant.imageFile);
          if (err) { toast.error(err); return; }
          const uploaded = await processAndUploadPublicImage('activities', newVariant.imageFile, 'variants', {
            minWidth: 1200,
            minHeight: 600,
            maxWidth: 1600,
            maxHeight: 900,
            mimeType: 'image/jpeg',
            quality: 0.85,
          });
          if (!uploaded) throw new Error("Échec de l'upload");
          image_url = uploaded.publicUrl;
        } catch (e) {
          const msg = e instanceof Error ? e.message : undefined;
          toast.error(msg || "Échec de l'upload de l'image");
        }
      }
      const { error } = await supabase
        .from('activity_variants')
        .insert({
          activity_id: selectedActivity,
          name: newVariant.name,
          price: newVariant.price,
          variant_stock: newVariant.stock === '' ? null : Number(newVariant.stock),
          is_active: true,
          sort_order: variants.length,
          ...(image_url ? { image_url } : {}),
        });
      if (error) throw error;
      setNewVariant({ name: '', price: 0, stock: '', imageFile: null, imagePreview: null });
      await loadVariants(selectedActivity);
      toast.success('Variante créée');
    } catch (err) {
      logger.error('Erreur création variante', { error: err });
      toast.error('Création impossible');
    }
  };

  const saveVariant = async (id: string) => {
    const d = drafts[id]; if (!d) return;
    try {
      let image_url: string | null | undefined = undefined;
      const file = (d.imageFile ?? null) as File | null;
      if (file) {
        try {
          const err = validateImageFile(file);
          if (err) { toast.error(err); return; }
          const uploaded = await processAndUploadPublicImage('activities', file, 'variants', {
            minWidth: 1200,
            minHeight: 600,
            maxWidth: 1600,
            maxHeight: 900,
            mimeType: 'image/jpeg',
            quality: 0.85,
          });
          if (!uploaded) throw new Error("Échec de l'upload");
          image_url = uploaded.publicUrl;
          const old = variants.find(v => v.id === id)?.image_url;
          if (old) await deletePublicImage(old);
        } catch (e) {
          const msg = e instanceof Error ? e.message : undefined;
          toast.error(msg || "Échec de l'upload de l'image");
        }
      }
      const { error } = await supabase
        .from('activity_variants')
        .update({
          name: d.name,
          price: d.price,
          sort_order: d.sort_order,
          variant_stock: (d.variant_stock as number | null | undefined),
          ...(image_url !== undefined ? { image_url } : {}),
        })
        .eq('id', id);
      if (error) throw error;
      await loadVariants(selectedActivity);
    } catch (err) {
      logger.error('Erreur mise à jour variante', { error: err });
      toast.error('Mise à jour impossible');
    }
  };

  const toggleVariant = async (id: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('activity_variants')
        .update({ is_active: !isActive })
        .eq('id', id);
      if (error) throw error;
      await loadVariants(selectedActivity);
    } catch (err) {
      logger.error('Erreur mise à jour variante', { error: err });
      toast.error('Mise à jour impossible');
    }
  };

  const removeVariant = async (id: string) => {
    if (!confirm('Supprimer cette variante ?')) return;
    try {
      const { error } = await supabase.from('activity_variants').delete().eq('id', id);
      if (error) throw error;
      await loadVariants(selectedActivity);
    } catch (err) {
      logger.error('Erreur suppression variante', { error: err });
      toast.error('Suppression impossible');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Variantes d'Activité (Parc)</h1>
        <p className="text-gray-600">Créez et gérez les forfaits (ex: Luge 4/8/10 descentes)</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4 flex items-center gap-3">
        <select value={selectedActivity} onChange={(e)=>setSelectedActivity(e.target.value)} className="px-3 py-2 border border-gray-300 rounded-md">
          {activities.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-lg shadow-sm p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-md" value={newVariant.name} onChange={(e)=>setNewVariant({...newVariant,name:e.target.value})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Prix (€)</label>
            <input type="number" min="0" step="0.01" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={newVariant.price} onChange={(e)=>setNewVariant({...newVariant,price:parseFloat(e.target.value||'0')})} />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Stock</label>
            <input type="number" min="0" className="w-full px-3 py-2 border border-gray-300 rounded-md" value={newVariant.stock} onChange={(e)=>setNewVariant({...newVariant,stock:e.target.value===''?'':parseInt(e.target.value)})} placeholder="vide = illimité" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Image</label>
            <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
              <ImageIcon className="h-4 w-4" />
              Choisir
              <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                const f = e.target.files?.[0] || null; setNewVariant(prev=>({...prev, imageFile: f, imagePreview: f? URL.createObjectURL(f): null}));
              }} />
            </label>
            {newVariant.imagePreview && (
              <img src={newVariant.imagePreview} alt="aperçu" className="h-12 mt-2 rounded-md object-cover" />
            )}
          </div>
          <div className="md:col-span-1">
            <button onClick={createVariant} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium inline-flex items-center justify-center gap-2"><Plus className="h-4 w-4"/>Créer</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Variantes ({variants.length})</h2>
        </div>
        {variants.length === 0 ? (
          <div className="p-8 text-center text-gray-600">Aucune variante</div>
        ) : (
          <div className="divide-y divide-gray-200">
            {variants.map(v => (
              <div key={v.id} className="p-6 flex items-center justify-between">
                <div className="flex-1 grid grid-cols-1 md:grid-cols-6 gap-3 items-center">
                  {v.image_url && (
                    <img src={v.image_url} alt={v.name} className="h-10 w-16 object-cover rounded" />
                  )}
                  <input className="px-3 py-2 border border-gray-300 rounded-md" value={drafts[v.id]?.name ?? v.name} onChange={(e)=>setDrafts(prev=>({...prev, [v.id]: { ...(prev[v.id]||{}), name:e.target.value }}))} />
                  <input type="number" min="0" step="0.01" className="px-3 py-2 border border-gray-300 rounded-md" value={drafts[v.id]?.price ?? v.price} onChange={(e)=>setDrafts(prev=>({...prev, [v.id]: { ...(prev[v.id]||{}), price:parseFloat(e.target.value||'0') }}))} />
                  <div className="flex items-center gap-2">
                    <ListOrdered className="h-4 w-4 text-gray-400" />
                    <input type="number" className="w-24 px-3 py-2 border border-gray-300 rounded-md" value={drafts[v.id]?.sort_order ?? v.sort_order} onChange={(e)=>setDrafts(prev=>({...prev, [v.id]: { ...(prev[v.id]||{}), sort_order:parseInt(e.target.value||'0') }}))} />
                  </div>
                  <input type="number" min="0" className="px-3 py-2 border border-gray-300 rounded-md" value={drafts[v.id]?.variant_stock ?? (v.variant_stock ?? '')} onChange={(e)=>setDrafts(prev=>({...prev, [v.id]: { ...(prev[v.id]||{}), variant_stock: e.target.value===''? null : parseInt(e.target.value) }}))} placeholder="vide = illimité" />
                  <label className="inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-md text-sm cursor-pointer hover:bg-gray-50">
                    <ImageIcon className="h-4 w-4" />
                    Image
                    <input type="file" accept="image/*" className="hidden" onChange={(e)=>{
                      const f = e.target.files?.[0] || null;
                      setDrafts(prev=>({...prev, [v.id]: { ...(prev[v.id]||{}), imageFile: f }}));
                    }} />
                  </label>
                </div>
                <div className="flex items-center gap-2 ml-3">
                  <button onClick={() => toggleVariant(v.id, v.is_active)} className={`px-3 py-1 rounded-md text-sm font-medium ${v.is_active?'bg-green-100 text-green-800':'bg-gray-200 text-gray-700'}`}>{v.is_active?'Actif':'Inactif'}</button>
                  <button onClick={() => saveVariant(v.id)} className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded-md" title="Enregistrer"><Save className="h-4 w-4"/></button>
                  {v.image_url && (
                    <button onClick={async ()=>{
                      try {
                        if (v.image_url) { await deletePublicImage(v.image_url); }
                        const { error } = await supabase.from('activity_variants').update({ image_url: null }).eq('id', v.id);
                        if (error) throw error;
                        await loadVariants(selectedActivity);
                      } catch { toast.error('Suppression image impossible'); }
                    }} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md" title="Supprimer l'image">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                  <button onClick={() => removeVariant(v.id)} className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md" title="Supprimer"><Trash2 className="h-4 w-4"/></button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
