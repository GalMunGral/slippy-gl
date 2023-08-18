import earcut from "earcut";

class MercatorCoordinate {
  static mercatorXfromLng(lng) {
    return (180 + lng) / 360;
  }

  static mercatorYfromLat(lat) {
    return (
      (180 -
        (180 / Math.PI) *
          Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360))) /
      360
    );
  }

  static fromLngLat(lngLat) {
    const x = -1 + MercatorCoordinate.mercatorXfromLng(lngLat[0]) * 2;
    const y = 1 - MercatorCoordinate.mercatorYfromLat(lngLat[1]) * 2;
    return [x, y];
  }
}

const USA_BBOX = [
  [-126.03515625, 23.079731762449878],
  [-60.1171875, 23.079731762449878],
  [-60.1171875, 50.233151832472245],
  [-126.03515625, 50.233151832472245],
];

let cameraX = 0;
let cameraY = 0;
let zoom = 0;

import * as THREE from "three";

const WIDTH = window.innerWidth;
const HEIGHT = window.innerHeight;

const canvas = document.createElement("canvas");
canvas.style.border = "1px solid black";
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
  out vec4 fragColor;

  void main() {
    fragColor = vec4(1, 0, 0.5, 0.5);
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
  console.log("end");
  isMoving = false;
});
canvas.addEventListener("mousemove", (e) => {
  if (isMoving) {
    cameraX -= (e.clientX - prevX) / (WIDTH / 2) / 2 ** zoom;
    cameraY -= (prevY - e.clientY) / (HEIGHT / 2) / 2 ** zoom;
    prevX = e.clientX;
    prevY = e.clientY;
  }
});

canvas.addEventListener(
  "wheel",
  (e) => {
    e.preventDefault();
    const zoomDelta = e.deltaY < 0 ? 0.1 : -0.1;
    const p = new THREE.Vector3(
      -1 + 2 * (e.clientX / WIDTH),
      1 - 2 * (e.clientY / HEIGHT)
    );
    const m1 = makeMatrix(cameraX, cameraY, zoom).invert();
    const m2 = makeMatrix(cameraX, cameraY, zoom + zoomDelta).invert();
    const p1 = p.clone().applyMatrix3(m1);
    const p2 = p.clone().applyMatrix3(m2);
    const translation = p1.sub(p2);
    cameraX += translation.x;
    cameraY += translation.y;
    zoom += zoomDelta;
  },
  { passive: false }
);

gl.viewport(0, 0, WIDTH, HEIGHT);

gl.useProgram(program);
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);
const positionBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
const positionLoc = gl.getAttribLocation(program, "position");
gl.enableVertexAttribArray(positionLoc);
gl.vertexAttribPointer(positionLoc, 2, gl.FLOAT, false, 0, 0);

const triangleBuf = gl.createBuffer();

const url =
  "https://raw.githubusercontent.com/scdoshi/us-geojson/master/geojson/nation/US.geojson";

const triangles: Array<number> = [];
const vertices: Array<number> = [];

function load(rings) {
  const data = earcut.flatten(
    rings.map((ring) => ring.map(MercatorCoordinate.fromLngLat))
  );
  const base = vertices.length / 2;
  vertices.push(...data.vertices);
  const tri = earcut(data.vertices, data.holes, data.dimensions);
  triangles.push(...tri.map((i) => i + base));
}

(async function () {
  const res = await fetch(url);
  const geojson = await res.json();

  switch (geojson.geometry.type) {
    case "Polygon":
      load(geojson.geometry.coordinates);
      break;
    case "MultiPolygon":
      geojson.geometry.coordinates.forEach((c) => load(c));
      break;
  }
})();

requestAnimationFrame(function render() {
  gl.useProgram(program);
  gl.bindVertexArray(vao);

  const m = makeMatrix(cameraX, cameraY, zoom);
  gl.uniformMatrix3fv(
    gl.getUniformLocation(program, "M"),
    false,
    // prettier-ignore
    m.elements
  );

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, triangleBuf);
  gl.bufferData(
    gl.ELEMENT_ARRAY_BUFFER,
    new Uint32Array(triangles),
    gl.STATIC_DRAW
  );

  console.log("la", vertices.length, Math.max(...triangles));

  gl.drawElements(gl.TRIANGLES, triangles.length, gl.UNSIGNED_INT, 0);

  requestAnimationFrame(render);
});
