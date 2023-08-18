import { mat2d, vec2 } from "gl-matrix";
import type { CompiledTileFeature } from "./types";

const worker = new Worker("worker.js");

let cameraX = 0.57;
let cameraY = 0.44;
let zoom = 2.22;

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const canvas = document.createElement("canvas");
document.body.append(canvas);
canvas.width = WIDTH;
canvas.height = HEIGHT;
canvas.style.width = canvas.width + "px";
canvas.style.height = canvas.height + "px";

function compileShader(
  gl: WebGL2RenderingContext,
  shaderSource: string,
  shaderType:
    | WebGL2RenderingContext["VERTEX_SHADER"]
    | WebGL2RenderingContext["FRAGMENT_SHADER"]
): WebGLShader {
  const shader = gl.createShader(shaderType)!;
  gl.clearColor(0, 0.2, 0.25, 1);
  gl.shaderSource(shader, shaderSource);
  gl.compileShader(shader);

  const success = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
  if (!success) {
    throw "could not compile shader:" + gl.getShaderInfoLog(shader);
  }

  return shader;
}

function createWebGLProgram(
  gl: WebGL2RenderingContext,
  vertexShaderSource: string,
  fragmentShaderSource: string
): WebGLProgram {
  const vertexShader = compileShader(gl, vertexShaderSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(
    gl,
    fragmentShaderSource,
    gl.FRAGMENT_SHADER
  );

  const program = gl.createProgram()!;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);

  const success = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!success) {
    throw "program failed to link:" + gl.getProgramInfoLog(program);
  }

  return program;
}

const gl = canvas.getContext("webgl2")!;
const program = createWebGLProgram(
  gl,
  `#version 300 es
  in vec2 position;
  uniform mat3 M;

  void main() {
    vec3 pos = M * vec3(position.xy, 1.0);
    gl_Position = vec4(pos.xy, 0.0, 1.0);
  }
    `,
  `#version 300 es
  precision mediump float;
  uniform vec3 color;
  out vec4 fragColor;

  void main() {
    fragColor = vec4(color, 1);
  }
    `
);

const N = 10;
const M = Array(N)
  .fill(0)
  .map(() => mat2d.create());
const V = Array(N)
  .fill(0)
  .map(() => vec2.create());

function makeMatrix(cameraX: number, cameraY: number, zoom: number): mat2d {
  const m1 = mat2d.fromTranslation(M[0], vec2.fromValues(-cameraX, -cameraY));
  const m2 = mat2d.fromScaling(
    M[1],
    vec2.fromValues(
      2 ** zoom / (WIDTH / 2 / 256),
      2 ** zoom / -(HEIGHT / 2 / 256)
    )
  );
  return mat2d.mul(M[2], m2, m1);
}

let isMoving = false;
let prevX = -1;
let prevY = -1;
canvas.addEventListener("mousedown", (e) => {
  isMoving = true;
  prevX = e.clientX;
  prevY = e.clientY;
});
canvas.addEventListener("mouseup", () => {
  // console.log("end");
  isMoving = false;
});
canvas.addEventListener("mouseleave", () => {
  // console.log("end");
  isMoving = false;
});
canvas.addEventListener("mousemove", (e) => {
  if (isMoving) {
    cameraX += (prevX - e.clientX) / 256 / 2 ** zoom;
    cameraY += (prevY - e.clientY) / 256 / 2 ** zoom;
    prevX = e.clientX;
    prevY = e.clientY;
  }
});

const MAX_ZOOM = 18;

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const zoomDelta = -0.005 * e.deltaY;
    const newZoom = Math.max(0, Math.min(MAX_ZOOM, zoom + zoomDelta));
    const x = (e.clientX - WIDTH / 2) / 256;
    const y = (e.clientY - HEIGHT / 2) / 256;
    const scale = 2 ** (newZoom - zoom);
    cameraX += (x * (scale - 1)) / 2 ** newZoom;
    cameraY += (y * (scale - 1)) / 2 ** newZoom;
    zoom = newZoom;
  },
  { passive: false }
);

gl.viewport(0, 0, WIDTH, HEIGHT);

gl.useProgram(program);

const positionLoc = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionLoc);

type Feature = {
  featureId: number;
  drawCall(originX: number, originY: number): void;
};

const colorLoc = gl.getUniformLocation(program, "color");

const tileCache: Record<string, Array<Feature>> = {};

function compileDrawCall(feature: CompiledTileFeature) {
  const { tileId, featureId, vertices, triangles, color } = feature;
  const verticesBuf = gl.createBuffer();
  const trianglesBuf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(triangles),
    gl.STATIC_DRAW
  );

  tileCache[tileId].push({
    featureId,
    drawCall(originX: number, originY: number) {
      gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuf);
      gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuf);
      const m = makeMatrix(cameraX - originX, cameraY - originY, zoom);
      // prettier-ignore
      gl.uniformMatrix3fv(gl.getUniformLocation(program, "M"), false, [
        m[0], m[1], 0,
        m[2], m[3], 0,
        m[4], m[5], 1,
      ]);
      gl.uniform3fv(colorLoc, color);
      gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_INT, 0);
    },
  });
}

type WorkerMessage =
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

worker.addEventListener("message", (e: MessageEvent<WorkerMessage>) => {
  const payload = e.data;
  switch (payload.type) {
    case "abort": {
      const { x, y, z } = payload;
      const key = `${x}-${y}-${z}`;
      delete tileCache[key];
      break;
    }
    case "done": {
      requestIdleCallback(() => {
        for (const feature of payload.data) {
          compileDrawCall(feature);
        }
        const tileId = payload.data[0].tileId;
        tileCache[tileId].sort((a, b) => (a.featureId < b.featureId ? -1 : 1));
      });
      break;
    }
  }
});

function loadTile(x: number, y: number, z: number): Array<Feature> {
  const key = `${x}-${y}-${z}`;
  if (!tileCache[key]) {
    worker.postMessage({ x, y, z });
    tileCache[key] = [];
  }
  return tileCache[key].length > 0 || z == 0
    ? tileCache[key]
    : loadTile(x >> 1, y >> 1, z - 1);
}

requestAnimationFrame(function render() {
  gl.useProgram(program);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const minX = -(WIDTH / 2) / 256 / 2 ** zoom + cameraX;
  const maxX = WIDTH / 2 / 256 / 2 ** zoom + cameraX;
  const minY = -(HEIGHT / 2) / 256 / 2 ** zoom + cameraY;
  const maxY = HEIGHT / 2 / 256 / 2 ** zoom + cameraY;

  const Z = Math.floor(zoom);
  const minTileX = Math.floor(minX * 2 ** Z);
  const maxTileX = Math.floor(maxX * 2 ** Z);
  const minTileY = Math.floor(minY * 2 ** Z);
  const maxTileY = Math.floor(maxY * 2 ** Z);

  for (let x = minTileX - 1; x <= maxTileX + 1; x++) {
    for (let y = minTileY - 1; y <= maxTileY + 1; y++) {
      const X = mod(x, 2 ** Z);
      const Y = mod(y, 2 ** Z);
      const tile = loadTile(X, Y, Z);
      const originX = Math.floor(x / 2 ** Z);
      const originY = Math.floor(y / 2 ** Z);
      console.log(zoom, cameraX, cameraY);
      tile.forEach((f) => f.drawCall(originX, originY));
    }
  }

  requestAnimationFrame(render);
});

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}
