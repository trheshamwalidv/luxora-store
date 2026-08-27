import { build } from "esbuild";



await build({
  
  entryPoints: ["api/trpc/_entry.ts"],
  
  outfile: "api/trpc/_handler.mjs",
  
  platform: "node",
  
  bundle: true,
  
  format: "esm",
  
  target: "node22",
  
  packages: "external",
  
  tsconfig: "tsconfig.json",
  
  logLevel: "info",
  
});











