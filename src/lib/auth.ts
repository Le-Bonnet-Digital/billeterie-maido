import { supabase } from './supabase';
import { toast } from 'react-hot-toast';
import { getErrorMessage } from './errors';
import { logger } from './logger';

/** Représente un utilisateur authentifié. */
export interface User {
  id: string;
  email: string;
  role:
    | 'admin'
    | 'pony_provider'
    | 'archery_provider'
    | 'luge_provider'
    | 'atlm_collaborator'
    | 'client';
}

const ALLOWED_ROLES: User['role'][] = [
  'admin',
  'pony_provider',
  'archery_provider',
  'luge_provider',
  'atlm_collaborator',
  'client',
];

/**
 * Crée un utilisateur dans la table `users` de Supabase.
 * @param id Identifiant unique de l'utilisateur
 * @param email Adresse e-mail de l'utilisateur
 * @param role Rôle attribué à l'utilisateur
 * @returns L'utilisateur créé
 * @throws Si le rôle est invalide ou si l'insertion échoue
 */
export const createUser = async (
  id: string,
  email: string,
  role: User['role'],
): Promise<User> => {
  if (!role || !ALLOWED_ROLES.includes(role)) {
    throw new Error('Rôle non autorisé');
  }

  const { error } = await supabase.from('users').insert({ id, email, role });

  if (error) throw error;

  return { id, email, role };
};

/**
 * Authentifie un utilisateur via e-mail/mot de passe et récupère son rôle.
 * @param email Adresse e-mail
 * @param password Mot de passe
 * @returns L'utilisateur connecté ou `null` en cas d'échec
 * @sideeffects Affiche des toasts et écrit dans le logger
 */
export const signInWithEmail = async (
  email: string,
  password: string,
): Promise<User | null> => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;

    if (data.user) {
      // Récupérer le rôle depuis la table users maintenant que la récursion est résolue
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (userError) {
        logger.error('Erreur récupération rôle utilisateur', {
          error: userError,
          query: { table: 'users', action: 'select', userId: data.user.id },
        });
        toast.error('Erreur lors de la récupération du rôle utilisateur');
        return null;
      }

      let role: User['role'] = 'client';
      if (userData?.role && ALLOWED_ROLES.includes(userData.role)) {
        role = userData.role;
      } else if (!userData) {
        // Créer l'utilisateur s'il n'existe pas dans la table users
        logger.warn('Utilisateur absent de la table users, création automatique', {
          userId: data.user.id,
          email: data.user.email,
        });
        await createUser(data.user.id, data.user.email!, 'client');
        role = 'client';
      }

      return {
        id: data.user.id,
        email: data.user.email!,
        role,
      };
    }

    return null;
  } catch (err) {
    logger.error('Erreur connexion', {
      error: err,
      query: { action: 'auth.signInWithPassword', email },
    });
    toast.error(getErrorMessage(err) || 'Erreur lors de la connexion');
    return null;
  }
};

/**
 * Déconnecte l'utilisateur courant.
 * @sideeffects Affiche des toasts et écrit dans le logger
 */
export const signOut = async (): Promise<void> => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    toast.success('Déconnexion réussie');
  } catch (err) {
    logger.error('Erreur déconnexion', {
      error: err,
      query: { action: 'auth.signOut' },
    });
    toast.error('Erreur lors de la déconnexion');
  }
};

/**
 * Récupère l'utilisateur actuellement authentifié et son rôle.
 * @returns L'utilisateur courant ou `null`
 */
export const getCurrentUser = async (): Promise<User | null> => {
  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    // Récupérer le rôle depuis la table users
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (userError) {
      logger.error('Erreur récupération rôle utilisateur', {
        error: userError,
        query: { table: 'users', action: 'select', userId: user.id },
      });
      return null;
    }

    const role = userData?.role && ALLOWED_ROLES.includes(userData.role) 
      ? userData.role 
      : 'client';

    return {
      id: user.id,
      email: user.email!,
      role,
    };
  } catch (err) {
    logger.error('Erreur récupération utilisateur', {
      error: err,
      query: { action: 'auth.getUser' },
    });
    return null;
  }
};
