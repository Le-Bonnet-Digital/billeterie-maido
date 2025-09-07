import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createUser,
  signInWithEmail,
  signOut,
  getCurrentUser,
  type User,
} from '../auth';
import { toast } from 'react-hot-toast';
import { logger } from '../logger';

// Mock toast
vi.mock('react-hot-toast', () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

// Mock logger
const loggerMock = vi.hoisted(() => ({ warn: vi.fn(), error: vi.fn() }));
vi.mock('../logger', () => ({ logger: loggerMock }));

// Mock supabase
const {
  insertMock,
  singleMock,
  fromMock,
  signInWithPasswordMock,
  signOutMock,
  getUserMock,
} = vi.hoisted(() => {
  const insertMock = vi.fn();
  const singleMock = vi.fn();
  const eqMock = vi.fn().mockReturnValue({ single: singleMock });
  const selectMock = vi.fn().mockReturnValue({ eq: eqMock });
  const fromMock = vi
    .fn()
    .mockReturnValue({ insert: insertMock, select: selectMock });
  const signInWithPasswordMock = vi.fn();
  const signOutMock = vi.fn();
  const getUserMock = vi.fn();
  return {
    insertMock,
    singleMock,
    fromMock,
    signInWithPasswordMock,
    signOutMock,
    getUserMock,
  };
});

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      signInWithPassword: signInWithPasswordMock,
      signOut: signOutMock,
      getUser: getUserMock,
    },
    from: fromMock,
  },
}));

beforeEach(() => {
  vi.clearAllMocks();
  insertMock.mockReset();
  singleMock.mockReset();
  signInWithPasswordMock.mockReset();
  signOutMock.mockReset();
  getUserMock.mockReset();
  loggerMock.warn.mockReset();
  loggerMock.error.mockReset();

  insertMock.mockResolvedValue({ error: null });
  singleMock.mockResolvedValue({
    data: { role: 'admin' },
    error: null,
    status: 200,
  });
});

describe('createUser', () => {
  it('refuse les rôles non autorisés', async () => {
    await expect(
      createUser('1', 'a@b.com', 'hacker' as unknown as User['role']),
    ).rejects.toThrow('Rôle non autorisé');
    expect(fromMock).not.toHaveBeenCalled();
  });
});

describe('signInWithEmail', () => {
  it('réussit avec un utilisateur existant', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: '1', email: 'admin@test.com' } },
      error: null,
    });

    const result = await signInWithEmail('admin@test.com', 'pass');

    expect(result).toEqual({ id: '1', email: 'admin@test.com', role: 'admin' });
  });

  it('crée un utilisateur inexistant', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: '2', email: 'client@test.com' } },
      error: null,
    });
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'No user' },
      status: 406,
    });

    const result = await signInWithEmail('client@test.com', 'pass');

    expect(result).toEqual({
      id: '2',
      email: 'client@test.com',
      role: 'client',
    });
    expect(insertMock).toHaveBeenCalledWith({
      id: '2',
      email: 'client@test.com',
      role: 'client',
    });
    expect(logger.warn).toHaveBeenCalled();
  });

  it("ne crée pas l'utilisateur si la récupération du rôle échoue", async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: { id: '3', email: 'err@test.com' } },
      error: null,
    });
    singleMock.mockResolvedValue({
      data: null,
      error: { message: 'fail' },
      status: 500,
    });

    const result = await signInWithEmail('err@test.com', 'pass');

    expect(result).toBeNull();
    expect(insertMock).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });

  it('gère les erreurs de connexion', async () => {
    signInWithPasswordMock.mockResolvedValue({
      data: { user: null },
      error: new Error('bad'),
    });

    const result = await signInWithEmail('bad@test.com', 'wrong');

    expect(result).toBeNull();
    expect(toast.error).toHaveBeenCalled();
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('signOut', () => {
  it('succès', async () => {
    signOutMock.mockResolvedValue({ error: null });
    await signOut();
    expect(toast.success).toHaveBeenCalledWith('Déconnexion réussie');
  });

  it('échec', async () => {
    signOutMock.mockResolvedValue({ error: new Error('fail') });
    await signOut();
    expect(toast.error).toHaveBeenCalledWith('Erreur lors de la déconnexion');
    expect(logger.error).toHaveBeenCalled();
  });
});

describe('getCurrentUser', () => {
  it("retourne l'utilisateur courant", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: '1', email: 'u@test.com' } },
    });

    const result = await getCurrentUser();

    expect(result).toEqual({ id: '1', email: 'u@test.com', role: 'admin' });
  });

  it('retourne null quand aucun utilisateur', async () => {
    getUserMock.mockResolvedValue({ data: { user: null } });

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });

  it('retourne null quand la requête de rôle échoue', async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: '1', email: 'u@test.com' } },
    });
    singleMock.mockResolvedValue({ data: null, error: { message: 'fail' } });

    const result = await getCurrentUser();

    expect(result).toBeNull();
  });

  it('retourne null et log en cas d’erreur', async () => {
    getUserMock.mockRejectedValue(new Error('network'));

    const result = await getCurrentUser();

    expect(result).toBeNull();
    expect(logger.error).toHaveBeenCalled();
  });
});
