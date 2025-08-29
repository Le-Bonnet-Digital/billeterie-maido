import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../supabase", () => ({
  supabase: {
    rpc: vi.fn(),
    from: vi.fn(),
  },
  isSupabaseConfigured: vi.fn(),
}));

import { SupabaseCartRepository } from "../cartRepository";
import { supabase, isSupabaseConfigured } from "../supabase";

const repo = new SupabaseCartRepository();

describe("SupabaseCartRepository", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("isConfigured", () => {
    it("delegates to isSupabaseConfigured", () => {
      vi.mocked(isSupabaseConfigured).mockReturnValue(true);
      expect(repo.isConfigured()).toBe(true);
      vi.mocked(isSupabaseConfigured).mockReturnValue(false);
      expect(repo.isConfigured()).toBe(false);
    });
  });

  describe("getPassRemainingStock", () => {
    it("returns remaining stock from rpc", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: 5,
        error: null,
        status: 200,
        statusText: "OK",
        count: null,
      });
      const result = await repo.getPassRemainingStock("pass-id");
      expect(supabase.rpc).toHaveBeenCalledWith("get_pass_remaining_stock", {
        pass_uuid: "pass-id",
      });
      expect(result).toBe(5);
    });
  });

  describe("cleanupExpiredCartItems", () => {
    it("calls cleanup rpc", async () => {
      vi.mocked(supabase.rpc).mockResolvedValue({
        data: null,
        error: null,
        status: 200,
        statusText: "OK",
        count: null,
      });
      await repo.cleanupExpiredCartItems();
      expect(supabase.rpc).toHaveBeenCalledWith("cleanup_expired_cart_items");
    });

    it("propagates errors", async () => {
      vi.mocked(supabase.rpc).mockRejectedValue(new Error("fail"));
      await expect(repo.cleanupExpiredCartItems()).rejects.toThrow("fail");
    });
  });

  describe("findCartItem", () => {
    it("loads item with time slot", async () => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi
          .fn()
          .mockResolvedValue({ data: { id: "1", quantity: 2 } }),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as never);
      const result = await repo.findCartItem(
        "sess",
        "pass",
        "activity",
        "slot"
      );
      expect(result).toEqual({ id: "1", quantity: 2 });
      expect(builder.eq).toHaveBeenCalledWith("time_slot_id", "slot");
      expect(builder.is).not.toHaveBeenCalled();
    });

    it("loads item without time slot", async () => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: null }),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as never);
      const result = await repo.findCartItem("sess", "pass");
      expect(result).toBeNull();
      expect(builder.is).toHaveBeenCalledWith("time_slot_id", null);
    });

    it("propagates errors from query", async () => {
      const builder = {
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockRejectedValue(new Error("fail")),
      };
      vi.mocked(supabase.from).mockReturnValue(builder as never);
      await expect(repo.findCartItem("sess", "pass")).rejects.toThrow("fail");
    });
  });

  describe("updateCartItem", () => {
    it("saves updated quantity", async () => {
      const eq = vi.fn().mockResolvedValue({ error: null });
      const update = vi.fn().mockReturnValue({ eq });
      vi.mocked(supabase.from).mockReturnValue({ update } as never);
      const result = await repo.updateCartItem("1", 3);
      expect(result).toBe(true);
      expect(update).toHaveBeenCalled();
      expect(eq).toHaveBeenCalledWith("id", "1");
    });

    it("returns false on update error", async () => {
      const eq = vi.fn().mockResolvedValue({ error: { message: "err" } });
      const update = vi.fn().mockReturnValue({ eq });
      vi.mocked(supabase.from).mockReturnValue({ update } as never);
      const result = await repo.updateCartItem("1", 3);
      expect(result).toBe(false);
    });
  });

  describe("insertCartItem", () => {
    it("saves new item", async () => {
      const insert = vi.fn().mockResolvedValue({ error: null });
      vi.mocked(supabase.from).mockReturnValue({ insert } as never);
      const result = await repo.insertCartItem(
        "sess",
        "pass",
        undefined,
        undefined,
        2
      );
      expect(result).toBe(true);
      expect(insert).toHaveBeenCalledWith({
        session_id: "sess",
        pass_id: "pass",
        event_activity_id: undefined,
        time_slot_id: undefined,
        quantity: 2,
        product_id: null,
        product_type: "event_pass",
        access_conditions_ack: false,
        attendee_birth_year: undefined,
        attendee_first_name: undefined,
        attendee_last_name: undefined,
      });
    });

    it("returns false on insert error", async () => {
      const insert = vi.fn().mockResolvedValue({ error: { message: "err" } });
      vi.mocked(supabase.from).mockReturnValue({ insert } as never);
      const result = await repo.insertCartItem("sess", "pass");
      expect(result).toBe(false);
    });
  });
});
