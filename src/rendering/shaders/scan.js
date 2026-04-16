// ─── Scanline + Chromatic Aberration + Glitch Shader ─────────────
// Surveillance overlay: scanlines, chromatic aberration, and glitch.
// Intensifies as silence/control increases.

const scanShader = {
  uniforms: {
    tDiffuse: { value: null },
    scanlineIntensity: { value: 0.0 },    // 0–0.15
    scanlineCount: { value: 800.0 },
    chromaticAberration: { value: 0.0 },  // 0–0.008
    glitchIntensity: { value: 0.0 },      // 0–0.3
    time: { value: 0.0 },
    resolution: { value: [1920, 1080] },
  },

  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,

  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float scanlineIntensity;
    uniform float scanlineCount;
    uniform float chromaticAberration;
    uniform float glitchIntensity;
    uniform float time;
    uniform vec2 resolution;

    varying vec2 vUv;

    // Pseudo-random
    float rand(vec2 co) {
      return fract(sin(dot(co.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    void main() {
      vec2 uv = vUv;
      
      // ─── Glitch Displacement ───────────────────
      if (glitchIntensity > 0.0) {
        float glitchLine = step(0.99 - glitchIntensity * 0.1, rand(vec2(floor(uv.y * 80.0), floor(time * 10.0))));
        uv.x += glitchLine * (rand(vec2(time, uv.y)) - 0.5) * glitchIntensity * 0.05;
      }
      
      // ─── Chromatic Aberration ──────────────────
      float r = texture2D(tDiffuse, uv + vec2(chromaticAberration, 0.0)).r;
      float g = texture2D(tDiffuse, uv).g;
      float b = texture2D(tDiffuse, uv - vec2(chromaticAberration, 0.0)).b;
      vec3 color = vec3(r, g, b);
      
      // ─── Scanlines ────────────────────────────
      float scanline = sin(uv.y * scanlineCount * 3.14159) * 0.5 + 0.5;
      scanline = mix(1.0, scanline, scanlineIntensity);
      color *= scanline;
      
      // ─── Subtle noise (film grain) ────────────
      float noise = rand(uv + fract(time)) * 0.02 * scanlineIntensity;
      color += noise;
      
      // ─── Subtle phosphor glow (CRT feel) ──────
      if (scanlineIntensity > 0.05) {
        float glow = smoothstep(0.0, 0.15, scanlineIntensity);
        vec3 phosphor = vec3(0.0, 1.0, 0.83) * 0.02 * glow;
        color += phosphor * (1.0 - scanline);
      }
      
      gl_FragColor = vec4(color, 1.0);
    }
  `,
};

export default scanShader;
