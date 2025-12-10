// 从自动生成的 JSON 文件导入贴图配置（通过 npm run generate 生成）
import magicTexturesData from './src/generated/magic-textures.json';

import { 
  AppSettings, 
  DepthMode, 
  ParticleShape, 
  ColorFilterSettings, 
  ColorFilterPreset,
  LineSettings,
  LineMode,
  LineStyle,
  LineColorMode,
  LineRenderMode,
  LineGradientMode,
  GlowMode,
  AccretionLayer,
  ColorTintSettings,
  // 星球模块类型
  PlanetSceneSettings,
  PlanetSettings,
  PlanetFillMode,
  GradientColor,
  RingOpacityGradient,
  ParticleRingSettings,
  ContinuousRingSettings,
  OrbitingFireflySettings,
  WanderingFireflyGroupSettings,
  TiltAxis,
  TiltSettings,
  OrbitAxisSettings,
  RotationAxisPreset,
  RotationAxisSettings,
  CoreSystemSettings,
  PlanetCoreSettings,
  ParticleEmitterSettings,
  OrbitingParticlesSettings,
  SolidCoreSettings,
  SolidCoreColorSettings,
  SolidCorePresetType,
  CoreType,
  OrbitSettings,
  MagicCircleSettings,
  EnergyBodySettings,
  // 火焰系统
  FlameColorSettings,
  SurfaceFlameSettings,
  FlameJetSettings,
  SpiralFlameSettings,
  FlameSystemSettings,
  // 残影系统
  AfterimageZoneSettings,
  AfterimageParticleSettings,
  AfterimageTextureSettings,
  AfterimageSystemSettings
} from './types';

// 颜色过滤预设配置
export const COLOR_FILTER_PRESETS: Record<ColorFilterPreset, Partial<ColorFilterSettings>> = {
  none: {
    enabled: false,
    filters: [],
    invertMode: false,
  },
  excludeGreen: {
    enabled: true,
    filters: [{ id: '1', hueStart: 80, hueEnd: 160, enabled: true }],
    invertMode: false,
  },
  excludeBlue: {
    enabled: true,
    filters: [{ id: '1', hueStart: 180, hueEnd: 260, enabled: true }],
    invertMode: false,
  },
  warmOnly: {
    enabled: true,
    filters: [
      { id: '1', hueStart: 0, hueEnd: 60, enabled: true },
      { id: '2', hueStart: 300, hueEnd: 360, enabled: true }
    ],
    invertMode: true, // 只保留这些颜色
  },
  coolOnly: {
    enabled: true,
    filters: [{ id: '1', hueStart: 180, hueEnd: 300, enabled: true }],
    invertMode: true,
  },
  excludeSkin: {
    enabled: true,
    filters: [{ id: '1', hueStart: 0, hueEnd: 50, enabled: true }],
    invertMode: false,
  },
  redOnly: {
    enabled: true,
    filters: [
      { id: '1', hueStart: 345, hueEnd: 360, enabled: true },
      { id: '2', hueStart: 0, hueEnd: 15, enabled: true }
    ],
    invertMode: true,
  },
  excludeGray: {
    enabled: true,
    filters: [],
    invertMode: false,
    saturationMin: 0.15, // 排除低饱和度
  },
  highContrast: {
    enabled: true,
    filters: [],
    invertMode: false,
    saturationMin: 0.3,
  },
};

// 颜色过滤预设标签
export const COLOR_FILTER_PRESET_LABELS: Record<ColorFilterPreset, string> = {
  none: '无过滤',
  excludeGreen: '排除绿色',
  excludeBlue: '排除蓝色',
  warmOnly: '只保留暖色',
  coolOnly: '只保留冷色',
  excludeSkin: '排除肤色',
  redOnly: '只保留红色',
  excludeGray: '排除灰色',
  highContrast: '高对比度',
};

// 默认颜色过滤设置
export const DEFAULT_COLOR_FILTER: ColorFilterSettings = {
  enabled: false,
  filters: [],
  invertMode: false,
  saturationMin: 0,
  saturationMax: 1,
};

// 默认连线设置
export const DEFAULT_LINE_SETTINGS: LineSettings = {
  enabled: false,
  renderMode: LineRenderMode.Dynamic,
  mode: LineMode.Distance,
  distanceRanges: [
    { id: '1', min: 0, max: 50, enabled: true }
  ],
  maxDistance: 50, // 保留兼容
  kNeighbors: 3,
  colorThreshold: 0.2,
  // 结构感知约束
  colorConstraintEnabled: false,  // 默认关闭颜色约束
  colorTolerance: 0.3,            // 颜色容差 30%
  maxConnectionsPerParticle: 0,   // 0=不限制
  zDepthWeight: 1.0,              // 正常 Z 轴权重
  // 外观
  lineWidth: 2,
  lineStyle: LineStyle.Solid,
  lineColorMode: LineColorMode.Inherit,
  customColor: '#ffffff',
  opacity: 0.6,
  fadeWithDistance: true,
  // 渐变色设置
  gradientColorStart: '#ff0080',
  gradientColorEnd: '#00ffff',
  gradientIntensity: 0.5,
  gradientMode: LineGradientMode.ParticleColor, // 默认使用粒子颜色渐变
  // 粒子大小过滤
  sizeFilterEnabled: false,
  minSizeAbsolute: 0.1,
  minSizeRelative: 0.2,
  minSizePercentile: 0,        // 默认不启用百分位过滤
  maxLines: 50000,
  sampleRatio: 0.5,
};

// Detect device performance tier
export const detectPerformanceTier = (): 'low' | 'medium' | 'high' => {
  // Check for mobile devices
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  
  // Check device memory (if available)
  const memory = (navigator as any).deviceMemory || 4; // GB
  
  // Check if WebGL2 is supported with good performance
  let gpuTier: 'low' | 'medium' | 'high' = 'medium';
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase();
        // Detect low-end GPUs
        if (renderer.includes('intel') && !renderer.includes('iris')) {
          gpuTier = 'low';
        } else if (renderer.includes('nvidia') || renderer.includes('amd') || renderer.includes('radeon') || renderer.includes('iris')) {
          gpuTier = 'high';
        }
      }
    }
  } catch (e) {
    // WebGL not available
    gpuTier = 'low';
  }

  // Combine factors
  if (isMobile || cores <= 2 || memory <= 2 || gpuTier === 'low') {
    return 'low';
  } else if (cores >= 8 && memory >= 8 && gpuTier === 'high') {
    return 'high';
  }
  return 'medium';
};

// Performance-based particle limits
export const PERFORMANCE_PRESETS = {
  low: {
    maxParticles: 50000,
    density: 4,
    bloomStrength: 0.8,
  },
  medium: {
    maxParticles: 120000,
    density: 2,
    bloomStrength: 1.5,
  },
  high: {
    maxParticles: 250000,
    density: 1,
    bloomStrength: 2.0,
  },
};

export const DEFAULT_SETTINGS: AppSettings = {
  density: 2,
  threshold: 30,
  maxParticles: 120000,
  baseSize: 2,
  
  // Edge-priority sampling
  edgeSamplingEnabled: false,
  edgeSensitivity: 0.3,
  edgeDensityBoost: 3,
  fillDensity: 0.2,
  pureOutlineMode: false,
  edgeCropPercent: 0,
  circularCrop: false,
  
  // 粒子动态效果
  particleTurbulence: 0,
  turbulenceSpeed: 0.5,
  turbulenceScale: 0.5,
  
  // Color Filter
  colorFilter: DEFAULT_COLOR_FILTER,
  
  // Color Tint (染色效果)
  colorTint: {
    enabled: false,
    colorCount: 3,
    mappings: [],
    globalStrength: 1.0,
  } as ColorTintSettings,
  
  // Depth Mapping
  depthMode: DepthMode.Brightness,
  depthRange: 400,
  depthInvert: false,
  noiseStrength: 40,
  
  // New depth mode parameters
  waveFrequency: 0.02,
  waveAmplitude: 1.0,
  fbmOctaves: 4,
  stereoSeparation: 20,

  // Visuals
  bloomStrength: 2,
  particleShape: ParticleShape.Circle,
  colorSaturation: 1.2,
  
  // 光晕效果
  glowMode: GlowMode.Soft,
  glowIntensity: 3.0,
  
  // 高级动态效果
  breathingEnabled: false,
  breathingSpeed: 0.5,
  breathingIntensity: 0.15,
  
  rippleEnabled: false,
  rippleSpeed: 0.5,
  rippleIntensity: 20,
  
  accretionEnabled: false,
  accretionSpeed: 0.3,
  accretionIntensity: 0.5,
  accretionLayers: [
    { id: '1', enabled: true, radiusMax: 100, direction: 1, speedMultiplier: 2.0 },
    { id: '2', enabled: true, radiusMax: 200, direction: -1, speedMultiplier: 1.0 },
    { id: '3', enabled: false, radiusMax: 400, direction: 1, speedMultiplier: 0.5 },
  ] as AccretionLayer[],
  
  // 拖尾残影
  trailEnabled: false,
  trailLength: 0.3,
  trailDecay: 0.5,
  
  // 荧光闪烁
  flickerEnabled: false,
  flickerIntensity: 0.3,
  flickerSpeed: 2.0,
  
  // 真实海浪效果（Gerstner波）
  waveEnabled: false,
  waveIntensity: 30,
  waveSpeed: 1.0,
  waveSteepness: 0.5,
  waveLayers: 3,
  waveDirection: 45,
  waveDepthFade: 0.5,
  waveFoam: true,
  
  // 几何映射
  geometryMapping: 'none' as const,
  mappingStrength: 0,
  mappingRadius: 200,
  mappingTileX: 1,
  mappingTileY: 1,
  
  // 游走闪电效果
  wanderingLightningEnabled: false,
  wanderingLightningIntensity: 0.5,
  wanderingLightningSpeed: 1.0,
  wanderingLightningDensity: 3,
  wanderingLightningWidth: 5,
  
  // 闪电击穿效果
  lightningBreakdownEnabled: false,
  lightningBreakdownIntensity: 0.7,
  lightningBreakdownFrequency: 0.5,
  lightningBreakdownBranches: 2,

  // Physics
  interactionRadius: 150,
  interactionStrength: 80,
  interactionType: 'repulse',
  damping: 0.9,
  returnSpeed: 1.5,
  
  // Lines
  lineSettings: DEFAULT_LINE_SETTINGS,

  // Camera
  autoRotate: true,
  autoRotateSpeed: 0.3,
};

// Get settings adjusted for device performance
export const getPerformanceAdjustedSettings = (): AppSettings => {
  const tier = detectPerformanceTier();
  const preset = PERFORMANCE_PRESETS[tier];
  
  console.log(`Performance tier detected: ${tier}`);
  
  return {
    ...DEFAULT_SETTINGS,
    maxParticles: preset.maxParticles,
    density: preset.density,
    bloomStrength: preset.bloomStrength,
  };
};

export const SAMPLE_IMAGES = [
  { name: "猎户座星云", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/f/f3/Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg/600px-Orion_Nebula_-_Hubble_2006_mosaic_18000.jpg" },
  { name: "创生之柱", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/6/68/Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg/600px-Pillars_of_creation_2014_HST_WFC3-UVIS_full-res_denoised.jpg" },
  { name: "船底座星云", url: "https://upload.wikimedia.org/wikipedia/commons/thumb/7/70/Carina_Nebula_by_Harel_Boren_%2815166162815%29.jpg/640px-Carina_Nebula_by_Harel_Boren_%2815166162815%29.jpg" }
];

// ==================== 星球模块默认配置 ====================

// 倾斜角度预设
export const TILT_ANGLE_OPTIONS: Array<{ value: number; label: string }> = [
  { value: 0, label: '0°' },
  { value: 30, label: '30°' },
  { value: 45, label: '45°' },
  { value: 60, label: '60°' },
];

// 轴选项
export const AXIS_OPTIONS: Array<{ value: TiltAxis; label: string }> = [
  { value: 'x', label: 'X轴' },
  { value: 'y', label: 'Y轴' },
  { value: 'z', label: 'Z轴' },
];

// 默认倾斜设置
export const DEFAULT_TILT_SETTINGS: TiltSettings = {
  axis: 'x',
  angle: 0,
  isCustom: false
};

// 默认公转轴设置
export const DEFAULT_ORBIT_AXIS_SETTINGS: OrbitAxisSettings = {
  axis: 'y',
  angle: 0,
  isCustom: false
};

// 获取倾斜角度（返回绕指定轴的旋转角度）
export const getTiltAngles = (tilt: TiltSettings): { x: number; y: number; z: number } => {
  const angle = tilt.angle;
  switch (tilt.axis) {
    case 'x': return { x: angle, y: 0, z: 0 };
    case 'y': return { x: 0, y: angle, z: 0 };
    case 'z': return { x: 0, y: 0, z: angle };
    default: return { x: 0, y: 0, z: 0 };
  }
};

// 获取公转轴向量
export const getOrbitAxisVector = (orbitAxis: OrbitAxisSettings): { x: number; y: number; z: number } => {
  const angle = orbitAxis.angle * Math.PI / 180; // 转换为弧度
  // 基础轴向量
  let baseX = 0, baseY = 0, baseZ = 0;
  switch (orbitAxis.axis) {
    case 'x': baseX = 1; break;
    case 'y': baseY = 1; break;
    case 'z': baseZ = 1; break;
  }
  
  // 如果角度为0，直接返回基础轴
  if (orbitAxis.angle === 0) {
    return { x: baseX, y: baseY, z: baseZ };
  }
  
  // 对轴进行倾斜（绕垂直于该轴的方向旋转）
  // 简化处理：绕另一个轴旋转
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  
  switch (orbitAxis.axis) {
    case 'x': // X轴倾斜，绕Z轴旋转
      return { x: cos, y: sin, z: 0 };
    case 'y': // Y轴倾斜，绕X轴旋转
      return { x: 0, y: cos, z: sin };
    case 'z': // Z轴倾斜，绕Y轴旋转
      return { x: sin, y: 0, z: cos };
    default:
      return { x: 0, y: 1, z: 0 };
  }
};

// 自转轴预设值
export const ROTATION_AXIS_PRESETS: Record<string, { x: number; y: number; z: number }> = {
  y: { x: 0, y: 1, z: 0 },       // Y轴（默认竖直）
  x: { x: 1, y: 0, z: 0 },       // X轴
  z: { x: 0, y: 0, z: 1 },       // Z轴
  tiltY45: { x: 0.707, y: 0.707, z: 0 },  // Y轴倾斜45度
  tiltX45: { x: 0.707, y: 0, z: 0.707 },  // X轴倾斜45度
};

// 默认自转轴设置
export const DEFAULT_ROTATION_AXIS_SETTINGS: RotationAxisSettings = {
  preset: 'y',
  customX: 0,
  customY: 1,
  customZ: 0
};

// 获取自转轴（根据预设或自定义）
export const getRotationAxis = (axis: RotationAxisSettings): { x: number; y: number; z: number } => {
  if (axis.preset === 'custom') {
    return { x: axis.customX, y: axis.customY, z: axis.customZ };
  }
  return ROTATION_AXIS_PRESETS[axis.preset] || { x: 0, y: 1, z: 0 };
};

// 默认渐变色配置
export const DEFAULT_GRADIENT_COLOR: GradientColor = {
  enabled: false,
  mode: 'none',
  
  // 双色/三色渐变
  colors: ['#ff6b6b', '#4ecdc4', '#ffd93d'],
  colorMidPosition: 0.5,
  colorMidWidth: 0,        // 中间色宽度，0 表示无额外宽度
  blendStrength: 1.0,      // 渐变过渡强度（0=硬边分层，1=平滑过渡）
  direction: 'radial',
  directionCustom: { x: 1, y: 0, z: 0 },
  
  // 螺旋渐变
  spiralDensity: 2,
  spiralAxis: 'y',
  
  // 混色渐变（程序化）
  proceduralAxis: 'y',
  proceduralCustomAxis: { x: 0, y: 1, z: 0 },
  proceduralIntensity: 1.0,
  
  // 兼容旧版
  angle: 0,
  type: 'radial'
};

// 默认粒子环配置
export const createDefaultParticleRing = (id: string, name: string = '粒子环'): ParticleRingSettings => ({
  id,
  name,
  enabled: true,
  eccentricity: 0,
  absoluteRadius: 150,
  particleDensity: 1,
  bandwidth: 10,
  thickness: 5,
  orbitSpeed: 0.5,
  rotationSpeed: 0.3,
  tilt: { ...DEFAULT_TILT_SETTINGS },
  orbitAxis: { ...DEFAULT_ORBIT_AXIS_SETTINGS },
  phaseOffset: 0,
  color: '#ffffff',
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  trailEnabled: false,
  trailLength: 0.3,
  brightness: 1.0,
  particleSize: 1.0,
  silkEffect: {
    enabled: false,
    thicknessVariation: 0.5,
    dashPattern: 0.3,
    noiseStrength: 0.3,
    noiseFrequency: 1.0,
    ringCount: 5,        // 细环数量
    ringSharpness: 0.7   // 环边缘锐度
  }
});

// 默认连续环带配置
export const createDefaultContinuousRing = (id: string, name: string = '环带'): ContinuousRingSettings => ({
  id,
  name,
  enabled: true,
  eccentricity: 0,
  absoluteInnerRadius: 130,
  absoluteOuterRadius: 180,
  tilt: { axis: 'x', angle: 30, isCustom: false },
  orbitAxis: { ...DEFAULT_ORBIT_AXIS_SETTINGS },
  orbitSpeed: 0.2,
  rotationSpeed: 0.1,
  color: '#88ccff',
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  opacity: 0.6,
  opacityGradient: RingOpacityGradient.FadeBoth,
  brightness: 1.0,
  visibilityEffect: {
    enabled: false,
    zones: [{ startAngle: 0, endAngle: 180 }],
    fadeAngle: 15,
    dynamicRotation: false,
    rotationSpeed: 0.5
  },
  streakMode: {
    enabled: false,
    flowSpeed: 0.5,
    stripeCount: 12,
    radialStretch: 8,
    edgeSharpness: 0.3,
    distortion: 0.5,
    noiseScale: 1.0,
    flowDirection: 'cw',
    brightness: 1.5
  }
});

// ==================== 能量体配置 ====================

// 默认能量体配置
export const createDefaultEnergyBody = (id: string, name: string = '能量体'): EnergyBodySettings => ({
  id,
  name,
  enabled: true,
  
  // 几何
  polyhedronType: 'icosahedron',
  subdivisionLevel: 0,
  radius: 120,
  spherize: 0,
  
  // 渲染模式
  renderMode: 'wireframe',
  
  // 边缘效果
  edgeEffect: {
    width: 1.5,
    glowIntensity: 1.0,
    softEdgeFalloff: 0.8,
    color: '#ffd700',
    gradientEnabled: true,
    gradientEndColor: '#ffffff',
    dashPattern: {
      enabled: false,
      dashRatio: 0.6,
      dashDensity: 10,
      flowSpeed: 1.0
    }
  },
  
  // 顶点效果
  vertexEffect: {
    enabled: true,
    size: 6,
    shape: 'circle',
    color: '#ffd700',
    glowIntensity: 1.5
  },
  
  // 薄壳效果
  shellEffect: {
    enabled: false,
    opacity: 0.15,
    fresnelPower: 2.0,
    fresnelIntensity: 1.0,
    color: '#ffd700',
    doubleSided: false
  },
  
  // 变换
  rotationSpeed: 0.2,
  rotationAxis: { ...DEFAULT_ROTATION_AXIS_SETTINGS },
  tilt: { ...DEFAULT_TILT_SETTINGS },
  
  // 有机化动画
  organicAnimation: {
    breathingEnabled: false,
    breathingSpeed: 1.0,
    breathingIntensity: 0.05,
    noiseEnabled: false,
    noiseAmplitude: 0.02,
    noiseFrequency: 1.0,
    noiseSpeed: 0.5
  },
  
  // 光流巡游效果
  lightFlow: {
    enabled: false,
    color: '#ffffff',
    speed: 1.0,
    length: 0.15,
    intensity: 2.0,
    count: 3,
    // 巡游增强
    pathMode: 'euler' as const,
    eulerMode: 'autoAugment' as const,
    phaseMode: 'spread' as const,
    trailEnabled: true,
    trailLength: 0.3,
    pulseEnabled: false,
    pulseSpeed: 2.0,
    // 随机游走参数
    noBacktrack: true,
    coverageWeight: 1.0,
    angleWeight: 0.5,
    // 顶点停靠
    dwellEnabled: false,
    dwellThreshold: 4,
    dwellDuration: 0.3,
    dwellCooldown: 1.0,
    dwellPulseIntensity: 2.0,
    // 拥堵避免
    minPacketSpacing: 0.1
  },
  
  // 边呼吸效果
  edgeBreathing: {
    enabled: false,
    speed: 0.5,
    widthAmplitude: 0.2,
    glowAmplitude: 0.4,
    alphaAmplitude: 0.15,
    noiseMix: 0.3,
    noiseScale: 2.0,
    noiseSpeed: 0.3
  },
  
  // 球面Voronoi
  sphericalVoronoi: {
    enabled: false,
    cellCount: 12,
    seedDistribution: 'fibonacci' as const,
    lineWidth: 2.0,
    lineColor: '#00ffff',
    lineGlow: 1.0,
    fillEnabled: false,
    fillOpacity: 0.2,
    colorMode: 'gradient' as const,
    baseHue: 180,
    hueSpread: 0.3,
    animateSeeds: false,
    seedSpeed: 0.2,
    seedNoiseScale: 1.0,
    cellPulse: false,
    cellPulseSpeed: 1.0
  },
  
  // 后期效果
  postEffects: {
    bloomEnabled: true,
    bloomThreshold: 0.3,
    bloomIntensity: 1.0,
    bloomRadius: 0.5,
    // 色差
    chromaticAberrationEnabled: false,
    chromaticAberrationIntensity: 0.01,
    // 暗角
    vignetteEnabled: false,
    vignetteIntensity: 0.5,
    vignetteRadius: 0.8
  },
  
  // 混合
  blendMode: 'additive',
  globalOpacity: 1.0
});

// 默认旋转流萤配置
export const createDefaultOrbitingFirefly = (id: string, name: string = '旋转流萤'): OrbitingFireflySettings => ({
  id,
  name,
  enabled: true,
  // 轨道
  absoluteOrbitRadius: 200,
  orbitSpeed: 0.5,
  orbitAxis: { axis: 'y', angle: 0, isCustom: false },
  initialPhase: 0,
  billboardOrbit: false,
  // 外观
  size: 8,
  color: '#ffff88',
  brightness: 1.5,
  headStyle: 'flare',
  headTexture: '',
  // 星芒参数
  flareIntensity: 1.0,
  flareLeaves: 4,
  flareWidth: 0.5,
  chromaticAberration: 0.3,
  // 动态效果
  velocityStretch: 0.0,
  noiseAmount: 0.2,
  // 通用
  glowIntensity: 0.5,
  pulseSpeed: 1.0,
  // 拖尾
  trailEnabled: true,
  trailLength: 50,
  trailTaperPower: 1.0,
  trailOpacity: 0.8,
  // 轨道半径波动
  radiusWave: {
    enabled: false,
    amplitude: 20,    // 波动幅度（像素单位）
    frequency: 0.5,
    randomPhase: true,
    waveType: 'sine' as const  // 波形类型：正弦/三角
  }
});

// 默认游走流萤组配置
export const createDefaultWanderingGroup = (id: string, name: string = '游走流萤组'): WanderingFireflyGroupSettings => ({
  id,
  name,
  enabled: true,
  count: 10,
  // 游走边界
  innerRadius: 1.5,
  outerRadius: 4,
  // 运动
  speed: 0.5,
  turnFrequency: 0.3,
  // 外观
  size: 5,
  color: '#88ff88',
  brightness: 1.0,
  headStyle: 'flare',
  headTexture: '',
  // 星芒参数
  flareIntensity: 1.0,
  flareLeaves: 4,
  flareWidth: 0.5,
  chromaticAberration: 0.3,
  // 动态效果
  velocityStretch: 0.5,
  noiseAmount: 0.2,
  // 通用
  glowIntensity: 0.5,
  pulseSpeed: 1.5,
  // 拖尾
  trailTaperPower: 1.0,
  trailOpacity: 0.8
});

// ==================== 法阵配置 ====================

// 法阵贴图分类配置
export type MagicTextureCategory = 'cute' | 'magic_circle' | 'star' | 'rings' | 'myth';

export const MAGIC_TEXTURE_CATEGORIES: { key: MagicTextureCategory; label: string; icon: string }[] = [
  { key: 'cute', label: '萌物', icon: '🐱' },
  { key: 'magic_circle', label: '法阵', icon: '🔮' },
  { key: 'star', label: '星空', icon: '⭐' },
  { key: 'rings', label: '光环', icon: '💫' },
  { key: 'myth', label: '神兽', icon: '🐉' },
];

// 各分类的贴图列表（从自动生成的 JSON 读取）
export const MAGIC_CIRCLE_TEXTURES_BY_CATEGORY: Record<MagicTextureCategory, { value: string; label: string }[]> = 
  magicTexturesData.textures as Record<MagicTextureCategory, { value: string; label: string }[]>;

// 所有贴图的扁平列表（用于兼容旧代码）
export const MAGIC_CIRCLE_TEXTURES = Object.values(MAGIC_CIRCLE_TEXTURES_BY_CATEGORY).flat();

/*
 * 贴图列表通过 npm run generate 自动从 public/magic 目录扫描生成
 * 添加/删除图片后，重新启动 npm run dev 即可自动更新
 */

// 创建默认法阵配置
export const createDefaultMagicCircle = (id: string, name: string = '1'): MagicCircleSettings => ({
  id,
  name,
  enabled: true,
  texture: '/magic/cute/circle01.png',
  yOffset: 0,
  radius: 150,
  rotationSpeed: 0.5,
  opacity: 0.8,
  hueShift: 0,
  baseHue: 200,
  baseSaturation: 1.0,
  saturationBoost: 1.0,
  brightness: 1.0,
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  tilt: { ...DEFAULT_TILT_SETTINGS },
  // 脉冲发光
  pulseEnabled: false,
  pulseSpeed: 1.0,
  pulseIntensity: 0.3,
  // 缩放呼吸
  breathEnabled: false,
  breathSpeed: 0.5,
  breathIntensity: 0.1
});

// 默认核心配置
export const createDefaultCore = (id: string, name: string = '核心'): PlanetCoreSettings => ({
  id,
  name,
  enabled: true,
  fillMode: PlanetFillMode.Shell,
  fillPercent: 0,
  density: 1.5,
  baseRadius: 100,
  baseHue: 200,
  baseSaturation: 1.0,
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  rotationSpeed: 0.3,
  rotationAxis: { ...DEFAULT_ROTATION_AXIS_SETTINGS },
  trailLength: 0,
  brightness: 1.0,
  particleSize: 1.0
});

// ==================== 实体核心配置 ====================

// 辅助函数：HSL 转 Hex
function hslToHex(h: number, s: number, l: number): string {
  const hue = h * 360;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + hue / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

// 创建默认颜色设置
const createDefaultSolidCoreColor = (baseColor: string): SolidCoreColorSettings => ({
  mode: 'none',
  baseColor,
  colors: [baseColor, '#ffffff'],
  colorMidPosition: 0.5,
  direction: 'radial',
  directionCustom: { x: 0, y: 1, z: 0 },
  spiralDensity: 3,
  proceduralIntensity: 1.0
});

// 实体核心预设参数
export const SOLID_CORE_PRESETS: Record<SolidCorePresetType, Omit<SolidCoreSettings, 'enabled' | 'id' | 'name'>> = {
  magma: {
    radius: 100,
    surfaceColor: createDefaultSolidCoreColor('#ff4400'),
    scale: 3.0,
    speed: 0.5,
    contrast: 3.0,
    bandMix: 0.0,
    ridgeMix: 0.0,
    gridMix: 0.0,
    crackEnabled: false,
    crackScale: 4.0,
    crackThreshold: 0.3,
    crackFeather: 0.1,
    crackWarp: 0.5,
    crackWarpScale: 1.5,
    crackFlowSpeed: 0.2,
    crackColor1: '#ffffff',
    crackColor2: '#ffaa00',
    crackEmission: 2.0,
    emissiveStrength: 1.5,
    // 多频叠加
    multiFreqEnabled: false,
    warpIntensity: 0.5,
    warpScale: 1.0,
    detailBalance: 0.3,
    // 法线扰动
    bumpEnabled: false,
    bumpStrength: 0.3,
    specularStrength: 1.0,
    specularColor: '#ffaa66',
    roughness: 32,
    // 定向光
    lightEnabled: false,
    lightDirection: { x: -1, y: -1, z: 1 },
    lightColor: '#ff6600',
    lightIntensity: 1.0,
    lightAmbient: 0.2,
    // 热点辉斑
    hotspotEnabled: false,
    hotspotCount: 4,
    hotspotSize: 0.15,
    hotspotPulseSpeed: 1.0,
    hotspotColor: '#ffff00',
    hotspotEmission: 3.0,
    opacity: 1.0,
    brightness: 1.2,
    glowColor: createDefaultSolidCoreColor('#ff6600'),
    glowLength: 4.0,
    glowStrength: 1.0,
    glowRadius: 0.2,
    glowFalloff: 2.0,
    glowInward: false,
    glowBloomBoost: 1.5,
    preset: 'magma'
  },
  gas: {
    radius: 100,
    surfaceColor: createDefaultSolidCoreColor('#cc9933'),
    scale: 2.0,
    speed: 0.2,
    contrast: 1.0,
    bandMix: 1.5,
    ridgeMix: 0.0,
    gridMix: 0.0,
    crackEnabled: false,
    crackScale: 4.0,
    crackThreshold: 0.3,
    crackFeather: 0.1,
    crackWarp: 0.5,
    crackWarpScale: 1.5,
    crackFlowSpeed: 0.2,
    crackColor1: '#ffffff',
    crackColor2: '#ffcc00',
    crackEmission: 0.0,
    emissiveStrength: 0.0,
    multiFreqEnabled: false,
    warpIntensity: 0.5,
    warpScale: 1.0,
    detailBalance: 0.3,
    bumpEnabled: false,
    bumpStrength: 0.3,
    specularStrength: 0.5,
    specularColor: '#ffddaa',
    roughness: 64,
    lightEnabled: false,
    lightDirection: { x: -1, y: -1, z: 1 },
    lightColor: '#ffcc00',
    lightIntensity: 1.0,
    lightAmbient: 0.3,
    hotspotEnabled: false,
    hotspotCount: 3,
    hotspotSize: 0.2,
    hotspotPulseSpeed: 0.5,
    hotspotColor: '#ffcc00',
    hotspotEmission: 2.0,
    opacity: 1.0,
    brightness: 1.0,
    glowColor: createDefaultSolidCoreColor('#ddaa44'),
    glowLength: 8.0,
    glowStrength: 0.8,
    glowRadius: 0,
    glowFalloff: 1.0,
    glowInward: true,
    glowBloomBoost: 0,
    preset: 'gas'
  },
  ice: {
    radius: 100,
    surfaceColor: createDefaultSolidCoreColor('#66aaff'),
    scale: 4.0,
    speed: 0.1,
    contrast: 1.2,
    bandMix: 0.0,
    ridgeMix: 1.5,
    gridMix: 0.0,
    crackEnabled: false,
    crackScale: 4.0,
    crackThreshold: 0.3,
    crackFeather: 0.1,
    crackWarp: 0.5,
    crackWarpScale: 1.5,
    crackFlowSpeed: 0.1,
    crackColor1: '#ffffff',
    crackColor2: '#88ccff',
    crackEmission: 0.5,
    emissiveStrength: 0.5,
    multiFreqEnabled: false,
    warpIntensity: 0.3,
    warpScale: 1.5,
    detailBalance: 0.5,
    bumpEnabled: false,
    bumpStrength: 0.5,
    specularStrength: 2.0,
    specularColor: '#ffffff',
    roughness: 16,
    lightEnabled: false,
    lightDirection: { x: -1, y: -1, z: 1 },
    lightColor: '#aaddff',
    lightIntensity: 1.0,
    lightAmbient: 0.2,
    hotspotEnabled: false,
    hotspotCount: 5,
    hotspotSize: 0.1,
    hotspotPulseSpeed: 0.3,
    hotspotColor: '#aaddff',
    hotspotEmission: 2.0,
    opacity: 1.0,
    brightness: 1.2,
    glowColor: createDefaultSolidCoreColor('#aaddff'),
    glowLength: 1.5,
    glowStrength: 1.0,
    glowRadius: 0,
    glowFalloff: 3.0,
    glowInward: false,
    glowBloomBoost: 1.0,
    preset: 'ice'
  },
  cyber: {
    radius: 100,
    surfaceColor: createDefaultSolidCoreColor('#cc00ff'),
    scale: 5.0,
    speed: 0.8,
    contrast: 1.0,
    bandMix: 0.0,
    ridgeMix: 0.0,
    gridMix: 1.0,
    crackEnabled: false,
    crackScale: 5.0,
    crackThreshold: 0.25,
    crackFeather: 0.05,
    crackWarp: 0.3,
    crackWarpScale: 2.0,
    crackFlowSpeed: 0.5,
    crackColor1: '#ffffff',
    crackColor2: '#ff00ff',
    crackEmission: 3.0,
    emissiveStrength: 2.0,
    multiFreqEnabled: false,
    warpIntensity: 0.2,
    warpScale: 2.0,
    detailBalance: 0.2,
    bumpEnabled: false,
    bumpStrength: 0.2,
    specularStrength: 1.5,
    specularColor: '#ff88ff',
    roughness: 8,
    lightEnabled: false,
    lightDirection: { x: -1, y: -1, z: 1 },
    lightColor: '#cc00ff',
    lightIntensity: 1.0,
    lightAmbient: 0.1,
    hotspotEnabled: false,
    hotspotCount: 6,
    hotspotSize: 0.08,
    hotspotPulseSpeed: 2.0,
    hotspotColor: '#ff00ff',
    hotspotEmission: 4.0,
    opacity: 1.0,
    brightness: 1.0,
    glowColor: createDefaultSolidCoreColor('#dd00ff'),
    glowLength: 0.8,
    glowStrength: 2.0,
    glowRadius: 0,
    glowFalloff: 4.0,
    glowInward: false,
    glowBloomBoost: 2.5,
    preset: 'cyber'
  },
  custom: {
    radius: 100,
    surfaceColor: createDefaultSolidCoreColor('#00aaff'),
    scale: 3.0,
    speed: 0.5,
    contrast: 1.0,
    bandMix: 0.0,
    ridgeMix: 0.0,
    gridMix: 0.0,
    crackEnabled: false,
    crackScale: 4.0,
    crackThreshold: 0.3,
    crackFeather: 0.1,
    crackWarp: 0.5,
    crackWarpScale: 1.5,
    crackFlowSpeed: 0.2,
    crackColor1: '#ffffff',
    crackColor2: '#ffaa00',
    crackEmission: 0.0,
    emissiveStrength: 0.0,
    multiFreqEnabled: false,
    warpIntensity: 0.5,
    warpScale: 1.0,
    detailBalance: 0.3,
    bumpEnabled: false,
    bumpStrength: 0.3,
    specularStrength: 1.0,
    specularColor: '#ffffff',
    roughness: 32,
    lightEnabled: false,
    lightDirection: { x: -1, y: -1, z: 1 },
    lightColor: '#ffffff',
    lightIntensity: 1.0,
    lightAmbient: 0.2,
    hotspotEnabled: false,
    hotspotCount: 4,
    hotspotSize: 0.15,
    hotspotPulseSpeed: 1.0,
    hotspotColor: '#ffff00',
    hotspotEmission: 3.0,
    opacity: 1.0,
    brightness: 1.0,
    glowColor: createDefaultSolidCoreColor('#00ccff'),
    glowLength: 3.0,
    glowStrength: 1.0,
    glowRadius: 0,
    glowFalloff: 2.0,
    glowInward: false,
    glowBloomBoost: 1.0,
    preset: 'custom'
  }
};

// 默认实体核心配置
export const DEFAULT_SOLID_CORE: SolidCoreSettings = {
  id: 'default-solid-core',
  name: '实体核心 1',
  enabled: true,
  ...SOLID_CORE_PRESETS.magma
};

// 创建默认实体核心
export const createDefaultSolidCore = (id: string, name: string = '实体核心'): SolidCoreSettings => ({
  id,
  name,
  enabled: true,
  ...SOLID_CORE_PRESETS.magma
});

// ========== 火焰系统预设 ==========

// 默认火焰颜色
const createDefaultFlameColor = (baseColor: string = '#ff6600'): FlameColorSettings => ({
  mode: 'twoColor',
  baseColor,
  colors: [baseColor, '#ffff00'],
  colorMidPosition: 0.5,
  colorMidWidth: 1,
  colorMidWidth2: 0,
  direction: 'radial',
  directionCustom: { x: 0, y: 1, z: 0 },
  spiralDensity: 3,
  proceduralIntensity: 1.0
});

// 表面火焰预设
export const SURFACE_FLAME_PRESETS: Record<string, Omit<SurfaceFlameSettings, 'enabled' | 'id' | 'name'>> = {
  classic: {
    preset: 'classic',
    radius: 105,
    thickness: 0.15,
    color: {
      mode: 'threeColor',
      baseColor: '#ff4400',
      colors: ['#ffff00', '#ff6600', '#ff0000'],
      colorMidPosition: 0.4,
      colorMidWidth: 1,
      colorMidWidth2: 0,
      direction: 'radial',
      directionCustom: { x: 0, y: 1, z: 0 },
      spiralDensity: 3,
      proceduralIntensity: 1.0
    },
    flameScale: 1.0,
    density: 0.8,
    flowSpeed: 1.0,
    turbulence: 0.8,
    noiseType: 'simplex',
    fractalLayers: 3,
    opacity: 0.9,
    emissive: 2.0,
    bloomBoost: 1.5,
    direction: 'up',
    pulseEnabled: true,
    pulseSpeed: 1.0,
    pulseIntensity: 0.3
  },
  rainbow: {
    preset: 'rainbow',
    radius: 110,
    thickness: 0.2,
    color: {
      mode: 'procedural',
      baseColor: '#00ffff',
      colors: ['#ff6600', '#00ffff', '#00ff88', '#aa00ff'],
      colorMidPosition: 0.5,
      colorMidWidth: 1,
      colorMidWidth2: 0,
      direction: 'linearY',
      directionCustom: { x: 0, y: 1, z: 0 },
      spiralDensity: 3,
      proceduralIntensity: 2.0
    },
    flameScale: 1.5,
    density: 0.7,
    flowSpeed: 0.8,
    turbulence: 1.2,
    noiseType: 'simplex',
    fractalLayers: 4,
    opacity: 0.85,
    emissive: 2.5,
    bloomBoost: 2.0,
    direction: 'up',
    pulseEnabled: true,
    pulseSpeed: 0.8,
    pulseIntensity: 0.2
  },
  ghostly: {
    preset: 'ghostly',
    radius: 108,
    thickness: 0.18,
    color: {
      mode: 'twoColor',
      baseColor: '#00ffaa',
      colors: ['#00ffaa', '#0066ff'],
      colorMidPosition: 0.5,
      colorMidWidth: 1,
      colorMidWidth2: 0,
      direction: 'radial',
      directionCustom: { x: 0, y: 1, z: 0 },
      spiralDensity: 3,
      proceduralIntensity: 1.0
    },
    flameScale: 1.2,
    density: 0.6,
    flowSpeed: 0.5,
    turbulence: 0.6,
    noiseType: 'simplex',
    fractalLayers: 3,
    opacity: 0.7,
    emissive: 3.0,
    bloomBoost: 2.5,
    direction: 'up',
    pulseEnabled: true,
    pulseSpeed: 0.5,
    pulseIntensity: 0.4
  },
  plasma: {
    preset: 'plasma',
    radius: 112,
    thickness: 0.12,
    color: {
      mode: 'twoColor',
      baseColor: '#ff00ff',
      colors: ['#00ffff', '#ff00ff'],
      colorMidPosition: 0.5,
      colorMidWidth: 1,
      colorMidWidth2: 0,
      direction: 'spiral',
      directionCustom: { x: 0, y: 1, z: 0 },
      spiralDensity: 5,
      proceduralIntensity: 1.5
    },
    flameScale: 0.8,
    density: 0.9,
    flowSpeed: 2.0,
    turbulence: 1.5,
    noiseType: 'voronoi',
    fractalLayers: 2,
    opacity: 0.95,
    emissive: 3.5,
    bloomBoost: 2.0,
    direction: 'spiral',
    pulseEnabled: true,
    pulseSpeed: 2.0,
    pulseIntensity: 0.2
  },
  custom: {
    preset: 'custom',
    radius: 105,
    thickness: 0.15,
    color: createDefaultFlameColor('#ff6600'),
    flameScale: 1.0,
    density: 0.7,
    flowSpeed: 1.0,
    turbulence: 0.8,
    noiseType: 'simplex',
    fractalLayers: 3,
    opacity: 0.85,
    emissive: 2.0,
    bloomBoost: 1.5,
    direction: 'up',
    pulseEnabled: false,
    pulseSpeed: 1.0,
    pulseIntensity: 0.3
  }
};

// 喷发火柱预设
export const FLAME_JET_PRESETS: Record<string, Partial<FlameJetSettings>> = {
  solarFlare: {
    preset: 'solarFlare',
    sourceType: 'hotspots',
    hotspotCount: 3,
    baseRadius: 100,
    height: 2.5,
    width: 0.4,
    spread: 20,
    particleCount: 800,
    particleSize: 6,
    jetSpeed: 1.2,
    lifespan: 2.5,
    turbulence: 0.7,
    color: { mode: 'threeColor', baseColor: '#ff6600', colors: ['#ffff00', '#ff6600', '#ff0000'], colorMidPosition: 0.4, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.9,
    emissive: 3.0,
    bloomBoost: 2.0,
    burstMode: 'continuous',
    burstInterval: 0,
    burstDuration: 0
  },
  volcano: {
    preset: 'volcano',
    sourceType: 'pole',
    hotspotCount: 1,
    baseRadius: 100,
    height: 3.5,
    width: 0.5,
    spread: 30,
    particleCount: 1200,
    particleSize: 8,
    jetSpeed: 1.8,
    lifespan: 3.0,
    turbulence: 1.0,
    color: { mode: 'threeColor', baseColor: '#ff2200', colors: ['#ffcc00', '#ff4400', '#880000'], colorMidPosition: 0.3, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.95,
    emissive: 3.5,
    bloomBoost: 2.5,
    burstMode: 'burst',
    burstInterval: 3.0,
    burstDuration: 1.5
  },
  geyser: {
    preset: 'geyser',
    sourceType: 'surface',
    hotspotCount: 5,
    baseRadius: 100,
    height: 1.5,
    width: 0.2,
    spread: 10,
    particleCount: 400,
    particleSize: 4,
    jetSpeed: 2.5,
    lifespan: 1.5,
    turbulence: 0.3,
    color: { mode: 'twoColor', baseColor: '#00ccff', colors: ['#ffffff', '#00aaff'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.8,
    emissive: 2.5,
    bloomBoost: 1.8,
    burstMode: 'burst',
    burstInterval: 2.0,
    burstDuration: 0.8
  },
  plasma: {
    preset: 'plasma',
    sourceType: 'equator',
    hotspotCount: 4,
    baseRadius: 100,
    height: 2.0,
    width: 0.35,
    spread: 15,
    particleCount: 600,
    particleSize: 5,
    jetSpeed: 1.5,
    lifespan: 2.0,
    turbulence: 0.8,
    color: { mode: 'procedural', baseColor: '#ff00ff', colors: ['#00ffff', '#ff00ff', '#ffff00'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 2.0 },
    opacity: 0.85,
    emissive: 4.0,
    bloomBoost: 2.2,
    burstMode: 'continuous',
    burstInterval: 0,
    burstDuration: 0
  },
  custom: {
    preset: 'custom',
    sourceType: 'hotspots',
    hotspotCount: 4,
    baseRadius: 100,
    height: 2.0,
    width: 0.3,
    spread: 15,
    particleCount: 500,
    particleSize: 5,
    jetSpeed: 1.0,
    lifespan: 2.0,
    turbulence: 0.5,
    color: createDefaultFlameColor('#ff4400'),
    opacity: 0.9,
    emissive: 2.5,
    bloomBoost: 1.5,
    burstMode: 'continuous',
    burstInterval: 2.0,
    burstDuration: 1.0
  }
};

// 螺旋火焰预设
export const SPIRAL_FLAME_PRESETS: Record<string, Partial<SpiralFlameSettings>> = {
  tornado: {
    preset: 'tornado',
    spiralCount: 2,
    direction: 'cw',
    baseRadius: 100,
    startRadius: 1.05,
    endRadius: 1.8,
    height: 250,
    pitch: 0.4,
    thickness: 0.12,
    rotationSpeed: 1.5,
    riseSpeed: 0.8,
    renderType: 'particles',
    particleCount: 1500,
    particleSize: 4,
    color: { mode: 'threeColor', baseColor: '#ff6600', colors: ['#ffff00', '#ff6600', '#ff0000'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.85,
    emissive: 2.5,
    bloomBoost: 1.8
  },
  galaxy: {
    preset: 'galaxy',
    spiralCount: 4,
    direction: 'ccw',
    baseRadius: 100,
    startRadius: 1.1,
    endRadius: 2.5,
    height: 50,
    pitch: 0.8,
    thickness: 0.08,
    rotationSpeed: 0.5,
    riseSpeed: 0.1,
    renderType: 'particles',
    particleCount: 2000,
    particleSize: 3,
    color: { mode: 'procedural', baseColor: '#8800ff', colors: ['#ff00ff', '#00aaff', '#00ffaa'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'spiral', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 5, proceduralIntensity: 2.0 },
    opacity: 0.7,
    emissive: 3.0,
    bloomBoost: 2.5
  },
  dna: {
    preset: 'dna',
    spiralCount: 2,
    direction: 'both',
    baseRadius: 100,
    startRadius: 1.15,
    endRadius: 1.15,
    height: 300,
    pitch: 0.3,
    thickness: 0.06,
    rotationSpeed: 0.8,
    riseSpeed: 0.5,
    renderType: 'ribbon',
    particleCount: 800,
    particleSize: 5,
    color: { mode: 'twoColor', baseColor: '#00ffaa', colors: ['#00ffff', '#ff00ff'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.9,
    emissive: 2.0,
    bloomBoost: 1.5
  },
  vortex: {
    preset: 'vortex',
    spiralCount: 1,
    direction: 'cw',
    baseRadius: 100,
    startRadius: 2.0,
    endRadius: 1.05,
    height: 200,
    pitch: 0.6,
    thickness: 0.15,
    rotationSpeed: 2.0,
    riseSpeed: -0.5,
    renderType: 'particles',
    particleCount: 1200,
    particleSize: 4,
    color: { mode: 'twoColor', baseColor: '#ff4400', colors: ['#ffcc00', '#ff0000'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 },
    opacity: 0.9,
    emissive: 2.8,
    bloomBoost: 2.0
  },
  custom: {
    preset: 'custom',
    spiralCount: 2,
    direction: 'cw',
    baseRadius: 100,
    startRadius: 1.1,
    endRadius: 1.5,
    height: 200,
    pitch: 0.5,
    thickness: 0.1,
    rotationSpeed: 1.0,
    riseSpeed: 0.5,
    renderType: 'particles',
    particleCount: 1000,
    particleSize: 4,
    color: createDefaultFlameColor('#ff6600'),
    opacity: 0.85,
    emissive: 2.0,
    bloomBoost: 1.5
  }
};

// 创建默认表面火焰
export const createDefaultSurfaceFlame = (id: string, name: string = '表面火焰'): SurfaceFlameSettings => ({
  id,
  name,
  enabled: true,
  ...SURFACE_FLAME_PRESETS.classic
});

// 创建默认喷发火柱
export const createDefaultFlameJet = (id: string, name: string = '火焰喷发'): FlameJetSettings => ({
  id,
  name,
  enabled: true,
  preset: 'default',
  sourceType: 'hotspots',
  hotspotCount: 4,
  baseRadius: 100,
  height: 2.0,
  width: 0.3,
  spread: 15,
  particleCount: 500,
  particleSize: 5,
  jetSpeed: 1.0,
  lifespan: 2.0,
  turbulence: 0.5,
  burstMode: 'continuous',
  burstInterval: 2.0,
  burstDuration: 1.0,
  color: createDefaultFlameColor('#ff4400'),
  opacity: 0.9,
  emissive: 2.5,
  bloomBoost: 1.5
});

// 创建默认螺旋火焰
export const createDefaultSpiralFlame = (id: string, name: string = '螺旋火焰'): SpiralFlameSettings => ({
  id,
  name,
  enabled: true,
  preset: 'default',
  spiralCount: 2,
  direction: 'cw',
  baseRadius: 100,
  startRadius: 1.1,
  endRadius: 1.5,
  height: 200,
  pitch: 0.5,
  thickness: 0.1,
  rotationSpeed: 1.0,
  riseSpeed: 0.5,
  renderType: 'particles',
  particleCount: 1000,
  particleSize: 4,
  color: createDefaultFlameColor('#ff6600'),
  opacity: 0.85,
  emissive: 2.0,
  bloomBoost: 1.5
});

// 默认火焰系统
export const DEFAULT_FLAME_SYSTEM: FlameSystemSettings = {
  enabled: true,
  surfaceFlames: [],
  flameJets: [],
  spiralFlames: []
};

// ==================== 残影系统默认值 ====================

// 默认残影区域
export const createDefaultAfterimageZone = (id: string, name: string = '残影区域'): AfterimageZoneSettings => ({
  id,
  name,
  enabled: true,
  
  // 区域定位
  startAngle: 45,
  angleSpan: 90,
  
  // 侧边界
  sideLineType: 'straight',
  sideLineLength: 2.0,
  sideLineAngle: 90,
  curveBendDirection: 'outward',
  curveBendStrength: 0.5,
  
  // 外边界
  outerBoundaryShape: 0,  // 圆弧
  
  // 羽化
  featherInner: 0.2,
  featherOuter: 0.3,
  featherSide: 0.2,
  
  // 反选
  inverted: false
});

// 默认残影粒子设置
export const DEFAULT_AFTERIMAGE_PARTICLES: AfterimageParticleSettings = {
  enabled: true,
  speed: 2.0,
  speedRandomness: 0.2,
  density: 100,
  size: 8,
  sizeDecay: 'linear',
  lifespan: 2.0,
  fadeOutCurve: 'quadratic',
  colorMode: 'gradient',
  colors: ['#ff4400', '#ffff00']
};

// 默认残影纹路设置（流动火焰效果）
export const DEFAULT_AFTERIMAGE_TEXTURE: AfterimageTextureSettings = {
  enabled: false,
  // 纹理模式
  textureMode: 'flow',
  // 流动效果
  flowSpeed: 0.5,
  noiseScale: 1.0,
  stretchFactor: 2.0,
  // 条纹效果（默认关闭）
  stripeIntensity: 0,
  stripeCount: 8,
  directionalStretch: 1,
  edgeSharpness: 0,
  distortion: 0,
  // 能量罩参数
  energyFlameScale: 2.0,
  energyDensity: 0.5,
  energyFlowSpeed: 0.5,
  energyTurbulence: 0.5,
  energyNoiseType: 'simplex',
  energyFractalLayers: 3,
  energyDirection: 'up',
  energyPulseEnabled: false,
  energyPulseSpeed: 1.0,
  energyPulseIntensity: 0.3,
  // 外观
  opacity: 0.8,
  colors: ['#ff00ff', '#ff66ff', '#ffffff']  // 粉紫渐变
};

// 默认残影系统（包含一个默认区域）
export const DEFAULT_AFTERIMAGE_SYSTEM: AfterimageSystemSettings = {
  enabled: false,
  zones: [createDefaultAfterimageZone('default_zone', '默认区域')],
  particles: { ...DEFAULT_AFTERIMAGE_PARTICLES },
  texture: { ...DEFAULT_AFTERIMAGE_TEXTURE },
  outsideClearSpeed: 3
};

// 默认粒子环绕配置
export const createDefaultOrbiting = (id: string, name: string = '粒子环绕'): OrbitingParticlesSettings => ({
  id,
  name,
  enabled: true,
  particleDensity: 1,
  orbitRadius: 1.2,
  thickness: 50,
  color: '#aaccff',
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  fadeWithDistance: true,
  fadeStrength: 0.5,
  baseSpeed: 0.5,
  mainDirection: { x: 0, y: 1, z: 0 },
  turbulence: 0.3,
  turbulenceScale: 0.5,
  brightness: 1.0,
  particleSize: 1.0
});

// 默认粒子喷射配置
export const createDefaultEmitter = (id: string, name: string = '粒子喷射'): ParticleEmitterSettings => ({
  id,
  name,
  enabled: true,
  emissionRangeMin: 1.0,
  emissionRangeMax: 3.0,
  birthRate: 100,
  lifeSpan: 2,
  initialSpeed: 50,
  drag: 0.95,
  color: '#ffaa00',
  gradientColor: { ...DEFAULT_GRADIENT_COLOR },
  fadeOutStrength: 0.5,
  particleSize: 2,
  brightness: 1.0
});

// 默认公转配置
export const DEFAULT_ORBIT_SETTINGS: OrbitSettings = {
  enabled: false,
  targetPlanetId: null,
  orbitRadius: 200,
  orbitSpeed: 0.3,
  eccentricity: 0,
  tilt: { ...DEFAULT_TILT_SETTINGS },
  initialPhase: 0
};

// 创建默认星球配置
export const createDefaultPlanet = (id: string, name: string = '新星球'): PlanetSettings => ({
  id,
  name,
  enabled: true,
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
  orbit: { ...DEFAULT_ORBIT_SETTINGS },
  coreSystem: {
    coresEnabled: true,
    solidCoresEnabled: true,
    coreType: 'particle' as CoreType,
    cores: [
      { ...createDefaultCore('default-core', '默认核心'), enabled: true }
    ],
    solidCores: [
      { ...DEFAULT_SOLID_CORE }
    ]
  },
  flameSystem: { ...DEFAULT_FLAME_SYSTEM },
  afterimageSystem: { ...DEFAULT_AFTERIMAGE_SYSTEM },
  rings: {
    particleRingsEnabled: true,
    continuousRingsEnabled: true,
    particleRings: [
      { ...createDefaultParticleRing('default-particle-ring', '默认粒子环'), enabled: false }
    ],
    continuousRings: [
      { ...createDefaultContinuousRing('default-continuous-ring', '默认环带'), enabled: false }
    ]
  },
  radiation: {
    orbitingEnabled: true,
    emitterEnabled: true,
    orbitings: [
      { ...createDefaultOrbiting('default-orbiting', '默认粒子环绕'), enabled: false }
    ],
    emitters: [
      { ...createDefaultEmitter('default-emitter', '默认粒子喷射'), enabled: false }
    ]
  },
  fireflies: {
    orbitingEnabled: true,
    wanderingEnabled: true,
    orbitingFireflies: [
      { ...createDefaultOrbitingFirefly('default-orbiting-firefly', '默认旋转流萤'), enabled: false }
    ],
    wanderingGroups: [
      { ...createDefaultWanderingGroup('default-wandering-group', '默认飞舞流萤组'), enabled: false }
    ]
  },
  magicCircles: {
    enabled: true,
    circles: []
  },
  energyBodySystem: {
    enabled: true,
    energyBodies: []
  }
});

// 默认星球场景设置
export const DEFAULT_PLANET_SCENE_SETTINGS: PlanetSceneSettings = {
  enabled: false,
  planets: [],
  // 背景设置
  background: {
    enabled: false,
    panoramaUrl: '/background/starfield.jpg',  // 默认全景图（需要用户自己放置）
    brightness: 0.5,  // 默认降低亮度，避免喧宾夺主
    saturation: 1.0,  // 默认饱和度
    rotation: 0
  },
  // 视觉效果
  bloomStrength: 2,
  trailEnabled: false,
  trailLength: 0.3,
  // 动态效果
  breathingEnabled: false,
  breathingSpeed: 0.5,
  breathingIntensity: 0.15,
  flickerEnabled: false,
  flickerIntensity: 0.3,
  flickerSpeed: 2.0,
  wanderingLightningEnabled: false,
  wanderingLightningIntensity: 0.5,
  wanderingLightningSpeed: 1.0,
  wanderingLightningDensity: 3,
  wanderingLightningWidth: 5,
  lightningBreakdownEnabled: false,
  lightningBreakdownIntensity: 0.7,
  lightningBreakdownFrequency: 0.5,
  lightningBreakdownBranches: 2,
  
  // ===== 上升效果 =====
  // 璀璨星雨
  starRainEnabled: false,
  starRainCount: 300,
  starRainSize: 2,
  starRainSpeed: 1.0,
  starRainSpeedVariation: 0.5,
  starRainHeight: 300,
  starRainSpread: 150,
  starRainColor: '#88ccff',
  starRainTrailLength: 0.4,
  starRainBrightness: 1.5,
  
  // 体积薄雾
  volumeFogEnabled: false,
  volumeFogLayers: 5,
  volumeFogInnerRadius: 50,
  volumeFogOuterRadius: 180,
  volumeFogHeight: 120,
  volumeFogOpacity: 0.12,
  volumeFogColor: '#4488cc',
  volumeFogSpeed: 0.3,
  
  // 光球灯笼
  lightOrbsEnabled: false,
  lightOrbsMaxCount: 5,
  lightOrbsSpawnRate: 2.5,
  lightOrbsSize: 12,
  lightOrbsGrowth: 2.0,
  lightOrbsSpeed: 0.6,
  lightOrbsHeight: 250,
  lightOrbsColor: '#aaddff',
  lightOrbsGlow: 2.5,
  lightOrbsBurst: true,
  
  // 直冲电弧
  electricArcsEnabled: false,
  electricArcsInterval: 4,
  electricArcsHeight: 280,
  electricArcsThickness: 4,
  electricArcsBranches: 3,
  electricArcsColor: '#66aaff',
  electricArcsGlow: 5,
  electricArcsDuration: 0.5,
  
  // 交互
  interactionRadius: 150,
  interactionStrength: 80,
  interactionType: 'repulse',
  // 相机
  cameraAutoRotate: false,
  cameraAutoRotateSpeed: 0.5
};

// 星球场景本地存储键名
export const PLANET_SCENE_STORAGE_KEY = 'nebula-viz-planet-scene';
export const PLANET_TEMPLATES_STORAGE_KEY = 'nebula-viz-planet-templates';
export const PLANET_SCENES_STORAGE_KEY = 'nebula-viz-saved-scenes';

// 星球数量上限
export const MAX_PLANETS = 5;

// 性能警告阈值（粒子数）
export const PLANET_PARTICLE_WARNING_THRESHOLD = 50000;

// ==================== 背景图配置 ====================

// 背景图列表 - 添加新图片后需要在此处添加对应条目
// 图片路径格式：/background/文件名.扩展名
export const BACKGROUND_IMAGES: { value: string; label: string }[] = [
  { value: '/background/starfield.jpg', label: '星空 1' },
  { value: '/background/starfield1.jpg', label: '星空 2' },
  { value: '/background/starfield2.jpg', label: '星空 3' },
];

// ==================== 模块预设 ====================

// 粒子核心预设
export const PARTICLE_CORE_PRESETS = {
  standard: {
    fillMode: 'solid' as const,
    fillPercent: 100,
    density: 1,
    baseRadius: 100,
    baseHue: 210,
    baseSaturation: 1.0,
    brightness: 1.0,
    particleSize: 2,
    gradientColor: { enabled: false, mode: 'none' as const, colors: [], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial' as const, directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'radial' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1 },
    trailLength: 0
  },
  flame: {
    fillMode: 'solid' as const,
    fillPercent: 100,
    density: 1.5,
    baseRadius: 100,
    baseHue: 20,
    baseSaturation: 1.0,
    brightness: 1.5,
    particleSize: 2.5,
    gradientColor: { enabled: true, mode: 'twoColor' as const, colors: ['#ff4400', '#ffaa00'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial' as const, directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'radial' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1 },
    trailLength: 0.3
  },
  aurora: {
    fillMode: 'solid' as const,
    fillPercent: 100,
    density: 0.8,
    baseRadius: 120,
    baseHue: 140,
    baseSaturation: 0.8,
    brightness: 1.2,
    particleSize: 1.5,
    gradientColor: { enabled: true, mode: 'threeColor' as const, colors: ['#00ff88', '#00aaff', '#8800ff'], colorMidPosition: 0.5, colorMidWidth: 1, colorMidWidth2: 0, direction: 'radial' as const, directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'radial' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1 },
    trailLength: 0.2
  },
  nebula: {
    fillMode: 'solid' as const,
    fillPercent: 100,
    density: 0.6,
    baseRadius: 150,
    baseHue: 280,
    baseSaturation: 0.9,
    brightness: 0.8,
    particleSize: 3,
    gradientColor: { enabled: true, mode: 'twoColor' as const, colors: ['#6600cc', '#ff00aa'], colorMidPosition: 0.4, colorMidWidth: 1.2, colorMidWidth2: 0, direction: 'radial' as const, directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'radial' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1 },
    trailLength: 0
  }
};

// 粒子环预设
export const PARTICLE_RING_PRESETS = {
  saturn: {
    eccentricity: 0,
    absoluteRadius: 200,
    particleDensity: 3,
    bandwidth: 30,
    thickness: 5,
    orbitSpeed: 0.3,
    rotationSpeed: 0.1,
    color: '#ddcc99',
    brightness: 1.0,
    particleSize: 1.5
  },
  asteroid: {
    eccentricity: 0.1,
    absoluteRadius: 250,
    particleDensity: 1.5,
    bandwidth: 50,
    thickness: 15,
    orbitSpeed: 0.2,
    rotationSpeed: 0.05,
    color: '#888888',
    brightness: 0.8,
    particleSize: 2
  },
  comet: {
    eccentricity: 0.3,
    absoluteRadius: 180,
    particleDensity: 5,
    bandwidth: 15,
    thickness: 3,
    orbitSpeed: 0.5,
    rotationSpeed: 0.2,
    color: '#aaddff',
    brightness: 1.5,
    particleSize: 1
  }
};

// 连续环带预设
export const CONTINUOUS_RING_PRESETS = {
  pure: {
    eccentricity: 0,
    absoluteInnerRadius: 150,
    absoluteOuterRadius: 200,
    orbitSpeed: 0.2,
    rotationSpeed: 0.1,
    color: '#66aaff',
    opacity: 0.6,
    opacityGradient: 'fadeBoth' as const,
    opacityGradientStrength: 0.5,
    brightness: 1.2
  },
  metallic: {
    eccentricity: 0,
    absoluteInnerRadius: 140,
    absoluteOuterRadius: 220,
    orbitSpeed: 0.15,
    rotationSpeed: 0.08,
    color: '#ccaa77',
    opacity: 0.8,
    opacityGradient: 'fadeOut' as const,
    opacityGradientStrength: 0.6,
    brightness: 1.0,
    streakMode: {
      enabled: true,
      flowSpeed: 0.5,
      stripeCount: 15,
      radialStretch: 10,
      edgeSharpness: 0.4,
      distortion: 0.3,
      noiseScale: 1.2,
      flowDirection: 'cw' as const,
      brightness: 1.5
    }
  },
  vortex: {
    eccentricity: 0.1,
    absoluteInnerRadius: 120,
    absoluteOuterRadius: 250,
    orbitSpeed: 0.3,
    rotationSpeed: 0.2,
    color: '#8844ff',
    opacity: 0.7,
    opacityGradient: 'none' as const,
    opacityGradientStrength: 0,
    brightness: 1.5,
    vortex: {
      enabled: true,
      armCount: 5,
      twist: 3,
      rotationSpeed: 0.5,
      radialDirection: 'inward' as const,
      radialSpeed: 0.3,
      hardness: 0.6,
      colors: ['#8844ff', '#ff44aa', '#44aaff']
    }
  }
};

// 残影粒子预设
export const AFTERIMAGE_PARTICLE_PRESETS = {
  soft: {
    enabled: true,
    speed: 1.0,
    speedRandomness: 0.2,
    density: 100,
    size: 8,
    sizeDecay: 'linear' as const,
    lifespan: 2,
    fadeOutCurve: 'quadratic' as const,
    colorMode: 'single' as const,
    colors: ['#88ccff']
  },
  intense: {
    enabled: true,
    speed: 3,
    speedRandomness: 0.4,
    density: 300,
    size: 5,
    sizeDecay: 'exponential' as const,
    lifespan: 1,
    fadeOutCurve: 'exponential' as const,
    colorMode: 'gradient' as const,
    colors: ['#ff4400', '#ffaa00', '#ffff00']
  },
  drift: {
    enabled: true,
    speed: 0.5,
    speedRandomness: 0.1,
    density: 50,
    size: 15,
    sizeDecay: 'none' as const,
    lifespan: 4,
    fadeOutCurve: 'linear' as const,
    colorMode: 'single' as const,
    colors: ['#aaddff']
  }
};

// 残影纹路预设
export const AFTERIMAGE_TEXTURE_PRESETS = {
  flow: {
    enabled: true,
    textureMode: 'flow' as const,
    flowSpeed: 0.5,
    noiseScale: 1.5,
    stretchFactor: 3,
    stripeIntensity: 0.6,
    stripeCount: 10,
    directionalStretch: 8,
    edgeSharpness: 0.4,
    distortion: 0.3,
    opacity: 0.7,
    colors: ['#003366', '#0066aa', '#00aaff']
  },
  energy: {
    enabled: true,
    textureMode: 'energy' as const,
    flowSpeed: 0.3,
    noiseScale: 1,
    stretchFactor: 2,
    stripeIntensity: 0.5,
    stripeCount: 8,
    directionalStretch: 5,
    edgeSharpness: 0.3,
    distortion: 0.4,
    energyFlameScale: 2,
    energyDensity: 0.6,
    energyFlowSpeed: 0.8,
    energyTurbulence: 1,
    energyNoiseType: 'simplex' as const,
    energyFractalLayers: 3,
    energyDirection: 'up' as const,
    energyPulseEnabled: true,
    energyPulseSpeed: 1,
    energyPulseIntensity: 0.3,
    opacity: 0.8,
    colors: ['#220044', '#6600aa', '#ff00ff']
  },
  ghostly: {
    enabled: true,
    textureMode: 'flow' as const,
    flowSpeed: 0.2,
    noiseScale: 2,
    stretchFactor: 5,
    stripeIntensity: 0.3,
    stripeCount: 5,
    directionalStretch: 15,
    edgeSharpness: 0.2,
    distortion: 0.5,
    opacity: 0.4,
    colors: ['#001122', '#004466', '#00aacc']
  }
};

// 粒子环绕预设
export const ORBITING_PARTICLES_PRESETS = {
  sparse: {
    particleDensity: 0.5,
    orbitRadius: 2,
    thickness: 200,
    color: '#aaddff',
    fadeWithDistance: true,
    fadeStrength: 0.5,
    baseSpeed: 0.3,
    mainDirection: { x: 0, y: 1, z: 0 },
    turbulence: 0.2,
    turbulenceScale: 1,
    brightness: 1.2,
    particleSize: 2
  },
  dense: {
    particleDensity: 3,
    orbitRadius: 1.5,
    thickness: 100,
    color: '#ffaa44',
    fadeWithDistance: true,
    fadeStrength: 0.7,
    baseSpeed: 0.5,
    mainDirection: { x: 0.3, y: 1, z: 0.3 },
    turbulence: 0.4,
    turbulenceScale: 0.8,
    brightness: 1.5,
    particleSize: 1.5
  },
  distant: {
    particleDensity: 1,
    orbitRadius: 4,
    thickness: 400,
    color: '#8888ff',
    fadeWithDistance: true,
    fadeStrength: 0.3,
    baseSpeed: 0.15,
    mainDirection: { x: 0, y: 1, z: 0 },
    turbulence: 0.1,
    turbulenceScale: 1.5,
    brightness: 0.8,
    particleSize: 1
  }
};

// 粒子喷射预设
export const EMITTER_PRESETS = {
  gentle: {
    emissionRangeMin: 1.1,
    emissionRangeMax: 3,
    birthRate: 200,
    lifeSpan: 2,
    initialSpeed: 50,
    drag: 0.5,
    color: '#88ccff',
    fadeOutStrength: 0.5,
    particleSize: 2,
    brightness: 1
  },
  burst: {
    emissionRangeMin: 1.05,
    emissionRangeMax: 4,
    birthRate: 500,
    lifeSpan: 1.5,
    initialSpeed: 120,
    drag: 0.3,
    color: '#ff6600',
    fadeOutStrength: 0.8,
    particleSize: 1.5,
    brightness: 2
  },
  pulse: {
    emissionRangeMin: 1.2,
    emissionRangeMax: 2.5,
    birthRate: 100,
    lifeSpan: 3,
    initialSpeed: 30,
    drag: 0.7,
    color: '#aa44ff',
    fadeOutStrength: 0.6,
    particleSize: 3,
    brightness: 1.5
  }
};

// 旋转流萤预设
export const ORBITING_FIREFLY_PRESETS = {
  single: {
    absoluteOrbitRadius: 200,
    orbitSpeed: 0.5,
    initialPhase: 0,
    billboardOrbit: false,
    size: 20,
    color: '#ffdd44',
    brightness: 2,
    headStyle: 'flare' as const,
    flareIntensity: 1,
    flareLeaves: 6,
    flareWidth: 0.3,
    chromaticAberration: 0.2,
    velocityStretch: 0.3,
    noiseAmount: 0.1,
    glowIntensity: 1,
    pulseSpeed: 1,
    trailEnabled: true,
    trailLength: 100,
    trailTaperPower: 1.5,
    trailOpacity: 0.6
  },
  binary: {
    absoluteOrbitRadius: 150,
    orbitSpeed: 0.8,
    initialPhase: 0,
    billboardOrbit: true,
    size: 15,
    color: '#66ffaa',
    brightness: 2.5,
    headStyle: 'spark' as const,
    flareIntensity: 0.8,
    flareLeaves: 4,
    flareWidth: 0.4,
    chromaticAberration: 0.3,
    velocityStretch: 0.5,
    noiseAmount: 0.2,
    glowIntensity: 1.5,
    pulseSpeed: 2,
    trailEnabled: true,
    trailLength: 150,
    trailTaperPower: 1.2,
    trailOpacity: 0.8
  },
  meteor: {
    absoluteOrbitRadius: 300,
    orbitSpeed: 1.2,
    initialPhase: 45,
    billboardOrbit: false,
    size: 10,
    color: '#ff8844',
    brightness: 3,
    headStyle: 'plain' as const,
    flareIntensity: 0,
    flareLeaves: 4,
    flareWidth: 0.5,
    chromaticAberration: 0,
    velocityStretch: 1,
    noiseAmount: 0,
    glowIntensity: 2,
    pulseSpeed: 0,
    trailEnabled: true,
    trailLength: 300,
    trailTaperPower: 0.8,
    trailOpacity: 0.9
  }
};

// 游走流萤预设
export const WANDERING_FIREFLY_PRESETS = {
  fireflies: {
    count: 20,
    innerRadius: 1.5,
    outerRadius: 5,
    speed: 0.3,
    turnFrequency: 0.5,
    size: 8,
    color: '#88ff44',
    brightness: 2,
    headStyle: 'plain' as const,
    flareIntensity: 0.5,
    flareLeaves: 4,
    flareWidth: 0.3,
    chromaticAberration: 0,
    velocityStretch: 0.1,
    noiseAmount: 0.3,
    glowIntensity: 1,
    pulseSpeed: 1.5,
    trailTaperPower: 2,
    trailOpacity: 0.4
  },
  dust: {
    count: 50,
    innerRadius: 1,
    outerRadius: 8,
    speed: 0.1,
    turnFrequency: 0.2,
    size: 3,
    color: '#aaaaff',
    brightness: 1,
    headStyle: 'plain' as const,
    flareIntensity: 0,
    flareLeaves: 4,
    flareWidth: 0.5,
    chromaticAberration: 0,
    velocityStretch: 0,
    noiseAmount: 0.5,
    glowIntensity: 0.5,
    pulseSpeed: 0.5,
    trailTaperPower: 1,
    trailOpacity: 0.2
  },
  meteor: {
    count: 5,
    innerRadius: 2,
    outerRadius: 10,
    speed: 1.5,
    turnFrequency: 0.1,
    size: 5,
    color: '#ffaa00',
    brightness: 3,
    headStyle: 'spark' as const,
    flareIntensity: 1,
    flareLeaves: 6,
    flareWidth: 0.2,
    chromaticAberration: 0.5,
    velocityStretch: 1.5,
    noiseAmount: 0.1,
    glowIntensity: 2,
    pulseSpeed: 0,
    trailTaperPower: 0.5,
    trailOpacity: 0.8
  }
};