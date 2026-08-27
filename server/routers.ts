import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { createOwnerSession, isStandaloneOwnerAuthEnabled, OWNER_SESSION_COOKIE, verifyOwnerPassword } from "./_core/ownerAuth";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, publicProcedure, router } from "./_core/trpc";
import { commerceRouter } from "./routers/commerce";
import {
  bootstrapCatalogDefaults,
  createCatalogProduct,
  deleteCatalogEntity,
  deleteCatalogProduct,
  importShopifyCatalog,
  replaceCatalogImages,
  replaceCatalogVariants,
  saveCatalogCampaign,
  saveCatalogCollection,
  updateCatalogProduct,
} from "./catalogAdmin";
import { getAdminOverview, getStorefrontSnapshot, saveStorefrontSettings } from "./db";

const productInput = z.object({
  slug: z.string().min(3).max(160),
  name: z.string().min(2).max(160),
  subtitle: z.string().max(180).optional().nullable(),
  description: z.string().min(12),
  category: z.enum(["sneakers", "gym", "streetwear"]),
  gender: z.enum(["men", "women", "unisex"]),
  priceCents: z.number().int().positive(),
  compareAtCents: z.number().int().positive().optional().nullable(),
  badge: z.string().max(48).optional().nullable(),
  material: z.string().max(160).optional().nullable(),
  isFeatured: z.boolean(),
  imageUrl: z.string().url().optional().nullable(),
  collectionSlug: z.string().max(120).optional().nullable(),
});

const variantInput = z.object({
  id: z.string().min(1),
  shopifyVariantId: z.string().min(1).max(180).nullable().optional(),
  sku: z.string().min(3).max(96),
  colorName: z.string().min(2).max(72),
  colorHex: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
  size: z.string().min(1).max(24),
  stockQuantity: z.number().int().min(0),
  isAvailable: z.boolean(),
});

export const appRouter = router({
    // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  commerce: commerceRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    mode: publicProcedure.query(() => ({ standalone: isStandaloneOwnerAuthEnabled() })),
    ownerLogin: publicProcedure.input(z.object({ password: z.string().min(1) })).mutation(async ({ input, ctx }) => {
      if (!isStandaloneOwnerAuthEnabled()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "تسجيل الدخول المستقل غير مهيأ بعد." });
      }
      if (!verifyOwnerPassword(input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة." });
      }
      const cookieOptions = getSessionCookieOptions(ctx.req);
      const session = await createOwnerSession();
      ctx.res.cookie(OWNER_SESSION_COOKIE, session, { ...cookieOptions, maxAge: 1000 * 60 * 60 * 12 });
      return { success: true } as const;
    }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      ctx.res.clearCookie(OWNER_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),
  catalog: router({
    snapshot: publicProcedure.query(() => getStorefrontSnapshot()),
    adminOverview: adminProcedure.query(() => getAdminOverview()),
    bootstrapDefaults: adminProcedure.mutation(() => bootstrapCatalogDefaults()),
    importShopifyCatalog: adminProcedure.mutation(() => importShopifyCatalog()),
    saveSettings: adminProcedure.input(z.object({
      brandName: z.string().min(2).max(80).optional(),
      wordmark: z.string().min(1).max(18).optional(),
      tagline: z.string().min(2).max(160).optional(),
      description: z.string().min(12).optional(),
      currency: z.string().min(2).max(8).optional(),
      locale: z.string().min(2).max(8).optional(),
      primaryColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      surfaceColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
      heroTitle: z.string().min(2).max(160).optional(),
      heroSubtitle: z.string().min(12).optional(),
      heroImageUrl: z.string().url().nullable().optional(),
      heroCtaLabel: z.string().min(2).max(48).optional(),
      announcementText: z.string().min(4).max(180).optional(),
      shopifyStoreDomain: z.string().max(180).nullable().optional(),
      shopifyConnectionStatus: z.enum(["not_connected", "ready", "connected"]).optional(),
    })).mutation(({ input }) => saveStorefrontSettings(input)),
    createProduct: adminProcedure.input(productInput).mutation(({ input }) => createCatalogProduct({
      ...input,
      subtitle: input.subtitle ?? undefined,
    })),
    updateProduct: adminProcedure.input(productInput.extend({ id: z.number().int().positive() })).mutation(({ input }) => updateCatalogProduct(input.id, {
      ...input,
      subtitle: input.subtitle ?? undefined,
    })),
    saveVariants: adminProcedure.input(z.object({ id: z.number().int().positive(), variants: z.array(variantInput).min(1) }))
      .mutation(({ input }) => replaceCatalogVariants(input.id, input.variants)),
    saveImages: adminProcedure.input(z.object({ id: z.number().int().positive(), imageUrls: z.array(z.string().url()).min(1), altText: z.string().min(2).max(180) }))
      .mutation(({ input }) => replaceCatalogImages(input.id, input.imageUrls, input.altText)),
    deleteProduct: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => deleteCatalogProduct(input.id)),
    saveCollection: adminProcedure.input(z.object({
      id: z.number().int().positive().optional(), slug: z.string().min(3).max(120), title: z.string().min(2).max(120),
      kicker: z.string().max(80).nullable().optional(), description: z.string().min(12), imageUrl: z.string().url().nullable().optional(),
      category: z.enum(["sneakers", "gym", "streetwear", "featured"]),
    })).mutation(({ input }) => saveCatalogCollection(input)),
    saveCampaign: adminProcedure.input(z.object({
      id: z.number().int().positive().optional(), slug: z.string().min(3).max(120), type: z.enum(["drop", "lookbook", "offer"]),
      title: z.string().min(2).max(160), kicker: z.string().max(80).nullable().optional(), description: z.string().min(12),
      imageUrl: z.string().url().nullable().optional(), ctaLabel: z.string().min(2).max(48),
    })).mutation(({ input }) => saveCatalogCampaign(input)),
    deleteEntity: adminProcedure.input(z.object({ entity: z.enum(["collection", "campaign"]), id: z.number().int().positive() }))
      .mutation(({ input }) => deleteCatalogEntity(input.entity, input.id)),
  }),
});

export type AppRouter = typeof appRouter;
