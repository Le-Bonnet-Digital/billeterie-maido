import { supabase } from './supabase';
import { toast } from 'react-hot-toast';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'pony_provider' | 'archery_provider' | 'client';
}

export const signInWithEmail = async (email: string, password: string): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (error) throw error;

    if (data.user) {
      // Récupérer le rôle de l'utilisateur
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .single();

      if (userError) {
        console.warn('Utilisateur non trouvé dans la table users, création...');
        // Créer l'utilisateur avec le rôle admin par défaut
        await supabase
          .from('users')
          .insert({
            id: data.user.id,
            email: data.user.email!,
            role: 'admin'
          });
        
        return {
          id: data.user.id,
          email: data.user.email!,
          role: 'admin'
        };
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        role: userData.role
      };
    }

    return null;
  } catch (err) {
    console.error('Erreur connexion:', err);
    toast.error('Erreur lors de la connexion');
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Déconnexion réussie');
  } catch (err) {
    console.error('Erreur déconnexion:', err);
    toast.error('Erreur lors de la déconnexion');
  }
};

export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return null;

    const { data: userData, error } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (error) return null;

    return {
      id: user.id,
      email: user.email!,
      role: userData.role
    };
  } catch (err) {
    console.error('Erreur récupération utilisateur:', err);
    return null;
  }
};