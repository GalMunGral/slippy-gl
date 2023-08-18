import tilebelt from "@mapbox/tilebelt";
import { latFromMercatorY, lngFromMercatorX } from "./mercator";
import type { CompiledTileFeatures } from "./types";

let cameraX = 0;
let cameraY = 0.2;
let zoom = 0;

import * as THREE from "three";

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
    fragColor = vec4(color * 0.3 + 0.2, 1);
  }
    `
);

function makeMatrix(
  cameraX: number,
  cameraY: number,
  zoom: number
): THREE.Matrix3 {
  const aspectRatio = WIDTH / HEIGHT;
  const m1 = new THREE.Matrix3().makeTranslation(-cameraX, -cameraY);
  const m2 = new THREE.Matrix3().makeScale(2 ** zoom, 2 ** zoom * aspectRatio);
  return m2.multiply(m1);
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
    cameraX -= (e.clientX - prevX) / (WIDTH / 2) / 2 ** zoom;
    cameraY -= (prevY - e.clientY) / (HEIGHT / 2) / 2 ** zoom;
    wrapCamera();
    prevX = e.clientX;
    prevY = e.clientY;
  }
});

function wrapCamera() {
  if (cameraX < -1) cameraX += 2;
  if (cameraX >= 1) cameraX -= 2;
  if (cameraY < -1) cameraY += 2;
  if (cameraY >= 1) cameraY -= 2;
}

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const newZoom = Math.max(0, Math.min(14, zoom - 0.005 * e.deltaY));
    const p = new THREE.Vector3(
      -1 + 2 * (e.clientX / WIDTH),
      1 - 2 * (e.clientY / HEIGHT)
    );
    const m1 = makeMatrix(cameraX, cameraY, zoom).invert();
    const m2 = makeMatrix(cameraX, cameraY, newZoom).invert();
    const p1 = p.clone().applyMatrix3(m1);
    const p2 = p.clone().applyMatrix3(m2);
    const translation = p1.sub(p2);
    cameraX += translation.x;
    cameraY += translation.y;
    wrapCamera();
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
  drawCall(shiftX: number, shiftY: number): void;
};

const colorLoc = gl.getUniformLocation(program, "color");

const tileCache: Record<string, Array<Feature>> = {};

function compileTile(x: number, y: number, z: number): Array<Feature> {
  const key = `${x}-${y}-${z}`;
  if (!tileCache[key]) {
    tileCache[key] = [];
    const worker = new Worker("worker.js");
    worker.postMessage({ x, y, z });
    worker.addEventListener(
      "message",
      (e: MessageEvent<CompiledTileFeatures>) => {
        requestIdleCallback(() => {
          for (const {
            tileId,
            featureId,
            color,
            vertices,
            triangles,
          } of e.data) {
            const verticesBuf = gl.createBuffer();
            const trianglesBuf = gl.createBuffer();
            gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuf);
            gl.bufferData(
              gl.ARRAY_BUFFER,
              new Float32Array(vertices),
              gl.STATIC_DRAW
            );
            gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuf);
            gl.bufferData(
              gl.ELEMENT_ARRAY_BUFFER,
              new Uint32Array(triangles),
              gl.STATIC_DRAW
            );

            tileCache[tileId].push({
              featureId,
              drawCall(shiftX: number, shiftY: number) {
                // console.log(shiftX, shiftY);
                gl.bindBuffer(gl.ARRAY_BUFFER, verticesBuf);
                gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);
                gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, trianglesBuf);
                // TODO::::
                const m = makeMatrix(
                  cameraX + shiftX * 2,
                  cameraY - shiftY * 2,
                  zoom
                );
                gl.uniformMatrix3fv(
                  gl.getUniformLocation(program, "M"),
                  false,
                  m.elements
                );
                gl.uniform3fv(colorLoc, color);
                gl.drawElements(
                  gl.TRIANGLES,
                  triangles.length,
                  gl.UNSIGNED_INT,
                  0
                );
              },
            });
          }
          tileCache[e.data[0].tileId].sort((a, b) =>
            a.featureId < b.featureId ? -1 : 1
          );
          worker.terminate();
        });
      }
    );
  }
  if (!tileCache[key].length && z > 0) {
    return compileTile(x >> 1, y >> 1, z - 1);
  }
  return tileCache[key];
}

requestAnimationFrame(function render() {
  gl.useProgram(program);
  gl.clear(gl.COLOR_BUFFER_BIT);

  const scale = WIDTH * 2 ** zoom;
  const minMercatorX = mod(
    (((1 + cameraX) / 2) * scale - WIDTH / 2) / scale,
    1
  );
  const minLng = lngFromMercatorX(minMercatorX);
  const maxMercatorX = mod(
    (((1 + cameraX) / 2) * scale + WIDTH / 2) / scale,
    1
  );
  const maxLng = lngFromMercatorX(maxMercatorX);
  const minMercatorY = mod(
    (((1 - cameraY) / 2) * scale - HEIGHT / 2) / scale,
    1
  );
  const maxLat = latFromMercatorY(minMercatorY);
  const maxMercatorY = mod(
    (((1 - cameraY) / 2) * scale + HEIGHT / 2) / scale,
    1
  );
  const minLat = latFromMercatorY(maxMercatorY);

  // console.log("camera", cameraX, cameraY, zoom);

  // console.log("lonlat", minLng, maxLng, minLat, maxLat);

  const z = Math.ceil(zoom);

  const [centerX, centerY] = tilebelt.pointToTile(
    lngFromMercatorX((1 + cameraX) / 2),
    latFromMercatorY((1 - cameraY) / 2),
    z
  );

  let [minX, minY] = tilebelt.pointToTile(minLng, maxLat, z);
  let [maxX, maxY] = tilebelt.pointToTile(maxLng, minLat, z);

  if (minX > centerX) minX -= 2 ** z;
  if (maxX < centerX) maxX += 2 ** z;
  if (minY > centerY) minY -= 2 ** z;
  if (maxY < centerY) maxY += 2 ** z;

  // console.log("camera", cameraX, cameraY);
  // console.log("xy", minX, maxX, minY, maxY);
  // console.log(
  //   "xy",
  //   mod(minX, 2 ** z),
  //   mod(maxX, 2 ** z),
  //   mod(minY, 2 ** z),
  //   mod(maxY, 2 ** z)
  // );

  for (let x = minX - 1; x <= maxX + 1; x++) {
    for (let y = minY - 1; y <= maxY + 1; y++) {
      const normalizedX = mod(x, 2 ** z);
      const normalizedY = mod(y, 2 ** z);
      const tile = compileTile(normalizedX, normalizedY, z);
      const deltaX = x - normalizedX;
      const shiftX = deltaX ? -deltaX / Math.abs(deltaX) : 0;
      const deltaY = y - normalizedY;
      const shiftY = deltaY ? -deltaY / Math.abs(deltaY) : 0;
      // console.log("delta", deltaX, deltaY);
      tile.forEach((f) => f.drawCall(shiftX, shiftY));
    }
  }

  requestAnimationFrame(render);
});

function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}
