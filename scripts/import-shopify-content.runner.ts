import { importShopifyCatalog } from "../server/catalogAdmin";

const result = await importShopifyCatalog();
console.log(`[catalog-import] Shopify read-only import complete: ${result.created} new, ${result.skipped} preserved, ${result.total} detected.`);
process.exit(0);
