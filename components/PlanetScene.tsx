import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { AfterimagePass } from 'three/addons/postprocessing/AfterimagePass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { 
  PlanetSceneSettings, 
  PlanetSettings, 
  HandData,
  PlanetFillMode,
  GradientColor,
  TiltSettings,
  OrbitAxisSettings,
  RotationAxisSettings,
  PlanetCoreSettings,
  SolidCoreSettings,
  OrbitingFireflySettings,
  WanderingFireflyGroupSettings,
  EnergyBodySettings,
  PolyhedronType,
  SurfaceFlameSettings,
  FlameJetSettings,
  SpiralFlameSettings
} from '../types';
import { createDefaultEnergyBody } from '../constants';
import { getTiltAngles, getRotationAxis, getOrbitAxisVector, DEFAULT_TILT_SETTINGS } from '../constants';
import { 
  Graph, 
  LightPacket, 
  PathSystemConfig,
  buildGraphFromEdgesGeometry,
  createLightPackets,
  updateLightPackets,
  getEdgeLightData,
  getDwellingVertices
} from '../services/lightFlowPath';

// ==================== 常量 ====================

// Bloom layer 定义（用于选择性 Bloom）
const BLOOM_LAYER = 1;  // Layer 1 用于需要独立 Bloom 的对象
const ENTIRE_SCENE = 0; // Layer 0 是默认层

// ==================== GLSL 着色器 ====================

const planetVertexShader = `
uniform float uTime;
uniform float uRotationSpeed;
uniform vec3 uRotationAxis;
uniform float uBreathing;
uniform float uBreathingSpeed;
uniform float uFlicker;
uniform float uFlickerSpeed;

// 交互
uniform vec3 uHandPos;
uniform float uHandActive;
uniform float uInteractionRadius;
uniform float uInteractionStrength;

// 丝线效果
uniform int uSilkEnabled;
uniform float uSilkThicknessVar;
uniform float uSilkDashPattern;
uniform float uSilkNoiseStrength;
uniform float uSilkNoiseFreq;
uniform float uSilkRingCount;     // 细环数量
uniform float uSilkRingSharpness; // 环边缘锐度

attribute vec3 aColor;
attribute float aSize;
attribute float aId;
attribute float aRadialDist;  // 到球心距离（归一化）

varying vec3 vColor;
varying float vAlpha;
varying float vId;
varying float vSilkNoise;
varying float vRadialDist;  // 传递给片段着色器用于环状条纹

// 简化的噪声函数
float hash(float n) { return fract(sin(n) * 43758.5453123); }

// 旋转矩阵
mat3 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

// Simplex 噪声辅助函数
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vColor = aColor;
  vId = aId;
  vAlpha = 1.0;
  vSilkNoise = 0.0;
  vRadialDist = aRadialDist;  // 传递径向距离
  
  vec3 pos = position;
  
  // 丝线效果 - 噪声扰动位置
  if (uSilkEnabled == 1) {
    float noiseVal = snoise(pos * uSilkNoiseFreq + uTime * 0.1);
    vSilkNoise = noiseVal;
    pos += normalize(pos) * noiseVal * uSilkNoiseStrength * 5.0;
  }
  
  // 自转
  if (abs(uRotationSpeed) > 0.001) {
    float angle = uTime * uRotationSpeed;
    mat3 rot = rotationMatrix(uRotationAxis, angle);
    pos = rot * pos;
  }
  
  // 呼吸效果
  if (uBreathing > 0.0) {
    float breathe = 1.0 + uBreathing * sin(uTime * uBreathingSpeed);
    pos *= breathe;
  }
  
  // 手势交互
  if (uHandActive > 0.5) {
    vec3 toHand = pos - uHandPos;
    float dist = length(toHand);
    if (dist < uInteractionRadius && dist > 0.01) {
      float force = (1.0 - dist / uInteractionRadius) * uInteractionStrength;
      pos += normalize(toHand) * force;
    }
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // 大小计算
  float size = aSize;
  
  // 丝线效果 - 粗细变化
  if (uSilkEnabled == 1) {
    float thicknessNoise = snoise(position * uSilkNoiseFreq * 2.0 + vec3(uTime * 0.2, 0.0, 0.0));
    size *= 1.0 + thicknessNoise * uSilkThicknessVar;
  }
  
  // 闪烁效果
  if (uFlicker > 0.0) {
    float flicker = 0.5 + 0.5 * sin(uTime * uFlickerSpeed + aId * 10.0);
    size *= mix(1.0, flicker, uFlicker);
    vAlpha *= mix(1.0, flicker, uFlicker * 0.5);
  }
  
  gl_PointSize = size * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const planetFragmentShader = `
uniform float uGlowIntensity;
uniform float uSaturation;
uniform float uTime;
uniform float uTrailAlpha; // 拖尾层透明度系数

// 闪电效果参数
uniform float uWanderingLightning;
uniform float uWanderingLightningSpeed;
uniform float uWanderingLightningDensity;
uniform float uLightningBreakdown;
uniform float uLightningBreakdownFreq;
uniform float uLightningBranches;

// 丝线效果参数
uniform int uSilkEnabled;
uniform float uSilkDashPattern;
uniform float uSilkRingCount;     // 细环数量
uniform float uSilkRingSharpness; // 环边缘锐度

varying vec3 vColor;
varying float vAlpha;
varying float vId;
varying float vSilkNoise;
varying float vRadialDist;  // 径向距离

// 简单哈希函数
float hash(float n) { return fract(sin(n) * 43758.5453123); }

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  
  if (dist > 0.5) discard;
  
  // 柔和光晕
  float alpha = smoothstep(0.5, 0.0, dist);
  alpha = pow(alpha, 1.0 / uGlowIntensity);
  
  // 丝线效果 - 多条细环叠加
  if (uSilkEnabled == 1 && uSilkRingCount > 0.5) {
    // 基于径向距离创建环状条纹
    float ringPhase = vRadialDist * uSilkRingCount * 3.14159 * 2.0;
    float ringPattern = sin(ringPhase);
    
    // 根据锐度调整过渡
    float sharpness = uSilkRingSharpness * 0.9 + 0.05; // 0.05-0.95
    float ringAlpha = smoothstep(-sharpness, sharpness, ringPattern);
    
    // 添加一点噪声变化让效果更自然
    ringAlpha = ringAlpha * (0.8 + 0.2 * (vSilkNoise * 0.5 + 0.5));
    
    alpha *= ringAlpha;
  }
  
  // 饱和度调整
  vec3 color = vColor;
  float gray = dot(color, vec3(0.299, 0.587, 0.114));
  color = mix(vec3(gray), color, uSaturation);
  
  // 游走闪电效果
  if (uWanderingLightning > 0.01) {
    float t = uTime * uWanderingLightningSpeed;
    float particlePhase = vId * 0.1 + t;
    
    // 闪电脉冲
    float pulse = sin(particlePhase * uWanderingLightningDensity) * 0.5 + 0.5;
    pulse = pow(pulse, 4.0); // 更尖锐的脉冲
    
    if (pulse > 0.7) {
      float intensity = (pulse - 0.7) / 0.3 * uWanderingLightning;
      vec3 electricColor = vec3(0.5, 0.8, 1.0); // 电蓝色
      color = mix(color, electricColor, intensity);
      alpha = max(alpha, intensity);
    }
  }
  
  // 闪电击穿效果
  if (uLightningBreakdown > 0.01) {
    float breakdownCycle = uTime * uLightningBreakdownFreq;
    float cyclePhase = fract(breakdownCycle);
    
    if (cyclePhase < 0.3) {
      float breakdownIntensity = 1.0 - cyclePhase / 0.3;
      breakdownIntensity = pow(breakdownIntensity, 2.0);
      
      // 随机选择被击中的粒子
      float strikeChance = hash(floor(breakdownCycle) * 100.0 + vId);
      if (strikeChance < 0.02 * (1.0 + uLightningBranches)) {
        float intensity = breakdownIntensity * uLightningBreakdown;
        color = mix(color, vec3(1.0, 1.0, 1.0), intensity);
        alpha = max(alpha, intensity);
      }
    }
  }
  
  gl_FragColor = vec4(color, alpha * vAlpha * uTrailAlpha);
}
`;

// ==================== 实体核心着色器 ====================

const solidCoreVertexShader = `
precision highp float;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  // 本地坐标 - 用于渐变计算
  vLocalPosition = position;
  
  // 世界坐标 - 用于噪声采样
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  
  // 视图空间坐标 - 用于菲涅尔计算
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz; // 视图空间中，从表面指向相机的向量
  
  // 法线在视图空间 - 与 vViewPosition 坐标系统一
  vNormal = normalize(normalMatrix * normal);
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const solidCoreFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uRadius;
uniform float uScale;
uniform float uSpeed;
uniform float uContrast;
uniform float uBandMix;
uniform float uRidgeMix;
uniform float uGridMix;
// 熔岩裂隙系统
uniform float uCrackEnabled;
uniform float uCrackScale;
uniform float uCrackThreshold;
uniform float uCrackFeather;
uniform float uCrackWarp;
uniform float uCrackWarpScale;
uniform float uCrackFlowSpeed;
uniform vec3 uCrackColor1;
uniform vec3 uCrackColor2;
uniform float uCrackEmission;
uniform float uEmissiveStrength;
// 多频叠加
uniform float uMultiFreqEnabled;
uniform float uWarpIntensity;
uniform float uWarpScale;
uniform float uDetailBalance;
// 法线扰动 + 高光
uniform float uBumpEnabled;
uniform float uBumpStrength;
uniform float uSpecularStrength;
uniform vec3 uSpecularColor;
uniform float uRoughness;
// 定向光参数
uniform float uLightEnabled;
uniform vec3 uLightDirection;
uniform vec3 uLightColor;
uniform float uLightIntensity;
uniform float uLightAmbient;
// 热点辉斑
uniform float uHotspotEnabled;
uniform float uHotspotCount;
uniform float uHotspotSize;
uniform float uHotspotPulseSpeed;
uniform vec3 uHotspotColor;
uniform float uHotspotEmission;
uniform float uOpacity;
uniform float uBrightness;

// 表面颜色系统（支持渐变）
uniform float uSurfaceColorMode;    // 0=单色, 1=双色, 2=三色, 3=混色
uniform vec3 uSurfaceBaseColor;     // 基础颜色
uniform vec3 uSurfaceColor1;        // 渐变色1
uniform vec3 uSurfaceColor2;        // 渐变色2
uniform vec3 uSurfaceColor3;        // 渐变色3（三色模式）
uniform float uSurfaceColorMidPos;  // 中间色位置
uniform float uSurfaceColorMidWidth;// 中间色宽度（新逻辑）
uniform float uSurfaceColorMidWidth2;// 中间色宽度2（旧逻辑：纯色带）
uniform float uSurfaceGradientDir;  // 渐变方向
uniform vec3 uSurfaceCustomDir;     // 自定义方向
uniform float uSurfaceSpiralDensity;// 螺旋密度
uniform float uSurfaceProceduralInt;// 混色强度

// 光晕颜色系统（支持渐变）
uniform float uGlowColorMode;
uniform vec3 uGlowBaseColor;
uniform vec3 uGlowColor1;
uniform vec3 uGlowColor2;
uniform vec3 uGlowColor3;
uniform float uGlowColorMidPos;
uniform float uGlowColorMidWidth;   // 光晕中间色宽度（新逻辑）
uniform float uGlowColorMidWidth2;  // 光晕纯色带宽度（旧逻辑）
uniform float uGlowGradientDir;
uniform vec3 uGlowCustomDir;
uniform float uGlowSpiralDensity;
uniform float uGlowProceduralInt;

// 光晕参数
uniform float uGlowLength;
uniform float uGlowStrength;
uniform float uGlowBloomBoost;

varying vec3 vWorldPosition;
varying vec3 vLocalPosition;
varying vec3 vNormal;
varying vec3 vViewPosition;

// Simplex Noise 3D - 核心噪声函数
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;
  
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// 脊线噪声 (Ridged Noise) - 用于产生细而连贯的裂隙网络
// 通过取绝对值并反转，将噪声的零交叉线转为明亮的脊线
float ridgedNoise(vec3 p) {
  // 取绝对值产生脊线，1.0 - abs 使零交叉处最亮
  return 1.0 - abs(snoise(p));
}

// 多层脊线 FBM (Fractal Brownian Motion)
// 叠加多个尺度的脊线噪声，产生自然的裂隙网络
float ridgedFBM(vec3 p, float time) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  // 3层叠加：低频大裂隙 + 中频分支 + 高频细节
  for (int i = 0; i < 3; i++) {
    // 每层加入轻微时间偏移，产生流动感
    vec3 samplePos = p * frequency + vec3(0.0, time * 0.1 * float(i + 1), 0.0);
    float ridge = ridgedNoise(samplePos);
    // 脊线值的平方可以让裂隙更细
    value += ridge * ridge * amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value;
}

// 域扭曲函数 - 用噪声偏移采样坐标，打破规则感
vec3 domainWarp(vec3 p, float warpScale, float warpIntensity) {
  vec3 offset = vec3(
    snoise(p * warpScale),
    snoise(p * warpScale + vec3(100.0, 0.0, 0.0)),
    snoise(p * warpScale + vec3(0.0, 100.0, 0.0))
  ) * warpIntensity;
  return p + offset;
}

// 多频 FBM 噪声 - 大陆形态 + 中频结构 + 高频细节
float multiFreqNoise(vec3 p, float detailBalance) {
  float low = snoise(p * 0.5);           // 大陆/板块
  float mid = snoise(p * 2.0);           // 中频结构
  float hi = snoise(p * 6.0);            // 高频细节
  // 权重分配：低频占主导，高频细节由 detailBalance 控制
  float lowWeight = 0.5;
  float midWeight = 0.35;
  float hiWeight = 0.15 * detailBalance;
  return (low * lowWeight + mid * midWeight + hi * hiWeight) / (lowWeight + midWeight + hiWeight);
}

// 从噪声计算法线扰动（伪凹凸映射）
vec3 computeBumpNormal(vec3 p, vec3 normal, float strength) {
  float eps = 0.02;
  float h0 = snoise(p);
  float hx = snoise(p + vec3(eps, 0.0, 0.0));
  float hy = snoise(p + vec3(0.0, eps, 0.0));
  float hz = snoise(p + vec3(0.0, 0.0, eps));
  
  // 计算梯度
  vec3 gradient = vec3(hx - h0, hy - h0, hz - h0) / eps;
  
  // 扰动法线
  vec3 bumpedNormal = normalize(normal - gradient * strength);
  return bumpedNormal;
}

// 热点辉斑 - 基于噪声的随机高亮点
float computeHotspots(vec3 p, float count, float size, float time, float pulseSpeed) {
  float hotspot = 0.0;
  
  // 使用不同偏移生成多个热点
  for (float i = 0.0; i < 8.0; i++) {
    if (i >= count) break;
    
    // 每个热点有固定的种子位置
    vec3 seed = vec3(i * 17.3, i * 31.7, i * 47.1);
    vec3 hotspotCenter = vec3(
      sin(seed.x) * 0.7,
      cos(seed.y) * 0.7,
      sin(seed.z) * 0.7
    );
    
    // 计算到热点中心的距离
    float dist = length(p - hotspotCenter);
    
    // 脉冲动画
    float pulse = 0.5 + 0.5 * sin(time * pulseSpeed + i * 2.0);
    
    // 软边热点
    float spot = smoothstep(size, size * 0.3, dist) * pulse;
    hotspot = max(hotspot, spot);
  }
  
  return hotspot;
}

void main() {
  // 标准化视线与法线 (统一在视图空间)
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);
  
  // === 归一化采样坐标 ===
  // 将世界坐标归一化到 [-1, 1]，使纹理与球体大小解耦
  vec3 normalizedPos = vWorldPosition / uRadius;
  
  // --- 1. [纹理密度] & [流动速度] ---
  // uScale 直接控制纹理密度（归一化后不再需要 0.05 系数）
  float realScale = uScale;
  
  // 时间乘以速度加在 Y 轴，产生流动感 (类似自转或热对流)
  vec3 noisePos = normalizedPos * realScale + vec3(0.0, uTime * uSpeed, 0.0);
  
  // --- 1.5 [多频叠加] (Multi-Frequency FBM) ---
  // 应用全局域扭曲（如果启用）
  if (uMultiFreqEnabled > 0.5) {
    noisePos = domainWarp(noisePos, uWarpScale, uWarpIntensity);
  }
  
  // 基础噪声（可选多频叠加）
  float n;
  if (uMultiFreqEnabled > 0.5) {
    n = multiFreqNoise(noisePos, uDetailBalance);
  } else {
    n = snoise(noisePos); // 基础噪声值，范围 [-1, 1]
  }
  
  // --- 2. [气态干扰] (Gas Distortion) ---
  // 利用正弦波基于 Y 轴高度产生条纹，混入噪声 n 产生湍流
  float bands = sin(normalizedPos.y * realScale * 2.0 + n * 2.0);
  // uBandMix 控制条纹强度: 0=纯噪声, 1=纯条纹
  float noiseVal = mix(n, bands, uBandMix);
  
  // --- 3. [晶体锐化] (Crystal Ridging) ---
  // 平滑模式: 将 [-1,1] 映射到 [0,1]
  float smoothVal = noiseVal * 0.5 + 0.5;
  // 锐化模式: 取绝对值 abs([-1,1]) -> [0,1] (将波峰折叠成尖锐山脊)
  float ridgeVal = abs(noiseVal);
  // uRidgeMix 控制锐度: 0=云雾, 1=冰晶
  float pattern = mix(smoothVal, ridgeVal, uRidgeMix);
  
  // --- 4. [网格混合] (Grid Overlay) ---
  if (uGridMix > 0.01) {
    float density = realScale * 0.5;
    // 使用 step 产生只有 10% 宽度的硬边细线 (0.9 阈值)
    float gx = step(0.9, fract(normalizedPos.x * density));
    float gy = step(0.9, fract(normalizedPos.y * density));
    // 取最大值叠加经纬线
    float grid = max(gx, gy);
    pattern = mix(pattern, grid, uGridMix);
  }
  
  // --- 4.5 [熔岩裂隙系统] (Ridged Noise + Domain Warp) ---
  // 独立计算裂隙遮罩和颜色，后续叠加
  float crackMask = 0.0;
  vec3 crackColor = vec3(0.0);
  
  if (uCrackEnabled > 0.5) {
    // 应用域扭曲打破规则感
    vec3 warpedPos = domainWarp(normalizedPos, uCrackWarpScale, uCrackWarp);
    
    // 加入时间流动
    float flowTime = uTime * uCrackFlowSpeed;
    vec3 crackPos = warpedPos * uCrackScale;
    
    // 计算脊线 FBM 噪声
    float ridgeValue = ridgedFBM(crackPos, flowTime);
    
    // 阈值 + 羽化：将连续值转为细线遮罩
    // ridgeValue 高的地方是裂隙（脊线）
    float lowEdge = uCrackThreshold - uCrackFeather;
    float highEdge = uCrackThreshold + uCrackFeather;
    crackMask = smoothstep(lowEdge, highEdge, ridgeValue);
    
    // 裂隙内渐变色：根据 ridgeValue 强度从 color1 过渡到 color2
    float colorT = clamp((ridgeValue - lowEdge) / (highEdge - lowEdge + 0.001), 0.0, 1.0);
    crackColor = mix(uCrackColor2, uCrackColor1, colorT);
  }
  
  // --- 5. [能量对比] (Energy Contrast) ---
  // 关键步骤：通过幂运算拉开明暗差距，制造"岩浆"的黑岩与亮斑
  // 必须 clamp 到 0-1 防止负数幂运算错误
  pattern = pow(clamp(pattern, 0.0, 1.0), uContrast);
  
  // --- 6. 计算渐变参数 t ---
  // 归一化本地坐标用于渐变计算
  vec3 normLocal = vLocalPosition / uRadius;
  float radialT = length(normLocal); // 径向 0-1
  
  // 计算球面角度用于螺旋
  float theta = atan(normLocal.z, normLocal.x); // -PI to PI
  float phi = acos(clamp(normLocal.y, -1.0, 1.0)); // 0 to PI
  float angularT = (theta + 3.14159) / (2.0 * 3.14159); // 0-1
  
  // 根据渐变方向计算 t
  float surfaceGradientT = radialT;
  if (uSurfaceGradientDir < 0.5) { // radial
    surfaceGradientT = radialT;
  } else if (uSurfaceGradientDir < 1.5) { // linearX
    surfaceGradientT = (normLocal.x + 1.0) * 0.5;
  } else if (uSurfaceGradientDir < 2.5) { // linearY
    surfaceGradientT = (normLocal.y + 1.0) * 0.5;
  } else if (uSurfaceGradientDir < 3.5) { // linearZ
    surfaceGradientT = (normLocal.z + 1.0) * 0.5;
  } else if (uSurfaceGradientDir < 4.5) { // custom
    vec3 normDir = normalize(uSurfaceCustomDir);
    surfaceGradientT = (dot(normLocal, normDir) + 1.0) * 0.5;
  } else { // spiral
    surfaceGradientT = fract(angularT * uSurfaceSpiralDensity + radialT * 2.0);
  }
  surfaceGradientT = clamp(surfaceGradientT, 0.0, 1.0);
  
  // --- 7. 计算表面颜色 ---
  vec3 baseGradientColor = uSurfaceBaseColor;
  if (uSurfaceColorMode > 0.5 && uSurfaceColorMode < 1.5) { // 双色渐变
    baseGradientColor = mix(uSurfaceColor1, uSurfaceColor2, surfaceGradientT);
  } else if (uSurfaceColorMode > 1.5 && uSurfaceColorMode < 2.5) { // 三色渐变
    float blendWeight = min(uSurfaceColorMidWidth, 1.0);
    float rangeExpand = max(uSurfaceColorMidWidth - 1.0, 0.0) * 0.2;
    float bandHalf = uSurfaceColorMidWidth2 * 0.5;
    float midStart = max(0.01, uSurfaceColorMidPos - rangeExpand - bandHalf);
    float midEnd = min(0.99, uSurfaceColorMidPos + rangeExpand + bandHalf);
    
    vec3 threeColorResult;
    if (surfaceGradientT < midStart) {
      threeColorResult = mix(uSurfaceColor1, uSurfaceColor2, surfaceGradientT / midStart);
    } else if (surfaceGradientT > midEnd) {
      threeColorResult = mix(uSurfaceColor2, uSurfaceColor3, (surfaceGradientT - midEnd) / (1.0 - midEnd));
    } else {
      threeColorResult = uSurfaceColor2;
    }
    vec3 twoColorResult = mix(uSurfaceColor1, uSurfaceColor3, surfaceGradientT);
    baseGradientColor = mix(twoColorResult, threeColorResult, blendWeight);
  } else if (uSurfaceColorMode > 2.5) { // 混色（程序化色相偏移）
    float hueShift = surfaceGradientT * uSurfaceProceduralInt * 0.3;
    baseGradientColor = uSurfaceBaseColor;
    baseGradientColor.r = mix(baseGradientColor.r, baseGradientColor.g, hueShift);
    baseGradientColor.g = mix(baseGradientColor.g, baseGradientColor.b, hueShift);
  }
  
  // 计算暗色版本用于纹理混合
  vec3 darkColor = baseGradientColor * 0.2;
  vec3 surfaceColor = mix(darkColor, baseGradientColor, pattern);
  
  // --- 7.5 [纹理自发光] (Emissive Pattern) ---
  // 让高亮区域发出超过 1.0 的光，触发 Bloom
  if (uEmissiveStrength > 0.01) {
    // pattern 值高的区域（亮部）增加自发光
    float emissiveMask = pow(pattern, 0.5); // 稍微扩大亮部范围
    surfaceColor += baseGradientColor * emissiveMask * uEmissiveStrength;
  }
  
  // --- 7.55 [裂隙叠加] (Crack Overlay) ---
  // 裂隙独立于基础纹理，以加法叠加
  if (uCrackEnabled > 0.5 && crackMask > 0.01) {
    // 裂隙颜色叠加到表面
    vec3 crackContribution = crackColor * crackMask;
    surfaceColor = mix(surfaceColor, crackColor, crackMask * 0.8);
    // 裂隙独立发光（触发 Bloom）
    surfaceColor += crackContribution * uCrackEmission;
  }
  
  // --- 7.6 [定向光照] (Directional Light) ---
  // 准备光照计算所需的法线（可能被扰动）
  vec3 shadingNormal = normal;
  
  // 法线扰动
  if (uBumpEnabled > 0.5) {
    shadingNormal = computeBumpNormal(noisePos, normal, uBumpStrength);
  }
  
  if (uLightEnabled > 0.5) {
    vec3 lightDir = normalize(uLightDirection);
    // 计算漫反射（Lambert）使用扰动法线
    float diffuse = max(dot(shadingNormal, -lightDir), 0.0);
    // 混合环境光和漫反射
    float lightFactor = uLightAmbient + diffuse * (1.0 - uLightAmbient);
    // 应用光照颜色和强度
    vec3 litColor = surfaceColor * lightFactor;
    // 叠加光源颜色的影响
    litColor += uLightColor * diffuse * uLightIntensity * 0.3;
    surfaceColor = litColor;
    
    // --- 7.65 [高光计算] (Specular Highlight) ---
    if (uBumpEnabled > 0.5 && uSpecularStrength > 0.01) {
      // Blinn-Phong 高光
      vec3 halfVec = normalize(-lightDir + viewDir);
      float specAngle = max(dot(shadingNormal, halfVec), 0.0);
      float spec = pow(specAngle, uRoughness);
      surfaceColor += uSpecularColor * spec * uSpecularStrength * diffuse;
    }
  }
  
  // --- 7.7 [热点辉斑] (Hotspots) ---
  if (uHotspotEnabled > 0.5) {
    float hotspot = computeHotspots(normalizedPos, uHotspotCount, uHotspotSize, uTime, uHotspotPulseSpeed);
    // 热点叠加发光
    surfaceColor += uHotspotColor * hotspot * uHotspotEmission;
  }
  
  // --- 8. [边缘发光] (Fresnel Glow) ---
  float fresnel = 1.0 - clamp(dot(viewDir, normal), 0.0, 1.0);
  float glowExponent = 10.0 / max(uGlowLength, 0.1);
  float glowFactor = pow(fresnel, glowExponent);
  
  // 计算光晕渐变参数
  float glowGradientT = radialT;
  if (uGlowGradientDir < 0.5) { glowGradientT = radialT; }
  else if (uGlowGradientDir < 1.5) { glowGradientT = (normLocal.x + 1.0) * 0.5; }
  else if (uGlowGradientDir < 2.5) { glowGradientT = (normLocal.y + 1.0) * 0.5; }
  else if (uGlowGradientDir < 3.5) { glowGradientT = (normLocal.z + 1.0) * 0.5; }
  else if (uGlowGradientDir < 4.5) { glowGradientT = (dot(normLocal, normalize(uGlowCustomDir)) + 1.0) * 0.5; }
  else { glowGradientT = fract(angularT * uGlowSpiralDensity + radialT * 2.0); }
  glowGradientT = clamp(glowGradientT, 0.0, 1.0);
  
  // 计算光晕颜色
  vec3 glowColor = uGlowBaseColor;
  if (uGlowColorMode > 0.5 && uGlowColorMode < 1.5) {
    glowColor = mix(uGlowColor1, uGlowColor2, glowGradientT);
  } else if (uGlowColorMode > 1.5 && uGlowColorMode < 2.5) { // 三色渐变
    float blendWeight = min(uGlowColorMidWidth, 1.0);
    float rangeExpand = max(uGlowColorMidWidth - 1.0, 0.0) * 0.2;
    float bandHalf = uGlowColorMidWidth2 * 0.5;
    float midStart = max(0.01, uGlowColorMidPos - rangeExpand - bandHalf);
    float midEnd = min(0.99, uGlowColorMidPos + rangeExpand + bandHalf);
    
    vec3 threeColorGlow;
    if (glowGradientT < midStart) {
      threeColorGlow = mix(uGlowColor1, uGlowColor2, glowGradientT / midStart);
    } else if (glowGradientT > midEnd) {
      threeColorGlow = mix(uGlowColor2, uGlowColor3, (glowGradientT - midEnd) / (1.0 - midEnd));
    } else {
      threeColorGlow = uGlowColor2;
    }
    vec3 twoColorGlow = mix(uGlowColor1, uGlowColor3, glowGradientT);
    glowColor = mix(twoColorGlow, threeColorGlow, blendWeight);
  } else if (uGlowColorMode > 2.5) {
    float hueShift = glowGradientT * uGlowProceduralInt * 0.3;
    glowColor = uGlowBaseColor;
    glowColor.r = mix(glowColor.r, glowColor.g, hueShift);
    glowColor.g = mix(glowColor.g, glowColor.b, hueShift);
  }
  
  // 叠加光晕
  surfaceColor += glowColor * glowFactor * uGlowStrength;
  
  // --- 9. [Bloom 增强] ---
  if (uGlowBloomBoost > 0.01) {
    float bloomPeak = glowFactor * glowFactor * 2.0;
    surfaceColor += glowColor * bloomPeak * uGlowStrength * uGlowBloomBoost;
  }
  
  // --- 10. [亮度调整] ---
  surfaceColor *= uBrightness;
  
  gl_FragColor = vec4(surfaceColor, uOpacity);
}
`;

// ==================== 表面火焰着色器 ====================

const surfaceFlameVertexShader = `
precision highp float;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec2 vUv;

void main() {
  vLocalPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 worldPos = modelMatrix * vec4(position, 1.0);
  vWorldPosition = worldPos.xyz;
  vUv = uv;
  gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`;

const surfaceFlameFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uRadius;
uniform float uThickness;

// 火团参数
uniform float uFlameScale;
uniform float uDensity;

// 质感参数
uniform float uFlowSpeed;
uniform float uTurbulence;
uniform float uNoiseType; // 0=simplex, 1=voronoi
uniform float uFractalLayers;

// 视觉参数
uniform float uOpacity;
uniform float uEmissive;
uniform float uBloomBoost;

// 动画参数
uniform float uDirection; // 0=up, 1=outward, 2=spiral
uniform float uPulseEnabled;
uniform float uPulseSpeed;
uniform float uPulseIntensity;

// 颜色系统
uniform float uColorMode;
uniform vec3 uBaseColor;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uColorMidPos;
uniform float uColorMidWidth;
uniform float uGradientDir;
uniform vec3 uCustomDir;
uniform float uSpiralDensity;
uniform float uProceduralIntensity;

varying vec3 vWorldPosition;
varying vec3 vNormal;
varying vec3 vLocalPosition;
varying vec2 vUv;

// Simplex 3D 噪声
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Voronoi 噪声
float voronoi(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 point = vec3(
          fract(sin(dot(i + neighbor, vec3(127.1, 311.7, 74.7))) * 43758.5453),
          fract(sin(dot(i + neighbor, vec3(269.5, 183.3, 246.1))) * 43758.5453),
          fract(sin(dot(i + neighbor, vec3(419.2, 371.9, 168.2))) * 43758.5453)
        );
        vec3 diff = neighbor + point - f;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
  }
  return minDist;
}

// FBM 分形噪声
float fbm(vec3 p, int layers) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  float totalAmplitude = 0.0;
  
  for (int i = 0; i < 5; i++) {
    if (i >= layers) break;
    
    float n;
    if (uNoiseType < 0.5) {
      n = snoise(p * frequency);
    } else {
      n = 1.0 - voronoi(p * frequency) * 2.0;
    }
    
    value += n * amplitude;
    totalAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  
  return value / totalAmplitude;
}

void main() {
  vec3 normalizedPos = normalize(vLocalPosition);
  
  // 计算火焰采样坐标 - 厚度影响采样尺度，增加层次感
  float thicknessScale = 1.0 + uThickness * 3.0;
  vec3 flamePos = normalizedPos * uFlameScale * thicknessScale;
  
  // 根据方向添加动画偏移
  float flowTime = uTime * uFlowSpeed;
  if (uDirection < 0.5) {
    // 向上舔舐
    flamePos.y -= flowTime;
  } else {
    // 螺旋上升
    float angle = flowTime * 2.0;
    float c = cos(angle);
    float s = sin(angle);
    flamePos.xz = mat2(c, -s, s, c) * flamePos.xz;
    flamePos.y -= flowTime * 0.5;
  }
  
  // 添加湍流扰动
  vec3 turbulenceOffset = vec3(
    snoise(flamePos * 2.0 + uTime * 0.3),
    snoise(flamePos * 2.0 + 100.0 + uTime * 0.3),
    snoise(flamePos * 2.0 + 200.0 + uTime * 0.3)
  ) * uTurbulence * 0.5;
  flamePos += turbulenceOffset;
  
  // 计算分形火焰噪声
  int layers = int(uFractalLayers);
  float flameNoise = fbm(flamePos, layers);
  
  // 转换为火焰形态 [0, 1]
  float flameMask = (flameNoise + 1.0) * 0.5;
  
  // 应用密度控制
  flameMask = smoothstep(1.0 - uDensity, 1.0, flameMask);
  
  // 根据法线方向增强向上的火焰
  if (uDirection < 0.5) {
    float upFactor = dot(normalizedPos, vec3(0.0, 1.0, 0.0)) * 0.5 + 0.5;
    flameMask *= 0.5 + upFactor * 0.5;
  }
  
  // 脉动效果
  float pulse = 1.0;
  if (uPulseEnabled > 0.5) {
    pulse = 1.0 + sin(uTime * uPulseSpeed * 3.14159) * uPulseIntensity;
  }
  flameMask *= pulse;
  
  // 计算颜色渐变参数 - 使用火焰噪声值作为主要渐变因素
  float heightFactor = normalizedPos.y * 0.5 + 0.5;  // 0-1，底部到顶部
  float gradientT = mix(flameMask, heightFactor, 0.4);  // 混合噪声和高度
  gradientT = clamp(gradientT, 0.0, 1.0);
  
  // 计算火焰颜色
  vec3 flameColor = uBaseColor;
  if (uColorMode > 0.5 && uColorMode < 1.5) {
    // 双色渐变
    flameColor = mix(uColor1, uColor2, gradientT);
  } else if (uColorMode > 1.5 && uColorMode < 2.5) {
    // 三色渐变
    if (gradientT < uColorMidPos) {
      flameColor = mix(uColor1, uColor2, gradientT / uColorMidPos);
    } else {
      flameColor = mix(uColor2, uColor3, (gradientT - uColorMidPos) / (1.0 - uColorMidPos));
    }
  } else if (uColorMode > 2.5) {
    // 程序化混色
    float hueShift = snoise(flamePos * uProceduralIntensity + uTime * 0.2) * 0.5 + 0.5;
    flameColor = mix(uColor1, uColor2, hueShift);
    flameColor = mix(flameColor, uColor3, sin(hueShift * 3.14159) * 0.5);
  }
  
  // 应用火焰遮罩
  vec3 finalColor = flameColor * flameMask;
  
  // 添加自发光
  finalColor *= (1.0 + uEmissive * flameMask);
  
  // Bloom 增强
  finalColor *= (1.0 + uBloomBoost * flameMask * 0.5);
  
  // 透明度 - 基于火焰遮罩和厚度
  float thicknessAlpha = 0.5 + uThickness * 1.5;  // 厚度影响整体透明度
  float alpha = flameMask * uOpacity * thicknessAlpha;
  
  // 菲涅尔效果：边缘更亮，厚度影响边缘强度
  float fresnel = 1.0 - abs(dot(normalize(vNormal), normalize(vWorldPosition)));
  float fresnelStrength = 0.3 + uThickness * 0.7;  // 厚度越大，菲涅尔效果越强
  alpha *= (1.0 - fresnelStrength + fresnel * fresnelStrength);
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ==================== 喷发火柱着色器 ====================
const flameJetVertexShader = `
precision highp float;

attribute float aProgress;      // 粒子生命进度 0-1
attribute float aRandom;        // 随机值
attribute vec3 aJetDirection;   // 喷射方向
attribute float aJetIndex;      // 所属喷射口索引

uniform float uTime;
uniform float uJetSpeed;
uniform float uHeight;
uniform float uWidth;
uniform float uSpread;
uniform float uTurbulence;
uniform float uLifespan;
uniform float uParticleSize;
uniform float uBurstPhase;      // 爆发相位 0-1

varying float vProgress;
varying float vRandom;
varying float vAlpha;

// 噪声函数
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  vProgress = aProgress;
  vRandom = aRandom;
  
  // 计算当前粒子的生命阶段
  float time = uTime * uJetSpeed;
  float life = mod(aProgress + time / uLifespan + aRandom * 0.5, 1.0);
  
  // 应用爆发相位
  float burstFade = uBurstPhase;
  
  // 沿喷射方向移动
  float height = life * uHeight;
  
  // 扩散
  float spreadAngle = uSpread * 3.14159 / 180.0;
  float spreadAmount = life * spreadAngle;
  
  // 湍流扰动
  vec3 turbOffset = vec3(
    snoise(vec3(position.x * 2.0 + time, position.y * 2.0, aRandom * 10.0)),
    snoise(vec3(position.y * 2.0, position.z * 2.0 + time, aRandom * 20.0)),
    snoise(vec3(position.z * 2.0, position.x * 2.0, time + aRandom * 30.0))
  ) * uTurbulence * life * 20.0;
  
  // 计算最终位置
  vec3 jetDir = normalize(aJetDirection);
  vec3 sideDir = normalize(cross(jetDir, vec3(0.0, 1.0, 0.1)));
  vec3 upDir = normalize(cross(sideDir, jetDir));
  
  vec3 offset = jetDir * height;
  offset += sideDir * sin(aRandom * 6.28) * spreadAmount * uWidth * 50.0;
  offset += upDir * cos(aRandom * 6.28) * spreadAmount * uWidth * 50.0;
  offset += turbOffset;
  
  vec3 newPos = position + offset;
  
  // 透明度：开始淡入，结束淡出
  float fadeIn = smoothstep(0.0, 0.1, life);
  float fadeOut = 1.0 - smoothstep(0.7, 1.0, life);
  vAlpha = fadeIn * fadeOut * burstFade;
  
  // 粒子大小随距离衰减
  float sizeFade = 1.0 - life * 0.5;
  
  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uParticleSize * sizeFade * (300.0 / -mvPosition.z);
}
`;

const flameJetFragmentShader = `
precision highp float;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uOpacity;
uniform float uEmissive;
uniform int uColorMode;

varying float vProgress;
varying float vRandom;
varying float vAlpha;

void main() {
  // 圆形粒子
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  // 颜色渐变：根据生命进度
  vec3 color;
  float t = vProgress + vRandom * 0.2;
  t = clamp(t, 0.0, 1.0);
  
  if (uColorMode == 2) {
    // 三色渐变
    if (t < 0.5) {
      color = mix(uColor1, uColor2, t * 2.0);
    } else {
      color = mix(uColor2, uColor3, (t - 0.5) * 2.0);
    }
  } else {
    // 双色渐变
    color = mix(uColor1, uColor2, t);
  }
  
  // 发光效果
  color *= uEmissive;
  
  gl_FragColor = vec4(color, alpha * vAlpha * uOpacity);
}
`;

// ==================== 螺旋火焰着色器 ====================
const spiralFlameVertexShader = `
precision highp float;

attribute float aAngle;         // 初始角度
attribute float aHeight;        // 初始高度位置
attribute float aRandom;        // 随机值

uniform float uTime;
uniform float uBaseRadius;
uniform float uStartRadius;
uniform float uEndRadius;
uniform float uSpiralHeight;
uniform float uPitch;
uniform float uRotationSpeed;
uniform float uRiseSpeed;
uniform int uSpiralCount;
uniform int uDirection;         // 0=cw, 1=ccw, 2=both
uniform float uThickness;
uniform float uParticleSize;

varying float vProgress;
varying float vRandom;
varying float vAlpha;

void main() {
  vRandom = aRandom;
  
  // 计算时间驱动的动画
  float time = uTime;
  float dir = uDirection == 1 ? -1.0 : 1.0;
  if (uDirection == 2) {
    dir = mod(aAngle, 6.28) > 3.14 ? 1.0 : -1.0;
  }
  
  // 螺旋上升动画
  float heightOffset = mod(aHeight + time * uRiseSpeed, 1.0);
  float rotOffset = time * uRotationSpeed * dir;
  
  // 计算螺旋位置
  float angle = aAngle + rotOffset + heightOffset * uPitch * 6.28;
  float radiusT = heightOffset;
  float radius = mix(uStartRadius, uEndRadius, radiusT) * uBaseRadius;
  
  // 添加厚度变化
  float thickOffset = (aRandom - 0.5) * uThickness * uBaseRadius;
  radius += thickOffset;
  
  // 计算 3D 位置
  float x = cos(angle) * radius;
  float z = sin(angle) * radius;
  float y = (heightOffset - 0.5) * uSpiralHeight;
  
  vec3 newPos = vec3(x, y, z);
  
  // 透明度
  float fadeIn = smoothstep(0.0, 0.1, heightOffset);
  float fadeOut = 1.0 - smoothstep(0.8, 1.0, heightOffset);
  vAlpha = fadeIn * fadeOut;
  vProgress = heightOffset;
  
  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uParticleSize * (300.0 / -mvPosition.z);
}
`;

const spiralFlameFragmentShader = `
precision highp float;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uOpacity;
uniform float uEmissive;
uniform int uColorMode;

varying float vProgress;
varying float vRandom;
varying float vAlpha;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.2, 0.5, dist);
  
  // 颜色渐变
  vec3 color;
  float t = vProgress + vRandom * 0.1;
  t = clamp(t, 0.0, 1.0);
  
  if (uColorMode == 2) {
    if (t < 0.5) {
      color = mix(uColor1, uColor2, t * 2.0);
    } else {
      color = mix(uColor2, uColor3, (t - 0.5) * 2.0);
    }
  } else {
    color = mix(uColor1, uColor2, t);
  }
  
  color *= uEmissive;
  
  gl_FragColor = vec4(color, alpha * vAlpha * uOpacity);
}
`;

// ==================== 公共动态效果函数库 ====================
// 这些函数在能量罩和残影系统中复用

const commonEnergyEffectsGLSL = `
// HSV 转 RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// 伪随机函数
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

float hash2(vec2 p) {
  return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

// 噪声函数
float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash2(i);
  float b = hash2(i + vec2(1.0, 0.0));
  float c = hash2(i + vec2(0.0, 1.0));
  float d = hash2(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 分形噪声
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amplitude * noise(p);
    p *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// 脉冲波 - 从中心向外扩散
float pulseWave(float dist, float time, float speed, float width, float count) {
  float result = 0.0;
  for (int i = 0; i < 5; i++) {
    if (float(i) >= count) break;
    float offset = float(i) / count;
    float phase = fract(dist - time * speed + offset);
    float pulse = smoothstep(0.0, width * 0.5, phase) 
                * (1.0 - smoothstep(width * 0.5, width, phase));
    result += pulse;
  }
  return result / max(count, 1.0);
}

// 同心环
float concentricRings(float dist, float time, float speed, int count) {
  float result = 0.0;
  float fCount = float(count);
  for (int i = 0; i < 10; i++) {
    if (i >= count) break;
    float ringPos = float(i) / fCount;
    float animated = fract(ringPos + time * speed * 0.2);
    float ringDist = abs(dist - animated);
    float ring = 1.0 - smoothstep(0.0, 0.06, ringDist);
    result += ring;
  }
  return min(result, 1.0);
}

// 能量流动螺旋
float energySpiral(float angle, float dist, float time, float density) {
  float spiral = sin((angle + dist * density - time * 0.8) * 4.0) * 0.5 + 0.5;
  return spiral;
}

// 细胞脉冲效果（类似 Voronoi）
float cellPulse(float seedVal, float time, float speed, float intensity) {
  return 1.0 + sin(time * speed + seedVal * 6.28) * intensity * 0.5;
}

// 菲涅尔边缘发光
float fresnelGlow(float dist, float falloff) {
  return pow(1.0 - dist, falloff);
}

// 颜色渐变（双色/三色）
vec3 gradientColor(float t, vec3 color1, vec3 color2, vec3 color3, int mode, float midPos) {
  if (mode == 1) {
    // 双色渐变
    return mix(color1, color2, t);
  } else if (mode == 2) {
    // 三色渐变
    if (t < midPos) {
      return mix(color1, color2, t / midPos);
    } else {
      return mix(color2, color3, (t - midPos) / (1.0 - midPos));
    }
  }
  return color1;
}

// 闪烁效果
float flicker(float time, float dist, float speed, float intensity) {
  return 1.0 + sin(time * speed + dist * 10.0) * intensity;
}
`;

// ==================== 残影系统着色器 ====================

// 残影纹理层顶点着色器
const afterimageTextureVertexShader = `
precision highp float;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

// 残影纹理层片段着色器 - 流动火焰效果
const afterimageTextureFragmentShader = `
precision highp float;

uniform float uTime;
uniform float uCoreRadius;
uniform float uPlaneSize;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform float uOpacity;
uniform float uFlowSpeed;
uniform float uNoiseScale;
uniform float uStretchFactor;

// 条纹效果参数
uniform float uStripeIntensity;
uniform float uStripeCount;
uniform float uDirectionalStretch;
uniform float uEdgeSharpness;
uniform float uDistortion;

// 纹理模式 (0=flow, 1=energy)
uniform float uTextureMode;

// 能量罩参数
uniform float uEnergyFlameScale;
uniform float uEnergyDensity;
uniform float uEnergyFlowSpeed;
uniform float uEnergyTurbulence;
uniform float uEnergyNoiseType;  // 0=simplex, 1=voronoi
uniform float uEnergyFractalLayers;
uniform float uEnergyDirection;  // 0=up, 1=spiral
uniform float uEnergyPulseEnabled;
uniform float uEnergyPulseSpeed;
uniform float uEnergyPulseIntensity;

// 区域参数
uniform float uStartAngle;
uniform float uAngleSpan;
uniform float uSideLength;
uniform float uSideAngle;
uniform float uSideLineType;
uniform float uCurveBend;
uniform float uCurveStrength;

varying vec2 vUv;

// 噪声函数
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// 分形噪声 2D
float fbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  
  for (int i = 0; i < 5; i++) {
    value += amplitude * noise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// ===== 3D 噪声函数（用于能量罩模式）=====
vec4 permute(vec4 x) { return mod(((x*34.0)+1.0)*x, 289.0); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise3D(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod(i, 289.0);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 1.0/7.0;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

// Voronoi 3D
float voronoi3D(vec3 p) {
  vec3 i = floor(p);
  vec3 f = fract(p);
  float minDist = 1.0;
  for (int x = -1; x <= 1; x++) {
    for (int y = -1; y <= 1; y++) {
      for (int z = -1; z <= 1; z++) {
        vec3 neighbor = vec3(float(x), float(y), float(z));
        vec3 point = vec3(
          fract(sin(dot(i + neighbor, vec3(127.1, 311.7, 74.7))) * 43758.5453),
          fract(sin(dot(i + neighbor, vec3(269.5, 183.3, 246.1))) * 43758.5453),
          fract(sin(dot(i + neighbor, vec3(419.2, 371.9, 168.2))) * 43758.5453)
        );
        vec3 diff = neighbor + point - f;
        float dist = length(diff);
        minDist = min(minDist, dist);
      }
    }
  }
  return minDist;
}

// 3D FBM
float fbm3D(vec3 p, int layers) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  float totalAmplitude = 0.0;
  
  for (int i = 0; i < 5; i++) {
    if (i >= layers) break;
    float n;
    if (uEnergyNoiseType < 0.5) {
      n = snoise3D(p * frequency);
    } else {
      n = 1.0 - voronoi3D(p * frequency) * 2.0;
    }
    value += n * amplitude;
    totalAmplitude += amplitude;
    amplitude *= 0.5;
    frequency *= 2.0;
  }
  return value / totalAmplitude;
}

void main() {
  vec2 centered = vUv - 0.5;
  float dist = length(centered) * 2.0;
  float pixelAngle = atan(centered.y, centered.x);
  
  // 内外边缘半径
  float innerRadius = uCoreRadius / (uPlaneSize * 0.5);
  float outerRadius = innerRadius * uSideLength;
  outerRadius = min(outerRadius, 0.98);
  
  // 相对距离 (0 = 内边缘, 1 = 外边缘)
  float relDist = (dist - innerRadius) / max(outerRadius - innerRadius, 0.001);
  relDist = clamp(relDist, 0.0, 1.0);
  
  // 距离遮罩
  float distMask = smoothstep(innerRadius * 0.9, innerRadius * 1.1, dist)
                 * (1.0 - smoothstep(outerRadius * 0.85, outerRadius, dist));
  
  // 角度边界计算
  // 发散角度：线性扩张，随距离增加角度跨度（直线边界）
  float angleOffset = relDist * uSideAngle;
  
  // 曲线弯曲：仅在曲线模式下生效，让边界在中间弯曲
  float curveOffset = 0.0;
  if (uSideLineType > 0.5) {
    // 抛物线因子：在中间最大，两端为0
    float curveFactor = relDist * (1.0 - relDist) * 4.0;
    curveOffset = curveFactor * uCurveBend * uCurveStrength * 0.5;
  }
  
  // 发散角度和曲线弯曲是独立的效果
  float effectiveStartAngle = uStartAngle - angleOffset - curveOffset;
  float effectiveEndAngle = uStartAngle + uAngleSpan + angleOffset + curveOffset;
  float effectiveSpan = effectiveEndAngle - effectiveStartAngle;
  
  // 角度遮罩
  float normAngle = pixelAngle < 0.0 ? pixelAngle + 6.28318 : pixelAngle;
  float normStart = mod(effectiveStartAngle, 6.28318);
  float angleFromStart = normAngle - normStart;
  if (angleFromStart < 0.0) angleFromStart += 6.28318;
  
  float angleMask = 0.0;
  if (angleFromStart <= effectiveSpan && effectiveSpan > 0.0) {
    float feather = 0.15;
    float sideMask1 = smoothstep(0.0, feather, angleFromStart);
    float sideMask2 = smoothstep(0.0, feather, effectiveSpan - angleFromStart);
    angleMask = sideMask1 * sideMask2;
  }
  
  float mask = distMask * angleMask;
  if (mask < 0.01) discard;
  
  float pattern = 0.0;
  float sparkle = 0.0;
  
  // ===== 纹理模式分支 =====
  if (uTextureMode < 0.5) {
    // ===== 流动纹理模式 =====
    // 将坐标转换为极坐标空间，并拉伸
    float stretchedDist = relDist * uStretchFactor;
    vec2 flowCoord = vec2(pixelAngle * 2.0, stretchedDist * 3.0);
    
    // 定向拉伸：压缩角度方向，拉伸径向
    vec2 stretchedFlowCoord = vec2(flowCoord.x / uDirectionalStretch, flowCoord.y);
    
    // 添加时间流动
    flowCoord.y -= uTime * uFlowSpeed;
    stretchedFlowCoord.y -= uTime * uFlowSpeed;
    
    // 多层噪声（原有效果）
    float n1 = fbm(flowCoord * uNoiseScale);
    float n2 = fbm(flowCoord * uNoiseScale * 2.0 + vec2(5.2, 1.3) - uTime * uFlowSpeed * 0.5);
    float n3 = fbm(flowCoord * uNoiseScale * 0.5 + vec2(2.8, 4.1) - uTime * uFlowSpeed * 1.5);
    
    // 组合噪声（原有效果）
    float basePattern = n1 * 0.5 + n2 * 0.3 + n3 * 0.2;
    
    // ===== 拉丝条纹效果（各向异性 + Ridge 抽取）=====
    float stripePattern = 0.0;
    if (uStripeIntensity > 0.01) {
      // 角域归一化 (0-1)
      float angleT = (pixelAngle - uStartAngle) / max(uAngleSpan, 0.01);
      angleT = mod(angleT, 1.0);
      
      // 流向坐标：径向大幅拉伸 + 角向频率
      vec2 flowUV = vec2(
        relDist * uDirectionalStretch,    // 径向拉伸（产生各向异性）
        angleT * uStripeCount             // 角向频率（控制条纹数量）
      );
      
      // 添加时间流动
      flowUV.x -= uTime * uFlowSpeed * 0.3;
      
      // Advected Noise：用低频噪声扭曲采样坐标
      float warpNoise1 = fbm(flowUV * 0.4 + uTime * uFlowSpeed * 0.2);
      float warpNoise2 = fbm(flowUV * 0.3 + vec2(5.2, 3.1) + uTime * uFlowSpeed * 0.15);
      vec2 warpOffset = vec2(warpNoise1, warpNoise2 * 0.5) * uDistortion * 2.0;
      
      // 各向异性噪声采样
      float n = fbm((flowUV + warpOffset) * uNoiseScale);
      
      // Ridge 函数：将噪声转为锐利脊线
      float sharpExp = uEdgeSharpness * 15.0 + 1.0;
      
      // 多相位 Ridge 叠加
      float ridge1 = pow(1.0 - abs(2.0 * fract(n * 1.0) - 1.0), sharpExp);
      float ridge2 = pow(1.0 - abs(2.0 * fract(n * 1.7 + 0.33) - 1.0), sharpExp * 0.8);
      float ridge3 = pow(1.0 - abs(2.0 * fract(n * 2.3 + 0.67) - 1.0), sharpExp * 0.6);
      
      stripePattern = ridge1 * 0.5 + ridge2 * 0.3 + ridge3 * 0.2;
      
      // 内弧增亮
      float innerBright = 1.0 + pow(1.0 - relDist, 2.0) * 0.6;
      
      // 外沿衰减
      float outerFade = 1.0 - smoothstep(0.6, 1.0, relDist);
      
      // 添加噪声明暗变化
      float variation = 0.6 + warpNoise1 * 0.4;
      
      stripePattern *= innerBright * outerFade * variation;
    }
    
    // 混合原有效果和条纹效果
    pattern = mix(basePattern, stripePattern, uStripeIntensity);
    
    // 拉长效果 - 沿径向拉伸纹理
    float stretch = 1.0 - relDist * 0.6;
    pattern *= stretch;
    
    // 亮度随距离衰减
    float brightness = 1.0 - relDist * 0.7;
    pattern *= brightness;
    
    // 亮点
    sparkle = pow(n2, 4.0) * 2.0;
    
  } else {
    // ===== 能量罩模式 =====
    // 球面映射：将 2D 平面坐标映射到球面
    float r = dist;  // 归一化距离
    float theta = pixelAngle;
    float phi = r * 3.14159;  // 从中心向外映射到球面纬度
    
    // 球面坐标
    vec3 spherePos = vec3(
      sin(phi) * cos(theta),
      sin(phi) * sin(theta),
      cos(phi)
    );
    
    // 火焰采样坐标
    vec3 flamePos = spherePos * uEnergyFlameScale;
    
    // 根据方向添加动画偏移
    float flowTime = uTime * uEnergyFlowSpeed;
    if (uEnergyDirection < 0.5) {
      // 向上流动
      flamePos.y -= flowTime;
    } else {
      // 螺旋上升
      float angle = flowTime * 2.0;
      float c = cos(angle);
      float s = sin(angle);
      flamePos.xz = mat2(c, -s, s, c) * flamePos.xz;
      flamePos.y -= flowTime * 0.5;
    }
    
    // 添加湍流扰动
    vec3 turbulenceOffset = vec3(
      snoise3D(flamePos * 2.0 + uTime * 0.3),
      snoise3D(flamePos * 2.0 + 100.0 + uTime * 0.3),
      snoise3D(flamePos * 2.0 + 200.0 + uTime * 0.3)
    ) * uEnergyTurbulence * 0.5;
    flamePos += turbulenceOffset;
    
    // 计算分形火焰噪声
    int layers = int(uEnergyFractalLayers);
    float flameNoise = fbm3D(flamePos, layers);
    
    // 转换为火焰形态 [0, 1]
    float flameMask = (flameNoise + 1.0) * 0.5;
    
    // 应用密度控制
    flameMask = pow(flameMask, 2.0 - uEnergyDensity * 1.5);
    
    // 脉冲效果
    if (uEnergyPulseEnabled > 0.5) {
      float pulse = sin(uTime * uEnergyPulseSpeed * 3.14159) * 0.5 + 0.5;
      flameMask *= 1.0 + pulse * uEnergyPulseIntensity;
    }
    
    pattern = flameMask;
    
    // 内弧增亮
    float innerBright = 1.0 + pow(1.0 - relDist, 2.0) * 0.5;
    
    // 外沿衰减
    float outerFade = 1.0 - smoothstep(0.7, 1.0, relDist);
    
    pattern *= innerBright * outerFade;
    
    // 亮点
    sparkle = pow(max(flameNoise, 0.0), 4.0) * 1.5;
  }
  
  // ===== 颜色渐变（共用）=====
  vec3 color;
  float colorPattern = pattern;
  
  // 高锐度时使用更陡的颜色映射（仅流动纹理模式）
  if (uTextureMode < 0.5 && uStripeIntensity > 0.01 && uEdgeSharpness > 0.3) {
    colorPattern = pow(pattern, mix(1.0, 0.5, uEdgeSharpness));
  }
  
  if (colorPattern < 0.33) {
    color = mix(uColor1, uColor2, colorPattern * 3.0);
  } else if (colorPattern < 0.66) {
    color = mix(uColor2, uColor3, (colorPattern - 0.33) * 3.0);
  } else {
    color = uColor3 + sparkle * vec3(1.0);
  }
  
  // 边缘发光（使用暗色和中间色的混合）
  float edgeGlow = pow(1.0 - relDist, 2.0) * 0.3;
  color += edgeGlow * mix(uColor1, uColor2, 0.5);
  
  // 最终颜色
  float alpha = mask * uOpacity * (0.3 + pattern * 0.7);
  
  gl_FragColor = vec4(color, alpha);
}
`;

// 残影粒子着色器
const afterimageParticleVertexShader = `
precision highp float;

attribute float aProgress;      // 粒子生命进度 0-1
attribute float aRandom;        // 随机值
attribute float aAngle;         // 基础发散角度（0-1，相对于区域角度跨度）

uniform float uTime;
uniform float uSpeed;
uniform float uSpeedRandomness;
uniform float uLifespan;
uniform float uSize;
uniform int uSizeDecay;         // 0=none, 1=linear, 2=exponential
uniform float uCoreRadius;      // 核心半径

// 区域参数
uniform float uStartAngle;
uniform float uAngleSpan;
uniform float uSideLength;
uniform float uSideAngle;       // 侧边发散角度（弧度）
uniform float uSideLineType;    // 0=直线, 1=曲线
uniform float uCurveBend;       // 曲线弯曲方向: -1=内弯, 1=外弯
uniform float uCurveStrength;   // 曲线强度 0-1

varying float vAlpha;
varying float vProgress;

void main() {
  // 计算生命阶段
  float speed = uSpeed * (1.0 + (aRandom - 0.5) * uSpeedRandomness * 2.0);
  float life = mod(aProgress + uTime * speed / uLifespan, 1.0);
  vProgress = life;
  
  // 粒子从核心边缘开始，向外发散
  float startDist = uCoreRadius;
  float maxDist = uCoreRadius * uSideLength;
  float dist = startDist + life * (maxDist - startDist);
  
  // aAngle (0-1) 表示粒子在区域角度跨度内的位置
  // posFromCenter: -1 (左边界) 到 +1 (右边界)，0 为中心
  float posFromCenter = (aAngle - 0.5) * 2.0;
  
  // 基础角度 = 区域中心角度 + 粒子在区域内的偏移
  float centerAngle = uStartAngle + uAngleSpan * 0.5;
  float baseOffset = posFromCenter * uAngleSpan * 0.5;
  
  // 发散角度效果：随距离增加，边缘粒子向外扩散
  float divergeOffset = posFromCenter * life * uSideAngle;
  
  // 曲线弯曲效果：在中间距离最弯
  float curveOffset = 0.0;
  if (uSideLineType > 0.5) {
    float curveFactor = life * (1.0 - life) * 4.0;
    curveOffset = posFromCenter * curveFactor * uCurveBend * uCurveStrength * 0.5;
  }
  
  // 最终角度
  float finalAngle = centerAngle + baseOffset + divergeOffset + curveOffset;
  
  // 计算世界坐标位置（在XY平面上）
  vec3 newPos = vec3(cos(finalAngle) * dist, sin(finalAngle) * dist, 0.0);
  
  // 透明度计算
  float fadeIn = smoothstep(0.0, 0.15, life);
  float fadeOut = 1.0 - smoothstep(0.6, 1.0, life);
  vAlpha = fadeIn * fadeOut;
  
  // 粒子大小
  float sizeFade = 1.0;
  if (uSizeDecay == 1) {
    sizeFade = 1.0 - life * 0.7;
  } else if (uSizeDecay == 2) {
    sizeFade = exp(-life * 2.0);
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
  gl_Position = projectionMatrix * mvPosition;
  gl_PointSize = uSize * sizeFade * (300.0 / -mvPosition.z);
}
`;

const afterimageParticleFragmentShader = `
precision highp float;

uniform vec3 uColor1;
uniform vec3 uColor2;
uniform int uColorMode;         // 0=single, 1=gradient

varying float vAlpha;
varying float vProgress;

void main() {
  vec2 center = gl_PointCoord - vec2(0.5);
  float dist = length(center);
  if (dist > 0.5) discard;
  
  float alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  
  vec3 color;
  if (uColorMode == 1) {
    color = mix(uColor1, uColor2, vProgress);
  } else {
    color = uColor1;
  }
  
  gl_FragColor = vec4(color, alpha * vAlpha);
}
`;

// ==================== 外壳光晕着色器 ====================
// 用于在球体外围创建真正的外扩光晕效果

const glowShellVertexShader = `
precision highp float;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;

void main() {
  vLocalPosition = position;
  vNormal = normalize(normalMatrix * normal);
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  vViewPosition = -mvPosition.xyz;
  gl_Position = projectionMatrix * mvPosition;
}
`;

const glowShellFragmentShader = `
precision highp float;

// 光晕颜色系统（支持渐变）
uniform float uGlowColorMode;
uniform vec3 uGlowBaseColor;
uniform vec3 uGlowColor1;
uniform vec3 uGlowColor2;
uniform vec3 uGlowColor3;
uniform float uGlowColorMidPos;
uniform float uGlowColorMidWidth;
uniform float uGlowColorMidWidth2;
uniform float uGlowGradientDir;
uniform vec3 uGlowCustomDir;
uniform float uGlowSpiralDensity;
uniform float uGlowProceduralInt;
uniform float uRadius;

uniform float uGlowStrength;
uniform float uGlowFalloff;
uniform float uGlowInward;

varying vec3 vNormal;
varying vec3 vViewPosition;
varying vec3 vLocalPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);
  
  // 计算渐变参数
  vec3 normLocal = vLocalPosition / uRadius;
  float radialT = length(normLocal);
  float theta = atan(normLocal.z, normLocal.x);
  float angularT = (theta + 3.14159) / (2.0 * 3.14159);
  
  float gradientT = radialT;
  if (uGlowGradientDir < 0.5) { gradientT = radialT; }
  else if (uGlowGradientDir < 1.5) { gradientT = (normLocal.x + 1.0) * 0.5; }
  else if (uGlowGradientDir < 2.5) { gradientT = (normLocal.y + 1.0) * 0.5; }
  else if (uGlowGradientDir < 3.5) { gradientT = (normLocal.z + 1.0) * 0.5; }
  else if (uGlowGradientDir < 4.5) { gradientT = (dot(normLocal, normalize(uGlowCustomDir)) + 1.0) * 0.5; }
  else { gradientT = fract(angularT * uGlowSpiralDensity + radialT * 2.0); }
  gradientT = clamp(gradientT, 0.0, 1.0);
  
  // 计算光晕颜色
  vec3 glowColor = uGlowBaseColor;
  if (uGlowColorMode > 0.5 && uGlowColorMode < 1.5) {
    glowColor = mix(uGlowColor1, uGlowColor2, gradientT);
  } else if (uGlowColorMode > 1.5 && uGlowColorMode < 2.5) { // 三色渐变
    float blendWeight = min(uGlowColorMidWidth, 1.0);
    float rangeExpand = max(uGlowColorMidWidth - 1.0, 0.0) * 0.2;
    float bandHalf = uGlowColorMidWidth2 * 0.5;
    float midStart = max(0.01, uGlowColorMidPos - rangeExpand - bandHalf);
    float midEnd = min(0.99, uGlowColorMidPos + rangeExpand + bandHalf);
    
    vec3 threeColorGlow;
    if (gradientT < midStart) {
      threeColorGlow = mix(uGlowColor1, uGlowColor2, gradientT / midStart);
    } else if (gradientT > midEnd) {
      threeColorGlow = mix(uGlowColor2, uGlowColor3, (gradientT - midEnd) / (1.0 - midEnd));
    } else {
      threeColorGlow = uGlowColor2;
    }
    vec3 twoColorGlow = mix(uGlowColor1, uGlowColor3, gradientT);
    glowColor = mix(twoColorGlow, threeColorGlow, blendWeight);
  } else if (uGlowColorMode > 2.5) {
    float hueShift = gradientT * uGlowProceduralInt * 0.3;
    glowColor = uGlowBaseColor;
    glowColor.r = mix(glowColor.r, glowColor.g, hueShift);
    glowColor.g = mix(glowColor.g, glowColor.b, hueShift);
  }
  
  // 计算基础边缘因子
  float dotProduct = abs(dot(viewDir, normal));
  float edgeFactor = mix(1.0 - dotProduct, dotProduct, uGlowInward);
  float glow = pow(edgeFactor, uGlowFalloff);
  float alpha = glow * uGlowStrength;
  vec3 color = glowColor * (1.0 + glow * 0.5);
  
  gl_FragColor = vec4(color, alpha);
}
`;

// 连续环带着色器（自转在 JavaScript 中通过 rotateOnAxis 实现）
const ringVertexShader = `
varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vLocalPosition;

void main() {
  vUv = uv;
  vPosition = position;
  vLocalPosition = position;  // 本地坐标用于颜色计算
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const ringFragmentShader = `
uniform vec3 uColor;
uniform vec3 uGradientColor1;   // 起始色
uniform vec3 uGradientColor2;   // 结束色（双色）或中间色（三色）
uniform vec3 uGradientColor3;   // 结束色（三色）
uniform int uColorMode;         // 0=单色, 1=双色, 2=三色, 3=混色
uniform int uGradientDirection; // 0=radial, 1=linearX, 2=linearY, 3=linearZ, 4=linearCustom, 5=spiral
uniform vec3 uGradientCustomDir;
uniform float uColorMidPosition;
uniform float uColorMidWidth;   // 中间色宽度（新逻辑）
uniform float uColorMidWidth2;  // 纯色带宽度（旧逻辑）
uniform float uBlendStrength;   // 渐变过渡强度 0-1（0=硬边分层，1=平滑过渡）
uniform float uSpiralDensity;
uniform int uSpiralAxis;        // 0=x, 1=y, 2=z
uniform float uProceduralIntensity;
uniform float uOpacity;
uniform int uOpacityGradient;   // 0=none, 1=fadeIn, 2=fadeOut, 3=fadeBoth
uniform float uOpacityGradientStrength;
uniform float uTime;
uniform float uRingRadius;      // 环带平均半径，用于归一化

// 漩涡效果 uniforms
uniform int uVortexEnabled;
uniform int uVortexArmCount;
uniform float uVortexTwist;
uniform float uVortexRotationSpeed;
uniform int uVortexRadialDir;   // 0=static, 1=inward, 2=outward
uniform float uVortexRadialSpeed;
uniform float uVortexHardness;
uniform vec3 uVortexColors[7];
uniform int uVortexColorCount;

// 显隐效果 uniforms
uniform int uVisibilityEnabled;
uniform vec2 uVisibilityZones[4];  // 最多4个显隐区域 [startAngle, endAngle]
uniform int uVisibilityZoneCount;
uniform float uVisibilityFadeAngle;
uniform int uVisibilityDynamic;
uniform float uVisibilityRotSpeed;

// 拉丝效果 uniforms
uniform int uStreakEnabled;
uniform float uStreakFlowSpeed;
uniform float uStreakStripeCount;
uniform float uStreakRadialStretch;
uniform float uStreakSharpness;
uniform float uStreakDistortion;
uniform float uStreakNoiseScale;
uniform float uStreakDirection;  // 1=cw, -1=ccw
uniform float uStreakBrightness;

varying vec2 vUv;
varying vec3 vPosition;
varying vec3 vLocalPosition;

#define PI 3.14159265359

// ===== 拉丝效果噪声函数 =====
float streakHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float streakNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = streakHash(i);
  float b = streakHash(i + vec2(1.0, 0.0));
  float c = streakHash(i + vec2(0.0, 1.0));
  float d = streakHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float streakFbm(vec2 p) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * streakNoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// 周期性噪声采样（使用圆周坐标实现无缝连接）
float streakPeriodicNoise(vec2 uv, float period) {
  // 将角向坐标转换为圆周上的点，实现周期性
  float angle = uv.y * 2.0 * PI / period;
  // 使用3D噪声，用圆周坐标替代角向坐标
  vec2 circlePos = vec2(cos(angle), sin(angle)) * period * 0.5;
  // 组合径向和圆周坐标
  vec3 samplePos = vec3(uv.x, circlePos);
  // 用2D噪声分层采样模拟3D效果
  float n1 = streakNoise(vec2(samplePos.x, samplePos.y));
  float n2 = streakNoise(vec2(samplePos.x + 100.0, samplePos.z));
  return mix(n1, n2, 0.5);
}

// 周期性 FBM
float streakPeriodicFbm(vec2 uv, float period) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 5; i++) {
    value += amplitude * streakPeriodicNoise(uv * frequency, period * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}

// 计算单层拉丝效果（参数化版本）
float calculateStreakLayer(vec2 uv, float time, float stripeCount, float radialStretch, float sharpness, float flowSpeedMult, float phase, float distortion, float noiseScale) {
  // 角向坐标：乘以条纹数量产生周期
  float angularT = uv.y * stripeCount;
  
  // 径向坐标：大幅拉伸产生各向异性
  float radialT = uv.x * radialStretch;
  
  // 流向 UV + 相位偏移
  vec2 streakUV = vec2(radialT, angularT + phase);
  
  // 添加时间流动（沿切线方向），不同层不同速度
  float timeOffset = time * uStreakFlowSpeed * uStreakDirection * flowSpeedMult;
  streakUV.y += timeOffset;
  
  // Advected Noise 扭曲（使用周期性噪声）
  float warp1 = streakPeriodicFbm(streakUV * 0.4 + vec2(time * 0.2 * flowSpeedMult, phase), stripeCount * 0.4);
  float warp2 = streakPeriodicFbm(streakUV * 0.3 + vec2(5.2 + phase, 3.1), stripeCount * 0.3);
  vec2 warpOffset = vec2(warp1, warp2 * 0.5) * distortion;
  
  // 采样噪声（使用周期性噪声）
  float n = streakPeriodicFbm((streakUV + warpOffset) * noiseScale, stripeCount * noiseScale);
  
  // Ridge 函数：将噪声转为锐利脊线
  float sharpExp = sharpness * 15.0 + 1.0;
  float ridge1 = pow(1.0 - abs(2.0 * fract(n) - 1.0), sharpExp);
  float ridge2 = pow(1.0 - abs(2.0 * fract(n * 1.7 + 0.33) - 1.0), sharpExp * 0.8);
  float ridge3 = pow(1.0 - abs(2.0 * fract(n * 2.3 + 0.67) - 1.0), sharpExp * 0.6);
  
  return ridge1 * 0.5 + ridge2 * 0.3 + ridge3 * 0.2;
}

// 计算多频叠加拉丝效果
vec4 calculateStreak(vec2 uv, float time) {
  float radialT = uv.x;  // 0=内边缘, 1=外边缘
  
  // ===== 三频叠加 =====
  // 低频层：大尺度明暗带（慢速）
  float lowFreq = calculateStreakLayer(
    uv, time,
    uStreakStripeCount * 0.4,      // 条纹数量减少
    uStreakRadialStretch * 0.5,    // 径向拉伸减少
    uStreakSharpness * 0.5,        // 更柔和
    0.5,                           // 慢速流动
    0.0,                           // 相位
    uStreakDistortion * 1.2,       // 扭曲稍强
    uStreakNoiseScale * 0.6        // 噪声缩放
  );
  
  // 中频层：主条纹带（正常速度）
  float midFreq = calculateStreakLayer(
    uv, time,
    uStreakStripeCount,            // 用户设置的条纹数量
    uStreakRadialStretch,          // 用户设置的径向拉伸
    uStreakSharpness,              // 用户设置的锐度
    1.0,                           // 正常速度
    0.33,                          // 相位错开
    uStreakDistortion,             // 用户设置的扭曲
    uStreakNoiseScale              // 用户设置的噪声缩放
  );
  
  // 高频层：细丝纹理（快速）
  float highFreq = calculateStreakLayer(
    uv, time,
    uStreakStripeCount * 2.5,      // 条纹数量增加
    uStreakRadialStretch * 1.5,    // 径向拉伸增加
    uStreakSharpness * 1.3,        // 更锐利
    1.5,                           // 快速流动
    0.67,                          // 相位错开
    uStreakDistortion * 0.8,       // 扭曲减弱
    uStreakNoiseScale * 1.5        // 噪声缩放增加
  );
  
  // ===== 多频混合 =====
  // 低频调制中频强度 + 高频叠加细节
  float streak = max(lowFreq * 0.5, midFreq) * 0.7 + highFreq * 0.3;
  
  // ===== 体积感增强 =====
  // 内边缘渐入（模拟光学深度）
  float innerFade = smoothstep(0.0, 0.25, radialT);
  
  // 外边缘淡出
  float outerFade = 1.0 - smoothstep(0.75, 1.0, radialT);
  
  // 外边缘发光
  float outerGlow = pow(radialT, 3.0) * 0.4;
  
  // 内边缘亮线
  float innerRim = exp(-radialT * 6.0) * 0.25;
  
  // 应用体积遮罩
  float volumeMask = innerFade * outerFade;
  streak *= volumeMask;
  
  // 添加边缘发光
  streak += outerGlow * (0.3 + midFreq * 0.4);
  streak += innerRim * (0.5 + lowFreq * 0.3);
  
  // 应用亮度
  streak *= uStreakBrightness;
  
  // 亮点效果（基于高频层）
  float sparkle = pow(highFreq, 3.0) * 1.2;
  
  // 返回强度和亮点
  return vec4(streak, sparkle, midFreq, 1.0);
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

// RGB to HSV
vec3 rgb2hsv(vec3 c) {
  vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
  vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
  vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));
  float d = q.x - min(q.w, q.y);
  float e = 1.0e-10;
  return vec3(abs(q.z + (q.w - q.y) / (6.0 * d + e)), d / (q.x + e), q.x);
}

// 计算漩涡颜色
vec3 calculateVortexColor(float radialT, float angularT) {
  // 1. 构建螺旋角度
  float angle = angularT * 2.0 * PI;
  float spiralAngle = angle + radialT * uVortexTwist;
  
  // 2. 添加时间动画 - 旋转
  spiralAngle += uTime * uVortexRotationSpeed;
  
  // 3. 径向收缩/扩散动画
  float animatedRadialT = radialT;
  if (uVortexRadialDir == 1) {
    // 向内收缩
    animatedRadialT = fract(radialT + uTime * uVortexRadialSpeed);
  } else if (uVortexRadialDir == 2) {
    // 向外扩散
    animatedRadialT = fract(radialT - uTime * uVortexRadialSpeed);
  }
  
  // 4. 生成旋臂图案（0-1锯齿波）
  float armCount = float(uVortexArmCount);
  float pattern = spiralAngle * armCount / (2.0 * PI);
  pattern = fract(pattern);
  
  // 5. 应用硬边程度
  float smoothPattern;
  if (uVortexHardness > 0.99) {
    // 完全硬边
    smoothPattern = step(0.5, pattern);
  } else {
    // 柔和边缘
    float edge = 0.5 * (1.0 - uVortexHardness);
    smoothPattern = smoothstep(0.0, edge, pattern) * (1.0 - smoothstep(1.0 - edge, 1.0, pattern));
  }
  
  // 6. 颜色混合（多色循环）
  float colorCount = float(uVortexColorCount);
  float colorPos = pattern * colorCount;
  int colorIndex = int(floor(colorPos));
  float localT = fract(colorPos);
  
  // 平滑颜色过渡
  vec3 vortexColor;
  if (colorIndex >= uVortexColorCount - 1) {
    vortexColor = mix(uVortexColors[uVortexColorCount - 1], uVortexColors[0], localT);
  } else {
    // 手动索引（GLSL ES 不支持动态数组索引）
    vec3 c1, c2;
    if (colorIndex == 0) { c1 = uVortexColors[0]; c2 = uVortexColors[1]; }
    else if (colorIndex == 1) { c1 = uVortexColors[1]; c2 = uVortexColors[2]; }
    else if (colorIndex == 2) { c1 = uVortexColors[2]; c2 = uVortexColors[3]; }
    else if (colorIndex == 3) { c1 = uVortexColors[3]; c2 = uVortexColors[4]; }
    else if (colorIndex == 4) { c1 = uVortexColors[4]; c2 = uVortexColors[5]; }
    else { c1 = uVortexColors[5]; c2 = uVortexColors[6]; }
    vortexColor = mix(c1, c2, localT);
  }
  
  return vortexColor;
}

void main() {
  // vUv.x 是径向位置 (0=内边缘, 1=外边缘)
  // vUv.y 是环向位置 (0-1 一周)
  float radialT = vUv.x;
  float angularT = vUv.y;
  
  // 计算渐变参数 t（根据渐变方向）
  float gradientT = radialT; // 默认径向
  
  if (uGradientDirection == 0) {
    // 径向：从内到外
    gradientT = radialT;
  } else if (uGradientDirection == 1) {
    // X轴线性（在环平面内）
    gradientT = (vLocalPosition.x / uRingRadius + 1.0) * 0.5;
  } else if (uGradientDirection == 2) {
    // Y轴线性（在环平面内）
    gradientT = (vLocalPosition.y / uRingRadius + 1.0) * 0.5;
  } else if (uGradientDirection == 3) {
    // Z轴线性
    gradientT = (vLocalPosition.z / uRingRadius + 1.0) * 0.5;
  } else if (uGradientDirection == 4) {
    // 自定义方向
    vec3 normDir = normalize(uGradientCustomDir);
    gradientT = (dot(vLocalPosition, normDir) / uRingRadius + 1.0) * 0.5;
  } else if (uGradientDirection == 5) {
    // 螺旋：沿环向
    gradientT = fract(angularT * uSpiralDensity);
  }
  
  gradientT = clamp(gradientT, 0.0, 1.0);
  
  // 计算基础颜色
  vec3 color = uColor;
  
  // 渐变过渡强度处理：将 gradientT 进行非线性映射
  // blendStrength = 0 时，过渡非常陡峭（分层明显）
  // blendStrength = 1 时，保持线性平滑过渡
  float blendedT = gradientT;
  if (uBlendStrength < 0.99 && (uColorMode == 1 || uColorMode == 2)) {
    // 使用 smoothstep 的边缘宽度来控制过渡锐利度
    float edgeWidth = max(uBlendStrength * 0.5, 0.001);
    // 对于双色：以 0.5 为分界点
    // 对于三色：需要两个过渡点
    if (uColorMode == 1) {
      blendedT = smoothstep(0.5 - edgeWidth, 0.5 + edgeWidth, gradientT);
    }
  }
  
  if (uColorMode == 1) {
    // 双色渐变
    color = mix(uGradientColor1, uGradientColor2, blendedT);
  } else if (uColorMode == 2) {
    // 三色渐变
    float blendWeight = min(uColorMidWidth, 1.0);
    float rangeExpand = max(uColorMidWidth - 1.0, 0.0) * 0.2;
    float bandHalf = uColorMidWidth2 * 0.5;
    float midStart = max(0.01, uColorMidPosition - rangeExpand - bandHalf);
    float midEnd = min(0.99, uColorMidPosition + rangeExpand + bandHalf);
    
    // 渐变过渡强度应用于三色渐变的两个过渡边界
    float edgeWidth = max(uBlendStrength * 0.3, 0.001);
    
    vec3 threeColorResult;
    if (gradientT < midStart) {
      float t = gradientT / midStart;
      // 在过渡区域应用锐化
      float sharpenedT = smoothstep(0.5 - edgeWidth, 0.5 + edgeWidth, t);
      sharpenedT = mix(sharpenedT, t, uBlendStrength); // 混合原始和锐化值
      threeColorResult = mix(uGradientColor1, uGradientColor2, sharpenedT);
    } else if (gradientT > midEnd) {
      float t = (gradientT - midEnd) / (1.0 - midEnd);
      float sharpenedT = smoothstep(0.5 - edgeWidth, 0.5 + edgeWidth, t);
      sharpenedT = mix(sharpenedT, t, uBlendStrength);
      threeColorResult = mix(uGradientColor2, uGradientColor3, sharpenedT);
    } else {
      threeColorResult = uGradientColor2;
    }
    vec3 twoColorResult = mix(uGradientColor1, uGradientColor3, gradientT);
    color = mix(twoColorResult, threeColorResult, blendWeight);
  } else if (uColorMode == 3) {
    // 混色模式：基于位置的色相偏移
    vec3 hsv = rgb2hsv(uColor);
    float hueOffset = gradientT * uProceduralIntensity * 0.3;
    hsv.x = fract(hsv.x + hueOffset);
    color = hsv2rgb(hsv);
  }
  
  // 漩涡效果叠加
  if (uVortexEnabled == 1) {
    vec3 vortexColor = calculateVortexColor(radialT, angularT);
    color = vortexColor; // 漩涡颜色完全覆盖基础颜色
  }
  
  // 拉丝效果叠加（与漩涡互斥，拉丝优先）
  if (uStreakEnabled == 1) {
    vec4 streakData = calculateStreak(vUv, uTime);
    float streakIntensity = streakData.x;
    float sparkle = streakData.y;
    
    // 根据强度混合颜色（暗部用Color1，亮部用Color2/Color3）
    vec3 streakColor;
    if (streakIntensity < 0.33) {
      streakColor = mix(uGradientColor1, uGradientColor2, streakIntensity * 3.0);
    } else if (streakIntensity < 0.66) {
      streakColor = mix(uGradientColor2, uGradientColor3, (streakIntensity - 0.33) * 3.0);
    } else {
      streakColor = uGradientColor3 + sparkle * vec3(1.0);
    }
    
    // 拉丝效果完全覆盖基础颜色
    color = streakColor * streakIntensity;
  }
  
  float alpha = uOpacity;
  
  // 透明度渐变 - 基于径向位置
  float opacityFactor = 1.0;
  if (uOpacityGradient == 1) { // fadeIn: 从内到外渐入（内侧透明）
    opacityFactor = pow(radialT, 0.3 + 0.7 * uOpacityGradientStrength);
  } else if (uOpacityGradient == 2) { // fadeOut: 从内到外渐出（外侧透明）
    opacityFactor = pow(1.0 - radialT, 0.3 + 0.7 * uOpacityGradientStrength);
  } else if (uOpacityGradient == 3) { // fadeBoth: 两端渐变（中间不透明）
    float edge = 0.5 * uOpacityGradientStrength;
    if (radialT < edge) {
      opacityFactor = radialT / edge;
    } else if (radialT > 1.0 - edge) {
      opacityFactor = (1.0 - radialT) / edge;
    }
  }
  alpha *= opacityFactor;
  
  // 添加一些纹理变化
  float noise = fract(sin(dot(vUv, vec2(12.9898, 78.233))) * 43758.5453);
  alpha *= 0.9 + 0.1 * noise;
  
  // 显隐效果
  if (uVisibilityEnabled == 1) {
    // 计算当前片元的角度（0-360度）
    float currentAngle = angularT * 360.0;
    
    // 动态旋转偏移
    if (uVisibilityDynamic == 1) {
      currentAngle = mod(currentAngle - uTime * uVisibilityRotSpeed * 60.0, 360.0);
    }
    
    // 检查是否在任一可见区域内
    float visibilityAlpha = 0.0;
    for (int i = 0; i < 4; i++) {
      if (i >= uVisibilityZoneCount) break;
      
      float startAngle = uVisibilityZones[i].x;
      float endAngle = uVisibilityZones[i].y;
      float fadeAngle = uVisibilityFadeAngle;
      
      // 处理跨越0度的情况
      float inZone = 0.0;
      if (startAngle <= endAngle) {
        // 正常情况
        if (currentAngle >= startAngle && currentAngle <= endAngle) {
          // 计算到边界的距离
          float distToStart = currentAngle - startAngle;
          float distToEnd = endAngle - currentAngle;
          float minDist = min(distToStart, distToEnd);
          inZone = smoothstep(0.0, fadeAngle, minDist);
        }
      } else {
        // 跨越0度的情况（如 startAngle=300, endAngle=60）
        if (currentAngle >= startAngle || currentAngle <= endAngle) {
          float distToStart = currentAngle >= startAngle ? currentAngle - startAngle : currentAngle + 360.0 - startAngle;
          float distToEnd = currentAngle <= endAngle ? endAngle - currentAngle : endAngle + 360.0 - currentAngle;
          float minDist = min(distToStart, distToEnd);
          inZone = smoothstep(0.0, fadeAngle, minDist);
        }
      }
      visibilityAlpha = max(visibilityAlpha, inZone);
    }
    alpha *= visibilityAlpha;
  }
  
  gl_FragColor = vec4(color, alpha);
}
`;

// 流萤拖尾着色器
const trailVertexShader = `
attribute float aAlpha;
attribute float aWidth;

varying float vAlpha;

void main() {
  vAlpha = aAlpha;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  gl_PointSize = aWidth * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const trailFragmentShader = `
uniform vec3 uColor;

varying float vAlpha;

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  if (dist > 0.5) discard;
  
  float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
  gl_FragColor = vec4(uColor, alpha);
}
`;

// ==================== 背景全景图着色器 ====================

const backgroundVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const backgroundFragmentShader = `
uniform sampler2D uTexture;
uniform float uBrightness;
uniform float uSaturation;

varying vec2 vUv;

// RGB 转 HSL
vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  
  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }
  
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;
  
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;
  
  return vec3(h, s, l);
}

// HSL 转 RGB
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  
  if (s == 0.0) {
    return vec3(l);
  }
  
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

void main() {
  vec4 texColor = texture2D(uTexture, vUv);
  
  // 应用饱和度调整
  vec3 hsl = rgb2hsl(texColor.rgb);
  hsl.y = clamp(hsl.y * uSaturation, 0.0, 1.0);
  vec3 adjustedColor = hsl2rgb(hsl);
  
  // 应用亮度
  vec3 finalColor = adjustedColor * uBrightness;
  
  gl_FragColor = vec4(finalColor, 1.0);
}
`;

// ==================== 法阵系统 ====================

const magicCircleVertexShader = `
varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const magicCircleFragmentShader = `
uniform sampler2D uTexture;
uniform float uOpacity;
uniform float uHueShift;      // 色相偏移 0-360
uniform float uSaturationBoost; // 饱和度增强
uniform float uBrightness;    // 亮度
uniform float uPulse;         // 脉冲值 0-1
uniform float uHasTexture;    // 是否有贴图

// 渐变色参数
uniform int uColorMode;       // 0=单色, 1=双色, 2=三色, 3=混色
uniform float uBaseHue;       // 基础色相（单色模式）
uniform float uBaseSaturation;// 基础饱和度（单色模式）
uniform vec3 uColor1;         // 颜色1
uniform vec3 uColor2;         // 颜色2
uniform vec3 uColor3;         // 颜色3（三色渐变用）
uniform float uColorMidPos;   // 中间色位置（三色渐变用）
uniform float uColorMidWidth; // 中间色宽度（新逻辑：显著程度+范围扩展）
uniform float uColorMidWidth2;// 中间色宽度2（旧逻辑：纯色带宽度）
uniform int uGradientDir;     // 渐变方向: 0=径向, 1=X轴, 2=Y轴, 3=螺旋
uniform float uSpiralDensity; // 螺旋密度
uniform float uProceduralIntensity; // 混色强度

varying vec2 vUv;

// RGB 转 HSL
vec3 rgb2hsl(vec3 c) {
  float maxC = max(c.r, max(c.g, c.b));
  float minC = min(c.r, min(c.g, c.b));
  float l = (maxC + minC) / 2.0;
  
  if (maxC == minC) {
    return vec3(0.0, 0.0, l);
  }
  
  float d = maxC - minC;
  float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);
  float h;
  
  if (maxC == c.r) {
    h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
  } else if (maxC == c.g) {
    h = (c.b - c.r) / d + 2.0;
  } else {
    h = (c.r - c.g) / d + 4.0;
  }
  h /= 6.0;
  
  return vec3(h, s, l);
}

// HSL 转 RGB
float hue2rgb(float p, float q, float t) {
  if (t < 0.0) t += 1.0;
  if (t > 1.0) t -= 1.0;
  if (t < 1.0/6.0) return p + (q - p) * 6.0 * t;
  if (t < 1.0/2.0) return q;
  if (t < 2.0/3.0) return p + (q - p) * (2.0/3.0 - t) * 6.0;
  return p;
}

vec3 hsl2rgb(vec3 hsl) {
  float h = hsl.x;
  float s = hsl.y;
  float l = hsl.z;
  
  if (s == 0.0) {
    return vec3(l);
  }
  
  float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
  float p = 2.0 * l - q;
  
  return vec3(
    hue2rgb(p, q, h + 1.0/3.0),
    hue2rgb(p, q, h),
    hue2rgb(p, q, h - 1.0/3.0)
  );
}

// 计算渐变因子
float getGradientFactor() {
  vec2 centered = vUv - 0.5;
  
  if (uGradientDir == 0) {
    // 径向：从中心到边缘
    return length(centered) * 2.0;
  } else if (uGradientDir == 1) {
    // X轴线性
    return vUv.x;
  } else if (uGradientDir == 2) {
    // Y轴线性
    return vUv.y;
  } else if (uGradientDir == 3) {
    // 螺旋
    float angle = atan(centered.y, centered.x);
    float dist = length(centered);
    return fract((angle / 6.28318 + dist * uSpiralDensity) * 0.5 + 0.5);
  }
  return 0.0;
}

// 计算渐变颜色
vec3 getGradientColor(float t) {
  if (uColorMode == 1) {
    // 双色渐变
    return mix(uColor1, uColor2, t);
  } else if (uColorMode == 2) {
    // 三色渐变：同时支持两种宽度逻辑
    // midWidth: 新逻辑（0-1控制显著程度，>1扩展范围）
    // midWidth2: 旧逻辑（纯色带宽度）
    float blendWeight = min(uColorMidWidth, 1.0);
    float rangeExpand = max(uColorMidWidth - 1.0, 0.0) * 0.2;
    
    // 计算中间色范围（结合两种宽度）
    float bandHalf = uColorMidWidth2 * 0.5;
    float midStart = max(0.01, uColorMidPos - rangeExpand - bandHalf);
    float midEnd = min(0.99, uColorMidPos + rangeExpand + bandHalf);
    
    vec3 threeColorResult;
    if (t < midStart) {
      threeColorResult = mix(uColor1, uColor2, t / midStart);
    } else if (t > midEnd) {
      threeColorResult = mix(uColor2, uColor3, (t - midEnd) / (1.0 - midEnd));
    } else {
      threeColorResult = uColor2;
    }
    vec3 twoColorResult = mix(uColor1, uColor3, t);
    return mix(twoColorResult, threeColorResult, blendWeight);
  } else if (uColorMode == 3) {
    // 混色（程序化）
    vec2 centered = vUv - 0.5;
    float noise = sin(centered.x * 10.0 * uProceduralIntensity) * cos(centered.y * 10.0 * uProceduralIntensity);
    return mix(uColor1, uColor2, (noise + 1.0) * 0.5);
  }
  return vec3(1.0);
}

void main() {
  // 如果没有贴图，直接丢弃
  if (uHasTexture < 0.5) {
    discard;
  }
  
  vec4 texColor = texture2D(uTexture, vUv);
  
  // 计算亮度作为透明度基础（黑色背景自动透明）
  float brightness = max(texColor.r, max(texColor.g, texColor.b));
  
  // 获取贴图的 HSL
  vec3 hsl = rgb2hsl(texColor.rgb);
  vec3 shiftedColor;
  
  if (uColorMode == 0) {
    // 染色禁用：应用色相偏移，保留贴图亮度
    hsl.x = fract(hsl.x + uHueShift / 360.0);
    shiftedColor = hsl2rgb(hsl);
  } else if (uColorMode == 4) {
    // 单色染色模式：使用 baseHue/baseSaturation，保留贴图亮度
    vec3 singleHsl = vec3(uBaseHue / 360.0, uBaseSaturation, hsl.z);
    shiftedColor = hsl2rgb(singleHsl);
  } else {
    // 渐变染色模式（双色/三色/混色）：应用渐变色
    float gradientT = getGradientFactor();
    vec3 gradientColor = getGradientColor(clamp(gradientT, 0.0, 1.0));
    shiftedColor = texColor.rgb * gradientColor;
  }
  
  // 应用饱和度增强
  vec3 boostedColor = shiftedColor;
  if (uSaturationBoost != 1.0) {
    vec3 boostedHsl = rgb2hsl(shiftedColor);
    boostedHsl.y = clamp(boostedHsl.y * uSaturationBoost, 0.0, 1.0);
    boostedColor = hsl2rgb(boostedHsl);
  }
  
  // 应用亮度和脉冲
  float pulseMultiplier = 1.0 + uPulse * 0.5;
  vec3 finalColor = boostedColor * uBrightness * pulseMultiplier;
  
  // 计算最终透明度
  float alpha = brightness * uOpacity;
  
  // 丢弃几乎透明的像素
  if (alpha < 0.01) discard;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ==================== 能量体系统 ====================

// 能量体边缘着色器（使用 Line2 或基础线条）
const energyBodyEdgeVertexShader = `
uniform float uTime;
uniform float uRotationSpeed;
uniform vec3 uRotationAxis;
uniform float uBreathing;
uniform float uBreathingSpeed;
uniform float uNoiseAmplitude;
uniform float uNoiseFrequency;
uniform float uNoiseSpeed;
uniform float uSpherize;
uniform float uRadius;

attribute float edgeProgress;
attribute float edgeIndex;  // 边索引，用于多光包计算

varying float vEdgeProgress;
varying vec3 vWorldPos;
varying vec3 vOriginalDir;  // 原始方向（解耦噪声）
varying float vEdgeIndex;

// 旋转矩阵
mat3 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

// 简化噪声
float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}

void main() {
  // 保存原始单位方向（用于解耦噪声）
  vOriginalDir = normalize(position);
  vEdgeIndex = edgeIndex;
  
  // 呼吸效果
  float breathScale = 1.0 + sin(uTime * uBreathingSpeed) * uBreathing;
  
  // 噪声扰动
  vec3 noiseOffset = vec3(0.0);
  if (uNoiseAmplitude > 0.0) {
    float n = hash(position + uTime * uNoiseSpeed) * 2.0 - 1.0;
    noiseOffset = normalize(position) * n * uNoiseAmplitude * uRadius;
  }
  
  // 应用变换
  vec3 pos = position + noiseOffset;
  
  // 球化处理
  if (uSpherize > 0.0) {
    vec3 spherePos = normalize(pos) * uRadius;
    pos = mix(pos, spherePos, uSpherize);
  }
  
  pos *= breathScale;
  
  // 旋转
  float angle = uTime * uRotationSpeed;
  mat3 rotMat = rotationMatrix(uRotationAxis, angle);
  pos = rotMat * pos;
  
  vEdgeProgress = edgeProgress;
  vWorldPos = pos;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const energyBodyEdgeFragmentShader = `
uniform vec3 uEdgeColor;
uniform vec3 uGradientEndColor;
uniform float uGradientEnabled;
uniform float uGlowIntensity;
uniform float uGlobalOpacity;
uniform float uTime;
uniform float uBlendMode;    // 0=additive, 1=normal

// 虚线
uniform float uDashEnabled;
uniform float uDashRatio;
uniform float uDashDensity;
uniform float uDashPhase;

// 光流 - 多包支持
uniform float uLightFlowEnabled;
uniform vec3 uLightFlowColor;
uniform float uLightFlowLength;
uniform float uLightFlowIntensity;
uniform float uLightFlowCount;       // 光包数量
uniform float uLightFlowPhaseMode;   // 0=sync, 1=spread
uniform float uLightFlowBasePhase;   // 基础相位
uniform float uLightFlowPulseEnabled;
uniform float uLightFlowPulseSpeed;
uniform float uUsePathSystem;        // 1=使用路径系统数据
uniform vec2 uLightPackets[10];      // 光包数据: x=edgeIndex, y=progress

// 边呼吸效果
uniform float uEdgeBreathEnabled;
uniform float uEdgeBreathSpeed;
uniform float uEdgeBreathGlowAmp;
uniform float uEdgeBreathAlphaAmp;
uniform float uEdgeBreathNoiseMix;
uniform float uEdgeBreathNoiseScale;
uniform float uEdgeBreathNoiseSpeed;
uniform float uEdgeBreathNoiseFollow; // 0=固定(使用原始坐标), 1=跟随呼吸

varying float vEdgeProgress;
varying vec3 vWorldPos;
varying vec3 vOriginalDir;  // 原始方向（解耦噪声）
varying float vEdgeIndex;

// Simplex 3D Noise (简化版)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0/6.0, 1.0/3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i  = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ *ns.x + ns.yyyy;
  vec4 y = y_ *ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0)*2.0 + 1.0;
  vec4 s1 = floor(b1)*2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
}

void main() {
  // 基础颜色（顶点到边中点渐变）
  float gradientT = abs(vEdgeProgress - 0.5) * 2.0; // 0=中点, 1=顶点
  vec3 baseColor = mix(uGradientEndColor, uEdgeColor, gradientT * uGradientEnabled + (1.0 - uGradientEnabled));
  
  // 边呼吸效果
  float breathingMod = 1.0;
  float alphaMod = 1.0;
  if (uEdgeBreathEnabled > 0.5) {
    // 基础呼吸（正弦波）
    float breathPhase = sin(uTime * uEdgeBreathSpeed) * 0.5 + 0.5;
    // 噪声采样坐标：使用原始方向或世界坐标
    vec3 noiseCoord = mix(vOriginalDir, vWorldPos, uEdgeBreathNoiseFollow);
    float noise = snoise(noiseCoord * uEdgeBreathNoiseScale + uTime * uEdgeBreathNoiseSpeed) * 0.5 + 0.5;
    // 混合呼吸和噪声
    float combined = mix(breathPhase, noise, uEdgeBreathNoiseMix);
    // 应用到发光和透明度（带钳制）
    breathingMod = clamp(1.0 + combined * uEdgeBreathGlowAmp, 0.5, 3.0);
    alphaMod = clamp(1.0 - combined * uEdgeBreathAlphaAmp, 0.2, 1.0);
  }
  
  // 虚线效果
  float dashAlpha = 1.0;
  if (uDashEnabled > 0.5) {
    float dashPos = fract(vEdgeProgress * uDashDensity + uDashPhase);
    dashAlpha = step(dashPos, uDashRatio);
    if (dashAlpha < 0.5) discard;
  }
  
  // 光流效果 - 支持多光包
  float flowGlow = 0.0;
  if (uLightFlowEnabled > 0.5) {
    int packetCount = int(uLightFlowCount);
    
    if (uUsePathSystem > 0.5) {
      // 路径系统模式：使用真实光包数据
      for (int i = 0; i < 10; i++) {
        if (i >= packetCount) break;
        
        vec2 packet = uLightPackets[i];
        float packetEdge = packet.x;
        float packetProgress = packet.y;
        
        // 检查光包是否在当前边上
        if (abs(packetEdge - vEdgeIndex) < 0.5) {
          float flowDist = abs(vEdgeProgress - packetProgress);
          flowDist = min(flowDist, 1.0 - flowDist);
          float packetGlow = smoothstep(uLightFlowLength, 0.0, flowDist);
          
          // 脉冲效果
          if (uLightFlowPulseEnabled > 0.5) {
            float pulse = 0.7 + 0.3 * sin(uTime * uLightFlowPulseSpeed + float(i) * 1.5);
            packetGlow *= pulse;
          }
          
          flowGlow += packetGlow;
        }
      }
    } else {
      // 传统模式：基于相位的简单动画
      for (int i = 0; i < 10; i++) {
        if (i >= packetCount) break;
        
        // 计算每个光包的相位
        float packetPhase;
        if (uLightFlowPhaseMode < 0.5) {
          // 同相模式：所有光包共享相位
          packetPhase = uLightFlowBasePhase;
        } else {
          // 错相模式：光包均匀分布
          packetPhase = uLightFlowBasePhase + float(i) / float(packetCount);
        }
        
        float flowDist = abs(vEdgeProgress - fract(packetPhase));
        flowDist = min(flowDist, 1.0 - flowDist);
        float packetGlow = smoothstep(uLightFlowLength, 0.0, flowDist);
        
        // 脉冲效果
        if (uLightFlowPulseEnabled > 0.5) {
          float pulse = 0.7 + 0.3 * sin(uTime * uLightFlowPulseSpeed + float(i) * 1.5);
          packetGlow *= pulse;
        }
        
        flowGlow += packetGlow;
      }
    }
    flowGlow *= uLightFlowIntensity;
  }
  
  // 最终颜色
  vec3 finalColor = baseColor * uGlowIntensity * breathingMod + uLightFlowColor * flowGlow;
  float alpha;
  
  // 混合模式感知
  if (uBlendMode < 0.5) {
    // Additive 模式：用 alphaMod 缩放颜色强度
    finalColor *= alphaMod;
    alpha = uGlobalOpacity;
  } else {
    // Normal 模式：用 alphaMod 缩放透明度
    alpha = uGlobalOpacity * alphaMod;
  }
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// 能量体顶点光点着色器
const energyBodyVertexPointShader = `
uniform float uTime;
uniform float uRotationSpeed;
uniform vec3 uRotationAxis;
uniform float uBreathing;
uniform float uBreathingSpeed;
uniform float uPointSize;
uniform float uSpherize;
uniform float uRadius;

// 停靠脉冲
uniform float uDwellEnabled;
uniform float uDwellThreshold;
uniform float uDwellPulseIntensity;
uniform float uDwellPulseSpeed;

attribute float vertexDegree;  // 顶点度数

varying float vDwellPulse;  // 传递停靠脉冲强度给片元

// 旋转矩阵
mat3 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
  // 呼吸效果
  float breathScale = 1.0 + sin(uTime * uBreathingSpeed) * uBreathing;
  
  vec3 pos = position;
  
  // 球化处理
  if (uSpherize > 0.0) {
    vec3 spherePos = normalize(pos) * uRadius;
    pos = mix(pos, spherePos, uSpherize);
  }
  
  pos *= breathScale;
  
  // 旋转
  float angle = uTime * uRotationSpeed;
  mat3 rotMat = rotationMatrix(uRotationAxis, angle);
  pos = rotMat * pos;
  
  // 计算停靠脉冲（高度数顶点闪烁）
  vDwellPulse = 0.0;
  if (uDwellEnabled > 0.5 && vertexDegree >= uDwellThreshold) {
    // 基于顶点度数的脉冲，度数越高脉冲越强
    float degreeBoost = (vertexDegree - uDwellThreshold + 1.0) * 0.3;
    float pulse = sin(uTime * uDwellPulseSpeed + vertexDegree * 0.7) * 0.5 + 0.5;
    vDwellPulse = pulse * uDwellPulseIntensity * degreeBoost;
  }
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  
  // 停靠顶点尺寸放大
  float sizeMultiplier = 1.0 + vDwellPulse * 0.5;
  gl_PointSize = uPointSize * sizeMultiplier * (300.0 / -mvPosition.z);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const energyBodyVertexPointFragmentShader = `
uniform vec3 uVertexColor;
uniform float uGlowIntensity;
uniform float uGlobalOpacity;
uniform int uVertexShape; // 0=circle, 1=diamond, 2=star

varying float vDwellPulse;  // 停靠脉冲强度

void main() {
  vec2 uv = gl_PointCoord - 0.5;
  float dist = length(uv);
  
  float alpha = 0.0;
  
  if (uVertexShape == 0) {
    // Circle
    alpha = 1.0 - smoothstep(0.3, 0.5, dist);
  } else if (uVertexShape == 1) {
    // Diamond
    float d = abs(uv.x) + abs(uv.y);
    alpha = 1.0 - smoothstep(0.3, 0.5, d);
  } else {
    // Star
    float angle = atan(uv.y, uv.x);
    float star = 0.3 + 0.2 * cos(angle * 4.0);
    alpha = 1.0 - smoothstep(star * 0.8, star, dist);
  }
  
  if (alpha < 0.01) discard;
  
  // 应用停靠脉冲到颜色和透明度
  float pulseBoost = 1.0 + vDwellPulse;
  vec3 finalColor = uVertexColor * uGlowIntensity * pulseBoost;
  float finalAlpha = alpha * uGlobalOpacity * min(pulseBoost, 1.5);
  
  gl_FragColor = vec4(finalColor, finalAlpha);
}
`;

// 能量体薄壳着色器
const energyBodyShellVertexShader = `
uniform float uTime;
uniform float uRotationSpeed;
uniform vec3 uRotationAxis;
uniform float uBreathing;
uniform float uBreathingSpeed;
uniform float uSpherize;
uniform float uRadius;

varying vec3 vNormal;
varying vec3 vViewPosition;

// 旋转矩阵
mat3 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
  float breathScale = 1.0 + sin(uTime * uBreathingSpeed) * uBreathing;
  
  vec3 pos = position;
  vec3 norm = normal;
  
  // 球化处理
  if (uSpherize > 0.0) {
    vec3 spherePos = normalize(pos) * uRadius;
    pos = mix(pos, spherePos, uSpherize);
    norm = mix(norm, normalize(pos), uSpherize);
  }
  
  pos *= breathScale;
  
  // 旋转
  float angle = uTime * uRotationSpeed;
  mat3 rotMat = rotationMatrix(uRotationAxis, angle);
  pos = rotMat * pos;
  norm = rotMat * norm;
  
  vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
  vViewPosition = -mvPosition.xyz;
  vNormal = normalMatrix * norm;
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const energyBodyShellFragmentShader = `
uniform vec3 uShellColor;
uniform float uOpacity;
uniform float uFresnelPower;
uniform float uFresnelIntensity;
uniform float uGlobalOpacity;

varying vec3 vNormal;
varying vec3 vViewPosition;

void main() {
  vec3 viewDir = normalize(vViewPosition);
  vec3 normal = normalize(vNormal);
  
  // 菲涅尔效果：边缘更亮
  float fresnel = pow(1.0 - abs(dot(normal, viewDir)), uFresnelPower);
  fresnel *= uFresnelIntensity;
  
  vec3 finalColor = uShellColor * (1.0 + fresnel);
  float alpha = uOpacity * (0.2 + fresnel * 0.8) * uGlobalOpacity;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ==================== 后期效果着色器 ====================

// 色差效果着色器
const ChromaticAberrationShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.01 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    varying vec2 vUv;
    
    void main() {
      vec2 center = vec2(0.5);
      vec2 dir = vUv - center;
      float dist = length(dir);
      
      // 色差偏移量随距离中心增加
      vec2 offset = dir * uIntensity * dist;
      
      float r = texture2D(tDiffuse, vUv + offset).r;
      float g = texture2D(tDiffuse, vUv).g;
      float b = texture2D(tDiffuse, vUv - offset).b;
      
      gl_FragColor = vec4(r, g, b, 1.0);
    }
  `
};

// 暗角效果着色器
const VignetteShader = {
  uniforms: {
    tDiffuse: { value: null },
    uIntensity: { value: 0.5 },
    uRadius: { value: 0.8 }
  },
  vertexShader: `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uIntensity;
    uniform float uRadius;
    varying vec2 vUv;
    
    void main() {
      vec4 color = texture2D(tDiffuse, vUv);
      
      vec2 center = vec2(0.5);
      float dist = distance(vUv, center);
      
      // 暗角渐变
      float vignette = smoothstep(uRadius, uRadius - 0.3, dist);
      vignette = mix(1.0 - uIntensity, 1.0, vignette);
      
      gl_FragColor = vec4(color.rgb * vignette, color.a);
    }
  `
};

// ==================== 球面 Voronoi 着色器 ====================

const sphericalVoronoiVertexShader = `
uniform float uTime;
uniform float uRotationSpeed;
uniform vec3 uRotationAxis;

varying vec3 vPosition;      // 单位方向向量（用于 Voronoi 计算）
varying vec3 vWorldPosition; // 世界坐标（用于菲涅尔）
varying vec3 vNormal;

// 旋转矩阵
mat3 rotationMatrix(vec3 axis, float angle) {
  axis = normalize(axis);
  float s = sin(angle);
  float c = cos(angle);
  float oc = 1.0 - c;
  return mat3(
    oc * axis.x * axis.x + c,           oc * axis.x * axis.y - axis.z * s,  oc * axis.z * axis.x + axis.y * s,
    oc * axis.x * axis.y + axis.z * s,  oc * axis.y * axis.y + c,           oc * axis.y * axis.z - axis.x * s,
    oc * axis.z * axis.x - axis.y * s,  oc * axis.y * axis.z + axis.x * s,  oc * axis.z * axis.z + c
  );
}

void main() {
  float angle = uTime * uRotationSpeed;
  mat3 rotMat = rotationMatrix(uRotationAxis, angle);
  
  vec3 pos = rotMat * position;
  vPosition = normalize(pos);    // 单位向量用于 Voronoi
  vWorldPosition = pos;          // 实际坐标用于菲涅尔
  vNormal = rotMat * normal;
  
  gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
}
`;

const sphericalVoronoiFragmentShader = `
#extension GL_OES_standard_derivatives : enable

uniform float uTime;
uniform vec3 uSeeds[64];
uniform int uSeedCount;
uniform vec3 uLineColor;
uniform float uLineWidth;      // 现在是像素单位
uniform float uLineGlow;
uniform float uFillOpacity;
uniform float uBaseHue;
uniform float uHueSpread;
uniform int uColorMode;     // 0=gradient, 1=random, 2=uniform
uniform float uCellPulse;
uniform float uCellPulseSpeed;
uniform float uGlobalOpacity;

varying vec3 vPosition;      // 单位方向向量
varying vec3 vWorldPosition; // 世界坐标
varying vec3 vNormal;

// 伪随机函数
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

// HSV 转 RGB
vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

void main() {
  vec3 pos = normalize(vPosition);
  
  float minDist = 999.0;
  float secondDist = 999.0;
  int nearestSeed = 0;
  
  // 找最近和次近的种子点（优化：使用点积代替 acos，更快）
  for (int i = 0; i < 64; i++) {
    if (i >= uSeedCount) break;
    // 使用 1 - dot 作为距离度量，避免 acos
    float d = 1.0 - dot(pos, uSeeds[i]);
    if (d < minDist) {
      secondDist = minDist;
      minDist = d;
      nearestSeed = i;
    } else if (d < secondDist) {
      secondDist = d;
    }
  }
  
  // 边界检测 - 使用屏幕空间导数实现恒定像素宽度
  float edgeDist = secondDist - minDist;
  
  // 计算屏幕空间导数
  float edgeDistDx = dFdx(edgeDist);
  float edgeDistDy = dFdy(edgeDist);
  float edgeDistGrad = sqrt(edgeDistDx * edgeDistDx + edgeDistDy * edgeDistDy);
  
  // 将边界距离转换为像素单位
  float edgeDistPixels = edgeDist / max(edgeDistGrad, 0.0001);
  
  // 使用像素单位的线宽
  float halfWidth = uLineWidth * 0.5;
  float edge = 1.0 - smoothstep(halfWidth - 0.5, halfWidth + 0.5, edgeDistPixels);
  
  // 单元颜色
  vec3 cellColor;
  float seedIndex = float(nearestSeed);
  if (uColorMode == 0) {
    // 渐变模式
    float hue = uBaseHue / 360.0 + seedIndex / float(uSeedCount) * uHueSpread;
    cellColor = hsv2rgb(vec3(fract(hue), 0.7, 0.9));
  } else if (uColorMode == 1) {
    // 随机模式
    float hue = hash(seedIndex * 12.9898);
    cellColor = hsv2rgb(vec3(hue, 0.6 + hash(seedIndex * 7.233) * 0.3, 0.8 + hash(seedIndex * 3.14) * 0.2));
  } else {
    // 统一模式
    cellColor = hsv2rgb(vec3(uBaseHue / 360.0, 0.7, 0.9));
  }
  
  // 单元脉冲
  if (uCellPulse > 0.0) {
    float pulse = sin(uTime * uCellPulseSpeed + seedIndex * 0.5) * 0.5 + 0.5;
    cellColor *= 1.0 + pulse * uCellPulse * 0.3;
  }
  
  // 菲涅尔效果增强边缘
  vec3 viewDir = normalize(cameraPosition - vWorldPosition);
  float fresnel = pow(1.0 - abs(dot(normalize(vNormal), viewDir)), 2.0);
  
  // 混合边界和填充
  vec3 lineColorFinal = uLineColor * (1.0 + fresnel * uLineGlow);
  vec3 finalColor = mix(cellColor * uFillOpacity, lineColorFinal, edge);
  float alpha = mix(uFillOpacity, 1.0, edge) * uGlobalOpacity;
  
  // 边界发光
  if (edge > 0.1) {
    finalColor += lineColorFinal * edge * uLineGlow * 0.5;
  }
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// ==================== 流萤系统 ====================

// 流萤头部着色器（Sprite 风格，始终面向相机）
// 画布放大 4 倍，为光晕和星芒提供足够的延伸空间
const CANVAS_SCALE = 4.0;

const fireflyHeadVertexShader = `
uniform float uSize;
uniform float uTime;
uniform float uPulse;
uniform float uPulseSpeed;
uniform float uVelocityStretch;  // 速度拉伸强度
uniform vec3 uVelocity;          // 速度向量（视图空间）

varying float vPulse;
varying vec2 vStretchDir;        // 拉伸方向

void main() {
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  float pulse = 1.0 + uPulse * 0.3 * sin(uTime * uPulseSpeed);
  vPulse = pulse;
  
  // 计算速度在屏幕空间的投影方向
  vec3 viewVel = mat3(modelViewMatrix) * uVelocity;
  float speed = length(viewVel.xy);
  vStretchDir = speed > 0.001 ? normalize(viewVel.xy) : vec2(0.0, 1.0);
  
  // 速度拉伸：根据速度增大点的尺寸
  float stretchFactor = 1.0 + uVelocityStretch * min(speed * 2.0, 1.5);
  
  // 画布放大 4 倍，为光晕和星芒留出空间
  float rawSize = uSize * pulse * stretchFactor * (300.0 / -mvPosition.z) * 4.0;
  // 限制最大尺寸，防止超过 GPU 点精灵限制（保守值 32，兼容移动端）
  gl_PointSize = min(rawSize, 32.0);
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fireflyHeadFragmentShader = `
uniform vec3 uColor;
uniform int uHeadStyle;           // 0=plain, 1=flare, 2=spark, 3=texture
uniform float uFlareIntensity;    // 星芒强度 0-2
uniform float uFlareSeed;         // 随机种子
uniform float uFlareLeaves;       // 星芒叶片数 4-8
uniform float uFlareWidth;        // 星芒宽度 0.1-1
uniform float uChromaticAberration; // 色散强度 0-1
uniform float uVelocityStretch;   // 速度拉伸强度
uniform float uNoiseAmount;       // 噪声扰动 0-1
uniform float uGlowIntensity;     // 头部光晕强度 0-2
uniform float uTime;
uniform sampler2D uTexture;       // 贴图
uniform float uUseTexture;        // 是否使用贴图 (0 或 1)

varying float vPulse;
varying vec2 vStretchDir;

// 画布缩放因子
const float CONTENT_SCALE = 4.0;
const float CANVAS_EDGE = 2.0;
const float PI = 3.14159265359;

// 2D 旋转
vec2 rotate2D(vec2 v, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return vec2(v.x * c - v.y * s, v.x * s + v.y * c);
}

// 简易噪声函数
float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

// N叶星芒（修正版：leaves 表示实际可见的芒数）
float nLeafFlare(vec2 uv, float leaves, float width, float intensity) {
  float flare = 0.0;
  // 每个角度产生2个对称的芒，所以只需要迭代 leaves/2 次
  float halfLeaves = leaves * 0.5;
  float angleStep = PI / halfLeaves;
  
  for (float i = 0.0; i < 4.0; i++) {
    if (i >= halfLeaves) break;
    float angle = i * angleStep;
    vec2 uvRot = rotate2D(uv, angle);
    // 宽度控制（width 越小越窄）
    float narrow = 10.0 / width;
    // 高斯衰减：y 方向窄（形成芒），x 方向宽（形成长度）
    float flareVal = exp(-uvRot.y * uvRot.y * narrow) * exp(-uvRot.x * uvRot.x * 0.12 / intensity);
    flare += flareVal;
  }
  return flare / halfLeaves;  // 归一化
}

// 色散星芒（RGB 分离）
vec3 chromaticFlare(vec2 uv, float leaves, float width, float intensity, float aberration) {
  // R 通道稍宽，B 通道稍窄
  float rFlare = nLeafFlare(uv * (1.0 - aberration * 0.1), leaves, width * 1.1, intensity);
  float gFlare = nLeafFlare(uv, leaves, width, intensity);
  float bFlare = nLeafFlare(uv * (1.0 + aberration * 0.1), leaves, width * 0.9, intensity);
  return vec3(rFlare, gFlare, bFlare);
}

void main() {
  // 画布放大了 4 倍
  vec2 uv = (gl_PointCoord - 0.5) * CONTENT_SCALE;
  
  // 速度拉伸变形：沿运动方向压缩
  if (uVelocityStretch > 0.01) {
    // 计算拉伸矩阵
    float stretchAmount = 1.0 + uVelocityStretch * 0.5;
    vec2 perpDir = vec2(-vStretchDir.y, vStretchDir.x);
    // 沿运动方向拉伸，垂直方向压缩
    float alongStretch = dot(uv, vStretchDir);
    float perpStretch = dot(uv, perpDir);
    uv = vStretchDir * alongStretch / stretchAmount + perpDir * perpStretch * stretchAmount;
  }
  
  float dist = length(uv);
  
  // 噪声扰动
  float noiseVal = 1.0;
  if (uNoiseAmount > 0.01) {
    noiseVal = 1.0 + (noise(uv * 3.0 + uTime * 0.5) - 0.5) * uNoiseAmount * 0.5;
  }
  
  float alpha = 0.0;
  vec3 finalColor = uColor;
  
  // ========== 样式 0: plain（普通圆点）==========
  if (uHeadStyle == 0) {
    float core = 1.0 - smoothstep(0.2, 0.6, dist);
    float brightCore = exp(-dist * dist * 25.0) * 1.2;
    core = max(core, brightCore) * noiseVal;
    
    // 光晕
    float glow = 0.0;
    if (uGlowIntensity > 0.01) {
      float glowEdge = 0.8 + uGlowIntensity * 0.4;
      glow = (1.0 - smoothstep(0.2, glowEdge, dist)) * uGlowIntensity * 0.5;
    }
    alpha = core + glow;
  }
  
  // ========== 样式 1: flare（N叶星芒）==========
  else if (uHeadStyle == 1) {
    // 核心
    float core = 1.0 - smoothstep(0.25, 0.7, dist);
    float brightCore = exp(-dist * dist * 30.0) * 1.5;
    core = max(core, brightCore) * noiseVal;
    
    // N叶星芒
    float rotAngle = uFlareSeed * PI * 0.25;
    vec2 uvRot = rotate2D(uv, rotAngle);
    
    vec3 flareColor;
    if (uChromaticAberration > 0.01) {
      // 色散星芒
      flareColor = chromaticFlare(uvRot, uFlareLeaves, uFlareWidth, uFlareIntensity, uChromaticAberration);
    } else {
      float flare = nLeafFlare(uvRot, uFlareLeaves, uFlareWidth, uFlareIntensity);
      flareColor = vec3(flare);
    }
    
    // 脉冲调制
    float pulseFlare = 0.8 + 0.2 * vPulse;
    flareColor *= uFlareIntensity * pulseFlare * noiseVal;
    
    // 软边
    float edgeFade = 1.0 - smoothstep(CANVAS_EDGE - 0.5, CANVAS_EDGE, dist);
    flareColor *= edgeFade;
    
    // 光晕
    float glow = 0.0;
    if (uGlowIntensity > 0.01) {
      float glowRadius = 0.8 + uGlowIntensity * 0.4;
      float glowEdge = min(glowRadius + 0.8, CANVAS_EDGE - 0.2);
      glow = (1.0 - smoothstep(0.3, glowEdge, dist)) * uGlowIntensity * 0.5;
    }
    
    // 色散时用 RGB 分量，否则用灰度
    float flareGray = (flareColor.r + flareColor.g + flareColor.b) / 3.0;
    alpha = core + glow + flareGray;
    
    // 色散颜色叠加
    if (uChromaticAberration > 0.01) {
      finalColor = uColor + (flareColor - vec3(flareGray)) * 2.0;
    } else {
      finalColor = uColor + vec3(0.2, 0.1, -0.1) * flareGray;
    }
  }
  
  // ========== 样式 2: spark（尖锐火花）==========
  else if (uHeadStyle == 2) {
    // 明亮的硬边核心
    float hardCore = 1.0 - smoothstep(0.08, 0.2, dist);
    float brightCenter = exp(-dist * dist * 40.0) * 2.0;
    hardCore = max(hardCore, brightCenter);
    
    // 尖锐的 4 芒（更细更长）
    float rotAngle = uFlareSeed * PI * 0.5;
    vec2 uvRot = rotate2D(uv, rotAngle);
    float sparkX = exp(-uvRot.y * uvRot.y * 80.0) * exp(-abs(uvRot.x) * 1.0);
    float sparkY = exp(-uvRot.x * uvRot.x * 80.0) * exp(-abs(uvRot.y) * 1.0);
    float spark = (sparkX + sparkY) * (uFlareIntensity + 0.5);
    
    // 随机闪烁效果
    float flicker = 0.6 + 0.4 * noise(vec2(uTime * 8.0, uFlareSeed * 10.0));
    
    // 软边
    float edgeFade = 1.0 - smoothstep(CANVAS_EDGE - 0.3, CANVAS_EDGE, dist);
    spark *= edgeFade * flicker;
    
    alpha = hardCore + spark * noiseVal;
    
    // 高亮颜色（电光感）
    finalColor = uColor * 1.3 + vec3(0.4, 0.25, 0.0) * spark;
  }
  
  // ========== 样式 3: texture（贴图）==========
  else if (uHeadStyle == 3) {
    // 检查是否有贴图
    if (uUseTexture > 0.5) {
      // 使用原始 gl_PointCoord，范围 [0, 1]
      vec2 texUV = gl_PointCoord;
      
      // 采样贴图
      vec4 texColor = texture2D(uTexture, texUV);
      
      // 计算亮度（支持纯黑背景和透明背景）
      float texBrightness = max(texColor.r, max(texColor.g, texColor.b));
      
      // 如果有 alpha 通道就使用，否则用亮度作为 alpha
      float texAlpha = texColor.a > 0.01 ? texColor.a : 1.0;
      alpha = texBrightness * texAlpha * noiseVal * 1.5;
      
      // 应用用户颜色（贴图作为亮度蒙版）
      finalColor = uColor * (0.5 + texBrightness * 0.8);
    } else {
      // 没有贴图时回退到普通圆点
      float core = 1.0 - smoothstep(0.2, 0.6, dist);
      float brightCore = exp(-dist * dist * 25.0) * 1.2;
      alpha = max(core, brightCore) * noiseVal;
    }
    
    // 可选：叠加光晕
    if (uGlowIntensity > 0.01) {
      float glow = exp(-dist * dist * 2.0) * uGlowIntensity * 0.3;
      alpha += glow;
    }
  }
  
  // ===== 安全网 =====
  // 贴图样式使用 gl_PointCoord 直接采样，不需要 dist 裁剪
  if (uHeadStyle != 3 && dist > CANVAS_EDGE && alpha < 0.01) discard;
  
  // HDR 余量
  float brightness = 1.0 + alpha * 0.8;
  
  alpha = clamp(alpha, 0.0, 1.0);
  gl_FragColor = vec4(finalColor * brightness, alpha);
}
`;

const fireflyTailVertexShader = `
attribute float aTaper;

uniform float uSize;
uniform float uBrightness;

varying float vTaper;

void main() {
  vTaper = aTaper;
  vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
  
  // 点大小随 taper 衰减
  gl_PointSize = uSize * uBrightness * aTaper * (300.0 / -mvPosition.z) * 4.0;
  gl_PointSize = min(gl_PointSize, 32.0);  // 应用硬件限制
  
  gl_Position = projectionMatrix * mvPosition;
}
`;

const fireflyTailFragmentShader = `
uniform vec3 uColor;
uniform float uOpacity;

varying float vTaper;

void main() {
  // 将 gl_PointCoord 转换为中心坐标
  vec2 uv = gl_PointCoord - 0.5;  // [-0.5, 0.5]
  float dist = length(uv) * 2.0;  // 转换到 [0, 1]
  
  // 柔和的圆形粒子，边缘完全透明
  float alpha = smoothstep(1.0, 0.3, dist);  // 边缘平滑透明
  alpha *= exp(-dist * dist * 1.5);  // 中心高斯增强
  alpha *= vTaper * uOpacity;
  
  // 轻微的中心光晕
  float glow = exp(-dist * dist * 3.0) * 0.4;
  
  vec3 finalColor = uColor * (1.0 + glow);
  
  // 严格裁剪边缘，避免正方形
  if (dist > 1.0) discard;
  
  gl_FragColor = vec4(finalColor, alpha);
}
`;

// 法阵运行时数据接口
interface MagicCircleRuntimeData {
  id: string;
  mesh: THREE.Mesh;
  settings: import('../types').MagicCircleSettings;
}

// 流萤运行时数据接口
interface FireflyRuntimeData {
  id: string;
  type: 'orbiting' | 'wandering';
  group: THREE.Group;
  headMesh: THREE.Points;
  tailMesh: THREE.Points | null;
  history: THREE.Vector3[];
  // 游走流萤专用
  direction?: THREE.Vector3;
  position?: THREE.Vector3;
}

// 能量体运行时数据接口
interface EnergyBodyRuntimeData {
  id: string;
  group: THREE.Group;
  edgesMesh: THREE.LineSegments | null;
  verticesMesh: THREE.Points | null;
  shellMesh: THREE.Mesh | null;
  voronoiMesh: THREE.Mesh | null;       // 球面 Voronoi 网格
  voronoiSeeds: THREE.Vector3[];        // Voronoi 种子点
  vertexDegrees: Float32Array;          // 每个顶点的度数（用于停靠脉冲）
  graph: Graph | null;                  // 边邻接图（用于路径系统）
  lightPackets: LightPacket[];          // 光包状态
  edgeLightData: Float32Array | null;   // 每条边的光包数据（传给着色器）
  settings: EnergyBodySettings;
}

// 生成流萤头部纹理（Canvas 绘制）
let fireflyTextureCache: THREE.Texture | null = null;
function getFireflyTexture(): THREE.Texture {
  if (fireflyTextureCache) return fireflyTextureCache;
  
  const size = 64;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  
  // 径向渐变
  const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
  gradient.addColorStop(0, 'rgba(255,255,255,1)');
  gradient.addColorStop(0.3, 'rgba(255,255,255,0.8)');
  gradient.addColorStop(1, 'rgba(255,255,255,0)');
  
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  
  fireflyTextureCache = new THREE.CanvasTexture(canvas);
  return fireflyTextureCache;
}

// ==================== 辅助函数 ====================

// 黄金比例常量
const PHI = (1 + Math.sqrt(5)) / 2;  // ≈ 1.618
const INV_PHI = 1 / PHI;              // ≈ 0.618
const PHI_SQ = PHI * PHI;             // ≈ 2.618

// ===== 截半立方体 (Cuboctahedron) - 12顶点 =====
// 标准坐标：(±1, ±1, 0), (±1, 0, ±1), (0, ±1, ±1) 的排列
const CUBOCTAHEDRON_VERTICES = [
  1, 1, 0,   1, -1, 0,   -1, 1, 0,   -1, -1, 0,
  1, 0, 1,   1, 0, -1,   -1, 0, 1,   -1, 0, -1,
  0, 1, 1,   0, 1, -1,   0, -1, 1,   0, -1, -1
];
const CUBOCTAHEDRON_INDICES = [
  // 8个三角形（原立方体的8个顶点对应）
  0, 4, 8,   0, 9, 5,   1, 5, 11,  1, 10, 4,
  2, 8, 6,   2, 7, 9,   3, 6, 10,  3, 11, 7,
  // 6个正方形（原立方体的6个面中心）- 拆成三角形
  0, 8, 2, 0, 2, 9,    1, 11, 3, 1, 3, 10,
  4, 10, 6, 4, 6, 8,   5, 9, 7, 5, 7, 11,
  0, 5, 1, 0, 1, 4,    2, 6, 3, 2, 3, 7
];

// ===== 截角四面体 (Truncated Tetrahedron) - 12顶点，4三角+4六边 =====
// 标准坐标：所有 (±3, ±1, ±1) 的偶排列（坐标乘积符号一致）
// 顶点布局：每个原四面体顶点处形成一个三角形
const TRUNCATED_TETRAHEDRON_VERTICES = [
  // 三角形0 (原顶点+++方向): 顶点 0,1,2
  3, 1, 1,    1, 3, 1,    1, 1, 3,
  // 三角形1 (原顶点+--方向): 顶点 3,4,5
  3, -1, -1,  1, -3, -1,  1, -1, -3,
  // 三角形2 (原顶点-+-方向): 顶点 6,7,8
  -3, 1, -1,  -1, 3, -1,  -1, 1, -3,
  // 三角形3 (原顶点--+方向): 顶点 9,10,11
  -3, -1, 1,  -1, -3, 1,  -1, -1, 3
];
// 索引：4三角 + 4六边(每个4三角) = 4 + 16 = 20三角 = 60索引
// 边长 = 2√2（同组内相邻或跨组相邻）
// 边连接关系：0-3, 1-7, 2-11, 3-0, 4-10, 5-8, 6-9, 7-1, 8-5, 9-6, 10-4, 11-2
const TRUNCATED_TETRAHEDRON_INDICES = [
  // 4个三角形（法线朝外，逆时针）
  0, 1, 2,     // 三角形0: 法线朝(+,+,+)
  3, 5, 4,     // 三角形1: 法线朝(+,-,-)，修正绕序
  6, 7, 8,     // 三角形2: 法线朝(-,+,-)
  9, 10, 11,   // 三角形3: 法线朝(-,-,+)
  // 4个六边形（原四面体的4个面，每个扇形三角化=4三角）
  // 六边形A (三角形0,1,2共享): 顶点 0,1,7,8,5,3 按边界顺序
  0, 1, 7,   0, 7, 8,   0, 8, 5,   0, 5, 3,
  // 六边形B (三角形0,1,3共享): 顶点 0,3,4,10,11,2 按边界顺序
  0, 3, 4,   0, 4, 10,  0, 10, 11, 0, 11, 2,
  // 六边形C (三角形0,2,3共享): 顶点 1,2,11,9,6,7 按边界顺序
  1, 2, 11,  1, 11, 9,  1, 9, 6,   1, 6, 7,
  // 六边形D (三角形1,2,3共享): 顶点 4,5,8,6,9,10 按边界顺序
  4, 5, 8,   4, 8, 6,   4, 6, 9,   4, 9, 10
];

// ===== 截角八面体 (Truncated Octahedron) - 24顶点，6正方+8六边 =====
// 标准坐标：所有 (0, ±1, ±2) 的排列，边长 = √2
// 顶点索引：按坐标模式分组
const TRUNCATED_OCTAHEDRON_VERTICES = [
  // 0-3: (0, ±1, ±2)
  0, 1, 2,   0, 1, -2,   0, -1, 2,   0, -1, -2,
  // 4-7: (0, ±2, ±1)
  0, 2, 1,   0, 2, -1,   0, -2, 1,   0, -2, -1,
  // 8-11: (±1, 0, ±2)
  1, 0, 2,   1, 0, -2,   -1, 0, 2,   -1, 0, -2,
  // 12-15: (±1, ±2, 0)
  1, 2, 0,   1, -2, 0,   -1, 2, 0,   -1, -2, 0,
  // 16-19: (±2, 0, ±1)
  2, 0, 1,   2, 0, -1,   -2, 0, 1,   -2, 0, -1,
  // 20-23: (±2, ±1, 0)
  2, 1, 0,   2, -1, 0,   -2, 1, 0,   -2, -1, 0
];
// 索引：6正方(2三角×6=12) + 8六边(4三角×8=32) = 44三角 = 132索引
// 六边形按原八面体面法线方向分组：(x+y+z=3), (x+y-z=3), (x-y+z=3), (x-y-z=3) 等
const TRUNCATED_OCTAHEDRON_INDICES = [
  // 6个正方形（原八面体的6个顶点处，每个2三角，共享对角线，法线朝外）
  // +x 正方形 (x=2): 顶点16,17,20,21 边界16->21->17->20 对角线20-21
  16, 21, 20,  21, 17, 20,
  // -x 正方形 (x=-2): 顶点18,19,22,23 边界18->22->19->23 对角线22-23
  18, 22, 23,  22, 19, 23,
  // +y 正方形 (y=2): 顶点4,5,12,14 边界4->12->5->14 对角线12-14
  4, 14, 12,   14, 5, 12,
  // -y 正方形 (y=-2): 顶点6,7,13,15 边界6->15->7->13 对角线13-15
  6, 13, 15,   13, 7, 15,
  // +z 正方形 (z=2): 顶点0,2,8,10 边界0->10->2->8 对角线8-10
  0, 10, 8,    10, 2, 8,
  // -z 正方形 (z=-2): 顶点1,3,9,11 边界1->9->3->11 对角线9-11
  1, 9, 11,    9, 3, 11,
  // 8个六边形（原八面体的8个面，每个4三角）
  // 六边形1 (+++): x+y+z=3 -> 0,4,8,12,16,20 顺序: 0->4->12->20->16->8
  0, 4, 12,  0, 12, 20,  0, 20, 16,  0, 16, 8,
  // 六边形2 (++-): x+y-z=3 -> 1,5,9,12,17,20 顺序: 1->5->12->20->17->9
  1, 5, 12,  1, 12, 20,  1, 20, 17,  1, 17, 9,
  // 六边形3 (+-+): x-y+z=3 -> 2,6,8,13,16,21 顺序: 2->8->16->21->13->6
  2, 8, 16,  2, 16, 21,  2, 21, 13,  2, 13, 6,
  // 六边形4 (+--): x-y-z=3 -> 3,7,9,13,17,21 顺序: 3->9->17->21->13->7
  3, 9, 17,  3, 17, 21,  3, 21, 13,  3, 13, 7,
  // 六边形5 (-++): -x+y+z=3 -> 0,4,10,14,18,22 顺序: 0->10->18->22->14->4
  0, 10, 18,  0, 18, 22,  0, 22, 14,  0, 14, 4,
  // 六边形6 (-+-): -x+y-z=3 -> 1,5,11,14,19,22 顺序: 1->11->19->22->14->5
  1, 11, 19,  1, 19, 22,  1, 22, 14,  1, 14, 5,
  // 六边形7 (--+): -x-y+z=3 -> 2,6,10,15,18,23 顺序: 2->10->18->23->15->6
  2, 10, 18,  2, 18, 23,  2, 23, 15,  2, 15, 6,
  // 六边形8 (---): -x-y-z=3 -> 3,7,11,15,19,23 顺序: 3->11->19->23->15->7
  3, 11, 19,  3, 19, 23,  3, 23, 15,  3, 15, 7
];

// ===== 截角立方体 (Truncated Cube) - 24顶点，8三角形+6八边形 =====
// 标准坐标：所有 (±ξ, ±1, ±1) 的排列，ξ = √2 - 1 ≈ 0.414
const XI = Math.SQRT2 - 1;
// 顶点按固定顺序排列（便于手写索引）
const TRUNCATED_CUBE_VERTICES = [
  // 0-7: (±ξ, ±1, ±1) - 8个
  XI, 1, 1,   XI, 1, -1,   XI, -1, 1,   XI, -1, -1,
  -XI, 1, 1,  -XI, 1, -1,  -XI, -1, 1,  -XI, -1, -1,
  // 8-15: (±1, ±ξ, ±1) - 8个
  1, XI, 1,   1, XI, -1,   1, -XI, 1,   1, -XI, -1,
  -1, XI, 1,  -1, XI, -1,  -1, -XI, 1,  -1, -XI, -1,
  // 16-23: (±1, ±1, ±ξ) - 8个
  1, 1, XI,   1, 1, -XI,   1, -1, XI,   1, -1, -XI,
  -1, 1, XI,  -1, 1, -XI,  -1, -1, XI,  -1, -1, -XI
];
// 手写完整索引：8三角 + 6八边（每八边=6三角）= 8 + 36 = 44三角 = 132索引
// 顶点索引参考:
// 0-7: (±ξ,±1,±1): 0(+,+,+) 1(+,+,-) 2(+,-,+) 3(+,-,-) 4(-,+,+) 5(-,+,-) 6(-,-,+) 7(-,-,-)
// 8-15: (±1,±ξ,±1): 8(+,+,+) 9(+,+,-) 10(+,-,+) 11(+,-,-) 12(-,+,+) 13(-,+,-) 14(-,-,+) 15(-,-,-)
// 16-23: (±1,±1,±ξ): 16(+,+,+) 17(+,+,-) 18(+,-,+) 19(+,-,-) 20(-,+,+) 21(-,+,-) 22(-,-,+) 23(-,-,-)
const TRUNCATED_CUBE_INDICES = [
  // 8个三角形（立方体8顶点处截角，法线朝外，逆时针绕序）
  0, 8, 16,    // +++ 顶点
  4, 20, 12,   // -++ 顶点
  2, 10, 18,   // +-+ 顶点
  6, 22, 14,   // --+ 顶点
  1, 9, 17,    // ++- 顶点
  5, 21, 13,   // -+- 顶点
  3, 19, 11,   // +-- 顶点
  7, 15, 23,   // --- 顶点
  // 6个八边形（立方体6面，每个扇形三角化=6三角，法线朝外）
  // +x 面 (x=1): 顶点 8,9,10,11,16,17,18,19 顺序: 16->17->9->11->19->18->10->8
  16, 17, 9,  16, 9, 11,  16, 11, 19,  16, 19, 18,  16, 18, 10,  16, 10, 8,
  // -x 面 (x=-1): 顶点 12,13,14,15,20,21,22,23 顺序: 20->12->14->22->23->15->13->21
  20, 12, 14,  20, 14, 22,  20, 22, 23,  20, 23, 15,  20, 15, 13,  20, 13, 21,
  // +y 面 (y=1): 顶点 0,1,4,5,16,17,20,21 顺序: 0->16->17->1->5->21->20->4
  0, 16, 17,  0, 17, 1,  0, 1, 5,  0, 5, 21,  0, 21, 20,  0, 20, 4,
  // -y 面 (y=-1): 顶点 2,3,6,7,18,19,22,23 顺序: 2->6->22->23->7->3->19->18
  2, 6, 22,  2, 22, 23,  2, 23, 7,  2, 7, 3,  2, 3, 19,  2, 19, 18,
  // +z 面 (z=1): 顶点 0,2,4,6,8,10,12,14 顺序: 0->4->12->14->6->2->10->8
  0, 4, 12,  0, 12, 14,  0, 14, 6,  0, 6, 2,  0, 2, 10,  0, 10, 8,
  // -z 面 (z=-1): 顶点 1,3,5,7,9,11,13,15 顺序: 1->9->11->3->7->15->13->5
  1, 9, 11,  1, 11, 3,  1, 3, 7,  1, 7, 15,  1, 15, 13,  1, 13, 5
];

// ===== 截角二十面体 (Truncated Icosahedron/足球) =====
// 60顶点32面(12五边+20六边)的完整索引过于复杂
// 当前使用 IcosahedronGeometry(radius, 1) 近似（80面球化二十面体）
// TODO: 如需精确足球拓扑，需外部工具生成完整116三角索引表

// ===== 截角十二面体 (Truncated Dodecahedron) =====
// 60顶点32面(20三角+12十边)，使用 DodecahedronGeometry(radius, 1) 近似

// ===== 截半二十面体 (Icosidodecahedron) =====
// 30顶点32面(20三角+12五边)，使用 IcosahedronGeometry(radius, 1) 近似
// TODO: 如需精确实现，需完整的30顶点+168三角索引表

// 创建多面体几何体
// 注意：截角/截半多面体强制 detail=0 以保持平面拓扑，避免 EdgesGeometry 提取出内部三角线
function createPolyhedronGeometry(type: PolyhedronType, radius: number, subdivisionLevel: number): THREE.BufferGeometry {
  // 判断是否为截角/截半类型
  const isTruncatedType = type.startsWith('truncated') || type === 'cuboctahedron' || type === 'icosidodecahedron';
  // 对截角类型强制 detail=0
  const effectiveDetail = isTruncatedType ? 0 : subdivisionLevel;
  
  switch (type) {
    // ===== 柏拉图立体（支持细分）=====
    case 'tetrahedron':
      return new THREE.TetrahedronGeometry(radius, subdivisionLevel);
    case 'cube':
      // BoxGeometry: 边长 = radius * 2 / √3 使外接球半径 = radius
      const boxSize = radius * 2 / Math.sqrt(3);
      return new THREE.BoxGeometry(boxSize, boxSize, boxSize, 1 + subdivisionLevel, 1 + subdivisionLevel, 1 + subdivisionLevel);
    case 'octahedron':
      return new THREE.OctahedronGeometry(radius, subdivisionLevel);
    case 'dodecahedron':
      return new THREE.DodecahedronGeometry(radius, subdivisionLevel);
    case 'icosahedron':
      return new THREE.IcosahedronGeometry(radius, subdivisionLevel);
    
    // ===== 截角/截半多面体 =====
    case 'truncatedTetrahedron':
      // 精确实现：12顶点，4三角+4六边
      return new THREE.PolyhedronGeometry(TRUNCATED_TETRAHEDRON_VERTICES, TRUNCATED_TETRAHEDRON_INDICES, radius, effectiveDetail);
    case 'truncatedOctahedron':
      // 精确实现：24顶点，6正方+8六边
      return new THREE.PolyhedronGeometry(TRUNCATED_OCTAHEDRON_VERTICES, TRUNCATED_OCTAHEDRON_INDICES, radius, effectiveDetail);
    case 'truncatedCube':
      // 精确实现：24顶点，8三角+6八边
      return new THREE.PolyhedronGeometry(TRUNCATED_CUBE_VERTICES, TRUNCATED_CUBE_INDICES, radius, effectiveDetail);
    case 'truncatedDodecahedron':
      // 60顶点过于复杂，用细分十二面体近似（视觉相似但拓扑不精确）
      return new THREE.DodecahedronGeometry(radius, 1);
    case 'truncatedIcosahedron':
      // 60顶点过于复杂，用细分二十面体近似（视觉接近足球但拓扑不精确）
      return new THREE.IcosahedronGeometry(radius, 1);
    case 'cuboctahedron':
      // 精确实现：12顶点，8三角+6正方
      return new THREE.PolyhedronGeometry(CUBOCTAHEDRON_VERTICES, CUBOCTAHEDRON_INDICES, radius, effectiveDetail);
    case 'icosidodecahedron':
      // 30顶点较复杂，用细分二十面体近似（视觉相似）
      // TODO: 提供精确实现需要完整的30顶点+32面索引
      return new THREE.IcosahedronGeometry(radius, 1);
    
    default:
      return new THREE.IcosahedronGeometry(radius, subdivisionLevel);
  }
}

// 从几何体提取唯一顶点（使用空间哈希避免精度问题）
function extractUniqueVertices(geometry: THREE.BufferGeometry): Float32Array {
  const positions = geometry.attributes.position.array as Float32Array;
  const uniqueVertices = new Map<string, number[]>();
  
  // 使用更高精度（6位小数）并基于量化格子避免浮点误差
  const quantize = (v: number) => Math.round(v * 100000) / 100000; // 0.00001 精度
  
  for (let i = 0; i < positions.length; i += 3) {
    const x = quantize(positions[i]);
    const y = quantize(positions[i+1]);
    const z = quantize(positions[i+2]);
    const key = `${x},${y},${z}`;
    if (!uniqueVertices.has(key)) {
      uniqueVertices.set(key, [positions[i], positions[i+1], positions[i+2]]);
    }
  }
  
  return new Float32Array([...uniqueVertices.values()].flat());
}

// 生成球面上的 Fibonacci 螺旋采样点
function generateFibonacciSpherePoints(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角
  
  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2; // y: 1 to -1
    const radius = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    points.push(new THREE.Vector3(
      Math.cos(theta) * radius,
      y,
      Math.sin(theta) * radius
    ));
  }
  
  return points;
}

// 生成球面随机采样点
function generateRandomSpherePoints(count: number): THREE.Vector3[] {
  const points: THREE.Vector3[] = [];
  
  for (let i = 0; i < count; i++) {
    // 均匀球面采样
    const u = Math.random();
    const v = Math.random();
    const theta = 2 * Math.PI * u;
    const phi = Math.acos(2 * v - 1);
    
    points.push(new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.sin(phi) * Math.sin(theta),
      Math.cos(phi)
    ));
  }
  
  return points;
}

// 计算顶点度数（连接的边数）
function computeVertexDegrees(edgesGeometry: THREE.EdgesGeometry): Map<string, number> {
  const positions = edgesGeometry.attributes.position.array;
  const degreeMap = new Map<string, number>();
  
  // 将顶点坐标转为字符串作为 key
  const toKey = (x: number, y: number, z: number) => 
    `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
  
  // 遍历所有边，统计每个顶点的度数
  for (let i = 0; i < positions.length; i += 6) {
    const key1 = toKey(positions[i], positions[i + 1], positions[i + 2]);
    const key2 = toKey(positions[i + 3], positions[i + 4], positions[i + 5]);
    
    degreeMap.set(key1, (degreeMap.get(key1) || 0) + 1);
    degreeMap.set(key2, (degreeMap.get(key2) || 0) + 1);
  }
  
  return degreeMap;
}

// 创建能量体 mesh
function createEnergyBodyMesh(config: EnergyBodySettings): { 
  group: THREE.Group; 
  edgesMesh: THREE.LineSegments | null; 
  verticesMesh: THREE.Points | null; 
  shellMesh: THREE.Mesh | null;
  voronoiMesh: THREE.Mesh | null;
  voronoiSeeds: THREE.Vector3[];
  vertexDegrees: Float32Array;
  graph: Graph | null;
  lightPackets: LightPacket[];
  edgeLightData: Float32Array | null;
} {
  const group = new THREE.Group();
  group.name = `energyBody_${config.id}`;
  group.userData = { energyBodyId: config.id };
  
  // 将能量体添加到 Bloom layer（用于选择性 Bloom）
  group.layers.enable(BLOOM_LAYER);
  
  // 创建基础几何体
  const baseGeometry = createPolyhedronGeometry(config.polyhedronType, config.radius, config.subdivisionLevel);
  
  let edgesMesh: THREE.LineSegments | null = null;
  let verticesMesh: THREE.Points | null = null;
  let shellMesh: THREE.Mesh | null = null;
  
  const rotAxis = getRotationAxis(config.rotationAxis);
  const { edgeEffect, vertexEffect, shellEffect, organicAnimation } = config;
  
  // 解析颜色
  const parseColor = (hex: string) => {
    const c = hex.replace('#', '');
    return new THREE.Vector3(
      parseInt(c.substring(0, 2), 16) / 255,
      parseInt(c.substring(2, 4), 16) / 255,
      parseInt(c.substring(4, 6), 16) / 255
    );
  };
  
  // === 线框模式 ===
  if (config.renderMode === 'wireframe' || config.renderMode === 'both') {
    // 创建边缘几何体（阈值5°更好地过滤共面三角的内部边）
    const edgesGeometry = new THREE.EdgesGeometry(baseGeometry, 5);
    
    // 为每个顶点添加 edgeProgress 属性
    const edgePositions = edgesGeometry.attributes.position.array;
    const vertexCount = edgePositions.length / 3;
    const edgeCount = vertexCount / 2;  // 每条边有2个顶点
    const edgeProgressArray = new Float32Array(vertexCount);
    for (let i = 0; i < edgeProgressArray.length; i += 2) {
      edgeProgressArray[i] = 0;     // 起点
      edgeProgressArray[i + 1] = 1; // 终点
    }
    edgesGeometry.setAttribute('edgeProgress', new THREE.BufferAttribute(edgeProgressArray, 1));
    
    // 边索引属性（用于多光包计算）
    const edgeIndexArray = new Float32Array(vertexCount);
    for (let i = 0; i < edgeCount; i++) {
      edgeIndexArray[i * 2] = i;
      edgeIndexArray[i * 2 + 1] = i;
    }
    edgesGeometry.setAttribute('edgeIndex', new THREE.BufferAttribute(edgeIndexArray, 1));
    
    // 边缘材质
    const edgeMaterial = new THREE.ShaderMaterial({
      vertexShader: energyBodyEdgeVertexShader,
      fragmentShader: energyBodyEdgeFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: config.rotationSpeed },
        uRotationAxis: { value: new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z) },
        uBreathing: { value: organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0 },
        uBreathingSpeed: { value: organicAnimation.breathingSpeed },
        uNoiseAmplitude: { value: organicAnimation.noiseEnabled ? organicAnimation.noiseAmplitude : 0 },
        uNoiseFrequency: { value: organicAnimation.noiseFrequency },
        uNoiseSpeed: { value: organicAnimation.noiseSpeed },
        uSpherize: { value: config.spherize },
        uRadius: { value: config.radius },
        uEdgeColor: { value: parseColor(edgeEffect.color) },
        uGradientEndColor: { value: parseColor(edgeEffect.gradientEndColor) },
        uGradientEnabled: { value: edgeEffect.gradientEnabled ? 1.0 : 0.0 },
        uGlowIntensity: { value: edgeEffect.glowIntensity },
        uGlobalOpacity: { value: config.globalOpacity },
        uBlendMode: { value: config.blendMode === 'additive' ? 0.0 : 1.0 },
        uDashEnabled: { value: edgeEffect.dashPattern.enabled ? 1.0 : 0.0 },
        uDashRatio: { value: edgeEffect.dashPattern.dashRatio },
        uDashDensity: { value: edgeEffect.dashPattern.dashDensity ?? 10 },
        uDashPhase: { value: 0 },
        // 光流 - 多包支持
        uLightFlowEnabled: { value: config.lightFlow.enabled ? 1.0 : 0.0 },
        uLightFlowColor: { value: parseColor(config.lightFlow.color) },
        uLightFlowBasePhase: { value: 0 },
        uLightFlowLength: { value: config.lightFlow.length },
        uLightFlowIntensity: { value: config.lightFlow.intensity },
        uLightFlowCount: { value: config.lightFlow.count ?? 1 },
        uLightFlowPhaseMode: { value: config.lightFlow.phaseMode === 'sync' ? 0.0 : 1.0 },
        uLightFlowPulseEnabled: { value: config.lightFlow.pulseEnabled ? 1.0 : 0.0 },
        uLightFlowPulseSpeed: { value: config.lightFlow.pulseSpeed ?? 2.0 },
        // 路径系统
        uUsePathSystem: { value: 0.0 },  // 初始化时不使用，运行时根据光包状态更新
        uLightPackets: { value: new Array(10).fill(null).map(() => new THREE.Vector2(-1, 0)) },
        // 边呼吸效果
        uEdgeBreathEnabled: { value: config.edgeBreathing?.enabled ? 1.0 : 0.0 },
        uEdgeBreathSpeed: { value: config.edgeBreathing?.speed ?? 0.5 },
        uEdgeBreathGlowAmp: { value: config.edgeBreathing?.glowAmplitude ?? 0.4 },
        uEdgeBreathAlphaAmp: { value: config.edgeBreathing?.alphaAmplitude ?? 0.15 },
        uEdgeBreathNoiseMix: { value: config.edgeBreathing?.noiseMix ?? 0.3 },
        uEdgeBreathNoiseScale: { value: config.edgeBreathing?.noiseScale ?? 2.0 },
        uEdgeBreathNoiseSpeed: { value: config.edgeBreathing?.noiseSpeed ?? 0.3 },
        uEdgeBreathNoiseFollow: { value: 0.0 }  // 默认使用原始坐标（不跟随呼吸）
      },
      transparent: true,
      blending: config.blendMode === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false
    });
    
    edgesMesh = new THREE.LineSegments(edgesGeometry, edgeMaterial);
    edgesMesh.renderOrder = 26; // 能量体边缘，略高于核心
    group.add(edgesMesh);
    
    // 顶点光点
    if (vertexEffect.enabled && vertexEffect.shape !== 'none') {
      const uniqueVertices = extractUniqueVertices(baseGeometry);
      const vertexGeometry = new THREE.BufferGeometry();
      vertexGeometry.setAttribute('position', new THREE.BufferAttribute(uniqueVertices, 3));
      
      const shapeMap: { [key: string]: number } = { 'circle': 0, 'diamond': 1, 'star': 2 };
      
      const vertexMaterial = new THREE.ShaderMaterial({
        vertexShader: energyBodyVertexPointShader,
        fragmentShader: energyBodyVertexPointFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uRotationSpeed: { value: config.rotationSpeed },
          uRotationAxis: { value: new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z) },
          uBreathing: { value: organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0 },
          uBreathingSpeed: { value: organicAnimation.breathingSpeed },
          uPointSize: { value: vertexEffect.size },
          uSpherize: { value: config.spherize },
          uRadius: { value: config.radius },
          uVertexColor: { value: parseColor(vertexEffect.color) },
          uGlowIntensity: { value: vertexEffect.glowIntensity },
          uGlobalOpacity: { value: config.globalOpacity },
          uVertexShape: { value: shapeMap[vertexEffect.shape] || 0 },
          // 停靠脉冲
          uDwellEnabled: { value: config.lightFlow?.dwellEnabled ? 1.0 : 0.0 },
          uDwellThreshold: { value: config.lightFlow?.dwellThreshold ?? 4 },
          uDwellPulseIntensity: { value: config.lightFlow?.dwellPulseIntensity ?? 1.0 },
          uDwellPulseSpeed: { value: 3.0 }
        },
        transparent: true,
        blending: config.blendMode === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
        depthWrite: false
      });
      
      verticesMesh = new THREE.Points(vertexGeometry, vertexMaterial);
      verticesMesh.renderOrder = 27; // 能量体顶点
      group.add(verticesMesh);
    }
  }
  
  // === 薄壳模式 ===
  if (config.renderMode === 'shell' || config.renderMode === 'both') {
    const shellGeometry = baseGeometry.clone();
    shellGeometry.computeVertexNormals();
    
    const shellMaterial = new THREE.ShaderMaterial({
      vertexShader: energyBodyShellVertexShader,
      fragmentShader: energyBodyShellFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: config.rotationSpeed },
        uRotationAxis: { value: new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z) },
        uBreathing: { value: organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0 },
        uBreathingSpeed: { value: organicAnimation.breathingSpeed },
        uSpherize: { value: config.spherize },
        uRadius: { value: config.radius },
        uShellColor: { value: parseColor(shellEffect.color) },
        uOpacity: { value: shellEffect.opacity },
        uFresnelPower: { value: shellEffect.fresnelPower },
        uFresnelIntensity: { value: shellEffect.fresnelIntensity },
        uGlobalOpacity: { value: config.globalOpacity }
      },
      transparent: true,
      blending: config.blendMode === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      side: shellEffect.doubleSided ? THREE.DoubleSide : THREE.FrontSide
    });
    
    shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
    shellMesh.renderOrder = 25; // 能量体薄壳，在核心之后
    group.add(shellMesh);
  }
  
  // === 球面 Voronoi ===
  let voronoiMesh: THREE.Mesh | null = null;
  let voronoiSeeds: THREE.Vector3[] = [];
  
  const voronoiConfig = config.sphericalVoronoi;
  if (voronoiConfig?.enabled) {
    // 生成种子点
    const seedCount = Math.min(voronoiConfig.cellCount, 64);
    voronoiSeeds = voronoiConfig.seedDistribution === 'fibonacci'
      ? generateFibonacciSpherePoints(seedCount)
      : generateRandomSpherePoints(seedCount);
    
    // 自适应细分级别：种子数越多，细分级别越低（性能优化）
    // detail=5 约 2562 面, detail=4 约 642 面, detail=3 约 162 面
    const adaptiveDetail = Math.max(3, 5 - Math.floor(seedCount / 20));
    // Voronoi 半径略大于基础半径，避免与其他层 z-fighting
    const voronoiGeometry = new THREE.IcosahedronGeometry(config.radius * 1.01, adaptiveDetail);
    voronoiGeometry.computeVertexNormals();
    
    // 将种子点传递给着色器（需要归一化）
    const seedArray = voronoiSeeds.map(s => s.clone().normalize());
    
    const colorModeMap: { [key: string]: number } = { 'gradient': 0, 'random': 1, 'uniform': 2 };
    
    const voronoiMaterial = new THREE.ShaderMaterial({
      vertexShader: sphericalVoronoiVertexShader,
      fragmentShader: sphericalVoronoiFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: config.rotationSpeed },
        uRotationAxis: { value: new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z) },
        uSeeds: { value: seedArray },
        uSeedCount: { value: seedCount },
        uLineColor: { value: parseColor(voronoiConfig.lineColor) },
        uLineWidth: { value: voronoiConfig.lineWidth },
        uLineGlow: { value: voronoiConfig.lineGlow },
        uFillOpacity: { value: voronoiConfig.fillEnabled ? voronoiConfig.fillOpacity : 0 },
        uBaseHue: { value: voronoiConfig.baseHue },
        uHueSpread: { value: voronoiConfig.hueSpread },
        uColorMode: { value: colorModeMap[voronoiConfig.colorMode] || 0 },
        uCellPulse: { value: voronoiConfig.cellPulse ? 1.0 : 0.0 },
        uCellPulseSpeed: { value: voronoiConfig.cellPulseSpeed },
        uGlobalOpacity: { value: config.globalOpacity }
      },
      transparent: true,
      blending: config.blendMode === 'additive' ? THREE.AdditiveBlending : THREE.NormalBlending,
      depthWrite: false,
      depthTest: false,  // 关闭深度测试，确保 Voronoi 总是可见
      side: THREE.DoubleSide  // 双面渲染，确保从各个角度都能看到
    });
    
    voronoiMesh = new THREE.Mesh(voronoiGeometry, voronoiMaterial);
    voronoiMesh.renderOrder = 30; // Voronoi 渲染在最前面
    group.add(voronoiMesh);
  }
  
  // 应用倾斜
  const tiltAngles = getTiltAngles(config.tilt);
  group.rotation.set(tiltAngles.x, tiltAngles.y, tiltAngles.z);
  
  // 计算顶点度数（用于顶点停靠脉冲）
  let vertexDegrees = new Float32Array(0);
  if (verticesMesh) {
    const positions = verticesMesh.geometry.attributes.position.array;
    const vertexCount = positions.length / 3;
    vertexDegrees = new Float32Array(vertexCount);
    
    // 如果有边缘几何体，从中计算度数
    if (edgesMesh) {
      const edgesGeometry = edgesMesh.geometry as THREE.EdgesGeometry;
      const degreeMap = computeVertexDegrees(edgesGeometry);
      const toKey = (x: number, y: number, z: number) => 
        `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`;
      
      for (let i = 0; i < vertexCount; i++) {
        const key = toKey(positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]);
        vertexDegrees[i] = degreeMap.get(key) || 3; // 默认度数为 3
      }
      
      // 将度数作为属性添加到顶点几何体
      verticesMesh.geometry.setAttribute('vertexDegree', new THREE.BufferAttribute(vertexDegrees, 1));
    }
  }
  
  // 构建图结构（用于路径系统）
  let graph: Graph | null = null;
  let lightPackets: LightPacket[] = [];
  let edgeLightData: Float32Array | null = null;
  
  if (edgesMesh && config.lightFlow?.enabled) {
    const edgesGeometry = edgesMesh.geometry as THREE.BufferGeometry;
    graph = buildGraphFromEdgesGeometry(edgesGeometry);
    
    // 创建路径系统配置
    const pathConfig: PathSystemConfig = {
      pathMode: config.lightFlow.pathMode || 'euler',
      eulerMode: (config.lightFlow.eulerMode as any) || 'autoAugment',
      phaseMode: config.lightFlow.phaseMode || 'spread',
      count: config.lightFlow.count || 3,
      speed: config.lightFlow.speed || 1.0,
      noBacktrack: config.lightFlow.noBacktrack ?? true,
      coverageWeight: config.lightFlow.coverageWeight ?? 1.0,
      angleWeight: config.lightFlow.angleWeight ?? 0.5,
      dwellEnabled: config.lightFlow.dwellEnabled || false,
      dwellThreshold: config.lightFlow.dwellThreshold || 4,
      dwellDuration: config.lightFlow.dwellDuration || 0.3,
      dwellCooldown: config.lightFlow.dwellCooldown ?? 1.0,
      dwellPulseIntensity: config.lightFlow.dwellPulseIntensity || 2.0,
      minPacketSpacing: config.lightFlow.minPacketSpacing ?? 0.1
    };
    
    // 创建光包
    lightPackets = createLightPackets(graph, pathConfig);
    
    // 初始化边光包数据
    edgeLightData = new Float32Array(graph.edges.length * 4);
    edgeLightData.fill(-1);
  }
  
  return { group, edgesMesh, verticesMesh, shellMesh, voronoiMesh, voronoiSeeds, vertexDegrees, graph, lightPackets, edgeLightData };
}

// 创建椭圆环几何体（支持离心率）
function createEllipticalRingGeometry(innerRadius: number, outerRadius: number, eccentricity: number, segments: number = 64): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  const positions: number[] = [];
  const uvs: number[] = [];
  const indices: number[] = [];
  
  // 椭圆参数：a = 长轴, b = 短轴
  // eccentricity = sqrt(1 - b²/a²), 所以 b = a * sqrt(1 - e²)
  const e = Math.min(eccentricity, 0.99); // 限制最大离心率
  const bFactor = Math.sqrt(1 - e * e); // 短轴/长轴比例
  
  const radialSegments = 16; // 环带厚度方向的分段数（增加以支持透明度渐变）
  
  for (let i = 0; i <= segments; i++) {
    const angle = (i / segments) * Math.PI * 2;
    const cos = Math.cos(angle);
    const sin = Math.sin(angle);
    
    for (let j = 0; j <= radialSegments; j++) {
      const t = j / radialSegments;
      const radius = innerRadius + (outerRadius - innerRadius) * t;
      
      // 椭圆化：x方向保持，y方向乘以bFactor
      const x = radius * cos;
      const y = radius * sin * bFactor;
      
      positions.push(x, y, 0);
      uvs.push(t, i / segments);
    }
  }
  
  // 生成索引
  for (let i = 0; i < segments; i++) {
    for (let j = 0; j < radialSegments; j++) {
      const a = i * (radialSegments + 1) + j;
      const b = a + 1;
      const c = (i + 1) * (radialSegments + 1) + j;
      const d = c + 1;
      
      indices.push(a, b, d);
      indices.push(a, d, c);
    }
  }
  
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  
  return geometry;
}

// Fibonacci 球面均匀分布
function fibonacciSphere(samples: number, radius: number, fillPercent: number = 0): Float32Array {
  const positions: number[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // 黄金角
  
  for (let i = 0; i < samples; i++) {
    const y = 1 - (i / (samples - 1)) * 2; // -1 to 1
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;
    
    // 根据填充百分比调整半径
    let r = radius;
    if (fillPercent > 0) {
      // 渐变/实心模式：粒子分布在不同半径
      const minR = radius * (1 - fillPercent / 100);
      // 使用立方根实现体积均匀分布 (r ∝ ∛random)
      // 这样内部和外部的密度一致
      const t = Math.cbrt(Math.random()); // 0~1 的立方根分布
      r = minR + t * (radius - minR);
    }
    
    const x = Math.cos(theta) * radiusAtY * r;
    const z = Math.sin(theta) * radiusAtY * r;
    const posY = y * r;
    
    positions.push(x, posY, z);
  }
  
  return new Float32Array(positions);
}

// HSL 转 RGB
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  h = h / 360;
  let r, g, b;
  
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  
  return [r, g, b];
}

// 十六进制颜色转 RGB
function hexToRgb(hex: string): [number, number, number] {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : [1, 1, 1];
}

// 生成椭圆环粒子
function generateRingParticles(
  radius: number,
  eccentricity: number,
  density: number,
  bandwidth: number,
  thickness: number
): Float32Array {
  // 计算椭圆周长近似值
  const b = radius * Math.sqrt(1 - eccentricity * eccentricity);
  const perimeter = Math.PI * (3 * (radius + b) - Math.sqrt((3 * radius + b) * (radius + 3 * b)));
  
  // 粒子数 = 密度 * 周长
  const count = Math.floor(density * perimeter);
  const positions: number[] = [];
  
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    
    // 椭圆参数方程
    const x = radius * Math.cos(angle);
    const y = b * Math.sin(angle);
    
    // 添加宽度和厚度偏移
    const offsetX = (Math.random() - 0.5) * bandwidth;
    const offsetY = (Math.random() - 0.5) * bandwidth;
    const offsetZ = (Math.random() - 0.5) * thickness;
    
    positions.push(x + offsetX, offsetZ, y + offsetY);
  }
  
  return new Float32Array(positions);
}

// ==================== 实体核心创建函数 ====================

// 计算实体核心颜色 (CPU 端) - 使用 THREE.Color 确保颜色空间正确
function calculateSolidCoreColors(settings: SolidCoreSettings): { baseColor: THREE.Vector3, accentColor: THREE.Vector3 } {
  // 为旧数据提供默认值保护
  const hue = settings.hue ?? 0.02;
  const sat = Math.min(settings.saturation ?? 1.0, 1.0); // clamp 到 0-1 用于 setHSL
  const lightness = settings.lightness ?? 0.5;
  
  const baseColor = new THREE.Color();
  const accentColor = new THREE.Color();
  
  // 基于用户的明度设置计算颜色
  // lightness = 0 → 纯黑
  // lightness = 0.5 → 正常颜色
  // lightness = 1 → 接近白色
  
  // baseColor 始终比 accentColor 暗（用于纹理暗部）
  const baseLightness = lightness * 0.15; // baseColor 取明度的 15%
  const accentLightness = lightness; // accentColor 使用用户设定的明度
  
  baseColor.setHSL(hue, sat, baseLightness);
  accentColor.setHSL((hue + 0.05) % 1.0, sat, accentLightness);
  
  return {
    baseColor: new THREE.Vector3(baseColor.r, baseColor.g, baseColor.b),
    accentColor: new THREE.Vector3(accentColor.r, accentColor.g, accentColor.b)
  };
}

// 计算光晕颜色（从 HSL 转换为 RGB）- 兼容旧版
function calculateGlowColor(settings: SolidCoreSettings): THREE.Vector3 {
  const glowHue = settings.glowHue ?? 0.5;
  const glowSat = settings.glowSaturation ?? 1.0;
  const color = new THREE.Color();
  color.setHSL(glowHue, glowSat, 0.6);
  return new THREE.Vector3(color.r, color.g, color.b);
}

// 将 hex 颜色转换为 THREE.Vector3
function hexToVec3(hex: string): THREE.Vector3 {
  const color = new THREE.Color(hex);
  return new THREE.Vector3(color.r, color.g, color.b);
}

// 获取渐变方向索引
function getGradientDirIndex(dir: string): number {
  const dirMap: Record<string, number> = {
    'radial': 0, 'linearX': 1, 'linearY': 2, 'linearZ': 3, 'linearCustom': 4, 'spiral': 5
  };
  return dirMap[dir] ?? 0;
}

// 获取颜色模式索引
function getColorModeIndex(mode: string): number {
  const modeMap: Record<string, number> = {
    'none': 0, 'twoColor': 1, 'threeColor': 2, 'procedural': 3
  };
  return modeMap[mode] ?? 0;
}

// 创建实体核心 Mesh（包含核心球体和外壳光晕层）
function createSolidCoreMesh(settings: SolidCoreSettings, isMobile: boolean): THREE.Group {
  // 几何体精度: PC 128x128, 移动端 64x64
  const segments = isMobile ? 64 : 128;
  const shellSegments = isMobile ? 32 : 64; // 外壳精度可以低一些
  
  // 为旧数据提供默认值保护
  const radius = settings.radius ?? 100;
  const scale = settings.scale ?? 3.0;
  const speed = settings.speed ?? 0.5;
  const contrast = settings.contrast ?? 3.0;
  const bandMix = settings.bandMix ?? 0;
  const ridgeMix = settings.ridgeMix ?? 0;
  const gridMix = settings.gridMix ?? 0;
  // 裂隙系统
  const crackEnabled = settings.crackEnabled ?? false;
  const crackScale = settings.crackScale ?? 4.0;
  const crackThreshold = settings.crackThreshold ?? 0.3;
  const crackFeather = settings.crackFeather ?? 0.1;
  const crackWarp = settings.crackWarp ?? 0.5;
  const crackWarpScale = settings.crackWarpScale ?? 1.5;
  const crackFlowSpeed = settings.crackFlowSpeed ?? 0.2;
  const crackColor1 = settings.crackColor1 ?? '#ffffff';
  const crackColor2 = settings.crackColor2 ?? '#ffaa00';
  const crackEmission = settings.crackEmission ?? 2.0;
  const emissiveStrength = settings.emissiveStrength ?? 0;
  // 多频叠加
  const multiFreqEnabled = settings.multiFreqEnabled ?? false;
  const warpIntensity = settings.warpIntensity ?? 0.5;
  const warpScale = settings.warpScale ?? 1.0;
  const detailBalance = settings.detailBalance ?? 0.3;
  // 法线扰动
  const bumpEnabled = settings.bumpEnabled ?? false;
  const bumpStrength = settings.bumpStrength ?? 0.3;
  const specularStrength = settings.specularStrength ?? 1.0;
  const specularColor = settings.specularColor ?? '#ffffff';
  const roughness = settings.roughness ?? 32;
  // 定向光
  const lightEnabled = settings.lightEnabled ?? false;
  const lightDirection = settings.lightDirection ?? { x: -1, y: -1, z: 1 };
  const lightColor = settings.lightColor ?? '#ffffff';
  const lightIntensity = settings.lightIntensity ?? 1.0;
  const lightAmbient = settings.lightAmbient ?? 0.2;
  // 热点辉斑
  const hotspotEnabled = settings.hotspotEnabled ?? false;
  const hotspotCount = settings.hotspotCount ?? 4;
  const hotspotSize = settings.hotspotSize ?? 0.15;
  const hotspotPulseSpeed = settings.hotspotPulseSpeed ?? 1.0;
  const hotspotColor = settings.hotspotColor ?? '#ffff00';
  const hotspotEmission = settings.hotspotEmission ?? 3.0;
  const opacity = settings.opacity ?? 1.0;
  const brightness = settings.brightness ?? 1.0;
  // 新光晕参数
  const glowLength = settings.glowLength ?? 2.0;
  const glowStrength = settings.glowStrength ?? 1.0;
  const glowRadius = settings.glowRadius ?? 0.2;
  const glowFalloff = settings.glowFalloff ?? 2.0;
  const glowInward = settings.glowInward ?? false;
  const glowBloomBoost = settings.glowBloomBoost ?? 1.0;
  
  // 处理表面颜色（兼容旧版和新版）
  const surfaceColor = settings.surfaceColor ?? {
    mode: 'none' as const,
    baseColor: '#ff4400',
    colors: ['#ff4400', '#ffffff'],
    colorMidPosition: 0.5,
    direction: 'radial' as const,
    directionCustom: { x: 0, y: 1, z: 0 },
    spiralDensity: 3,
    proceduralIntensity: 1.0
  };
  
  // 处理光晕颜色（兼容旧版和新版）
  const glowColorSettings = settings.glowColor ?? {
    mode: 'none' as const,
    baseColor: '#ff6600',
    colors: ['#ff6600', '#ffffff'],
    colorMidPosition: 0.5,
    direction: 'radial' as const,
    directionCustom: { x: 0, y: 1, z: 0 },
    spiralDensity: 3,
    proceduralIntensity: 1.0
  };
  
  // === 1. 核心球体 ===
  const coreGeometry = new THREE.SphereGeometry(radius, segments, segments);
  const coreMaterial = new THREE.ShaderMaterial({
    vertexShader: solidCoreVertexShader,
    fragmentShader: solidCoreFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uScale: { value: scale },
      uSpeed: { value: speed },
      uContrast: { value: contrast },
      uBandMix: { value: bandMix },
      uRidgeMix: { value: ridgeMix },
      uGridMix: { value: gridMix },
      // 裂隙系统
      uCrackEnabled: { value: crackEnabled ? 1.0 : 0.0 },
      uCrackScale: { value: crackScale },
      uCrackThreshold: { value: crackThreshold },
      uCrackFeather: { value: crackFeather },
      uCrackWarp: { value: crackWarp },
      uCrackWarpScale: { value: crackWarpScale },
      uCrackFlowSpeed: { value: crackFlowSpeed },
      uCrackColor1: { value: hexToVec3(crackColor1) },
      uCrackColor2: { value: hexToVec3(crackColor2) },
      uCrackEmission: { value: crackEmission },
      uEmissiveStrength: { value: emissiveStrength },
      // 多频叠加
      uMultiFreqEnabled: { value: multiFreqEnabled ? 1.0 : 0.0 },
      uWarpIntensity: { value: warpIntensity },
      uWarpScale: { value: warpScale },
      uDetailBalance: { value: detailBalance },
      // 法线扰动
      uBumpEnabled: { value: bumpEnabled ? 1.0 : 0.0 },
      uBumpStrength: { value: bumpStrength },
      uSpecularStrength: { value: specularStrength },
      uSpecularColor: { value: hexToVec3(specularColor) },
      uRoughness: { value: roughness },
      // 定向光
      uLightEnabled: { value: lightEnabled ? 1.0 : 0.0 },
      uLightDirection: { value: new THREE.Vector3(lightDirection.x, lightDirection.y, lightDirection.z) },
      uLightColor: { value: hexToVec3(lightColor) },
      uLightIntensity: { value: lightIntensity },
      uLightAmbient: { value: lightAmbient },
      // 热点辉斑
      uHotspotEnabled: { value: hotspotEnabled ? 1.0 : 0.0 },
      uHotspotCount: { value: hotspotCount },
      uHotspotSize: { value: hotspotSize },
      uHotspotPulseSpeed: { value: hotspotPulseSpeed },
      uHotspotColor: { value: hexToVec3(hotspotColor) },
      uHotspotEmission: { value: hotspotEmission },
      uOpacity: { value: opacity },
      uBrightness: { value: brightness },
      // 表面颜色系统
      uSurfaceColorMode: { value: getColorModeIndex(surfaceColor.mode) },
      uSurfaceBaseColor: { value: hexToVec3(surfaceColor.baseColor) },
      uSurfaceColor1: { value: hexToVec3(surfaceColor.colors[0] || surfaceColor.baseColor) },
      uSurfaceColor2: { value: hexToVec3(surfaceColor.colors[1] || '#ffffff') },
      uSurfaceColor3: { value: hexToVec3(surfaceColor.colors[2] || '#ffffff') },
      uSurfaceColorMidPos: { value: surfaceColor.colorMidPosition },
      uSurfaceColorMidWidth: { value: surfaceColor.colorMidWidth ?? 1 },
      uSurfaceColorMidWidth2: { value: surfaceColor.colorMidWidth2 ?? 0 },
      uSurfaceGradientDir: { value: getGradientDirIndex(surfaceColor.direction) },
      uSurfaceCustomDir: { value: new THREE.Vector3(surfaceColor.directionCustom.x, surfaceColor.directionCustom.y, surfaceColor.directionCustom.z) },
      uSurfaceSpiralDensity: { value: surfaceColor.spiralDensity },
      uSurfaceProceduralInt: { value: surfaceColor.proceduralIntensity },
      // 光晕颜色系统
      uGlowColorMode: { value: getColorModeIndex(glowColorSettings.mode) },
      uGlowBaseColor: { value: hexToVec3(glowColorSettings.baseColor) },
      uGlowColor1: { value: hexToVec3(glowColorSettings.colors[0] || glowColorSettings.baseColor) },
      uGlowColor2: { value: hexToVec3(glowColorSettings.colors[1] || '#ffffff') },
      uGlowColor3: { value: hexToVec3(glowColorSettings.colors[2] || '#ffffff') },
      uGlowColorMidPos: { value: glowColorSettings.colorMidPosition },
      uGlowColorMidWidth: { value: glowColorSettings.colorMidWidth ?? 1 },
      uGlowColorMidWidth2: { value: glowColorSettings.colorMidWidth2 ?? 0 },
      uGlowGradientDir: { value: getGradientDirIndex(glowColorSettings.direction) },
      uGlowCustomDir: { value: new THREE.Vector3(glowColorSettings.directionCustom.x, glowColorSettings.directionCustom.y, glowColorSettings.directionCustom.z) },
      uGlowSpiralDensity: { value: glowColorSettings.spiralDensity },
      uGlowProceduralInt: { value: glowColorSettings.proceduralIntensity },
      // 光晕参数
      uGlowLength: { value: glowLength },
      uGlowStrength: { value: glowStrength },
      uGlowBloomBoost: { value: glowBloomBoost }
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false  // 正面不写深度，让内部物体可见
  });
  const coreMesh = new THREE.Mesh(coreGeometry, coreMaterial);
  coreMesh.name = 'solidCore';
  coreMesh.renderOrder = 10;  // 正面渲染顺序
  
  // === 1.5 背面深度预写层（只写深度不写颜色） ===
  // 这一层用于正确遮挡核心后方的物体
  const depthGeometry = new THREE.SphereGeometry(radius, segments, segments);
  const depthMaterial = new THREE.MeshBasicMaterial({
    colorWrite: false,  // 不写颜色
    side: THREE.BackSide,  // 只渲染背面
    depthWrite: true  // 写入深度
  });
  const depthMesh = new THREE.Mesh(depthGeometry, depthMaterial);
  depthMesh.name = 'solidCoreDepth';
  depthMesh.renderOrder = 5;  // 先于正面渲染
  
  // === 2. 外壳光晕层（当 glowStrength > 0 时创建） ===
  const group = new THREE.Group();
  group.add(depthMesh);  // 先添加深度预写层
  group.add(coreMesh);   // 再添加正面层
  
  if (glowStrength > 0 && glowRadius > 0) {
    // 外壳半径：由 glowRadius 控制（0-1 对应 0-100% 额外高度）
    const shellScale = 1.0 + glowRadius;
    const shellRadius = radius * shellScale;
    
    const shellGeometry = new THREE.SphereGeometry(shellRadius, shellSegments, shellSegments);
    const shellMaterial = new THREE.ShaderMaterial({
      vertexShader: glowShellVertexShader,
      fragmentShader: glowShellFragmentShader,
      uniforms: {
        // 光晕颜色系统
        uGlowColorMode: { value: getColorModeIndex(glowColorSettings.mode) },
        uGlowBaseColor: { value: hexToVec3(glowColorSettings.baseColor) },
        uGlowColor1: { value: hexToVec3(glowColorSettings.colors[0] || glowColorSettings.baseColor) },
        uGlowColor2: { value: hexToVec3(glowColorSettings.colors[1] || '#ffffff') },
        uGlowColor3: { value: hexToVec3(glowColorSettings.colors[2] || '#ffffff') },
        uGlowColorMidPos: { value: glowColorSettings.colorMidPosition },
        uGlowColorMidWidth: { value: glowColorSettings.colorMidWidth ?? 1 },
        uGlowColorMidWidth2: { value: glowColorSettings.colorMidWidth2 ?? 0 },
        uGlowGradientDir: { value: getGradientDirIndex(glowColorSettings.direction) },
        uGlowCustomDir: { value: new THREE.Vector3(glowColorSettings.directionCustom.x, glowColorSettings.directionCustom.y, glowColorSettings.directionCustom.z) },
        uGlowSpiralDensity: { value: glowColorSettings.spiralDensity },
        uGlowProceduralInt: { value: glowColorSettings.proceduralIntensity },
        uRadius: { value: shellRadius },
        // 光晕参数
        uGlowStrength: { value: glowStrength },
        uGlowFalloff: { value: glowFalloff },
        uGlowInward: { value: glowInward ? 1.0 : 0.0 }
      },
      transparent: true,
      side: THREE.BackSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    const shellMesh = new THREE.Mesh(shellGeometry, shellMaterial);
    shellMesh.name = 'glowShell';
    shellMesh.renderOrder = 15;  // 在正面核心之后渲染
    group.add(shellMesh);
  }
  
  return group;
}

// ==================== 表面火焰 Mesh ====================

function createSurfaceFlameMesh(settings: SurfaceFlameSettings, isMobile: boolean): THREE.Mesh {
  const segments = isMobile ? 48 : 96;
  
  const {
    radius = 105,
    thickness = 0.15,
    color,
    flameScale = 1.0,
    density = 0.8,
    flowSpeed = 1.0,
    turbulence = 0.8,
    noiseType = 'simplex',
    fractalLayers = 3,
    opacity = 0.9,
    emissive = 2.0,
    bloomBoost = 1.5,
    direction = 'up',
    pulseEnabled = true,
    pulseSpeed = 1.0,
    pulseIntensity = 0.3
  } = settings;
  
  // 火焰颜色
  const fc = color || {
    mode: 'twoColor',
    baseColor: '#ff6600',
    colors: ['#ff6600', '#ffff00'],
    colorMidPosition: 0.5,
    colorMidWidth: 1,
    direction: 'radial',
    directionCustom: { x: 0, y: 1, z: 0 },
    spiralDensity: 3,
    proceduralIntensity: 1.0
  };
  
  // 颜色模式索引
  const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
  
  // 方向索引
  const directionIndex = direction === 'up' ? 0 : direction === 'outward' ? 1 : 2;
  
  // 噪声类型索引
  const noiseTypeIndex = noiseType === 'simplex' ? 0 : noiseType === 'voronoi' ? 1 : 0;
  
  // 创建略大于核心的球体
  const flameRadius = radius * (1 + thickness);
  const geometry = new THREE.IcosahedronGeometry(flameRadius, isMobile ? 4 : 5);
  
  const material = new THREE.ShaderMaterial({
    vertexShader: surfaceFlameVertexShader,
    fragmentShader: surfaceFlameFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uRadius: { value: radius },
      uThickness: { value: thickness },
      uFlameScale: { value: flameScale },
      uDensity: { value: density },
      uFlowSpeed: { value: flowSpeed },
      uTurbulence: { value: turbulence },
      uNoiseType: { value: noiseTypeIndex },
      uFractalLayers: { value: fractalLayers },
      uOpacity: { value: opacity },
      uEmissive: { value: emissive },
      uBloomBoost: { value: bloomBoost },
      uDirection: { value: directionIndex },
      uPulseEnabled: { value: pulseEnabled ? 1.0 : 0.0 },
      uPulseSpeed: { value: pulseSpeed },
      uPulseIntensity: { value: pulseIntensity },
      // 颜色系统
      uColorMode: { value: colorModeIndex },
      uBaseColor: { value: hexToVec3(fc.baseColor) },
      uColor1: { value: hexToVec3(fc.colors?.[0] || fc.baseColor) },
      uColor2: { value: hexToVec3(fc.colors?.[1] || '#ffff00') },
      uColor3: { value: hexToVec3(fc.colors?.[2] || '#ffffff') },
      uColorMidPos: { value: fc.colorMidPosition ?? 0.5 },
      uColorMidWidth: { value: fc.colorMidWidth ?? 1 },
      uGradientDir: { value: 0 },
      uCustomDir: { value: new THREE.Vector3(0, 1, 0) },
      uSpiralDensity: { value: fc.spiralDensity ?? 3 },
      uProceduralIntensity: { value: fc.proceduralIntensity ?? 1.0 }
    },
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    blending: THREE.AdditiveBlending
  });
  
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `surfaceFlame_${settings.id}`;
  mesh.renderOrder = 20;
  
  return mesh;
}

// ==================== 喷发火柱 Points ====================

function createFlameJetPoints(settings: FlameJetSettings, isMobile: boolean): THREE.Points {
  const count = isMobile ? Math.floor(settings.particleCount * 0.5) : settings.particleCount;
  
  // 生成喷射点位置
  const getJetOrigins = () => {
    const origins: THREE.Vector3[] = [];
    const directions: THREE.Vector3[] = [];
    const r = settings.baseRadius;
    
    switch (settings.sourceType) {
      case 'pole':
        origins.push(new THREE.Vector3(0, r, 0));
        directions.push(new THREE.Vector3(0, 1, 0));
        break;
      case 'equator':
        for (let i = 0; i < 4; i++) {
          const angle = (i / 4) * Math.PI * 2;
          origins.push(new THREE.Vector3(Math.cos(angle) * r, 0, Math.sin(angle) * r));
          directions.push(new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle)));
        }
        break;
      case 'hotspots':
        for (let i = 0; i < settings.hotspotCount; i++) {
          const phi = Math.acos(2 * Math.random() - 1);
          const theta = Math.random() * Math.PI * 2;
          const dir = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          );
          origins.push(dir.clone().multiplyScalar(r));
          directions.push(dir);
        }
        break;
      case 'surface':
      default:
        for (let i = 0; i < settings.hotspotCount; i++) {
          const phi = Math.acos(2 * ((i + 0.5) / settings.hotspotCount) - 1);
          const theta = (i * 2.399963) % (Math.PI * 2);
          const dir = new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta),
            Math.cos(phi),
            Math.sin(phi) * Math.sin(theta)
          );
          origins.push(dir.clone().multiplyScalar(r));
          directions.push(dir);
        }
    }
    return { origins, directions };
  };
  
  const { origins, directions } = getJetOrigins();
  const jetCount = origins.length;
  const particlesPerJet = Math.floor(count / jetCount);
  
  const positions = new Float32Array(count * 3);
  const progresses = new Float32Array(count);
  const randoms = new Float32Array(count);
  const jetDirections = new Float32Array(count * 3);
  const jetIndices = new Float32Array(count);
  
  let idx = 0;
  for (let j = 0; j < jetCount; j++) {
    const origin = origins[j];
    const dir = directions[j];
    for (let i = 0; i < particlesPerJet && idx < count; i++) {
      positions[idx * 3] = origin.x;
      positions[idx * 3 + 1] = origin.y;
      positions[idx * 3 + 2] = origin.z;
      progresses[idx] = i / particlesPerJet;
      randoms[idx] = Math.random();
      jetDirections[idx * 3] = dir.x;
      jetDirections[idx * 3 + 1] = dir.y;
      jetDirections[idx * 3 + 2] = dir.z;
      jetIndices[idx] = j;
      idx++;
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aProgress', new THREE.BufferAttribute(progresses, 1));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  geometry.setAttribute('aJetDirection', new THREE.BufferAttribute(jetDirections, 3));
  geometry.setAttribute('aJetIndex', new THREE.BufferAttribute(jetIndices, 1));
  
  const fc = settings.color;
  const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
  
  const material = new THREE.ShaderMaterial({
    vertexShader: flameJetVertexShader,
    fragmentShader: flameJetFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uJetSpeed: { value: settings.jetSpeed },
      uHeight: { value: settings.height * settings.baseRadius },
      uWidth: { value: settings.width },
      uSpread: { value: settings.spread },
      uTurbulence: { value: settings.turbulence },
      uLifespan: { value: settings.lifespan },
      uParticleSize: { value: settings.particleSize },
      uBurstPhase: { value: 1.0 },
      uColor1: { value: hexToVec3(fc.colors?.[0] || fc.baseColor) },
      uColor2: { value: hexToVec3(fc.colors?.[1] || '#ffff00') },
      uColor3: { value: hexToVec3(fc.colors?.[2] || '#ff0000') },
      uOpacity: { value: settings.opacity },
      uEmissive: { value: settings.emissive },
      uColorMode: { value: colorModeIndex }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const points = new THREE.Points(geometry, material);
  points.name = `flameJet_${settings.id}`;
  points.renderOrder = 21;
  
  return points;
}

// ==================== 螺旋火焰 Points ====================

function createSpiralFlamePoints(settings: SpiralFlameSettings, isMobile: boolean): THREE.Points {
  const count = isMobile ? Math.floor(settings.particleCount * 0.5) : settings.particleCount;
  
  const positions = new Float32Array(count * 3);
  const angles = new Float32Array(count);
  const heights = new Float32Array(count);
  const randoms = new Float32Array(count);
  
  const spiralCount = settings.spiralCount;
  const particlesPerSpiral = Math.floor(count / spiralCount);
  
  let idx = 0;
  for (let s = 0; s < spiralCount; s++) {
    const spiralOffset = (s / spiralCount) * Math.PI * 2;
    for (let i = 0; i < particlesPerSpiral && idx < count; i++) {
      positions[idx * 3] = 0;
      positions[idx * 3 + 1] = 0;
      positions[idx * 3 + 2] = 0;
      angles[idx] = spiralOffset + (i / particlesPerSpiral) * settings.pitch * Math.PI * 2;
      heights[idx] = i / particlesPerSpiral;
      randoms[idx] = Math.random();
      idx++;
    }
  }
  
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
  geometry.setAttribute('aHeight', new THREE.BufferAttribute(heights, 1));
  geometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
  
  const fc = settings.color;
  const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
  const dirIndex = settings.direction === 'cw' ? 0 : settings.direction === 'ccw' ? 1 : 2;
  
  const material = new THREE.ShaderMaterial({
    vertexShader: spiralFlameVertexShader,
    fragmentShader: spiralFlameFragmentShader,
    uniforms: {
      uTime: { value: 0 },
      uBaseRadius: { value: settings.baseRadius },
      uStartRadius: { value: settings.startRadius },
      uEndRadius: { value: settings.endRadius },
      uSpiralHeight: { value: settings.height },
      uPitch: { value: settings.pitch },
      uRotationSpeed: { value: settings.rotationSpeed },
      uRiseSpeed: { value: settings.riseSpeed },
      uSpiralCount: { value: settings.spiralCount },
      uDirection: { value: dirIndex },
      uThickness: { value: settings.thickness },
      uParticleSize: { value: settings.particleSize ?? 4.0 },
      uColor1: { value: hexToVec3(fc.colors?.[0] || fc.baseColor) },
      uColor2: { value: hexToVec3(fc.colors?.[1] || '#ffff00') },
      uColor3: { value: hexToVec3(fc.colors?.[2] || '#ff0000') },
      uOpacity: { value: settings.opacity },
      uEmissive: { value: settings.emissive },
      uColorMode: { value: colorModeIndex }
    },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  
  const points = new THREE.Points(geometry, material);
  points.name = `spiralFlame_${settings.id}`;
  points.renderOrder = 22;
  
  return points;
}

// ==================== 残影系统创建函数 ====================

interface AfterimageGroup {
  textureLayer: THREE.Mesh | null;
  particleLayer: THREE.Points | null;
  billboard: THREE.Group;
}

function createAfterimageSystem(
  system: import('../types').AfterimageSystemSettings,
  coreRadius: number,
  isMobile: boolean
): AfterimageGroup {
  const billboard = new THREE.Group();
  billboard.name = 'afterimageSystem';
  
  // 获取区域配置
  const zone = system.zones[0] || {
    id: 'default',
    name: '默认',
    enabled: true,
    startAngle: 45,
    angleSpan: 90,
    sideLineType: 'straight' as const,
    sideLineLength: 2.0,
    sideLineAngle: 90,
    curveBendDirection: 'outward' as const,
    curveBendStrength: 0.5
  };
  
  const particles = system.particles;
  const texture = system.texture;
  
  // 解析侧边类型和曲线方向
  const sideLineType = zone.sideLineType === 'curve' ? 1.0 : 0.0;
  const curveBend = zone.curveBendDirection === 'inward' ? -1.0 : 1.0;
  
  // ===== 创建纹理层（流动火焰效果）=====
  let textureLayer: THREE.Mesh | null = null;
  {
    const planeSize = coreRadius * zone.sideLineLength * 3;
    const planeGeometry = new THREE.PlaneGeometry(planeSize, planeSize);
    
    const textureMaterial = new THREE.ShaderMaterial({
      vertexShader: afterimageTextureVertexShader,
      fragmentShader: afterimageTextureFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCoreRadius: { value: coreRadius },
        uPlaneSize: { value: planeSize },
        uColor1: { value: hexToVec3(texture.colors?.[0] || '#ff00ff') },
        uColor2: { value: hexToVec3(texture.colors?.[1] || '#ff66ff') },
        uColor3: { value: hexToVec3(texture.colors?.[2] || '#ffffff') },
        uOpacity: { value: texture.opacity ?? 0.8 },
        uFlowSpeed: { value: texture.flowSpeed ?? 0.5 },
        uNoiseScale: { value: texture.noiseScale ?? 1.0 },
        uStretchFactor: { value: texture.stretchFactor ?? 2.0 },
        // 条纹效果参数
        uStripeIntensity: { value: texture.stripeIntensity ?? 0 },
        uStripeCount: { value: texture.stripeCount ?? 8 },
        uDirectionalStretch: { value: texture.directionalStretch ?? 1 },
        uEdgeSharpness: { value: texture.edgeSharpness ?? 0 },
        uDistortion: { value: texture.distortion ?? 0 },
        // 纹理模式
        uTextureMode: { value: texture.textureMode === 'energy' ? 1.0 : 0.0 },
        // 能量罩参数
        uEnergyFlameScale: { value: texture.energyFlameScale ?? 2.0 },
        uEnergyDensity: { value: texture.energyDensity ?? 0.5 },
        uEnergyFlowSpeed: { value: texture.energyFlowSpeed ?? 0.5 },
        uEnergyTurbulence: { value: texture.energyTurbulence ?? 0.5 },
        uEnergyNoiseType: { value: texture.energyNoiseType === 'voronoi' ? 1.0 : 0.0 },
        uEnergyFractalLayers: { value: texture.energyFractalLayers ?? 3 },
        uEnergyDirection: { value: texture.energyDirection === 'spiral' ? 1.0 : 0.0 },
        uEnergyPulseEnabled: { value: texture.energyPulseEnabled ? 1.0 : 0.0 },
        uEnergyPulseSpeed: { value: texture.energyPulseSpeed ?? 1.0 },
        uEnergyPulseIntensity: { value: texture.energyPulseIntensity ?? 0.3 },
        // 区域参数
        uStartAngle: { value: THREE.MathUtils.degToRad(zone.startAngle) },
        uAngleSpan: { value: THREE.MathUtils.degToRad(zone.angleSpan) },
        uSideLength: { value: zone.sideLineLength },
        uSideAngle: { value: THREE.MathUtils.degToRad((zone.sideLineAngle || 90) - 90) },
        uSideLineType: { value: sideLineType },
        uCurveBend: { value: curveBend },
        uCurveStrength: { value: zone.curveBendStrength || 0.5 }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide
    });
    
    textureLayer = new THREE.Mesh(planeGeometry, textureMaterial);
    textureLayer.name = 'afterimageTexture';
    textureLayer.renderOrder = 15;
    textureLayer.visible = system.enabled && (texture.enabled ?? false);
    billboard.add(textureLayer);
  }
  
  // 创建粒子层
  let particleLayer: THREE.Points | null = null;
  {
    const particleCount = isMobile ? Math.floor(100 * 2) : Math.floor(100 * 5);  // 固定数量
    
    const positions = new Float32Array(particleCount * 3);
    const progresses = new Float32Array(particleCount);
    const randoms = new Float32Array(particleCount);
    const angles = new Float32Array(particleCount);
    
    for (let i = 0; i < particleCount; i++) {
      // 粒子初始位置在原点（着色器中会动态计算位置）
      // aAngle 是 0-1 的相对值（在区域角度跨度内的位置）
      const relativeAngle = Math.random();  // 0-1
      
      positions[i * 3] = 0;
      positions[i * 3 + 1] = 0;
      positions[i * 3 + 2] = 0;
      
      progresses[i] = Math.random();
      randoms[i] = Math.random();
      angles[i] = relativeAngle;
    }
    
    const particleGeometry = new THREE.BufferGeometry();
    particleGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeometry.setAttribute('aProgress', new THREE.BufferAttribute(progresses, 1));
    particleGeometry.setAttribute('aRandom', new THREE.BufferAttribute(randoms, 1));
    particleGeometry.setAttribute('aAngle', new THREE.BufferAttribute(angles, 1));
    
    const sizeDecayIndex = particles.sizeDecay === 'none' ? 0 : particles.sizeDecay === 'linear' ? 1 : 2;
    const colorModeIndex = particles.colorMode === 'single' ? 0 : 1;
    
    const particleMaterial = new THREE.ShaderMaterial({
      vertexShader: afterimageParticleVertexShader,
      fragmentShader: afterimageParticleFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uCoreRadius: { value: coreRadius },
        uSpeed: { value: particles.speed },
        uSpeedRandomness: { value: particles.speedRandomness },
        uLifespan: { value: particles.lifespan },
        uSize: { value: particles.size },
        uSizeDecay: { value: sizeDecayIndex },
        // 区域参数
        uStartAngle: { value: THREE.MathUtils.degToRad(zone.startAngle) },
        uAngleSpan: { value: THREE.MathUtils.degToRad(zone.angleSpan) },
        uSideLength: { value: zone.sideLineLength },
        uSideAngle: { value: THREE.MathUtils.degToRad((zone.sideLineAngle || 90) - 90) },
        uSideLineType: { value: sideLineType },
        uCurveBend: { value: curveBend },
        uCurveStrength: { value: zone.curveBendStrength || 0.5 },
        // 粒子颜色
        uColor1: { value: hexToVec3(particles.colors[0] || '#ff4400') },
        uColor2: { value: hexToVec3(particles.colors[1] || '#ffff00') },
        uColorMode: { value: colorModeIndex }
      },
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    
    particleLayer = new THREE.Points(particleGeometry, particleMaterial);
    particleLayer.name = 'afterimageParticles';
    particleLayer.renderOrder = 16;
    // 初始可见性根据 particles.enabled 设置
    particleLayer.visible = system.enabled && particles.enabled;
    billboard.add(particleLayer);
  }
  
  return { textureLayer, particleLayer, billboard };
}

// ==================== 相机信息类型 ====================

export interface CameraInfo {
  position: { x: number; y: number; z: number };
  distance: number;
  polarAngle: number;  // 极角（垂直角度）
  azimuthAngle: number; // 方位角（水平角度）
}

// ==================== 组件 Props ====================

interface PlanetSceneProps {
  settings: PlanetSceneSettings;
  handData: React.MutableRefObject<HandData>;
  onCameraChange?: (info: CameraInfo) => void;
  resetCameraRef?: React.MutableRefObject<(() => void) | null>;
}

// 初始相机设置
const INITIAL_CAMERA = {
  position: { x: 0, y: 0, z: 500 },
  target: { x: 0, y: 0, z: 0 }
};

// ==================== 主组件 ====================

const PlanetScene: React.FC<PlanetSceneProps> = ({ settings, handData, onCameraChange, resetCameraRef }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const animationFrameRef = useRef<number>(0);
  const clockRef = useRef(new THREE.Clock());
  
  // 存储所有星球的 mesh 引用
  const planetMeshesRef = useRef<Map<string, {
    core: THREE.Group;  // 包含粒子核心和实体核心
    flames: THREE.Group; // 火焰系统
    rings: THREE.Group;
    radiation: THREE.Group;
    fireflies: THREE.Group;
    magicCircles: THREE.Group;        // 法阵组
    energyBodies: THREE.Group;        // 能量体组
    emitters: any[]; // 存储发射器数据
    fireflyData: FireflyRuntimeData[]; // 流萤运行时数据
    magicCircleData: MagicCircleRuntimeData[]; // 法阵运行时数据
    energyBodyData: EnergyBodyRuntimeData[]; // 能量体运行时数据
  }>>(new Map());
  
  // 后处理 passes
  const afterimagePassRef = useRef<AfterimagePass | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const chromaticPassRef = useRef<ShaderPass | null>(null);
  const vignettePassRef = useRef<ShaderPass | null>(null);
  
  // 贴图缓存
  const textureCache = useRef<Map<string, THREE.Texture>>(new Map());
  
  // 背景球体
  const backgroundSphereRef = useRef<THREE.Mesh | null>(null);
  const backgroundTextureRef = useRef<THREE.Texture | null>(null);
  
  // ===== 上升效果 Refs =====
  // 璀璨星雨
  const starRainRef = useRef<{
    points: THREE.Points;
    positions: Float32Array;
    velocities: Float32Array;
    ages: Float32Array;
    maxAges: Float32Array;
    sizes: Float32Array;
    maxCount: number;
  } | null>(null);
  
  // 体积薄雾
  const volumeFogRef = useRef<THREE.Group | null>(null);
  
  // 光球灯笼
  const lightOrbsRef = useRef<{
    group: THREE.Group;
    orbs: Array<{
      mesh: THREE.Mesh;
      age: number;
      maxAge: number;
      speed: number;
      drift: { x: number; z: number };
      burstTriggered: boolean;
    }>;
    lastSpawnTime: number;
  } | null>(null);
  
  // 直冲电弧
  const electricArcsRef = useRef<{
    group: THREE.Group;
    arcs: Array<{
      mesh: THREE.Group;
      age: number;
      maxAge: number;
      phase: 'rising' | 'holding' | 'fading';
    }>;
    lastTriggerTime: number;
  } | null>(null);

  // 初始化场景
  useEffect(() => {
    if (!containerRef.current) return;
    
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // 创建场景
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;
    
    // 监听主题变化，更新背景色（当全景图背景未启用时）
    const updateSceneBackgroundColor = () => {
      // 如果全景图背景已启用，不修改背景
      const bgSettings = settingsRef.current?.background;
      if (bgSettings?.enabled) return;
      
      const style = getComputedStyle(document.documentElement);
      const isLight = document.documentElement.classList.contains('theme-light');
      if (isLight) {
        // 浅色模式：读取自定义背景色
        const lightBg = style.getPropertyValue('--custom-light-bg').trim() || '#F4F1EC';
        scene.background = new THREE.Color(lightBg);
      } else {
        // 深色模式：读取自定义背景色
        const darkBg = style.getPropertyValue('--custom-dark-bg').trim() || '#000000';
        scene.background = new THREE.Color(darkBg);
      }
    };
    
    // 初始化时执行一次
    updateSceneBackgroundColor();
    
    // 监听主题类变化（只监听 class，不监听 style，避免主题色变化触发）
    const themeObserver = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          updateSceneBackgroundColor();
        }
      });
    });
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    
    // 清理函数中断开观察者
    const disconnectThemeObserver = () => themeObserver.disconnect();
    
    // 创建相机
    const camera = new THREE.PerspectiveCamera(60, width / height, 1, 10000);
    camera.position.set(0, 0, 500);
    cameraRef.current = camera;
    
    // 检测移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
    
    // 创建渲染器 - 移动端使用更保守设置
    const renderer = new THREE.WebGLRenderer({ 
      antialias: !isMobile, // 移动端禁用抗锯齿
      alpha: true,
      powerPreference: isMobile ? 'default' : 'high-performance'
    });
    renderer.setSize(width, height);
    // 移动端限制像素比
    const maxPixelRatio = isMobile ? 1.5 : 2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, maxPixelRatio));
    // Tone Mapping - 关键配置，让高亮超过1.0的颜色正确显示发光感
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // 创建背景球体（用于全景图）
    const bgGeometry = new THREE.SphereGeometry(5000, 64, 32);
    const bgMaterial = new THREE.ShaderMaterial({
      vertexShader: backgroundVertexShader,
      fragmentShader: backgroundFragmentShader,
      uniforms: {
        uTexture: { value: null },
        uBrightness: { value: 1.0 },
        uSaturation: { value: 1.0 }
      },
      side: THREE.BackSide,  // 从内部看
      fog: false,
      depthWrite: false
    });
    const bgSphere = new THREE.Mesh(bgGeometry, bgMaterial);
    bgSphere.renderOrder = -1000; // 最先渲染
    bgSphere.visible = false; // 初始隐藏
    scene.add(bgSphere);
    backgroundSphereRef.current = bgSphere;
    
    // 创建控制器
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.autoRotate = true;
    controls.autoRotateSpeed = 0.5;
    // 移动端启用触摸
    controls.touches = {
      ONE: THREE.TOUCH.ROTATE,
      TWO: THREE.TOUCH.DOLLY_PAN
    };
    controlsRef.current = controls;
    
    // 创建后处理 - 移动端降低分辨率
    const postProcessScale = isMobile ? 0.5 : 1.0;
    const ppWidth = Math.floor(width * postProcessScale);
    const ppHeight = Math.floor(height * postProcessScale);
    
    const composer = new EffectComposer(renderer);
    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);
    
    // Bloom - 移动端降低强度
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(ppWidth, ppHeight),
      isMobile ? Math.min(settings.bloomStrength, 1.0) : settings.bloomStrength,
      0.4,
      0.85
    );
    composer.addPass(bloomPass);
    bloomPassRef.current = bloomPass;
    
    // Afterimage (拖尾) - 移动端禁用
    const afterimagePass = new AfterimagePass(
      (settings.trailEnabled && !isMobile) ? settings.trailLength : 0
    );
    if (!isMobile) {
      composer.addPass(afterimagePass);
    }
    afterimagePassRef.current = afterimagePass;
    
    // 色差效果
    const chromaticPass = new ShaderPass(ChromaticAberrationShader);
    chromaticPass.enabled = false; // 默认禁用，由设置控制
    composer.addPass(chromaticPass);
    chromaticPassRef.current = chromaticPass;
    
    // 暗角效果
    const vignettePass = new ShaderPass(VignetteShader);
    vignettePass.enabled = false; // 默认禁用，由设置控制
    composer.addPass(vignettePass);
    vignettePassRef.current = vignettePass;
    
    composerRef.current = composer;
    
    // ===== 初始化上升效果 =====
    // 1. 璀璨星雨
    const starRainMaxCount = 1500; // 最大粒子数（缓冲区大小）
    const starRainGeometry = new THREE.BufferGeometry();
    const starRainPositions = new Float32Array(starRainMaxCount * 3);
    const starRainColors = new Float32Array(starRainMaxCount * 3);
    const starRainSizes = new Float32Array(starRainMaxCount);
    const starRainVelocities = new Float32Array(starRainMaxCount);
    const starRainAges = new Float32Array(starRainMaxCount);
    const starRainMaxAges = new Float32Array(starRainMaxCount);
    
    for (let i = 0; i < starRainMaxCount; i++) {
      // 随机初始位置
      starRainPositions[i * 3] = (Math.random() - 0.5) * 300;
      starRainPositions[i * 3 + 1] = Math.random() * 300 - 50;
      starRainPositions[i * 3 + 2] = (Math.random() - 0.5) * 300;
      // 颜色（蓝色调）
      starRainColors[i * 3] = 0.5 + Math.random() * 0.3;
      starRainColors[i * 3 + 1] = 0.7 + Math.random() * 0.3;
      starRainColors[i * 3 + 2] = 1.0;
      // 大小（基础值，会被 uniform 缩放）
      starRainSizes[i] = 0.5 + Math.random() * 1.0;
      // 速度
      starRainVelocities[i] = 0.5 + Math.random() * 1.0;
      // 生命周期
      starRainAges[i] = Math.random() * 5;
      starRainMaxAges[i] = 3 + Math.random() * 4;
    }
    
    starRainGeometry.setAttribute('position', new THREE.BufferAttribute(starRainPositions, 3));
    starRainGeometry.setAttribute('color', new THREE.BufferAttribute(starRainColors, 3));
    starRainGeometry.setAttribute('size', new THREE.BufferAttribute(starRainSizes, 1));
    
    const starRainMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uBrightness: { value: 1.5 },
        uSizeScale: { value: 3.0 },
        uMaxHeight: { value: 300.0 },
        uTrailLength: { value: 0.4 }
      },
      vertexShader: `
        attribute float size;
        attribute vec3 color;
        varying vec3 vColor;
        varying float vAlpha;
        varying float vTrail;
        uniform float uTime;
        uniform float uSizeScale;
        uniform float uMaxHeight;
        void main() {
          vColor = color;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = size * uSizeScale * (300.0 / -mvPosition.z);
          gl_Position = projectionMatrix * mvPosition;
          // 根据高度计算透明度（使用动态高度）
          float heightRatio = position.y / uMaxHeight;
          vAlpha = 1.0 - smoothstep(0.3, 1.0, heightRatio);
          vTrail = heightRatio;
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vAlpha;
        varying float vTrail;
        uniform float uBrightness;
        uniform float uTrailLength;
        void main() {
          float d = length(gl_PointCoord - vec2(0.5));
          if (d > 0.5) discard;
          // 拖尾效果：根据 trailLength 调整亮度衰减
          float trailFade = 1.0 - vTrail * (1.0 - uTrailLength);
          float alpha = (1.0 - d * 2.0) * vAlpha * trailFade;
          gl_FragColor = vec4(vColor * uBrightness, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const starRainPoints = new THREE.Points(starRainGeometry, starRainMaterial);
    starRainPoints.visible = false;
    scene.add(starRainPoints);
    starRainRef.current = {
      points: starRainPoints,
      positions: starRainPositions,
      velocities: starRainVelocities,
      ages: starRainAges,
      maxAges: starRainMaxAges,
      sizes: starRainSizes,
      maxCount: starRainMaxCount
    };
    
    // 2. 体积薄雾
    const volumeFogGroup = new THREE.Group();
    volumeFogGroup.visible = false;
    const fogLayerCount = 7;
    const fogMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uOpacity: { value: 0.12 },
        uColor: { value: new THREE.Color(0x4488cc) }
      },
      vertexShader: `
        varying vec2 vUv;
        varying float vHeight;
        void main() {
          vUv = uv;
          vHeight = position.y;
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        uniform float uTime;
        uniform float uOpacity;
        uniform vec3 uColor;
        varying vec2 vUv;
        varying float vHeight;
        
        float noise(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }
        
        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise(p);
            p *= 2.0;
            a *= 0.5;
          }
          return v;
        }
        
        void main() {
          vec2 uv = vUv;
          float n = fbm(uv * 3.0 + uTime * 0.1);
          float alpha = uOpacity * n * (1.0 - length(uv - 0.5) * 1.5);
          alpha *= smoothstep(0.0, 0.3, 1.0 - abs(vHeight) / 100.0);
          gl_FragColor = vec4(uColor, alpha);
        }
      `,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    for (let i = 0; i < fogLayerCount; i++) {
      const fogGeometry = new THREE.RingGeometry(50, 180, 64);
      const fogMesh = new THREE.Mesh(fogGeometry, fogMaterial.clone());
      fogMesh.rotation.x = -Math.PI / 2;
      fogMesh.position.y = i * 20 - 30;
      fogMesh.userData.layerIndex = i;
      volumeFogGroup.add(fogMesh);
    }
    scene.add(volumeFogGroup);
    volumeFogRef.current = volumeFogGroup;
    
    // 3. 光球灯笼
    const lightOrbsGroup = new THREE.Group();
    lightOrbsGroup.visible = false;
    scene.add(lightOrbsGroup);
    lightOrbsRef.current = {
      group: lightOrbsGroup,
      orbs: [],
      lastSpawnTime: 0
    };
    
    // 4. 直冲电弧
    const electricArcsGroup = new THREE.Group();
    electricArcsGroup.visible = false;
    scene.add(electricArcsGroup);
    electricArcsRef.current = {
      group: electricArcsGroup,
      arcs: [],
      lastTriggerTime: 0
    };
    
    // 响应式
    const handleResize = () => {
      if (!container || !camera || !renderer || !composer) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
    
    // 清理
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameRef.current);
      disconnectThemeObserver(); // 断开主题监听
      renderer.dispose();
      container.removeChild(renderer.domElement);
    };
  }, []);

  // 使用 ref 存储 settings，避免动画循环重建
  const settingsRef = useRef(settings);
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);
  
  // 生成星球几何体相关参数的 hash key（这些参数变化需要重建几何体）
  // 生成几何体参数Key
  const generateGeometryKey = (planets: typeof settings.planets, soloCoreId: string | null | undefined) => {
    // 包含全局控制参数
    const globalKey = `solo:${soloCoreId || 'none'}`;
    
    const planetsKey = planets.map(p => {
      // 星球基础信息
      const planetBaseKey = `id:${p.id}:enabled:${p.enabled}`;
      
      // 核心类型（为旧数据提供默认值保护）
      const coreSystem = p.coreSystem;
      const coreTypeKey = `type:${coreSystem?.coreType || 'particle'}`;
      
      // 实体核心参数（多实例）
      const solidCores = coreSystem?.solidCores || (coreSystem?.solidCore ? [coreSystem.solidCore] : []);
      const solidCoreKey = `solidEnabled:${coreSystem?.solidCoresEnabled ?? true}|` + solidCores.map(sc => 
        `${sc.id}:${sc.enabled}:${sc.radius ?? 100}:${sc.hue ?? 0}:${sc.saturation ?? 1}:${sc.lightness ?? 0.5}:${sc.scale ?? 3}:${sc.speed ?? 0.5}:${sc.contrast ?? 3}:${sc.bandMix ?? 0}:${sc.ridgeMix ?? 0}:${sc.gridMix ?? 0}:${sc.opacity ?? 1}:${sc.brightness ?? 1}:${sc.glowHue ?? 0.5}:${sc.glowSaturation ?? 1}:${sc.glowLength ?? 2}:${sc.glowStrength ?? 1}:${sc.glowRadius ?? 0.2}:${sc.glowFalloff ?? 2}:${sc.glowInward ?? false}:${sc.glowBloomBoost ?? 1}`
      ).join('|');
      
      // 粒子核心参数 - 支持多核心，包含全局开关
      const cores = coreSystem?.cores || [];
      const coresKey = `enabled:${coreSystem?.coresEnabled ?? true}|` + cores.map(c => {
        const g = c.gradientColor;
        const gradKey = g?.enabled ? 
          `${g.mode}:${g.colors?.join(',')}:${g.colorMidPosition}:${g.direction}:${g.directionCustom?.x},${g.directionCustom?.y},${g.directionCustom?.z}:${g.spiralDensity}:${g.spiralAxis}:${g.proceduralAxis}:${g.proceduralCustomAxis?.x},${g.proceduralCustomAxis?.y},${g.proceduralCustomAxis?.z}:${g.proceduralIntensity}` : 
          '';
        return `${c.id}:${c.enabled}:${c.fillMode}:${c.fillPercent}:${c.density}:${c.baseRadius}:${c.baseHue}:${c.baseSaturation ?? 1}:${c.gradientColor?.enabled}:${gradKey}:${c.brightness}:${c.particleSize}:${c.trailLength ?? 0}`;
      }).join('|');
      // 环参数 - 使用绝对半径字段, brightness, particleSize，包含全局开关和完整颜色模式
      const ringsKey = `pr:${p.rings.particleRingsEnabled}|` + p.rings.particleRings.map(r => {
        const g = r.gradientColor;
        const gKey = g?.enabled ? `${g.mode}:${g.colors?.join(',')}:${g.colorMidPosition}:${g.direction}:${g.directionCustom?.x},${g.directionCustom?.y},${g.directionCustom?.z}:${g.spiralDensity}:${g.proceduralIntensity}` : '';
        const v = r.vortex;
        const vKey = v?.enabled ? `${v.armCount}:${v.twist}:${v.hardness}:${v.colors?.join(',')}` : '';
        return `${r.id}:${r.enabled}:${r.eccentricity}:${r.absoluteRadius}:${r.particleDensity}:${r.bandwidth}:${r.thickness}:${r.color}:${r.brightness}:${r.particleSize}:${r.tilt?.axis}:${r.tilt?.angle}:${r.trailLength ?? 0}:${r.rotationSpeed}:${r.orbitAxis?.axis}:${r.orbitAxis?.angle}:${g?.enabled}:${gKey}:${v?.enabled}:${vKey}`;
      }).join('|') + `/cr:${p.rings.continuousRingsEnabled}|` + p.rings.continuousRings.map(r => {
        const g = r.gradientColor;
        const gKey = g?.enabled ? `${g.mode}:${g.colors?.join(',')}:${g.colorMidPosition}:${g.direction}:${g.directionCustom?.x},${g.directionCustom?.y},${g.directionCustom?.z}:${g.spiralDensity}:${g.proceduralIntensity}` : '';
        const v = r.vortex;
        const vKey = v?.enabled ? `${v.armCount}:${v.twist}:${v.rotationSpeed}:${v.radialDirection}:${v.radialSpeed}:${v.hardness}:${v.colors?.join(',')}` : '';
        return `${r.id}:${r.enabled}:${r.eccentricity}:${r.absoluteInnerRadius}:${r.absoluteOuterRadius}:${r.color}:${r.opacity}:${r.opacityGradient}:${r.opacityGradientStrength ?? 0.5}:${r.brightness}:${r.tilt?.axis}:${r.tilt?.angle}:${r.rotationSpeed}:${r.orbitAxis?.axis}:${r.orbitAxis?.angle}:${g?.enabled}:${gKey}:${v?.enabled}:${vKey}`;
      }).join('|');
      // 辐射参数 - 支持多个，包含全局开关
      // 注意：粒子喷射的动态参数（emissionRangeMin/Max, fadeOutStrength等）在动画循环中实时读取，不需要放入 geometryKey
      const radKey = `orb:${p.radiation.orbitingEnabled}|` + p.radiation.orbitings.map(o =>
        `${o.id}:${o.enabled}:${o.particleDensity}:${o.orbitRadius}:${o.thickness}:${o.color}:${o.brightness}:${o.particleSize}:${o.baseSpeed}:${o.mainDirection?.x},${o.mainDirection?.y},${o.mainDirection?.z}:${o.fadeStrength}`
      ).join('|') + `/emit:${p.radiation.emitterEnabled}|` + p.radiation.emitters.map(e =>
        `${e.id}:${e.enabled}`
      ).join('|');
      // 流萤参数 - 使用绝对半径字段, brightness，包含全局开关
      const fireflyKey = `orb:${p.fireflies.orbitingEnabled}|` + p.fireflies.orbitingFireflies.map(f =>
        `${f.id}:${f.enabled}:${f.size}:${f.absoluteOrbitRadius}:${f.color}:${f.trailEnabled}:${f.trailLength}:${f.brightness}`
      ).join('|') + `/wander:${p.fireflies.wanderingEnabled}|` + p.fireflies.wanderingGroups.map(g =>
        `${g.id}:${g.enabled}:${g.count}:${g.size}:${g.color}:${g.brightness}`
      ).join('|');
      // 法阵参数
      const magicCircleKey = `mc:${p.magicCircles?.enabled ?? false}|` + (p.magicCircles?.circles || []).map(c =>
        `${c.id}:${c.enabled}:${c.texture}:${c.radius}`
      ).join('|');
      // 能量体参数 - 只包含拓扑相关参数（几何体结构），样式通过 uniforms 同步
      // 拓扑参数：polyhedronType, radius, subdivisionLevel, spherize, renderMode
      // 顶点开关/形状、薄壳开关、Voronoi 配置会影响 mesh 创建
      // 样式参数（color, opacity, glowIntensity 等）不在此处，通过 uniforms 动态更新
      const energyBodyKey = `eb:${p.energyBodySystem?.enabled ?? false}|` + (p.energyBodySystem?.energyBodies || []).map(e =>
        `${e.id}:${e.enabled}:${e.polyhedronType}:${e.radius}:${e.subdivisionLevel}:${e.spherize}:${e.renderMode}:` +
        `vertex:${e.vertexEffect?.enabled}:${e.vertexEffect?.shape}:` +
        `shell:${e.shellEffect?.enabled}:` +
        `voronoi:${e.sphericalVoronoi?.enabled}:${e.sphericalVoronoi?.cellCount}:${e.sphericalVoronoi?.seedDistribution}:` +
        `lightflow:${e.lightFlow?.enabled}:${e.lightFlow?.pathMode}:${e.lightFlow?.count}`  // 光流启用状态影响图构建
      ).join('|');
      // 火焰系统参数 - 需要重建几何体的参数
      const flameSystem = p.flameSystem;
      const flameKey = `flame:${flameSystem?.enabled ?? false}|` +
        `surface:` + (flameSystem?.surfaceFlames || []).map(f => `${f.id}:${f.enabled}:${f.radius}`).join(',') + '|' +
        `jet:` + (flameSystem?.flameJets || []).map(j => `${j.id}:${j.enabled}:${j.particleCount}:${j.sourceType}:${j.hotspotCount}`).join(',') + '|' +
        `spiral:` + (flameSystem?.spiralFlames || []).map(s => `${s.id}:${s.enabled}:${s.particleCount}:${s.spiralCount}`).join(',');
      // 残影系统参数 - 启用状态和区域配置变化需要重建
      const afterimageSystem = p.afterimageSystem;
      const afterimageKey = `afterimage:${afterimageSystem?.enabled ?? false}|` +
        `texture:${afterimageSystem?.texture?.enabled ?? false}|` +
        `particles:${afterimageSystem?.particles?.enabled ?? false}|` +
        `zones:` + (afterimageSystem?.zones || []).map(z => 
          `${z.id}:${z.enabled}:${z.startAngle}:${z.angleSpan}:${z.sideLineLength}:${z.sideLineAngle}:${z.sideLineType}:${z.curveBendDirection}:${z.curveBendStrength}:${z.outerBoundaryShape}`
        ).join(',');
      return `${planetBaseKey}#${coreTypeKey}#${solidCoreKey}#${coresKey}#${ringsKey}#${radKey}#${fireflyKey}#${magicCircleKey}#${energyBodyKey}#${flameKey}#${afterimageKey}`;
    }).join(',');
    
    return `${globalKey}@${planetsKey}`;
  };
  
  const geometryKey = generateGeometryKey(settings.planets, settings.soloCoreId);
  const lastGeometryKeyRef = useRef<string>('');
  
  // 根据设置创建/更新星球
  useEffect(() => {
    if (!sceneRef.current) return;
    
    const scene = sceneRef.current;
    // 直接使用 settings 确保获取最新值（包括 soloCoreId）
    const currentSettings = settings;
    
    // 检测几何体参数变化
    const needsRebuild = geometryKey !== lastGeometryKeyRef.current;
    
    // 需要重建时
    if (needsRebuild || planetMeshesRef.current.size === 0) {
      lastGeometryKeyRef.current = geometryKey;
      
      // 清除现有星球
      planetMeshesRef.current.forEach((meshes) => {
        // 释放资源 - 统一使用递归遍历确保所有嵌套对象都被释放
        const disposeAndClearGroup = (group: THREE.Object3D) => {
          // 先遍历释放资源
          group.traverse((obj: any) => {
            if (obj.geometry) {
              obj.geometry.dispose();
              obj.geometry = null;
            }
            if (obj.material) {
              if (Array.isArray(obj.material)) {
                obj.material.forEach((m: THREE.Material) => m.dispose());
              } else {
                obj.material.dispose();
              }
              obj.material = null;
            }
          });
          // 递归移除所有子对象
          while (group.children.length > 0) {
            const child = group.children[0];
            if (child.children && child.children.length > 0) {
              disposeAndClearGroup(child);
            }
            group.remove(child);
          }
        };
        
        // 先释放和清空，再从场景移除
        disposeAndClearGroup(meshes.core);
        disposeAndClearGroup(meshes.flames);
        disposeAndClearGroup(meshes.rings);
        disposeAndClearGroup(meshes.radiation);
        disposeAndClearGroup(meshes.fireflies);
        disposeAndClearGroup(meshes.magicCircles);
        disposeAndClearGroup(meshes.energyBodies);
        
        scene.remove(meshes.core);
        scene.remove(meshes.flames);
        scene.remove(meshes.rings);
        scene.remove(meshes.radiation);
        scene.remove(meshes.fireflies);
        scene.remove(meshes.magicCircles);
        scene.remove(meshes.energyBodies);
      });
      planetMeshesRef.current.clear();
      
      // 创建新星球
      currentSettings.planets.forEach(planet => {
        if (!planet.enabled) return;
        
        const meshes = createPlanetMeshes(planet, currentSettings);
        planetMeshesRef.current.set(planet.id, meshes);
        
        // 设置位置
        const pos = planet.position;
        meshes.core.position.set(pos.x, pos.y, pos.z);
        meshes.flames.position.set(pos.x, pos.y, pos.z);
        meshes.rings.position.set(pos.x, pos.y, pos.z);
        meshes.radiation.position.set(pos.x, pos.y, pos.z);
        meshes.fireflies.position.set(pos.x, pos.y, pos.z);
        meshes.magicCircles.position.set(pos.x, pos.y, pos.z);
        meshes.energyBodies.position.set(pos.x, pos.y, pos.z);
        
        // 设置缩放
        meshes.core.scale.setScalar(planet.scale);
        meshes.flames.scale.setScalar(planet.scale);
        meshes.rings.scale.setScalar(planet.scale);
        meshes.radiation.scale.setScalar(planet.scale);
        meshes.fireflies.scale.setScalar(planet.scale);
        meshes.magicCircles.scale.setScalar(planet.scale);
        meshes.energyBodies.scale.setScalar(planet.scale);
        
        scene.add(meshes.core);
        scene.add(meshes.flames);
        scene.add(meshes.rings);
        scene.add(meshes.radiation);
        scene.add(meshes.fireflies);
        scene.add(meshes.magicCircles);
        scene.add(meshes.energyBodies);
      });
    } else {
      // 只更新位置和缩放（这些不需要重建几何体）
      currentSettings.planets.forEach(planet => {
        const meshes = planetMeshesRef.current.get(planet.id);
        if (meshes) {
          const pos = planet.position;
          meshes.core.position.set(pos.x, pos.y, pos.z);
          meshes.flames.position.set(pos.x, pos.y, pos.z);
          meshes.rings.position.set(pos.x, pos.y, pos.z);
          meshes.radiation.position.set(pos.x, pos.y, pos.z);
          meshes.fireflies.position.set(pos.x, pos.y, pos.z);
          meshes.magicCircles.position.set(pos.x, pos.y, pos.z);
          meshes.energyBodies.position.set(pos.x, pos.y, pos.z);
          
          meshes.core.scale.setScalar(planet.scale);
          meshes.flames.scale.setScalar(planet.scale);
          meshes.rings.scale.setScalar(planet.scale);
          meshes.radiation.scale.setScalar(planet.scale);
          meshes.fireflies.scale.setScalar(planet.scale);
          meshes.magicCircles.scale.setScalar(planet.scale);
          meshes.energyBodies.scale.setScalar(planet.scale);
        }
      });
    }
  }, [geometryKey, settings]);

  // 更新后处理效果
  useEffect(() => {
    if (bloomPassRef.current) {
      bloomPassRef.current.strength = settings.bloomStrength;
    }
    if (afterimagePassRef.current) {
      afterimagePassRef.current.uniforms['damp'].value = settings.trailEnabled ? settings.trailLength : 0;
    }
  }, [settings.bloomStrength, settings.trailEnabled, settings.trailLength]);

  // 更新相机设置
  useEffect(() => {
    if (controlsRef.current) {
      controlsRef.current.autoRotate = settings.cameraAutoRotate;
      controlsRef.current.autoRotateSpeed = settings.cameraAutoRotateSpeed;
    }
  }, [settings.cameraAutoRotate, settings.cameraAutoRotateSpeed]);

  // 更新背景设置
  useEffect(() => {
    const bgSphere = backgroundSphereRef.current;
    if (!bgSphere) return;
    
    const bgSettings = settings.background;
    const mat = bgSphere.material as THREE.ShaderMaterial;
    
    if (!bgSettings?.enabled) {
      // 禁用背景时显示纯黑
      bgSphere.visible = false;
      if (sceneRef.current) {
        sceneRef.current.background = new THREE.Color(0x000000);
      }
      return;
    }
    
    // 启用背景
    bgSphere.visible = true;
    if (sceneRef.current) {
      sceneRef.current.background = null; // 清除纯色背景
    }
    
    // 更新旋转
    bgSphere.rotation.y = (bgSettings.rotation || 0) * Math.PI / 180;
    
    // 更新 uniforms
    mat.uniforms.uBrightness.value = bgSettings.brightness ?? 1.0;
    mat.uniforms.uSaturation.value = bgSettings.saturation ?? 1.0;
    
    // 加载或更新贴图
    const currentUrl = mat.userData?.panoramaUrl;
    
    if (bgSettings.panoramaUrl && bgSettings.panoramaUrl !== currentUrl) {
      // 需要加载新贴图
      const loader = new THREE.TextureLoader();
      loader.load(
        bgSettings.panoramaUrl,
        (texture) => {
          texture.colorSpace = THREE.SRGBColorSpace;
          // 对于全景图球体，使用默认 UV 映射即可
          texture.wrapS = THREE.RepeatWrapping;
          texture.wrapT = THREE.ClampToEdgeWrapping;
          
          mat.uniforms.uTexture.value = texture;
          mat.needsUpdate = true;
          mat.userData = { panoramaUrl: bgSettings.panoramaUrl };
          
          // 释放旧贴图
          if (backgroundTextureRef.current) {
            backgroundTextureRef.current.dispose();
          }
          backgroundTextureRef.current = texture;
          
          console.log('Panorama loaded successfully:', bgSettings.panoramaUrl);
        },
        undefined,
        (error) => {
          console.error('Failed to load panorama:', bgSettings.panoramaUrl, error);
        }
      );
    }
  }, [settings.background?.enabled, settings.background?.panoramaUrl, settings.background?.brightness, settings.background?.saturation, settings.background?.rotation]);

  // 动画循环 - 只在挂载时创建一次
  useEffect(() => {
    let lastFrameTime = 0;
    const targetFPS = 60;
    const frameInterval = 1000 / targetFPS;
    
    const animate = (currentTime: number) => {
      animationFrameRef.current = requestAnimationFrame(animate);
      
      // 帧率限制
      const deltaTime = currentTime - lastFrameTime;
      if (deltaTime < frameInterval) return;
      lastFrameTime = currentTime - (deltaTime % frameInterval);
      
      const time = clockRef.current.getElapsedTime();
      const currentSettings = settingsRef.current;
      
      // 更新控制器
      if (controlsRef.current) {
        controlsRef.current.update();
      }
      
      // === 计算公转位置 ===
      // 使用 Map 存储每个星球的计算后位置（考虑链式公转）
      const computedPositions = new Map<string, THREE.Vector3>();
      
      // 递归计算星球位置（处理链式公转）
      const computePlanetPosition = (planetId: string): THREE.Vector3 => {
        // 如果已计算过，直接返回
        if (computedPositions.has(planetId)) {
          return computedPositions.get(planetId)!;
        }
        
        const planet = currentSettings.planets.find(p => p.id === planetId);
        if (!planet) {
          const pos = new THREE.Vector3(0, 0, 0);
          computedPositions.set(planetId, pos);
          return pos;
        }
        
        // 基础位置
        const basePos = new THREE.Vector3(planet.position.x, planet.position.y, planet.position.z);
        
        // 检查是否有公转配置
        const orbit = planet.orbit;
        if (!orbit?.enabled) {
          computedPositions.set(planetId, basePos);
          return basePos;
        }
        
        // 获取公转中心（目标星球的基础位置或原点）
        let centerPos = new THREE.Vector3(0, 0, 0);
        if (orbit.targetPlanetId) {
          const targetPlanet = currentSettings.planets.find(p => p.id === orbit.targetPlanetId);
          if (targetPlanet) {
            // 使用目标星球的基础位置作为公转中心
            centerPos = new THREE.Vector3(targetPlanet.position.x, targetPlanet.position.y, targetPlanet.position.z);
            // 如果目标星球也在公转，则使用其计算后的位置
            if (targetPlanet.orbit?.enabled) {
              centerPos = computePlanetPosition(orbit.targetPlanetId);
            }
          }
        }
        
        // 计算公转半径：使用当前星球到目标中心的初始距离
        const dx = basePos.x - centerPos.x;
        const dy = basePos.y - centerPos.y;
        const dz = basePos.z - centerPos.z;
        const distanceToCenter = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        // 如果距离为0，使用默认半径
        const orbitRadius = distanceToCenter > 1 ? distanceToCenter : orbit.orbitRadius;
        
        // 计算椭圆轨道位置
        const angle = (time * orbit.orbitSpeed + THREE.MathUtils.degToRad(orbit.initialPhase));
        const e = orbit.eccentricity; // 离心率
        const a = orbitRadius;  // 半长轴（使用计算的距离）
        const b = a * Math.sqrt(1 - e * e); // 半短轴
        
        // 椭圆参数方程
        let x = a * Math.cos(angle);
        let z = b * Math.sin(angle);
        let y = 0;
        
        // 应用轨道倾斜
        if (orbit.tilt) {
          const tiltAngles = getTiltAngles(orbit.tilt);
          
          // 创建旋转矩阵并应用
          const rotMatrix = new THREE.Matrix4();
          rotMatrix.makeRotationFromEuler(new THREE.Euler(
            THREE.MathUtils.degToRad(tiltAngles.x),
            THREE.MathUtils.degToRad(tiltAngles.y),
            THREE.MathUtils.degToRad(tiltAngles.z),
            'XYZ'
          ));
          
          const orbitPos = new THREE.Vector3(x, y, z);
          orbitPos.applyMatrix4(rotMatrix);
          x = orbitPos.x;
          y = orbitPos.y;
          z = orbitPos.z;
        }
        
        // 最终位置 = 中心位置 + 轨道位置
        const finalPos = new THREE.Vector3(
          centerPos.x + x,
          centerPos.y + y,
          centerPos.z + z
        );
        
        computedPositions.set(planetId, finalPos);
        return finalPos;
      };
      
      // 计算并更新所有星球位置
      currentSettings.planets.forEach(planet => {
        if (!planet.enabled) return;
        const meshes = planetMeshesRef.current.get(planet.id);
        if (!meshes) return;
        
        const pos = computePlanetPosition(planet.id);
        meshes.core.position.copy(pos);
        meshes.rings.position.copy(pos);
        meshes.radiation.position.copy(pos);
        meshes.magicCircles.position.copy(pos);
        meshes.energyBodies.position.copy(pos);
        // 注意：fireflies 使用世界坐标系，不需要移动组位置
      });
      
      // 更新每个星球的 uniforms
      planetMeshesRef.current.forEach((meshes, planetId) => {
        const planet = currentSettings.planets.find(p => p.id === planetId);
        if (!planet) return;
        
        // 更新核心（包含粒子核心和实体核心）
        const allCoreGroup = meshes.core as THREE.Group;
        
        // === 实体核心更新（多实例）===
        const solidCoresGroup = allCoreGroup.getObjectByName('solidCores') as THREE.Group | undefined;
        const solidCores = planet.coreSystem?.solidCores || (planet.coreSystem?.solidCore ? [planet.coreSystem.solidCore] : []);
        const solidCoresEnabled = planet.coreSystem?.solidCoresEnabled !== false;
        
        if (solidCoresGroup) {
          solidCoresGroup.children.forEach(child => {
            const solidCoreId = child.userData?.solidCoreId;
            const solidCore = solidCores.find(sc => sc.id === solidCoreId);
            
            // 计算是否显示
            const visible = solidCoresEnabled && (solidCore?.enabled ?? false);
            child.visible = visible;
            
            if (visible && solidCore) {
              const coreMesh = child.getObjectByName('solidCore') as THREE.Mesh | undefined;
              const shellMesh = child.getObjectByName('glowShell') as THREE.Mesh | undefined;
              
              if (coreMesh && coreMesh.material) {
                const material = coreMesh.material as THREE.ShaderMaterial;
                if (material.uniforms) {
              // 更新时间
              material.uniforms.uTime.value = time;
              
              // 动态更新所有 uniform 参数（为旧数据提供默认值保护）
              material.uniforms.uRadius.value = solidCore.radius ?? 100;
              material.uniforms.uScale.value = solidCore.scale ?? 3.0;
              material.uniforms.uSpeed.value = solidCore.speed ?? 0.5;
              material.uniforms.uContrast.value = solidCore.contrast ?? 3.0;
              material.uniforms.uBandMix.value = solidCore.bandMix ?? 0;
              material.uniforms.uRidgeMix.value = solidCore.ridgeMix ?? 0;
              material.uniforms.uGridMix.value = solidCore.gridMix ?? 0;
              // 裂隙系统
              material.uniforms.uCrackEnabled.value = solidCore.crackEnabled ? 1.0 : 0.0;
              material.uniforms.uCrackScale.value = solidCore.crackScale ?? 4.0;
              material.uniforms.uCrackThreshold.value = solidCore.crackThreshold ?? 0.3;
              material.uniforms.uCrackFeather.value = solidCore.crackFeather ?? 0.1;
              material.uniforms.uCrackWarp.value = solidCore.crackWarp ?? 0.5;
              material.uniforms.uCrackWarpScale.value = solidCore.crackWarpScale ?? 1.5;
              material.uniforms.uCrackFlowSpeed.value = solidCore.crackFlowSpeed ?? 0.2;
              material.uniforms.uCrackColor1.value.copy(hexToVec3(solidCore.crackColor1 ?? '#ffffff'));
              material.uniforms.uCrackColor2.value.copy(hexToVec3(solidCore.crackColor2 ?? '#ffaa00'));
              material.uniforms.uCrackEmission.value = solidCore.crackEmission ?? 2.0;
              material.uniforms.uEmissiveStrength.value = solidCore.emissiveStrength ?? 0;
              // 多频叠加
              material.uniforms.uMultiFreqEnabled.value = solidCore.multiFreqEnabled ? 1.0 : 0.0;
              material.uniforms.uWarpIntensity.value = solidCore.warpIntensity ?? 0.5;
              material.uniforms.uWarpScale.value = solidCore.warpScale ?? 1.0;
              material.uniforms.uDetailBalance.value = solidCore.detailBalance ?? 0.3;
              // 法线扰动
              material.uniforms.uBumpEnabled.value = solidCore.bumpEnabled ? 1.0 : 0.0;
              material.uniforms.uBumpStrength.value = solidCore.bumpStrength ?? 0.3;
              material.uniforms.uSpecularStrength.value = solidCore.specularStrength ?? 1.0;
              material.uniforms.uSpecularColor.value.copy(hexToVec3(solidCore.specularColor ?? '#ffffff'));
              material.uniforms.uRoughness.value = solidCore.roughness ?? 32;
              // 定向光
              material.uniforms.uLightEnabled.value = solidCore.lightEnabled ? 1.0 : 0.0;
              const ld = solidCore.lightDirection ?? { x: -1, y: -1, z: 1 };
              material.uniforms.uLightDirection.value.set(ld.x, ld.y, ld.z);
              material.uniforms.uLightColor.value.copy(hexToVec3(solidCore.lightColor ?? '#ffffff'));
              material.uniforms.uLightIntensity.value = solidCore.lightIntensity ?? 1.0;
              material.uniforms.uLightAmbient.value = solidCore.lightAmbient ?? 0.2;
              // 热点辉斑
              material.uniforms.uHotspotEnabled.value = solidCore.hotspotEnabled ? 1.0 : 0.0;
              material.uniforms.uHotspotCount.value = solidCore.hotspotCount ?? 4;
              material.uniforms.uHotspotSize.value = solidCore.hotspotSize ?? 0.15;
              material.uniforms.uHotspotPulseSpeed.value = solidCore.hotspotPulseSpeed ?? 1.0;
              material.uniforms.uHotspotColor.value.copy(hexToVec3(solidCore.hotspotColor ?? '#ffff00'));
              material.uniforms.uHotspotEmission.value = solidCore.hotspotEmission ?? 3.0;
              material.uniforms.uOpacity.value = solidCore.opacity ?? 1.0;
              material.uniforms.uBrightness.value = solidCore.brightness ?? 1.0;
              
              // 动态更新表面颜色系统
              const sc = solidCore.surfaceColor || { mode: 'none', baseColor: '#ff4400', colors: ['#ff4400', '#ffffff'], colorMidPosition: 0.5, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 };
              material.uniforms.uSurfaceColorMode.value = getColorModeIndex(sc.mode);
              material.uniforms.uSurfaceBaseColor.value.copy(hexToVec3(sc.baseColor));
              material.uniforms.uSurfaceColor1.value.copy(hexToVec3(sc.colors?.[0] || sc.baseColor));
              material.uniforms.uSurfaceColor2.value.copy(hexToVec3(sc.colors?.[1] || '#ffffff'));
              material.uniforms.uSurfaceColor3.value.copy(hexToVec3(sc.colors?.[2] || '#ffffff'));
              material.uniforms.uSurfaceColorMidPos.value = sc.colorMidPosition ?? 0.5;
              material.uniforms.uSurfaceColorMidWidth.value = sc.colorMidWidth ?? 1;
              material.uniforms.uSurfaceColorMidWidth2.value = sc.colorMidWidth2 ?? 0;
              material.uniforms.uSurfaceGradientDir.value = getGradientDirIndex(sc.direction);
              material.uniforms.uSurfaceCustomDir.value.set(sc.directionCustom?.x ?? 0, sc.directionCustom?.y ?? 1, sc.directionCustom?.z ?? 0);
              material.uniforms.uSurfaceSpiralDensity.value = sc.spiralDensity ?? 3;
              material.uniforms.uSurfaceProceduralInt.value = sc.proceduralIntensity ?? 1.0;
              
              // 动态更新光晕颜色系统
              const gc = solidCore.glowColor || { mode: 'none', baseColor: '#ff6600', colors: ['#ff6600', '#ffffff'], colorMidPosition: 0.5, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 };
              material.uniforms.uGlowColorMode.value = getColorModeIndex(gc.mode);
              material.uniforms.uGlowBaseColor.value.copy(hexToVec3(gc.baseColor));
              material.uniforms.uGlowColor1.value.copy(hexToVec3(gc.colors?.[0] || gc.baseColor));
              material.uniforms.uGlowColor2.value.copy(hexToVec3(gc.colors?.[1] || '#ffffff'));
              material.uniforms.uGlowColor3.value.copy(hexToVec3(gc.colors?.[2] || '#ffffff'));
              material.uniforms.uGlowColorMidPos.value = gc.colorMidPosition ?? 0.5;
              material.uniforms.uGlowColorMidWidth.value = gc.colorMidWidth ?? 1;
              material.uniforms.uGlowColorMidWidth2.value = gc.colorMidWidth2 ?? 0;
              material.uniforms.uGlowGradientDir.value = getGradientDirIndex(gc.direction);
              material.uniforms.uGlowCustomDir.value.set(gc.directionCustom?.x ?? 0, gc.directionCustom?.y ?? 1, gc.directionCustom?.z ?? 0);
              material.uniforms.uGlowSpiralDensity.value = gc.spiralDensity ?? 3;
              material.uniforms.uGlowProceduralInt.value = gc.proceduralIntensity ?? 1.0;
              
              // 动态更新光晕参数
              material.uniforms.uGlowLength.value = solidCore.glowLength ?? 2.0;
              material.uniforms.uGlowStrength.value = solidCore.glowStrength ?? 1.0;
              material.uniforms.uGlowBloomBoost.value = solidCore.glowBloomBoost ?? 1.0;
              
              // 更新外壳层 uniforms
              if (shellMesh && shellMesh.material) {
                const shellMaterial = shellMesh.material as THREE.ShaderMaterial;
                if (shellMaterial.uniforms) {
                  shellMaterial.uniforms.uGlowColorMode.value = getColorModeIndex(gc.mode);
                  shellMaterial.uniforms.uGlowBaseColor.value.copy(hexToVec3(gc.baseColor));
                  shellMaterial.uniforms.uGlowColor1.value.copy(hexToVec3(gc.colors?.[0] || gc.baseColor));
                  shellMaterial.uniforms.uGlowColor2.value.copy(hexToVec3(gc.colors?.[1] || '#ffffff'));
                  shellMaterial.uniforms.uGlowColor3.value.copy(hexToVec3(gc.colors?.[2] || '#ffffff'));
                  shellMaterial.uniforms.uGlowColorMidPos.value = gc.colorMidPosition ?? 0.5;
                  shellMaterial.uniforms.uGlowColorMidWidth.value = gc.colorMidWidth ?? 1;
                  shellMaterial.uniforms.uGlowColorMidWidth2.value = gc.colorMidWidth2 ?? 0;
                  shellMaterial.uniforms.uGlowGradientDir.value = getGradientDirIndex(gc.direction);
                  shellMaterial.uniforms.uGlowStrength.value = solidCore.glowStrength ?? 1.0;
                  shellMaterial.uniforms.uGlowFalloff.value = solidCore.glowFalloff ?? 2.0;
                  shellMaterial.uniforms.uGlowInward.value = (solidCore.glowInward ?? false) ? 1.0 : 0.0;
                }
              }
            }
          }
        }
      });
    }
        
    // === 粒子核心更新 ===
        const particleCoresGroup = allCoreGroup.getObjectByName('particleCores') as THREE.Group | undefined;
        const cores = planet.coreSystem?.cores || [];
        const coresEnabled = planet.coreSystem?.coresEnabled !== false;
        
        if (particleCoresGroup) {
          // 遍历每个核心组，通过 coreId 匹配配置
          particleCoresGroup.children.forEach((coreChild) => {
              const coreId = coreChild.userData?.coreId;
              const coreConfig = cores.find(c => c.id === coreId);
              
              // 计算是否应该显示此核心
              let shouldShow = false;
              if (coresEnabled && coreConfig) {
                if (currentSettings.soloCoreId) {
                  // Solo 模式：只显示指定的核心
                  shouldShow = coreConfig.id === currentSettings.soloCoreId;
                } else {
                  // 正常模式：显示启用的核心
                  shouldShow = coreConfig.enabled;
                }
              }
              
              // 设置可见性
              coreChild.visible = shouldShow;
              
              // 只更新可见的核心
              if (!shouldShow || !coreConfig) return;
              
              const rotAxis = getRotationAxis(coreConfig.rotationAxis);
              
              // 更新材质的函数
              const updateMaterial = (points: THREE.Points) => {
                const material = points.material as THREE.ShaderMaterial;
                if (!material.uniforms) return;
                
                material.uniforms.uTime.value = time;
                material.uniforms.uRotationSpeed.value = coreConfig.rotationSpeed;
                material.uniforms.uRotationAxis.value.set(rotAxis.x, rotAxis.y, rotAxis.z);
                
                // 动态效果
                material.uniforms.uBreathing.value = currentSettings.breathingEnabled ? currentSettings.breathingIntensity : 0;
                material.uniforms.uBreathingSpeed.value = currentSettings.breathingSpeed;
                material.uniforms.uFlicker.value = currentSettings.flickerEnabled ? currentSettings.flickerIntensity : 0;
                material.uniforms.uFlickerSpeed.value = currentSettings.flickerSpeed;
                
                // 交互
                const hand = handData.current;
                material.uniforms.uHandActive.value = hand.isActive ? 1 : 0;
                if (hand.isActive) {
                  material.uniforms.uHandPos.value.set(
                    hand.x * 400,
                    hand.y * 300,
                    hand.z * 200
                  );
                }
                material.uniforms.uInteractionRadius.value = currentSettings.interactionRadius;
                material.uniforms.uInteractionStrength.value = currentSettings.interactionStrength * (currentSettings.interactionType === 'attract' ? -1 : 1);
                
                // 闪电效果
                material.uniforms.uWanderingLightning.value = currentSettings.wanderingLightningEnabled ? currentSettings.wanderingLightningIntensity : 0;
                material.uniforms.uWanderingLightningSpeed.value = currentSettings.wanderingLightningSpeed;
                material.uniforms.uWanderingLightningDensity.value = currentSettings.wanderingLightningDensity;
                material.uniforms.uLightningBreakdown.value = currentSettings.lightningBreakdownEnabled ? currentSettings.lightningBreakdownIntensity : 0;
                material.uniforms.uLightningBreakdownFreq.value = currentSettings.lightningBreakdownFrequency;
                material.uniforms.uLightningBranches.value = currentSettings.lightningBreakdownBranches;
              };
              
              // 处理嵌套结构：核心可能是 Group（带拖尾层）或直接是 Points
              if (coreChild instanceof THREE.Group) {
                // 新结构：Group 包含多个 Points（主层 + 拖尾层）
                coreChild.children.forEach(subChild => {
                  if (subChild instanceof THREE.Points) {
                    updateMaterial(subChild);
                  }
                });
              } else if (coreChild instanceof THREE.Points) {
                // 旧结构：直接是 Points
                updateMaterial(coreChild);
              }
          });
        }
        
        // === 火焰系统更新 ===
        const flamesGroup = meshes.flames as THREE.Group | undefined;
        const surfaceFlamesGroup = flamesGroup?.getObjectByName('surfaceFlames') as THREE.Group | undefined;
        const surfaceFlames = planet.flameSystem?.surfaceFlames || [];
        const flamesEnabled = planet.flameSystem?.enabled !== false;
        const surfaceFlamesEnabled = planet.flameSystem?.surfaceFlamesEnabled !== false;
        const energyBodySystemEnabled = planet.energyBodySystem?.enabled !== false;
        
        // 能量罩属于能量体系统
        if (surfaceFlamesGroup) {
          surfaceFlamesGroup.children.forEach(child => {
            const flameId = child.userData?.flameId;
            const flame = surfaceFlames.find(f => f.id === flameId);
            
            const visible = energyBodySystemEnabled && surfaceFlamesEnabled && (flame?.enabled ?? false);
            child.visible = visible;
            
            if (visible && flame && child instanceof THREE.Mesh) {
              const material = child.material as THREE.ShaderMaterial;
              if (material.uniforms) {
                // 更新时间
                material.uniforms.uTime.value = time;
                
                // 动态更新参数
                material.uniforms.uRadius.value = flame.radius ?? 105;
                material.uniforms.uThickness.value = flame.thickness ?? 0.15;
                material.uniforms.uFlameScale.value = flame.flameScale ?? 1.0;
                material.uniforms.uDensity.value = flame.density ?? 0.8;
                material.uniforms.uFlowSpeed.value = flame.flowSpeed ?? 1.0;
                material.uniforms.uTurbulence.value = flame.turbulence ?? 0.8;
                material.uniforms.uNoiseType.value = flame.noiseType === 'voronoi' ? 1 : 0;
                material.uniforms.uFractalLayers.value = flame.fractalLayers ?? 3;
                material.uniforms.uOpacity.value = flame.opacity ?? 0.9;
                material.uniforms.uEmissive.value = flame.emissive ?? 2.0;
                material.uniforms.uBloomBoost.value = flame.bloomBoost ?? 1.5;
                material.uniforms.uDirection.value = flame.direction === 'up' ? 0 : flame.direction === 'outward' ? 1 : 2;
                material.uniforms.uPulseEnabled.value = flame.pulseEnabled ? 1.0 : 0.0;
                material.uniforms.uPulseSpeed.value = flame.pulseSpeed ?? 1.0;
                material.uniforms.uPulseIntensity.value = flame.pulseIntensity ?? 0.3;
                
                // 更新颜色
                const fc = flame.color || { mode: 'twoColor' as const, baseColor: '#ff6600', colors: ['#ff6600', '#ffff00'], colorMidPosition: 0.5, colorMidWidth: 1, direction: 'radial' as const, directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 };
                const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
                material.uniforms.uColorMode.value = colorModeIndex;
                material.uniforms.uBaseColor.value.copy(hexToVec3(fc.baseColor));
                material.uniforms.uColor1.value.copy(hexToVec3(fc.colors?.[0] || fc.baseColor));
                material.uniforms.uColor2.value.copy(hexToVec3(fc.colors?.[1] || '#ffff00'));
                material.uniforms.uColor3.value.copy(hexToVec3(fc.colors?.[2] || '#ffffff'));
                material.uniforms.uColorMidPos.value = fc.colorMidPosition ?? 0.5;
                material.uniforms.uProceduralIntensity.value = fc.proceduralIntensity ?? 1.0;
              }
            }
          });
        }
        
        // 残影更新（独立顶级模块）
        const flameJetsGroup = flamesGroup?.getObjectByName('flameJets') as THREE.Group | undefined;
        const flameJets = planet.flameSystem?.flameJets || [];
        const flameJetsEnabled = planet.flameSystem?.flameJetsEnabled !== false;
        if (flameJetsGroup) {
          flameJetsGroup.children.forEach(child => {
            const jetId = child.userData?.flameId;
            const jet = flameJets.find(j => j.id === jetId);
            const visible = flameJetsEnabled && (jet?.enabled ?? false);
            child.visible = visible;
            
            if (visible && jet && child instanceof THREE.Points) {
              const material = child.material as THREE.ShaderMaterial;
              if (material.uniforms) {
                material.uniforms.uTime.value = time;
                material.uniforms.uJetSpeed.value = jet.jetSpeed ?? 1.0;
                material.uniforms.uHeight.value = (jet.height ?? 2.0) * (jet.baseRadius ?? 100);
                material.uniforms.uWidth.value = jet.width ?? 0.3;
                material.uniforms.uSpread.value = jet.spread ?? 15;
                material.uniforms.uTurbulence.value = jet.turbulence ?? 0.5;
                material.uniforms.uLifespan.value = jet.lifespan ?? 2.0;
                material.uniforms.uParticleSize.value = jet.particleSize ?? 5;
                material.uniforms.uOpacity.value = jet.opacity ?? 0.9;
                material.uniforms.uEmissive.value = jet.emissive ?? 2.5;
                
                // 爆发模式
                if (jet.burstMode === 'burst') {
                  const cycle = jet.burstInterval + jet.burstDuration;
                  const phase = (time % cycle) / cycle;
                  const burstPhase = phase < (jet.burstDuration / cycle) ? 1.0 : 0.0;
                  material.uniforms.uBurstPhase.value = burstPhase;
                } else {
                  material.uniforms.uBurstPhase.value = 1.0;
                }
                
                // 更新颜色
                const fc = jet.color || { mode: 'twoColor', baseColor: '#ff4400', colors: ['#ff4400', '#ffff00'] };
                const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
                material.uniforms.uColorMode.value = colorModeIndex;
                material.uniforms.uColor1.value.copy(hexToVec3(fc.colors?.[0] || fc.baseColor || '#ff4400'));
                material.uniforms.uColor2.value.copy(hexToVec3(fc.colors?.[1] || '#ffff00'));
                material.uniforms.uColor3.value.copy(hexToVec3(fc.colors?.[2] || '#ff0000'));
              }
            }
          });
        }
        
        // 螺旋火焰更新（属于光环系统）
        const spiralFlamesGroup = flamesGroup?.getObjectByName('spiralFlames') as THREE.Group | undefined;
        const spiralFlamesData = planet.flameSystem?.spiralFlames || [];
        const spiralFlamesEnabled = planet.flameSystem?.spiralFlamesEnabled !== false;
        const ringsSystemEnabled = planet.rings.enabled !== false;
        if (spiralFlamesGroup) {
          spiralFlamesGroup.children.forEach(child => {
            const spiralId = child.userData?.flameId;
            const spiral = spiralFlamesData.find(s => s.id === spiralId);
            const visible = ringsSystemEnabled && spiralFlamesEnabled && (spiral?.enabled ?? false);
            child.visible = visible;
            
            if (visible && spiral && child instanceof THREE.Points) {
              const material = child.material as THREE.ShaderMaterial;
              if (material.uniforms) {
                material.uniforms.uTime.value = time;
                material.uniforms.uBaseRadius.value = spiral.baseRadius ?? 100;
                material.uniforms.uStartRadius.value = spiral.startRadius ?? 1.1;
                material.uniforms.uEndRadius.value = spiral.endRadius ?? 1.5;
                material.uniforms.uSpiralHeight.value = spiral.height ?? 200;
                material.uniforms.uPitch.value = spiral.pitch ?? 0.5;
                material.uniforms.uRotationSpeed.value = spiral.rotationSpeed ?? 1.0;
                material.uniforms.uRiseSpeed.value = spiral.riseSpeed ?? 0.5;
                material.uniforms.uThickness.value = spiral.thickness ?? 0.1;
                material.uniforms.uParticleSize.value = spiral.particleSize ?? 4.0;
                material.uniforms.uOpacity.value = spiral.opacity ?? 0.85;
                material.uniforms.uEmissive.value = spiral.emissive ?? 2.0;
                
                const dirIndex = spiral.direction === 'cw' ? 0 : spiral.direction === 'ccw' ? 1 : 2;
                material.uniforms.uDirection.value = dirIndex;
                
                // 更新颜色
                const fc = spiral.color || { mode: 'twoColor', baseColor: '#ff6600', colors: ['#ff6600', '#ffff00'] };
                const colorModeIndex = fc.mode === 'none' ? 0 : fc.mode === 'twoColor' ? 1 : fc.mode === 'threeColor' ? 2 : 3;
                material.uniforms.uColorMode.value = colorModeIndex;
                material.uniforms.uColor1.value.copy(hexToVec3(fc.colors?.[0] || fc.baseColor || '#ff6600'));
                material.uniforms.uColor2.value.copy(hexToVec3(fc.colors?.[1] || '#ffff00'));
                material.uniforms.uColor3.value.copy(hexToVec3(fc.colors?.[2] || '#ff0000'));
              }
            }
          });
        }
        
        // === 残影系统更新 ===
        try {
          const afterimageBillboard = flamesGroup?.children.find(c => c.userData?.type === 'afterimage') as THREE.Group | undefined;
          const currentCamera = cameraRef.current;
          if (afterimageBillboard && currentCamera) {
            // 残影平面始终平行于屏幕（使用相机旋转，而非 lookAt）
            afterimageBillboard.quaternion.copy(currentCamera.quaternion);
            
            const afterimageSettings = planet.afterimageSystem;
            const systemEnabled = afterimageSettings?.enabled ?? false;
            const textureEnabled = systemEnabled && (afterimageSettings?.texture?.enabled ?? false);
            const particlesEnabled = systemEnabled && (afterimageSettings?.particles?.enabled ?? false);
            
            // 获取 zone
            const defaultZone = {
              startAngle: 45, angleSpan: 90, sideLineLength: 2.0,
              sideLineAngle: 90, sideLineType: 'straight' as const,
              curveBendDirection: 'outward' as const, curveBendStrength: 0.5
            };
            const zones = afterimageSettings?.zones || [];
            const zone = zones.find(z => z.enabled) || zones[0] || defaultZone;
            
            // 遍历所有子对象
            for (const child of afterimageBillboard.children) {
              // ===== 更新纹理层 =====
              if (child.name === 'afterimageTexture' && child instanceof THREE.Mesh) {
                child.visible = textureEnabled;
                const material = child.material as THREE.ShaderMaterial;
                if (material && material.uniforms) {
                  // 更新时间（动画关键！）
                  material.uniforms.uTime.value = time;
                  
                  // 更新纹理参数
                  const tex = afterimageSettings?.texture;
                  if (tex) {
                    material.uniforms.uOpacity.value = tex.opacity ?? 0.8;
                    material.uniforms.uFlowSpeed.value = tex.flowSpeed ?? 0.5;
                    material.uniforms.uNoiseScale.value = tex.noiseScale ?? 1.0;
                    material.uniforms.uStretchFactor.value = tex.stretchFactor ?? 2.0;
                    // 条纹效果参数
                    material.uniforms.uStripeIntensity.value = tex.stripeIntensity ?? 0;
                    material.uniforms.uStripeCount.value = tex.stripeCount ?? 8;
                    material.uniforms.uDirectionalStretch.value = tex.directionalStretch ?? 1;
                    material.uniforms.uEdgeSharpness.value = tex.edgeSharpness ?? 0;
                    material.uniforms.uDistortion.value = tex.distortion ?? 0;
                    if (tex.colors) {
                      material.uniforms.uColor1.value.copy(hexToVec3(tex.colors[0] || '#ff00ff'));
                      material.uniforms.uColor2.value.copy(hexToVec3(tex.colors[1] || '#ff66ff'));
                      material.uniforms.uColor3.value.copy(hexToVec3(tex.colors[2] || '#ffffff'));
                    }
                    // 纹理模式
                    material.uniforms.uTextureMode.value = tex.textureMode === 'energy' ? 1.0 : 0.0;
                    // 能量罩参数
                    material.uniforms.uEnergyFlameScale.value = tex.energyFlameScale ?? 2.0;
                    material.uniforms.uEnergyDensity.value = tex.energyDensity ?? 0.5;
                    material.uniforms.uEnergyFlowSpeed.value = tex.energyFlowSpeed ?? 0.5;
                    material.uniforms.uEnergyTurbulence.value = tex.energyTurbulence ?? 0.5;
                    material.uniforms.uEnergyNoiseType.value = tex.energyNoiseType === 'voronoi' ? 1.0 : 0.0;
                    material.uniforms.uEnergyFractalLayers.value = tex.energyFractalLayers ?? 3;
                    material.uniforms.uEnergyDirection.value = tex.energyDirection === 'spiral' ? 1.0 : 0.0;
                    material.uniforms.uEnergyPulseEnabled.value = tex.energyPulseEnabled ? 1.0 : 0.0;
                    material.uniforms.uEnergyPulseSpeed.value = tex.energyPulseSpeed ?? 1.0;
                    material.uniforms.uEnergyPulseIntensity.value = tex.energyPulseIntensity ?? 0.3;
                  }
                  
                  // 更新区域参数
                  material.uniforms.uStartAngle.value = THREE.MathUtils.degToRad(zone.startAngle);
                  material.uniforms.uAngleSpan.value = THREE.MathUtils.degToRad(zone.angleSpan);
                  material.uniforms.uSideLength.value = zone.sideLineLength;
                  material.uniforms.uSideAngle.value = THREE.MathUtils.degToRad((zone.sideLineAngle || 90) - 90);
                  material.uniforms.uSideLineType.value = zone.sideLineType === 'curve' ? 1.0 : 0.0;
                  material.uniforms.uCurveBend.value = zone.curveBendDirection === 'inward' ? -1.0 : 1.0;
                  material.uniforms.uCurveStrength.value = zone.curveBendStrength || 0.5;
                }
              }
              
              // ===== 更新粒子层 =====
              if (child.name === 'afterimageParticles' && child instanceof THREE.Points) {
                child.visible = particlesEnabled;
                const material = child.material as THREE.ShaderMaterial;
                if (material && material.uniforms) {
                  // 更新时间（动画关键！）
                  material.uniforms.uTime.value = time;
                  
                  // 更新粒子参数
                  const particles = afterimageSettings?.particles;
                  if (particles) {
                    material.uniforms.uSpeed.value = particles.speed ?? 2.0;
                    material.uniforms.uSpeedRandomness.value = particles.speedRandomness ?? 0.2;
                    material.uniforms.uLifespan.value = particles.lifespan ?? 2.0;
                    material.uniforms.uSize.value = particles.size ?? 8;
                    if (particles.colors) {
                      material.uniforms.uColor1.value.copy(hexToVec3(particles.colors[0] || '#ff4400'));
                      material.uniforms.uColor2.value.copy(hexToVec3(particles.colors[1] || '#ffff00'));
                    }
                  }
                  
                  // 更新区域参数
                  material.uniforms.uStartAngle.value = THREE.MathUtils.degToRad(zone.startAngle);
                  material.uniforms.uAngleSpan.value = THREE.MathUtils.degToRad(zone.angleSpan);
                  material.uniforms.uSideLength.value = zone.sideLineLength;
                  material.uniforms.uSideAngle.value = THREE.MathUtils.degToRad((zone.sideLineAngle || 90) - 90);
                  material.uniforms.uSideLineType.value = zone.sideLineType === 'curve' ? 1.0 : 0.0;
                  material.uniforms.uCurveBend.value = zone.curveBendDirection === 'inward' ? -1.0 : 1.0;
                  material.uniforms.uCurveStrength.value = zone.curveBendStrength || 0.5;
                }
              }
            }
            
            // 整体可见性
            afterimageBillboard.visible = systemEnabled;
          }
        } catch (e) {
          console.error('残影更新错误:', e);
        }
        
        // 获取基础半径用于后续计算
        const firstCore = planet.coreSystem?.cores?.[0];
        
        // 更新环带和粒子环
        meshes.rings.children.forEach((child) => {
          const userData = child.userData;
          
          if (userData.type === 'particle') {
            // 粒子环（Group 包含主层和拖尾层）
            const ring = planet.rings.particleRings.find(r => r.id === userData.ringId);
            if (ring && child instanceof THREE.Group) {
              // Solo 可见性：如果有 soloId，只显示 solo 的那个
              const soloId = planet.rings.particleRingsSoloId;
              const visible = (planet.rings.enabled !== false) && planet.rings.particleRingsEnabled && ring.enabled && (!soloId || soloId === ring.id);
              child.visible = visible;
              if (!visible) return;
              
              // 更新所有子层的 uniforms
              const silkEffect = ring.silkEffect || { enabled: false, thicknessVariation: 0.5, dashPattern: 0.3, noiseStrength: 0.3, noiseFrequency: 1.0 };
              child.children.forEach(subChild => {
                if (subChild instanceof THREE.Points) {
                  const material = subChild.material as THREE.ShaderMaterial;
                  if (material.uniforms) {
                    material.uniforms.uTime.value = time;
                    // 动态更新丝线效果 uniforms
                    if (material.uniforms.uSilkEnabled !== undefined) {
                      material.uniforms.uSilkEnabled.value = silkEffect.enabled ? 1 : 0;
                      material.uniforms.uSilkThicknessVar.value = silkEffect.thicknessVariation;
                      material.uniforms.uSilkDashPattern.value = silkEffect.dashPattern;
                      material.uniforms.uSilkNoiseStrength.value = silkEffect.noiseStrength;
                      material.uniforms.uSilkNoiseFreq.value = silkEffect.noiseFrequency;
                      material.uniforms.uSilkRingCount.value = silkEffect.ringCount ?? 5;
                      material.uniforms.uSilkRingSharpness.value = silkEffect.ringSharpness ?? 0.7;
                    }
                  }
                }
              });
              // 自转：绕局部 Y 轴旋转（XZ 平面的法向量是 Y 轴）
              const rotSpeed = userData.rotationSpeed ?? ring.rotationSpeed ?? 0.3;
              child.rotateOnAxis(new THREE.Vector3(0, 1, 0), rotSpeed * 0.01);
              // 公转：绕公转轴旋转
              const orbitAxis = ring.orbitAxis ? getOrbitAxisVector(ring.orbitAxis) : { x: 0, y: 1, z: 0 };
              child.rotateOnWorldAxis(new THREE.Vector3(orbitAxis.x, orbitAxis.y, orbitAxis.z), ring.orbitSpeed * 0.01);
            }
          } else if (userData.type === 'continuous') {
            // 环带（Mesh）
            const ring = planet.rings.continuousRings.find(r => r.id === userData.ringId);
            if (ring && child instanceof THREE.Mesh) {
              // Solo 可见性：如果有 soloId，只显示 solo 的那个
              const soloId = planet.rings.continuousRingsSoloId;
              const visible = (planet.rings.enabled !== false) && planet.rings.continuousRingsEnabled && ring.enabled && (!soloId || soloId === ring.id);
              child.visible = visible;
              if (!visible) return;
              
              const material = child.material as THREE.ShaderMaterial;
              if (material.uniforms) {
                material.uniforms.uTime.value = time;
                // 动态更新颜色渐变相关 uniforms
                const gc = ring.gradientColor;
                if (material.uniforms.uColorMidPosition !== undefined) {
                  material.uniforms.uColorMidPosition.value = gc?.colorMidPosition ?? 0.5;
                  material.uniforms.uColorMidWidth.value = gc?.colorMidWidth ?? 1;
                  material.uniforms.uColorMidWidth2.value = gc?.colorMidWidth2 ?? 0;
                  material.uniforms.uBlendStrength.value = gc?.blendStrength ?? 1.0;
                  material.uniforms.uSpiralDensity.value = gc?.spiralDensity ?? 2;
                  material.uniforms.uProceduralIntensity.value = gc?.proceduralIntensity ?? 1.0;
                  
                  // 动态更新渐变颜色（拉丝效果需要）
                  const brightness = ring.brightness || 1.0;
                  // 单色模式时，三个颜色都使用基础色（产生亮度渐变）
                  const useGradient = gc?.enabled && gc?.mode !== 'none';
                  let c1, c2, c3;
                  if (useGradient && gc?.colors?.length >= 1) {
                    c1 = hexToRgb(gc.colors[0] || ring.color);
                    c2 = hexToRgb(gc.colors[1] || gc.colors[0] || ring.color);
                    c3 = hexToRgb(gc.colors[2] || gc.colors[1] || gc.colors[0] || ring.color);
                  } else {
                    // 单色模式：使用基础色的不同亮度变化
                    const baseColor = hexToRgb(ring.color);
                    c1 = [baseColor[0] * 0.6, baseColor[1] * 0.6, baseColor[2] * 0.6]; // 暗部
                    c2 = baseColor; // 中间
                    c3 = [Math.min(1, baseColor[0] * 1.4), Math.min(1, baseColor[1] * 1.4), Math.min(1, baseColor[2] * 1.4)]; // 亮部
                  }
                  material.uniforms.uGradientColor1.value.set(c1[0] * brightness, c1[1] * brightness, c1[2] * brightness);
                  material.uniforms.uGradientColor2.value.set(c2[0] * brightness, c2[1] * brightness, c2[2] * brightness);
                  material.uniforms.uGradientColor3.value.set(c3[0] * brightness, c3[1] * brightness, c3[2] * brightness);
                  // 更新基础颜色
                  const [r, g, b] = hexToRgb(ring.color);
                  material.uniforms.uColor.value.set(r * brightness, g * brightness, b * brightness);
                }
                // 动态更新显隐效果 uniforms
                if (material.uniforms.uVisibilityEnabled !== undefined) {
                  const visEffect = ring.visibilityEffect || { enabled: false, zones: [{ startAngle: 0, endAngle: 180 }], fadeAngle: 15, dynamicRotation: false, rotationSpeed: 0.5 };
                  material.uniforms.uVisibilityEnabled.value = visEffect.enabled ? 1 : 0;
                  const zones = (visEffect.zones || [{ startAngle: 0, endAngle: 180 }]).slice(0, 4);
                  material.uniforms.uVisibilityZones.value = zones.map(z => new THREE.Vector2(z.startAngle, z.endAngle)).concat(Array(4).fill(new THREE.Vector2(0, 0))).slice(0, 4);
                  material.uniforms.uVisibilityZoneCount.value = Math.min(zones.length, 4);
                  material.uniforms.uVisibilityFadeAngle.value = visEffect.fadeAngle ?? 15;
                  material.uniforms.uVisibilityDynamic.value = visEffect.dynamicRotation ? 1 : 0;
                  material.uniforms.uVisibilityRotSpeed.value = visEffect.rotationSpeed ?? 0.5;
                }
                // 动态更新拉丝效果 uniforms
                if (material.uniforms.uStreakEnabled !== undefined) {
                  const streak = ring.streakMode;
                  material.uniforms.uStreakEnabled.value = streak?.enabled ? 1 : 0;
                  material.uniforms.uStreakFlowSpeed.value = streak?.flowSpeed ?? 0.5;
                  material.uniforms.uStreakStripeCount.value = streak?.stripeCount ?? 12;
                  material.uniforms.uStreakRadialStretch.value = streak?.radialStretch ?? 8;
                  material.uniforms.uStreakSharpness.value = streak?.edgeSharpness ?? 0.3;
                  material.uniforms.uStreakDistortion.value = streak?.distortion ?? 0.5;
                  material.uniforms.uStreakNoiseScale.value = streak?.noiseScale ?? 1.0;
                  material.uniforms.uStreakDirection.value = streak?.flowDirection === 'ccw' ? -1.0 : 1.0;
                  material.uniforms.uStreakBrightness.value = streak?.brightness ?? 1.5;
                }
              }
              // 自转：绕局部 Z 轴旋转（环带原始创建在 XY 平面，法向量是 Z 轴）
              const rotSpeed = userData.rotationSpeed ?? ring.rotationSpeed ?? 0.1;
              child.rotateOnAxis(new THREE.Vector3(0, 0, 1), rotSpeed * 0.01);
              // 公转：绕公转轴旋转
              const orbitAxis = ring.orbitAxis ? getOrbitAxisVector(ring.orbitAxis) : { x: 0, y: 1, z: 0 };
              child.rotateOnWorldAxis(new THREE.Vector3(orbitAxis.x, orbitAxis.y, orbitAxis.z), ring.orbitSpeed * 0.01);
            }
          }
        });
        
        // 更新粒子环绕旋转
        const radiationSysEnabled = planet.radiation.enabled !== false;
        const orbitingEnabled = planet.radiation.orbitingEnabled;
        meshes.radiation.children.forEach((child) => {
          const userData = child.userData;
          if (userData.type === 'orbiting' && child instanceof THREE.Points) {
            // 检查可见性
            const orbiting = planet.radiation.orbitings.find(o => o.id === userData.orbitingId);
            const visible = radiationSysEnabled && orbitingEnabled && (orbiting?.enabled ?? false);
            child.visible = visible;
            if (!visible) return;
            
            const dir = userData.mainDirection || { x: 0, y: 1, z: 0 };
            const speed = userData.baseSpeed || 0.5;
            // 绕指定轴旋转
            child.rotateOnWorldAxis(new THREE.Vector3(dir.x, dir.y, dir.z).normalize(), speed * 0.01);
          }
        });
        
        // 更新粒子发射器
        if (meshes.emitters && meshes.emitters.length > 0) {
          // 获取基础半径，优先从实体核心获取，否则从粒子核心获取
          const solidCore = planet.coreSystem?.solidCore;
          const baseRadius = solidCore?.enabled ? (solidCore.radius || 100) : (firstCore?.baseRadius || 100);
          const radiationSystemEnabled = planet.radiation.enabled !== false;
          const emitterEnabled = planet.radiation.emitterEnabled;
          
          meshes.emitters.forEach((emitter) => {
            // 通过 ID 匹配找到对应的设置
            const emitterId = emitter.mesh.userData?.emitterId;
            const emitterSettings = planet.radiation.emitters.find(e => e.id === emitterId);
            if (radiationSystemEnabled && emitterEnabled && emitterSettings && emitterSettings.enabled) {
              updateParticleEmitter(emitter, emitterSettings, baseRadius, deltaTime / 1000, time);
            } else {
              // 如果设置不存在或被禁用，隐藏 mesh
              emitter.mesh.visible = false;
            }
          });
        }
        
        // 更新流萤
        if (meshes.fireflyData && meshes.fireflyData.length > 0) {
          const planetPos = meshes.core.position.clone();
          const solidCore = planet.coreSystem?.solidCore;
          const baseRadius = solidCore?.enabled ? (solidCore.radius || 100) : (firstCore?.baseRadius || 100);
          const fireflySystemEnabled = planet.fireflies.enabled !== false;
          
          meshes.fireflyData.forEach((fireflyData: FireflyRuntimeData) => {
            try {
            const userData = fireflyData.group.userData;
            
            if (userData.type === 'orbiting') {
              // 从设置中动态读取参数
              const settings = planet.fireflies.orbitingFireflies.find(f => f.id === userData.fireflyId);
              const orbitingEnabled = planet.fireflies.orbitingEnabled;
              if (!fireflySystemEnabled || !orbitingEnabled || !settings || !settings.enabled) {
                fireflyData.group.visible = false;
                return;
              }
              fireflyData.group.visible = true;
              
              let radius = settings.absoluteOrbitRadius;
              const speed = settings.orbitSpeed;
              const phase = settings.initialPhase || 0;
              const orbitAxisSettings = settings.orbitAxis;
              const fireflySize = settings.size || 8;
              // 拖尾宽度需要与头部视觉大小匹配
              // 头部 gl_PointSize = size * 300 / z，在典型距离 z=500 时约为 size*0.6 像素
              // 但尾部使用世界坐标，需要更大的值才能在视觉上匹配
              const trailWidth = fireflySize * 1.5;
              const trailLength = settings.trailLength || 50;
              const billboardOrbit = settings.billboardOrbit || false;
              
              // 轨道半径波动效果
              const radiusWave = settings.radiusWave;
              if (radiusWave?.enabled) {
                // 使用流萤 ID 生成随机相位（如果启用随机相位）
                const wavePhase = radiusWave.randomPhase 
                  ? (parseInt(settings.id.replace(/\D/g, '') || '0') * 1.618) % (Math.PI * 2)
                  : 0;
                const t = time * radiusWave.frequency + wavePhase;
                
                let waveValue: number;
                if (radiusWave.waveType === 'triangle') {
                  // 三角波：锐利的锯齿状波动
                  // 公式：2 * |fract(t / (2π)) - 0.5| * 2 - 1，范围 -1 到 1
                  const normalizedT = (t / (Math.PI * 2)) % 1;
                  waveValue = 4 * Math.abs(normalizedT - 0.5) - 1;
                } else {
                  // 正弦波（默认）
                  waveValue = Math.sin(t);
                }
                
                radius += waveValue * radiusWave.amplitude;
              }
              
              // 计算当前角度
              const angle = THREE.MathUtils.degToRad(phase) + time * speed;
              
              // 计算轨道平面上的位置
              const localPos = new THREE.Vector3(
                radius * Math.cos(angle),
                0,
                radius * Math.sin(angle)
              );
              
              // 应用轨道旋转
              if (billboardOrbit && cameraRef.current) {
                // 描边模式：轨道平面始终垂直于"相机到星球中心"的视线
                // 这样用户从任何角度看，流萤都在屏幕平面上做圆周运动
                const cameraPos = cameraRef.current.position.clone();
                const viewDir = new THREE.Vector3().subVectors(planetPos, cameraPos).normalize();
                
                // 轨道法线 = 视线方向（从相机指向星球中心）
                const orbitNormal = viewDir;
                
                // 计算从 Y 轴（默认轨道法线）到视线方向的旋转
                const defaultAxis = new THREE.Vector3(0, 1, 0);
                const axisQuaternion = new THREE.Quaternion();
                axisQuaternion.setFromUnitVectors(defaultAxis, orbitNormal);
                localPos.applyQuaternion(axisQuaternion);
              } else {
                // 普通模式：使用固定公转轴
                const axisVec = getOrbitAxisVector(orbitAxisSettings);
                const axisQuaternion = new THREE.Quaternion();
                const defaultAxis = new THREE.Vector3(0, 1, 0);
                const targetAxis = new THREE.Vector3(axisVec.x, axisVec.y, axisVec.z).normalize();
                axisQuaternion.setFromUnitVectors(defaultAxis, targetAxis);
                localPos.applyQuaternion(axisQuaternion);
              }
              
              // 世界坐标位置
              const worldPos = localPos.clone().add(planetPos);
              
              // 更新头部位置（直接修改顶点）
              const headPositions = fireflyData.headMesh.geometry.attributes.position.array as Float32Array;
              headPositions[0] = worldPos.x;
              headPositions[1] = worldPos.y;
              headPositions[2] = worldPos.z;
              fireflyData.headMesh.geometry.attributes.position.needsUpdate = true;
              
              // 计算速度向量（用于速度拉伸）
              const velocity = new THREE.Vector3(
                -radius * Math.sin(angle) * speed,
                0,
                radius * Math.cos(angle) * speed
              );
              
              // 更新头部 uniforms（动态读取设置）
              const headMat = fireflyData.headMesh.material as THREE.ShaderMaterial;
              if (headMat.uniforms) {
                // 头部样式映射：plain=0, flare=1, spark=2, texture=3
                const headStyleMap: Record<string, number> = { plain: 0, flare: 1, spark: 2, texture: 3 };
                
                headMat.uniforms.uTime.value = time;
                headMat.uniforms.uSize.value = (settings.size || 8) * (settings.brightness || 1);
                headMat.uniforms.uHeadStyle.value = headStyleMap[settings.headStyle] ?? 1;
                headMat.uniforms.uFlareIntensity.value = settings.flareIntensity ?? 1.0;
                headMat.uniforms.uFlareLeaves.value = settings.flareLeaves ?? 4;
                headMat.uniforms.uFlareWidth.value = settings.flareWidth ?? 0.5;
                headMat.uniforms.uChromaticAberration.value = settings.chromaticAberration ?? 0.3;
                headMat.uniforms.uVelocityStretch.value = settings.velocityStretch ?? 0.0;
                headMat.uniforms.uVelocity.value.copy(velocity);
                headMat.uniforms.uNoiseAmount.value = settings.noiseAmount ?? 0.2;
                headMat.uniforms.uGlowIntensity.value = settings.glowIntensity ?? 0.5;
                headMat.uniforms.uPulseSpeed.value = settings.pulseSpeed ?? 1;
                const [r, g, b] = hexToRgb(settings.color);
                const br = settings.brightness || 1;
                headMat.uniforms.uColor.value.set(r * br, g * br, b * br);
                
                // 动态更新贴图
                if (settings.headStyle === 'texture' && settings.headTexture) {
                  let texture = textureCache.current.get(settings.headTexture);
                  if (!texture) {
                    const loader = new THREE.TextureLoader();
                    texture = loader.load(settings.headTexture);
                    textureCache.current.set(settings.headTexture, texture);
                  }
                  headMat.uniforms.uTexture.value = texture;
                  headMat.uniforms.uUseTexture.value = 1.0;
                } else {
                  headMat.uniforms.uUseTexture.value = 0.0;
                }
              }
              
              // 更新历史位置（用于拖尾）
              fireflyData.history.unshift(worldPos.clone());
              while (fireflyData.history.length > trailLength) {
                fireflyData.history.pop();
              }
              
              // 更新尾部
              if (fireflyData.tailMesh && settings.trailEnabled) {
                fireflyData.tailMesh.visible = true;
                // 更新尾部颜色、透明度和大小
                const tailMat = fireflyData.tailMesh.material as THREE.ShaderMaterial;
                if (tailMat.uniforms) {
                  const [r, g, b] = hexToRgb(settings.color);
                  const br = settings.brightness || 1;
                  tailMat.uniforms.uColor.value.set(r * br, g * br, b * br);
                  tailMat.uniforms.uOpacity.value = settings.trailOpacity ?? 0.8;
                  tailMat.uniforms.uSize.value = settings.size || 8;
                  tailMat.uniforms.uBrightness.value = br;
                }
                // 更新拖尾位置
                updateFireflyTail(fireflyData.tailMesh, fireflyData.history);
                
                // 动态更新 taper（如果 taperPower 改变）
                const tapers = fireflyData.tailMesh.geometry.attributes.aTaper.array as Float32Array;
                const trailLen = tapers.length;
                for (let i = 0; i < trailLen; i++) {
                  const t = i / Math.max(trailLen - 1, 1);
                  tapers[i] = Math.pow(1 - t, settings.trailTaperPower ?? 1.0);
                }
                fireflyData.tailMesh.geometry.attributes.aTaper.needsUpdate = true;
              } else if (fireflyData.tailMesh) {
                fireflyData.tailMesh.visible = false;
              }
              
            } else if (userData.type === 'wandering') {
              // 从设置中动态读取参数
              const settings = planet.fireflies.wanderingGroups.find(g => g.id === userData.groupId);
              const wanderingEnabled = planet.fireflies.wanderingEnabled;
              if (!fireflySystemEnabled || !wanderingEnabled || !settings || !settings.enabled) {
                fireflyData.group.visible = false;
                return;
              }
              fireflyData.group.visible = true;
              
              const innerR = settings.innerRadius * baseRadius;
              const outerR = settings.outerRadius * baseRadius;
              const moveSpeed = settings.speed * deltaTime * 0.05;
              const turnFreq = settings.turnFrequency;
              
              // 更新位置
              if (fireflyData.position && fireflyData.direction) {
                // 随机转向
                if (Math.random() < turnFreq * deltaTime * 0.02) {
                  const randomAngle = (Math.random() - 0.5) * Math.PI * 0.3;
                  const rotAxis = new THREE.Vector3(
                    Math.random() - 0.5,
                    Math.random() - 0.5,
                    Math.random() - 0.5
                  ).normalize();
                  fireflyData.direction.applyAxisAngle(rotAxis, randomAngle);
                  fireflyData.direction.normalize();
                }
                
                // 移动
                fireflyData.position.addScaledVector(fireflyData.direction, moveSpeed);
                
                // 边界检测（相对于星球中心）
                const distFromCenter = fireflyData.position.length();
                if (distFromCenter < innerR) {
                  const normal = fireflyData.position.clone().normalize();
                  fireflyData.position.copy(normal.multiplyScalar(innerR + 5));
                  fireflyData.direction.reflect(normal).normalize();
                } else if (distFromCenter > outerR) {
                  const normal = fireflyData.position.clone().normalize();
                  fireflyData.position.copy(normal.multiplyScalar(outerR - 5));
                  fireflyData.direction.reflect(normal).normalize();
                }
                
                // 世界坐标位置
                const worldPos = fireflyData.position.clone().add(planetPos);
                
                // 更新头部位置
                const headPositions = fireflyData.headMesh.geometry.attributes.position.array as Float32Array;
                headPositions[0] = worldPos.x;
                headPositions[1] = worldPos.y;
                headPositions[2] = worldPos.z;
                fireflyData.headMesh.geometry.attributes.position.needsUpdate = true;
                
                // 计算速度向量（用于速度拉伸）
                const velocity = fireflyData.direction.clone().multiplyScalar(moveSpeed * 20);
                
                // 更新头部 uniforms
                const headMat = fireflyData.headMesh.material as THREE.ShaderMaterial;
                if (headMat.uniforms) {
                  // 头部样式映射：plain=0, flare=1, spark=2, texture=3
                  const headStyleMap: Record<string, number> = { plain: 0, flare: 1, spark: 2, texture: 3 };
                  
                  headMat.uniforms.uTime.value = time;
                  headMat.uniforms.uSize.value = (settings.size || 5) * (settings.brightness || 1);
                  headMat.uniforms.uHeadStyle.value = headStyleMap[settings.headStyle] ?? 1;
                  headMat.uniforms.uFlareIntensity.value = settings.flareIntensity ?? 1.0;
                  headMat.uniforms.uFlareLeaves.value = settings.flareLeaves ?? 4;
                  headMat.uniforms.uFlareWidth.value = settings.flareWidth ?? 0.5;
                  headMat.uniforms.uChromaticAberration.value = settings.chromaticAberration ?? 0.3;
                  headMat.uniforms.uVelocityStretch.value = settings.velocityStretch ?? 0.5;
                  headMat.uniforms.uVelocity.value.copy(velocity);
                  headMat.uniforms.uNoiseAmount.value = settings.noiseAmount ?? 0.2;
                  headMat.uniforms.uGlowIntensity.value = settings.glowIntensity ?? 0.5;
                  headMat.uniforms.uPulseSpeed.value = settings.pulseSpeed ?? 1.5;
                  const [r, g, b] = hexToRgb(settings.color);
                  const br = settings.brightness || 1;
                  headMat.uniforms.uColor.value.set(r * br, g * br, b * br);
                  
                  // 动态更新贴图
                  if (settings.headStyle === 'texture' && settings.headTexture) {
                    let texture = textureCache.current.get(settings.headTexture);
                    if (!texture) {
                      const loader = new THREE.TextureLoader();
                      texture = loader.load(settings.headTexture);
                      textureCache.current.set(settings.headTexture, texture);
                    }
                    headMat.uniforms.uTexture.value = texture;
                    headMat.uniforms.uUseTexture.value = 1.0;
                  } else {
                    headMat.uniforms.uUseTexture.value = 0.0;
                  }
                }
              }
            }
            } catch (e) {
              console.warn('Firefly update error:', e);
            }
          });
        }
        
        // 更新法阵
        if (meshes.magicCircleData && meshes.magicCircleData.length > 0) {
          const magicCirclesEnabled = planet.magicCircles?.enabled ?? false;
          const soloId = planet.magicCircles?.soloId;
          meshes.magicCircleData.forEach(circleData => {
            // 从设置中获取最新配置
            const settings = planet.magicCircles?.circles.find(c => c.id === circleData.id);
            // 全局开关或单个法阵关闭时隐藏
            if (!magicCirclesEnabled || !settings || !settings.enabled) {
              circleData.mesh.visible = false;
              return;
            }
            
            // Solo 模式：只显示指定法阵
            if (soloId && circleData.id !== soloId) {
              circleData.mesh.visible = false;
              return;
            }
            
            circleData.mesh.visible = true;
            
            // 法阵位置：只需设置相对于组的 Y 偏移（组已经跟随星球位置了）
            circleData.mesh.position.set(0, settings.yOffset, 0);
            
            // 更新倾斜角度
            const tiltAngles = getTiltAngles(settings.tilt ?? DEFAULT_TILT_SETTINGS);
            const baseRotX = -Math.PI / 2 + THREE.MathUtils.degToRad(tiltAngles.x);
            const baseRotY = THREE.MathUtils.degToRad(tiltAngles.y);
            const baseRotZ = THREE.MathUtils.degToRad(tiltAngles.z);
            
            // 存储累积的自转角度到 userData
            if (circleData.mesh.userData.selfRotation === undefined) {
              circleData.mesh.userData.selfRotation = 0;
            }
            circleData.mesh.userData.selfRotation += settings.rotationSpeed * 0.016;
            
            // 应用倾斜 + 自转
            circleData.mesh.rotation.x = baseRotX;
            circleData.mesh.rotation.y = baseRotY;
            circleData.mesh.rotation.z = baseRotZ + circleData.mesh.userData.selfRotation;
            
            // 更新半径（缩放）- 组已经应用了星球缩放，这里只需要法阵自身的缩放
            const baseScale = settings.radius / 150;  // 150 是默认半径
            let currentScale = baseScale;
            
            // 缩放呼吸效果
            if (settings.breathEnabled) {
              const breathCycle = Math.sin(time * settings.breathSpeed * 2);
              currentScale *= 1 + breathCycle * settings.breathIntensity;
            }
            
            circleData.mesh.scale.setScalar(currentScale);
            
            // 更新材质 uniforms
            const material = circleData.mesh.material as THREE.ShaderMaterial;
            if (material.uniforms) {
              material.uniforms.uOpacity.value = settings.opacity;
              material.uniforms.uHueShift.value = settings.hueShift;
              material.uniforms.uSaturationBoost.value = settings.saturationBoost ?? 1.0;
              material.uniforms.uBrightness.value = settings.brightness;
              
              // 脉冲发光效果
              let pulse = 0;
              if (settings.pulseEnabled) {
                pulse = (Math.sin(time * settings.pulseSpeed * 3) * 0.5 + 0.5) * settings.pulseIntensity;
              }
              material.uniforms.uPulse.value = pulse;
              
              // 更新单色模式参数
              material.uniforms.uBaseHue.value = settings.baseHue ?? 200;
              material.uniforms.uBaseSaturation.value = settings.baseSaturation ?? 1.0;
              
              // 更新渐变色参数
              const gc = settings.gradientColor;
              if (gc) {
                const colorModeMap: { [key: string]: number } = { 'none': 0, 'single': 4, 'twoColor': 1, 'threeColor': 2, 'procedural': 3 };
                const directionMap: { [key: string]: number } = { 'radial': 0, 'linearX': 1, 'linearY': 2, 'spiral': 3 };
                material.uniforms.uColorMode.value = gc.enabled ? (colorModeMap[gc.mode] || 0) : 0;
                material.uniforms.uGradientDir.value = directionMap[gc.direction || 'radial'] || 0;
                material.uniforms.uColorMidPos.value = gc.colorMidPosition ?? 0.5;
                material.uniforms.uColorMidWidth.value = gc.colorMidWidth ?? 1;
                material.uniforms.uColorMidWidth2.value = gc.colorMidWidth2 ?? 0;
                material.uniforms.uSpiralDensity.value = gc.spiralDensity ?? 2;
                material.uniforms.uProceduralIntensity.value = gc.proceduralIntensity ?? 1;
                
                // 更新颜色
                const parseColor = (hex: string) => {
                  const c = hex.replace('#', '');
                  return new THREE.Vector3(
                    parseInt(c.substring(0, 2), 16) / 255,
                    parseInt(c.substring(2, 4), 16) / 255,
                    parseInt(c.substring(4, 6), 16) / 255
                  );
                };
                if (gc.colors?.[0]) material.uniforms.uColor1.value = parseColor(gc.colors[0]);
                if (gc.colors?.[1]) material.uniforms.uColor2.value = parseColor(gc.colors[1]);
                if (gc.colors?.[2]) material.uniforms.uColor3.value = parseColor(gc.colors[2]);
              }
              
              // 动态更新贴图
              if (settings.texture && settings.texture !== circleData.settings.texture) {
                let texture = textureCache.current.get(settings.texture);
                if (!texture) {
                  const loader = new THREE.TextureLoader();
                  texture = loader.load(settings.texture);
                  textureCache.current.set(settings.texture, texture);
                }
                material.uniforms.uTexture.value = texture;
                material.uniforms.uHasTexture.value = texture ? 1.0 : 0.0;
                circleData.settings = settings;
              }
            }
          });
        }
        
        // 更新能量体
        if (meshes.energyBodyData && meshes.energyBodyData.length > 0) {
          // 颜色解析辅助函数
          const parseColor = (hex: string) => {
            const c = hex.replace('#', '');
            return new THREE.Vector3(
              parseInt(c.substring(0, 2), 16) / 255,
              parseInt(c.substring(2, 4), 16) / 255,
              parseInt(c.substring(4, 6), 16) / 255
            );
          };
          
          meshes.energyBodyData.forEach(ebData => {
            // 从设置中获取最新配置
            const eb = planet.energyBodySystem?.energyBodies?.find(e => e.id === ebData.id);
            // Solo 可见性：如果有 soloId，只显示 solo 的那个
            const soloId = planet.energyBodySystem?.soloId;
            const coreEnabled = planet.energyBodySystem?.coreEnabled !== false;
            const visible = eb && eb.enabled && planet.energyBodySystem?.enabled && coreEnabled && (!soloId || soloId === eb.id);
            if (!visible) {
              ebData.group.visible = false;
              return;
            }
            
            ebData.group.visible = true;
            
            const rotAxis = getRotationAxis(eb.rotationAxis);
            const { edgeEffect, vertexEffect, shellEffect, organicAnimation, lightFlow } = eb;
            
            // ========== 更新光包状态（路径系统） ==========
            if (ebData.graph && ebData.lightPackets.length > 0 && lightFlow.enabled) {
              const pathConfig: PathSystemConfig = {
                pathMode: lightFlow.pathMode || 'euler',
                eulerMode: (lightFlow.eulerMode as any) || 'autoAugment',
                phaseMode: lightFlow.phaseMode || 'spread',
                count: lightFlow.count || 3,
                speed: lightFlow.speed || 1.0,
                noBacktrack: lightFlow.noBacktrack ?? true,
                coverageWeight: lightFlow.coverageWeight ?? 1.0,
                angleWeight: lightFlow.angleWeight ?? 0.5,
                dwellEnabled: lightFlow.dwellEnabled || false,
                dwellThreshold: lightFlow.dwellThreshold || 4,
                dwellDuration: lightFlow.dwellDuration || 0.3,
                dwellCooldown: lightFlow.dwellCooldown ?? 1.0,
                dwellPulseIntensity: lightFlow.dwellPulseIntensity || 2.0,
                minPacketSpacing: lightFlow.minPacketSpacing ?? 0.1
              };
              
              // 更新光包
              updateLightPackets(ebData.lightPackets, ebData.graph, pathConfig, deltaTime * 0.001);
              
              // 更新边光包数据
              ebData.edgeLightData = getEdgeLightData(ebData.lightPackets, ebData.graph.edges.length);
            }
            
            // ========== 边缘材质 uniforms 全量同步 ==========
            if (ebData.edgesMesh) {
              const mat = ebData.edgesMesh.material as THREE.ShaderMaterial;
              if (mat.uniforms) {
                mat.uniforms.uTime.value = time;
                mat.uniforms.uRotationSpeed.value = eb.rotationSpeed;
                mat.uniforms.uRotationAxis.value.set(rotAxis.x, rotAxis.y, rotAxis.z);
                mat.uniforms.uBreathing.value = organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0;
                mat.uniforms.uBreathingSpeed.value = organicAnimation.breathingSpeed;
                mat.uniforms.uNoiseAmplitude.value = organicAnimation.noiseEnabled ? organicAnimation.noiseAmplitude : 0;
                mat.uniforms.uNoiseFrequency.value = organicAnimation.noiseFrequency;
                mat.uniforms.uNoiseSpeed.value = organicAnimation.noiseSpeed;
                mat.uniforms.uSpherize.value = eb.spherize;
                mat.uniforms.uRadius.value = eb.radius;
                mat.uniforms.uEdgeColor.value.copy(parseColor(edgeEffect.color));
                mat.uniforms.uGradientEndColor.value.copy(parseColor(edgeEffect.gradientEndColor));
                mat.uniforms.uGradientEnabled.value = edgeEffect.gradientEnabled ? 1.0 : 0.0;
                mat.uniforms.uGlowIntensity.value = edgeEffect.glowIntensity;
                mat.uniforms.uGlobalOpacity.value = eb.globalOpacity;
                mat.uniforms.uDashEnabled.value = edgeEffect.dashPattern.enabled ? 1.0 : 0.0;
                mat.uniforms.uDashRatio.value = edgeEffect.dashPattern.dashRatio;
                mat.uniforms.uDashDensity.value = edgeEffect.dashPattern.dashDensity ?? 10;
                mat.uniforms.uDashPhase.value = time * edgeEffect.dashPattern.flowSpeed;
                // 光流 - 多包支持
                mat.uniforms.uLightFlowEnabled.value = lightFlow.enabled ? 1.0 : 0.0;
                mat.uniforms.uLightFlowColor.value.copy(parseColor(lightFlow.color));
                mat.uniforms.uLightFlowBasePhase.value = (time * lightFlow.speed) % 1.0;
                mat.uniforms.uLightFlowLength.value = lightFlow.length;
                mat.uniforms.uLightFlowIntensity.value = lightFlow.intensity;
                mat.uniforms.uLightFlowCount.value = lightFlow.count ?? 1;
                mat.uniforms.uLightFlowPhaseMode.value = lightFlow.phaseMode === 'sync' ? 0.0 : 1.0;
                mat.uniforms.uLightFlowPulseEnabled.value = lightFlow.pulseEnabled ? 1.0 : 0.0;
                mat.uniforms.uLightFlowPulseSpeed.value = lightFlow.pulseSpeed ?? 2.0;
                mat.uniforms.uBlendMode.value = eb.blendMode === 'additive' ? 0.0 : 1.0;
                
                // 路径系统数据更新
                if (ebData.lightPackets.length > 0 && mat.uniforms.uLightPackets && lightFlow.pathMode !== 'edge') {
                  // 使用路径系统模式
                  mat.uniforms.uUsePathSystem.value = 1.0;
                  const packets = mat.uniforms.uLightPackets.value as THREE.Vector2[];
                  for (let pi = 0; pi < 10; pi++) {
                    if (pi < ebData.lightPackets.length) {
                      const lp = ebData.lightPackets[pi];
                      packets[pi].set(lp.currentEdge, lp.edgeProgress);
                    } else {
                      packets[pi].set(-1, 0);
                    }
                  }
                } else {
                  // 使用传统模式（edge 模式或无光包数据时回退）
                  mat.uniforms.uUsePathSystem.value = 0.0;
                }
                
                // 边呼吸效果
                const edgeBreathing = eb.edgeBreathing;
                if (edgeBreathing && mat.uniforms.uEdgeBreathEnabled) {
                  mat.uniforms.uEdgeBreathEnabled.value = edgeBreathing.enabled ? 1.0 : 0.0;
                  mat.uniforms.uEdgeBreathSpeed.value = edgeBreathing.speed;
                  mat.uniforms.uEdgeBreathGlowAmp.value = edgeBreathing.glowAmplitude;
                  mat.uniforms.uEdgeBreathAlphaAmp.value = edgeBreathing.alphaAmplitude;
                  mat.uniforms.uEdgeBreathNoiseMix.value = edgeBreathing.noiseMix;
                  mat.uniforms.uEdgeBreathNoiseScale.value = edgeBreathing.noiseScale;
                  mat.uniforms.uEdgeBreathNoiseSpeed.value = edgeBreathing.noiseSpeed;
                  // 噪声跟随开关（目前固定为不跟随）
                  mat.uniforms.uEdgeBreathNoiseFollow.value = 0.0;
                }
              }
            }
            
            // ========== 顶点材质 uniforms 全量同步 ==========
            if (ebData.verticesMesh) {
              const mat = ebData.verticesMesh.material as THREE.ShaderMaterial;
              if (mat.uniforms) {
                const shapeMap: { [key: string]: number } = { 'circle': 0, 'diamond': 1, 'star': 2 };
                mat.uniforms.uTime.value = time;
                mat.uniforms.uRotationSpeed.value = eb.rotationSpeed;
                mat.uniforms.uRotationAxis.value.set(rotAxis.x, rotAxis.y, rotAxis.z);
                mat.uniforms.uBreathing.value = organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0;
                mat.uniforms.uBreathingSpeed.value = organicAnimation.breathingSpeed;
                mat.uniforms.uPointSize.value = vertexEffect.size;
                mat.uniforms.uSpherize.value = eb.spherize;
                mat.uniforms.uRadius.value = eb.radius;
                mat.uniforms.uVertexColor.value.copy(parseColor(vertexEffect.color));
                mat.uniforms.uGlowIntensity.value = vertexEffect.glowIntensity;
                mat.uniforms.uGlobalOpacity.value = eb.globalOpacity;
                mat.uniforms.uVertexShape.value = shapeMap[vertexEffect.shape] || 0;
                // 停靠脉冲
                if (mat.uniforms.uDwellEnabled) {
                  mat.uniforms.uDwellEnabled.value = lightFlow.dwellEnabled ? 1.0 : 0.0;
                  mat.uniforms.uDwellThreshold.value = lightFlow.dwellThreshold ?? 4;
                  mat.uniforms.uDwellPulseIntensity.value = lightFlow.dwellPulseIntensity ?? 1.0;
                }
              }
            }
            
            // ========== 薄壳材质 uniforms 全量同步 ==========
            if (ebData.shellMesh) {
              const mat = ebData.shellMesh.material as THREE.ShaderMaterial;
              if (mat.uniforms) {
                mat.uniforms.uTime.value = time;
                mat.uniforms.uRotationSpeed.value = eb.rotationSpeed;
                mat.uniforms.uRotationAxis.value.set(rotAxis.x, rotAxis.y, rotAxis.z);
                mat.uniforms.uBreathing.value = organicAnimation.breathingEnabled ? organicAnimation.breathingIntensity : 0;
                mat.uniforms.uBreathingSpeed.value = organicAnimation.breathingSpeed;
                mat.uniforms.uSpherize.value = eb.spherize;
                mat.uniforms.uRadius.value = eb.radius;
                mat.uniforms.uShellColor.value.copy(parseColor(shellEffect.color));
                mat.uniforms.uOpacity.value = shellEffect.opacity;
                mat.uniforms.uFresnelPower.value = shellEffect.fresnelPower;
                mat.uniforms.uFresnelIntensity.value = shellEffect.fresnelIntensity;
                mat.uniforms.uGlobalOpacity.value = eb.globalOpacity;
              }
              // 更新双面渲染
              mat.side = shellEffect.doubleSided ? THREE.DoubleSide : THREE.FrontSide;
            }
            
            // ========== Voronoi 材质 uniforms 全量同步 ==========
            if (ebData.voronoiMesh) {
              const mat = ebData.voronoiMesh.material as THREE.ShaderMaterial;
              const voronoi = eb.sphericalVoronoi;
              if (mat.uniforms && voronoi) {
                mat.uniforms.uTime.value = time;
                mat.uniforms.uRotationSpeed.value = eb.rotationSpeed;
                mat.uniforms.uRotationAxis.value.set(rotAxis.x, rotAxis.y, rotAxis.z);
                mat.uniforms.uLineColor.value.copy(parseColor(voronoi.lineColor));
                mat.uniforms.uLineWidth.value = voronoi.lineWidth;
                mat.uniforms.uLineGlow.value = voronoi.lineGlow;
                mat.uniforms.uFillOpacity.value = voronoi.fillEnabled ? voronoi.fillOpacity : 0;
                mat.uniforms.uBaseHue.value = voronoi.baseHue;
                mat.uniforms.uHueSpread.value = voronoi.hueSpread;
                const colorModeMap: { [key: string]: number } = { 'gradient': 0, 'random': 1, 'uniform': 2 };
                mat.uniforms.uColorMode.value = colorModeMap[voronoi.colorMode] || 0;
                mat.uniforms.uCellPulse.value = voronoi.cellPulse ? 1.0 : 0.0;
                mat.uniforms.uCellPulseSpeed.value = voronoi.cellPulseSpeed;
                mat.uniforms.uGlobalOpacity.value = eb.globalOpacity;
                
                // 种子点动画 - 使用更自然的噪声驱动
                if (voronoi.animateSeeds && ebData.voronoiSeeds.length > 0) {
                  const seeds = ebData.voronoiSeeds;
                  const noiseScale = voronoi.seedNoiseScale || 1.0;
                  const speed = voronoi.seedSpeed || 0.2;
                  const amplitude = 0.15 * noiseScale;
                  
                  // 伪 3D 噪声函数（简化版 Simplex-like）
                  const noise3D = (x: number, y: number, z: number) => {
                    const p = x * 12.9898 + y * 78.233 + z * 37.719;
                    return Math.sin(p) * 43758.5453 % 1;
                  };
                  
                  const animatedSeeds = seeds.map((seed, i) => {
                    // 每个种子使用不同的噪声采样位置
                    const seedHash = i * 0.618033988749895; // 黄金比例
                    const t = time * speed;
                    
                    // 多频率噪声叠加，模拟更自然的轨迹
                    const nx = noise3D(seedHash + t * 0.3, seedHash * 1.5 + t * 0.2, i * 0.1) * 2 - 1;
                    const ny = noise3D(seedHash + 100 + t * 0.25, seedHash * 1.3 + t * 0.35, i * 0.2 + 50) * 2 - 1;
                    const nz = noise3D(seedHash + 200 + t * 0.28, seedHash * 1.7 + t * 0.22, i * 0.15 + 100) * 2 - 1;
                    
                    // 低频调制
                    const lowFreq = Math.sin(t * 0.1 + i * 0.5) * 0.3 + 0.7;
                    
                    const offset = new THREE.Vector3(
                      nx * amplitude * lowFreq,
                      ny * amplitude * lowFreq,
                      nz * amplitude * lowFreq
                    );
                    
                    // 在单位球面上投影并归一化
                    return seed.clone().add(offset).normalize();
                  });
                  mat.uniforms.uSeeds.value = animatedSeeds;
                }
              }
              
              // 控制可见性
              ebData.voronoiMesh.visible = voronoi?.enabled ?? false;
            }
            
            // 更新倾斜角度
            const tiltAngles = getTiltAngles(eb.tilt);
            ebData.group.rotation.set(tiltAngles.x, tiltAngles.y, tiltAngles.z);
          });
        }
      });
      
      // 更新后期效果（根据能量体设置）
      if (chromaticPassRef.current || vignettePassRef.current) {
        let chromaticEnabled = false;
        let chromaticIntensity = 0;
        let vignetteEnabled = false;
        let vignetteIntensity = 0;
        let vignetteRadius = 0.8;
        
        // 遍历所有星球的能量体，取最大值
        currentSettings.planets?.forEach(planet => {
          planet.energyBodySystem?.energyBodies?.forEach(eb => {
            if (eb.enabled && eb.postEffects) {
              if (eb.postEffects.chromaticAberrationEnabled) {
                chromaticEnabled = true;
                chromaticIntensity = Math.max(chromaticIntensity, eb.postEffects.chromaticAberrationIntensity || 0.01);
              }
              if (eb.postEffects.vignetteEnabled) {
                vignetteEnabled = true;
                vignetteIntensity = Math.max(vignetteIntensity, eb.postEffects.vignetteIntensity || 0.5);
                vignetteRadius = eb.postEffects.vignetteRadius || 0.8;
              }
            }
          });
        });
        
        if (chromaticPassRef.current) {
          chromaticPassRef.current.enabled = chromaticEnabled;
          if (chromaticEnabled) {
            chromaticPassRef.current.uniforms.uIntensity.value = chromaticIntensity;
          }
        }
        if (vignettePassRef.current) {
          vignettePassRef.current.enabled = vignetteEnabled;
          if (vignetteEnabled) {
            vignettePassRef.current.uniforms.uIntensity.value = vignetteIntensity;
            vignettePassRef.current.uniforms.uRadius.value = vignetteRadius;
          }
        }
      }
      
      // 背景球体：只有当相机距离超过安全半径时才跟随，保留正常范围内的视差感
      if (backgroundSphereRef.current && cameraRef.current) {
        const bgRadius = 5000;
        const safeRadius = bgRadius * 0.8; // 安全半径 = 球体半径的 80%
        const camDist = cameraRef.current.position.length();
        
        if (camDist > safeRadius) {
          // 超出安全范围时，让背景跟随相机（但保持在安全半径内）
          const dir = cameraRef.current.position.clone().normalize();
          backgroundSphereRef.current.position.copy(dir.multiplyScalar(camDist - safeRadius));
        } else {
          // 正常范围内，背景固定在原点，保留视差感
          backgroundSphereRef.current.position.set(0, 0, 0);
        }
      }
      
      // ===== 更新上升效果 =====
      const dt = deltaTime / 1000;
      
      // 1. 璀璨星雨更新
      if (starRainRef.current) {
        const sr = starRainRef.current;
        const srEnabled = currentSettings.starRainEnabled;
        sr.points.visible = srEnabled;
        
        if (srEnabled) {
          // 读取所有参数
          const particleCount = Math.min(currentSettings.starRainCount || 300, sr.maxCount);
          const speed = currentSettings.starRainSpeed || 1.0;
          const speedVar = currentSettings.starRainSpeedVariation || 0.5;
          const height = currentSettings.starRainHeight || 300;
          const spread = currentSettings.starRainSpread || 150;
          const size = currentSettings.starRainSize || 3;
          const trailLength = currentSettings.starRainTrailLength || 0.4;
          const brightness = currentSettings.starRainBrightness || 1.5;
          
          const posAttr = sr.points.geometry.attributes.position as THREE.BufferAttribute;
          const sizeAttr = sr.points.geometry.attributes.size as THREE.BufferAttribute;
          
          // 只更新 particleCount 个粒子
          for (let i = 0; i < sr.maxCount; i++) {
            if (i < particleCount) {
              // 更新年龄
              sr.ages[i] += dt;
              
              // 重生检测
              if (sr.ages[i] > sr.maxAges[i] || sr.positions[i * 3 + 1] > height) {
                // 重生在底部
                sr.positions[i * 3] = (Math.random() - 0.5) * spread * 2;
                sr.positions[i * 3 + 1] = -50 + Math.random() * 30;
                sr.positions[i * 3 + 2] = (Math.random() - 0.5) * spread * 2;
                sr.ages[i] = 0;
                sr.maxAges[i] = 3 + Math.random() * 4;
                sr.velocities[i] = (1 - speedVar * 0.5 + Math.random() * speedVar) * speed;
                // 随机大小变化
                sr.sizes[i] = (0.5 + Math.random() * 1.0);
              }
              
              // 更新位置（向上移动）
              sr.positions[i * 3 + 1] += sr.velocities[i] * 50 * dt;
              // 轻微水平漂移
              sr.positions[i * 3] += Math.sin(time * 2 + i) * 0.1;
              sr.positions[i * 3 + 2] += Math.cos(time * 2 + i * 1.3) * 0.1;
            } else {
              // 超出数量的粒子移到视野外
              sr.positions[i * 3 + 1] = -10000;
            }
          }
          
          posAttr.set(sr.positions);
          posAttr.needsUpdate = true;
          sizeAttr.set(sr.sizes);
          sizeAttr.needsUpdate = true;
          
          // 更新材质 uniforms
          const mat = sr.points.material as THREE.ShaderMaterial;
          mat.uniforms.uTime.value = time;
          mat.uniforms.uBrightness.value = brightness;
          mat.uniforms.uSizeScale.value = size;
          mat.uniforms.uMaxHeight.value = height;
          mat.uniforms.uTrailLength.value = trailLength;
          
          // 更新颜色（仅在颜色变化时更新，避免每帧闪烁）
          const colorHex = currentSettings.starRainColor || '#88ccff';
          const r = parseInt(colorHex.slice(1, 3), 16) / 255;
          const g = parseInt(colorHex.slice(3, 5), 16) / 255;
          const b = parseInt(colorHex.slice(5, 7), 16) / 255;
          const colorAttr = sr.points.geometry.attributes.color as THREE.BufferAttribute;
          const colors = colorAttr.array as Float32Array;
          // 检查颜色是否需要更新（通过检查第一个粒子的颜色）
          const needColorUpdate = Math.abs(colors[0] - r) > 0.01 || Math.abs(colors[1] - g) > 0.01 || Math.abs(colors[2] - b) > 0.01;
          if (needColorUpdate) {
            for (let i = 0; i < particleCount; i++) {
              colors[i * 3] = r * (0.8 + Math.random() * 0.4);
              colors[i * 3 + 1] = g * (0.8 + Math.random() * 0.4);
              colors[i * 3 + 2] = b;
            }
            colorAttr.needsUpdate = true;
          }
        }
      }
      
      // 2. 体积薄雾更新
      if (volumeFogRef.current) {
        const vf = volumeFogRef.current;
        const vfEnabled = currentSettings.volumeFogEnabled;
        vf.visible = vfEnabled;
        
        if (vfEnabled) {
          const fogSpeed = currentSettings.volumeFogSpeed || 0.3;
          const fogOpacity = currentSettings.volumeFogOpacity || 0.12;
          const fogHeight = currentSettings.volumeFogHeight || 120;
          const fogInner = currentSettings.volumeFogInnerRadius || 50;
          const fogOuter = currentSettings.volumeFogOuterRadius || 180;
          const fogLayers = currentSettings.volumeFogLayers || 5;
          const colorHex = currentSettings.volumeFogColor || '#4488cc';
          const fogColor = new THREE.Color(colorHex);
          
          vf.children.forEach((child, i) => {
            if (child instanceof THREE.Mesh) {
              const mat = child.material as THREE.ShaderMaterial;
              mat.uniforms.uTime.value = time + i * 0.5;
              mat.uniforms.uOpacity.value = fogOpacity * (1 - i / fogLayers * 0.5);
              mat.uniforms.uColor.value = fogColor;
              
              // 上下浮动
              const baseY = (i / fogLayers) * fogHeight - fogHeight * 0.3;
              child.position.y = baseY + Math.sin(time * fogSpeed + i) * 10;
              child.rotation.z = time * fogSpeed * 0.1 + i * 0.2;
              
              // 控制可见层数
              child.visible = i < fogLayers;
            }
          });
        }
      }
      
      // 3. 光球灯笼更新
      if (lightOrbsRef.current) {
        const lo = lightOrbsRef.current;
        const loEnabled = currentSettings.lightOrbsEnabled;
        lo.group.visible = loEnabled;
        
        if (loEnabled) {
          const maxCount = currentSettings.lightOrbsMaxCount || 5;
          const spawnRate = currentSettings.lightOrbsSpawnRate || 2.5;
          const orbSize = currentSettings.lightOrbsSize || 12;
          const orbGrowth = currentSettings.lightOrbsGrowth || 2.0;
          const orbSpeed = currentSettings.lightOrbsSpeed || 0.6;
          const orbHeight = currentSettings.lightOrbsHeight || 250;
          const orbGlow = currentSettings.lightOrbsGlow || 2.5;
          const orbBurst = currentSettings.lightOrbsBurst !== false;
          const colorHex = currentSettings.lightOrbsColor || '#aaddff';
          const orbColor = new THREE.Color(colorHex);
          
          // 生成新灯笼
          if (lo.orbs.length < maxCount && time - lo.lastSpawnTime > spawnRate) {
            const geometry = new THREE.SphereGeometry(orbSize, 16, 16);
            const material = new THREE.MeshBasicMaterial({
              color: orbColor,
              transparent: true,
              opacity: 0.6,
              blending: THREE.AdditiveBlending
            });
            const mesh = new THREE.Mesh(geometry, material);
            mesh.position.set(
              (Math.random() - 0.5) * 100,
              -30,
              (Math.random() - 0.5) * 100
            );
            lo.group.add(mesh);
            lo.orbs.push({
              mesh,
              age: 0,
              maxAge: orbHeight / (orbSpeed * 50),
              speed: orbSpeed * (0.8 + Math.random() * 0.4),
              drift: { x: (Math.random() - 0.5) * 0.5, z: (Math.random() - 0.5) * 0.5 },
              burstTriggered: false
            });
            lo.lastSpawnTime = time;
          }
          
          // 更新现有灯笼
          for (let i = lo.orbs.length - 1; i >= 0; i--) {
            const orb = lo.orbs[i];
            orb.age += dt;
            const progress = orb.age / orb.maxAge;
            
            // 移动
            orb.mesh.position.y += orb.speed * 50 * dt;
            orb.mesh.position.x += Math.sin(time * 2 + i) * orb.drift.x;
            orb.mesh.position.z += Math.cos(time * 2 + i) * orb.drift.z;
            
            // 膨胀
            const scale = 1 + progress * (orbGrowth - 1);
            orb.mesh.scale.setScalar(scale);
            
            // 透明度衰减
            const mat = orb.mesh.material as THREE.MeshBasicMaterial;
            mat.opacity = 0.6 * (1 - progress * 0.7);
            mat.color = orbColor;
            
            // 爆散或移除
            if (progress >= 1) {
              lo.group.remove(orb.mesh);
              orb.mesh.geometry.dispose();
              (orb.mesh.material as THREE.Material).dispose();
              lo.orbs.splice(i, 1);
            }
          }
        }
      }
      
      // 4. 直冲电弧更新
      if (electricArcsRef.current) {
        const ea = electricArcsRef.current;
        const eaEnabled = currentSettings.electricArcsEnabled;
        ea.group.visible = eaEnabled;
        
        if (eaEnabled) {
          const interval = currentSettings.electricArcsInterval || 4;
          const arcHeight = currentSettings.electricArcsHeight || 280;
          const arcThickness = currentSettings.electricArcsThickness || 4;
          const arcBranches = currentSettings.electricArcsBranches || 3;
          const arcDuration = currentSettings.electricArcsDuration || 0.5;
          const arcGlow = currentSettings.electricArcsGlow || 5;
          const colorHex = currentSettings.electricArcsColor || '#66aaff';
          const arcColor = new THREE.Color(colorHex);
          
          // 触发新电弧
          if (time - ea.lastTriggerTime > interval && ea.arcs.length < 2) {
            const arcGroup = new THREE.Group();
            
            // 主干
            const points = [];
            const segments = 20;
            for (let j = 0; j <= segments; j++) {
              const t = j / segments;
              const x = Math.sin(t * Math.PI * 3) * 10 * (1 - t);
              const y = t * arcHeight;
              const z = Math.cos(t * Math.PI * 2) * 10 * (1 - t);
              points.push(new THREE.Vector3(x, y, z));
            }
            const curve = new THREE.CatmullRomCurve3(points);
            const tubeGeometry = new THREE.TubeGeometry(curve, 32, arcThickness, 8, false);
            const tubeMaterial = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              transparent: true,
              opacity: 1,
              blending: THREE.AdditiveBlending
            });
            const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
            arcGroup.add(tube);
            
            // 发光外层
            const glowGeometry = new THREE.TubeGeometry(curve, 32, arcThickness * 2, 8, false);
            const glowMaterial = new THREE.MeshBasicMaterial({
              color: arcColor,
              transparent: true,
              opacity: 0.5,
              blending: THREE.AdditiveBlending
            });
            const glow = new THREE.Mesh(glowGeometry, glowMaterial);
            arcGroup.add(glow);
            
            // 分支
            for (let b = 0; b < arcBranches; b++) {
              const branchStart = 0.3 + Math.random() * 0.4;
              const branchPoint = curve.getPoint(branchStart);
              const branchPoints = [branchPoint.clone()];
              const branchLength = arcHeight * 0.3 * (0.5 + Math.random() * 0.5);
              const branchAngle = (Math.random() - 0.5) * Math.PI * 0.5;
              for (let j = 1; j <= 5; j++) {
                const t = j / 5;
                branchPoints.push(new THREE.Vector3(
                  branchPoint.x + Math.sin(branchAngle) * branchLength * t + Math.random() * 5,
                  branchPoint.y + branchLength * t * 0.3,
                  branchPoint.z + Math.cos(branchAngle) * branchLength * t + Math.random() * 5
                ));
              }
              const branchCurve = new THREE.CatmullRomCurve3(branchPoints);
              const branchGeo = new THREE.TubeGeometry(branchCurve, 10, arcThickness * 0.5, 6, false);
              const branchMat = new THREE.MeshBasicMaterial({
                color: arcColor,
                transparent: true,
                opacity: 0.7,
                blending: THREE.AdditiveBlending
              });
              arcGroup.add(new THREE.Mesh(branchGeo, branchMat));
            }
            
            // 随机位置
            arcGroup.position.set(
              (Math.random() - 0.5) * 80,
              -30,
              (Math.random() - 0.5) * 80
            );
            
            ea.group.add(arcGroup);
            ea.arcs.push({
              mesh: arcGroup,
              age: 0,
              maxAge: arcDuration,
              phase: 'rising'
            });
            ea.lastTriggerTime = time;
          }
          
          // 更新现有电弧
          for (let i = ea.arcs.length - 1; i >= 0; i--) {
            const arc = ea.arcs[i];
            arc.age += dt;
            const progress = arc.age / arc.maxAge;
            
            // 闪烁效果
            const flicker = 0.7 + Math.random() * 0.3;
            arc.mesh.children.forEach(child => {
              if (child instanceof THREE.Mesh) {
                const mat = child.material as THREE.MeshBasicMaterial;
                mat.opacity = flicker * (1 - progress * 0.5);
              }
            });
            
            // 缩放动画
            if (progress < 0.2) {
              arc.mesh.scale.y = progress / 0.2;
            } else if (progress > 0.7) {
              arc.mesh.scale.y = 1 - (progress - 0.7) / 0.3;
            }
            
            // 移除
            if (progress >= 1) {
              arc.mesh.children.forEach(child => {
                if (child instanceof THREE.Mesh) {
                  child.geometry.dispose();
                  (child.material as THREE.Material).dispose();
                }
              });
              ea.group.remove(arc.mesh);
              ea.arcs.splice(i, 1);
            }
          }
        }
      }
      
      // 渲染
      if (composerRef.current) {
        composerRef.current.render();
      }
      
      // 更新相机信息（每帧回调一次会太频繁，限制为每10帧一次）
      if (onCameraChangeRef.current && cameraRef.current && controlsRef.current && Math.floor(time * 60) % 10 === 0) {
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        const distance = camera.position.distanceTo(controls.target);
        
        onCameraChangeRef.current({
          position: {
            x: Math.round(camera.position.x),
            y: Math.round(camera.position.y),
            z: Math.round(camera.position.z)
          },
          distance: Math.round(distance),
          polarAngle: Math.round(controls.getPolarAngle() * 180 / Math.PI),
          azimuthAngle: Math.round(controls.getAzimuthalAngle() * 180 / Math.PI)
        });
      }
    };
    
    animate(0);
    
    return () => {
      cancelAnimationFrame(animationFrameRef.current);
    };
  }, [handData]); // 只依赖 handData
  
  // 存储回调的 ref（避免动画循环依赖）
  const onCameraChangeRef = useRef(onCameraChange);
  useEffect(() => {
    onCameraChangeRef.current = onCameraChange;
  }, [onCameraChange]);
  
  // 设置重置相机函数
  useEffect(() => {
    if (resetCameraRef) {
      resetCameraRef.current = () => {
        if (!cameraRef.current || !controlsRef.current) return;
        
        const camera = cameraRef.current;
        const controls = controlsRef.current;
        
        // 目标位置
        const targetPos = new THREE.Vector3(
          INITIAL_CAMERA.position.x,
          INITIAL_CAMERA.position.y,
          INITIAL_CAMERA.position.z
        );
        const targetTarget = new THREE.Vector3(
          INITIAL_CAMERA.target.x,
          INITIAL_CAMERA.target.y,
          INITIAL_CAMERA.target.z
        );
        
        // 平滑过渡动画
        const startPos = camera.position.clone();
        const startTarget = controls.target.clone();
        const duration = 800; // 毫秒
        const startTime = Date.now();
        
        const animateReset = () => {
          const elapsed = Date.now() - startTime;
          const progress = Math.min(elapsed / duration, 1);
          // 缓动函数 (easeOutCubic)
          const eased = 1 - Math.pow(1 - progress, 3);
          
          camera.position.lerpVectors(startPos, targetPos, eased);
          controls.target.lerpVectors(startTarget, targetTarget, eased);
          controls.update();
          
          if (progress < 1) {
            requestAnimationFrame(animateReset);
          }
        };
        
        animateReset();
      };
    }
    
    return () => {
      if (resetCameraRef) {
        resetCameraRef.current = null;
      }
    };
  }, [resetCameraRef]);

  // 创建星球的所有网格
  function createPlanetMeshes(planet: PlanetSettings, sceneSettings: PlanetSceneSettings) {
    // 检测移动设备
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    // 获取基础半径（根据核心类型）- 为旧数据提供默认值保护
    const coreSystem = planet.coreSystem;
    const cores = coreSystem?.cores || [];
    const solidCores = coreSystem?.solidCores || (coreSystem?.solidCore ? [coreSystem.solidCore] : []);
    let baseRadius: number;
    let coreObject: THREE.Group;
    
    // 创建总核心组（包含粒子核心和实体核心）
    const allCoreGroup = new THREE.Group();
    allCoreGroup.name = 'allCores';
    
    // === 实体核心（多实例）===
    const solidCoresEnabled = coreSystem?.solidCoresEnabled !== false;
    if (solidCores.length > 0) {
      const solidCoreGroup = new THREE.Group();
      solidCoreGroup.name = 'solidCores';
      
      solidCores.forEach(sc => {
        const visible = solidCoresEnabled && sc.enabled;
        const mesh = createSolidCoreMesh(sc, isMobile);
        mesh.name = `solidCore_${sc.id}`;
        mesh.userData = { solidCoreId: sc.id };
        mesh.visible = visible;
        solidCoreGroup.add(mesh);
      });
      
      allCoreGroup.add(solidCoreGroup);
    }
    
    // 计算基础半径（优先取第一个启用的粒子核心）
    const firstEnabledCore = cores.find(c => c.enabled);
    const firstEnabledSolidCore = solidCores.find(c => c.enabled);
    baseRadius = firstEnabledCore?.baseRadius || firstEnabledSolidCore?.radius || cores[0]?.baseRadius || 100;
    
    // === 粒子核心（支持多核心叠加 + Solo模式）===
    {
      const coreGroup = new THREE.Group();
      const coresEnabled = coreSystem?.coresEnabled !== false;
      
      // 创建所有核心的 mesh（通过 visible 控制显示）
      cores.forEach(coreConfig => {
        const coreGeometry = createCoreGeometry(coreConfig);
        
        // 计算初始可见性
        let initialVisible = false;
        if (coresEnabled) {
          if (sceneSettings.soloCoreId) {
            initialVisible = coreConfig.id === sceneSettings.soloCoreId;
          } else {
            initialVisible = coreConfig.enabled;
          }
        }
        
        // 创建核心组（包含主层和拖尾层）
        const singleCoreGroup = new THREE.Group();
        singleCoreGroup.name = `core_${coreConfig.id}`;
        singleCoreGroup.userData = { coreId: coreConfig.id };
        
        // 拖尾层数量（根据 trailLength 计算，0=无拖尾）
        const trailLength = coreConfig.trailLength || 0;
        const trailLayers = trailLength > 0 ? Math.floor(trailLength * 5) + 1 : 0; // 1-11 层
        
        // 创建拖尾层（先渲染，在主层下面）
        if (trailLayers > 0 && Math.abs(coreConfig.rotationSpeed) > 0.01) {
          const rotAxis = getRotationAxis(coreConfig.rotationAxis);
          const rotAxisVec = new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z).normalize();
          
          for (let i = trailLayers; i >= 1; i--) {
            // 透明度：从外到内递增
            const alpha = (1 - i / (trailLayers + 1)) * 0.6;
            // 旋转偏移：根据自转方向反向偏移
            const angleOffset = -i * 0.05 * Math.sign(coreConfig.rotationSpeed);
            
            const trailMaterial = createCoreMaterial(coreConfig, sceneSettings, alpha);
            const trailPoints = new THREE.Points(coreGeometry.clone(), trailMaterial);
            
            // 预先应用旋转偏移
            const rotMatrix = new THREE.Matrix4().makeRotationAxis(rotAxisVec, angleOffset);
            trailPoints.applyMatrix4(rotMatrix);
            trailPoints.userData = { isTrail: true, trailIndex: i };
            
            singleCoreGroup.add(trailPoints);
          }
        }
        
        // 主层（最后渲染，在最上面）
        const coreMaterial = createCoreMaterial(coreConfig, sceneSettings, 1.0);
        const corePoints = new THREE.Points(coreGeometry, coreMaterial);
        corePoints.userData = { isMain: true };
        singleCoreGroup.add(corePoints);
        
        // 设置初始可见性
        singleCoreGroup.visible = initialVisible;
        
        coreGroup.add(singleCoreGroup);
      });
      
      coreGroup.name = 'particleCores';
      allCoreGroup.add(coreGroup);
    }
    
    coreObject = allCoreGroup;
    
    // === 火焰系统 ===
    const flamesGroup = new THREE.Group();
    flamesGroup.name = 'flames';
    
    // 表面火焰 - 始终创建组以便更新逻辑能正常工作
    const surfaceFlames = planet.flameSystem?.surfaceFlames || [];
    const flamesEnabled = planet.flameSystem?.enabled !== false;
    const surfaceFlamesGroup = new THREE.Group();
    surfaceFlamesGroup.name = 'surfaceFlames';
    
    surfaceFlames.forEach(flame => {
      const visible = flamesEnabled && flame.enabled;
      const mesh = createSurfaceFlameMesh(flame, isMobile);
      mesh.userData = { flameId: flame.id, flameType: 'surface' };
      mesh.visible = visible;
      surfaceFlamesGroup.add(mesh);
    });
    
    flamesGroup.add(surfaceFlamesGroup);
    
    // 喷发火柱 - 始终创建组
    const flameJets = planet.flameSystem?.flameJets || [];
    const flameJetsGroup = new THREE.Group();
    flameJetsGroup.name = 'flameJets';
    
    flameJets.forEach(jet => {
      const visible = flamesEnabled && jet.enabled;
      const points = createFlameJetPoints(jet, isMobile);
      points.userData = { flameId: jet.id, flameType: 'jet' };
      points.visible = visible;
      flameJetsGroup.add(points);
    });
    
    flamesGroup.add(flameJetsGroup);
    
    // 螺旋火焰 - 始终创建组
    const spiralFlames = planet.flameSystem?.spiralFlames || [];
    const spiralFlamesGroup = new THREE.Group();
    spiralFlamesGroup.name = 'spiralFlames';
    
    spiralFlames.forEach(spiral => {
      const visible = flamesEnabled && spiral.enabled;
      const points = createSpiralFlamePoints(spiral, isMobile);
      points.userData = { flameId: spiral.id, flameType: 'spiral' };
      points.visible = visible;
      spiralFlamesGroup.add(points);
    });
    
    flamesGroup.add(spiralFlamesGroup);
    
    // === 残影系统（新版）===
    try {
      const afterimageSystem = planet.afterimageSystem || { enabled: false, zones: [], particles: { enabled: false, speed: 2, speedRandomness: 0.2, density: 100, size: 8, sizeDecay: 'linear' as const, lifespan: 2, fadeOutCurve: 'quadratic' as const, colorMode: 'gradient' as const, colors: ['#ff4400', '#ffff00'] }, texture: { enabled: false, pulseEnabled: false, pulseSpeed: 1, pulseWidth: 0.3, rippleEnabled: false, rippleCount: 3, rippleSpeed: 0.5, opacity: 0.5, color: '#ff6600' }, outsideClearSpeed: 3 };
      
      // 获取绑定核心的半径
      let boundCoreRadius = baseRadius;
      const bindId = afterimageSystem.bindToCoreId;
      if (bindId) {
        // 查找粒子核心
        const boundParticleCore = cores.find(c => c.id === bindId);
        if (boundParticleCore) {
          boundCoreRadius = boundParticleCore.baseRadius;
        } else {
          // 查找实体核心
          const boundSolidCore = solidCores.find(c => c.id === bindId);
          if (boundSolidCore) {
            boundCoreRadius = boundSolidCore.radius;
          }
        }
      }
      
      const afterimageGroup = createAfterimageSystem(afterimageSystem, boundCoreRadius, isMobile);
      afterimageGroup.billboard.userData = { type: 'afterimage', bindToCoreId: bindId };
      flamesGroup.add(afterimageGroup.billboard);
    } catch (e) {
      console.error('残影系统创建失败:', e);
    }
    
    // === 光环 ===
    const rings = new THREE.Group();
    
    // 粒子环 - 仅在全局开关启用时显示
    planet.rings.particleRings.forEach(ring => {
      if (!planet.rings.particleRingsEnabled || !ring.enabled) return;
      
      const ringGeom = createParticleRingGeometry(ring, baseRadius);
      
      // 粒子环组（包含主层和可能的拖尾层）
      const ringGroup = new THREE.Group();
      ringGroup.userData = { ringId: ring.id, type: 'particle', rotationSpeed: ring.rotationSpeed ?? 0.3 };
      
      // 拖尾层（trailLength > 0 时启用）
      const trailLayers = (ring.trailLength ?? 0) > 0 ? Math.ceil(ring.trailLength * 5) : 0;
      for (let i = trailLayers; i > 0; i--) {
        const trailAlpha = 1 - (i / (trailLayers + 1));
        const trailOffset = i * 0.02 * (ring.rotationSpeed ?? 0.3);
        
        const trailMat = new THREE.ShaderMaterial({
          vertexShader: planetVertexShader,
          fragmentShader: planetFragmentShader,
          uniforms: {
            uTime: { value: 0 },
            uRotationSpeed: { value: 0 }, // 自转在 JavaScript 中通过 rotateOnAxis 实现
            uRotationAxis: { value: new THREE.Vector3(0, 1, 0) },
            uBreathing: { value: 0 },
            uBreathingSpeed: { value: 0.5 },
            uFlicker: { value: 0 },
            uFlickerSpeed: { value: 2 },
            uHandPos: { value: new THREE.Vector3() },
            uHandActive: { value: 0 },
            uInteractionRadius: { value: 150 },
            uInteractionStrength: { value: 80 },
            uGlowIntensity: { value: 3 },
            uSaturation: { value: 1.2 },
            uTrailAlpha: { value: trailAlpha * 0.5 },
            uTrailOffset: { value: trailOffset },
            uWanderingLightning: { value: 0 },
            uWanderingLightningSpeed: { value: 0 },
            uWanderingLightningDensity: { value: 0 },
            uLightningBreakdown: { value: 0 },
            uLightningBreakdownFreq: { value: 0 },
            uLightningBranches: { value: 0 }
          },
          transparent: true,
          blending: THREE.AdditiveBlending,
          depthWrite: false
        });
        
        const trailPoints = new THREE.Points(ringGeom.clone(), trailMat);
        trailPoints.userData = { isTrail: true, trailIndex: i };
        ringGroup.add(trailPoints);
      }
      
      // 主层
      const silkEffect = ring.silkEffect || { enabled: false, thicknessVariation: 0.5, dashPattern: 0.3, noiseStrength: 0.3, noiseFrequency: 1.0 };
      const ringMat = new THREE.ShaderMaterial({
        vertexShader: planetVertexShader,
        fragmentShader: planetFragmentShader,
        uniforms: {
          uTime: { value: 0 },
          uRotationSpeed: { value: 0 }, // 自转在 JavaScript 中通过 rotateOnAxis 实现
          uRotationAxis: { value: new THREE.Vector3(0, 1, 0) },
          uBreathing: { value: 0 },
          uBreathingSpeed: { value: 0.5 },
          uFlicker: { value: 0 },
          uFlickerSpeed: { value: 2 },
          uHandPos: { value: new THREE.Vector3() },
          uHandActive: { value: 0 },
          uInteractionRadius: { value: 150 },
          uInteractionStrength: { value: 80 },
          uGlowIntensity: { value: 3 },
          uSaturation: { value: 1.2 },
          uTrailAlpha: { value: 1.0 },
          // 丝线效果 uniforms
          uSilkEnabled: { value: silkEffect.enabled ? 1 : 0 },
          uSilkThicknessVar: { value: silkEffect.thicknessVariation },
          uSilkDashPattern: { value: silkEffect.dashPattern },
          uSilkNoiseStrength: { value: silkEffect.noiseStrength },
          uSilkNoiseFreq: { value: silkEffect.noiseFrequency },
          uSilkRingCount: { value: silkEffect.ringCount ?? 5 },
          uSilkRingSharpness: { value: silkEffect.ringSharpness ?? 0.7 },
          uWanderingLightning: { value: 0 },
          uWanderingLightningSpeed: { value: 0 },
          uWanderingLightningDensity: { value: 0 },
          uLightningBreakdown: { value: 0 },
          uLightningBreakdownFreq: { value: 0 },
          uLightningBranches: { value: 0 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const ringPoints = new THREE.Points(ringGeom, ringMat);
      ringPoints.renderOrder = 20;  // 在实体核心之后渲染
      ringGroup.add(ringPoints);
      
      // 应用倾斜 - 使用新的TiltSettings
      const tiltAngles = getTiltAngles(ring.tilt);
      ringGroup.rotation.x = THREE.MathUtils.degToRad(tiltAngles.x);
      ringGroup.rotation.y = THREE.MathUtils.degToRad(tiltAngles.y);
      ringGroup.rotation.z = THREE.MathUtils.degToRad(tiltAngles.z);
      
      rings.add(ringGroup);
    });
    
    // 连续环带 - 仅在全局开关启用时显示
    planet.rings.continuousRings.forEach(ring => {
      if (!planet.rings.continuousRingsEnabled || !ring.enabled) return;
      
      // 使用绝对半径
      const innerR = ring.absoluteInnerRadius;
      const outerR = ring.absoluteOuterRadius;
      const avgRadius = (innerR + outerR) / 2;
      const eccentricity = ring.eccentricity || 0;
      
      // 创建椭圆环几何体（支持离心率）
      const ringGeom = createEllipticalRingGeometry(innerR, outerR, eccentricity, 64);
      const [r, g, b] = hexToRgb(ring.color);
      
      // 颜色模式处理
      const gc = ring.gradientColor;
      const colorMode = gc?.enabled ? (['none', 'twoColor', 'threeColor', 'procedural'].indexOf(gc.mode || 'twoColor')) : 0;
      // 单色模式时，使用基础色的亮度渐变
      const useGradient = gc?.enabled && gc?.mode !== 'none';
      let color1, color2, color3;
      if (useGradient && gc?.colors?.length >= 1) {
        color1 = hexToRgb(gc.colors[0] || ring.color);
        color2 = hexToRgb(gc.colors[1] || gc.colors[0] || ring.color);
        color3 = hexToRgb(gc.colors[2] || gc.colors[1] || gc.colors[0] || ring.color);
      } else {
        // 单色模式：使用基础色的不同亮度变化
        const baseColor = hexToRgb(ring.color);
        color1 = [baseColor[0] * 0.6, baseColor[1] * 0.6, baseColor[2] * 0.6]; // 暗部
        color2 = baseColor; // 中间
        color3 = [Math.min(1, baseColor[0] * 1.4), Math.min(1, baseColor[1] * 1.4), Math.min(1, baseColor[2] * 1.4)]; // 亮部
      }
      
      // 渐变方向
      const directionMap: Record<string, number> = { 'radial': 0, 'linearX': 1, 'linearY': 2, 'linearZ': 3, 'linearCustom': 4, 'spiral': 5 };
      const gradientDirection = directionMap[gc?.direction || 'radial'] || 0;
      const customDir = gc?.directionCustom || { x: 1, y: 0, z: 0 };
      
      // 漩涡设置
      const vortex = ring.vortex;
      const vortexColors = (vortex?.colors || ['#ff6b6b', '#4ecdc4']).map(c => {
        const [vr, vg, vb] = hexToRgb(c);
        return new THREE.Vector3(vr, vg, vb);
      });
      // 填充到7个颜色
      while (vortexColors.length < 7) {
        vortexColors.push(vortexColors[vortexColors.length - 1] || new THREE.Vector3(1, 1, 1));
      }
      const radialDirMap: Record<string, number> = { 'static': 0, 'inward': 1, 'outward': 2 };
      
      const brightness = ring.brightness || 1.0;
      const ringMat = new THREE.ShaderMaterial({
        vertexShader: ringVertexShader,
        fragmentShader: ringFragmentShader,
        uniforms: {
          uColor: { value: new THREE.Vector3(r * brightness, g * brightness, b * brightness) },
          uGradientColor1: { value: new THREE.Vector3(color1[0] * brightness, color1[1] * brightness, color1[2] * brightness) },
          uGradientColor2: { value: new THREE.Vector3(color2[0] * brightness, color2[1] * brightness, color2[2] * brightness) },
          uGradientColor3: { value: new THREE.Vector3(color3[0] * brightness, color3[1] * brightness, color3[2] * brightness) },
          uColorMode: { value: colorMode },
          uGradientDirection: { value: gradientDirection },
          uGradientCustomDir: { value: new THREE.Vector3(customDir.x, customDir.y, customDir.z) },
          uColorMidPosition: { value: gc?.colorMidPosition ?? 0.5 },
          uColorMidWidth: { value: gc?.colorMidWidth ?? 1 },
          uColorMidWidth2: { value: gc?.colorMidWidth2 ?? 0 },
          uBlendStrength: { value: gc?.blendStrength ?? 1.0 },
          uSpiralDensity: { value: gc?.spiralDensity ?? 2 },
          uSpiralAxis: { value: ['x', 'y', 'z'].indexOf(gc?.spiralAxis || 'y') },
          uProceduralIntensity: { value: gc?.proceduralIntensity ?? 1.0 },
          uOpacity: { value: ring.opacity },
          uOpacityGradient: { value: ['none', 'fadeIn', 'fadeOut', 'fadeBoth'].indexOf(ring.opacityGradient) },
          uOpacityGradientStrength: { value: ring.opacityGradientStrength ?? 0.5 },
          uTime: { value: 0 },
          uRingRadius: { value: avgRadius },
          // 漩涡效果 uniforms
          uVortexEnabled: { value: vortex?.enabled ? 1 : 0 },
          uVortexArmCount: { value: vortex?.armCount ?? 4 },
          uVortexTwist: { value: vortex?.twist ?? 2 },
          uVortexRotationSpeed: { value: vortex?.rotationSpeed ?? 0.5 },
          uVortexRadialDir: { value: radialDirMap[vortex?.radialDirection || 'static'] ?? 0 },
          uVortexRadialSpeed: { value: vortex?.radialSpeed ?? 0.3 },
          uVortexHardness: { value: vortex?.hardness ?? 0.5 },
          uVortexColors: { value: vortexColors },
          uVortexColorCount: { value: vortex?.colors?.length ?? 2 },
          // 显隐效果 uniforms
          uVisibilityEnabled: { value: ring.visibilityEffect?.enabled ? 1 : 0 },
          uVisibilityZones: { value: (ring.visibilityEffect?.zones || [{ startAngle: 0, endAngle: 180 }]).slice(0, 4).map(z => new THREE.Vector2(z.startAngle, z.endAngle)).concat(Array(4).fill(new THREE.Vector2(0, 0))).slice(0, 4) },
          uVisibilityZoneCount: { value: Math.min(ring.visibilityEffect?.zones?.length ?? 1, 4) },
          uVisibilityFadeAngle: { value: ring.visibilityEffect?.fadeAngle ?? 15 },
          uVisibilityDynamic: { value: ring.visibilityEffect?.dynamicRotation ? 1 : 0 },
          uVisibilityRotSpeed: { value: ring.visibilityEffect?.rotationSpeed ?? 0.5 },
          // 拉丝效果 uniforms
          uStreakEnabled: { value: ring.streakMode?.enabled ? 1 : 0 },
          uStreakFlowSpeed: { value: ring.streakMode?.flowSpeed ?? 0.5 },
          uStreakStripeCount: { value: ring.streakMode?.stripeCount ?? 12 },
          uStreakRadialStretch: { value: ring.streakMode?.radialStretch ?? 8 },
          uStreakSharpness: { value: ring.streakMode?.edgeSharpness ?? 0.3 },
          uStreakDistortion: { value: ring.streakMode?.distortion ?? 0.5 },
          uStreakNoiseScale: { value: ring.streakMode?.noiseScale ?? 1.0 },
          uStreakDirection: { value: ring.streakMode?.flowDirection === 'ccw' ? -1.0 : 1.0 },
          uStreakBrightness: { value: ring.streakMode?.brightness ?? 1.5 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      });
      
      const ringMesh = new THREE.Mesh(ringGeom, ringMat);
      ringMesh.userData = { ringId: ring.id, type: 'continuous', rotationSpeed: ring.rotationSpeed ?? 0.1 };
      ringMesh.renderOrder = 20;  // 在实体核心之后渲染
      
      // 应用倾斜 - 使用新的TiltSettings
      const tiltAngles = getTiltAngles(ring.tilt);
      ringMesh.rotation.x = THREE.MathUtils.degToRad(tiltAngles.x + 90); // 使环带水平
      ringMesh.rotation.y = THREE.MathUtils.degToRad(tiltAngles.y);
      ringMesh.rotation.z = THREE.MathUtils.degToRad(tiltAngles.z);
      
      rings.add(ringMesh);
    });
    
    // === 辐射系统 ===
    const radiation = new THREE.Group();
    const emitters: any[] = [];
    
    // 粒子环绕 - 仅在系统级和子模块开关都启用时处理
    // 获取第一个启用的粒子核心配置用于环绕粒子材质
    const orbitingCoreRef = firstEnabledCore || cores[0];
    const radiationSystemEnabled = planet.radiation.enabled !== false;
    
    if (radiationSystemEnabled && planet.radiation.orbitingEnabled && orbitingCoreRef) {
      planet.radiation.orbitings.forEach(orbiting => {
        if (!orbiting.enabled) return;
        const orbitingGeom = createOrbitingParticlesGeometry(orbiting, baseRadius);
        const orbitingMat = createCoreMaterial(orbitingCoreRef, sceneSettings);
        const orbitingPoints = new THREE.Points(orbitingGeom, orbitingMat);
        orbitingPoints.renderOrder = 8;  // 在背面深度之后，正面核心之前
        // 存储 userData 用于动画循环
        orbitingPoints.userData = {
          type: 'orbiting',
          orbitingId: orbiting.id,
          baseSpeed: orbiting.baseSpeed || 0.5,
          mainDirection: orbiting.mainDirection || { x: 0, y: 1, z: 0 }
        };
        radiation.add(orbitingPoints);
      });
    }
    
    // 粒子喷射 - 仅在系统级和子模块开关都启用时处理
    if (radiationSystemEnabled && planet.radiation.emitterEnabled) {
      planet.radiation.emitters.forEach(emitterSettings => {
        if (!emitterSettings.enabled) return;
        const emitterData = createParticleEmitter(baseRadius);
        emitterData.mesh.renderOrder = 8;  // 在背面深度之后，正面核心之前
        // 存储 emitter ID 用于动画循环中匹配
        emitterData.mesh.userData = { emitterId: emitterSettings.id };
        radiation.add(emitterData.mesh);
        emitters.push(emitterData);
      });
    }
    
    // === 流萤 ===
    const fireflies = new THREE.Group();
    const fireflyDataList: FireflyRuntimeData[] = [];
    const fireflySystemEnabled = planet.fireflies.enabled !== false;
    
    // 旋转流萤 - 仅在系统级和子模块开关都启用时处理
    if (fireflySystemEnabled && planet.fireflies.orbitingEnabled) {
      planet.fireflies.orbitingFireflies.forEach(firefly => {
        if (!firefly.enabled) return;
        const fireflyData = createOrbitingFirefly(firefly, baseRadius);
        fireflies.add(fireflyData.group);
        fireflyDataList.push(fireflyData);
      });
    }
    
    // 游走流萤 - 仅在系统级和子模块开关都启用时处理
    if (fireflySystemEnabled && planet.fireflies.wanderingEnabled) {
      planet.fireflies.wanderingGroups.forEach(groupSettings => {
        if (!groupSettings.enabled) return;
        const wanderingFireflies = createWanderingFireflyGroup(groupSettings, baseRadius);
        wanderingFireflies.forEach(fireflyData => {
          fireflies.add(fireflyData.group);
          fireflyDataList.push(fireflyData);
        });
      });
    }
    
    // === 法阵 ===
    const magicCircles = new THREE.Group();
    const magicCircleDataList: MagicCircleRuntimeData[] = [];
    
    // 仅在全局开关启用时处理
    if (planet.magicCircles?.enabled) {
      planet.magicCircles.circles.forEach(circleSettings => {
        if (!circleSettings.enabled) return;
        const circleData = createMagicCircle(circleSettings);
        magicCircles.add(circleData.mesh);
        magicCircleDataList.push(circleData);
      });
    }
    
    // === 能量体 ===
    const energyBodies = new THREE.Group();
    const energyBodyDataList: EnergyBodyRuntimeData[] = [];
    
    // 仅在系统级和子模块开关都启用时处理
    const ebCoreEnabled = planet.energyBodySystem?.coreEnabled !== false;
    if (planet.energyBodySystem?.enabled && ebCoreEnabled) {
      planet.energyBodySystem.energyBodies?.forEach(ebSettings => {
        if (!ebSettings.enabled) return;
        const ebData = createEnergyBodyMesh(ebSettings);
        energyBodies.add(ebData.group);
        energyBodyDataList.push({
          id: ebSettings.id,
          group: ebData.group,
          edgesMesh: ebData.edgesMesh,
          verticesMesh: ebData.verticesMesh,
          shellMesh: ebData.shellMesh,
          voronoiMesh: ebData.voronoiMesh,
          voronoiSeeds: ebData.voronoiSeeds,
          vertexDegrees: ebData.vertexDegrees,
          graph: ebData.graph,
          lightPackets: ebData.lightPackets,
          edgeLightData: ebData.edgeLightData,
          settings: ebSettings
        });
      });
    }
    
    return { core: coreObject, flames: flamesGroup, rings, radiation, fireflies, magicCircles, energyBodies, emitters, fireflyData: fireflyDataList, magicCircleData: magicCircleDataList, energyBodyData: energyBodyDataList };
  }

  // 创建核心几何体
  function createCoreGeometry(core: PlanetCoreSettings | undefined): THREE.BufferGeometry {
    if (!core) {
      // 返回空几何体
      return new THREE.BufferGeometry();
    }
    const radius = core.baseRadius;
    
    // 根据密度计算粒子数，限制最大数量以保证性能
    const surfaceArea = 4 * Math.PI * radius * radius;
    const rawCount = Math.floor(surfaceArea * core.density * 0.01);
    const particleCount = Math.min(rawCount, 10000); // 最多 10000 粒子
    
    let fillPercent = 0;
    if (core.fillMode === PlanetFillMode.Gradient) {
      fillPercent = core.fillPercent;
    } else if (core.fillMode === PlanetFillMode.Solid) {
      fillPercent = 100;
    }
    
    const positions = fibonacciSphere(particleCount, radius, fillPercent);
    
    // 颜色
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const ids = new Float32Array(particleCount);
    const radialDists = new Float32Array(particleCount);
    
    // 亮度系数
    const brightness = core.brightness || 1.0;
    // 大小系数
    const sizeScale = core.particleSize || 1.0;
    
    // 渐变配置
    const grad = core.gradientColor;
    const baseSat = core.baseSaturation ?? 1.0;
    
    for (let i = 0; i < particleCount; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1];
      const z = positions[i * 3 + 2];
      const dist = Math.sqrt(x * x + y * y + z * z) / radius;
      
      radialDists[i] = dist;
      
      let r: number, g: number, b: number;
      
      // 根据渐变模式计算颜色
      if (grad.enabled && grad.mode !== 'none') {
        // 计算渐变因子 t (0-1)
        let t = 0;
        
        if (grad.mode === 'procedural') {
          // 混色渐变（程序化）：基础色相 + 坐标 × 强度
          let axisValue = 0;
          const intensity = grad.proceduralIntensity ?? 1.0;
          
          if (grad.proceduralAxis === 'x') {
            axisValue = x / radius; // -1 to 1
          } else if (grad.proceduralAxis === 'y') {
            axisValue = y / radius;
          } else if (grad.proceduralAxis === 'z') {
            axisValue = z / radius;
          } else {
            // 自定义轴向
            const axis = grad.proceduralCustomAxis || { x: 0, y: 1, z: 0 };
            const len = Math.sqrt(axis.x * axis.x + axis.y * axis.y + axis.z * axis.z) || 1;
            axisValue = (x * axis.x + y * axis.y + z * axis.z) / (radius * len);
          }
          
          // 计算色相：基础色相 + (坐标值 × 强度)
          // axisValue 范围 -1 到 1，映射到色相偏移
          const hueOffset = axisValue * intensity * 180; // 强度1时，从-180到180度
          let hue = (core.baseHue + hueOffset) % 360;
          if (hue < 0) hue += 360;
          
          [r, g, b] = hslToRgb(hue, baseSat, 0.6);
        } else {
          // 双色/三色渐变：计算渐变因子
          const direction = grad.direction || 'radial';
          
          if (direction === 'radial') {
            // 径向渐变：从中心向外
            t = dist;
          } else if (direction === 'linearX') {
            t = (x / radius + 1) / 2; // 0-1
          } else if (direction === 'linearY') {
            t = (y / radius + 1) / 2;
          } else if (direction === 'linearZ') {
            t = (z / radius + 1) / 2;
          } else if (direction === 'linearCustom') {
            // 自定义方向向量
            const dir = grad.directionCustom || { x: 1, y: 0, z: 0 };
            const len = Math.sqrt(dir.x * dir.x + dir.y * dir.y + dir.z * dir.z) || 1;
            const dotProduct = (x * dir.x + y * dir.y + z * dir.z) / (radius * len);
            t = (dotProduct + 1) / 2; // 0-1
          } else if (direction === 'spiral') {
            // 螺旋渐变
            const spiralAxis = grad.spiralAxis || 'y';
            const density = grad.spiralDensity || 2;
            let angle = 0;
            let axisPos = 0;
            
            if (spiralAxis === 'y') {
              angle = Math.atan2(z, x);
              axisPos = (y / radius + 1) / 2;
            } else if (spiralAxis === 'x') {
              angle = Math.atan2(z, y);
              axisPos = (x / radius + 1) / 2;
            } else {
              angle = Math.atan2(y, x);
              axisPos = (z / radius + 1) / 2;
            }
            
            // 螺旋：角度 + 轴向位置 × 圈数
            t = ((angle / (2 * Math.PI) + 0.5) + axisPos * density) % 1;
          }
          
          // 颜色插值
          if (grad.mode === 'twoColor' && grad.colors.length >= 2) {
            const [r1, g1, b1] = hexToRgb(grad.colors[0]);
            const [r2, g2, b2] = hexToRgb(grad.colors[1]);
            r = r1 + (r2 - r1) * t;
            g = g1 + (g2 - g1) * t;
            b = b1 + (b2 - b1) * t;
          } else if (grad.mode === 'threeColor' && grad.colors.length >= 3) {
            const midPos = grad.colorMidPosition ?? 0.5;
            const midWidth = grad.colorMidWidth ?? 1;
            const midWidth2 = grad.colorMidWidth2 ?? 0;
            const [r1, g1, b1] = hexToRgb(grad.colors[0]);
            const [r2, g2, b2] = hexToRgb(grad.colors[1]);
            const [r3, g3, b3] = hexToRgb(grad.colors[2]);
            
            // 计算混合权重和范围扩展
            const blendWeight = Math.min(midWidth, 1);
            const rangeExpand = Math.max(midWidth - 1, 0) * 0.2;
            const bandHalf = midWidth2 * 0.5;
            const midStart = Math.max(0.01, midPos - rangeExpand - bandHalf);
            const midEnd = Math.min(0.99, midPos + rangeExpand + bandHalf);
            
            // 计算三色渐变结果
            let tr, tg, tb;
            if (t < midStart) {
              const t1 = t / midStart;
              tr = r1 + (r2 - r1) * t1;
              tg = g1 + (g2 - g1) * t1;
              tb = b1 + (b2 - b1) * t1;
            } else if (t > midEnd) {
              const t2 = (t - midEnd) / (1 - midEnd);
              tr = r2 + (r3 - r2) * t2;
              tg = g2 + (g3 - g2) * t2;
              tb = b2 + (b3 - b2) * t2;
            } else {
              tr = r2; tg = g2; tb = b2;
            }
            
            // 计算双色渐变结果
            const dr = r1 + (r3 - r1) * t;
            const dg = g1 + (g3 - g1) * t;
            const db = b1 + (b3 - b1) * t;
            
            // 根据 blendWeight 混合
            r = dr + (tr - dr) * blendWeight;
            g = dg + (tg - dg) * blendWeight;
            b = db + (tb - db) * blendWeight;
          } else {
            // 回退到单色
            [r, g, b] = hslToRgb(core.baseHue, baseSat, 0.6);
          }
        }
      } else {
        // 单色模式：使用基础色相 + 饱和度
        [r, g, b] = hslToRgb(core.baseHue, baseSat, 0.6);
      }
      
      // 应用亮度
      colors[i * 3] = r * brightness;
      colors[i * 3 + 1] = g * brightness;
      colors[i * 3 + 2] = b * brightness;
      
      sizes[i] = (2 + Math.random() * 3) * sizeScale;
      ids[i] = i;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
    geometry.setAttribute('aRadialDist', new THREE.BufferAttribute(radialDists, 1));
    
    return geometry;
  }

  // 创建核心材质
  function createCoreMaterial(core: PlanetCoreSettings | undefined, sceneSettings: PlanetSceneSettings, trailAlpha: number = 1.0): THREE.ShaderMaterial {
    const rotSpeed = core?.rotationSpeed || 0.3;
    const rotAxis = core ? getRotationAxis(core.rotationAxis) : { x: 0, y: 1, z: 0 };
    
    return new THREE.ShaderMaterial({
      vertexShader: planetVertexShader,
      fragmentShader: planetFragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uRotationSpeed: { value: rotSpeed },
        uRotationAxis: { value: new THREE.Vector3(rotAxis.x, rotAxis.y, rotAxis.z) },
        uBreathing: { value: sceneSettings.breathingEnabled ? sceneSettings.breathingIntensity : 0 },
        uBreathingSpeed: { value: sceneSettings.breathingSpeed },
        uFlicker: { value: sceneSettings.flickerEnabled ? sceneSettings.flickerIntensity : 0 },
        uFlickerSpeed: { value: sceneSettings.flickerSpeed },
        uHandPos: { value: new THREE.Vector3() },
        uHandActive: { value: 0 },
        uInteractionRadius: { value: sceneSettings.interactionRadius },
        uInteractionStrength: { value: sceneSettings.interactionStrength },
        uGlowIntensity: { value: 3 },
        uSaturation: { value: 1.2 },
        uTrailAlpha: { value: trailAlpha }, // 拖尾透明度
        // 闪电效果
        uWanderingLightning: { value: sceneSettings.wanderingLightningEnabled ? sceneSettings.wanderingLightningIntensity : 0 },
        uWanderingLightningSpeed: { value: sceneSettings.wanderingLightningSpeed },
        uWanderingLightningDensity: { value: sceneSettings.wanderingLightningDensity },
        uLightningBreakdown: { value: sceneSettings.lightningBreakdownEnabled ? sceneSettings.lightningBreakdownIntensity : 0 },
        uLightningBreakdownFreq: { value: sceneSettings.lightningBreakdownFrequency },
        uLightningBranches: { value: sceneSettings.lightningBreakdownBranches }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
  }

  // 创建粒子环几何体 - 使用绝对半径，支持颜色模式
  function createParticleRingGeometry(ring: any, baseRadius: number): THREE.BufferGeometry {
    // 使用绝对半径，不再依赖核心半径
    const radius = ring.absoluteRadius;
    const positions = generateRingParticles(
      radius,
      ring.eccentricity,
      ring.particleDensity,
      ring.bandwidth,
      ring.thickness
    );
    
    const count = positions.length / 3;
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const ids = new Float32Array(count);
    const radialDists = new Float32Array(count);  // 径向归一化距离
    
    const [baseR, baseG, baseB] = hexToRgb(ring.color);
    const brightness = ring.brightness || 1.0;
    const sizeScale = ring.particleSize || 1.0;
    
    // 颜色模式处理
    const gc = ring.gradientColor;
    const colorMode = gc?.enabled ? gc.mode : 'none';
    const gradColors = gc?.colors || [ring.color, '#4ecdc4', '#ffd93d'];
    const color1 = hexToRgb(gradColors[0] || ring.color);
    const color2 = hexToRgb(gradColors[1] || '#4ecdc4');
    const color3 = hexToRgb(gradColors[2] || '#ffd93d');
    const direction = gc?.direction || 'radial';
    const customDir = gc?.directionCustom || { x: 1, y: 0, z: 0 };
    const midPos = gc?.colorMidPosition ?? 0.5;
    const midWidth = gc?.colorMidWidth ?? 1;
    const midWidth2 = gc?.colorMidWidth2 ?? 0;
    const spiralDensity = gc?.spiralDensity ?? 2;
    const proceduralIntensity = gc?.proceduralIntensity ?? 1.0;
    
    // HSV 转 RGB 辅助函数
    const hsvToRgb = (h: number, s: number, v: number): [number, number, number] => {
      const i = Math.floor(h * 6);
      const f = h * 6 - i;
      const p = v * (1 - s);
      const q = v * (1 - f * s);
      const t = v * (1 - (1 - f) * s);
      switch (i % 6) {
        case 0: return [v, t, p];
        case 1: return [q, v, p];
        case 2: return [p, v, t];
        case 3: return [p, q, v];
        case 4: return [t, p, v];
        case 5: return [v, p, q];
        default: return [v, v, v];
      }
    };
    
    // RGB 转 HSV
    const rgbToHsv = (r: number, g: number, b: number): [number, number, number] => {
      const max = Math.max(r, g, b), min = Math.min(r, g, b);
      const d = max - min;
      let h = 0, s = max === 0 ? 0 : d / max, v = max;
      if (max !== min) {
        switch (max) {
          case r: h = (g - b) / d + (g < b ? 6 : 0); break;
          case g: h = (b - r) / d + 2; break;
          case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
      }
      return [h, s, v];
    };
    
    // 环的内外边缘（用于径向渐变）
    const bandwidth = ring.bandwidth || 20;
    const innerRadius = radius - bandwidth / 2;
    const outerRadius = radius + bandwidth / 2;
    
    for (let i = 0; i < count; i++) {
      const x = positions[i * 3];
      const y = positions[i * 3 + 1]; // z in world (thickness)
      const z = positions[i * 3 + 2]; // y in ellipse
      
      // 计算径向归一化距离（供丝线效果使用）
      const dist = Math.sqrt(x * x + z * z);
      radialDists[i] = Math.max(0, Math.min(1, (dist - innerRadius) / bandwidth));
      
      // 计算渐变参数 t
      let gradientT = 0.5;
      
      if (direction === 'radial') {
        // 径向：基于粒子在环宽度范围内的位置（内边缘到外边缘）
        const dist = Math.sqrt(x * x + z * z);
        gradientT = (dist - innerRadius) / bandwidth;
      } else if (direction === 'linearX') {
        gradientT = (x / radius + 1) * 0.5;
      } else if (direction === 'linearY') {
        gradientT = (y / radius + 1) * 0.5; // 厚度方向
      } else if (direction === 'linearZ') {
        gradientT = (z / radius + 1) * 0.5;
      } else if (direction === 'linearCustom') {
        const len = Math.sqrt(customDir.x ** 2 + customDir.y ** 2 + customDir.z ** 2) || 1;
        const normX = customDir.x / len, normY = customDir.y / len, normZ = customDir.z / len;
        gradientT = ((x * normX + y * normY + z * normZ) / radius + 1) * 0.5;
      } else if (direction === 'spiral') {
        const angle = Math.atan2(z, x);
        gradientT = ((angle / (Math.PI * 2) + 0.5) * spiralDensity) % 1;
      }
      
      gradientT = Math.max(0, Math.min(1, gradientT));
      
      // 计算最终颜色
      let finalR = baseR, finalG = baseG, finalB = baseB;
      
      if (colorMode === 'twoColor') {
        finalR = color1[0] + (color2[0] - color1[0]) * gradientT;
        finalG = color1[1] + (color2[1] - color1[1]) * gradientT;
        finalB = color1[2] + (color2[2] - color1[2]) * gradientT;
      } else if (colorMode === 'threeColor') {
        // 计算混合权重和范围扩展
        const blendWeight = Math.min(midWidth, 1);
        const rangeExpand = Math.max(midWidth - 1, 0) * 0.2;
        const bandHalf = midWidth2 * 0.5;
        const midStart = Math.max(0.01, midPos - rangeExpand - bandHalf);
        const midEnd = Math.min(0.99, midPos + rangeExpand + bandHalf);
        
        // 计算三色渐变结果
        let tr, tg, tb;
        if (gradientT < midStart) {
          const t = gradientT / midStart;
          tr = color1[0] + (color2[0] - color1[0]) * t;
          tg = color1[1] + (color2[1] - color1[1]) * t;
          tb = color1[2] + (color2[2] - color1[2]) * t;
        } else if (gradientT > midEnd) {
          const t = (gradientT - midEnd) / (1 - midEnd);
          tr = color2[0] + (color3[0] - color2[0]) * t;
          tg = color2[1] + (color3[1] - color2[1]) * t;
          tb = color2[2] + (color3[2] - color2[2]) * t;
        } else {
          tr = color2[0]; tg = color2[1]; tb = color2[2];
        }
        // 计算双色渐变结果
        const dr = color1[0] + (color3[0] - color1[0]) * gradientT;
        const dg = color1[1] + (color3[1] - color1[1]) * gradientT;
        const db = color1[2] + (color3[2] - color1[2]) * gradientT;
        // 根据 blendWeight 混合
        finalR = dr + (tr - dr) * blendWeight;
        finalG = dg + (tg - dg) * blendWeight;
        finalB = db + (tb - db) * blendWeight;
      } else if (colorMode === 'procedural') {
        const [h, s, v] = rgbToHsv(baseR, baseG, baseB);
        const newH = (h + gradientT * proceduralIntensity * 0.3) % 1;
        [finalR, finalG, finalB] = hsvToRgb(newH, s, v);
      }
      
      // 漩涡效果
      const vortex = ring.vortex;
      if (vortex?.enabled) {
        const vortexColors = (vortex.colors || ['#ff6b6b', '#4ecdc4']).map(c => hexToRgb(c));
        const armCount = vortex.armCount || 4;
        const twist = vortex.twist || 2;
        const hardness = vortex.hardness || 0.5;
        
        // 计算径向位置
        const dist = Math.sqrt(x * x + z * z);
        const radialT = (dist - innerRadius) / bandwidth;
        
        // 计算角度和螺旋角度
        const angle = Math.atan2(z, x);
        const spiralAngle = angle + radialT * twist;
        
        // 生成旋臂图案
        let pattern = (spiralAngle * armCount / (Math.PI * 2)) % 1;
        if (pattern < 0) pattern += 1;
        
        // 应用硬边程度
        if (hardness < 0.99) {
          const edge = 0.5 * (1 - hardness);
          pattern = pattern < edge ? pattern / edge : 
                    pattern > 1 - edge ? (1 - pattern) / edge : 1;
          pattern = Math.max(0, Math.min(1, pattern));
        }
        
        // 多色循环
        const colorCount = vortexColors.length;
        const colorPos = pattern * colorCount;
        const colorIndex = Math.floor(colorPos) % colorCount;
        const nextIndex = (colorIndex + 1) % colorCount;
        const localT = colorPos - Math.floor(colorPos);
        
        const c1 = vortexColors[colorIndex];
        const c2 = vortexColors[nextIndex];
        finalR = c1[0] + (c2[0] - c1[0]) * localT;
        finalG = c1[1] + (c2[1] - c1[1]) * localT;
        finalB = c1[2] + (c2[2] - c1[2]) * localT;
      }
      
      colors[i * 3] = finalR * brightness;
      colors[i * 3 + 1] = finalG * brightness;
      colors[i * 3 + 2] = finalB * brightness;
      sizes[i] = (1 + Math.random() * 2) * sizeScale;
      ids[i] = i;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
    geometry.setAttribute('aRadialDist', new THREE.BufferAttribute(radialDists, 1));
    
    return geometry;
  }

  // 创建环绕粒子几何体
  function createOrbitingParticlesGeometry(orbiting: any, baseRadius: number): THREE.BufferGeometry {
    const innerR = orbiting.orbitRadius * baseRadius;
    const outerR = innerR + orbiting.thickness;
    
    // 基于密度和球壳体积计算粒子数量
    const density = orbiting.particleDensity || 1;
    const shellVolume = (4/3) * Math.PI * (Math.pow(outerR, 3) - Math.pow(innerR, 3));
    const particleCount = Math.min(Math.max(Math.floor(shellVolume * density * 0.001), 100), 20000);
    
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);
    const ids = new Float32Array(particleCount);
    const radialDists = new Float32Array(particleCount);  // 径向归一化距离
    
    const [r, g, b] = hexToRgb(orbiting.color);
    // 亮度系数
    const brightness = orbiting.brightness || 1.0;
    // 大小系数
    const sizeScale = orbiting.particleSize || 1.0;
    // 距离淡出设置
    const fadeStrength = orbiting.fadeStrength || 0;
    
    for (let i = 0; i < particleCount; i++) {
      // 球面随机分布
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = innerR + Math.random() * (outerR - innerR);
      
      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);
      
      // 归一化距离 (0=内边缘, 1=外边缘)
      const normalizedDist = (radius - innerR) / (outerR - innerR);
      radialDists[i] = normalizedDist;  // 写入径向距离供丝线效果使用
      
      // 距离淡出：距离越远，亮度越低
      let fadeFactor = 1.0;
      if (fadeStrength > 0) {
        // 距离越大淡出越多，fadeStrength 控制淡出强度
        fadeFactor = 1.0 - normalizedDist * fadeStrength;
        fadeFactor = Math.max(0.1, fadeFactor); // 最低保留10%亮度
      }
      
      colors[i * 3] = r * brightness * fadeFactor;
      colors[i * 3 + 1] = g * brightness * fadeFactor;
      colors[i * 3 + 2] = b * brightness * fadeFactor;
      
      sizes[i] = (1 + Math.random() * 2) * sizeScale;
      ids[i] = i;
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
    geometry.setAttribute('aId', new THREE.BufferAttribute(ids, 1));
    geometry.setAttribute('aRadialDist', new THREE.BufferAttribute(radialDists, 1));
    
    return geometry;
  }

  // 创建法阵
  function createMagicCircle(settings: import('../types').MagicCircleSettings): MagicCircleRuntimeData {
    // 创建圆形几何体
    const geometry = new THREE.CircleGeometry(settings.radius, 64);
    
    // 加载贴图
    let texture: THREE.Texture | null = null;
    if (settings.texture) {
      texture = textureCache.current.get(settings.texture) || null;
      if (!texture) {
        const loader = new THREE.TextureLoader();
        texture = loader.load(settings.texture, (tex) => {
          textureCache.current.set(settings.texture, tex);
        });
        textureCache.current.set(settings.texture, texture);
      }
    }
    
    // 解析颜色模式
    const gc = settings.gradientColor;
    const colorModeMap: { [key: string]: number } = { 'none': 0, 'twoColor': 1, 'threeColor': 2, 'procedural': 3 };
    const colorMode = gc?.enabled ? (colorModeMap[gc.mode] || 0) : 0;
    const directionMap: { [key: string]: number } = { 'radial': 0, 'linearX': 1, 'linearY': 2, 'spiral': 3 };
    const gradientDir = directionMap[gc?.direction || 'radial'] || 0;
    
    // 解析颜色
    const parseColor = (hex: string) => {
      const c = hex.replace('#', '');
      return new THREE.Vector3(
        parseInt(c.substring(0, 2), 16) / 255,
        parseInt(c.substring(2, 4), 16) / 255,
        parseInt(c.substring(4, 6), 16) / 255
      );
    };
    const color1 = parseColor(gc?.colors?.[0] || '#ff6b6b');
    const color2 = parseColor(gc?.colors?.[1] || '#4ecdc4');
    const color3 = parseColor(gc?.colors?.[2] || '#ffd93d');
    
    // 创建材质
    const material = new THREE.ShaderMaterial({
      vertexShader: magicCircleVertexShader,
      fragmentShader: magicCircleFragmentShader,
      uniforms: {
        uTexture: { value: texture },
        uHasTexture: { value: texture ? 1.0 : 0.0 },
        uOpacity: { value: settings.opacity },
        uHueShift: { value: settings.hueShift },
        uSaturationBoost: { value: settings.saturationBoost ?? 1.0 },
        uBrightness: { value: settings.brightness },
        uPulse: { value: 0 },
        // 渐变色参数
        uColorMode: { value: colorMode },
        uBaseHue: { value: settings.baseHue ?? 200 },
        uBaseSaturation: { value: settings.baseSaturation ?? 1.0 },
        uColor1: { value: color1 },
        uColor2: { value: color2 },
        uColor3: { value: color3 },
        uColorMidPos: { value: gc?.colorMidPosition ?? 0.5 },
        uColorMidWidth: { value: gc?.colorMidWidth ?? 1 },
        uColorMidWidth2: { value: gc?.colorMidWidth2 ?? 0 },
        uGradientDir: { value: gradientDir },
        uSpiralDensity: { value: gc?.spiralDensity ?? 2 },
        uProceduralIntensity: { value: gc?.proceduralIntensity ?? 1 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide  // 双面可见
    });
    
    const mesh = new THREE.Mesh(geometry, material);
    
    // 平躺在 XZ 平面（法线朝向 Y 轴）+ 应用倾斜
    const tiltAngles = getTiltAngles(settings.tilt ?? DEFAULT_TILT_SETTINGS);
    mesh.rotation.x = -Math.PI / 2 + THREE.MathUtils.degToRad(tiltAngles.x);
    mesh.rotation.y = THREE.MathUtils.degToRad(tiltAngles.y);
    mesh.rotation.z = THREE.MathUtils.degToRad(tiltAngles.z);
    
    // 设置 Y 轴偏移
    mesh.position.y = settings.yOffset;
    
    // 渲染顺序：在粒子核心和实体核心之间
    mesh.renderOrder = 50;
    
    // 存储设置用于动画
    mesh.userData = { circleId: settings.id };
    
    return { id: settings.id, mesh, settings };
  }

  // 创建旋转流萤（新版本 - 世界坐标系）
  function createOrbitingFirefly(firefly: OrbitingFireflySettings, baseRadius: number): FireflyRuntimeData {
    const group = new THREE.Group(); // 仅作为容器，position 保持 (0,0,0)
    const [r, g, b] = hexToRgb(firefly.color);
    const brightness = firefly.brightness || 1.0;
    const radius = firefly.absoluteOrbitRadius;
    const trailLen = firefly.trailLength || 50;
    
    // 头部 - 使用世界坐标
    const headGeom = new THREE.BufferGeometry();
    headGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([radius, 0, 0]), 3));
    
    // 为每个流萤生成随机种子
    const flareSeed = Math.random();
    
    // 头部样式映射：plain=0, flare=1, spark=2, texture=3
    const headStyleMap: Record<string, number> = { plain: 0, flare: 1, spark: 2, texture: 3 };
    const headStyleInt = headStyleMap[firefly.headStyle] ?? 1;
    
    // 加载贴图（如果需要）
    let texture: THREE.Texture | null = null;
    if (firefly.headStyle === 'texture' && firefly.headTexture) {
      texture = textureCache.current.get(firefly.headTexture) || null;
      if (!texture) {
        const loader = new THREE.TextureLoader();
        texture = loader.load(firefly.headTexture, (tex) => {
          textureCache.current.set(firefly.headTexture, tex);
        });
        textureCache.current.set(firefly.headTexture, texture);
      }
    }
    
    const headMat = new THREE.ShaderMaterial({
      vertexShader: fireflyHeadVertexShader,
      fragmentShader: fireflyHeadFragmentShader,
      uniforms: {
        uSize: { value: (firefly.size || 8) * brightness },
        uColor: { value: new THREE.Vector3(r * brightness, g * brightness, b * brightness) },
        uHeadStyle: { value: headStyleInt },
        uFlareIntensity: { value: firefly.flareIntensity ?? 1.0 },
        uFlareSeed: { value: flareSeed },
        uFlareLeaves: { value: firefly.flareLeaves ?? 4 },
        uFlareWidth: { value: firefly.flareWidth ?? 0.5 },
        uChromaticAberration: { value: firefly.chromaticAberration ?? 0.3 },
        uVelocityStretch: { value: firefly.velocityStretch ?? 0.0 },
        uVelocity: { value: new THREE.Vector3(0, 0, 0) },
        uNoiseAmount: { value: firefly.noiseAmount ?? 0.2 },
        uGlowIntensity: { value: firefly.glowIntensity ?? 0.5 },
        uTime: { value: 0 },
        uPulse: { value: 1.0 },
        uPulseSpeed: { value: firefly.pulseSpeed ?? 1.0 },
        uTexture: { value: texture },
        uUseTexture: { value: texture ? 1.0 : 0.0 }
      },
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    
    const headMesh = new THREE.Points(headGeom, headMat);
    headMesh.renderOrder = 100; // 确保在实体核心之后渲染
    group.add(headMesh);
    
    // 计算轨道旋转（用于初始化拖尾位置）
    const orbitAxis = firefly.orbitAxis || { axis: 'y', angle: 0, isCustom: false };
    const axisVec = getOrbitAxisVector(orbitAxis);
    const axisQuaternion = new THREE.Quaternion();
    const defaultAxis = new THREE.Vector3(0, 1, 0);
    const targetAxis = new THREE.Vector3(axisVec.x, axisVec.y, axisVec.z).normalize();
    axisQuaternion.setFromUnitVectors(defaultAxis, targetAxis);
    
    // 尾部 - 粒子拖尾（点精灵，性能更好且自然匹配头部）
    let tailMesh: THREE.Points | null = null;
    if (firefly.trailEnabled) {
      const positions = new Float32Array(trailLen * 3);
      const tapers = new Float32Array(trailLen);
      
      // 初始化位置：沿轨道向后分散（避免所有点在原点）
      for (let i = 0; i < trailLen; i++) {
        const backAngle = -i * 0.05;
        const pos = new THREE.Vector3(
          radius * Math.cos(backAngle),
          0,
          radius * Math.sin(backAngle)
        );
        pos.applyQuaternion(axisQuaternion);  // 应用轨道旋转
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }
      
      // 初始化 taper（从头到尾衰减）
      for (let i = 0; i < trailLen; i++) {
        const t = i / Math.max(trailLen - 1, 1);
        tapers[i] = Math.pow(1 - t, firefly.trailTaperPower ?? 1.0);
      }
      
      const tailGeom = new THREE.BufferGeometry();
      tailGeom.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      tailGeom.setAttribute('aTaper', new THREE.BufferAttribute(tapers, 1));
      
      const tailMat = new THREE.ShaderMaterial({
        vertexShader: fireflyTailVertexShader,
        fragmentShader: fireflyTailFragmentShader,
        uniforms: {
          uColor: { value: new THREE.Vector3(r * brightness, g * brightness, b * brightness) },
          uOpacity: { value: firefly.trailOpacity ?? 0.8 },
          uSize: { value: firefly.size || 8 },
          uBrightness: { value: brightness }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      tailMesh = new THREE.Points(tailGeom, tailMat);
      tailMesh.renderOrder = 99; // 尾部在头部之前，但都在核心之后
      group.add(tailMesh);
    }
    
    // 初始化历史位置 - 沿轨道分散（复用上面的轨道旋转）
    const history: THREE.Vector3[] = [];
    for (let i = 0; i < trailLen; i++) {
      // 沿轨道向后分散
      const backAngle = -i * 0.05; // 每个点向后偏移
      const pos = new THREE.Vector3(
        radius * Math.cos(backAngle),
        0,
        radius * Math.sin(backAngle)
      );
      pos.applyQuaternion(axisQuaternion);
      history.push(pos);
    }
    
    // 存储 ID 用于查找设置
    group.userData = { type: 'orbiting', fireflyId: firefly.id };
    
    return {
      id: firefly.id,
      type: 'orbiting',
      group,
      headMesh,
      tailMesh,
      history
    };
  }
  
  // 创建游走流萤组（世界坐标系，无拖尾）
  function createWanderingFireflyGroup(groupSettings: WanderingFireflyGroupSettings, baseRadius: number): FireflyRuntimeData[] {
    const fireflies: FireflyRuntimeData[] = [];
    const [r, g, b] = hexToRgb(groupSettings.color);
    const brightness = groupSettings.brightness || 1.0;
    
    for (let i = 0; i < groupSettings.count; i++) {
      const group = new THREE.Group();
      
      // 随机初始位置（球壳内）
      const innerR = groupSettings.innerRadius * baseRadius;
      const outerR = groupSettings.outerRadius * baseRadius;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = innerR + Math.random() * (outerR - innerR);
      const initialPos = new THREE.Vector3(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      
      // 随机初始方向
      const direction = new THREE.Vector3(
        Math.random() - 0.5,
        Math.random() - 0.5,
        Math.random() - 0.5
      ).normalize();
      
      // 头部 - 使用世界坐标
      const headGeom = new THREE.BufferGeometry();
      headGeom.setAttribute('position', new THREE.BufferAttribute(new Float32Array([initialPos.x, initialPos.y, initialPos.z]), 3));
      
      // 为每个流萤生成随机种子
      const flareSeed = Math.random();
      
      // 头部样式映射：plain=0, flare=1, spark=2, texture=3
      const headStyleMap: Record<string, number> = { plain: 0, flare: 1, spark: 2, texture: 3 };
      const headStyleInt = headStyleMap[groupSettings.headStyle] ?? 1;
      
      // 加载贴图（如果需要）
      let texture: THREE.Texture | null = null;
      if (groupSettings.headStyle === 'texture' && groupSettings.headTexture) {
        texture = textureCache.current.get(groupSettings.headTexture) || null;
        if (!texture) {
          const loader = new THREE.TextureLoader();
          texture = loader.load(groupSettings.headTexture, (tex) => {
            textureCache.current.set(groupSettings.headTexture, tex);
          });
          textureCache.current.set(groupSettings.headTexture, texture);
        }
      }
      
      const headMat = new THREE.ShaderMaterial({
        vertexShader: fireflyHeadVertexShader,
        fragmentShader: fireflyHeadFragmentShader,
        uniforms: {
          uSize: { value: (groupSettings.size || 5) * brightness },
          uColor: { value: new THREE.Vector3(r * brightness, g * brightness, b * brightness) },
          uHeadStyle: { value: headStyleInt },
          uFlareIntensity: { value: groupSettings.flareIntensity ?? 1.0 },
          uFlareSeed: { value: flareSeed },
          uFlareLeaves: { value: groupSettings.flareLeaves ?? 4 },
          uFlareWidth: { value: groupSettings.flareWidth ?? 0.5 },
          uChromaticAberration: { value: groupSettings.chromaticAberration ?? 0.3 },
          uVelocityStretch: { value: groupSettings.velocityStretch ?? 0.5 },
          uVelocity: { value: direction.clone() },
          uNoiseAmount: { value: groupSettings.noiseAmount ?? 0.2 },
          uGlowIntensity: { value: groupSettings.glowIntensity ?? 0.5 },
          uTime: { value: 0 },
          uPulse: { value: 1.0 },
          uPulseSpeed: { value: groupSettings.pulseSpeed ?? 1.5 },
          uTexture: { value: texture },
          uUseTexture: { value: texture ? 1.0 : 0.0 }
        },
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      });
      
      const headMesh = new THREE.Points(headGeom, headMat);
      headMesh.renderOrder = 100; // 确保在实体核心之后渲染
      group.add(headMesh);
      
      // 存储 ID 用于查找设置
      group.userData = { type: 'wandering', groupId: groupSettings.id, index: i };
      
      fireflies.push({
        id: `${groupSettings.id}-${i}`,
        type: 'wandering',
        group,
        headMesh,
        tailMesh: null,
        history: [],
        direction,
        position: initialPos
      });
    }
    
    return fireflies;
  }
  
  // 更新流萤尾部粒子位置
  function updateFireflyTail(
    tailMesh: THREE.Points, 
    history: THREE.Vector3[]
  ) {
    try {
      if (!tailMesh || history.length === 0) return;
      
      const positions = tailMesh.geometry.attributes.position.array as Float32Array;
      const count = Math.min(history.length, positions.length / 3);
      
      // 直接复制历史位置到粒子
      for (let i = 0; i < count; i++) {
        const pos = history[i];
        positions[i * 3] = pos.x;
        positions[i * 3 + 1] = pos.y;
        positions[i * 3 + 2] = pos.z;
      }
      
      tailMesh.geometry.attributes.position.needsUpdate = true;
    } catch (e) {
      // 忽略错误，防止动画循环中断
      console.warn('updateFireflyTail error:', e);
    }
  }

  return (
    <div 
      ref={containerRef} 
      className="w-full h-full"
      style={{ 
        background: 'black',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        touchAction: 'manipulation'  // 优化触控，避免长按延迟
      }}
    />
  );
};

// ==================== 粒子发射器系统 ====================

interface ParticleEmitterData {
  mesh: THREE.Points;
  particles: {
    position: THREE.Vector3;
    velocity: THREE.Vector3;
    life: number; // 0-1, 1=新生, 0=死亡
    size: number;
    color: THREE.Color;
    active: boolean;
  }[];
  geometry: THREE.BufferGeometry;
  lastEmitTime: number;
}

function createParticleEmitter(baseRadius: number): ParticleEmitterData {
  const maxParticles = 2000;
  const geometry = new THREE.BufferGeometry();
  
  const positions = new Float32Array(maxParticles * 3);
  const colors = new Float32Array(maxParticles * 3);
  const sizes = new Float32Array(maxParticles);
  const alphas = new Float32Array(maxParticles);
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('aColor', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('aSize', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('aAlpha', new THREE.BufferAttribute(alphas, 1));
  
  const material = new THREE.ShaderMaterial({
    vertexShader: `
      attribute vec3 aColor;
      attribute float aSize;
      attribute float aAlpha;
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vColor = aColor;
        vAlpha = aAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = aSize * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      varying vec3 vColor;
      varying float vAlpha;
      void main() {
        vec2 uv = gl_PointCoord - 0.5;
        float dist = length(uv);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.0, dist) * vAlpha;
        gl_FragColor = vec4(vColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  const mesh = new THREE.Points(geometry, material);
  
  // 初始化粒子池
  const particles = [];
  for (let i = 0; i < maxParticles; i++) {
    particles.push({
      position: new THREE.Vector3(),
      velocity: new THREE.Vector3(),
      life: 0,
      size: 0,
      color: new THREE.Color(),
      active: false
    });
  }
  
  return {
    mesh,
    particles,
    geometry,
    lastEmitTime: 0
  };
}

function updateParticleEmitter(emitter: ParticleEmitterData, settings: any, baseRadius: number, deltaTime: number, time: number) {
  if (!settings.enabled) {
    emitter.mesh.visible = false;
    return;
  }
  emitter.mesh.visible = true;
  
  const { birthRate, lifeSpan, initialSpeed, drag, particleSize, emissionRangeMin, emissionRangeMax, color, fadeOut, fadeOutStrength, brightness } = settings;
  
  // 发射新粒子
  const emitCount = Math.floor(birthRate * deltaTime);
  const particles = emitter.particles;
  let emitted = 0;
  
  const [r, g, b] = hexToRgb(color);
  const sizeScale = particleSize || 1.0;
  const brightnessScale = brightness || 1.0;
  const maxDistance = baseRadius * (emissionRangeMax || 3); // 消散边界，默认 3R
  const fadeStrength = fadeOutStrength ?? (fadeOut ? 1 : 0); // 兼容旧数据
  
  for (let i = 0; i < particles.length && emitted < emitCount; i++) {
    if (!particles[i].active) {
      const p = particles[i];
      p.active = true;
      p.life = 1.0;
      p.size = (1 + Math.random() * 2) * sizeScale;
      p.color.setRGB(r * brightnessScale, g * brightnessScale, b * brightnessScale);
      
      // 随机发射位置
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const radius = baseRadius * emissionRangeMin;
      
      p.position.set(
        radius * Math.sin(phi) * Math.cos(theta),
        radius * Math.sin(phi) * Math.sin(theta),
        radius * Math.cos(phi)
      );
      
      // 速度方向：沿径向向外
      const dir = p.position.clone().normalize();
      p.velocity.copy(dir).multiplyScalar(initialSpeed);
      
      emitted++;
    }
  }
  
  // 更新粒子状态
  const positions = emitter.geometry.attributes.position.array as Float32Array;
  const colors = emitter.geometry.attributes.aColor.array as Float32Array;
  const sizes = emitter.geometry.attributes.aSize.array as Float32Array;
  const alphas = emitter.geometry.attributes.aAlpha.array as Float32Array;
  
  let activeCount = 0;
  
  const minDistance = baseRadius * (emissionRangeMin || 1); // 发射起点
  
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    if (p.active) {
      // 更新生命周期
      p.life -= deltaTime / lifeSpan;
      
      // 先更新位置
      p.position.addScaledVector(p.velocity, deltaTime);
      p.velocity.multiplyScalar(Math.pow(drag, deltaTime * 60)); // 阻力
      
      // 然后检查是否超过消散边界或生命结束
      const distFromCenter = p.position.length();
      if (p.life <= 0 || distFromCenter > maxDistance) {
        p.active = false;
        positions[i * 3] = 0;
        positions[i * 3 + 1] = 0;
        positions[i * 3 + 2] = 0;
        alphas[i] = 0;
        continue;
      }
      
      // 更新Buffer
      positions[i * 3] = p.position.x;
      positions[i * 3 + 1] = p.position.y;
      positions[i * 3 + 2] = p.position.z;
      
      colors[i * 3] = p.color.r;
      colors[i * 3 + 1] = p.color.g;
      colors[i * 3 + 2] = p.color.b;
      
      sizes[i] = p.size;
      
      // 淡出：基于距离（从发射起点到消散边界的归一化距离）
      if (fadeStrength > 0 && maxDistance > minDistance) {
        // 归一化距离：0 = 发射起点，1 = 消散边界
        const normalizedDist = (distFromCenter - minDistance) / (maxDistance - minDistance);
        const clampedDist = Math.max(0, Math.min(1, normalizedDist));
        // 强度越高，淡出越快：alpha = (1 - dist)^strength
        alphas[i] = Math.pow(1 - clampedDist, fadeStrength);
      } else {
        alphas[i] = 1.0;
      }
      
      activeCount++;
    } else {
      alphas[i] = 0;
    }
  }
  
  emitter.geometry.attributes.position.needsUpdate = true;
  emitter.geometry.attributes.aColor.needsUpdate = true;
  emitter.geometry.attributes.aSize.needsUpdate = true;
  emitter.geometry.attributes.aAlpha.needsUpdate = true;
}

export default PlanetScene;
