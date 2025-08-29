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
  it("loads users initially and filters by role", async () => {
    const users = [
      { id: "u1", email: "a@test.com", role: "client" as const },
      { id: "u2", email: "b@test.com", role: "admin" as const }
    ];
    const filteredUsers = [users[0]];

    const usersBuilder = {
      select: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      limit: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
      eq: vi.fn(function (this: typeof usersBuilder, field: string, value: unknown) {
        if (field === "role" && value === "client") {
          usersBuilder.then = vi.fn((resolve: (value: { data: typeof filteredUsers; error: null }) => unknown) =>
            resolve({ data: filteredUsers, error: null })
          );
        }
        return this;
      }),
      ilike: vi.fn(function (this: typeof usersBuilder) {
        return this;
      }),
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

    // initial load should fetch users
    await waitFor(() => {
      expect(usersBuilder.select).toHaveBeenCalled();
      expect(screen.getByText("a@test.com")).toBeInTheDocument();
      expect(screen.getByText("b@test.com")).toBeInTheDocument();
    });

    const roleSelect = screen.getByLabelText(/Filtrer par rôle/i);
    fireEvent.change(roleSelect, { target: { value: "client" } });

    await waitFor(() => {
      expect(usersBuilder.eq).toHaveBeenCalledWith("role", "client");
      expect(screen.getByText("a@test.com")).toBeInTheDocument();
      expect(screen.queryByText("b@test.com")).not.toBeInTheDocument();
    });

    expect(errorToast).not.toHaveBeenCalled();
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
      expect(errorToast).not.toHaveBeenCalled();
    });
  });
});
