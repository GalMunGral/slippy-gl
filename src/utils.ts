export function compileShader(
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

export function createWebGLProgram(
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

export function mod(a: number, b: number) {
  return ((a % b) + b) % b;
}
