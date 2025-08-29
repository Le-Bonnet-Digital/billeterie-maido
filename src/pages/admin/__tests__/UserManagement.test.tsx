import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";

// Mocks for toasts
const successToast = vi.fn();
const errorToast = vi.fn();
vi.mock("react-hot-toast", () => ({
  toast: {
    success: (...args: unknown[]) => successToast(...args),
    error: (...args: unknown[]) => errorToast(...args),
  },
}));

// Mock current user as admin
vi.mock("../../../lib/auth", () => ({
  getCurrentUser: vi.fn(async () => ({
    id: "admin-1",
    email: "admin@test.com",
    role: "admin",
  })),
}));

describe("Admin UserManagement", () => {
  it("searches users and updates role", async () => {
    const users = [
      { id: "u1", email: "prov@test.com", role: "client" as const },
    ];

    const updateEq = vi.fn().mockResolvedValue({ error: null });

    const usersBuilder = {
      select: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      limit: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      eq: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      ilike: vi.fn().mockResolvedValue({ data: users, error: null }),
      update: vi.fn(() => ({
        eq: updateEq,
      })),
      then: vi.fn((resolve: (value: { data: typeof users; error: null }) => unknown) =>
        resolve({ data: users, error: null })
      ),
    };

    type UsersQueryBuilder = typeof usersBuilder;

    const { default: UserManagement } = await import("../UserManagement");
    const supa = (await import("../../../lib/supabase")) as unknown as {
      supabase: {
        from: (table: string) => UsersQueryBuilder | Record<string, never>;
      };
    };
    // Override supabase.from at runtime
    supa.supabase.from = vi.fn((table: string) =>
      table === "users" ? (usersBuilder as unknown as UsersQueryBuilder) : {}
    );

    render(<UserManagement />);

    const input = screen.getByPlaceholderText(/Rechercher par email/i);
    fireEvent.change(input, { target: { value: "prov@test.com" } });

    // Apply role filter which triggers search
    const roleSelect = screen.getByLabelText(/Filtrer par rôle/i);
    fireEvent.change(roleSelect, { target: { value: "client" } });

    // Wait for ilike and eq to be called
    type MockLike = { mock?: { calls?: unknown[] } };
    await waitFor(() => {
      expect(
        (usersBuilder.ilike as unknown as MockLike).mock?.calls?.length ?? 0
      ).toBeGreaterThanOrEqual(1);
      expect(usersBuilder.eq).toHaveBeenCalledWith("role", "client");
    });

    // Assert table shows the user
    await waitFor(
      () => {
        const noResultsMessage = screen.queryByText(/Aucun utilisateur trouvé/i);
        expect(noResultsMessage).not.toBeInTheDocument();

        const rows = screen.getAllByRole("row");
        const emailFound = rows.some((row) =>
          row.textContent?.includes("prov@test.com")
        );
        expect(emailFound).toBe(true);
      },
      { timeout: 2000 }
    );

    // Change role select for user and submit
    const select = await screen.findByLabelText(/Rôle de prov@test.com/i);
    expect(select).toBeInTheDocument();

    fireEvent.change(select as HTMLSelectElement, {
      target: { value: "pony_provider" },
    });

    // ensure update called
    await waitFor(() => {
      expect(updateEq).toHaveBeenCalled();
      expect(successToast).toHaveBeenCalled();
    });
  });

  it("bulk updates roles for selected users", async () => {
    const users = [
      { id: "u1", email: "a@test.com", role: "client" as const },
      { id: "u2", email: "b@test.com", role: "client" as const }
    ];

    const updateIn = vi.fn().mockResolvedValue({ error: null });

    const usersBuilder = {
      select: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      limit: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      eq: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      ilike: vi.fn().mockResolvedValue({ data: users, error: null }),
      update: vi.fn(() => ({ in: updateIn })),
      then: vi.fn((resolve: (value: { data: typeof users; error: null }) => unknown) =>
        resolve({ data: users, error: null })
      )
    };

    type UsersQueryBuilder = typeof usersBuilder;

    const { default: UserManagement } = await import("../UserManagement");
    const supa = (await import("../../../lib/supabase")) as unknown as {
      supabase: {
        from: (table: string) => UsersQueryBuilder | Record<string, never>;
      };
    };
    supa.supabase.from = vi.fn((table: string) =>
      table === "users" ? (usersBuilder as unknown as UsersQueryBuilder) : {}
    );

    render(<UserManagement />);

    await waitFor(() => {
      const noResultsMessage = screen.queryByText(/Aucun utilisateur trouvé/i);
      expect(noResultsMessage).not.toBeInTheDocument();
    });

    const selectAll = screen.getByLabelText(/Sélectionner tous les utilisateurs/i);
    fireEvent.click(selectAll);

    const bulkSelect = screen.getByLabelText(/Nouveau rôle/i);
    fireEvent.change(bulkSelect, { target: { value: "pony_provider" } });

    const applyButton = screen.getByText(/Modifier rôle/i);
    fireEvent.click(applyButton);

    await waitFor(() => {
      expect(updateIn).toHaveBeenCalledWith("id", ["u1", "u2"]);
      expect(successToast).toHaveBeenCalled();
    });
  });
});
