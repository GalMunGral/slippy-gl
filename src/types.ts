export type CompiledTileFeatures = Array<{
  tileId: string;
  featureId: number;
  color: Array<number>;
  vertices: Array<number>;
  triangles: Array<number>;
}>;
