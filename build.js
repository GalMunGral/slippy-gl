const esbuild = require("esbuild");
const envPlugin = require("./envPlugin");

esbuild.build({
  entryPoints: ["src/index.ts", "src/worker.ts"],
  bundle: true,
  outdir: "dist",
  plugins: [envPlugin],
});
