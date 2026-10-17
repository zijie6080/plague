import React, { useLayoutEffect, useRef } from "react";
import { noise1 } from "../lib/prng";

// 蜡烛火焰：WebGL fragment shader，噪声驱动摇曳 + 光晕。
// 拿不到 WebGL 时退回 Canvas 2D 径向渐变 + 噪声。
export type FlameState = { x: number; y: number; intensity: number; lean: number };

const MAX = 20;
const VERT = `attribute vec2 p; void main(){ gl_Position = vec4(p, 0.0, 1.0); }`;
const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec4 uF[${MAX}];
uniform float uSize;

float hash(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  vec2 u = f*f*(3.0-2.0*f);
  return mix(mix(hash(i), hash(i+vec2(1.0,0.0)), u.x), mix(hash(i+vec2(0.0,1.0)), hash(i+vec2(1.0,1.0)), u.x), u.y);
}
float fbm(vec2 p){ float v = 0.0; float a = 0.5; for(int i=0;i<4;i++){ v += a*vnoise(p); p *= 2.03; a *= 0.5; } return v; }

void main(){
  vec2 frag = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec3 col = vec3(0.0);
  float alpha = 0.0;
  for(int i=0;i<${MAX};i++){
    vec4 f = uF[i];
    float I = f.z;
    if(I <= 0.001) continue;
    float seed = float(i) * 7.31;
    vec2 q = (frag - f.xy) / uSize;      // 以火焰根部为原点，单位 = uSize 像素
    q.y = -q.y;                          // y 向上
    float h = 2.6 * (0.55 + 0.45 * I);   // 火焰高度
    float y = q.y / h;
    // 摇曳：低频噪声让整簇火苗左右摆，高频让边缘抖
    float sway = (fbm(vec2(uTime*1.7 + seed, 0.0)) - 0.5) * 0.9 + f.w;
    float x = q.x - sway * y * y * 1.3 - (vnoise(vec2(y*6.0 - uTime*9.0, seed)) - 0.5) * 0.22 * y;
    float w = mix(0.62, 0.05, clamp(y, 0.0, 1.0)) * (0.8 + 0.2*I);
    float body = 1.0 - smoothstep(0.0, 1.0, abs(x) / max(w, 0.02));
    body *= smoothstep(-0.12, 0.08, y) * (1.0 - smoothstep(0.75, 1.0, y + (fbm(vec2(x*3.0, y*4.0 - uTime*6.0 + seed)) - 0.5) * 0.35));
    body = clamp(body, 0.0, 1.0);
    float core = smoothstep(0.35, 0.9, body) * (1.0 - smoothstep(0.1, 0.55, y));
    vec3 fc = mix(vec3(1.0, 0.36, 0.06), vec3(1.0, 0.78, 0.25), body);
    fc = mix(fc, vec3(1.0, 0.98, 0.88), core);
    float base = (1.0 - smoothstep(0.0, 0.22, y)) * smoothstep(-0.1, 0.05, y) * body;
    fc = mix(fc, vec3(0.35, 0.55, 1.0), base * 0.5);
    float flick = 0.88 + 0.12 * vnoise(vec2(uTime*14.0, seed));
    float a = body * I * flick;
    // 光晕
    float r = length(vec2(q.x, q.y - 0.9));
    float glow = exp(-r * 0.75) * 0.32 * I * flick;
    col += fc * a + vec3(1.0, 0.62, 0.25) * glow;
    alpha += a + glow * 0.7;
  }
  alpha = clamp(alpha, 0.0, 1.0);
  col = min(col, vec3(1.0));
  gl_FragColor = vec4(col, alpha);
}`;

type GLState = { gl: WebGLRenderingContext; prog: WebGLProgram } | null;

function initGL(canvas: HTMLCanvasElement): GLState {
  const gl = canvas.getContext("webgl", { preserveDrawingBuffer: true, premultipliedAlpha: true, alpha: true, antialias: true });
  if (!gl) return null;
  const sh = (type: number, src: string) => {
    const s = gl.createShader(type)!;
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s) || "shader");
    return s;
  };
  try {
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) return null;
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    return { gl, prog };
  } catch (e) {
    console.warn("flame shader failed, falling back to 2D", e);
    return null;
  }
}

function draw2D(canvas: HTMLCanvasElement, flames: FlameState[], time: number, size: number) {
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.globalCompositeOperation = "lighter";
  flames.forEach((f, i) => {
    if (f.intensity <= 0.001) return;
    const n = noise1(time * 9 + i * 13, i) - 0.5;
    const hgt = size * 2.6 * (0.55 + 0.45 * f.intensity) * (1 + n * 0.15);
    const g = ctx.createRadialGradient(f.x, f.y - hgt * 0.4, 0, f.x, f.y - hgt * 0.4, size * 3);
    g.addColorStop(0, `rgba(255,170,80,${0.35 * f.intensity})`);
    g.addColorStop(1, "rgba(255,170,80,0)");
    ctx.fillStyle = g;
    ctx.fillRect(f.x - size * 3, f.y - hgt * 0.4 - size * 3, size * 6, size * 6);
    ctx.save();
    ctx.translate(f.x, f.y);
    ctx.rotate((n * 0.25 + f.lean) * 0.5);
    const fg = ctx.createRadialGradient(0, -hgt * 0.3, 0, 0, -hgt * 0.35, hgt * 0.6);
    fg.addColorStop(0, `rgba(255,250,225,${f.intensity})`);
    fg.addColorStop(0.45, `rgba(255,200,70,${0.9 * f.intensity})`);
    fg.addColorStop(1, "rgba(255,90,20,0)");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.moveTo(0, -hgt);
    ctx.quadraticCurveTo(size * 0.75, -hgt * 0.35, 0, 0);
    ctx.quadraticCurveTo(-size * 0.75, -hgt * 0.35, 0, -hgt);
    ctx.fill();
    ctx.restore();
  });
  ctx.globalCompositeOperation = "source-over";
}

export const Flames: React.FC<{
  flames: FlameState[]; // 坐标相对于画布左上角
  time: number;
  left: number;
  top: number;
  width: number;
  height: number;
  size?: number;
}> = ({ flames, time, left, top, width, height, size = 17 }) => {
  const ref = useRef<HTMLCanvasElement>(null);
  const st = useRef<GLState | undefined>(undefined);
  useLayoutEffect(() => {
    const c = ref.current;
    if (!c) return;
    if (st.current === undefined) st.current = initGL(c);
    const s = st.current;
    if (!s) {
      draw2D(c, flames, time, size);
      return;
    }
    const { gl, prog } = s;
    gl.viewport(0, 0, c.width, c.height);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.uniform2f(gl.getUniformLocation(prog, "uRes"), c.width, c.height);
    gl.uniform1f(gl.getUniformLocation(prog, "uTime"), time);
    gl.uniform1f(gl.getUniformLocation(prog, "uSize"), size);
    const arr = new Float32Array(MAX * 4);
    flames.slice(0, MAX).forEach((f, i) => arr.set([f.x, f.y, f.intensity, f.lean], i * 4));
    gl.uniform4fv(gl.getUniformLocation(prog, "uF"), arr);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  });
  return <canvas ref={ref} width={width} height={height} style={{ position: "absolute", left, top, width, height, pointerEvents: "none", zIndex: 40 }} />;
};
