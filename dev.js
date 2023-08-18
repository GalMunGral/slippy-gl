const esbuild = require("esbuild");
const envPlugin = require("./envPlugin");

esbuild
  .context({
    entryPoints: ["src/index.ts", "src/worker.ts"],
    bundle: true,
    outdir: "dist",
    plugins: [envPlugin],
  })
  .then((ctx) => ctx.watch());
