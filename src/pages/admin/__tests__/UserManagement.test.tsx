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

    // Minimal builder interface matching the calls used by the component
    interface UsersQueryBuilder {
      select: (cols?: string) => UsersQueryBuilder;
      ilike: (
        column: string,
        pattern: string
      ) => Promise<{ data: typeof users; error: null }>;
      limit: (n: number) => UsersQueryBuilder;
      // update returns the builder so eq can be called afterwards
      update: (data: Partial<(typeof users)[number]>) => UsersQueryBuilder;
      // eq resolves to a response object containing error (or null)
      eq: (
        column: string,
        value: string
      ) => Promise<{ error: null } | { error: unknown }>;
    }

    const usersBuilder: UsersQueryBuilder = {
      select: vi.fn(function (this: UsersQueryBuilder) {
        return this;
      }),
      ilike: vi.fn().mockResolvedValue({ data: users, error: null }),
      limit: vi.fn(function (this: UsersQueryBuilder) {
        return this;
      }),
      // update should be chainable and return the builder so eq() is called
      update: vi.fn(function (this: UsersQueryBuilder) {
        return this;
      }),
      eq: vi.fn().mockResolvedValue({ error: null }),
    } as unknown as UsersQueryBuilder;

    const { default: UserManagement } = await import("../UserManagement");
    const supa = (await import("../../../lib/supabase")) as unknown as {
      supabase: {
        from: (table: string) => UsersQueryBuilder | Record<string, never>;
      };
    };
    // Override supabase.from at runtime
    supa.supabase.from = vi.fn((table: string) =>
      table === "users" ? usersBuilder : {}
    );

    render(<UserManagement />);

    const input = screen.getByPlaceholderText(/Rechercher par email/i);
    fireEvent.change(input, { target: { value: "prov@test.com" } });
    fireEvent.click(screen.getByRole("button", { name: /Rechercher/i }));

    // Wait for ilike to be called
    type MockLike = { mock?: { calls?: unknown[] } };
    await waitFor(() => {
      expect(
        (usersBuilder.ilike as unknown as MockLike).mock?.calls?.length ?? 0
      ).toBeGreaterThanOrEqual(1);
    });

    // Assert table shows the user
    await waitFor(
      () => {
        const noResultsMessage = screen.queryByText(/Aucun résultat/i);
        expect(noResultsMessage).not.toBeInTheDocument();

        const rows = screen.getAllByRole("row");
        const emailFound = rows.some((row) =>
          row.textContent?.includes("prov@test.com")
        );
        expect(emailFound).toBe(true);
      },
      { timeout: 2000 }
    );

    // Change role select and submit
    const select = await screen.findByLabelText(/Rôle de prov@test.com/i);
    expect(select).toBeInTheDocument();

    fireEvent.change(select as HTMLSelectElement, {
      target: { value: "pony_provider" },
    });

    // ensure update called
    await waitFor(() => {
      expect(
        (usersBuilder.update as unknown as MockLike).mock?.calls?.length ?? 0
      ).toBeGreaterThanOrEqual(1);
      expect(successToast).toHaveBeenCalled();
    });
  });
});
// Wait for ilike to be called
