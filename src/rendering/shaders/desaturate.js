// ─── Desaturation Fragment Shader ─────────────────────────────────
// Smoothly transitions the scene from full color to monochrome.
// Linked directly to the Hope/Silence metrics.

const desaturateShader = {
  uniforms: {
    tDiffuse: { value: null },
    saturation: { value: 1.0 },      // 0 = full greyscale, 1 = full color
    warmth: { value: 1.0 },          // Color temperature shift
    tint: { value: [0.0, 1.0, 0.83] }, // System cyan tint in greyscale
    tintStrength: { value: 0.0 },    // How much cyan tint to apply
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
    uniform float saturation;
    uniform float warmth;
    uniform vec3 tint;
    uniform float tintStrength;

    varying vec2 vUv;

    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      // Calculate luminance
      float luma = dot(color.rgb, vec3(0.299, 0.587, 0.114));
      vec3 grey = vec3(luma);
      
      // Apply warmth (shift towards warm or cold)
      vec3 warm = color.rgb * vec3(1.0 + warmth * 0.1, 1.0, 1.0 - warmth * 0.05);
      vec3 cold = color.rgb * vec3(1.0 - (1.0 - warmth) * 0.1, 1.0, 1.0 + (1.0 - warmth) * 0.08);
      vec3 tempered = mix(cold, warm, warmth);
      
      // Mix between color and greyscale
      vec3 result = mix(grey, tempered, saturation);
      
      // Apply system cyan tint to greyscale areas
      result = mix(result, grey * tint * 1.5, tintStrength * (1.0 - saturation));
      
      gl_FragColor = vec4(result, color.a);
    }
  `,
};

export default desaturateShader;
