import { beforeEach, describe, expect, it, vi } from "vitest";

describe("standalone deployment authentication", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.stubEnv("LUXORA_ADMIN_PASSWORD", "test-owner-password");
    vi.stubEnv("JWT_SECRET", "test-owner-session-secret");
  });

  it("logs in the owner and recognizes the signed session without Manus OAuth", async () => {
    const { appRouter } = await import("./routers");
    const { createContext } = await import("./_core/context");
    const cookies: Array<{ name: string; value: string }> = [];
    const loginContext = {
      req: { protocol: "https", headers: {} },
      res: { cookie: (name: string, value: string) => cookies.push({ name, value }) },
      user: null,
    } as any;

    await expect(appRouter.createCaller(loginContext).auth.mode()).resolves.toEqual({ standalone: true });
    await expect(appRouter.createCaller(loginContext).auth.ownerLogin({ password: "wrong-password" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(appRouter.createCaller(loginContext).auth.ownerLogin({ password: "test-owner-password" }))
      .resolves.toEqual({ success: true });

    const session = cookies.find(cookie => cookie.name === "luxora_owner_session");
    expect(session?.value).toBeTruthy();
    const authenticated = await createContext({
      req: { headers: { cookie: `luxora_owner_session=${session?.value}` } },
      res: {},
    } as any);
    expect(authenticated.user?.role).toBe("admin");
    expect(authenticated.user?.openId).toBe("luxora-owner");
  });
});
