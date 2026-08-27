import { Link, useLocation } from "wouter";
import {
  ArrowLeft,
  ArrowUpRight,
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  SlidersHorizontal,
  Sparkles,
  Trash2,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Cart, Product as ShopifyProduct } from "@shared/commerce/types";
import { useCart } from "@/contexts/CartContext";

type Variant = {
  id: string;
  shopifyVariantId?: string | null;
  sku: string;
  colorName: string;
  colorHex: string;
  size: string;
  stockQuantity: number;
  isAvailable: boolean;
};

type Product = {
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
  variants: Variant[];
};

type Collection = {
  id: string;
  slug: string;
  title: string;
  kicker?: string | null;
  description: string;
  imageUrl?: string | null;
  category: "sneakers" | "gym" | "streetwear" | "featured";
};

type Campaign = {
  id: string;
  slug: string;
  type: "drop" | "lookbook" | "offer";
  title: string;
  kicker?: string | null;
  description: string;
  imageUrl?: string | null;
  ctaLabel: string;
};

type StoreSettings = {
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

type Snapshot = { settings: StoreSettings; collections: Collection[]; products: Product[]; campaigns: Campaign[]; catalogSource?: "managed" | "fallback" };
type CartLine = { product: Product; variant: Variant; quantity: number };

const CATEGORY_LABEL: Record<Product["category"], string> = {
  sneakers: "كوتشيات",
  gym: "ملابس جيم",
  streetwear: "ملابس شبابية",
};

const CATEGORY_EN: Record<Product["category"], string> = {
  sneakers: "Footwear",
  gym: "Training",
  streetwear: "Streetwear",
};

const fallbackHero = "https://res.cloudinary.com/dbt9psvo/image/upload/luxora-hero-performance_cee8b63e";

function price(value: number) {
  return `${new Intl.NumberFormat("ar-EG").format(Math.round(value / 100))} ج.م`;
}

function money(value: { amount: string; currencyCode: string }) {
  return new Intl.NumberFormat("ar-EG", { style: "currency", currency: value.currencyCode, maximumFractionDigits: 0 }).format(Number(value.amount));
}

function normalizeShopifyProduct(item: ShopifyProduct): Product {
  const category = item.tags.includes("sneakers") ? "sneakers" : item.tags.includes("gym") || item.tags.includes("training") ? "gym" : "streetwear";
  return {
    id: item.id,
    slug: item.handle,
    name: item.title.replace(/^LUXORA\s+/i, ""),
    subtitle: item.productType ?? undefined,
    description: item.description,
    category,
    gender: "unisex",
    priceCents: Math.round(Number(item.priceRange.min.amount) * 100),
    compareAtCents: item.variants[0]?.compareAtPrice ? Math.round(Number(item.variants[0].compareAtPrice.amount) * 100) : null,
    badge: item.tags.includes("drop-01") ? "DROP 01" : null,
    isFeatured: true,
    source: "shopify",
    images: item.images.map((image, index) => ({ id: `${item.id}-image-${index}`, url: image.url, alt: image.altText ?? item.title })),
    variants: item.variants.map((variant, index) => ({
      id: variant.id,
      sku: variant.id,
      colorName: variant.selectedOptions.find(option => option.name.toLowerCase() === "color")?.value ?? "LUXORA",
      colorHex: "#353535",
      size: variant.selectedOptions.find(option => option.name.toLowerCase() === "size")?.value ?? (variant.title === "Default Title" ? "One Size" : variant.title),
      stockQuantity: 99,
      isAvailable: variant.availableForSale,
    })),
  };
}

function getMainImage(product: Product) {
  return product.images[0]?.url ?? fallbackHero;
}

function CartButton({ count, onClick }: { count: number; onClick: () => void }) {
  return (
    <button onClick={onClick} className="relative grid h-11 w-11 place-items-center rounded-full border border-white/15 bg-white/5 text-white transition hover:bg-white hover:text-black active:scale-95" aria-label="فتح سلة الشراء">
      <ShoppingBag className="h-4 w-4" strokeWidth={1.8} />
      {count > 0 ? <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[var(--lux-acid)] px-1 text-[10px] font-bold text-black">{count}</span> : null}
    </button>
  );
}

function BrandMark({ settings, dark = false }: { settings: StoreSettings; dark?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${dark ? "text-black" : "text-white"}`} aria-label={`العودة إلى ${settings.brandName}`}>
      <span className={`grid h-9 w-9 place-items-center rounded-full border text-[11px] font-black tracking-[-0.08em] ${dark ? "border-black/25" : "border-white/40"}`}>{settings.wordmark}</span>
      <span className="flex flex-col leading-none">
        <strong className="font-display text-[16px] font-black tracking-[0.2em]">{settings.brandName}</strong>
        <small className={`mt-1 text-[8px] font-bold tracking-[0.18em] ${dark ? "text-black/55" : "text-white/55"}`}>{settings.tagline.toUpperCase()}</small>
      </span>
    </Link>
  );
}

function Header({ settings, cartCount, onCart }: { settings: StoreSettings; cartCount: number; onCart: () => void }) {
  const [open, setOpen] = useState(false);
  const [, setLocation] = useLocation();
  const nav = [
    { label: "المتجر", href: "/shop" },
    { label: "كوتشيات", href: "/collections/sneakers" },
    { label: "تدريب", href: "/collections/gym" },
    { label: "Streetwear", href: "/collections/streetwear" },
    { label: "Drops", href: "/drops" },
    { label: "Lookbook", href: "/lookbook" },
    { label: "العروض", href: "/offers" },
  ];
  return (
    <>
      <div className="relative z-50 bg-[var(--lux-acid)] px-4 py-2 text-center text-[10px] font-extrabold tracking-[0.06em] text-black sm:text-xs">{settings.announcementText}</div>
      <header className="relative z-40 border-b border-white/10 bg-[#101010]/92 text-white backdrop-blur-xl">
        <div className="container flex h-[70px] items-center justify-between gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <button onClick={() => setOpen(true)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white" aria-label="فتح القائمة"><Menu className="h-5 w-5" /></button>
            <button onClick={() => setLocation("/shop")} className="grid h-10 w-10 place-items-center rounded-full border border-white/15 text-white" aria-label="فتح البحث"><Search className="h-4 w-4" /></button>
          </div>
          <BrandMark settings={settings} />
          <nav className="hidden items-center gap-6 text-xs font-bold text-white/70 md:flex" aria-label="التنقل الرئيسي">
            {nav.map(item => <Link key={item.href} href={item.href} className="transition hover:text-[var(--lux-acid)]">{item.label}</Link>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={() => setLocation("/shop")} className="hidden h-11 items-center gap-2 rounded-full border border-white/15 px-4 text-xs font-bold transition hover:border-white/40 md:flex"><Search className="h-4 w-4" />بحث</button>
            <CartButton count={cartCount} onClick={onCart} />
          </div>
        </div>
      </header>
      {open ? (
        <div className="fixed inset-0 z-[70] bg-black/75 backdrop-blur-sm md:hidden" onClick={() => setOpen(false)}>
          <aside className="mr-auto flex h-full w-[82vw] max-w-sm flex-col bg-[#151515] p-5 text-white" onClick={event => event.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-white/10 pb-5"><BrandMark settings={settings} /><button onClick={() => setOpen(false)} className="grid h-10 w-10 place-items-center rounded-full border border-white/15"><X className="h-4 w-4" /></button></div>
            <nav className="mt-6 flex flex-col gap-1">
              {nav.map((item, index) => <Link onClick={() => setOpen(false)} key={item.href} href={item.href} className="flex items-center justify-between border-b border-white/10 py-4 font-display text-2xl font-bold"><span><small className="ml-3 text-[10px] text-[var(--lux-acid)]">0{index + 1}</small>{item.label}</span><ArrowLeft className="h-4 w-4 text-white/40" /></Link>)}
            </nav>
            <button onClick={() => { setOpen(false); onCart(); }} className="mt-auto flex items-center justify-between rounded-sm bg-[var(--lux-acid)] px-5 py-4 text-sm font-black text-black">سلة الشراء <ShoppingBag className="h-4 w-4" /></button>
          </aside>
        </div>
      ) : null}
    </>
  );
}

function SectionHeading({ kicker, title, action }: { kicker: string; title: string; action?: React.ReactNode }) {
  return <div className="mb-7 flex items-end justify-between gap-4 sm:mb-9"><div><p className="mb-2 text-[10px] font-extrabold tracking-[0.16em] text-[var(--lux-acid)]">{kicker}</p><h2 className="font-display text-3xl font-black tracking-[-0.04em] text-white sm:text-5xl">{title}</h2></div>{action}</div>;
}

function ProductCard({ product, minimal = false }: { product: Product; minimal?: boolean }) {
  return (
    <Link href={`/product/${product.slug}`} className="group block min-w-0">
      <div className="relative aspect-[4/5] overflow-hidden bg-[#272727]">
        <img src={getMainImage(product)} alt={product.images[0]?.alt ?? product.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.035]" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/25 via-transparent to-transparent" />
        {product.badge ? <span className="absolute right-3 top-3 bg-[var(--lux-acid)] px-2 py-1 text-[9px] font-black tracking-[0.1em] text-black">{product.badge}</span> : null}
        {!minimal ? <span className="absolute bottom-3 left-3 grid h-9 w-9 place-items-center rounded-full bg-white text-black opacity-0 transition group-hover:opacity-100"><ArrowUpRight className="h-4 w-4" /></span> : null}
      </div>
      <div className="pt-3 sm:pt-4">
        <div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-bold tracking-[0.1em] text-white/45">{CATEGORY_EN[product.category]}</p><h3 className="mt-1 text-sm font-bold text-white sm:text-base">{product.name}</h3></div><p className="shrink-0 text-sm font-black text-white">{price(product.priceCents)}</p></div>
        {product.compareAtCents ? <p className="mt-1 text-xs text-white/35 line-through">{price(product.compareAtCents)}</p> : null}
      </div>
    </Link>
  );
}

function HomeView({ snapshot, products }: { snapshot: Snapshot; products: Product[] }) {
  const [, setLocation] = useLocation();
  const featured = products.filter(product => product.isFeatured).slice(0, 4);
  const campaigns = snapshot.campaigns;
  return (
    <main>
      <section className="relative min-h-[660px] overflow-hidden border-b border-white/10 bg-[#171717] sm:min-h-[720px]">
        <img src={snapshot.settings.heroImageUrl ?? fallbackHero} alt="LUXORA streetwear performance campaign" className="absolute inset-0 h-full w-full object-cover object-[32%_center] opacity-75" />
        <div className="absolute inset-0 bg-gradient-to-l from-[#111]/15 via-[#111]/45 to-[#111]" />
        <div className="absolute inset-x-0 bottom-0 h-2/5 bg-gradient-to-t from-[#111] to-transparent" />
        <div className="container relative z-10 flex min-h-[660px] flex-col justify-end pb-12 pt-28 sm:min-h-[720px] sm:pb-16">
          <div className="max-w-xl">
            <div className="mb-5 flex items-center gap-3 text-[10px] font-extrabold tracking-[0.16em] text-[var(--lux-acid)]"><span className="h-px w-8 bg-[var(--lux-acid)]" />DROP 01 / CAIRO</div>
            <h1 className="font-display max-w-2xl text-6xl font-black leading-[0.86] tracking-[-0.075em] text-white sm:text-8xl lg:text-[7.25rem]">{snapshot.settings.heroTitle}</h1>
            <p className="mt-6 max-w-md text-sm font-medium leading-7 text-white/70 sm:text-base">{snapshot.settings.heroSubtitle}</p>
            <div className="mt-8 flex flex-wrap gap-3"><button onClick={() => setLocation("/shop")} className="inline-flex h-12 items-center gap-3 bg-[var(--lux-acid)] px-5 text-sm font-black text-black transition hover:bg-white active:scale-[0.97]">{snapshot.settings.heroCtaLabel}<ArrowLeft className="h-4 w-4" /></button><button onClick={() => setLocation("/lookbook")} className="inline-flex h-12 items-center gap-3 border border-white/30 px-5 text-sm font-bold text-white transition hover:border-white hover:bg-white/10">شاهد الـ Lookbook<ArrowUpRight className="h-4 w-4" /></button></div>
          </div>
        </div>
        <div className="absolute bottom-6 left-4 hidden items-center gap-3 text-[10px] font-bold tracking-[0.13em] text-white/55 sm:left-8 sm:flex"><span className="h-8 w-px bg-white/30" />SCROLL TO EXPLORE</div>
      </section>

      <section className="bg-[#111] py-16 sm:py-24">
        <div className="container"><SectionHeading kicker="SHOP BY MOTION" title="اختار ساحتك." /><div className="grid gap-3 md:grid-cols-3">
          {snapshot.collections.slice(0, 3).map((collection, index) => <Link key={collection.id} href={`/collections/${collection.slug}`} className="group relative aspect-[4/5] overflow-hidden bg-[#282828] md:aspect-[3/4]"><img src={collection.imageUrl ?? fallbackHero} alt={collection.title} className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.045]" /><div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/15 to-transparent" /><div className="absolute inset-x-0 bottom-0 p-5 sm:p-7"><span className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">0{index + 1} / {collection.kicker}</span><div className="mt-2 flex items-end justify-between gap-3"><div><h3 className="font-display text-3xl font-black tracking-[-0.045em] text-white">{collection.title}</h3><p className="mt-2 max-w-[18rem] text-xs leading-5 text-white/65">{collection.description}</p></div><span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-white/30 text-white transition group-hover:bg-[var(--lux-acid)] group-hover:text-black"><ArrowLeft className="h-4 w-4" /></span></div></div></Link>)}
        </div></div>
      </section>

      <section className="border-y border-white/10 bg-[#181818] py-16 sm:py-24">
        <div className="container"><SectionHeading kicker="SELECTED / DROP 01" title="مختارة للحركة." action={<Link href="/shop" className="hidden items-center gap-2 text-xs font-bold text-white/70 transition hover:text-[var(--lux-acid)] sm:flex">كل المنتجات<ChevronLeft className="h-4 w-4" /></Link>} /><div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-4 sm:gap-x-5">{featured.map(product => <ProductCard key={product.id} product={product} />)}</div><Link href="/shop" className="mt-10 flex h-12 items-center justify-center gap-2 border border-white/20 text-sm font-bold text-white sm:hidden">كل المنتجات<ArrowLeft className="h-4 w-4" /></Link></div>
      </section>

      {campaigns[0] ? <section className="bg-[#111] py-16 sm:py-24"><div className="container"><div className="relative grid overflow-hidden border border-white/10 bg-[#1d1d1d] lg:grid-cols-2"><img src={campaigns[0].imageUrl ?? fallbackHero} alt={campaigns[0].title} className="h-[440px] w-full object-cover lg:order-2 lg:h-full" /><div className="relative flex min-h-[440px] flex-col justify-end overflow-hidden p-6 sm:p-10"><span className="absolute left-[-3rem] top-[-5.5rem] font-display text-[12rem] font-black leading-none text-white/[0.035]">01</span><div className="relative"><p className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">{campaigns[0].kicker}</p><h2 className="mt-4 max-w-md font-display text-5xl font-black leading-[0.92] tracking-[-0.065em] text-white sm:text-6xl">{campaigns[0].title}</h2><p className="mt-5 max-w-sm text-sm leading-7 text-white/65">{campaigns[0].description}</p><Link href="/drops" className="mt-8 inline-flex h-12 items-center gap-3 bg-white px-5 text-sm font-black text-black transition hover:bg-[var(--lux-acid)]">{campaigns[0].ctaLabel}<ArrowLeft className="h-4 w-4" /></Link></div></div></div></div></section> : null}

      <section className="border-t border-white/10 bg-[#111] py-10 sm:py-14"><div className="container grid gap-8 text-center sm:grid-cols-3 sm:text-right"><div><p className="font-display text-2xl font-black text-white">01. Cut to move</p><p className="mt-2 text-xs leading-5 text-white/50">قصّات مدروسة تمنحك حرية الحركة بدون تنازل عن الحضور.</p></div><div><p className="font-display text-2xl font-black text-white">02. Built to repeat</p><p className="mt-2 text-xs leading-5 text-white/50">قطع أساسية ترجع لها في التمرين، الطريق، وكل ما بينهما.</p></div><div><p className="font-display text-2xl font-black text-white">03. Drop culture</p><p className="mt-2 text-xs leading-5 text-white/50">إصدارات محدودة وحكايات بصرية تتغير مع كل موسم.</p></div></div></section>
    </main>
  );
}

function ShopView({ snapshot, products, defaultCategory }: { snapshot: Snapshot; products: Product[]; defaultCategory?: Product["category"] }) {
  const [, setLocation] = useLocation();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<Product["category"] | "all">(defaultCategory ?? "all");
  const [size, setSize] = useState("all");
  const [color, setColor] = useState("all");
  const [maxPrice, setMaxPrice] = useState(350000);
  const [mobileFilters, setMobileFilters] = useState(false);
  const sizes = Array.from(new Set(products.flatMap(product => product.variants.map(variant => variant.size))));
  const colors = Array.from(new Set(products.flatMap(product => product.variants.map(variant => variant.colorName))));
  const filtered = useMemo(() => products.filter(product => {
    const matchesQuery = [product.name, product.subtitle, product.description].filter(Boolean).join(" ").toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "all" || product.category === category;
    const matchesSize = size === "all" || product.variants.some(variant => variant.size === size && variant.isAvailable);
    const matchesColor = color === "all" || product.variants.some(variant => variant.colorName === color && variant.isAvailable);
    return matchesQuery && matchesCategory && matchesSize && matchesColor && product.priceCents <= maxPrice;
  }), [products, query, category, size, color, maxPrice]);
  const reset = () => { setQuery(""); setCategory(defaultCategory ?? "all"); setSize("all"); setColor("all"); setMaxPrice(350000); };
  return <main className="min-h-screen bg-[#111] pb-20"><div className="container py-10 sm:py-16"><div className="border-b border-white/10 pb-7 sm:pb-10"><p className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">THE STORE / EDIT 01</p><div className="mt-3 flex flex-wrap items-end justify-between gap-4"><h1 className="font-display text-5xl font-black tracking-[-0.065em] text-white sm:text-7xl">المتجر.</h1><span className="text-xs font-bold text-white/45">{filtered.length} قطع متاحة</span></div></div>
    <div className="mt-6 flex gap-2 overflow-x-auto pb-1 sm:hidden"><button onClick={() => setMobileFilters(!mobileFilters)} className="flex h-11 shrink-0 items-center gap-2 border border-white/20 px-4 text-xs font-bold text-white"><SlidersHorizontal className="h-4 w-4" />فلترة</button>{(["all", "sneakers", "gym", "streetwear"] as const).map(item => <button key={item} onClick={() => setCategory(item)} className={`h-11 shrink-0 px-4 text-xs font-bold ${category === item ? "bg-[var(--lux-acid)] text-black" : "border border-white/15 text-white"}`}>{item === "all" ? "الكل" : CATEGORY_LABEL[item]}</button>)}</div>
    <div className="mt-8 grid gap-8 lg:grid-cols-[235px_minmax(0,1fr)]"><aside className={`${mobileFilters ? "block" : "hidden"} rounded-sm border border-white/10 bg-[#181818] p-4 lg:block lg:border-0 lg:bg-transparent lg:p-0`}><div className="mb-5 flex items-center justify-between"><span className="flex items-center gap-2 text-sm font-black text-white"><Filter className="h-4 w-4 text-[var(--lux-acid)]" />فلترة المنتجات</span><button onClick={reset} className="text-[10px] font-bold text-white/45 underline hover:text-white">إعادة ضبط</button></div><FilterGroup label="الفئة">{(["all", "sneakers", "gym", "streetwear"] as const).map(item => <FilterCheck key={item} active={category === item} onClick={() => setCategory(item)} label={item === "all" ? "كل المنتجات" : CATEGORY_LABEL[item]} />)}</FilterGroup><FilterGroup label="المقاس">{sizes.map(item => <FilterCheck key={item} active={size === item} onClick={() => setSize(size === item ? "all" : item)} label={item} />)}</FilterGroup><FilterGroup label="اللون">{colors.map(item => <FilterCheck key={item} active={color === item} onClick={() => setColor(color === item ? "all" : item)} label={item} />)}</FilterGroup><div className="border-b border-white/10 py-5"><div className="mb-3 flex justify-between text-xs font-bold text-white"><span>حتى السعر</span><span className="text-[var(--lux-acid)]">{price(maxPrice)}</span></div><input type="range" min="70000" max="350000" step="10000" value={maxPrice} onChange={event => setMaxPrice(Number(event.target.value))} className="lux-range w-full" /></div></aside>
      <div><div className="mb-5 hidden items-center justify-between sm:flex"><div className="flex gap-2">{(["all", "sneakers", "gym", "streetwear"] as const).map(item => <button key={item} onClick={() => setCategory(item)} className={`h-10 px-4 text-xs font-bold transition ${category === item ? "bg-[var(--lux-acid)] text-black" : "border border-white/15 text-white/70 hover:text-white"}`}>{item === "all" ? "كل المنتجات" : CATEGORY_LABEL[item]}</button>)}</div></div><div className="mb-7 flex h-12 items-center gap-3 border-b border-white/25 px-1"><Search className="h-4 w-4 text-white/50" /><input value={query} onChange={event => setQuery(event.target.value)} className="h-full flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="ابحث عن كوتشي، هودي، أو قطعة تدريب..." /><button onClick={() => setLocation("/shop")} className="text-xs font-bold text-white/45 hover:text-white">مسح</button></div>{filtered.length ? <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:grid-cols-3 sm:gap-x-5">{filtered.map(product => <ProductCard key={product.id} product={product} />)}</div> : <div className="grid min-h-72 place-items-center border border-dashed border-white/20 px-6 text-center"><div><Sparkles className="mx-auto h-7 w-7 text-[var(--lux-acid)]" /><h2 className="mt-4 font-display text-2xl font-black text-white">مفيش نتيجة بالشكل ده.</h2><p className="mt-2 text-xs leading-6 text-white/50">جرّب تمسح فلتر أو تغيّر البحث.</p><button onClick={reset} className="mt-5 text-sm font-bold text-[var(--lux-acid)]">إعادة ضبط الفلاتر</button></div></div>}</div>
    </div></div></main>;
}

function FilterGroup({ label, children }: { label: string; children: React.ReactNode }) { return <div className="border-b border-white/10 py-5"><p className="mb-3 text-[10px] font-extrabold tracking-[0.13em] text-white/45">{label}</p><div className="space-y-1">{children}</div></div>; }
function FilterCheck({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) { return <button onClick={onClick} className="flex w-full items-center justify-between py-1.5 text-right text-xs text-white/75"><span>{label}</span><span className={`grid h-4 w-4 place-items-center border ${active ? "border-[var(--lux-acid)] bg-[var(--lux-acid)] text-black" : "border-white/25"}`}>{active ? <Check className="h-3 w-3" /> : null}</span></button>; }

function ProductView({ products, slug, addToCart }: { products: Product[]; slug: string; addToCart: (product: Product, variant: Variant) => void }) {
  const [, setLocation] = useLocation();
  const product = products.find(item => item.slug === slug);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product?.variants.find(variant => variant.isAvailable)?.colorName ?? "");
  const [selectedSize, setSelectedSize] = useState("");
  if (!product) return <NotFoundView />;
  const colors = Array.from(new Set(product.variants.map(variant => variant.colorName)));
  const sizes = Array.from(new Set(product.variants.filter(variant => variant.colorName === selectedColor).map(variant => variant.size)));
  const activeVariant = product.variants.find(variant => variant.colorName === selectedColor && variant.size === selectedSize);
  const availableStock = product.variants.filter(variant => variant.isAvailable).reduce((total, variant) => total + variant.stockQuantity, 0);
  const chooseColor = (nextColor: string) => { setSelectedColor(nextColor); setSelectedSize(""); };
  const add = () => { if (!activeVariant || !activeVariant.isAvailable) { toast.error("اختار مقاس متاح علشان تضيفه للسلة."); return; } addToCart(product, activeVariant); toast.success(`تمت إضافة ${product.name} للسلة.`); };
  return <main className="min-h-screen bg-[#111] pb-20"><div className="container py-5 sm:py-8"><button onClick={() => setLocation(`/collections/${product.category}`)} className="mb-5 flex items-center gap-2 text-xs font-bold text-white/55 hover:text-white"><ArrowRightIcon /><span>عودة إلى {CATEGORY_LABEL[product.category]}</span></button><div className="grid gap-8 lg:grid-cols-[minmax(0,1.15fr)_minmax(360px,.85fr)] lg:gap-14"><div><div className="relative aspect-[4/5] overflow-hidden bg-[#272727]"><img src={product.images[selectedImage]?.url ?? getMainImage(product)} alt={product.images[selectedImage]?.alt ?? product.name} className="h-full w-full object-cover" />{product.badge ? <span className="absolute right-4 top-4 bg-[var(--lux-acid)] px-3 py-1.5 text-[10px] font-black tracking-[0.1em] text-black">{product.badge}</span> : null}</div>{product.images.length > 1 ? <div className="mt-3 flex gap-2">{product.images.map((image, index) => <button key={image.id} onClick={() => setSelectedImage(index)} className={`h-20 w-16 overflow-hidden border ${selectedImage === index ? "border-[var(--lux-acid)]" : "border-white/15"}`}><img src={image.url} alt="" className="h-full w-full object-cover" /></button>)}</div> : null}</div>
    <div className="lg:pt-7"><p className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">{CATEGORY_EN[product.category]} / {product.gender.toUpperCase()}</p><h1 className="mt-3 font-display text-5xl font-black leading-none tracking-[-0.06em] text-white sm:text-6xl">{product.name}</h1><p className="mt-3 text-sm text-white/55">{product.subtitle}</p><div className="mt-6 flex items-center gap-3 border-y border-white/10 py-5"><span className="text-2xl font-black text-white">{price(product.priceCents)}</span>{product.compareAtCents ? <span className="text-sm text-white/35 line-through">{price(product.compareAtCents)}</span> : null}</div><p className="mt-6 text-sm leading-7 text-white/70">{product.description}</p>{product.material ? <p className="mt-4 text-xs font-bold tracking-wide text-white/45">MATERIAL / {product.material}</p> : null}
      <div className="mt-8 border-t border-white/10 pt-6"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">اللون <span className="mr-1 text-white/45">/ {selectedColor}</span></p></div><div className="mt-3 flex flex-wrap gap-2">{colors.map(color => { const variant = product.variants.find(item => item.colorName === color); return <button key={color} onClick={() => chooseColor(color)} aria-label={`اختيار اللون ${color}`} className={`grid h-10 w-10 place-items-center rounded-full border-2 ${selectedColor === color ? "border-[var(--lux-acid)]" : "border-transparent"}`}><span className="h-7 w-7 rounded-full border border-white/30" style={{ background: variant?.colorHex }} /></button>; })}</div></div><div className="mt-6 border-t border-white/10 pt-6"><div className="flex items-center justify-between"><p className="text-xs font-black text-white">المقاس</p><button className="text-[10px] font-bold text-white/45 underline">دليل المقاسات</button></div><div className="mt-3 grid grid-cols-4 gap-2">{sizes.map(size => { const variant = product.variants.find(item => item.colorName === selectedColor && item.size === size); const unavailable = !variant?.isAvailable; return <button key={size} disabled={unavailable} onClick={() => setSelectedSize(size)} className={`h-12 border text-sm font-bold transition ${selectedSize === size ? "border-[var(--lux-acid)] bg-[var(--lux-acid)] text-black" : unavailable ? "cursor-not-allowed border-white/10 text-white/20 line-through" : "border-white/25 text-white hover:border-white"}`}>{size}</button>; })}</div><p className={`mt-3 text-xs font-bold ${activeVariant?.isAvailable ? "text-emerald-300" : "text-white/45"}`}>{activeVariant ? activeVariant.isAvailable ? product.source === "shopify" ? "متاح الآن عبر المتجر الرسمي" : activeVariant.stockQuantity <= 3 ? `متبقي ${activeVariant.stockQuantity} فقط من هذا المقاس` : `متاح الآن — ${activeVariant.stockQuantity} قطع لهذا المقاس` : "هذا المقاس نفد حاليًا" : product.source === "shopify" ? "اختر المقاس المتاح لإضافته للسلة" : `متاح ${availableStock} قطعة عبر المقاسات — اختر مقاسًا`}</p></div><button onClick={add} className="mt-7 flex h-14 w-full items-center justify-center gap-3 bg-[var(--lux-acid)] text-sm font-black text-black transition hover:bg-white active:scale-[0.985]">إضافة للسلة <ShoppingBag className="h-4 w-4" /></button><div className="mt-4 grid grid-cols-3 border-t border-white/10 pt-5 text-center text-[10px] font-bold text-white/45"><span>تغليف نظيف</span><span className="border-x border-white/10">توصيل سريع</span><span>دفع آمن</span></div></div>
  </div></div></main>;
}

function ArrowRightIcon() { return <ChevronRight className="h-4 w-4" />; }

function CampaignView({ campaigns, type }: { campaigns: Campaign[]; type: "drop" | "lookbook" | "offer" }) {
  const title = type === "drop" ? "الإصدارات." : type === "lookbook" ? "Lookbook." : "العروض.";
  const intro = type === "drop" ? "كل Drop يبدأ بقصة وينتهي بقطع محددة. غيّر الحملات والمحتوى بالكامل من لوحة التحكم." : type === "lookbook" ? "طبقات، إضاءة، وحركة. صفحة تحريرية قابلة لإضافة صور ولقطات حملتك القادمة." : "مساحة عروض موسمية جاهزة لعرض السعر والمنتجات والهوية البصرية الخاصة بكل حملة.";
  const list = campaigns.filter(campaign => campaign.type === type);
  return <main className="min-h-screen bg-[#111] py-12 sm:py-20"><div className="container"><p className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">EDITORIAL / {type.toUpperCase()}</p><h1 className="mt-3 font-display text-6xl font-black tracking-[-0.07em] text-white sm:text-8xl">{title}</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/60">{intro}</p><div className="mt-12 grid gap-5 md:grid-cols-2">{list.length ? list.map((campaign, index) => <article key={campaign.id} className={`group relative min-h-[520px] overflow-hidden border border-white/10 ${index % 2 ? "md:mt-20" : ""}`}><img src={campaign.imageUrl ?? fallbackHero} alt={campaign.title} className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/10 to-black/10" /><div className="absolute inset-x-0 bottom-0 p-6 sm:p-8"><p className="text-[10px] font-extrabold tracking-[0.15em] text-[var(--lux-acid)]">{campaign.kicker}</p><h2 className="mt-3 max-w-sm font-display text-4xl font-black leading-[.92] tracking-[-0.05em] text-white">{campaign.title}</h2><p className="mt-4 max-w-sm text-sm leading-6 text-white/65">{campaign.description}</p><Link href="/shop" className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-white transition hover:text-[var(--lux-acid)]">{campaign.ctaLabel}<ArrowLeft className="h-4 w-4" /></Link></div></article>) : <EmptyEditorial />}</div></div></main>;
}

function EmptyEditorial() { return <div className="grid min-h-80 place-items-center border border-dashed border-white/20 text-center"><div><Sparkles className="mx-auto h-7 w-7 text-[var(--lux-acid)]" /><p className="mt-4 font-display text-xl font-black text-white">المساحة جاهزة لحملتك القادمة.</p></div></div>; }

function CartPanel({ settings, cart, open, onClose, updateQuantity, remove, checkout }: { settings: StoreSettings; cart: CartLine[]; open: boolean; onClose: () => void; updateQuantity: (id: string, quantity: number) => void; remove: (id: string) => void; checkout: () => void }) {
  const total = cart.reduce((sum, line) => sum + line.product.priceCents * line.quantity, 0);
  const hasStockLimit = cart.some(line => line.quantity >= line.variant.stockQuantity);
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" onClick={onClose}>
    <aside className="mr-auto flex h-full w-full max-w-md flex-col bg-[#151515] text-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="font-display text-2xl font-black">سلة الشراء</p><p className="mt-1 text-[10px] font-bold tracking-wider text-white/45">{cart.length} منتجات مختارة</p></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/15"><X className="h-4 w-4" /></button></div>
      <div className="flex-1 overflow-y-auto p-5">{cart.length ? <div className="space-y-4">{cart.map(line => {
        const atLimit = line.quantity >= line.variant.stockQuantity;
        return <div className="flex gap-3 border-b border-white/10 pb-4" key={line.variant.id}><img src={getMainImage(line.product)} alt={line.product.name} className="h-24 w-20 object-cover" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><p className="text-sm font-bold text-white">{line.product.name}</p><p className="mt-1 text-[10px] text-white/45">{line.variant.colorName} / {line.variant.size}</p></div><button onClick={() => remove(line.variant.id)} aria-label={`حذف ${line.product.name}`} className="h-7 text-white/45 hover:text-[var(--lux-acid)]"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between"><p className="text-xs font-black">{price(line.product.priceCents * line.quantity)}</p><div className="flex items-center border border-white/20"><button onClick={() => updateQuantity(line.variant.id, line.quantity - 1)} className="grid h-7 w-7 place-items-center"><Minus className="h-3 w-3" /></button><span className="grid h-7 w-7 place-items-center text-xs font-bold">{line.quantity}</span><button onClick={() => updateQuantity(line.variant.id, line.quantity + 1)} disabled={atLimit} className="grid h-7 w-7 place-items-center disabled:text-white/25"><Plus className="h-3 w-3" /></button></div></div>{atLimit ? <p className="mt-2 text-[10px] font-bold text-amber-300">وصلت للحد الأقصى المتاح لهذا المقاس: {line.variant.stockQuantity} قطع.</p> : null}</div></div>;
      })}</div> : <div className="grid h-full min-h-[300px] place-items-center text-center"><div><ShoppingBag className="mx-auto h-8 w-8 text-white/25" /><p className="mt-4 font-display text-2xl font-black">السلة فاضية.</p><p className="mt-2 text-xs leading-6 text-white/45">اختر قطعة من الـ Drop الأول وارجع هنا.</p><button onClick={onClose} className="mt-5 text-xs font-bold text-[var(--lux-acid)]">العودة للمتجر</button></div></div>}</div>
      {cart.length ? <div className="border-t border-white/10 p-5">{hasStockLimit ? <p className="mb-3 border border-amber-300/35 bg-amber-300/10 px-3 py-2 text-center text-[10px] font-bold leading-5 text-amber-200">بعض المقاسات وصلت للكمية المتاحة؛ قلل الكمية لتعديل السلة.</p> : null}<div className="mb-4 flex items-center justify-between"><span className="text-sm font-bold text-white/60">الإجمالي</span><strong className="text-xl font-black">{price(total)}</strong></div><button onClick={checkout} className="flex h-14 w-full items-center justify-center gap-3 bg-[var(--lux-acid)] text-sm font-black text-black">الانتقال لإتمام الطلب <ArrowLeft className="h-4 w-4" /></button><p className="mt-3 text-center text-[10px] leading-5 text-white/40">{settings.shopifyConnectionStatus === "connected" ? "سيتم تحويلك إلى Shopify لإتمام عملية الدفع." : "سيتم تفعيل إتمام الطلب الحقيقي عند ربط متجر Shopify."}</p></div> : null}
    </aside>
  </div>;
}

function ShopifyCartPanel({ cart, open, loading, onClose, updateQuantity, remove, checkout }: { cart: Cart | null; open: boolean; loading: boolean; onClose: () => void; updateQuantity: (lineId: string, quantity: number) => Promise<void>; remove: (lineId: string) => Promise<void>; checkout: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-[80] bg-black/65 backdrop-blur-sm" onClick={onClose}>
    <aside className="mr-auto flex h-full w-full max-w-md flex-col bg-[#151515] text-white shadow-2xl" onClick={event => event.stopPropagation()}>
      <div className="flex items-center justify-between border-b border-white/10 p-5"><div><p className="font-display text-2xl font-black">سلة الشراء</p><p className="mt-1 text-[10px] font-bold tracking-wider text-white/45">{cart?.itemCount ?? 0} منتجات مختارة</p></div><button onClick={onClose} className="grid h-10 w-10 place-items-center rounded-full border border-white/15"><X className="h-4 w-4" /></button></div>
      <div className="flex-1 overflow-y-auto p-5">{cart?.items.length ? <div className="space-y-4">{cart.items.map(item => <div key={item.lineId} className="flex gap-3 border-b border-white/10 pb-4"><img src={item.image?.url ?? fallbackHero} alt={item.image?.altText ?? item.productTitle} className="h-24 w-20 object-cover" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><div><p className="text-sm font-bold text-white">{item.productTitle.replace(/^LUXORA\s+/i, "")}</p>{item.variantTitle !== "Default Title" ? <p className="mt-1 text-[10px] text-white/45">{item.variantTitle}</p> : null}</div><button onClick={() => void remove(item.lineId)} disabled={loading} aria-label={`حذف ${item.productTitle}`} className="h-7 text-white/45 hover:text-[var(--lux-acid)]"><Trash2 className="h-4 w-4" /></button></div><div className="mt-4 flex items-center justify-between"><p className="text-xs font-black">{money(item.lineTotal)}</p><div className="flex items-center border border-white/20"><button disabled={loading} onClick={() => void updateQuantity(item.lineId, item.quantity - 1)} className="grid h-7 w-7 place-items-center disabled:text-white/25"><Minus className="h-3 w-3" /></button><span className="grid h-7 w-7 place-items-center text-xs font-bold">{item.quantity}</span><button disabled={loading} onClick={() => void updateQuantity(item.lineId, item.quantity + 1)} className="grid h-7 w-7 place-items-center disabled:text-white/25"><Plus className="h-3 w-3" /></button></div></div></div></div>)}</div> : <div className="grid h-full min-h-[300px] place-items-center text-center"><div><ShoppingBag className="mx-auto h-8 w-8 text-white/25" /><p className="mt-4 font-display text-2xl font-black">السلة فاضية.</p><p className="mt-2 text-xs leading-6 text-white/45">اختر قطعة من الإصدار الحالي وارجع هنا.</p><button onClick={onClose} className="mt-5 text-xs font-bold text-[var(--lux-acid)]">العودة للمتجر</button></div></div>}</div>
      {cart?.items.length ? <div className="border-t border-white/10 p-5"><div className="mb-4 flex items-center justify-between"><span className="text-sm font-bold text-white/60">الإجمالي</span><strong className="text-xl font-black">{money(cart.total)}</strong></div><button onClick={checkout} disabled={loading} className="flex h-14 w-full items-center justify-center gap-3 bg-[var(--lux-acid)] text-sm font-black text-black disabled:opacity-60">إتمام الطلب بأمان <ArrowLeft className="h-4 w-4" /></button><p className="mt-3 text-center text-[10px] leading-5 text-white/40">سيتم فتح صفحة الدفع الآمنة الخاصة بالمتجر.</p></div> : null}
    </aside>
  </div>;
}

function NotFoundView() { return <main className="grid min-h-[70vh] place-items-center bg-[#111] px-5 text-center"><div><p className="text-[10px] font-black tracking-[0.15em] text-[var(--lux-acid)]">404 / LOST IN MOTION</p><h1 className="mt-3 font-display text-6xl font-black text-white">مش موجودة.</h1><Link href="/shop" className="mt-6 inline-flex h-12 items-center bg-[var(--lux-acid)] px-5 text-sm font-black text-black">العودة للمتجر</Link></div></main>; }

function StoreLoading() { return <main className="grid min-h-screen place-items-center bg-[#111]"><div className="text-center"><span className="mx-auto block h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-[var(--lux-acid)]" /><p className="mt-4 text-[10px] font-bold tracking-[.15em] text-white/45">LOADING LUXORA</p></div></main>; }

export default function Storefront() {
  const snapshotQuery = trpc.catalog.snapshot.useQuery();
  const shopifyEnabled = snapshotQuery.data?.settings.shopifyConnectionStatus === "connected";
  const shopifyProductsQuery = trpc.commerce.products.list.useQuery(
    { first: 24 },
    { retry: false, enabled: shopifyEnabled }
  );
  const shopifyCart = useCart();
  const [location] = useLocation();
  const [cart, setCart] = useState<CartLine[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  if (snapshotQuery.isLoading || !snapshotQuery.data) return <StoreLoading />;
  const snapshot = snapshotQuery.data as Snapshot;
  const products = snapshot.catalogSource === "managed" ? snapshot.products : shopifyProductsQuery.data?.length ? shopifyProductsQuery.data.map(normalizeShopifyProduct) : snapshot.products;
  const shopifyMode = products.some(product => product.source === "shopify");
  const updateQuantity = (variantId: string, quantity: number) => setCart(lines => quantity <= 0 ? lines.filter(line => line.variant.id !== variantId) : lines.map(line => line.variant.id === variantId ? { ...line, quantity } : line));
  const addToCart = (product: Product, variant: Variant) => { if (product.source === "shopify") { void shopifyCart.addItem(variant.id).then(() => toast.success(`تمت إضافة ${product.name} للسلة.`)).catch(error => toast.error(error instanceof Error ? error.message : "تعذر إضافة المنتج للسلة.")); return; } setCart(lines => { const existing = lines.find(line => line.variant.id === variant.id); if (existing) return lines.map(line => line.variant.id === variant.id ? { ...line, quantity: Math.min(line.quantity + 1, variant.stockQuantity) } : line); return [...lines, { product, variant, quantity: 1 }]; }); setCartOpen(true); };
  const checkout = () => { if (snapshot.settings.shopifyConnectionStatus !== "connected") { toast.info("ربط Shopify هو الخطوة القادمة لإتاحة الدفع الحقيقي. السلة جاهزة للاتصال عند إضافة المتجر."); return; } window.location.assign(`https://${snapshot.settings.shopifyStoreDomain ?? ""}`); };
  const params = new URLSearchParams(location.includes("?") ? location.split("?")[1] : "");
  const path = location.split("?")[0];
  let page: React.ReactNode;
  if (path === "/") page = <HomeView snapshot={snapshot} products={products} />;
  else if (path === "/shop") page = <ShopView snapshot={snapshot} products={products} />;
  else if (path.startsWith("/collections/")) page = <ShopView snapshot={snapshot} products={products} defaultCategory={path.split("/").pop() as Product["category"]} />;
  else if (path.startsWith("/product/")) page = <ProductView products={products} slug={decodeURIComponent(path.split("/").pop() ?? "")} addToCart={addToCart} />;
  else if (path === "/drops") page = <CampaignView campaigns={snapshot.campaigns} type="drop" />;
  else if (path === "/lookbook") page = <CampaignView campaigns={snapshot.campaigns} type="lookbook" />;
  else if (path === "/offers") page = <CampaignView campaigns={snapshot.campaigns} type="offer" />;
  else page = <NotFoundView />;
  const count = shopifyMode ? shopifyCart.itemCount : cart.reduce((sum, line) => sum + line.quantity, 0);
  const openCart = () => shopifyMode ? shopifyCart.openCart() : setCartOpen(true);
  return <div dir="rtl" className="min-h-screen bg-[#111] text-white" style={{ "--lux-acid": snapshot.settings.primaryColor } as React.CSSProperties}><Header settings={snapshot.settings} cartCount={count} onCart={openCart} />{page}<footer className="border-t border-white/10 bg-[#0b0b0b] py-9"><div className="container flex flex-col justify-between gap-5 text-center sm:flex-row sm:text-right"><BrandMark settings={snapshot.settings} /><div className="text-xs leading-6 text-white/45"><p>{snapshot.settings.description}</p><p className="mt-2">© 2026 {snapshot.settings.brandName}. All rights reserved.</p></div></div></footer>{shopifyMode ? <ShopifyCartPanel cart={shopifyCart.cart} open={shopifyCart.isOpen} loading={shopifyCart.loading} onClose={shopifyCart.closeCart} updateQuantity={shopifyCart.updateQuantity} remove={shopifyCart.removeItem} checkout={shopifyCart.proceedToCheckout} /> : <CartPanel settings={snapshot.settings} cart={cart} open={cartOpen} onClose={() => setCartOpen(false)} updateQuantity={updateQuantity} remove={id => setCart(lines => lines.filter(line => line.variant.id !== id))} checkout={checkout} />}</div>;
}
