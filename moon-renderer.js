// On-demand WebGL rendering; no animation loop or third-party rendering framework.
const VERTEX = `
attribute vec2 aPosition;
varying vec2 vPosition;
void main() {
  vPosition = aPosition;
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const FRAGMENT = `
precision highp float;
varying vec2 vPosition;
uniform sampler2D uAlbedo;
uniform sampler2D uElevation;
uniform vec3 uLight;
uniform float uSurfaceRotation;
uniform float uEarthshine;
uniform float uRelief;
uniform float uPixel;
const float PI = 3.141592653589793;

vec3 surfaceCoordinates(vec3 p) {
  float c = cos(uSurfaceRotation), s = sin(uSurfaceRotation);
  return vec3(c*p.x - s*p.y, s*p.x + c*p.y, p.z);
}
vec2 mapUV(vec3 n) {
  return vec2(fract(0.5 + atan(n.x, n.z)/(2.0*PI)),
              0.5 - asin(clamp(n.y, -1.0, 1.0))/PI);
}
float heightAt(vec2 uv) {
  // Lossless two-channel encoding of LOLA unsigned half-meter elevation.
  vec2 h = texture2D(uElevation, vec2(fract(uv.x), clamp(uv.y, 0.0, 1.0))).rg;
  return ((h.r*65280.0 + h.g*255.0)*0.5 - 10000.0)/1737400.0;
}
vec3 terrainNormal(vec3 n, vec2 uv) {
  float lon = atan(n.x, n.z), lat = asin(clamp(n.y, -1.0, 1.0));
  vec2 stepUV = vec2(1.0/1440.0, 1.0/720.0);
  float eastSlope = (heightAt(uv + vec2(stepUV.x,0.0)) - heightAt(uv - vec2(stepUV.x,0.0)))
                 / (4.0*PI*stepUV.x*max(cos(lat),0.05));
  float northSlope = (heightAt(uv - vec2(0.0,stepUV.y)) - heightAt(uv + vec2(0.0,stepUV.y)))
                  / (2.0*PI*stepUV.y);
  vec3 east = vec3(cos(lon),0.0,-sin(lon));
  vec3 north = vec3(-sin(lat)*sin(lon),cos(lat),-sin(lat)*cos(lon));
  return normalize(n - uRelief*(eastSlope*east + northSlope*north));
}
float visibility(vec3 n, vec2 uv, vec3 light) {
  float incidence = dot(n, light);
  if (incidence < -0.015) return 0.0;
  if (incidence > 0.35 || uRelief == 0.0) return step(0.0, incidence);
  vec3 origin = n*(1.0 + uRelief*heightAt(uv) + 0.000035);
  // Trace nearby terrain only near the terminator; distances are lunar radii.
  for (int i=1; i<=18; i++) {
    float fi = float(i);
    float distance = 0.0009*fi + 0.00012*fi*fi;
    vec3 samplePoint = origin + light*distance;
    float radius = length(samplePoint);
    if (radius > 1.008) break;
    float terrain = 1.0 + uRelief*heightAt(mapUV(samplePoint/radius));
    if (radius < terrain) return 0.0;
  }
  return 1.0;
}
void main() {
  // Small transparent margin keeps the antialiased limb inside the canvas.
  vec2 p = vPosition/0.97;
  float radius2 = dot(p,p);
  if (radius2 >= 1.0) { gl_FragColor = vec4(0.0); return; }
  vec3 viewNormal = vec3(p, sqrt(1.0-radius2));
  vec3 n = surfaceCoordinates(viewNormal);
  vec3 light = surfaceCoordinates(uLight);
  vec3 observer = vec3(0.0,0.0,1.0);
  vec2 uv = mapUV(n);
  vec3 normal = terrainNormal(n,uv);
  float mu0 = max(0.0,dot(normal,light));
  float mu = max(0.015,dot(normal,observer));
  // A lunar-like diffuse law: mostly Lommel-Seeliger with a Lambert component.
  // No shiny highlight, atmosphere, or arbitrary blurred shadow boundary.
  float reflected = 0.85*(2.0*mu0/max(mu0+mu,0.015)) + 0.15*mu0;
  reflected *= visibility(n,uv,light);
  vec3 color = pow(texture2D(uAlbedo,uv).rgb,vec3(2.2));
  float earthlight = uEarthshine*max(0.0,viewNormal.z);
  vec3 exposed = color*(reflected + earthlight);
  vec3 display = pow(clamp(exposed,0.0,1.0),vec3(1.0/2.2));
  float alpha = smoothstep(0.0,uPixel*1.5,1.0-sqrt(radius2));
  gl_FragColor = vec4(display,alpha);
}`;

function shader(gl, type, source) {
  const result = gl.createShader(type);
  gl.shaderSource(result, source);
  gl.compileShader(result);
  if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(result);
    gl.deleteShader(result);
    throw new Error(message);
  }
  return result;
}

async function texture(gl, url) {
  const image = new Image();
  image.src = new URL(url, import.meta.url).href;
  await image.decode();
  const result = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, result);
  gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  return result;
}

export class MoonRenderer {
  constructor(canvas, { onStatus = () => {} } = {}) {
    this.canvas = canvas;
    this.onStatus = onStatus;
    this.lastState = { fraction: 0.5, rotation: 0, surfaceRotation: 0 };
    this.gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      powerPreference: "low-power",
    });
    this.handleLoss = (event) => {
      event.preventDefault();
      this.setStatus("lost", "Moon preview paused. Restoring graphics…");
    };
    this.handleRestore = () => {
      this.ready = this.initialize();
    };
    canvas.addEventListener("webglcontextlost", this.handleLoss);
    canvas.addEventListener("webglcontextrestored", this.handleRestore);
    this.ready = this.initialize();
  }

  setStatus(status, message) {
    this.status = status;
    this.onStatus(status, message);
  }

  async initialize() {
    const gl = this.gl;
    if (!gl) {
      this.setStatus(
        "unavailable",
        "Moon view unavailable on this device. Phase information is still available in the app.",
      );
      return false;
    }
    this.setStatus("loading", "Loading lunar surface…");
    try {
      const vertex = shader(gl, gl.VERTEX_SHADER, VERTEX);
      const fragment = shader(gl, gl.FRAGMENT_SHADER, FRAGMENT);
      this.program = gl.createProgram();
      gl.attachShader(this.program, vertex);
      gl.attachShader(this.program, fragment);
      gl.linkProgram(this.program);
      gl.deleteShader(vertex);
      gl.deleteShader(fragment);
      if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(this.program));
      }
      this.buffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
      gl.bufferData(
        gl.ARRAY_BUFFER,
        new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
        gl.STATIC_DRAW,
      );
      this.textures = await Promise.all([
        texture(gl, "./images/lunar-albedo.jpg"),
        texture(gl, "./images/lunar-elevation.png"),
      ]);
      if (gl.isContextLost()) return false;
      this.uniforms = Object.fromEntries(
        [
          "uAlbedo",
          "uElevation",
          "uLight",
          "uSurfaceRotation",
          "uEarthshine",
          "uRelief",
          "uPixel",
        ].map((name) => [name, gl.getUniformLocation(this.program, name)]),
      );
      this.setStatus("ready", "Lunar surface preview ready.");
      this.render();
      return true;
    } catch {
      this.setStatus(
        "error",
        "The lunar surface could not load. Reload to retry.",
      );
      return false;
    }
  }

  render(nextState) {
    if (nextState) this.lastState = { ...this.lastState, ...nextState };
    if (this.status !== "ready") return;
    const {
      fraction,
      rotation,
      surfaceRotation = 0,
      earthshine = 0.003,
      relief = 1,
    } = this.lastState;
    if (
      ![fraction, rotation, surfaceRotation, earthshine, relief].every(
        Number.isFinite,
      )
    )
      return;
    const gl = this.gl;
    const size = Math.min(
      512,
      Math.max(
        128,
        Math.round(
          (this.canvas.clientWidth || 256) * Math.min(devicePixelRatio || 1, 2),
        ),
      ),
    );
    if (this.canvas.width !== size || this.canvas.height !== size) {
      this.canvas.width = size;
      this.canvas.height = size;
    }
    gl.viewport(0, 0, size, size);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer);
    const position = gl.getAttribLocation(this.program, "aPosition");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
    for (let i = 0; i < this.textures.length; i++) {
      gl.activeTexture(gl.TEXTURE0 + i);
      gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
    }
    const f = Math.min(1, Math.max(0, fraction));
    const z = 2 * f - 1;
    const tangent = Math.sqrt(Math.max(0, 1 - z * z));
    const angle = (rotation * Math.PI) / 180;
    gl.uniform1i(this.uniforms.uAlbedo, 0);
    gl.uniform1i(this.uniforms.uElevation, 1);
    gl.uniform3f(
      this.uniforms.uLight,
      tangent * Math.cos(angle),
      -tangent * Math.sin(angle),
      z,
    );
    gl.uniform1f(
      this.uniforms.uSurfaceRotation,
      (surfaceRotation * Math.PI) / 180,
    );
    // Earth is brightest from the Moon near new Moon, fading toward full Moon.
    const earthAngle = Math.acos(1 - 2 * f);
    const earthPhase =
      (Math.sin(earthAngle) + (Math.PI - earthAngle) * Math.cos(earthAngle)) /
      Math.PI;
    gl.uniform1f(
      this.uniforms.uEarthshine,
      Math.min(0.02, Math.max(0, earthshine)) * earthPhase,
    );
    gl.uniform1f(this.uniforms.uRelief, Math.min(1, Math.max(0, relief)));
    gl.uniform1f(this.uniforms.uPixel, 2 / size);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  capture() {
    this.render();
    if (this.status !== "ready") return null;
    const { width, height } = this.canvas;
    const pixels = new Uint8Array(width * height * 4);
    this.gl.readPixels(
      0,
      0,
      width,
      height,
      this.gl.RGBA,
      this.gl.UNSIGNED_BYTE,
      pixels,
    );
    return { width, height, pixels };
  }

  dispose() {
    this.canvas.removeEventListener("webglcontextlost", this.handleLoss);
    this.canvas.removeEventListener("webglcontextrestored", this.handleRestore);
    if (this.gl) {
      this.textures?.forEach((value) => this.gl.deleteTexture(value));
      this.gl.deleteBuffer(this.buffer);
      this.gl.deleteProgram(this.program);
    }
    this.setStatus("disposed", "");
  }
}
