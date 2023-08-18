import Protobuf from "pbf";
import earcut from "earcut";
import { VectorTile, VectorTileFeature } from "@mapbox/vector-tile";
import { fromLngLat } from "./mercator";
import type { CompiledTileFeatures } from "./types";
// @ts-ignore
import { TOKEN } from "env";

const sourceId = "mapbox.country-boundaries-v1";
type FeatureClasse =
  | "wood"
  | "scrub"
  | "grass"
  | "crop"
  | "snow"
  | "shadow"
  | "highlight";

addEventListener("message", async (event) => {
  const { x, y, z } = event.data as { x: number; y: number; z: number };
  const compiled = await compileTile(x, y, z);
  if (compiled) self.postMessage(compiled);
});

async function compileTile(
  x: number,
  y: number,
  z: number
): Promise<CompiledTileFeatures | null> {
  const tileId = `${x}-${y}-${z}`;

  const compiledFeatures: CompiledTileFeatures = [];

  let vectorTile: VectorTile | undefined;
  try {
    const res = await fetch(
      `https://api.mapbox.com/v4/${sourceId}/${z}/${x}/${y}.vector.pbf?access_token=${TOKEN}`
    );
    vectorTile = new VectorTile(new Protobuf(await res.arrayBuffer()));
  } catch (e) {
    console.debug(e);
    return null;
  }

  function colorMap(feature: VectorTileFeature) {
    switch (feature.properties.class as FeatureClasse) {
      case "crop":
        return [0.2, 0.5, 0.2];
      case "grass":
        return [0.1, 0.5, 0];
      case "scrub":
        return [0.2, 0.4, 0];
      case "snow":
        return [1, 1, 1];
      case "wood":
        return [0.01, 0.4, 0.01];
      case "shadow":
      case "highlight":
        let c = ((feature.properties.level as number) - 56) / (94 - 56);
        return Array(3).fill(c);
      default:
        return [100, 100, 200].map((m) => (feature.id % m) / m);
    }
  }

  function compileFeature(feature: VectorTileFeature) {
    const featureId = feature.id;
    const geojson = feature.toGeoJSON(x, y, z);

    const triangles: Array<number> = [];
    const vertices: Array<number> = [];

    function compile(rings: Array<Array<Array<number>>>) {
      const data = earcut.flatten(rings.map((ring) => ring.map(fromLngLat)));
      const base = vertices.length / 2;
      vertices.push(...data.vertices);
      const tri = earcut(data.vertices, data.holes, data.dimensions);
      triangles.push(...tri.map((i) => i + base));
    }

    switch (geojson.geometry.type) {
      case "Polygon":
        compile(geojson.geometry.coordinates);
        break;
      case "MultiPolygon":
        geojson.geometry.coordinates.forEach((c) => compile(c));
        break;
      case "LineString":
      case "MultiLineString":
        console.log("not implemented");
      default:
      // console.log(geojson.geometry.type);
    }

    const color = colorMap(feature);

    compiledFeatures.push({ tileId, featureId, color, vertices, triangles });
  }

  for (const [key, layer] of Object.entries(vectorTile.layers)) {
    for (let i = 0; i < layer.length; ++i) {
      compileFeature(layer.feature(i));
    }
  }

  return compiledFeatures;
}
