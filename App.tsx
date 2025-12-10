import React, { useState, useEffect, useRef } from 'react';
import NebulaScene from './components/NebulaScene';
import PlanetScene, { CameraInfo } from './components/PlanetScene';
import ControlPanel from './components/ControlPanel';
import GestureHandler from './components/GestureHandler';
import { AppSettings, HandData, AppMode, PlanetSceneSettings } from './types';
import { 
  DEFAULT_SETTINGS, 
  SAMPLE_IMAGES, 
  getPerformanceAdjustedSettings,
  DEFAULT_PLANET_SCENE_SETTINGS,
  PLANET_SCENE_STORAGE_KEY
} from './constants';
import { processImage, ProcessedData, extractDominantColors } from './services/imageProcessing';

// LocalStorage key for settings persistence
const SETTINGS_STORAGE_KEY = 'nebula-viz-settings';

// 数据版本 - 更新此版本号会自动清除旧数据
const DATA_VERSION = 70;
const DATA_VERSION_KEY = 'nebula-viz-data-version';

// 检查并清除旧版本数据
const checkAndClearOldData = () => {
  try {
    const savedVersion = localStorage.getItem(DATA_VERSION_KEY);
    if (savedVersion !== String(DATA_VERSION)) {
      console.log('检测到旧版本数据，正在清除...');
      // 清除所有相关数据
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
      localStorage.removeItem(PLANET_SCENE_STORAGE_KEY);
      localStorage.removeItem('solidCorePresets');
      localStorage.removeItem('planetTemplates');
      // 更新版本号
      localStorage.setItem(DATA_VERSION_KEY, String(DATA_VERSION));
      console.log('旧数据已清除，使用默认设置');
    }
  } catch (e) {
    console.warn('版本检查失败:', e);
  }
};

// 应用启动时检查数据版本
checkAndClearOldData();

// 加载星球场景设置
const loadPlanetSceneSettings = (): PlanetSceneSettings => {
  try {
    const saved = localStorage.getItem(PLANET_SCENE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_PLANET_SCENE_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load planet scene settings:', e);
  }
  return DEFAULT_PLANET_SCENE_SETTINGS;
};

// 保存星球场景设置
const savePlanetSceneSettings = (settings: PlanetSceneSettings) => {
  try {
    localStorage.setItem(PLANET_SCENE_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save planet scene settings:', e);
  }
};

// Load settings from localStorage
const loadSavedSettings = (): AppSettings => {
  try {
    const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      // Merge with defaults to handle new settings added in updates
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (e) {
    console.warn('Failed to load saved settings:', e);
  }
  return getPerformanceAdjustedSettings();
};

// Save settings to localStorage
const saveSettings = (settings: AppSettings) => {
  try {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings:', e);
  }
};

const App: React.FC = () => {
  const [settings, setSettings] = useState<AppSettings>(loadSavedSettings);
  const [planetSettings, setPlanetSettings] = useState<PlanetSceneSettings>(loadPlanetSceneSettings);
  const [appMode, setAppMode] = useState<AppMode>('nebula');
  const [data, setData] = useState<ProcessedData | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [fps, setFps] = useState(0);
  const [gestureEnabled, setGestureEnabled] = useState(false);
  
  // 相机信息状态
  const [cameraInfo, setCameraInfo] = useState<CameraInfo | null>(null);
  const resetCameraRef = useRef<(() => void) | null>(null);
  
  // 取色模式状态
  const [colorPickMode, setColorPickMode] = useState(false);
  const [pickedColor, setPickedColor] = useState<{ h: number; s: number; l: number } | null>(null);

  // Store cached image for re-processing when settings change
  const cachedImageRef = useRef<HTMLImageElement | null>(null);
  
  // Use ref to access latest settings without causing re-renders
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Shared ref for MediaPipe data to avoid React render cycles for 60fps updates
  const handDataRef = useRef<HandData>({
    isActive: false,
    x: 0,
    y: 0,
    z: 0,
    isPinching: false,
    isClosed: false,
    openness: 0
  });

  // Process image with settings
  const doProcessImage = (img: HTMLImageElement, currentSettings: AppSettings) => {
    setIsProcessing(true);
    // Use setTimeout to allow UI to update
    setTimeout(() => {
      try {
        console.log("Starting image processing...");
        const processed = processImage(img, currentSettings);
        console.log("Processed result:", processed.count, "particles");
        setData(processed);
      } catch (error) {
        console.error("Failed to process image", error);
      } finally {
        setIsProcessing(false);
      }
    }, 50);
  };

  // Load and process new image
  const handleImageProcess = async (imageSrc: string | File) => {
    setIsProcessing(true);
    console.log("Loading image:", imageSrc);
    try {
      const img = new Image();
      img.crossOrigin = "Anonymous";
      
      const src = imageSrc instanceof File ? URL.createObjectURL(imageSrc) : imageSrc;
      img.src = src;

      await new Promise((resolve, reject) => {
        img.onload = () => {
          console.log("Image loaded successfully:", img.width, "x", img.height);
          resolve(true);
        };
        img.onerror = (e) => {
          console.error("Image load error:", e);
          reject(e);
        };
      });

      // Cache the loaded image for re-processing
      cachedImageRef.current = img;

      // Process the image with current settings
      console.log("Processing image with settings:", settingsRef.current);
      doProcessImage(img, settingsRef.current);

    } catch (error) {
      console.error("Failed to load image", error);
      setIsProcessing(false);
    }
  };

  // Auto re-process when settings that affect geometry change
  const prevSettingsRef = useRef<string>('');
  
  useEffect(() => {
    // 判断颜色过滤是否真的会影响结果
    // 只有在启用且有实际过滤效果时才包含在 relevantSettings 中
    const colorFilterActive = settings.colorFilter.enabled && (
      settings.colorFilter.filters.some(f => f.enabled) ||
      settings.colorFilter.saturationMin > 0 ||
      settings.colorFilter.saturationMax < 1 ||
      settings.colorFilter.invertMode
    );
    
    // 判断染色效果是否激活
    const colorTintActive = settings.colorTint.enabled && settings.colorTint.mappings.length > 0;
    
    const relevantSettings = JSON.stringify({
      density: settings.density,
      threshold: settings.threshold,
      depthMode: settings.depthMode,
      depthInvert: settings.depthInvert,
      depthRange: settings.depthRange,
      maxParticles: settings.maxParticles,
      noiseStrength: settings.noiseStrength,
      // New settings
      waveFrequency: settings.waveFrequency,
      waveAmplitude: settings.waveAmplitude,
      fbmOctaves: settings.fbmOctaves,
      stereoSeparation: settings.stereoSeparation,
      // 只在颜色过滤真正激活时才包含
      colorFilter: colorFilterActive ? settings.colorFilter : null,
      // 染色效果
      colorTint: colorTintActive ? settings.colorTint : null,
      // Edge sampling settings
      edgeSamplingEnabled: settings.edgeSamplingEnabled,
      edgeSensitivity: settings.edgeSensitivity,
      edgeDensityBoost: settings.edgeDensityBoost,
      fillDensity: settings.fillDensity,
      pureOutlineMode: settings.pureOutlineMode,
      edgeCropPercent: settings.edgeCropPercent,
      circularCrop: settings.circularCrop,
    });
    
    if (prevSettingsRef.current && prevSettingsRef.current !== relevantSettings && cachedImageRef.current) {
      // Settings changed, re-process
      const timer = setTimeout(() => {
        if (cachedImageRef.current) {
          doProcessImage(cachedImageRef.current, settings);
        }
      }, 150);
      
      prevSettingsRef.current = relevantSettings;
      return () => clearTimeout(timer);
    }
    
    prevSettingsRef.current = relevantSettings;
  }, [settings.density, settings.threshold, settings.depthMode, settings.depthInvert, settings.depthRange, settings.maxParticles, settings.noiseStrength, settings.waveFrequency, settings.waveAmplitude, settings.fbmOctaves, settings.stereoSeparation, settings.colorFilter, settings.colorTint, settings.edgeSamplingEnabled, settings.edgeSensitivity, settings.edgeDensityBoost, settings.fillDensity, settings.pureOutlineMode, settings.edgeCropPercent, settings.circularCrop]);

  // Save settings to localStorage when they change
  useEffect(() => {
    saveSettings(settings);
  }, [settings]);

  // Save planet settings to localStorage when they change
  useEffect(() => {
    savePlanetSceneSettings(planetSettings);
  }, [planetSettings]);

  // Load initial sample on mount
  useEffect(() => {
    handleImageProcess(SAMPLE_IMAGES[0].url);
  }, []);

  const handleLoadSample = (url: string) => {
    handleImageProcess(url);
  };
  
  const handleFileUpload = (file: File) => {
    handleImageProcess(file);
  };

  // 提取主色调
  const handleExtractColors = () => {
    if (!cachedImageRef.current) {
      console.warn('No image loaded for color extraction');
      return;
    }
    
    const img = cachedImageRef.current;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    // 使用较小的尺寸加速处理
    const maxSize = 400;
    const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
    canvas.width = Math.floor(img.width * scale);
    canvas.height = Math.floor(img.height * scale);
    
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    
    const mappings = extractDominantColors(imageData, settings.colorTint.colorCount);
    
    setSettings(prev => ({
      ...prev,
      colorTint: {
        ...prev.colorTint,
        mappings
      }
    }));
  };

  // FPS Counter (simple)
  useEffect(() => {
      let frame = 0;
      let lastTime = performance.now();
      const loop = () => {
          const time = performance.now();
          frame++;
          if (time - lastTime >= 1000) {
              setFps(frame);
              frame = 0;
              lastTime = time;
          }
          requestAnimationFrame(loop);
      };
      loop();
  }, []);

  // 检测移动设备
  const isMobile = typeof window !== 'undefined' && /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  return (
    <div className="w-full h-screen flex flex-col md:flex-row overflow-hidden font-sans" style={{ backgroundColor: 'var(--bg)', color: 'var(--text-1)' }}>
      {/* 3D Scene Area */}
      <div className="flex-1 relative min-h-0">
        {/* 顶部模式切换栏 - 移动端缩小 */}
        <div className="absolute top-2 md:top-4 left-1/2 transform -translate-x-1/2 z-50 flex items-center gap-1 bg-gray-900/90 backdrop-blur-md rounded-full p-1 shadow-xl border border-white/10">
          <button
            onClick={() => setAppMode('nebula')}
            className={`px-3 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
              appMode === 'nebula'
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <i className="fas fa-cloud mr-1 md:mr-2"></i>
            <span className="hidden sm:inline">星云模式</span>
            <span className="sm:hidden">星云</span>
          </button>
          <button
            onClick={() => setAppMode('planet')}
            className={`px-3 md:px-6 py-1.5 md:py-2 rounded-full text-xs md:text-sm font-medium transition-all ${
              appMode === 'planet'
                ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-lg'
                : 'text-gray-400 hover:text-white hover:bg-gray-800'
            }`}
          >
            <i className="fas fa-globe mr-1 md:mr-2"></i>
            <span className="hidden sm:inline">星球模式</span>
            <span className="sm:hidden">星球</span>
          </button>
        </div>

        {isProcessing && appMode === 'nebula' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
            <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-blue-400 font-mono animate-pulse">正在处理星云数据...</p>
          </div>
        )}
        
        {/* 条件渲染场景 - 星球模式时完全停止星云渲染以减少开销 */}
        {appMode === 'nebula' && (
          <NebulaScene 
              data={data} 
              settings={settings} 
              handData={handDataRef}
              colorPickMode={colorPickMode}
              onColorPick={(color) => {
                setPickedColor(color);
              }}
          />
        )}
        {appMode === 'planet' && (
          <PlanetScene 
            settings={planetSettings}
            handData={handDataRef}
            onCameraChange={setCameraInfo}
            resetCameraRef={resetCameraRef}
          />
        )}

        {/* Floating Toggle for Sidebar */}
        <button 
            onClick={() => setShowControls(!showControls)}
            className="absolute top-4 right-4 z-50 p-2 bg-gray-800 rounded-full hover:bg-gray-700 transition-colors shadow-lg"
        >
            <i className={`fas ${showControls ? 'fa-chevron-right' : 'fa-sliders-h'} text-white`}></i>
        </button>

        {/* 视角信息面板 - 仅星球模式显示 */}
        {appMode === 'planet' && cameraInfo && (
          <div className="absolute bottom-4 left-4 z-40 bg-gray-900/90 backdrop-blur-sm rounded-lg p-3 border border-gray-700 shadow-lg">
            <div className="text-xs text-gray-400 space-y-1 font-mono">
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">位置</span>
                <span className="text-white">
                  X:{cameraInfo.position.x} Y:{cameraInfo.position.y} Z:{cameraInfo.position.z}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">距离</span>
                <span className="text-cyan-400">{cameraInfo.distance}</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-gray-500 w-12">角度</span>
                <span className="text-yellow-400">
                  极:{cameraInfo.polarAngle}° 方位:{cameraInfo.azimuthAngle}°
                </span>
              </div>
            </div>
            <button
              onClick={() => resetCameraRef.current?.()}
              className="mt-2 w-full px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition-colors font-medium"
            >
              🎯 还原初始视角
            </button>
          </div>
        )}

        {/* 手势处理器（隐藏摄像头小窗） */}
        <GestureHandler handDataRef={handDataRef} enabled={gestureEnabled && !isMobile} showVideo={false} />
      </div>

      {/* Sidebar - 移动端从底部滑出 */}
      <div className={`
        ${showControls ? 'h-1/2 md:h-auto w-full md:w-80' : 'h-0 md:h-auto w-full md:w-0'} 
        transition-all duration-300 ease-in-out 
        relative 
        order-last md:order-none
        overflow-hidden
        flex-shrink-0
      `}>
         <div className="absolute inset-0 w-full md:w-80 h-full overflow-y-auto"> 
            <ControlPanel 
                settings={settings} 
                setSettings={setSettings}
                planetSettings={planetSettings}
                setPlanetSettings={setPlanetSettings}
                appMode={appMode}
                onImageUpload={handleFileUpload}
                onSampleSelect={handleLoadSample}
                fps={fps}
                particleCount={data?.count || 0}
                colorPickMode={colorPickMode}
                setColorPickMode={setColorPickMode}
                pickedColor={pickedColor}
                onExtractColors={handleExtractColors}
                gestureEnabled={gestureEnabled}
                setGestureEnabled={setGestureEnabled}
            />
         </div>
      </div>
    </div>
  );
};

export default App;