import { createRequire } from "node:module";



const require = createRequire(import.meta.url);

const app = require("./trpc/_handler.cjs").default;



export default app;

