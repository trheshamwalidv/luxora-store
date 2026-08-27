import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import { DEFAULT_COLLECTIONS, DEFAULT_PRODUCTS, DEFAULT_SETTINGS } from "./catalogDefaults";
import { createShopifyBridge } from "./shopifyAdapter";

describe("LUXORA catalog defaults", () => {
  it("covers the three storefront categories with a unique collection slug", () => {
    expect(DEFAULT_COLLECTIONS.map(collection => collection.category).sort()).toEqual(["gym", "sneakers", "streetwear"]);
    expect(new Set(DEFAULT_COLLECTIONS.map(collection => collection.slug)).size).toBe(DEFAULT_COLLECTIONS.length);
  });

  it("keeps every product independently addressable and purchasable", () => {
    expect(new Set(DEFAULT_PRODUCTS.map(product => product.slug)).size).toBe(DEFAULT_PRODUCTS.length);
    expect(DEFAULT_PRODUCTS.every(product => product.images.length > 0)).toBe(true);
    expect(DEFAULT_PRODUCTS.every(product => product.variants.some(variant => variant.isAvailable && variant.stockQuantity > 0))).toBe(true);
  });

  it("keeps branding configuration separate from commerce provider connection", () => {
    expect(DEFAULT_SETTINGS.brandName).toBe("LUXORA");
    expect(DEFAULT_SETTINGS.heroImageUrl).toBeTruthy();
    expect(DEFAULT_SETTINGS.shopifyConnectionStatus).toBe("not_connected");
  });

  it("blocks checkout safely until a Shopify store is explicitly connected", async () => {
    const bridge = createShopifyBridge({ status: "not_connected" });
    expect(bridge.canCheckout).toBe(false);
    await expect(bridge.createCheckout([{ variantId: "sample", quantity: 1 }])).rejects.toThrow("Shopify غير متصل");
  });

  it("protects dashboard procedures from a non-admin account", async () => {
    const caller = appRouter.createCaller({
      user: {
        id: 10,
        openId: "non-admin-test",
        name: "Test User",
        email: "test@example.com",
        loginMethod: "manus",
        role: "user",
        createdAt: new Date(),
        updatedAt: new Date(),
        lastSignedIn: new Date(),
      },
      req: {} as never,
      res: {} as never,
    });
    await expect(caller.catalog.adminOverview()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.catalog.importShopifyCatalog()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
