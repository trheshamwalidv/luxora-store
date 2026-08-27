import { describe, expect, it } from "vitest";
import { createOwnerSession, authenticateOwnerRequest, verifyOwnerPassword } from "./ownerAuth";

const secret = "test-only-owner-session-secret";

describe("standalone owner authentication", () => {
  it("matches only the configured password without accepting prefixes", () => {
    expect(verifyOwnerPassword("correct-password", "correct-password")).toBe(true);
    expect(verifyOwnerPassword("correct", "correct-password")).toBe(false);
    expect(verifyOwnerPassword("", "correct-password")).toBe(false);
  });

  it("accepts a valid signed owner session and rejects a session signed with another key", async () => {
    const token = await createOwnerSession(secret);
    const request = { headers: { cookie: `luxora_owner_session=${token}` } } as any;
    const user = await authenticateOwnerRequest(request, secret);
    const rejected = await authenticateOwnerRequest(request, "other-test-secret");

    expect(user?.role).toBe("admin");
    expect(user?.loginMethod).toBe("owner-password");
    expect(rejected).toBeNull();
  });
});
