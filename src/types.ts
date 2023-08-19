export type Feature = {
  featureId: number;
  drawCall(originX: number, originY: number): void;
};

export type WorkerMessage =
  | {
      type: "done";
      data: Array<CompiledTileFeature>;
    }
  | {
      type: "abort";
      x: number;
      y: number;
      z: number;
    };

export type CompiledTileFeature = {
  tileId: string;
  featureId: number;
  color: Array<number>;
  vertices: Array<number>;
  triangles: Array<number>;
};
