import { supabase } from './supabase';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from './errors';
import { logger } from './logger';

export interface User {
  id: string;
  email: string;
  role: 'admin' | 'pony_provider' | 'archery_provider' | 'client';
}

const ALLOWED_ROLES: User['role'][] = ['admin', 'pony_provider', 'archery_provider', 'client'];

export const createUser = async (id: string, email: string, role: User['role']): Promise<User> => {
  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw new Error('Rôle non autorisé');
  }

  const { error } = await supabase
    .from('users')
    .insert({ id, email, role });

  if (error) throw error;

  return { id, email, role };
};

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
        logger.warn('Utilisateur non trouvé dans la table users, création...', {
          error: userError,
          query: { table: 'users', action: 'select', userId: data.user.id }
        });
        return await createUser(data.user.id, data.user.email!, 'client');
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        role: userData.role
      };
    }

    return null;
  } catch (err) {
    logger.error('Erreur connexion', {
      error: err,
      query: { action: 'auth.signInWithPassword', email }
    });
    toast.error(getErrorMessage(err) || 'Erreur lors de la connexion');
    return null;
  }
};

export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Déconnexion réussie');
  } catch (err) {
    logger.error('Erreur déconnexion', {
      error: err,
      query: { action: 'auth.signOut' }
    });
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
    logger.error('Erreur récupération utilisateur', {
      error: err,
      query: { table: 'users', action: 'select' }
    });
    return null;
  }
};