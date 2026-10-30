'use client';

import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

// 64x64 Soft sphere matcap canvas generator
function createSoftSphereMatcap(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;

  const grad = ctx.createRadialGradient(26, 26, 2, 32, 32, 30);
  grad.addColorStop(0, '#ffffff');
  grad.addColorStop(0.35, '#d4d4d4');
  grad.addColorStop(0.7, '#6b6b6b');
  grad.addColorStop(0.92, '#202020');
  grad.addColorStop(1, '#050505');

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(32, 32, 30, 0, Math.PI * 2);
  ctx.fill();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  return texture;
}

// Fullscreen Quad helper
class FullscreenQuad {
  private mesh: THREE.Mesh;
  private camera: THREE.OrthographicCamera;
  private scene: THREE.Scene;

  constructor(material: THREE.ShaderMaterial) {
    this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.scene = new THREE.Scene();
    const geometry = new THREE.PlaneGeometry(2, 2);
    this.mesh = new THREE.Mesh(geometry, material);
    this.scene.add(this.mesh);
  }

  setMaterial(material: THREE.ShaderMaterial) {
    this.mesh.material = material;
  }

  render(renderer: THREE.WebGLRenderer, target: THREE.WebGLRenderTarget | null) {
    renderer.setRenderTarget(target);
    renderer.render(this.scene, this.camera);
  }
}

export function AxonCanvas() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let animId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;
    const isMobile = width <= 760;
    const DPR = Math.min(window.devicePixelRatio || 1, 2);

    // Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: false,
      powerPreference: 'high-performance',
      alpha: false,
    });
    renderer.setPixelRatio(DPR);
    renderer.setSize(width, height);
    renderer.setClearColor(0x000000, 1.0);

    const targetType = THREE.HalfFloatType;

    // Fluid FBOs
    const FLUID_RES = 256;
    const DYE_RES = 512;

    const createDoubleFBO = (w: number, h: number, linear = true) => {
      const options = {
        type: targetType,
        format: THREE.RGBAFormat,
        minFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
        magFilter: linear ? THREE.LinearFilter : THREE.NearestFilter,
        depthBuffer: false,
        stencilBuffer: false,
      };
      return {
        read: new THREE.WebGLRenderTarget(w, h, options),
        write: new THREE.WebGLRenderTarget(w, h, options),
        swap() {
          const tmp = this.read;
          this.read = this.write;
          this.write = tmp;
        },
      };
    };

    const velocityFBO = createDoubleFBO(FLUID_RES, FLUID_RES, true);
    const densityFBO = createDoubleFBO(DYE_RES, DYE_RES, true);
    const divergenceFBO = new THREE.WebGLRenderTarget(FLUID_RES, FLUID_RES, {
      type: targetType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const curlFBO = new THREE.WebGLRenderTarget(FLUID_RES, FLUID_RES, {
      type: targetType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    });
    const pressureFBO = createDoubleFBO(FLUID_RES, FLUID_RES, false);

    // Common Quad Vertex Shader
    const quadVS = `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position.xy, 0.0, 1.0);
      }
    `;

    // Fluid Shaders
    const splatMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uTarget;
        uniform vec2 uPoint;
        uniform vec2 uPrevPoint;
        uniform vec3 uColor;
        uniform float uRadius;
        uniform float uAspect;
        varying vec2 vUv;

        float distToSegment(vec2 p, vec2 a, vec2 b) {
          vec2 pa = p - a, ba = b - a;
          float d = dot(ba, ba);
          float h = d > 0.0 ? clamp(dot(pa, ba) / d, 0.0, 1.0) : 0.0;
          return length(pa - ba * h);
        }

        void main() {
          vec2 uvAspect = vec2(vUv.x * uAspect, vUv.y);
          vec2 pAspect = vec2(uPoint.x * uAspect, uPoint.y);
          vec2 prevAspect = vec2(uPrevPoint.x * uAspect, uPrevPoint.y);

          float d = distToSegment(uvAspect, prevAspect, pAspect);
          float splat = exp(-d * d / max(uRadius * uRadius * 0.005, 1e-6));

          vec4 base = texture2D(uTarget, vUv);
          gl_FragColor = base + vec4(uColor * splat, 0.0);
        }
      `,
      uniforms: {
        uTarget: { value: null },
        uPoint: { value: new THREE.Vector2() },
        uPrevPoint: { value: new THREE.Vector2() },
        uColor: { value: new THREE.Vector3() },
        uRadius: { value: 0.1 },
        uAspect: { value: width / height },
      },
      depthTest: false,
      depthWrite: false,
    });

    const curlMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).y;
          float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).y;
          float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).x;
          float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).x;
          float vorticity = (R - L) - (T - B);
          gl_FragColor = vec4(0.5 * vorticity, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
      },
      depthTest: false,
      depthWrite: false,
    });

    const vorticityMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform sampler2D uCurl;
        uniform float uCurlStrength;
        uniform float uDt;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uCurl, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uCurl, vUv + vec2(uTexelSize.x, 0.0)).x;
          float B = texture2D(uCurl, vUv - vec2(0.0, uTexelSize.y)).x;
          float T = texture2D(uCurl, vUv + vec2(0.0, uTexelSize.y)).x;
          float C = texture2D(uCurl, vUv).x;

          vec2 force = 0.5 * vec2(abs(T) - abs(B), abs(R) - abs(L));
          float len = length(force) + 1e-5;
          force = (force / len) * vec2(1.0, -1.0) * C * uCurlStrength;

          vec2 vel = texture2D(uVelocity, vUv).xy;
          gl_FragColor = vec4(vel + force * uDt, 0.0, 1.0);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uCurl: { value: null },
        uCurlStrength: { value: 30.0 },
        uDt: { value: 1 / 60 },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
      },
      depthTest: false,
      depthWrite: false,
    });

    const divergenceMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uVelocity, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uVelocity, vUv + vec2(uTexelSize.x, 0.0)).x;
          float B = texture2D(uVelocity, vUv - vec2(0.0, uTexelSize.y)).y;
          float T = texture2D(uVelocity, vUv + vec2(0.0, uTexelSize.y)).y;
          float div = 0.5 * (R - L + T - B);
          gl_FragColor = vec4(div, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
      },
      depthTest: false,
      depthWrite: false,
    });

    const pressureMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uPressure;
        uniform sampler2D uDivergence;
        uniform vec2 uTexelSize;
        uniform float uDissipation;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;
          float div = texture2D(uDivergence, vUv).x;

          float p = (L + R + B + T - div) * 0.25 * uDissipation;
          gl_FragColor = vec4(p, 0.0, 0.0, 1.0);
        }
      `,
      uniforms: {
        uPressure: { value: null },
        uDivergence: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
        uDissipation: { value: 0.95 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const gradSubtractMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uPressure;
        uniform sampler2D uVelocity;
        uniform vec2 uTexelSize;
        varying vec2 vUv;

        void main() {
          float L = texture2D(uPressure, vUv - vec2(uTexelSize.x, 0.0)).x;
          float R = texture2D(uPressure, vUv + vec2(uTexelSize.x, 0.0)).x;
          float B = texture2D(uPressure, vUv - vec2(0.0, uTexelSize.y)).x;
          float T = texture2D(uPressure, vUv + vec2(0.0, uTexelSize.y)).x;

          vec2 vel = texture2D(uVelocity, vUv).xy - vec2(R - L, T - B) * 0.5;
          gl_FragColor = vec4(vel, 0.0, 1.0);
        }
      `,
      uniforms: {
        uPressure: { value: null },
        uVelocity: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
      },
      depthTest: false,
      depthWrite: false,
    });

    const advectionMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uVelocity;
        uniform sampler2D uSource;
        uniform vec2 uTexelSize;
        uniform float uDt;
        uniform float uDissipation;
        varying vec2 vUv;

        void main() {
          vec2 vel = texture2D(uVelocity, vUv).xy;
          vec2 coord = vUv - uDt * vel * uTexelSize;
          gl_FragColor = uDissipation * texture2D(uSource, coord);
        }
      `,
      uniforms: {
        uVelocity: { value: null },
        uSource: { value: null },
        uTexelSize: { value: new THREE.Vector2(1 / FLUID_RES, 1 / FLUID_RES) },
        uDt: { value: 1 / 60 },
        uDissipation: { value: 0.98 },
      },
      depthTest: false,
      depthWrite: false,
    });

    const fboQuad = new FullscreenQuad(splatMat);

    // Particle Simulation Setup
    const SIM_SIZE = isMobile ? 128 : 512;
    const PARTICLE_COUNT = SIM_SIZE * SIM_SIZE;

    const initialPos = new Float32Array(PARTICLE_COUNT * 4);
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      initialPos[i * 4 + 0] = (Math.random() - 0.5) * 2.0;
      initialPos[i * 4 + 1] = (Math.random() - 0.5) * 2.0;
      initialPos[i * 4 + 2] = (Math.random() - 0.5) * 2.0;
      initialPos[i * 4 + 3] = 1.0;
    }

    const originTexture = new THREE.DataTexture(
      initialPos,
      SIM_SIZE,
      SIM_SIZE,
      THREE.RGBAFormat,
      THREE.FloatType
    );
    originTexture.needsUpdate = true;

    const simFBOOptions = {
      type: THREE.FloatType,
      format: THREE.RGBAFormat,
      minFilter: THREE.NearestFilter,
      magFilter: THREE.NearestFilter,
      depthBuffer: false,
      stencilBuffer: false,
    };
    let particlePosA = new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, simFBOOptions);
    let particlePosB = new THREE.WebGLRenderTarget(SIM_SIZE, SIM_SIZE, simFBOOptions);

    // Initial position copy
    const initMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uSource;
        varying vec2 vUv;
        void main() {
          gl_FragColor = texture2D(uSource, vUv);
        }
      `,
      uniforms: { uSource: { value: originTexture } },
      depthTest: false,
      depthWrite: false,
    });
    fboQuad.setMaterial(initMat);
    fboQuad.render(renderer, particlePosA);
    fboQuad.render(renderer, particlePosB);

    // Particle Simulation Shader Material
    const simMat = new THREE.ShaderMaterial({
      vertexShader: quadVS,
      fragmentShader: `
        uniform sampler2D uCurrentPosition;
        uniform sampler2D uOriginPosition;
        uniform sampler2D uFluidVelocity;
        uniform sampler2D uFluidDensity;
        uniform mat4 uProjectionMatrix;
        uniform mat4 uModelMatrix;
        uniform mat4 uCameraWorldRotation;
        uniform float uTime;
        uniform float uHZ;
        varying vec2 vUv;

        vec4 q_rotate(vec4 q, vec3 v) {
          vec3 qv = q.xyz;
          return vec4(v + 2.0 * cross(qv, cross(qv, v) + q.w * v), 0.0);
        }

        vec3 getPotential(vec3 v) {
          return vec3(
            sin(v.y * 5.0) + cos(v.z * 6.0) + sin((v.y + v.z) * 3.0),
            sin(v.z * 5.0) + cos(v.x * 6.0) + sin((v.z + v.x) * 3.0),
            sin(v.x * 5.0) + cos(v.y * 6.0) + sin((v.x + v.y) * 3.0)
          );
        }

        // Analytic curl of three sine-sum potentials (Bridson-style), normalized
        vec3 curlNoise(vec3 p) {
          float e = 0.01;
          vec3 dx = (getPotential(p + vec3(e, 0.0, 0.0)) - getPotential(p - vec3(e, 0.0, 0.0))) / (2.0 * e);
          vec3 dy = (getPotential(p + vec3(0.0, e, 0.0)) - getPotential(p - vec3(0.0, e, 0.0))) / (2.0 * e);
          vec3 dz = (getPotential(p + vec3(0.0, 0.0, e)) - getPotential(p - vec3(0.0, 0.0, e))) / (2.0 * e);
          vec3 c = vec3(dy.z - dz.y, dz.x - dx.z, dx.y - dy.x);
          return normalize(c + 1e-5);
        }

        float sdfShapeRaw(vec3 p) {
          float angle = atan(p.y, p.x);
          float r_major = 0.35 + 0.05 * sin(angle * 2.0);
          float r_minor = 0.15 + 0.04 * cos(angle * 3.0 + p.z * 5.0) + 0.03 * sin(p.x * 6.0);
          vec2 q = vec2(length(p.xy) - r_major, p.z);
          float d_torus = length(q) - r_minor;
          float wave = sin(p.x * 7.0) * sin(p.y * 7.0) * cos(p.z * 7.0) * 0.03;
          return d_torus + wave;
        }

        float sdfShape(vec3 p) {
          if (length(p) > 0.8) {
            return length(p) - 0.7;
          }
          // Mirror depth axis
          p.z = sqrt(p.z * p.z + 0.0215) - sqrt(0.012);
          // Rotate by quaternion (0.5, 0.5, 0.5, 0.5)
          vec4 q = vec4(0.5, 0.5, 0.5, 0.5);
          p = q_rotate(q, p).xyz;
          return sdfShapeRaw(p);
        }

        vec3 sdfNormal(vec3 p) {
          float e = 0.001;
          return normalize(vec3(
            sdfShape(p + vec3(e, 0.0, 0.0)) - sdfShape(p - vec3(e, 0.0, 0.0)),
            sdfShape(p + vec3(0.0, e, 0.0)) - sdfShape(p - vec3(0.0, e, 0.0)),
            sdfShape(p + vec3(0.0, 0.0, e)) - sdfShape(p - vec3(0.0, 0.0, e))
          ));
        }

        void main() {
          vec3 pos = texture2D(uCurrentPosition, vUv).xyz;
          vec3 origin = texture2D(uOriginPosition, vUv).xyz;

          if (length(pos) > 0.7) pos /= 2.0;
          pos += curlNoise(pos * 0.1 + uTime * 0.05) * 1.0 * 0.0002 * uHZ;

          vec3 gradient = sdfNormal(pos);
          float sdf = sdfShape(pos);

          pos += cross(normalize(pos + 1e-5), normalize(gradient)) * 0.0005;
          pos += -gradient * sdf * 0.5;
          pos += (origin - pos) * 0.0002 * uHZ;

          // Project to screen to sample fluid
          vec4 worldPos = uModelMatrix * vec4(pos, 1.0);
          vec4 clipPos = uProjectionMatrix * worldPos;
          vec2 screenUV = (clipPos.xy / clipPos.w) * 0.5 + 0.5;

          if (screenUV.x >= 0.0 && screenUV.x <= 1.0 && screenUV.y >= 0.0 && screenUV.y <= 1.0) {
            vec2 fluidVel = texture2D(uFluidVelocity, screenUV).xy;
            float fluidDye = texture2D(uFluidDensity, screenUV).r;
            vec3 flow = (uCameraWorldRotation * vec4(fluidVel, 0.0, 0.0)).xyz;
            pos += flow * 0.0001 * uHZ * 0.4 * fluidDye;
          }

          gl_FragColor = vec4(pos, 1.0);
        }
      `,
      uniforms: {
        uCurrentPosition: { value: null },
        uOriginPosition: { value: originTexture },
        uFluidVelocity: { value: velocityFBO.read.texture },
        uFluidDensity: { value: densityFBO.read.texture },
        uProjectionMatrix: { value: new THREE.Matrix4() },
        uModelMatrix: { value: new THREE.Matrix4() },
        uCameraWorldRotation: { value: new THREE.Matrix4() },
        uTime: { value: 0 },
        uHZ: { value: 1.0 },
      },
      depthTest: false,
      depthWrite: false,
    });

    // 3D Scene Setup
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, width / height, 0.1, 1000);
    const baseCamPos = new THREE.Vector3(-1.17, 0, 6);
    camera.position.copy(baseCamPos);
    camera.lookAt(0, 0, 0);

    const group = new THREE.Group();
    group.position.set(0.343, 0.16, -1);
    group.rotation.set(
      THREE.MathUtils.degToRad(-28.4),
      THREE.MathUtils.degToRad(390),
      THREE.MathUtils.degToRad(4.92)
    );
    group.scale.set(5, 5, 6);
    scene.add(group);

    // Particle Geometry & Point Mesh
    const pointGeo = new THREE.BufferGeometry();
    const aUv = new Float32Array(PARTICLE_COUNT * 2);
    const aRandom = new Float32Array(PARTICLE_COUNT * 4);

    for (let y = 0; y < SIM_SIZE; y++) {
      for (let x = 0; x < SIM_SIZE; x++) {
        const idx = y * SIM_SIZE + x;
        aUv[idx * 2 + 0] = (x + 0.5) / SIM_SIZE;
        aUv[idx * 2 + 1] = (y + 0.5) / SIM_SIZE;

        aRandom[idx * 4 + 0] = Math.random();
        aRandom[idx * 4 + 1] = Math.random();
        aRandom[idx * 4 + 2] = Math.random();
        aRandom[idx * 4 + 3] = Math.random();
      }
    }

    pointGeo.setAttribute('aUv', new THREE.BufferAttribute(aUv, 2));
    pointGeo.setAttribute('aRandom', new THREE.BufferAttribute(aRandom, 4));
    pointGeo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(PARTICLE_COUNT * 3), 3));

    const matcapTexture = createSoftSphereMatcap();

    const pointMat = new THREE.ShaderMaterial({
      vertexShader: `
        uniform sampler2D uPositionTexture;
        uniform float uDPR;
        attribute vec2 aUv;
        attribute vec4 aRandom;

        varying vec4 vRandom;
        varying float vScale;
        varying float vDist;

        void main() {
          vec3 pos = texture2D(uPositionTexture, aUv).xyz;
          pos *= mix(1.0, 1.5, pow(aRandom.y, 150.0));

          vec4 mvPos = modelViewMatrix * vec4(pos, 1.0);
          float distToCamera = length(mvPos.xyz);
          float scale = smoothstep(3.0, 15.0, distToCamera) * mix(0.5, 1.0, aRandom.z);

          gl_PointSize = 0.04 * uDPR * 2.0 * scale * (1000.0 / distToCamera);
          gl_Position = projectionMatrix * mvPos;

          vRandom = aRandom;
          vScale = scale;
          vDist = distToCamera;
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform sampler2D uMatcap;
        varying vec4 vRandom;
        varying float vScale;
        varying float vDist;

        vec2 rotateUV(vec2 uv, float angle) {
          float s = sin(angle);
          float c = cos(angle);
          return vec2(
            c * (uv.x - 0.5) - s * (uv.y - 0.5) + 0.5,
            s * (uv.x - 0.5) + c * (uv.y - 0.5) + 0.5
          );
        }

        float blendSoftLight(float base, float blend) {
          return (blend < 0.5) ? (2.0 * base * blend + base * base * (1.0 - 2.0 * blend)) : (sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend));
        }
        vec3 blendSoftLight(vec3 base, vec3 blend) {
          return vec3(blendSoftLight(base.r, blend.r), blendSoftLight(base.g, blend.g), blendSoftLight(base.b, blend.b));
        }
        float blendOverlay(float base, float blend) {
          return (base < 0.5) ? (2.0 * base * blend) : (1.0 - 2.0 * (1.0 - base) * (1.0 - blend));
        }
        vec3 blendOverlay(vec3 base, vec3 blend) {
          return vec3(blendOverlay(base.r, blend.r), blendOverlay(base.g, blend.g), blendOverlay(base.b, blend.b));
        }

        void main() {
          vec2 coord = gl_PointCoord;
          if (length(coord - 0.5) > 0.5) discard;
          if (vScale < 0.1) discard;

          vec3 col = vec3(mix(0.0, 0.2, vRandom.x));
          col = mix(col, vec3(0.6, 0.45, 1.0), pow(vRandom.z, 100.0));

          float sparkle = 0.5 + (0.4 + sin(uTime * 4.0 + vRandom.y * 20.0)) * pow(vRandom.z, 10.0) * 2.5;
          col *= sparkle;

          float angle = sin(uTime + vRandom.z * 20.0) * 0.5 + 1.0;
          vec2 matcapUV = clamp(rotateUV(coord, angle), 0.0, 1.0);
          vec3 matcap = texture2D(uMatcap, matcapUV).rgb;

          vec3 blended = blendSoftLight(col, matcap);
          blended = mix(blended, blendOverlay(col, matcap), 0.2);

          gl_FragColor = vec4(blended, 1.0);
        }
      `,
      uniforms: {
        uPositionTexture: { value: particlePosA.texture },
        uDPR: { value: DPR },
        uTime: { value: 0 },
        uMatcap: { value: matcapTexture },
      },
      transparent: true,
      depthTest: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const pointsMesh = new THREE.Points(pointGeo, pointMat);
    group.add(pointsMesh);

    // Mouse & Pointer Tracking
    let targetCamPos = new THREE.Vector3().copy(baseCamPos);
    let prevX = width * 0.5;
    let prevY = height * 0.5;
    let currX = prevX;
    let currY = prevY;
    let lastSplatTime = 0;

    interface SplatEvent {
      curr: THREE.Vector2;
      prev: THREE.Vector2;
      velocity: THREE.Vector3;
      radius: number;
    }
    const splatQueue: SplatEvent[] = [];

    const onPointerMove = (clientX: number, clientY: number) => {
      currX = clientX;
      currY = clientY;

      // Gaze camera mapping:
      // mouse.x mapped 0..width -> -1..1 * (-1)
      // mouse.y mapped 0..height -> -1..1 * 2
      const mappedX = (currX / width) * 2 - 1;
      const mappedY = -((currY / height) * 2 - 1);

      targetCamPos.x = baseCamPos.x + mappedX * -1.0;
      targetCamPos.y = baseCamPos.y + mappedY * 2.0;
      targetCamPos.z = baseCamPos.z;

      const now = performance.now();
      const dx = currX - prevX;
      const dy = currY - prevY;
      const len = Math.hypot(dx, dy);

      if (len > 0.01) {
        const splatRadius = Math.min(len / 5.0, 1.0) * 60.0 * 0.6 * (isMobile ? 0.8 : 1.0);
        const forceMult = Math.min(len / 15.0, 1.0) * 10.0;

        const currUV = new THREE.Vector2(currX / width, 1.0 - currY / height);
        let prevUV = new THREE.Vector2(prevX / width, 1.0 - prevY / height);

        if (now - lastSplatTime > 50) {
          prevUV.copy(currUV);
        }
        lastSplatTime = now;

        splatQueue.push({
          curr: currUV,
          prev: prevUV,
          velocity: new THREE.Vector3(dx * forceMult, -dy * forceMult, 1.0),
          radius: splatRadius / 200.0,
        });
      }

      prevX = currX;
      prevY = currY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      onPointerMove(e.clientX, e.clientY);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
      }
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    window.addEventListener('touchmove', handleTouchMove, { passive: true });
    window.addEventListener('touchstart', handleTouchMove, { passive: true });

    // Resize Handler
    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const newDPR = Math.min(window.devicePixelRatio || 1, 2);

      renderer.setPixelRatio(newDPR);
      renderer.setSize(width, height);

      camera.aspect = width / height;
      camera.updateProjectionMatrix();

      pointMat.uniforms.uDPR.value = newDPR;
      splatMat.uniforms.uAspect.value = width / height;
    };

    window.addEventListener('resize', handleResize);

    // Animation Loop
    let clock = new THREE.Clock();
    const projMat = new THREE.Matrix4();
    const camRotMat = new THREE.Matrix4();

    const animate = () => {
      animId = requestAnimationFrame(animate);

      const dt = Math.min(clock.getDelta(), 0.05);
      const time = clock.getElapsedTime();
      const HZ = dt * 60.0;

      // 1. Camera Gaze Lerp
      camera.position.lerp(targetCamPos, 0.05);
      camera.lookAt(0, 0, 0);
      camera.updateMatrixWorld();

      // 2. Fluid Simulation Passes
      // a. Splats
      while (splatQueue.length > 0) {
        const splat = splatQueue.shift()!;

        // Velocity splat
        splatMat.uniforms.uTarget.value = velocityFBO.read.texture;
        splatMat.uniforms.uPoint.value.copy(splat.curr);
        splatMat.uniforms.uPrevPoint.value.copy(splat.prev);
        splatMat.uniforms.uColor.value.copy(splat.velocity);
        splatMat.uniforms.uRadius.value = splat.radius;
        fboQuad.setMaterial(splatMat);
        fboQuad.render(renderer, velocityFBO.write);
        velocityFBO.swap();

        // Density splat
        splatMat.uniforms.uTarget.value = densityFBO.read.texture;
        splatMat.uniforms.uColor.value.set(1.0, 1.0, 1.0);
        fboQuad.render(renderer, densityFBO.write);
        densityFBO.swap();
      }

      // b. Curl
      curlMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      fboQuad.setMaterial(curlMat);
      fboQuad.render(renderer, curlFBO);

      // c. Vorticity confinement
      vorticityMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      vorticityMat.uniforms.uCurl.value = curlFBO.texture;
      fboQuad.setMaterial(vorticityMat);
      fboQuad.render(renderer, velocityFBO.write);
      velocityFBO.swap();

      // d. Divergence
      divergenceMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      fboQuad.setMaterial(divergenceMat);
      fboQuad.render(renderer, divergenceFBO);

      // e. Pressure (Jacobi - 5 iterations)
      pressureMat.uniforms.uDivergence.value = divergenceFBO.texture;
      for (let i = 0; i < 5; i++) {
        pressureMat.uniforms.uPressure.value = pressureFBO.read.texture;
        fboQuad.setMaterial(pressureMat);
        fboQuad.render(renderer, pressureFBO.write);
        pressureFBO.swap();
      }

      // f. Gradient subtract
      gradSubtractMat.uniforms.uPressure.value = pressureFBO.read.texture;
      gradSubtractMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      fboQuad.setMaterial(gradSubtractMat);
      fboQuad.render(renderer, velocityFBO.write);
      velocityFBO.swap();

      // g. Advect velocity
      advectionMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      advectionMat.uniforms.uSource.value = velocityFBO.read.texture;
      advectionMat.uniforms.uDissipation.value = 0.98;
      fboQuad.setMaterial(advectionMat);
      fboQuad.render(renderer, velocityFBO.write);
      velocityFBO.swap();

      // h. Advect density
      advectionMat.uniforms.uVelocity.value = velocityFBO.read.texture;
      advectionMat.uniforms.uSource.value = densityFBO.read.texture;
      advectionMat.uniforms.uDissipation.value = 0.97;
      fboQuad.setMaterial(advectionMat);
      fboQuad.render(renderer, densityFBO.write);
      densityFBO.swap();

      // 3. Particle Simulation FBO Step
      group.updateMatrixWorld(true);
      projMat.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
      camRotMat.extractRotation(camera.matrixWorld);

      simMat.uniforms.uCurrentPosition.value = particlePosA.texture;
      simMat.uniforms.uFluidVelocity.value = velocityFBO.read.texture;
      simMat.uniforms.uFluidDensity.value = densityFBO.read.texture;
      simMat.uniforms.uProjectionMatrix.value.copy(projMat);
      simMat.uniforms.uModelMatrix.value.copy(group.matrixWorld);
      simMat.uniforms.uCameraWorldRotation.value.copy(camRotMat);
      simMat.uniforms.uTime.value = time;
      simMat.uniforms.uHZ.value = HZ;

      fboQuad.setMaterial(simMat);
      fboQuad.render(renderer, particlePosB);

      // Swap particle targets
      const tmp = particlePosA;
      particlePosA = particlePosB;
      particlePosB = tmp;

      // 4. Render Particle Points to Screen
      pointMat.uniforms.uPositionTexture.value = particlePosA.texture;
      pointMat.uniforms.uTime.value = time;

      renderer.setRenderTarget(null);
      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchstart', handleTouchMove);
      window.removeEventListener('resize', handleResize);

      renderer.dispose();
      velocityFBO.read.dispose();
      velocityFBO.write.dispose();
      densityFBO.read.dispose();
      densityFBO.write.dispose();
      divergenceFBO.dispose();
      curlFBO.dispose();
      pressureFBO.read.dispose();
      pressureFBO.write.dispose();
      particlePosA.dispose();
      particlePosB.dispose();
      originTexture.dispose();
      matcapTexture.dispose();
      pointGeo.dispose();
      pointMat.dispose();
    };
  }, []);

  return <canvas id="bg" ref={canvasRef} className="fixed inset-0 z-0 h-full w-full block bg-black" />;
}
