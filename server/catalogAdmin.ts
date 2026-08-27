import { eq, inArray } from "drizzle-orm";
import { campaigns, collections, productImages, products, productVariants } from "../drizzle/schema";
import {
  DEFAULT_CAMPAIGNS,
  DEFAULT_COLLECTIONS,
  DEFAULT_PRODUCTS,
  type StorefrontCampaign,
  type StorefrontCollection,
  type StorefrontProduct,
} from "./catalogDefaults";
import { getDb, saveStorefrontSettings } from "./db";

export type EditableProduct = Pick<
  StorefrontProduct,
  "slug" | "name" | "subtitle" | "description" | "category" | "gender" | "priceCents" | "compareAtCents" | "badge" | "material" | "isFeatured"
> & {
  imageUrl?: string | null;
  collectionSlug?: string | null;
  variants?: StorefrontProduct["variants"];
};

export async function bootstrapCatalogDefaults() {
  const db = await getDb();
  if (!db) return { created: false, reason: "database_unavailable" as const };
  const [existingProduct] = await db.select({ id: products.id }).from(products).limit(1);
  if (existingProduct) return { created: false, reason: "catalog_not_empty" as const };

  await saveStorefrontSettings({});
  await db.insert(collections).values(DEFAULT_COLLECTIONS.map((collection, index) => ({
    slug: collection.slug,
    title: collection.title,
    kicker: collection.kicker ?? null,
    description: collection.description,
    imageUrl: collection.imageUrl ?? null,
    category: collection.category,
    sortOrder: index,
    isPublished: true,
  })));
  const storedCollections = await db.select().from(collections);
  const collectionIds = new Map(storedCollections.map(collection => [collection.slug, collection.id]));

  for (const product of DEFAULT_PRODUCTS) {
    const [created] = await db.insert(products).values({
      collectionId: DEFAULT_COLLECTIONS.find(collection => collection.id === product.collectionId)
        ? collectionIds.get(DEFAULT_COLLECTIONS.find(collection => collection.id === product.collectionId)?.slug ?? "") ?? null
        : null,
      slug: product.slug,
      name: product.name,
      subtitle: product.subtitle ?? null,
      description: product.description,
      category: product.category,
      gender: product.gender,
      priceCents: product.priceCents,
      compareAtCents: product.compareAtCents ?? null,
      badge: product.badge ?? null,
      material: product.material ?? null,
      status: "published",
      isFeatured: product.isFeatured,
    }).$returningId();
    const productId = created?.id;
    if (!productId) continue;
    await db.insert(productImages).values(product.images.map((image, index) => ({
      productId,
      imageUrl: image.url,
      altText: image.alt,
      sortOrder: index,
    })));
    await db.insert(productVariants).values(product.variants.map(variant => ({
      productId,
      sku: variant.sku,
      colorName: variant.colorName,
      colorHex: variant.colorHex,
      size: variant.size,
      stockQuantity: variant.stockQuantity,
      isAvailable: variant.isAvailable,
    })));
  }

  await db.insert(campaigns).values(DEFAULT_CAMPAIGNS.map((campaign, index) => ({
    slug: campaign.slug,
    type: campaign.type,
    title: campaign.title,
    kicker: campaign.kicker ?? null,
    description: campaign.description,
    imageUrl: campaign.imageUrl ?? null,
    ctaLabel: campaign.ctaLabel,
    isPublished: true,
    sortOrder: index,
  })));
  return { created: true, reason: "created" as const };
}

export async function createCatalogProduct(input: EditableProduct) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [collection] = input.collectionSlug
    ? await db.select().from(collections).where(eq(collections.slug, input.collectionSlug)).limit(1)
    : [];
  const [created] = await db.insert(products).values({
    collectionId: collection?.id ?? null,
    slug: input.slug,
    name: input.name,
    subtitle: input.subtitle ?? null,
    description: input.description,
    category: input.category,
    gender: input.gender,
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents ?? null,
    badge: input.badge ?? null,
    material: input.material ?? null,
    status: "published",
    isFeatured: input.isFeatured,
  }).$returningId();
  const productId = created?.id;
  if (!productId) throw new Error("تعذر إنشاء المنتج.");
  if (input.imageUrl) {
    await db.insert(productImages).values({ productId, imageUrl: input.imageUrl, altText: input.name, sortOrder: 0 });
  }
  const variants = input.variants?.length ? input.variants : [
    { id: "generated", sku: `LX-${input.slug.toUpperCase().slice(0, 40)}-M`, colorName: "Black", colorHex: "#151515", size: "M", stockQuantity: 1, isAvailable: true },
  ];
  await db.insert(productVariants).values(variants.map(variant => ({
    productId,
    sku: variant.sku,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    size: variant.size,
    stockQuantity: variant.stockQuantity,
    isAvailable: variant.isAvailable,
  })));
  return { id: productId };
}

export async function updateCatalogProduct(productId: number, input: EditableProduct) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const [collection] = input.collectionSlug
    ? await db.select().from(collections).where(eq(collections.slug, input.collectionSlug)).limit(1)
    : [];
  await db.update(products).set({
    collectionId: collection?.id ?? null,
    slug: input.slug,
    name: input.name,
    subtitle: input.subtitle ?? null,
    description: input.description,
    category: input.category,
    gender: input.gender,
    priceCents: input.priceCents,
    compareAtCents: input.compareAtCents ?? null,
    badge: input.badge ?? null,
    material: input.material ?? null,
    isFeatured: input.isFeatured,
  }).where(eq(products.id, productId));
  if (input.imageUrl) {
    const [existingImage] = await db.select().from(productImages).where(eq(productImages.productId, productId)).limit(1);
    if (existingImage) await db.update(productImages).set({ imageUrl: input.imageUrl, altText: input.name }).where(eq(productImages.id, existingImage.id));
    else await db.insert(productImages).values({ productId, imageUrl: input.imageUrl, altText: input.name, sortOrder: 0 });
  }
  return { success: true } as const;
}

export async function replaceCatalogVariants(productId: number, variants: StorefrontProduct["variants"]) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  if (!variants.length) throw new Error("أضف مقاسًا واحدًا متاحًا على الأقل.");
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  await db.insert(productVariants).values(variants.map(variant => ({
    productId,
    sku: variant.sku,
    colorName: variant.colorName,
    colorHex: variant.colorHex,
    size: variant.size,
    stockQuantity: variant.stockQuantity,
    isAvailable: variant.isAvailable,
  })));
  return { success: true } as const;
}

export async function replaceCatalogImages(productId: number, imageUrls: string[], altText: string) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const uniqueUrls = Array.from(new Set(imageUrls.map(url => url.trim()).filter(Boolean)));
  if (!uniqueUrls.length) throw new Error("أضف رابط صورة واحدًا على الأقل.");
  await db.delete(productImages).where(eq(productImages.productId, productId));
  await db.insert(productImages).values(uniqueUrls.map((imageUrl, sortOrder) => ({ productId, imageUrl, altText, sortOrder })));
  return { success: true } as const;
}

export async function deleteCatalogProduct(productId: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  await db.delete(productImages).where(eq(productImages.productId, productId));
  await db.delete(productVariants).where(eq(productVariants.productId, productId));
  await db.delete(products).where(eq(products.id, productId));
  return { success: true } as const;
}

export async function saveCatalogCollection(input: Omit<StorefrontCollection, "id"> & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const values = {
    slug: input.slug, title: input.title, kicker: input.kicker ?? null, description: input.description,
    imageUrl: input.imageUrl ?? null, category: input.category, isPublished: true,
  };
  if (input.id) await db.update(collections).set(values).where(eq(collections.id, input.id));
  else await db.insert(collections).values({ ...values, sortOrder: 0 });
  return { success: true } as const;
}

export async function saveCatalogCampaign(input: Omit<StorefrontCampaign, "id"> & { id?: number }) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  const values = {
    slug: input.slug, type: input.type, title: input.title, kicker: input.kicker ?? null,
    description: input.description, imageUrl: input.imageUrl ?? null, ctaLabel: input.ctaLabel, isPublished: true,
  };
  if (input.id) await db.update(campaigns).set(values).where(eq(campaigns.id, input.id));
  else await db.insert(campaigns).values({ ...values, sortOrder: 0 });
  return { success: true } as const;
}

export async function deleteCatalogEntity(entity: "collection" | "campaign", id: number) {
  const db = await getDb();
  if (!db) throw new Error("قاعدة البيانات غير متاحة حاليًا.");
  if (entity === "collection") await db.delete(collections).where(eq(collections.id, id));
  else await db.delete(campaigns).where(eq(campaigns.id, id));
  return { success: true } as const;
}
