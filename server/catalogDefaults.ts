export type StorefrontVariant = {
  id: string;
  shopifyVariantId?: string | null;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stockQuantity: number;
  isAvailable: boolean;
};

export type StorefrontProduct = {
  id: string;
  shopifyProductId?: string | null;
  collectionId?: string;
  slug: string;
  name: string;
  subtitle?: string;
  description: string;
  category: "sneakers" | "gym" | "streetwear";
  gender: "men" | "women" | "unisex";
  priceCents: number;
  compareAtCents?: number | null;
  badge?: string | null;
  material?: string | null;
  isFeatured: boolean;
  source?: "local" | "shopify";
  images: { id: string; url: string; alt: string }[];
  variants: StorefrontVariant[];
};

export type StorefrontCollection = {
  id: string;
  slug: string;
  title: string;
  kicker?: string | null;
  description: string;
  imageUrl?: string | null;
  category: "sneakers" | "gym" | "streetwear" | "featured";
};

export type StorefrontCampaign = {
  id: string;
  slug: string;
  type: "drop" | "lookbook" | "offer";
  title: string;
  kicker?: string | null;
  description: string;
  imageUrl?: string | null;
  ctaLabel: string;
};

export type StorefrontSettings = {
  brandName: string;
  wordmark: string;
  tagline: string;
  description: string;
  currency: string;
  locale: string;
  primaryColor: string;
  surfaceColor: string;
  heroTitle: string;
  heroSubtitle: string;
  heroImageUrl?: string | null;
  heroCtaLabel: string;
  announcementText: string;
  shopifyConnectionStatus: "not_connected" | "ready" | "connected";
  shopifyStoreDomain?: string | null;
};

export const LUXORA_IMAGES = {
  hero: "/manus-storage/luxora-hero-performance_cee8b63e.jpg",
  sneaker: "/manus-storage/luxora-product-sneaker_8812d00d.jpg",
  gym: "/manus-storage/luxora-product-gym_c49fbf10.jpg",
  streetwear: "/manus-storage/luxora-product-streetwear_37edd00f.jpg",
  lookbook: "/manus-storage/luxora-lookbook-night_8e397827.jpg",
} as const;

export const DEFAULT_SETTINGS: StorefrontSettings = {
  brandName: "LUXORA",
  wordmark: "LX",
  tagline: "Streetwear / Performance",
  description: "متجر مستقل للـ streetwear والـ performance، قابل لتغيير الهوية والمحتوى والكتالوج بالكامل من لوحة التحكم.",
  currency: "EGP",
  locale: "ar",
  primaryColor: "#D9FF2F",
  surfaceColor: "#101010",
  heroTitle: "MOVE DIFFERENT.",
  heroSubtitle: "قطع مصممة للحركة، ومختارة لحضورك خارجها. اختبر أول Drop من LUXORA.",
  heroImageUrl: LUXORA_IMAGES.hero,
  heroCtaLabel: "تسوّق الإصدار",
  announcementText: "شحن مجاني للطلبات فوق 2,500 ج.م — شحن سريع داخل مصر",
  shopifyConnectionStatus: "not_connected",
};

export const DEFAULT_COLLECTIONS: StorefrontCollection[] = [
  {
    id: "demo-collection-sneakers",
    slug: "sneakers",
    title: "كوتشيات",
    kicker: "Engineered motion",
    description: "كوتشيات عملية بمظهر نظيف للتمرين والحركة اليومية.",
    imageUrl: LUXORA_IMAGES.sneaker,
    category: "sneakers",
  },
  {
    id: "demo-collection-gym",
    slug: "gym",
    title: "ملابس جيم",
    kicker: "Built to train",
    description: "أساسيات أداء بمقاسات مريحة وخامات مرنة للتمرين.",
    imageUrl: LUXORA_IMAGES.gym,
    category: "gym",
  },
  {
    id: "demo-collection-streetwear",
    slug: "streetwear",
    title: "ملابس شبابية",
    kicker: "After-hours uniform",
    description: "طبقات streetwear هادئة بلمسة فاخرة للاستخدام اليومي.",
    imageUrl: LUXORA_IMAGES.streetwear,
    category: "streetwear",
  },
];

const shoeVariants: StorefrontVariant[] = [
  { id: "v-vector-40-graphite", sku: "LX-VECTOR-GR-40", colorName: "Graphite", colorHex: "#353535", size: "40", stockQuantity: 4, isAvailable: true },
  { id: "v-vector-41-graphite", sku: "LX-VECTOR-GR-41", colorName: "Graphite", colorHex: "#353535", size: "41", stockQuantity: 5, isAvailable: true },
  { id: "v-vector-42-graphite", sku: "LX-VECTOR-GR-42", colorName: "Graphite", colorHex: "#353535", size: "42", stockQuantity: 3, isAvailable: true },
  { id: "v-vector-43-graphite", sku: "LX-VECTOR-GR-43", colorName: "Graphite", colorHex: "#353535", size: "43", stockQuantity: 0, isAvailable: false },
];

const apparelVariants: StorefrontVariant[] = [
  { id: "v-apparel-s-black", sku: "LX-APP-BLK-S", colorName: "Black", colorHex: "#131313", size: "S", stockQuantity: 5, isAvailable: true },
  { id: "v-apparel-m-black", sku: "LX-APP-BLK-M", colorName: "Black", colorHex: "#131313", size: "M", stockQuantity: 7, isAvailable: true },
  { id: "v-apparel-l-black", sku: "LX-APP-BLK-L", colorName: "Black", colorHex: "#131313", size: "L", stockQuantity: 3, isAvailable: true },
  { id: "v-apparel-xl-black", sku: "LX-APP-BLK-XL", colorName: "Black", colorHex: "#131313", size: "XL", stockQuantity: 2, isAvailable: true },
];

export const DEFAULT_PRODUCTS: StorefrontProduct[] = [
  {
    id: "demo-vector-one",
    collectionId: "demo-collection-sneakers",
    slug: "vector-one-sneaker",
    name: "Vector One",
    subtitle: "Everyday performance sneaker",
    description: "كوتشي يومي خفيف بتفاصيل طبقية ونعل متوازن يمنحك راحة عملية من أول حركة إلى آخر اليوم.",
    category: "sneakers",
    gender: "unisex",
    priceCents: 289000,
    compareAtCents: 329000,
    badge: "NEW DROP",
    material: "Performance mesh / Foam sole",
    isFeatured: true,
    images: [{ id: "img-vector-1", url: LUXORA_IMAGES.sneaker, alt: "LUXORA Vector One sneaker" }],
    variants: shoeVariants,
  },
  {
    id: "demo-flux-run",
    collectionId: "demo-collection-sneakers",
    slug: "flux-run-sneaker",
    name: "Flux Run",
    subtitle: "Stable city runner",
    description: "تصميم كوتشي يومي بخطوط هادئة وتوازن بين الراحة والمظهر العملي.",
    category: "sneakers",
    gender: "unisex",
    priceCents: 259000,
    badge: "LIMITED",
    material: "Textile upper / Rubber traction",
    isFeatured: true,
    images: [{ id: "img-flux-1", url: LUXORA_IMAGES.sneaker, alt: "LUXORA Flux Run sneaker" }],
    variants: shoeVariants.map(variant => ({ ...variant, id: variant.id.replace("vector", "flux"), sku: variant.sku.replace("VECTOR", "FLUX") })),
  },
  {
    id: "demo-core-training-tee",
    collectionId: "demo-collection-gym",
    slug: "core-training-tee",
    name: "Core Training Tee",
    subtitle: "Second-skin training layer",
    description: "تيشيرت تمرين بخامة مرنة وخفيفة، مصمم للحركة والتهوية طوال اليوم.",
    category: "gym",
    gender: "men",
    priceCents: 89000,
    badge: "ESSENTIAL",
    material: "Stretch performance knit",
    isFeatured: true,
    images: [{ id: "img-core-tee-1", url: LUXORA_IMAGES.gym, alt: "LUXORA Core Training Tee" }],
    variants: apparelVariants,
  },
  {
    id: "demo-vector-shorts",
    collectionId: "demo-collection-gym",
    slug: "vector-training-shorts",
    name: "Vector Training Shorts",
    subtitle: "Four-way stretch",
    description: "شورت تدريب خفيف بمقاس عملي وحركة مريحة للجيم والجري.",
    category: "gym",
    gender: "men",
    priceCents: 109000,
    material: "Quick-dry woven shell",
    isFeatured: false,
    images: [{ id: "img-vector-shorts-1", url: LUXORA_IMAGES.gym, alt: "LUXORA Vector Training Shorts" }],
    variants: apparelVariants.map(variant => ({ ...variant, id: variant.id.replace("apparel", "short"), sku: variant.sku.replace("APP", "SHORT") })),
  },
  {
    id: "demo-arc-hoodie",
    collectionId: "demo-collection-streetwear",
    slug: "arc-heavyweight-hoodie",
    name: "Arc Heavyweight Hoodie",
    subtitle: "Relaxed structure",
    description: "هودي heavy-weight بقصة واسعة وخامة مريحة تشكل أساس اللوك اليومي.",
    category: "streetwear",
    gender: "unisex",
    priceCents: 169000,
    badge: "DROP 01",
    material: "Heavyweight cotton blend",
    isFeatured: true,
    images: [{ id: "img-arc-hoodie-1", url: LUXORA_IMAGES.streetwear, alt: "LUXORA Arc Heavyweight Hoodie" }],
    variants: apparelVariants.map(variant => ({ ...variant, id: variant.id.replace("apparel", "hoodie"), sku: variant.sku.replace("APP", "HOODIE") })),
  },
  {
    id: "demo-relay-pants",
    collectionId: "demo-collection-streetwear",
    slug: "relay-relaxed-pants",
    name: "Relay Relaxed Pants",
    subtitle: "Technical relaxed fit",
    description: "بنطلون شبابي بقصة مريحة وتفاصيل عملية تصلح للحركة واللبس اليومي.",
    category: "streetwear",
    gender: "unisex",
    priceCents: 149000,
    material: "Structured technical twill",
    isFeatured: false,
    images: [{ id: "img-relay-pants-1", url: LUXORA_IMAGES.streetwear, alt: "LUXORA Relay Relaxed Pants" }],
    variants: apparelVariants.map(variant => ({ ...variant, id: variant.id.replace("apparel", "pants"), sku: variant.sku.replace("APP", "PANTS") })),
  },
];

export const DEFAULT_CAMPAIGNS: StorefrontCampaign[] = [
  {
    id: "demo-drop-01",
    slug: "drop-01",
    type: "drop",
    kicker: "DROP 01 / LIVE NOW",
    title: "Built for the pace you choose.",
    description: "إيقاع سريع، تفاصيل محسوبة، وقطع مصممة لتتحرك خارج حدود الروتين.",
    imageUrl: LUXORA_IMAGES.lookbook,
    ctaLabel: "اكتشف الـ Drop",
  },
  {
    id: "demo-lookbook-nightline",
    slug: "lookbook-nightline",
    type: "lookbook",
    kicker: "LOOKBOOK / NIGHTLINE",
    title: "After hours, still in motion.",
    description: "نظرة على التوازن بين الطبقات التقنية، الحركة في المدينة، والحضور الهادئ بعد التمرين.",
    imageUrl: LUXORA_IMAGES.lookbook,
    ctaLabel: "شاهد الـ Lookbook",
  },
  {
    id: "demo-offer-first-move",
    slug: "first-move-offer",
    type: "offer",
    kicker: "PRIVATE OFFER / DROP 01",
    title: "قطع مختارة بسعر الإطلاق.",
    description: "اختيارات محددة من Drop 01 بسعر إطلاق لفترة محدودة.",
    imageUrl: LUXORA_IMAGES.sneaker,
    ctaLabel: "تسوّق العرض",
  },
];
