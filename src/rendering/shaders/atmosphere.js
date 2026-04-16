// ─── Atmosphere Fragment Shader ──────────────────────────────────
// Fog, haze, and color temperature overlay.
// Creates the clinical, muffled feeling as silence increases.

const atmosphereShader = {
  uniforms: {
    tDiffuse: { value: null },
    fogDensity: { value: 0.0 },       // 0 = no fog, 1 = heavy fog
    fogColor: { value: [0.04, 0.04, 0.06] },  // Near-black fog
    vignetteStrength: { value: 0.0 },  // Edge darkening
    vignetteRadius: { value: 0.75 },
    time: { value: 0.0 },
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
    uniform float fogDensity;
    uniform vec3 fogColor;
    uniform float vignetteStrength;
    uniform float vignetteRadius;
    uniform float time;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // ─── Fog Layer ──────────────────────────────
      vec3 fogged = mix(color.rgb, fogColor, fogDensity * 0.6);
      
      // ─── Vignette ──────────────────────────────
      vec2 center = vUv - 0.5;
      float dist = length(center);
      float vignette = 1.0 - smoothstep(vignetteRadius, vignetteRadius + 0.4, dist);
      fogged *= mix(1.0, vignette, vignetteStrength);
      
      gl_FragColor = vec4(fogged, color.a);
    }
  `,
};

export default atmosphereShader;
