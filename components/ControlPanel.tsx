import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  AppSettings, 
  DepthMode, 
  ParticleShape, 
  ColorFilterPreset,
  ColorFilter,
  LineMode,
  LineStyle,
  LineColorMode,
  LineRenderMode,
  GlowMode,
  LineGradientMode,
  AccretionLayer,
  ColorTintMapping,
  // 星球模块类型
  AppMode,
  PlanetSceneSettings,
  PlanetSettings,
  PlanetFillMode,
  ParticleRingSettings,
  ContinuousRingSettings,
  OrbitingFireflySettings,
  WanderingFireflyGroupSettings,
  OrbitingParticlesSettings,
  ParticleEmitterSettings,
  PlanetCoreSettings,
  RingOpacityGradient,
  SavedPlanetTemplate,
  TiltSettings,
  OrbitAxisSettings,
  RotationAxisSettings,
  RotationAxisPreset,
  SolidCoreSettings,
  SolidCorePresetType,
  CoreType,
  OrbitSettings,
  EnergyBodySettings,
  SurfaceFlameSettings,
  FlameJetSettings,
  SpiralFlameSettings,
  FlameSystemSettings,
  AfterimageZoneSettings,
  AfterimageSystemSettings
} from '../types';
import { 
  SAMPLE_IMAGES, 
  COLOR_FILTER_PRESETS, 
  COLOR_FILTER_PRESET_LABELS,
  DEFAULT_COLOR_FILTER,
  // 星球模块常量
  createDefaultPlanet,
  createDefaultParticleRing,
  createDefaultContinuousRing,
  createDefaultOrbitingFirefly,
  createDefaultWanderingGroup,
  createDefaultCore,
  createDefaultOrbiting,
  createDefaultEmitter,
  createDefaultEnergyBody,
  createDefaultSolidCore,
  createDefaultSurfaceFlame,
  createDefaultFlameJet,
  createDefaultSpiralFlame,
  SURFACE_FLAME_PRESETS,
  FLAME_JET_PRESETS,
  SPIRAL_FLAME_PRESETS,
  DEFAULT_FLAME_SYSTEM,
  DEFAULT_AFTERIMAGE_SYSTEM,
  createDefaultAfterimageZone,
  MAX_PLANETS,
  PLANET_TEMPLATES_STORAGE_KEY,
  PLANET_PARTICLE_WARNING_THRESHOLD,
  getTiltAngles,
  DEFAULT_TILT_SETTINGS,
  DEFAULT_ORBIT_AXIS_SETTINGS,
  ROTATION_AXIS_PRESETS,
  getRotationAxis,
  DEFAULT_ROTATION_AXIS_SETTINGS,
  SOLID_CORE_PRESETS,
  DEFAULT_SOLID_CORE,
  DEFAULT_ORBIT_SETTINGS,
  MAGIC_CIRCLE_TEXTURES,
  MAGIC_TEXTURE_CATEGORIES,
  MAGIC_CIRCLE_TEXTURES_BY_CATEGORY,
  MagicTextureCategory,
  BACKGROUND_IMAGES,
  // 模块预设
  PARTICLE_CORE_PRESETS,
  PARTICLE_RING_PRESETS,
  CONTINUOUS_RING_PRESETS,
  AFTERIMAGE_PARTICLE_PRESETS,
  AFTERIMAGE_TEXTURE_PRESETS,
  ORBITING_PARTICLES_PRESETS,
  EMITTER_PRESETS,
  ORBITING_FIREFLY_PRESETS,
  WANDERING_FIREFLY_PRESETS
} from '../constants';

type TabType = 'particle' | 'line' | 'interact';
type PlanetTabType = 'basic' | 'visual' | 'dynamic' | 'interact';

interface ControlPanelProps {
  settings: AppSettings;
  setSettings: React.Dispatch<React.SetStateAction<AppSettings>>;
  planetSettings: PlanetSceneSettings;
  setPlanetSettings: React.Dispatch<React.SetStateAction<PlanetSceneSettings>>;
  appMode: AppMode;
  onImageUpload: (file: File) => void;
  onSampleSelect: (url: string) => void;
  fps: number;
  particleCount: number;
  colorPickMode: boolean;
  setColorPickMode: (mode: boolean) => void;
  pickedColor: { h: number; s: number; l: number } | null;
  onExtractColors?: () => void;  // 提取主色调回调
  gestureEnabled: boolean;
  setGestureEnabled: (enabled: boolean) => void;
}

const DepthModeLabels: Record<DepthMode, string> = {
  [DepthMode.Brightness]: '亮度映射',
  [DepthMode.InverseBrightness]: '反向亮度',
  [DepthMode.Hue]: '色相映射',
  [DepthMode.Saturation]: '饱和度映射',
  [DepthMode.Perlin]: '柏林噪声',
  [DepthMode.Radial]: '径向距离',
  [DepthMode.Layered]: '分层深度',
  [DepthMode.Emboss]: '浮雕效果',
  [DepthMode.Stereo]: '双眼视差',
  [DepthMode.FBM]: '分形噪声',
  [DepthMode.Wave]: '波浪效果'
};

const ParticleShapeLabels: Record<ParticleShape, string> = {
  [ParticleShape.Circle]: '圆形',
  [ParticleShape.Square]: '方形',
  [ParticleShape.Star]: '五角星',
  [ParticleShape.Snowflake]: '雪花',
  [ParticleShape.Heart]: '❤️ 爱心',
  [ParticleShape.Diamond]: '💎 钻石',
  [ParticleShape.Crescent]: '🌙 月牙',
  [ParticleShape.CrossGlow]: '✨ 十字光',
  [ParticleShape.Sakura]: '🌸 樱花',
  [ParticleShape.Sun]: '☀️ 太阳',
  [ParticleShape.Octahedron]: '🔷 八面体',
  [ParticleShape.Fragment]: '💠 碎片',
  [ParticleShape.Butterfly]: '🦋 蝴蝶',
};

const LineModeLabels: Record<LineMode, string> = {
  [LineMode.Distance]: '距离连线',
  [LineMode.Color]: '颜色相近',
  [LineMode.KNN]: 'K近邻',
  [LineMode.Delaunay]: '三角网格'
};

const LineStyleLabels: Record<LineStyle, string> = {
  [LineStyle.Solid]: '实线',
  [LineStyle.Dashed]: '虚线'
};

const GlowModeLabels: Record<GlowMode, string> = {
  [GlowMode.None]: '无光晕',
  [GlowMode.Soft]: '柔和',
  [GlowMode.Sharp]: '锐利恒星',
  [GlowMode.Aura]: '光环'
};

const LineGradientModeLabels: Record<LineGradientMode, string> = {
  [LineGradientMode.Fixed]: '固定渐变',
  [LineGradientMode.ParticleColor]: '粒子颜色'
};

const LineColorModeLabels: Record<LineColorMode, string> = {
  [LineColorMode.Inherit]: '继承粒子',
  [LineColorMode.Gradient]: '渐变色',
  [LineColorMode.Custom]: '自定义'
};

const LineRenderModeLabels: Record<LineRenderMode, string> = {
  [LineRenderMode.Dynamic]: '动态 (GPU)',
  [LineRenderMode.Static]: '静态 (CPU)'
};

const ControlGroup: React.FC<{ title: string; children: React.ReactNode; rightContent?: React.ReactNode }> = ({ title, children, rightContent }) => (
  <div className="mb-5 border-b pb-4" style={{ borderColor: 'var(--border)' }}>
    <div className="flex items-center justify-between mb-4">
      <h3 className="text-sm font-bold tracking-wide" style={{ color: 'var(--accent-2)' }}>{title}</h3>
      {rightContent}
    </div>
    <div className="space-y-3">{children}</div>
  </div>
);

// 启用/禁用按钮组件
const EnableButton: React.FC<{ enabled: boolean; onChange: (enabled: boolean) => void }> = ({ enabled, onChange }) => (
  <button
    onClick={() => onChange(!enabled)}
    className="px-2 py-0.5 text-[10px] rounded transition-colors"
    style={{
      backgroundColor: enabled ? 'var(--accent)' : 'var(--surface)',
      color: enabled ? '#fff' : 'var(--text-2)',
      border: enabled ? 'none' : '1px solid var(--border)'
    }}
  >
    {enabled ? '已启用' : '已禁用'}
  </button>
);

// ==================== 透明模态框组件 ====================
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

const TransparentModal: React.FC<ModalProps> = ({ isOpen, onClose, onConfirm, title, message, confirmText = '确定', cancelText = '取消' }) => {
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-xl p-5 shadow-2xl max-w-sm mx-4 min-w-[280px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-medium text-white mb-3">{title}</h3>
        <p className="text-sm text-gray-300 mb-5 leading-relaxed">{message}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">{cancelText}</button>
          <button onClick={() => { onConfirm(); onClose(); }} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">{confirmText}</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// 输入模态框
interface InputModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (value: string) => void;
  title: string;
  placeholder?: string;
  defaultValue?: string;
}

const InputModal: React.FC<InputModalProps> = ({ isOpen, onClose, onConfirm, title, placeholder = '', defaultValue = '' }) => {
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);
  
  useEffect(() => {
    if (isOpen) {
      setValue(defaultValue);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, defaultValue]);
  
  if (!isOpen) return null;
  
  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-gray-900/90 backdrop-blur-md border border-white/20 rounded-xl p-5 shadow-2xl max-w-sm mx-4 w-full min-w-[280px]" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-medium text-white mb-4">{title}</h3>
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => setValue(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && value.trim()) { onConfirm(value.trim()); onClose(); } if (e.key === 'Escape') onClose(); }}
          placeholder={placeholder}
          className="w-full px-3 py-2.5 text-sm bg-gray-800 border border-gray-600 rounded-lg text-white mb-5 focus:outline-none focus:border-blue-500"
        />
        <div className="flex gap-3 justify-end">
          <button onClick={onClose} className="px-4 py-2 text-sm bg-gray-700 hover:bg-gray-600 text-gray-300 rounded-lg transition-colors">取消</button>
          <button onClick={() => { if (value.trim()) { onConfirm(value.trim()); onClose(); } }} className="px-4 py-2 text-sm bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">确定</button>
        </div>
      </div>
    </div>,
    document.body
  );
};

// ==================== 预设列表组件 ====================
// 预设存储键
const PRESET_STORAGE_KEYS = {
  // 核心
  solidCore: 'planet_presets_solidCore',
  particleCore: 'planet_presets_particleCore',
  // 火焰/残影
  surfaceFlame: 'planet_presets_surfaceFlame',
  flameJet: 'planet_presets_flameJet',
  spiralFlame: 'planet_presets_spiralFlame',
  afterimageTexture: 'planet_presets_afterimageTexture',
  afterimageParticle: 'planet_presets_afterimageParticle',
  // 光环
  particleRing: 'planet_presets_particleRing',
  continuousRing: 'planet_presets_continuousRing',
  // 辐射
  orbitingParticles: 'planet_presets_orbitingParticles',
  emitter: 'planet_presets_emitter',
  // 流萤
  orbitingFirefly: 'planet_presets_orbitingFirefly',
  wanderingFirefly: 'planet_presets_wanderingFirefly'
};

// 预设项接口
interface PresetItem {
  id: string;
  name: string;
  isBuiltIn: boolean;  // 是否为内置预设
  data: any;  // 预设数据
}

// 预设列表组件 Props
interface PresetListBoxProps {
  storageKey: string;  // localStorage 键
  builtInPresets: { id: string; name: string; data: any }[];  // 内置预设
  currentData: any;  // 当前实例数据（用于保存）
  hasInstance: boolean;  // 是否有选中的实例
  instanceName?: string;  // 当前实例名称
  onApplyToInstance: (data: any) => void;  // 应用到当前实例
  onCreateInstance: (data: any, presetName: string) => void;  // 从预设创建新实例
  title?: string;
  accentColor?: string;  // 主题色 (如 'purple', 'orange', 'red')
}

// 预设列表组件
const PresetListBox: React.FC<PresetListBoxProps> = ({
  storageKey,
  builtInPresets,
  currentData,
  hasInstance,
  instanceName = '',
  onApplyToInstance,
  onCreateInstance,
  title = '预设',
  accentColor = 'purple'
}) => {
  const [userPresets, setUserPresets] = useState<PresetItem[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 模态框状态
  const [applyModal, setApplyModal] = useState<{ isOpen: boolean; presetName: string; data: any }>({ isOpen: false, presetName: '', data: null });
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; presetId: string; presetName: string }>({ isOpen: false, presetId: '', presetName: '' });
  const [saveModal, setSaveModal] = useState<{ isOpen: boolean; presetId: string; presetName: string }>({ isOpen: false, presetId: '', presetName: '' });
  
  // 从 localStorage 加载用户预设
  useEffect(() => {
    const loadPresets = () => {
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setUserPresets(JSON.parse(saved));
        }
      } catch (e) {
        console.error('Failed to load presets:', e);
      }
    };
    
    loadPresets();
    
    // 监听 storage 事件以刷新预设列表
    window.addEventListener('storage', loadPresets);
    return () => window.removeEventListener('storage', loadPresets);
  }, [storageKey]);
  
  // 保存用户预设到 localStorage
  const saveUserPresets = (presets: PresetItem[]) => {
    setUserPresets(presets);
    try {
      localStorage.setItem(storageKey, JSON.stringify(presets));
    } catch (e) {
      console.error('Failed to save presets:', e);
    }
  };
  
  // 合并内置预设和用户预设（过滤掉被用户覆盖的内置预设）
  const allPresets: PresetItem[] = [
    ...builtInPresets.map(p => ({ ...p, isBuiltIn: true })).filter(p => !userPresets.some(u => u.id === p.id)),
    ...userPresets
  ];
  
  // 双击重命名（仅用户预设）
  const handleDoubleClick = (preset: PresetItem) => {
    if (preset.isBuiltIn) return;
    setEditingId(preset.id);
    setEditingName(preset.name);
    setTimeout(() => inputRef.current?.focus(), 0);
  };
  
  // 提交重命名
  const handleRenameSubmit = () => {
    if (editingId && editingName.trim()) {
      const updated = userPresets.map(p => 
        p.id === editingId ? { ...p, name: editingName.trim() } : p
      );
      saveUserPresets(updated);
    }
    setEditingId(null);
  };
  
  // 点击预设
  const handlePresetClick = (preset: PresetItem) => {
    if (editingId === preset.id) return;
    const dataToApply = preset.data;
    const displayName = preset.name;
    
    if (hasInstance) {
      // 有实例，弹出确认框
      setApplyModal({ isOpen: true, presetName: displayName, data: dataToApply });
    } else {
      // 无实例，直接创建
      onCreateInstance(dataToApply, displayName);
    }
  };
  
  // 保存到预设
  const handleSaveToPreset = (presetId: string, presetName: string) => {
    if (!currentData) return;
    setSaveModal({ isOpen: true, presetId, presetName });
  };
  
  // 确认保存
  const confirmSave = () => {
    const { presetId, presetName } = saveModal;
    const existingIdx = userPresets.findIndex(p => p.id === presetId);
    if (existingIdx >= 0) {
      // 更新现有用户预设
      const updated = [...userPresets];
      updated[existingIdx] = { ...updated[existingIdx], data: { ...currentData } };
      saveUserPresets(updated);
    } else {
      // 内置预设被覆盖，创建同ID的用户预设
      const newPreset: PresetItem = { id: presetId, name: presetName, isBuiltIn: false, data: { ...currentData } };
      saveUserPresets([...userPresets, newPreset]);
    }
  };
  
  // 删除预设
  const handleDeletePreset = (presetId: string, presetName: string) => {
    setDeleteModal({ isOpen: true, presetId, presetName });
  };
  
  // 确认删除
  const confirmDelete = () => {
    saveUserPresets(userPresets.filter(p => p.id !== deleteModal.presetId));
  };
  
  // 主题色映射
  const colorClasses = {
    purple: { bg: 'bg-purple-600', hover: 'hover:bg-purple-500', text: 'text-purple-400' },
    orange: { bg: 'bg-orange-600', hover: 'hover:bg-orange-500', text: 'text-orange-400' },
    red: { bg: 'bg-red-600', hover: 'hover:bg-red-500', text: 'text-red-400' },
    blue: { bg: 'bg-blue-600', hover: 'hover:bg-blue-500', text: 'text-blue-400' }
  };
  const colors = colorClasses[accentColor as keyof typeof colorClasses] || colorClasses.purple;
  
  return (
    <>
      <div className="mb-3 p-2 bg-gray-800/50 rounded">
        <label className={`text-xs ${colors.text} block mb-2`}>{title}</label>
        {/* 预设列表框 */}
        <div className="h-[120px] overflow-y-auto bg-gray-900/50 rounded border border-gray-700">
          {allPresets.length === 0 ? (
            <div className="p-2 text-xs text-gray-500 text-center">暂无预设</div>
          ) : (
            allPresets.map(preset => {
              const isEditing = editingId === preset.id;
              const isUserPreset = !preset.isBuiltIn;
              
              return (
                <div
                  key={preset.id}
                  className="flex items-center justify-between px-2 py-1 hover:bg-gray-700/50 cursor-pointer group"
                  onClick={() => handlePresetClick(preset)}
                  onDoubleClick={() => handleDoubleClick(preset)}
                >
                  {/* 名称 */}
                  <div className="flex-1 min-w-0">
                    {isEditing ? (
                      <input
                        ref={inputRef}
                        type="text"
                        value={editingName}
                        onChange={(e) => setEditingName(e.target.value)}
                        onBlur={handleRenameSubmit}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditingId(null); }}
                        onClick={(e) => e.stopPropagation()}
                        className="w-full px-1 py-0.5 text-xs bg-gray-800 border border-gray-600 rounded text-white"
                      />
                    ) : (
                      <span className={`text-xs truncate block ${isUserPreset ? 'text-blue-300' : 'text-gray-300'}`}>
                        {isUserPreset ? '✨ ' : ''}{preset.name}
                      </span>
                    )}
                  </div>
                  
                  {/* 操作按钮 - 始终显示 */}
                  <div className="flex items-center gap-1 ml-2">
                    {/* 保存按钮 - 所有预设都有 */}
                    <button
                      onClick={(e) => { e.stopPropagation(); handleSaveToPreset(preset.id, preset.name); }}
                      className="p-0.5 text-[10px] text-gray-400 hover:text-green-400"
                      title="保存当前参数到此预设"
                    >
                      💾
                    </button>
                    {/* 删除按钮 - 仅用户预设 */}
                    {isUserPreset && (
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeletePreset(preset.id, preset.name); }}
                        className="p-0.5 text-[10px] text-gray-400 hover:text-red-400"
                        title="删除预设"
                      >
                        🗑
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
      {/* 应用确认模态框 */}
      <TransparentModal
        isOpen={applyModal.isOpen}
        onClose={() => setApplyModal({ ...applyModal, isOpen: false })}
        onConfirm={() => onApplyToInstance(applyModal.data)}
        title="应用预设"
        message={`是否将预设"${applyModal.presetName}"的参数应用到当前${instanceName || '实例'}？`}
        confirmText="应用"
      />
      
      {/* 保存确认模态框 */}
      <TransparentModal
        isOpen={saveModal.isOpen}
        onClose={() => setSaveModal({ ...saveModal, isOpen: false })}
        onConfirm={confirmSave}
        title="保存预设"
        message={`是否将当前参数保存到预设"${saveModal.presetName}"？`}
        confirmText="保存"
      />
      
      {/* 删除确认模态框 */}
      <TransparentModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={confirmDelete}
        title="删除预设"
        message={`是否删除预设"${deleteModal.presetName}"？`}
        confirmText="删除"
      />
    </>
  );
};

// 保存到新预设按钮组件
interface SavePresetButtonProps {
  storageKey: string;
  currentData: any;
  defaultName: string;
  accentColor?: string;
  onSaved?: () => void;
}

const SavePresetButton: React.FC<SavePresetButtonProps> = ({ storageKey, currentData, defaultName, accentColor = 'purple', onSaved }) => {
  const [isOpen, setIsOpen] = useState(false);
  
  const colorClasses: Record<string, string> = {
    purple: 'bg-purple-700 hover:bg-purple-600',
    orange: 'bg-orange-700 hover:bg-orange-600',
    red: 'bg-red-700 hover:bg-red-600',
    blue: 'bg-blue-700 hover:bg-blue-600'
  };
  
  const handleSave = (presetName: string) => {
    const saved = localStorage.getItem(storageKey);
    const userPresets = saved ? JSON.parse(saved) : [];
    const newPreset = {
      id: `user_${Date.now()}`,
      name: presetName,
      isBuiltIn: false,
      data: { ...currentData, id: undefined, name: undefined, enabled: undefined }
    };
    localStorage.setItem(storageKey, JSON.stringify([...userPresets, newPreset]));
    onSaved?.();
    // 触发重新加载（通过 storage 事件）
    window.dispatchEvent(new Event('storage'));
  };
  
  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className={`px-2 py-0.5 text-[10px] ${colorClasses[accentColor] || colorClasses.purple} text-white rounded`}
        title="将当前配置保存为新预设"
      >
        保存到预设
      </button>
      <InputModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        onConfirm={handleSave}
        title="保存为新预设"
        placeholder="请输入预设名称"
        defaultValue={defaultName}
      />
    </>
  );
};

// 导出预设按钮组件
interface ExportPresetButtonProps {
  storageKey: string;
  moduleName: string;  // 模块名称，用于文件名
  builtInPresets?: { id: string; name: string; data: any }[];
}

const ExportPresetButton: React.FC<ExportPresetButtonProps> = ({ storageKey, moduleName, builtInPresets = [] }) => {
  const handleExport = () => {
    try {
      const saved = localStorage.getItem(storageKey);
      const userPresets = saved ? JSON.parse(saved) : [];
      
      // 合并内置预设和用户预设
      const allPresets = [
        ...builtInPresets.map(p => ({ ...p, isBuiltIn: true })),
        ...userPresets
      ];
      
      if (allPresets.length === 0) {
        alert('没有可导出的预设');
        return;
      }
      
      const exportData = {
        type: 'planet_preset',
        module: moduleName,
        version: 1,
        exportTime: new Date().toISOString(),
        presets: allPresets
      };
      
      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `preset_${moduleName}_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Export failed:', e);
      alert('导出失败');
    }
  };
  
  return (
    <button
      onClick={handleExport}
      className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded"
      title="导出预设到文件"
    >
      📤 导出
    </button>
  );
};

// 导入预设按钮组件
interface ImportPresetButtonProps {
  storageKey: string;
  moduleName: string;
  onImportComplete?: () => void;
}

const ImportPresetButton: React.FC<ImportPresetButtonProps> = ({ storageKey, moduleName, onImportComplete }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importData = JSON.parse(event.target?.result as string);
        
        // 验证格式
        if (importData.type !== 'planet_preset') {
          alert('无效的预设文件格式');
          return;
        }
        
        if (importData.module !== moduleName) {
          if (!confirm(`该预设文件是为"${importData.module}"模块创建的，是否仍要导入到当前模块？`)) {
            return;
          }
        }
        
        // 获取现有预设
        const saved = localStorage.getItem(storageKey);
        const existingPresets = saved ? JSON.parse(saved) : [];
        
        // 只导入用户预设（非内置）
        const presetsToImport = (importData.presets || [])
          .filter((p: any) => !p.isBuiltIn)
          .map((p: any) => ({
            ...p,
            id: `imported_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            isBuiltIn: false
          }));
        
        if (presetsToImport.length === 0) {
          alert('没有可导入的用户预设');
          return;
        }
        
        // 合并预设
        const mergedPresets = [...existingPresets, ...presetsToImport];
        localStorage.setItem(storageKey, JSON.stringify(mergedPresets));
        
        // 触发刷新
        window.dispatchEvent(new Event('storage'));
        onImportComplete?.();
        
        alert(`成功导入 ${presetsToImport.length} 个预设`);
      } catch (err) {
        console.error('Import failed:', err);
        alert('导入失败：文件格式错误');
      }
    };
    reader.readAsText(file);
    
    // 重置 input，允许重复选择同一文件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };
  
  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleImport}
        style={{ display: 'none' }}
      />
      <button
        onClick={() => fileInputRef.current?.click()}
        className="px-2 py-0.5 text-[10px] bg-gray-600 hover:bg-gray-500 text-white rounded"
        title="从文件导入预设"
      >
        📥 导入
      </button>
    </>
  );
};

const RangeControl: React.FC<{ 
  label: string; 
  value: number; 
  min: number; 
  max: number; 
  step?: number; 
  onChange: (val: number) => void; 
}> = ({ label, value, min, max, step = 1, onChange }) => {
  // 确保 value 是有效数字
  const safeValue = typeof value === 'number' && !isNaN(value) ? value : min;
  return (
  <div className="flex flex-col mb-1">
    <div className="flex justify-between text-xs mb-1.5" style={{ color: 'var(--text-2)' }}>
      <span>{label}</span>
      <span style={{ color: 'var(--text-1)' }}>{safeValue.toFixed(step < 1 ? 1 : 0)}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={safeValue}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 rounded-lg appearance-none cursor-pointer"
      style={{ backgroundColor: 'var(--border)' }}
    />
  </div>
  );
};

// 图片下拉选择器组件（支持分类标签页和缩略图预览）
const ImageSelectDropdown: React.FC<{
  value: string;
  onChange: (value: string) => void;
  label?: string;
}> = ({ value, onChange, label }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState<MagicTextureCategory>('cute');
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  // 获取当前选中项的标签
  const allOptions = MAGIC_CIRCLE_TEXTURES;
  const currentOption = allOptions.find(o => o.value === value) || allOptions[0];
  const currentCategoryOptions = MAGIC_CIRCLE_TEXTURES_BY_CATEGORY[activeCategory];
  
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-xs text-gray-400 w-12">{label}</span>}
      <div ref={dropdownRef} className="relative flex-1">
        {/* 当前选中项 */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center gap-2 px-2 py-1.5 bg-gray-700 rounded text-xs text-gray-200 hover:bg-gray-600 transition-colors"
        >
          <div className="w-8 h-8 rounded border border-gray-600 overflow-hidden flex-shrink-0 bg-black">
            <img src={value} alt="" className="w-full h-full object-contain" onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }} />
          </div>
          <span className="flex-1 text-left truncate">{currentOption?.label}</span>
          <span className="text-gray-500">{isOpen ? '▲' : '▼'}</span>
        </button>
        
        {/* 下拉面板 */}
        {isOpen && (
          <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-800 border border-gray-600 rounded-lg shadow-xl">
            {/* 分类标签页 */}
            <div className="flex border-b border-gray-700">
              {MAGIC_TEXTURE_CATEGORIES.map((cat) => (
                <button
                  key={cat.key}
                  onClick={() => setActiveCategory(cat.key)}
                  className={`flex-1 py-1.5 text-[10px] transition-colors ${
                    activeCategory === cat.key
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-400 hover:bg-gray-700 hover:text-white'
                  }`}
                  title={cat.label}
                >
                  {cat.icon}
                </button>
              ))}
            </div>
            
            {/* 图片网格 */}
            <div className="max-h-48 overflow-y-auto">
              <div className="grid grid-cols-4 gap-1 p-2">
                {currentCategoryOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setIsOpen(false); }}
                    className={`p-1 rounded transition-colors ${
                      opt.value === value 
                        ? 'bg-purple-600 ring-2 ring-purple-400' 
                        : 'bg-gray-700 hover:bg-gray-600'
                    }`}
                    title={opt.label}
                  >
                    <div className="w-full aspect-square rounded overflow-hidden bg-black">
                      <img 
                        src={opt.value} 
                        alt={opt.label} 
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => { (e.target as HTMLImageElement).style.opacity = '0'; }}
                      />
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 法阵控制组件 - 独立组件避免 Hooks 规则违反
const MagicCircleControl: React.FC<{
  planet: PlanetSettings;
  updatePlanet: (updates: Partial<PlanetSettings>) => void;
}> = ({ planet, updatePlanet }) => {
  const [selectedCircleId, setSelectedCircleId] = useState<string | null>(null);
  const soloCircleId = planet.magicCircles?.soloId || null;
  
  // 如果没有法阵，自动创建一个默认实例
  let circles = planet.magicCircles?.circles || [];
  if (circles.length === 0) {
    const defaultGradient = { enabled: false, mode: 'none' as const, colors: ['#ff6b6b', '#4ecdc4', '#ffd93d'], colorMidPosition: 0.5, colorMidWidth: 0, direction: 'radial' as const, directionCustom: { x: 1, y: 0, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'y' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1, angle: 0, type: 'linear' as const };
    const defaultCircle = { 
      id: 'default-magic-circle', name: '1', enabled: true,
      texture: '/magic/cute/circle01.png',
      yOffset: 0, radius: 150, rotationSpeed: 0.5, opacity: 0.8,
      hueShift: 0, baseHue: 200, baseSaturation: 1.0, saturationBoost: 1.0, brightness: 1.0, gradientColor: defaultGradient,
      pulseEnabled: false, pulseSpeed: 1.0, pulseIntensity: 0.3,
      breathEnabled: false, breathSpeed: 0.5, breathIntensity: 0.1,
      tilt: { ...DEFAULT_TILT_SETTINGS }
    };
    circles = [defaultCircle];
    // 延迟更新以避免渲染循环
    setTimeout(() => {
      updatePlanet({ magicCircles: { ...planet.magicCircles, enabled: true, circles: [defaultCircle] } });
    }, 0);
  }
  
  const effectiveSelectedCircleId = selectedCircleId && circles.find(c => c.id === selectedCircleId)
    ? selectedCircleId
    : circles[0]?.id || null;
  const currentCircle = circles.find(c => c.id === effectiveSelectedCircleId);
  
  const updateCircle = (id: string, updates: Partial<import('../types').MagicCircleSettings>) => {
    const newCircles = circles.map(c => 
      c.id === id ? { ...c, ...updates } : c
    );
    updatePlanet({ magicCircles: { ...planet.magicCircles, circles: newCircles } });
  };
  
  // 设置 Solo 模式
  const setSoloCircleId = (id: string | null) => {
    updatePlanet({ 
      magicCircles: { 
        enabled: true,
        circles: circles,
        soloId: id
      } 
    });
  };
  
  // 生成下一个可用的数字名称
  const getNextName = () => {
    const existingNumbers = circles
      .map(c => parseInt(c.name))
      .filter(n => !isNaN(n));
    let next = 1;
    while (existingNumbers.includes(next)) next++;
    return String(next);
  };
  
  // 颜色模式相关
  const colorMode = currentCircle?.gradientColor?.enabled ? (currentCircle.gradientColor.mode || 'single') : 'none';
  const setColorMode = (mode: string) => {
    if (!currentCircle) return;
    if (mode === 'none') {
      updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, enabled: false, mode: 'none' } });
    } else {
      updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, enabled: true, mode: mode as any } });
    }
  };
  
  return (
    <ControlGroup title="法阵系统">
      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
        <FloatingListSelector
          items={circles.map(c => ({ 
            id: c.id, 
            name: c.name, 
            enabled: soloCircleId ? c.id === soloCircleId : c.enabled 
          }))}
          selectedId={effectiveSelectedCircleId}
          onSelect={setSelectedCircleId}
          onToggleEnabled={(id, enabled) => {
            if (soloCircleId) return;
            updateCircle(id, { enabled });
          }}
          onRename={(id, name) => updateCircle(id, { name })}
          onDelete={(id) => {
            const newCircles = circles.filter(c => c.id !== id);
            updatePlanet({ magicCircles: { ...planet.magicCircles, circles: newCircles } });
            if (effectiveSelectedCircleId === id) setSelectedCircleId(newCircles[0]?.id || null);
            if (soloCircleId === id) setSoloCircleId(null);
          }}
          onAdd={() => {
            const id = Date.now().toString();
            const name = getNextName();
            const defaultGradient = { enabled: false, mode: 'none' as const, colors: ['#ff6b6b', '#4ecdc4', '#ffd93d'], colorMidPosition: 0.5, colorMidWidth: 0, direction: 'radial' as const, directionCustom: { x: 1, y: 0, z: 0 }, spiralDensity: 2, spiralAxis: 'y' as const, proceduralAxis: 'y' as const, proceduralCustomAxis: { x: 0, y: 1, z: 0 }, proceduralIntensity: 1, angle: 0, type: 'linear' as const };
            const newCircle = { 
              id, name, enabled: true,
              texture: '/magic/cute/circle01.png',
              yOffset: 0, radius: 150, rotationSpeed: 0.5, opacity: 0.8,
              hueShift: 0, baseHue: 200, baseSaturation: 1.0, saturationBoost: 1.0, brightness: 1.0, gradientColor: defaultGradient,
              pulseEnabled: false, pulseSpeed: 1.0, pulseIntensity: 0.3,
              breathEnabled: false, breathSpeed: 0.5, breathIntensity: 0.1,
              tilt: { ...DEFAULT_TILT_SETTINGS }
            };
            updatePlanet({ magicCircles: { ...planet.magicCircles, circles: [...circles, newCircle] } });
            setSelectedCircleId(id);
          }}
          globalEnabled={planet.magicCircles?.enabled ?? true}
          onGlobalToggle={(enabled) => updatePlanet({ magicCircles: { ...planet.magicCircles!, enabled } })}
          soloId={soloCircleId}
          onSoloToggle={setSoloCircleId}
          title="法阵"
          titleColor="text-purple-400"
          addButtonColor="bg-purple-600 hover:bg-purple-500"
          emptyText="暂无法阵"
        />
        
        {/* 选中法阵的参数 */}
        {currentCircle && (
        <div className="space-y-2 mt-3">
          {/* 贴图选择（带缩略图预览网格） */}
          <ImageSelectDropdown
            label="贴图"
            value={currentCircle.texture}
            onChange={(v) => updateCircle(currentCircle.id, { texture: v })}
          />
          
          {/* 基础参数 */}
          <RangeControl label="Y轴偏移" value={currentCircle.yOffset} min={-500} max={500} step={10} onChange={(v) => updateCircle(currentCircle.id, { yOffset: v })} />
          <RangeControl label="半径" value={currentCircle.radius} min={10} max={500} step={10} onChange={(v) => updateCircle(currentCircle.id, { radius: v })} />
          <RangeControl label="自转速度" value={currentCircle.rotationSpeed} min={-5} max={5} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { rotationSpeed: v })} />
          <RangeControl label="透明度" value={currentCircle.opacity} min={0} max={1} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { opacity: v })} />
          
          {/* 倾斜控制 */}
          <TiltPresetSelector 
            tilt={currentCircle.tilt ?? DEFAULT_TILT_SETTINGS}
            onChange={(tilt) => updateCircle(currentCircle.id, { tilt })}
          />
          
          {/* 颜色调节 */}
          <div className="p-2 bg-gray-800/50 rounded">
            <span className="text-xs text-gray-400 block mb-2">颜色调节</span>
            <RangeControl label="色相偏移" value={currentCircle.hueShift} min={0} max={360} step={5} onChange={(v) => updateCircle(currentCircle.id, { hueShift: v })} />
            <div className="h-2 rounded mb-2" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />
            <RangeControl label="饱和度" value={currentCircle.saturationBoost ?? 1.0} min={0} max={5} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { saturationBoost: v })} />
            <RangeControl label="亮度" value={currentCircle.brightness} min={0.5} max={3} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { brightness: v })} />
          </div>
          
          {/* 染色 */}
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-purple-400 font-medium">🎨 染色</span>
              <button
                onClick={() => {
                  const newMode = colorMode === 'none' ? 'twoColor' : 'none';
                  setColorMode(newMode);
                }}
                className={`px-2 py-0.5 text-[10px] rounded transition-colors ${colorMode !== 'none' ? 'bg-purple-600 text-white' : 'bg-gray-600 text-gray-300'}`}
              >
                {colorMode !== 'none' ? '已启用' : '已禁用'}
              </button>
            </div>
            
            {colorMode !== 'none' && (
              <>
                <div className="grid grid-cols-4 gap-1 mb-2">
                  {[
                    { id: 'single', label: '单色' },
                    { id: 'twoColor', label: '双色' },
                    { id: 'threeColor', label: '三色' },
                    { id: 'procedural', label: '混色' }
                  ].map(m => (
                    <button
                      key={m.id}
                      onClick={() => setColorMode(m.id)}
                      className={`px-1 py-1 text-[10px] rounded transition-colors ${colorMode === m.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              
              {/* 单色模式 */}
              {colorMode === 'single' && (
                <div className="space-y-1">
                  <RangeControl label="色相" value={currentCircle.baseHue ?? 200} min={0} max={360} step={5} onChange={(v) => updateCircle(currentCircle.id, { baseHue: v })} />
                  <div className="h-2 rounded" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />
                  <RangeControl label="饱和度" value={currentCircle.baseSaturation ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => updateCircle(currentCircle.id, { baseSaturation: v })} />
                </div>
              )}
              
              {/* 双色渐变 */}
              {colorMode === 'twoColor' && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center justify-center">
                    <input type="color" value={currentCircle.gradientColor?.colors?.[0] || '#ff6b6b'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[0] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="起始色" />
                    <span className="text-gray-400">→</span>
                    <input type="color" value={currentCircle.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[1] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="结束色" />
                  </div>
                  <select value={currentCircle.gradientColor?.direction || 'radial'} onChange={(e) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                    <option value="radial">径向（中心→外）</option>
                    <option value="linearX">X轴线性</option>
                    <option value="linearY">Y轴线性</option>
                    <option value="spiral">螺旋</option>
                  </select>
                  {currentCircle.gradientColor?.direction === 'spiral' && (
                    <RangeControl label="螺旋圈数" value={currentCircle.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, spiralDensity: v } })} />
                  )}
                </div>
              )}
              
              {/* 三色渐变 */}
              {colorMode === 'threeColor' && (
                <div className="space-y-2">
                  <div className="flex gap-1 items-center justify-center">
                    <input type="color" value={currentCircle.gradientColor?.colors?.[0] || '#ff6b6b'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[0] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                    <span className="text-gray-500">→</span>
                    <input type="color" value={currentCircle.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[1] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                    <span className="text-gray-500">→</span>
                    <input type="color" value={currentCircle.gradientColor?.colors?.[2] || '#ffd93d'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[2] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                  </div>
                  <RangeControl label="中间色位置" value={currentCircle.gradientColor?.colorMidPosition ?? 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colorMidPosition: v } })} />
                  <RangeControl label="中间色宽度" value={currentCircle.gradientColor?.colorMidWidth ?? 1} min={0} max={5} step={0.05} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colorMidWidth: v, colorMidWidth2: 0 } })} />
                  <RangeControl label="纯色带宽度" value={currentCircle.gradientColor?.colorMidWidth2 ?? 0} min={0} max={0.5} step={0.01} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colorMidWidth2: v, colorMidWidth: 1 } })} />
                  <select value={currentCircle.gradientColor?.direction || 'radial'} onChange={(e) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                    <option value="radial">径向（中心→外）</option>
                    <option value="linearX">X轴线性</option>
                    <option value="linearY">Y轴线性</option>
                    <option value="spiral">螺旋</option>
                  </select>
                  {currentCircle.gradientColor?.direction === 'spiral' && (
                    <RangeControl label="螺旋圈数" value={currentCircle.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, spiralDensity: v } })} />
                  )}
                </div>
              )}
              
              {/* 混色渐变 */}
              {colorMode === 'procedural' && (
                <div className="space-y-2">
                  <div className="flex gap-2 items-center justify-center">
                    <input type="color" value={currentCircle.gradientColor?.colors?.[0] || '#ff6b6b'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[0] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="颜色1" />
                    <span className="text-gray-400">↔</span>
                    <input type="color" value={currentCircle.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentCircle.gradientColor?.colors || [])]; colors[1] = e.target.value; updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="颜色2" />
                  </div>
                  <div className="flex gap-2 items-center">
                    <span className="text-xs text-gray-400">混色轴向</span>
                    <select value={currentCircle.gradientColor?.proceduralAxis || 'y'} onChange={(e) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, proceduralAxis: e.target.value as any } })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white">
                      <option value="x">X轴</option>
                      <option value="y">Y轴</option>
                      <option value="z">Z轴</option>
                    </select>
                  </div>
                  <RangeControl label="混色强度" value={currentCircle.gradientColor?.proceduralIntensity ?? 1} min={0.1} max={3} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { gradientColor: { ...currentCircle.gradientColor, proceduralIntensity: v } })} />
                </div>
              )}
              </>
            )}
          </div>
          
          {/* 脉冲发光 - 开关和滑块始终可见 */}
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={currentCircle.pulseEnabled} onChange={(e) => updateCircle(currentCircle.id, { pulseEnabled: e.target.checked })} className="w-4 h-4 rounded bg-gray-600" />
              <span className="text-xs text-gray-400">脉冲发光</span>
            </div>
            <RangeControl label="脉冲速度" value={currentCircle.pulseSpeed} min={0} max={5} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { pulseSpeed: v })} />
            <RangeControl label="脉冲强度" value={currentCircle.pulseIntensity} min={0} max={1} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { pulseIntensity: v })} />
          </div>
          
          {/* 缩放呼吸 - 开关和滑块始终可见 */}
          <div className="p-2 bg-gray-800/50 rounded">
            <div className="flex items-center gap-2 mb-2">
              <input type="checkbox" checked={currentCircle.breathEnabled} onChange={(e) => updateCircle(currentCircle.id, { breathEnabled: e.target.checked })} className="w-4 h-4 rounded bg-gray-600" />
              <span className="text-xs text-gray-400">缩放呼吸</span>
            </div>
            <RangeControl label="呼吸速度" value={currentCircle.breathSpeed} min={0} max={3} step={0.1} onChange={(v) => updateCircle(currentCircle.id, { breathSpeed: v })} />
            <RangeControl label="呼吸幅度" value={currentCircle.breathIntensity} min={0} max={0.5} step={0.05} onChange={(v) => updateCircle(currentCircle.id, { breathIntensity: v })} />
          </div>
        </div>
        )}
      </div>
    </ControlGroup>
  );
};

// 色相范围选择器 - 可在色条上直接拖动选择
const HueRangeSlider: React.FC<{
  hueStart: number;
  hueEnd: number;
  onChange: (start: number, end: number) => void;
}> = ({ hueStart, hueEnd, onChange }) => {
  const barRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<'start' | 'end' | 'range' | null>(null);
  const dragStartRef = useRef({ x: 0, startVal: 0, endVal: 0 });

  const getHueFromX = (clientX: number): number => {
    if (!barRef.current) return 0;
    const rect = barRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    return Math.round((x / rect.width) * 360);
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'start' | 'end' | 'range') => {
    e.preventDefault();
    setDragging(type);
    dragStartRef.current = { x: e.clientX, startVal: hueStart, endVal: hueEnd };
  };

  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!barRef.current) return;
      const rect = barRef.current.getBoundingClientRect();
      
      if (dragging === 'start') {
        const newStart = getHueFromX(e.clientX);
        onChange(Math.min(newStart, hueEnd - 10), hueEnd);
      } else if (dragging === 'end') {
        const newEnd = getHueFromX(e.clientX);
        onChange(hueStart, Math.max(newEnd, hueStart + 10));
      } else if (dragging === 'range') {
        const delta = e.clientX - dragStartRef.current.x;
        const deltaHue = Math.round((delta / rect.width) * 360);
        const rangeSize = dragStartRef.current.endVal - dragStartRef.current.startVal;
        let newStart = dragStartRef.current.startVal + deltaHue;
        let newEnd = dragStartRef.current.endVal + deltaHue;
        
        if (newStart < 0) { newStart = 0; newEnd = rangeSize; }
        if (newEnd > 360) { newEnd = 360; newStart = 360 - rangeSize; }
        
        onChange(newStart, newEnd);
      }
    };

    const handleMouseUp = () => setDragging(null);

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, hueStart, hueEnd, onChange]);

  const startPercent = (hueStart / 360) * 100;
  const widthPercent = ((hueEnd - hueStart) / 360) * 100;

  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>{hueStart}°</span>
        <span>{hueEnd}°</span>
      </div>
      <div 
        ref={barRef}
        className="relative h-6 rounded cursor-crosshair select-none"
        style={{ 
          background: `linear-gradient(to right, 
            hsl(0, 100%, 50%), hsl(60, 100%, 50%), hsl(120, 100%, 50%), 
            hsl(180, 100%, 50%), hsl(240, 100%, 50%), hsl(300, 100%, 50%), hsl(360, 100%, 50%))` 
        }}
      >
        {/* 选中区域 */}
        <div 
          className="absolute top-0 h-full bg-black/50 border-2 border-white shadow-lg cursor-move"
          style={{ 
            left: `${startPercent}%`, 
            width: `${widthPercent}%`,
            boxShadow: '0 0 0 2px rgba(255,255,255,0.8), inset 0 0 10px rgba(0,0,0,0.5)'
          }}
          onMouseDown={(e) => handleMouseDown(e, 'range')}
        >
          {/* 左侧拖动手柄 */}
          <div 
            className="absolute -left-1 top-0 w-3 h-full bg-white rounded-l cursor-ew-resize hover:bg-blue-400 shadow-md"
            style={{ boxShadow: '-2px 0 4px rgba(0,0,0,0.3)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'start'); }}
          />
          {/* 右侧拖动手柄 */}
          <div 
            className="absolute -right-1 top-0 w-3 h-full bg-white rounded-r cursor-ew-resize hover:bg-blue-400 shadow-md"
            style={{ boxShadow: '2px 0 4px rgba(0,0,0,0.3)' }}
            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'end'); }}
          />
        </div>
      </div>
    </div>
  );
};

// 倾斜预设选择器组件（新版：轴 + 角度）
const TiltPresetSelector: React.FC<{
  tilt: TiltSettings;
  onChange: (tilt: TiltSettings) => void;
}> = ({ tilt, onChange }) => {
  const angleOptions = [0, 30, 45, 60];
  
  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400 mb-1">倾斜角度</label>
      {/* 轴选择 */}
      <div className="flex gap-1 mb-1">
        {(['x', 'y', 'z'] as const).map(axis => (
          <button
            key={axis}
            onClick={() => onChange({ ...tilt, axis })}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              tilt.axis === axis ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {axis.toUpperCase()}轴
          </button>
        ))}
      </div>
      {/* 角度选择 */}
      <div className="flex gap-1">
        {angleOptions.map(angle => (
          <button
            key={angle}
            onClick={() => onChange({ ...tilt, angle, isCustom: false })}
            className={`flex-1 px-1 py-1 text-xs rounded ${
              !tilt.isCustom && tilt.angle === angle ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {angle}°
          </button>
        ))}
        <button
          onClick={() => onChange({ ...tilt, isCustom: true })}
          className={`flex-1 px-1 py-1 text-xs rounded ${
            tilt.isCustom ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          自定义
        </button>
      </div>
      {/* 自定义角度输入 */}
      {tilt.isCustom && (
        <input 
          type="number" 
          value={tilt.angle} 
          onChange={(e) => onChange({ ...tilt, angle: Number(e.target.value) })}
          className="w-full px-2 py-1 bg-gray-700 rounded text-white text-xs mt-1"
          min={-90} max={90}
          placeholder="自定义角度"
        />
      )}
    </div>
  );
};

// 公转轴选择器组件（新版：轴 + 角度）
const OrbitAxisSelector: React.FC<{
  orbitAxis: OrbitAxisSettings;
  onChange: (orbitAxis: OrbitAxisSettings) => void;
}> = ({ orbitAxis, onChange }) => {
  const angleOptions = [0, 30, 45, 60];
  
  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400 mb-1">公转轴</label>
      {/* 轴选择 */}
      <div className="flex gap-1 mb-1">
        {(['x', 'y', 'z'] as const).map(axis => (
          <button
            key={axis}
            onClick={() => onChange({ ...orbitAxis, axis })}
            className={`flex-1 px-2 py-1 text-xs rounded ${
              orbitAxis.axis === axis ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {axis.toUpperCase()}轴
          </button>
        ))}
      </div>
      {/* 角度选择 */}
      <div className="flex gap-1">
        {angleOptions.map(angle => (
          <button
            key={angle}
            onClick={() => onChange({ ...orbitAxis, angle, isCustom: false })}
            className={`flex-1 px-1 py-1 text-xs rounded ${
              !orbitAxis.isCustom && orbitAxis.angle === angle ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {angle}°
          </button>
        ))}
        <button
          onClick={() => onChange({ ...orbitAxis, isCustom: true })}
          className={`flex-1 px-1 py-1 text-xs rounded ${
            orbitAxis.isCustom ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          自定义
        </button>
      </div>
      {/* 自定义角度输入 */}
      {orbitAxis.isCustom && (
        <input 
          type="number" 
          value={orbitAxis.angle} 
          onChange={(e) => onChange({ ...orbitAxis, angle: Number(e.target.value) })}
          className="w-full px-2 py-1 bg-gray-700 rounded text-white text-xs mt-1"
          min={-90} max={90}
          placeholder="自定义角度"
        />
      )}
    </div>
  );
};

// 自转轴预设选择器组件
const RotationAxisPresetSelector: React.FC<{
  axis: RotationAxisSettings;
  onChange: (axis: RotationAxisSettings) => void;
}> = ({ axis, onChange }) => {
  const presetLabels: Record<RotationAxisPreset, string> = {
    y: 'Y轴',
    x: 'X轴',
    z: 'Z轴',
    tiltY45: 'Y斜45°',
    tiltX45: 'X斜45°',
    custom: '自定义'
  };
  
  return (
    <div className="space-y-2">
      <label className="block text-xs text-gray-400 mb-1">自转轴</label>
      <div className="grid grid-cols-3 gap-1">
        {(['y', 'x', 'z', 'tiltY45', 'tiltX45'] as RotationAxisPreset[]).map(preset => (
          <button
            key={preset}
            onClick={() => onChange({ ...axis, preset })}
            className={`px-2 py-1.5 text-xs rounded transition-colors ${
              axis.preset === preset 
                ? 'bg-blue-600 text-white' 
                : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
            }`}
          >
            {presetLabels[preset]}
          </button>
        ))}
        <button
          onClick={() => onChange({ ...axis, preset: 'custom' })}
          className={`px-2 py-1.5 text-xs rounded transition-colors ${
            axis.preset === 'custom' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
          }`}
        >
          自定义
        </button>
      </div>
      {axis.preset === 'custom' && (
        <div className="grid grid-cols-3 gap-2 mt-2">
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">X</label>
            <input 
              type="number" 
              value={axis.customX} 
              onChange={(e) => onChange({ ...axis, customX: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-gray-700 rounded text-white text-xs"
              step={0.1} min={-1} max={1}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Y</label>
            <input 
              type="number" 
              value={axis.customY} 
              onChange={(e) => onChange({ ...axis, customY: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-gray-700 rounded text-white text-xs"
              step={0.1} min={-1} max={1}
            />
          </div>
          <div>
            <label className="block text-[10px] text-gray-500 mb-1">Z</label>
            <input 
              type="number" 
              value={axis.customZ} 
              onChange={(e) => onChange({ ...axis, customZ: Number(e.target.value) })}
              className="w-full px-2 py-1.5 bg-gray-700 rounded text-white text-xs"
              step={0.1} min={-1} max={1}
            />
          </div>
        </div>
      )}
    </div>
  );
};

// 可复用的浮窗列表选择器组件
interface FloatingListItem {
  id: string;
  name: string;
  enabled: boolean;
  color?: string;
}

interface FloatingListSelectorProps<T extends FloatingListItem> {
  items: T[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onToggleEnabled: (id: string, enabled: boolean) => void;
  onRename: (id: string, name: string) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
  onColorChange?: (id: string, color: string) => void;
  globalEnabled?: boolean;
  onGlobalToggle?: (enabled: boolean) => void;
  // Solo 功能：仅显示某一项，不改变 enabled 状态
  soloId?: string | null;
  onSoloToggle?: (id: string | null) => void;
  title: string;
  titleColor: string;
  addButtonColor: string;
  emptyText?: string;
}

function FloatingListSelector<T extends FloatingListItem>({
  items,
  selectedId,
  onSelect,
  onToggleEnabled,
  onRename,
  onDelete,
  onAdd,
  onColorChange,
  globalEnabled = true,
  onGlobalToggle,
  soloId,
  onSoloToggle,
  title,
  titleColor,
  addButtonColor,
  emptyText = '暂无项目'
}: FloatingListSelectorProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  
  // 点击外部关闭浮窗
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setEditingId(null);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);
  
  const selectedItem = items.find(item => item.id === selectedId);
  
  const handleDoubleClick = (item: T) => {
    setEditingId(item.id);
    setEditingName(item.name);
  };
  
  const handleRenameSubmit = () => {
    if (editingId && editingName.trim()) {
      onRename(editingId, editingName.trim());
    }
    setEditingId(null);
  };
  
  const handleItemClick = (item: T) => {
    if (editingId === item.id) return; // 正在编辑时不切换
    onSelect(item.id);
    setIsOpen(false);
  };
  
  return (
    <div ref={containerRef} className="relative">
      {/* 标题行：标题 + 启用按钮 + 添加按钮 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium ${titleColor}`}>{title}</span>
          {onGlobalToggle && (
            <button
              onClick={() => onGlobalToggle(!globalEnabled)}
              className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                globalEnabled ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {globalEnabled ? '已启用' : '已禁用'}
            </button>
          )}
        </div>
        <button 
          onClick={onAdd} 
          className={`px-2 py-0.5 text-xs ${addButtonColor} rounded`}
        >
          + 添加
        </button>
      </div>
      
      {/* 选择器行：显示当前选中项 */}
      <div 
        className={`flex items-center justify-between p-2 bg-gray-800 rounded cursor-pointer hover:bg-gray-700 transition-colors border ${isOpen ? 'border-blue-500' : 'border-gray-700'} ${!globalEnabled ? 'opacity-50' : ''}`}
        onClick={() => globalEnabled && setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <span className={`text-[10px] text-gray-400 transform transition-transform ${isOpen ? 'rotate-180' : ''}`}>▼</span>
          <span className="text-xs text-white truncate">
            {selectedItem ? selectedItem.name : (items.length > 0 ? '请选择...' : emptyText)}
          </span>
        </div>
        {selectedItem && (
          <div className="flex items-center gap-1 flex-shrink-0">
            {onColorChange && selectedItem.color && (
              <input 
                type="color" 
                value={selectedItem.color} 
                onClick={(e) => e.stopPropagation()}
                onChange={(e) => onColorChange(selectedItem.id, e.target.value)} 
                className="w-5 h-5 rounded border-none p-0 cursor-pointer" 
              />
            )}
            {/* Solo 按钮：仅显示当前项 */}
            {onSoloToggle && (
              <button
                onClick={(e) => { 
                  e.stopPropagation(); 
                  onSoloToggle(soloId === selectedItem.id ? null : selectedItem.id); 
                }}
                className={`px-1.5 py-0.5 text-[10px] rounded transition-colors ${
                  soloId === selectedItem.id 
                    ? 'bg-yellow-500 text-black font-bold' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
                title={soloId === selectedItem.id ? '取消仅显示' : '仅显示此项'}
              >
                S
              </button>
            )}
          </div>
        )}
      </div>
      
      {/* 浮窗列表 */}
      {isOpen && globalEnabled && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-gray-900 border border-gray-600 rounded-lg shadow-xl max-h-48 overflow-y-auto">
          {items.length === 0 ? (
            <div className="p-3 text-xs text-gray-500 text-center">{emptyText}</div>
          ) : (
            items.map(item => (
              <div 
                key={item.id}
                className={`flex items-center justify-between p-2 hover:bg-gray-700 cursor-pointer transition-colors ${item.id === selectedId ? 'bg-gray-700' : ''}`}
                onClick={() => handleItemClick(item)}
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <input 
                    type="checkbox" 
                    checked={item.enabled} 
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onToggleEnabled(item.id, e.target.checked)} 
                    className="w-4 h-4 rounded bg-gray-600 flex-shrink-0" 
                  />
                  {editingId === item.id ? (
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onBlur={handleRenameSubmit}
                      onKeyDown={(e) => { if (e.key === 'Enter') handleRenameSubmit(); if (e.key === 'Escape') setEditingId(null); }}
                      onClick={(e) => e.stopPropagation()}
                      className="flex-1 px-1 py-0.5 text-xs bg-gray-800 border border-blue-500 rounded text-white outline-none min-w-0"
                      autoFocus
                    />
                  ) : (
                    <span 
                      className="text-xs text-white truncate"
                      onDoubleClick={(e) => { e.stopPropagation(); handleDoubleClick(item); }}
                    >
                      {item.name}
                    </span>
                  )}
                  {item.id === selectedId && <span className="text-[10px] text-blue-400">✓</span>}
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  {onColorChange && item.color && (
                    <input 
                      type="color" 
                      value={item.color} 
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => { e.stopPropagation(); onColorChange(item.id, e.target.value); }} 
                      className="w-5 h-5 rounded border-none p-0 cursor-pointer" 
                    />
                  )}
                  <button 
                    onClick={(e) => { e.stopPropagation(); onDelete(item.id); }} 
                    className="text-red-400 hover:text-red-300 p-1 rounded hover:bg-gray-600"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const ControlPanel: React.FC<ControlPanelProps> = ({ 
  settings, 
  setSettings, 
  planetSettings,
  setPlanetSettings,
  appMode,
  onImageUpload, 
  onSampleSelect,
  fps,
  particleCount,
  colorPickMode,
  setColorPickMode,
  pickedColor,
  onExtractColors,
  gestureEnabled,
  setGestureEnabled
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('particle');
  const [planetTab, setPlanetTab] = useState<PlanetTabType>('basic');
  const [planetSubTab, setPlanetSubTab] = useState<'core' | 'flame' | 'rings' | 'afterimage' | 'radiation' | 'fireflies' | 'magicCircle' | 'energyBody'>('core');
  const [afterimageSubTab, setAfterimageSubTab] = useState<'texture' | 'particles'>('texture');
  
  // 主题切换与自定义颜色
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [showSettings, setShowSettings] = useState(false);
  
  // 预设配色方案
  const DEFAULT_SCHEMES = {
    dopamine: {
      name: '多巴胺 (默认)',
      primary: '#00E5FF',    // 电光青
      secondary: '#FFD93D',  // 柠檬黄
      textAccent: '#FF6EC7', // 霓虹粉
      decoration: '#9B59B6', // 紫罗兰
      isSystem: true
    },
    morandi: {
      name: '莫兰迪',
      primary: '#9FB4A9',    // 鼠尾草绿
      secondary: '#D4C4A0',  // 暖沙色
      textAccent: '#9BAABC', // 烟蓝
      decoration: '#B3C5BA', // 浅灰绿
      isSystem: true
    },
    cyber: {
      name: '赛博朋克',
      primary: '#00F0FF',    // 赛博青
      secondary: '#FEE440',  // 电光黄
      textAccent: '#FF003C', // 故障红
      decoration: '#7000FF', // 霓虹紫
      isSystem: true
    },
    ocean: {
      name: '深海幽蓝',
      primary: '#00A8CC',    // 浅海蓝
      secondary: '#142850',  // 深海蓝
      textAccent: '#27496D', // 钢蓝
      decoration: '#00909E', // 蓝绿
      isSystem: true
    },
    forest: {
      name: '森林极光',
      primary: '#43A047',    // 森林绿
      secondary: '#FFB300',  // 琥珀金
      textAccent: '#00ACC1', // 湖水蓝
      decoration: '#7CB342', // 嫩芽绿
      isSystem: true
    }
  };

  // 方案类型定义
  type ColorScheme = {
    name: string;
    primary: string;
    secondary: string;
    textAccent: string;
    decoration: string;
    isSystem?: boolean;
  };

  // 状态：所有方案（预设+用户自定义）
  const [colorSchemes, setColorSchemes] = useState<Record<string, ColorScheme>>(DEFAULT_SCHEMES);
  
  // 状态：当前选中方案的 ID
  const [activeSchemeId, setActiveSchemeId] = useState<string>('dopamine');
  
  // 状态：当前生效的颜色（可能与选中方案不同，因为用户可能在微调）
  const [customColors, setCustomColors] = useState({
    darkBg: '#000000',
    lightBg: '#F4F1EC',
    primary: DEFAULT_SCHEMES.dopamine.primary,
    secondary: DEFAULT_SCHEMES.dopamine.secondary,
    textAccent: DEFAULT_SCHEMES.dopamine.textAccent,
    decoration: DEFAULT_SCHEMES.dopamine.decoration
  });

  // 加载用户自定义方案和上次选中的方案
  useEffect(() => {
    try {
      // 加载用户方案
      const saved = localStorage.getItem('user_color_schemes');
      if (saved) {
        const parsed = JSON.parse(saved);
        setColorSchemes(prev => ({ ...prev, ...parsed }));
      }
      
      // 加载上次选中的方案ID和颜色
      const lastSchemeId = localStorage.getItem('active_scheme_id');
      const lastColors = localStorage.getItem('active_colors');
      
      if (lastSchemeId) {
        setActiveSchemeId(lastSchemeId);
      }
      if (lastColors) {
        const colors = JSON.parse(lastColors);
        setCustomColors(prev => ({ ...prev, ...colors }));
      }
    } catch (e) {
      console.error('Failed to load color schemes', e);
    }
  }, []);

  // 切换配色方案
  const applyScheme = (schemeId: string) => {
    setActiveSchemeId(schemeId);
    const scheme = colorSchemes[schemeId];
    if (scheme) {
      setCustomColors(prev => ({
        ...prev,
        primary: scheme.primary,
        secondary: scheme.secondary,
        textAccent: scheme.textAccent,
        decoration: scheme.decoration
      }));
    }
  };
  
  // 保存/另存为方案
  const saveScheme = (asNew: boolean = false) => {
    const currentScheme = colorSchemes[activeSchemeId];
    
    if (asNew || (currentScheme && currentScheme.isSystem)) {
      // 另存为新方案（如果是系统预设，强制另存为）
      const name = prompt('请输入新配色方案名称:', '我的配色');
      if (name) {
        const newId = `user_${Date.now()}`;
        const newScheme: ColorScheme = {
          name,
          primary: customColors.primary,
          secondary: customColors.secondary,
          textAccent: customColors.textAccent,
          decoration: customColors.decoration,
          isSystem: false
        };
        
        const updatedSchemes = { ...colorSchemes, [newId]: newScheme };
        setColorSchemes(updatedSchemes);
        setActiveSchemeId(newId);
        
        // 持久化用户方案
        const userSchemes = Object.fromEntries(
          Object.entries(updatedSchemes).filter(([_, s]) => !s.isSystem)
        );
        localStorage.setItem('user_color_schemes', JSON.stringify(userSchemes));
      }
    } else {
      // 更新当前用户方案
      if (confirm(`确定更新方案「${currentScheme.name}」吗？`)) {
        const updatedScheme = {
          ...currentScheme,
          primary: customColors.primary,
          secondary: customColors.secondary,
          textAccent: customColors.textAccent,
          decoration: customColors.decoration
        };
        
        const updatedSchemes = { ...colorSchemes, [activeSchemeId]: updatedScheme };
        setColorSchemes(updatedSchemes);
        
        const userSchemes = Object.fromEntries(
          Object.entries(updatedSchemes).filter(([_, s]) => !s.isSystem)
        );
        localStorage.setItem('user_color_schemes', JSON.stringify(userSchemes));
      }
    }
  };

  // 删除方案
  const deleteScheme = (schemeId: string) => {
    const scheme = colorSchemes[schemeId];
    if (scheme.isSystem) return; // 无法删除系统预设
    
    if (confirm(`确定删除方案「${scheme.name}」吗？`)) {
      const { [schemeId]: deleted, ...rest } = colorSchemes;
      setColorSchemes(rest);
      
      // 如果删除的是当前选中的，回退到默认
      if (activeSchemeId === schemeId) {
        applyScheme('dopamine');
      }
      
      const userSchemes = Object.fromEntries(
        Object.entries(rest).filter(([_, s]) => !s.isSystem)
      );
      localStorage.setItem('user_color_schemes', JSON.stringify(userSchemes));
    }
  };
  
  // 应用主题和自定义颜色
  useEffect(() => {
    document.documentElement.classList.remove('theme-dark', 'theme-light');
    document.documentElement.classList.add(`theme-${theme}`);
    
    // 应用自定义颜色到 CSS 变量
    const root = document.documentElement;
    root.style.setProperty('--custom-dark-bg', customColors.darkBg);
    root.style.setProperty('--custom-light-bg', customColors.lightBg);
    
    // 应用新版 4 色变量
    root.style.setProperty('--custom-primary', customColors.primary);
    root.style.setProperty('--custom-secondary', customColors.secondary);
    root.style.setProperty('--custom-text-accent', customColors.textAccent);
    root.style.setProperty('--custom-decoration', customColors.decoration);
    
    // 持久化当前颜色设置
    localStorage.setItem('active_scheme_id', activeSchemeId);
    localStorage.setItem('active_colors', JSON.stringify(customColors));
    
  }, [theme, customColors, activeSchemeId]);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [editingPlanetId, setEditingPlanetId] = useState<string | null>(null);
  const [savedTemplates, setSavedTemplates] = useState<SavedPlanetTemplate[]>([]);
  const [orbitPanelCollapsed, setOrbitPanelCollapsed] = useState(true);
  
  // 各子系统的选中项ID
  const [selectedCoreId, setSelectedCoreId] = useState<string | null>(null);
  // Solo 功能：仅显示某个核心（不改变 enabled 状态）
  const [soloCoreId, setSoloCoreId] = useState<string | null>(null);
  const [selectedSolidCoreId, setSelectedSolidCoreId] = useState<string | null>(null);
  const [coreSubTab, setCoreSubTab] = useState<'particle' | 'solid'>('particle');
  const [selectedParticleRingId, setSelectedParticleRingId] = useState<string | null>(null);
  const [selectedContinuousRingId, setSelectedContinuousRingId] = useState<string | null>(null);
  const [ringSubTab, setRingSubTab] = useState<'particle' | 'continuous' | 'spiral'>('particle');
  const [flameSubTab, setFlameSubTab] = useState<'surface' | 'jet' | 'spiral'>('surface');
  const [selectedEnergyBodyId, setSelectedEnergyBodyId] = useState<string | null>(null);
  const [energyBodySubTab, setEnergyBodySubTab] = useState<'geometry' | 'appearance' | 'animation' | 'effects' | 'advanced'>('geometry');
  const [energyBodySystemSubTab, setEnergyBodySystemSubTab] = useState<'core' | 'shield'>('core');
  const [radiationSubTab, setRadiationSubTab] = useState<'orbiting' | 'emitter'>('orbiting');
  const [fireflySubTab, setFireflySubTab] = useState<'orbiting' | 'wandering'>('orbiting');
  const [selectedOrbitingId, setSelectedOrbitingId] = useState<string | null>(null);
  const [selectedEmitterId, setSelectedEmitterId] = useState<string | null>(null);
  const [selectedOrbitingFireflyId, setSelectedOrbitingFireflyId] = useState<string | null>(null);
  const [selectedWanderingGroupId, setSelectedWanderingGroupId] = useState<string | null>(null);
  
  // 实体核心预设编辑状态
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingPresetName, setEditingPresetName] = useState('');
  
  // 加载保存的星球模板
  useEffect(() => {
    try {
      const saved = localStorage.getItem(PLANET_TEMPLATES_STORAGE_KEY);
      if (saved) {
        setSavedTemplates(JSON.parse(saved));
      }
    } catch (e) {
      console.warn('Failed to load planet templates:', e);
    }
  }, []);
  
  // 同步 soloCoreId 到 planetSettings
  useEffect(() => {
    setPlanetSettings(prev => ({ ...prev, soloCoreId }));
  }, [soloCoreId, setPlanetSettings]);
  
  // 保存模板到 localStorage
  const saveTemplates = (templates: SavedPlanetTemplate[]) => {
    setSavedTemplates(templates);
    try {
      localStorage.setItem(PLANET_TEMPLATES_STORAGE_KEY, JSON.stringify(templates));
    } catch (e) {
      console.warn('Failed to save planet templates:', e);
    }
  };
  
  const handleChange = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };
  
  // 当选中颜色时，自动添加到过滤列表
  useEffect(() => {
    if (pickedColor && settings.colorFilter.enabled) {
      const hue = Math.round(pickedColor.h * 360);
      const newFilter: ColorFilter = {
        id: Date.now().toString(),
        hueStart: Math.max(0, hue - 15),
        hueEnd: Math.min(360, hue + 15),
        enabled: true
      };
      handleChange('colorFilter', {
        ...settings.colorFilter,
        filters: [...settings.colorFilter.filters, newFilter]
      });
      setColorPickMode(false);
    }
  }, [pickedColor]);

  const tabs: { key: TabType; label: string; icon: string }[] = [
    { key: 'particle', label: '粒子效果', icon: 'fa-atom' },
    { key: 'line', label: '连线效果', icon: 'fa-project-diagram' },
    { key: 'interact', label: '交互', icon: 'fa-hand-pointer' }
  ];

  return (
    <div 
      className="w-80 h-full backdrop-blur-md border-l overflow-y-auto p-4 z-40 transition-all"
      style={{ 
        backgroundColor: 'var(--panel)', 
        borderColor: 'var(--border)',
        color: 'var(--text-1)'
      }}
    >
      {/* 主题切换 + 设置按钮 */}
      <div className="flex justify-end gap-2 mb-2 relative">
        <button
          onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{ 
            backgroundColor: 'var(--surface)', 
            color: 'var(--text-2)',
            border: '1px solid var(--border)'
          }}
        >
          {theme === 'dark' ? '🌙 深色' : '☀️ 浅色'}
        </button>
        <button
          onClick={() => setShowSettings(!showSettings)}
          className="px-2 py-1 text-xs rounded transition-colors"
          style={{ 
            backgroundColor: showSettings ? 'var(--accent)' : 'var(--surface)', 
            color: showSettings ? '#fff' : 'var(--text-2)',
            border: '1px solid var(--border)'
          }}
        >
          ⚙️
        </button>
        
        {/* 设置面板 */}
        {showSettings && (
          <div 
            className="absolute top-full right-0 mt-1 p-3 rounded-lg shadow-lg z-50 w-64"
            style={{ 
              backgroundColor: 'var(--panel)', 
              border: '1px solid var(--border)'
            }}
          >
            <h4 className="text-xs font-bold mb-3" style={{ color: 'var(--ui-text-accent)' }}>主题设置</h4>
            
            {/* 配色方案选择 */}
            <div className="mb-3">
              <label className="text-xs block mb-1" style={{ color: 'var(--text-2)' }}>配色方案</label>
              <div className="flex gap-1 mb-2">
                <select
                  value={activeSchemeId}
                  onChange={(e) => applyScheme(e.target.value)}
                  className="flex-1 h-8 rounded px-2 text-xs cursor-pointer"
                >
                  {Object.entries(colorSchemes).map(([key, scheme]) => (
                    <option key={key} value={key}>{scheme.name}</option>
                  ))}
                </select>
                {!colorSchemes[activeSchemeId]?.isSystem && (
                  <button
                    onClick={() => deleteScheme(activeSchemeId)}
                    className="px-2 rounded text-xs transition-colors hover:bg-red-500/20 text-red-400"
                    title="删除当前方案"
                    style={{ border: '1px solid var(--border)' }}
                  >
                    🗑️
                  </button>
                )}
              </div>
            </div>
            
            {/* 场景背景色 */}
            <div className="mb-3">
              <label className="text-xs block mb-2" style={{ color: 'var(--text-2)' }}>场景背景色</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>深色主题</label>
                  <div className="flex gap-1">
                    <input 
                      type="color" 
                      value={customColors.darkBg}
                      onChange={(e) => setCustomColors(prev => ({...prev, darkBg: e.target.value}))}
                      className="w-6 h-6 rounded cursor-pointer flex-shrink-0"
                    />
                    <input 
                      type="text"
                      value={customColors.darkBg}
                      onChange={(e) => setCustomColors(prev => ({...prev, darkBg: e.target.value}))}
                      className="flex-1 px-1 rounded text-[10px] w-0"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>浅色主题</label>
                  <div className="flex gap-1">
                    <input 
                      type="color" 
                      value={customColors.lightBg}
                      onChange={(e) => setCustomColors(prev => ({...prev, lightBg: e.target.value}))}
                      className="w-6 h-6 rounded cursor-pointer flex-shrink-0"
                    />
                    <input 
                      type="text"
                      value={customColors.lightBg}
                      onChange={(e) => setCustomColors(prev => ({...prev, lightBg: e.target.value}))}
                      className="flex-1 px-1 rounded text-[10px] w-0"
                      style={{ backgroundColor: 'var(--surface)', color: 'var(--text-1)', border: '1px solid var(--border)' }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* 4 类核心色自定义 */}
            <div className="space-y-2">
              <label className="text-xs block" style={{ color: 'var(--text-2)' }}>自定义颜色</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>主交互色</label>
                  <input 
                    type="color" 
                    value={customColors.primary}
                    onChange={(e) => setCustomColors(prev => ({...prev, primary: e.target.value}))}
                    className="w-full h-6 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>次交互色</label>
                  <input 
                    type="color" 
                    value={customColors.secondary}
                    onChange={(e) => setCustomColors(prev => ({...prev, secondary: e.target.value}))}
                    className="w-full h-6 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>标题强调</label>
                  <input 
                    type="color" 
                    value={customColors.textAccent}
                    onChange={(e) => setCustomColors(prev => ({...prev, textAccent: e.target.value}))}
                    className="w-full h-6 rounded cursor-pointer"
                  />
                </div>
                <div>
                  <label className="text-[10px] block mb-1 opacity-70" style={{ color: 'var(--text-2)' }}>装饰线条</label>
                  <input 
                    type="color" 
                    value={customColors.decoration}
                    onChange={(e) => setCustomColors(prev => ({...prev, decoration: e.target.value}))}
                    className="w-full h-6 rounded cursor-pointer"
                  />
                </div>
              </div>
              
              <div className="pt-2 mt-2 border-t flex gap-2" style={{ borderColor: 'var(--border)' }}>
                {colorSchemes[activeSchemeId]?.isSystem ? (
                  // 系统预设：只显示"另存为"按钮
                  <button
                    onClick={() => saveScheme(true)}
                    className="w-full py-1.5 text-xs rounded transition-opacity hover:opacity-80"
                    style={{ 
                      backgroundColor: 'var(--ui-primary)', 
                      color: '#fff',
                      border: '1px solid var(--border)'
                    }}
                  >
                    保存为新方案...
                  </button>
                ) : (
                  // 用户方案：显示"保存"和"另存为"
                  <>
                    <button
                      onClick={() => saveScheme(false)}
                      className="flex-1 py-1.5 text-xs rounded transition-opacity hover:opacity-80"
                      style={{ 
                        backgroundColor: 'var(--ui-secondary)', 
                        color: '#000',
                        border: '1px solid var(--border)'
                      }}
                    >
                      保存修改
                    </button>
                    <button
                      onClick={() => saveScheme(true)}
                      className="flex-1 py-1.5 text-xs rounded transition-opacity hover:opacity-80"
                      style={{ 
                        backgroundColor: 'var(--ui-primary)', 
                        color: '#fff',
                        border: '1px solid var(--border)'
                      }}
                    >
                      另存为...
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* 标题栏 - 只在星云模式显示 */}
      {appMode === 'nebula' && (
        <div className="mb-4">
          <h1 className="text-xl font-bold mb-1" style={{ color: 'var(--accent)' }}>
            星云 3D 可视化
          </h1>
          <div className="flex justify-between text-xs font-mono" style={{ color: 'var(--text-2)' }}>
             <span>FPS: {fps}</span>
             <span>粒子数: {(particleCount / 1000).toFixed(1)}k</span>
          </div>
        </div>
      )}

      {/* ==================== 星云模式控制面板 ==================== */}
      {appMode === 'nebula' && (
      <>
      {/* 图像源 - 星云模式显示 */}
      <ControlGroup title="图像源">
        <div className="border-2 border-dashed border-gray-700 rounded-lg p-4 text-center hover:border-blue-500 transition-colors cursor-pointer relative">
          <input 
            type="file" 
            accept="image/*" 
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => {
              if (e.target.files?.[0]) onImageUpload(e.target.files[0]);
            }}
          />
          <i className="fas fa-cloud-upload-alt text-2xl text-gray-400 mb-2"></i>
          <p className="text-xs text-gray-300">拖拽或点击上传图片</p>
        </div>
        <div className="grid grid-cols-3 gap-2 mt-2">
          {SAMPLE_IMAGES.map((img, i) => (
            <button 
              key={i}
              onClick={() => onSampleSelect(img.url)}
              className="h-12 rounded bg-gray-800 hover:ring-2 hover:ring-blue-500 bg-cover bg-center text-xs text-white/0 hover:text-white/100 transition-all flex items-center justify-center font-bold shadow-sm"
              style={{ backgroundImage: `url(${img.url})` }}
            >
              加载
            </button>
          ))}
        </div>
      </ControlGroup>

      {/* Tab 切换栏 */}
      <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-2 px-2 text-xs rounded-md transition-colors flex flex-col items-center gap-1 ${
              activeTab === tab.key 
                ? 'bg-blue-600 text-white' 
                : 'text-gray-400 hover:text-white hover:bg-gray-700'
            }`}
          >
            <i className={`fas ${tab.icon}`}></i>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* ===== 粒子效果 Tab ===== */}
      {activeTab === 'particle' && (
        <>
          <ControlGroup title="粒子生成">
        <RangeControl label="采样步长 (越小越密)" value={settings.density} min={1} max={30} step={1} onChange={(v) => handleChange('density', v)} />
        <RangeControl label="亮度阈值" value={settings.threshold} min={0} max={100} onChange={(v) => handleChange('threshold', v)} />
        <RangeControl label="基础大小" value={settings.baseSize} min={0} max={20} step={0.5} onChange={(v) => handleChange('baseSize', v)} />
        
        {/* 轮廓优先采样 */}
        <div className="mt-3 pt-3 border-t border-gray-700">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
            <input 
              type="checkbox" 
              checked={settings.edgeSamplingEnabled} 
              onChange={(e) => handleChange('edgeSamplingEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span>轮廓优先采样</span>
          </div>
          
          {settings.edgeSamplingEnabled && (
            <>
              <RangeControl 
                label="边缘灵敏度" 
                value={settings.edgeSensitivity} 
                min={0.05} max={0.8} step={0.05} 
                onChange={(v) => handleChange('edgeSensitivity', v)} 
              />
              <RangeControl 
                label="边缘密度提升" 
                value={settings.edgeDensityBoost} 
                min={1} max={5} step={0.5} 
                onChange={(v) => handleChange('edgeDensityBoost', v)} 
              />
              <RangeControl 
                label="内部填充密度" 
                value={settings.fillDensity} 
                min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('fillDensity', v)} 
              />
              <p className="text-xs text-gray-500 mt-1">提示：填充密度=0 为纯轮廓效果</p>
              
              <div className="flex items-center space-x-2 text-xs text-gray-300 mt-2">
                <input 
                  type="checkbox" 
                  checked={settings.pureOutlineMode} 
                  onChange={(e) => handleChange('pureOutlineMode', e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600"
                />
                <span>纯轮廓模式（完全跳过内部填充）</span>
              </div>
            </>
          )}
          
          <div className="mt-2 pt-2 border-t border-gray-700">
            <RangeControl 
              label="边缘裁剪 (%)" 
              value={settings.edgeCropPercent} 
              min={0} max={20} step={1} 
              onChange={(v) => handleChange('edgeCropPercent', v)} 
            />
            <div className="flex items-center space-x-2 text-xs text-gray-300 mt-1">
              <input 
                type="checkbox" 
                checked={settings.circularCrop} 
                onChange={(e) => handleChange('circularCrop', e.target.checked)}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span>圆形裁剪</span>
            </div>
          </div>
        </div>
      </ControlGroup>

      <ControlGroup title="3D 深度映射">
        <div className="mb-3">
          <label className="block text-xs text-gray-400 mb-1">映射模式</label>
          <select 
            value={settings.depthMode}
            onChange={(e) => handleChange('depthMode', e.target.value as DepthMode)}
            className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
          >
            {Object.values(DepthMode).map(mode => (
              <option key={mode} value={mode}>{DepthModeLabels[mode]}</option>
            ))}
          </select>
        </div>
        <RangeControl label="深度范围" value={settings.depthRange} min={0} max={800} onChange={(v) => handleChange('depthRange', v)} />
        
        {/* 波浪模式参数 */}
        {settings.depthMode === DepthMode.Wave && (
          <>
            <RangeControl label="波浪频率" value={settings.waveFrequency} min={0.005} max={0.1} step={0.005} onChange={(v) => handleChange('waveFrequency', v)} />
            <RangeControl label="波浪振幅" value={settings.waveAmplitude} min={0.1} max={2.0} step={0.1} onChange={(v) => handleChange('waveAmplitude', v)} />
          </>
        )}
        
        {/* 分形噪声参数 */}
        {settings.depthMode === DepthMode.FBM && (
          <>
            <RangeControl label="噪声层数" value={settings.fbmOctaves} min={1} max={8} step={1} onChange={(v) => handleChange('fbmOctaves', v)} />
            <RangeControl label="噪声强度" value={settings.noiseStrength} min={0} max={100} onChange={(v) => handleChange('noiseStrength', v)} />
          </>
        )}
        
        {/* 柏林噪声参数 */}
        {settings.depthMode === DepthMode.Perlin && (
          <RangeControl label="噪声强度" value={settings.noiseStrength} min={0} max={100} onChange={(v) => handleChange('noiseStrength', v)} />
        )}
        
        {/* 双眼视差参数 */}
        {settings.depthMode === DepthMode.Stereo && (
          <RangeControl label="视差分离度" value={settings.stereoSeparation} min={0} max={100} onChange={(v) => handleChange('stereoSeparation', v)} />
        )}
        
        <div className="flex items-center space-x-2 text-xs text-gray-300">
          <input 
            type="checkbox" 
            checked={settings.depthInvert} 
            onChange={(e) => handleChange('depthInvert', e.target.checked)}
            className="rounded bg-gray-700 border-gray-600"
          />
          <span>反转深度</span>
        </div>
      </ControlGroup>
      
      {/* 颜色过滤 */}
      <ControlGroup title="颜色过滤">
        <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
          <input 
            type="checkbox" 
            checked={settings.colorFilter.enabled} 
            onChange={(e) => handleChange('colorFilter', { ...settings.colorFilter, enabled: e.target.checked })}
            className="rounded bg-gray-700 border-gray-600"
          />
          <span>启用颜色过滤</span>
        </div>
        
        {settings.colorFilter.enabled && (
          <>
            <div className="mb-2">
              <label className="block text-xs text-gray-400 mb-1">预设</label>
              <select 
                onChange={(e) => {
                  const preset = e.target.value as ColorFilterPreset;
                  const presetConfig = COLOR_FILTER_PRESETS[preset];
                  handleChange('colorFilter', { ...DEFAULT_COLOR_FILTER, ...presetConfig });
                }}
                className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
              >
                {Object.keys(COLOR_FILTER_PRESETS).map(preset => (
                  <option key={preset} value={preset}>{COLOR_FILTER_PRESET_LABELS[preset as ColorFilterPreset]}</option>
                ))}
              </select>
            </div>
            
            <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
              <input 
                type="checkbox" 
                checked={settings.colorFilter.invertMode} 
                onChange={(e) => handleChange('colorFilter', { ...settings.colorFilter, invertMode: e.target.checked })}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span>反向模式 (只保留选中颜色)</span>
            </div>
            
            <RangeControl 
              label="最小饱和度" 
              value={settings.colorFilter.saturationMin} 
              min={0} max={1} step={0.05} 
              onChange={(v) => handleChange('colorFilter', { ...settings.colorFilter, saturationMin: v })} 
            />
            
            {/* 图片取色按钮 */}
            <div className="mt-2">
              <button
                onClick={() => setColorPickMode(!colorPickMode)}
                className={`w-full px-3 py-2 text-xs rounded border transition-colors flex items-center justify-center gap-2 ${
                  colorPickMode 
                    ? 'bg-yellow-600 border-yellow-400 text-white' 
                    : 'bg-gray-800 border-gray-700 text-gray-300 hover:border-gray-500'
                }`}
              >
                <i className="fas fa-eye-dropper"></i>
                {colorPickMode ? '点击图片选择颜色...' : '从图片取色'}
              </button>
              {colorPickMode && (
                <p className="text-xs text-yellow-400 mt-1">点击 3D 场景中的区域选择颜色</p>
              )}
            </div>
            
            {/* 自定义色段列表 */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">自定义色段</span>
                <button
                  onClick={() => {
                    const newFilter: ColorFilter = {
                      id: Date.now().toString(),
                      hueStart: 0,
                      hueEnd: 60,
                      enabled: true
                    };
                    handleChange('colorFilter', {
                      ...settings.colorFilter,
                      filters: [...settings.colorFilter.filters, newFilter]
                    });
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-700 rounded text-white"
                >
                  + 添加
                </button>
              </div>
              
              {settings.colorFilter.filters.map((filter, index) => (
                <div key={filter.id} className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        checked={filter.enabled} 
                        onChange={(e) => {
                          const newFilters = [...settings.colorFilter.filters];
                          newFilters[index] = { ...filter, enabled: e.target.checked };
                          handleChange('colorFilter', { ...settings.colorFilter, filters: newFilters });
                        }}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <span className="text-xs text-gray-300">色段 {index + 1}</span>
                    </div>
                    <button
                      onClick={() => {
                        const newFilters = settings.colorFilter.filters.filter((_, i) => i !== index);
                        handleChange('colorFilter', { ...settings.colorFilter, filters: newFilters });
                      }}
                      className="text-red-400 hover:text-red-300 text-xs"
                    >
                      删除
                    </button>
                  </div>
                  
                  {/* 可拖动色相范围选择器 */}
                  <HueRangeSlider
                    hueStart={filter.hueStart}
                    hueEnd={filter.hueEnd}
                    onChange={(start, end) => {
                      const newFilters = [...settings.colorFilter.filters];
                      newFilters[index] = { ...filter, hueStart: start, hueEnd: end };
                      handleChange('colorFilter', { ...settings.colorFilter, filters: newFilters });
                    }}
                  />
                </div>
              ))}
            </div>
          </>
        )}
      </ControlGroup>

      {/* 染色效果 */}
      <ControlGroup title="染色效果">
        <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
          <input 
            type="checkbox" 
            checked={settings.colorTint.enabled}
            onChange={(e) => handleChange('colorTint', { ...settings.colorTint, enabled: e.target.checked })}
            className="rounded bg-gray-700 border-gray-600"
          />
          <span className="font-medium">启用染色</span>
        </div>

        {settings.colorTint.enabled && (
          <>
            <div className="mb-4">
              <RangeControl 
                label="主色调数量" 
                value={settings.colorTint.colorCount} 
                min={2} max={8} step={1} 
                onChange={(v) => handleChange('colorTint', { ...settings.colorTint, colorCount: v })} 
              />
            </div>

            <button
              onClick={onExtractColors}
              className="w-full px-3 py-2 mb-4 text-xs font-medium rounded bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white transition-all"
            >
              🎨 提取主色调
            </button>

            {settings.colorTint.mappings.length > 0 && (
              <>
                <p className="text-xs text-gray-400 mb-2">主色调映射</p>
                {settings.colorTint.mappings.map((mapping, idx) => (
                  <div key={idx} className="mb-3 p-3 bg-gray-800/50 rounded-lg border border-gray-700">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-6 h-6 rounded border border-gray-600" 
                          style={{ backgroundColor: mapping.sourceColor }}
                          title={`原色: ${mapping.sourceColor}`}
                        />
                        <span className="text-xs text-gray-400">→</span>
                        <input
                          type="color"
                          value={mapping.targetColor}
                          onChange={(e) => {
                            const newMappings = [...settings.colorTint.mappings];
                            newMappings[idx] = { ...mapping, targetColor: e.target.value };
                            handleChange('colorTint', { ...settings.colorTint, mappings: newMappings });
                          }}
                          className="w-6 h-6 rounded border border-gray-600 cursor-pointer"
                          title="目标颜色"
                        />
                      </div>
                      <span className="text-xs text-gray-500">{mapping.percentage}%</span>
                    </div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className="text-gray-400 w-14">色差缩放:</span>
                      <input 
                        type="range"
                        value={mapping.hueSpread}
                        onChange={(e) => {
                          const newMappings = [...settings.colorTint.mappings];
                          newMappings[idx] = { ...mapping, hueSpread: Number(e.target.value) };
                          handleChange('colorTint', { ...settings.colorTint, mappings: newMappings });
                        }}
                        min={0}
                        max={2}
                        step={0.1}
                        className="flex-1 h-1.5"
                      />
                      <span className="text-gray-300 w-8 text-right">{mapping.hueSpread.toFixed(1)}</span>
                    </div>
                  </div>
                ))}

                <div className="mt-3 pt-3 border-t border-gray-700">
                  <RangeControl 
                    label="全局混合强度" 
                    value={settings.colorTint.globalStrength} 
                    min={0} max={1} step={0.1} 
                    onChange={(v) => handleChange('colorTint', { ...settings.colorTint, globalStrength: v })} 
                  />
                </div>
              </>
            )}

            {settings.colorTint.mappings.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">
                点击"提取主色调"按钮分析图像颜色
              </p>
            )}
          </>
        )}
      </ControlGroup>

      {/* 静态样式 */}
      <ControlGroup title="静态样式">
        {/* 粒子形状 */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">粒子形状</p>
          <div className="grid grid-cols-2 gap-2">
              {Object.values(ParticleShape).map(shape => (
                  <button
                      key={shape}
                      onClick={() => handleChange('particleShape', shape)}
                      className={`px-2 py-1.5 text-xs rounded border transition-colors ${settings.particleShape === shape ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                      {ParticleShapeLabels[shape]}
                  </button>
              ))}
          </div>
        </div>
        
        {/* 光晕模式 */}
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">光晕效果</p>
          <div className="grid grid-cols-2 gap-2">
              {Object.values(GlowMode).map(mode => (
                  <button
                      key={mode}
                      onClick={() => handleChange('glowMode', mode)}
                      className={`px-2 py-1.5 text-xs rounded border transition-colors ${settings.glowMode === mode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                      {GlowModeLabels[mode]}
                  </button>
              ))}
          </div>
          {settings.glowMode !== GlowMode.None && (
            <div className="mt-3">
              <RangeControl label="光晕强度" value={settings.glowIntensity} min={1} max={20} step={0.5} onChange={(v) => handleChange('glowIntensity', v)} />
            </div>
          )}
        </div>
        
        {/* 辉光和饱和度 */}
        <div className="space-y-3">
          <RangeControl label="Bloom 辉光" value={settings.bloomStrength} min={0} max={10} step={0.1} onChange={(v) => handleChange('bloomStrength', v)} />
          <RangeControl label="色彩饱和度" value={settings.colorSaturation} min={0} max={10} step={0.1} onChange={(v) => handleChange('colorSaturation', v)} />
        </div>
      </ControlGroup>
      
      {/* 动态效果 */}
      <ControlGroup title="动态效果">
        {/* 粒子微动 */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-300 mb-3 font-medium">粒子微动 (Turbulence)</div>
          <RangeControl 
            label="扰动强度" 
            value={settings.particleTurbulence} 
            min={0} max={1} step={0.05} 
            onChange={(v) => handleChange('particleTurbulence', v)} 
          />
          {settings.particleTurbulence > 0 && (
            <div className="mt-3 space-y-3">
              <RangeControl 
                label="扰动速度" 
                value={settings.turbulenceSpeed} 
                min={0.1} max={3} step={0.1} 
                onChange={(v) => handleChange('turbulenceSpeed', v)} 
              />
              <RangeControl 
                label="扰动尺度" 
                value={settings.turbulenceScale} 
                min={0.001} max={0.02} step={0.001} 
                onChange={(v) => handleChange('turbulenceScale', v)} 
              />
            </div>
          )}
        </div>
        
        {/* 呼吸效果 */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.breathingEnabled}
              onChange={(e) => handleChange('breathingEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">呼吸效果</span>
          </div>
          {settings.breathingEnabled && (
            <div className="space-y-3">
              <RangeControl label="呼吸速度" value={settings.breathingSpeed} min={0.1} max={2} step={0.1} onChange={(v) => handleChange('breathingSpeed', v)} />
              <RangeControl label="呼吸幅度" value={settings.breathingIntensity} min={0.05} max={0.5} step={0.05} onChange={(v) => handleChange('breathingIntensity', v)} />
            </div>
          )}
        </div>
        
        {/* 涟漪效果 */}
        <div className="mb-4 p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.rippleEnabled}
              onChange={(e) => handleChange('rippleEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">涟漪效果</span>
          </div>
          {settings.rippleEnabled && (
            <div className="space-y-3">
              <RangeControl label="涟漪速度" value={settings.rippleSpeed} min={0.1} max={2} step={0.1} onChange={(v) => handleChange('rippleSpeed', v)} />
              <RangeControl label="涟漪强度" value={settings.rippleIntensity} min={5} max={50} step={5} onChange={(v) => handleChange('rippleIntensity', v)} />
            </div>
          )}
        </div>
        
        {/* 吸积盘旋转 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.accretionEnabled}
              onChange={(e) => handleChange('accretionEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">吸积盘旋转</span>
          </div>
          {settings.accretionEnabled && (
            <>
              <div className="space-y-3 mb-4">
                <RangeControl label="基础速度" value={settings.accretionSpeed} min={0.1} max={2} step={0.1} onChange={(v) => handleChange('accretionSpeed', v)} />
                <RangeControl label="强度" value={settings.accretionIntensity} min={0.1} max={1} step={0.1} onChange={(v) => handleChange('accretionIntensity', v)} />
              </div>
              
              {/* 多层配置 */}
              <div className="border-t border-gray-700 pt-3">
                <p className="text-xs text-gray-400 mb-3">圈层配置 (最多3层)</p>
                {settings.accretionLayers.map((layer, idx) => (
                  <div key={layer.id} className="mb-3 p-2 bg-gray-900/50 rounded border border-gray-700">
                    <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                      <input 
                        type="checkbox" 
                        checked={layer.enabled}
                        onChange={(e) => {
                          const newLayers = [...settings.accretionLayers];
                          newLayers[idx] = { ...layer, enabled: e.target.checked };
                          handleChange('accretionLayers', newLayers);
                        }}
                        className="rounded bg-gray-700 border-gray-600"
                      />
                      <span className="font-medium">第{idx + 1}层</span>
                    </div>
                    {layer.enabled && (
                      <div className="space-y-2 pl-5">
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-400 w-14">外半径:</span>
                          <input 
                            type="number"
                            value={layer.radiusMax}
                            onChange={(e) => {
                              const newLayers = [...settings.accretionLayers];
                              newLayers[idx] = { ...layer, radiusMax: Number(e.target.value) };
                              handleChange('accretionLayers', newLayers);
                            }}
                            className="w-16 bg-gray-700 text-white text-xs px-2 py-1 rounded"
                            min={10}
                            max={500}
                          />
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-400 w-14">方向:</span>
                          <button
                            onClick={() => {
                              const newLayers = [...settings.accretionLayers];
                              newLayers[idx] = { ...layer, direction: layer.direction === 1 ? -1 : 1 };
                              handleChange('accretionLayers', newLayers);
                            }}
                            className={`px-3 py-1 rounded text-xs font-medium ${layer.direction === 1 ? 'bg-blue-600' : 'bg-purple-600'}`}
                          >
                            {layer.direction === 1 ? '顺时针' : '逆时针'}
                          </button>
                        </div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-gray-400 w-14">速度:</span>
                          <input 
                            type="range"
                            value={layer.speedMultiplier}
                            onChange={(e) => {
                              const newLayers = [...settings.accretionLayers];
                              newLayers[idx] = { ...layer, speedMultiplier: Number(e.target.value) };
                              handleChange('accretionLayers', newLayers);
                            }}
                            min={0.1}
                            max={3}
                            step={0.1}
                            className="flex-1 h-1.5"
                          />
                          <span className="text-gray-300 w-10 text-right">{layer.speedMultiplier}x</span>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
        
        {/* 拖尾残影 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.trailEnabled}
              onChange={(e) => handleChange('trailEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">🌠 拖尾残影</span>
          </div>
          {settings.trailEnabled && (
            <RangeControl label="拖尾长度" value={settings.trailLength} min={0} max={1} step={0.05} 
              onChange={(v) => handleChange('trailLength', v)} />
          )}
        </div>
        
        {/* 荧光闪烁 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.flickerEnabled}
              onChange={(e) => handleChange('flickerEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">✨ 荧光闪烁</span>
          </div>
          {settings.flickerEnabled && (
            <>
              <RangeControl label="闪烁强度" value={settings.flickerIntensity} min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('flickerIntensity', v)} />
              <RangeControl label="闪烁速度" value={settings.flickerSpeed} min={0.5} max={5} step={0.5} 
                onChange={(v) => handleChange('flickerSpeed', v)} />
            </>
          )}
        </div>
        
        {/* 真实海浪效果 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.waveEnabled}
              onChange={(e) => handleChange('waveEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">🌊 真实海浪</span>
          </div>
          {settings.waveEnabled && (
            <>
              <RangeControl label="海浪振幅" value={settings.waveIntensity} min={5} max={100} step={5} 
                onChange={(v) => handleChange('waveIntensity', v)} />
              <RangeControl label="海浪速度" value={settings.waveSpeed} min={0.1} max={3} step={0.1} 
                onChange={(v) => handleChange('waveSpeed', v)} />
              <RangeControl label="波浪陡度" value={settings.waveSteepness} min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('waveSteepness', v)} />
              <RangeControl label="波浪层数" value={settings.waveLayers} min={1} max={4} step={1} 
                onChange={(v) => handleChange('waveLayers', v)} />
              <RangeControl label="主波方向" value={settings.waveDirection} min={0} max={360} step={15} 
                onChange={(v) => handleChange('waveDirection', v)} />
              <RangeControl label="深度衰减" value={settings.waveDepthFade} min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('waveDepthFade', v)} />
              <div className="flex items-center space-x-2 text-xs text-gray-300 mt-2">
                <input 
                  type="checkbox" 
                  checked={settings.waveFoam}
                  onChange={(e) => handleChange('waveFoam', e.target.checked)}
                  className="rounded bg-gray-700 border-gray-600"
                />
                <span>波峰泡沫</span>
              </div>
            </>
          )}
        </div>
        
        {/* 几何映射 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="text-xs text-gray-300 mb-3 font-medium">🌐 几何映射</div>
          <div className="mb-2">
            <label className="block text-xs text-gray-400 mb-1">映射模式</label>
            <select 
              value={settings.geometryMapping}
              onChange={(e) => handleChange('geometryMapping', e.target.value as 'none' | 'sphere' | 'cylinder')}
              className="w-full px-2 py-1 text-xs rounded bg-gray-700 border border-gray-600 text-white"
            >
              <option value="none">平面（无映射）</option>
              <option value="sphere">球形映射</option>
              <option value="cylinder">圆柱映射</option>
            </select>
          </div>
          {settings.geometryMapping !== 'none' && (
            <>
              <RangeControl label="映射强度" value={settings.mappingStrength} min={0} max={1} step={0.05} 
                onChange={(v) => handleChange('mappingStrength', v)} />
              <RangeControl label="半径" value={settings.mappingRadius} min={50} max={500} step={10} 
                onChange={(v) => handleChange('mappingRadius', v)} />
              <RangeControl label="水平拼接" value={settings.mappingTileX} min={1} max={8} step={1} 
                onChange={(v) => handleChange('mappingTileX', v)} />
              <RangeControl label="垂直拼接" value={settings.mappingTileY} min={1} max={4} step={1} 
                onChange={(v) => handleChange('mappingTileY', v)} />
            </>
          )}
        </div>
        
        {/* 游走闪电效果 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.wanderingLightningEnabled}
              onChange={(e) => handleChange('wanderingLightningEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">⚡ 游走闪电</span>
          </div>
          {settings.wanderingLightningEnabled && (
            <>
              <RangeControl label="闪电强度" value={settings.wanderingLightningIntensity} min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('wanderingLightningIntensity', v)} />
              <RangeControl label="游走速度" value={settings.wanderingLightningSpeed} min={0.1} max={3} step={0.1} 
                onChange={(v) => handleChange('wanderingLightningSpeed', v)} />
              <RangeControl label="闪电密度" value={settings.wanderingLightningDensity} min={1} max={10} step={1} 
                onChange={(v) => handleChange('wanderingLightningDensity', v)} />
              <RangeControl label="闪电宽度" value={settings.wanderingLightningWidth} min={1} max={20} step={1} 
                onChange={(v) => handleChange('wanderingLightningWidth', v)} />
            </>
          )}
        </div>
        
        {/* 闪电击穿效果 */}
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <div className="flex items-center space-x-2 text-xs text-gray-300 mb-3">
            <input 
              type="checkbox" 
              checked={settings.lightningBreakdownEnabled}
              onChange={(e) => handleChange('lightningBreakdownEnabled', e.target.checked)}
              className="rounded bg-gray-700 border-gray-600"
            />
            <span className="font-medium">🔥 闪电击穿</span>
          </div>
          {settings.lightningBreakdownEnabled && (
            <>
              <RangeControl label="击穿强度" value={settings.lightningBreakdownIntensity} min={0} max={1} step={0.1} 
                onChange={(v) => handleChange('lightningBreakdownIntensity', v)} />
              <RangeControl label="击穿频率" value={settings.lightningBreakdownFrequency} min={0.1} max={2} step={0.1} 
                onChange={(v) => handleChange('lightningBreakdownFrequency', v)} />
              <RangeControl label="分支数量" value={settings.lightningBreakdownBranches} min={0} max={5} step={1} 
                onChange={(v) => handleChange('lightningBreakdownBranches', v)} />
            </>
          )}
        </div>
      </ControlGroup>
        </>
      )}

      {/* ===== 连线效果 Tab ===== */}
      {activeTab === 'line' && (
        <>
          <ControlGroup title="粒子连线">
        <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
          <input 
            type="checkbox" 
            checked={settings.lineSettings.enabled} 
            onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, enabled: e.target.checked })}
            className="rounded bg-gray-700 border-gray-600"
          />
          <span>启用连线</span>
        </div>
        
        {settings.lineSettings.enabled && (
          <>
            {/* 渲染模式 */}
            <div className="mb-2">
              <label className="block text-xs text-gray-400 mb-1">渲染模式</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(LineRenderMode).map(mode => (
                  <button
                    key={mode}
                    onClick={() => handleChange('lineSettings', { ...settings.lineSettings, renderMode: mode })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${settings.lineSettings.renderMode === mode ? 'bg-blue-600 border-blue-400 text-white' : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'}`}
                  >
                    {LineRenderModeLabels[mode]}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 连线模式 */}
            <div className="mb-2">
              <label className="block text-xs text-gray-400 mb-1">连线模式</label>
              <select 
                value={settings.lineSettings.mode}
                onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, mode: e.target.value as LineMode })}
                className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
              >
                {Object.values(LineMode).map(mode => (
                  <option key={mode} value={mode}>{LineModeLabels[mode]}</option>
                ))}
              </select>
            </div>
            
            {/* 距离区间 - 所有模式可用 */}
            <div className="mb-3 p-2 bg-gray-900 rounded">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs text-gray-400">距离区间</span>
                <button
                  onClick={() => {
                    const newRange = {
                      id: Date.now().toString(),
                      min: 0,
                      max: 50,
                      enabled: true
                    };
                    handleChange('lineSettings', {
                      ...settings.lineSettings,
                      distanceRanges: [...(settings.lineSettings.distanceRanges || []), newRange]
                    });
                  }}
                  className="px-2 py-1 text-xs bg-blue-600 hover:bg-blue-500 rounded"
                >
                  + 添加区间
                </button>
              </div>
              
              {(settings.lineSettings.distanceRanges || []).map((range, idx) => (
                <div key={range.id} className="flex items-center gap-2 mb-2 p-2 bg-gray-800 rounded">
                  <input
                    type="checkbox"
                    checked={range.enabled}
                    onChange={(e) => {
                      const updated = [...settings.lineSettings.distanceRanges];
                      updated[idx] = { ...range, enabled: e.target.checked };
                      handleChange('lineSettings', { ...settings.lineSettings, distanceRanges: updated });
                    }}
                    className="w-4 h-4"
                  />
                  <input
                    type="number"
                    value={range.min}
                    onChange={(e) => {
                      const updated = [...settings.lineSettings.distanceRanges];
                      updated[idx] = { ...range, min: Number(e.target.value) };
                      handleChange('lineSettings', { ...settings.lineSettings, distanceRanges: updated });
                    }}
                    className="w-16 px-1 py-0.5 text-xs bg-gray-700 border border-gray-600 rounded"
                    min={0}
                  />
                  <span className="text-xs text-gray-500">-</span>
                  <input
                    type="number"
                    value={range.max}
                    onChange={(e) => {
                      const updated = [...settings.lineSettings.distanceRanges];
                      updated[idx] = { ...range, max: Number(e.target.value) };
                      handleChange('lineSettings', { ...settings.lineSettings, distanceRanges: updated });
                    }}
                    className="w-16 px-1 py-0.5 text-xs bg-gray-700 border border-gray-600 rounded"
                    min={0}
                  />
                  {settings.lineSettings.distanceRanges.length > 1 && (
                    <button
                      onClick={() => {
                        const updated = settings.lineSettings.distanceRanges.filter((_, i) => i !== idx);
                        handleChange('lineSettings', { ...settings.lineSettings, distanceRanges: updated });
                      }}
                      className="px-1 text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">只连接距离在区间内的粒子</p>
            </div>
            
            {/* K近邻模式参数 */}
            {settings.lineSettings.mode === LineMode.KNN && (
              <RangeControl 
                label="K值 (邻居数)" 
                value={settings.lineSettings.kNeighbors} 
                min={1} max={10} step={1} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, kNeighbors: v })} 
              />
            )}
            
            {/* 颜色模式参数 */}
            {settings.lineSettings.mode === LineMode.Color && (
              <RangeControl 
                label="颜色相似阈值" 
                value={settings.lineSettings.colorThreshold} 
                min={0.05} max={0.5} step={0.05} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, colorThreshold: v })} 
              />
            )}
            
            {/* 线条样式 */}
            <div className="mb-2">
              <label className="block text-xs text-gray-400 mb-1">线条样式</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.values(LineStyle).map(style => (
                  <button
                    key={style}
                    onClick={() => handleChange('lineSettings', { ...settings.lineSettings, lineStyle: style })}
                    className={`px-2 py-1 text-xs rounded border transition-colors ${
                      settings.lineSettings.lineStyle === style 
                        ? 'bg-blue-600 border-blue-400 text-white' 
                        : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {LineStyleLabels[style]}
                  </button>
                ))}
              </div>
            </div>
            
            {/* 线条颜色模式 */}
            <div className="mb-2">
              <label className="block text-xs text-gray-400 mb-1">线条颜色</label>
              <select 
                value={settings.lineSettings.lineColorMode}
                onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, lineColorMode: e.target.value as LineColorMode })}
                className="w-full bg-gray-800 text-white text-xs p-2 rounded border border-gray-700 focus:border-blue-500 outline-none"
              >
                {Object.values(LineColorMode).map(mode => (
                  <option key={mode} value={mode}>{LineColorModeLabels[mode]}</option>
                ))}
              </select>
            </div>
            
            {/* 自定义颜色 */}
            {settings.lineSettings.lineColorMode === LineColorMode.Custom && (
              <div className="mb-2">
                <label className="block text-xs text-gray-400 mb-1">自定义颜色</label>
                <input 
                  type="color" 
                  value={settings.lineSettings.customColor}
                  onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, customColor: e.target.value })}
                  className="w-full h-8 rounded border border-gray-700 cursor-pointer"
                />
              </div>
            )}
            
            {/* 渐变色设置 */}
            {settings.lineSettings.lineColorMode === LineColorMode.Gradient && (
              <div className="mb-3 p-2 bg-gray-900 rounded">
                <p className="text-xs text-gray-400 mb-2">渐变色设置</p>
                
                {/* 渐变模式选择 */}
                <div className="grid grid-cols-2 gap-2 mb-2">
                  {Object.values(LineGradientMode).map(mode => (
                    <button
                      key={mode}
                      onClick={() => handleChange('lineSettings', { ...settings.lineSettings, gradientMode: mode })}
                      className={`px-2 py-1 text-xs rounded border transition-colors ${
                        settings.lineSettings.gradientMode === mode 
                          ? 'bg-blue-600 border-blue-400 text-white' 
                          : 'bg-gray-800 border-gray-700 text-gray-400 hover:border-gray-500'
                      }`}
                    >
                      {LineGradientModeLabels[mode]}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mb-2">
                  {settings.lineSettings.gradientMode === LineGradientMode.ParticleColor 
                    ? '基于连线两端粒子颜色渐变' 
                    : '基于位置的固定颜色渐变'}
                </p>
                
                {/* 固定渐变时显示颜色选择 */}
                {settings.lineSettings.gradientMode === LineGradientMode.Fixed && (
                  <>
                    <div className="flex gap-2 mb-2">
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">起始色</label>
                        <input 
                          type="color" 
                          value={settings.lineSettings.gradientColorStart || '#ff0080'}
                          onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, gradientColorStart: e.target.value })}
                          className="w-full h-8 rounded border border-gray-700 cursor-pointer"
                        />
                      </div>
                      <div className="flex-1">
                        <label className="block text-xs text-gray-500 mb-1">结束色</label>
                        <input 
                          type="color" 
                          value={settings.lineSettings.gradientColorEnd || '#00ffff'}
                          onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, gradientColorEnd: e.target.value })}
                          className="w-full h-8 rounded border border-gray-700 cursor-pointer"
                        />
                      </div>
                    </div>
                    <RangeControl 
                      label="渐变强度 (%)" 
                      value={Math.round((settings.lineSettings.gradientIntensity || 0.5) * 100)} 
                      min={0} max={100} step={5} 
                      onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, gradientIntensity: v / 100 })} 
                    />
                    <p className="text-xs text-gray-500 mt-1">0%=纯继承色, 100%=纯渐变</p>
                  </>
                )}
              </div>
            )}
            
            <RangeControl 
              label="线条粗细" 
              value={settings.lineSettings.lineWidth} 
              min={0} max={100} step={1} 
              onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, lineWidth: v })} 
            />
            
            <RangeControl 
              label="透明度 (%)" 
              value={Math.round(settings.lineSettings.opacity * 100)} 
              min={0} max={100} step={1} 
              onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, opacity: v / 100 })} 
            />
            
            <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
              <input 
                type="checkbox" 
                checked={settings.lineSettings.fadeWithDistance} 
                onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, fadeWithDistance: e.target.checked })}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span>距离淡出</span>
            </div>
            
            {/* 结构感知约束 */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2">🔧 结构感知约束</p>
              <p className="text-xs text-gray-600 mb-2">解决人物图像连线杂乱问题</p>
              
              {/* 颜色约束 */}
              <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                <input 
                  type="checkbox" 
                  checked={settings.lineSettings.colorConstraintEnabled || false}
                  onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, colorConstraintEnabled: e.target.checked })}
                  className="rounded bg-gray-700 border-gray-600"
                />
                <span>启用颜色约束</span>
              </div>
              
              {settings.lineSettings.colorConstraintEnabled && (
                <RangeControl 
                  label="颜色容差 (%)" 
                  value={Math.round((settings.lineSettings.colorTolerance || 0.3) * 100)} 
                  min={5} max={100} step={5} 
                  onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, colorTolerance: v / 100 })} 
                />
              )}
              
              {/* 每粒子连接数限制 */}
              <RangeControl 
                label="每粒子最大连接" 
                value={settings.lineSettings.maxConnectionsPerParticle || 0} 
                min={0} max={10} step={1} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, maxConnectionsPerParticle: v })} 
              />
              <p className="text-xs text-gray-600 mb-2">0=不限制, 3-4=干净网格</p>
              
              {/* Z轴深度权重 */}
              <RangeControl 
                label="Z轴深度权重" 
                value={settings.lineSettings.zDepthWeight ?? 1.0} 
                min={0} max={3} step={0.1} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, zDepthWeight: v })} 
              />
              <p className="text-xs text-gray-600 mb-2">越大=深度分离越明显</p>
              
              {/* 粒子大小过滤 */}
              <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2 mt-2">
                <input 
                  type="checkbox" 
                  checked={settings.lineSettings.sizeFilterEnabled || false}
                  onChange={(e) => handleChange('lineSettings', { ...settings.lineSettings, sizeFilterEnabled: e.target.checked })}
                  className="rounded bg-gray-700 border-gray-600"
                />
                <span>粒子大小过滤</span>
              </div>
              
              {settings.lineSettings.sizeFilterEnabled && (
                <>
                  <RangeControl 
                    label="百分位过滤 (%)" 
                    value={settings.lineSettings.minSizePercentile || 0} 
                    min={0} max={50} step={5} 
                    onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, minSizePercentile: v })} 
                  />
                  <p className="text-xs text-gray-600 mb-1">过滤最小的前X%粒子</p>
                  <RangeControl 
                    label="绝对最小尺寸" 
                    value={settings.lineSettings.minSizeAbsolute || 0.1} 
                    min={0} max={0.5} step={0.05} 
                    onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, minSizeAbsolute: v })} 
                  />
                  <RangeControl 
                    label="相对最小尺寸 (%)" 
                    value={Math.round((settings.lineSettings.minSizeRelative || 0.2) * 100)} 
                    min={0} max={50} step={5} 
                    onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, minSizeRelative: v / 100 })} 
                  />
                  <p className="text-xs text-gray-600 mb-2">过滤小粒子，减少噪点连线</p>
                </>
              )}
            </div>
            
            {/* 性能控制 */}
            <div className="mt-3 pt-3 border-t border-gray-700">
              <p className="text-xs text-gray-500 mb-2">性能控制</p>
              <RangeControl 
                label="采样比例 (%)" 
                value={Math.round(settings.lineSettings.sampleRatio * 100)} 
                min={1} max={100} step={1} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, sampleRatio: v / 100 })} 
              />
              <RangeControl 
                label="最大连线数" 
                value={settings.lineSettings.maxLines / 1000} 
                min={5} max={100} step={5} 
                onChange={(v) => handleChange('lineSettings', { ...settings.lineSettings, maxLines: v * 1000 })} 
              />
            </div>
          </>
        )}
      </ControlGroup>
        </>
      )}

      {/* ===== 交互 Tab ===== */}
      {activeTab === 'interact' && (
        <>
          <ControlGroup title="物理与交互">
            <RangeControl label="交互强度" value={settings.interactionStrength} min={0} max={200} onChange={(v) => handleChange('interactionStrength', v)} />
            <RangeControl label="影响半径" value={settings.interactionRadius} min={10} max={300} onChange={(v) => handleChange('interactionRadius', v)} />
            <RangeControl label="回弹速度" value={settings.returnSpeed} min={0.1} max={5.0} step={0.1} onChange={(v) => handleChange('returnSpeed', v)} />
          </ControlGroup>

          <ControlGroup title="相机控制">
            <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
              <input 
                type="checkbox" 
                checked={settings.autoRotate} 
                onChange={(e) => handleChange('autoRotate', e.target.checked)}
                className="rounded bg-gray-700 border-gray-600"
              />
              <span>自动旋转</span>
            </div>
            <RangeControl label="旋转速度" value={settings.autoRotateSpeed} min={0} max={2.0} step={0.1} onChange={(v) => handleChange('autoRotateSpeed', v)} />
          </ControlGroup>

          <div className="p-4 bg-gray-800 rounded-lg">
            <h4 className="text-xs font-bold text-white mb-2">交互说明</h4>
            <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
                <li><strong>鼠标/触控:</strong> 旋转视角</li>
                <li><strong>滚轮:</strong> 缩放视角</li>
                <li><strong>手掌平移:</strong> 推开粒子</li>
                <li><strong>手掌张开:</strong> 绚烂爆炸 (Start)</li>
                <li><strong>握拳:</strong> 黑洞能量球 (Aggregate)</li>
            </ul>
          </div>
        </>
      )}
      </>
      )}

      {/* ==================== 星球模式控制面板 ==================== */}
      {appMode === 'planet' && (
        <>
          {/* 星球列表 */}
          <ControlGroup title="星球列表">
            {/* 顶部操作栏 */}
            <div className="flex gap-2 mb-3">
              {planetSettings.planets.length < MAX_PLANETS ? (
                <button
                  onClick={() => {
                    const id = Date.now().toString();
                    const newPlanet = createDefaultPlanet(id, `星球 ${planetSettings.planets.length + 1}`);
                    setPlanetSettings(prev => ({ 
                      ...prev, 
                      planets: [...prev.planets, newPlanet] 
                    }));
                    setSelectedPlanetId(id);
                  }}
                  className="flex-1 px-2 py-1.5 text-xs font-medium rounded bg-blue-600 hover:bg-blue-500 text-white"
                >
                  + 添加
                </button>
              ) : (
                <span className="flex-1 px-2 py-1.5 text-xs text-yellow-400 text-center bg-gray-800 rounded">已满 {MAX_PLANETS}</span>
              )}
              <button
                onClick={() => {
                  const name = prompt('请输入布局名称:', `星球场景 ${Date.now()}`);
                  if (name) {
                    const layoutData = {
                      name,
                      planets: planetSettings.planets,
                      createdAt: Date.now()
                    };
                    const template: SavedPlanetTemplate = {
                      id: Date.now().toString(),
                      name,
                      createdAt: Date.now(),
                      planet: layoutData as any
                    };
                    saveTemplates([...savedTemplates, template]);
                    alert('布局已保存!');
                  }
                }}
                className="px-2 py-1.5 text-xs rounded bg-green-600 hover:bg-green-500 text-white"
                title="保存整个布局"
              >
                💾
              </button>
              <button
                onClick={() => {
                  const layoutData = {
                    planets: planetSettings.planets,
                    exportedAt: Date.now()
                  };
                  const dataStr = JSON.stringify(layoutData, null, 2);
                  const blob = new Blob([dataStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `planet-layout-${Date.now()}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
                className="px-2 py-1.5 text-xs rounded bg-purple-600 hover:bg-purple-500 text-white"
                title="导出整个布局"
              >
                📥
              </button>
            </div>
            
            {/* 星球列表项 */}
            <div className="space-y-2">
              {planetSettings.planets.map((planet, idx) => (
                <div 
                  key={planet.id}
                  onClick={() => setSelectedPlanetId(planet.id)}
                  className={`p-2 rounded cursor-pointer transition-colors ${
                    selectedPlanetId === planet.id 
                      ? 'bg-orange-600/20 border border-orange-500' 
                      : 'bg-gray-800 hover:bg-gray-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input 
                      type="checkbox" 
                      checked={planet.enabled}
                      onChange={(e) => {
                        e.stopPropagation();
                        const updated = planetSettings.planets.map(p => 
                          p.id === planet.id ? { ...p, enabled: e.target.checked } : p
                        );
                        setPlanetSettings(prev => ({ ...prev, planets: updated }));
                      }}
                      className="rounded bg-gray-700 border-gray-600 flex-shrink-0"
                    />
                    <input
                      type="text"
                      value={planet.name}
                      readOnly={editingPlanetId !== planet.id}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        setEditingPlanetId(planet.id);
                        (e.target as HTMLInputElement).select();
                      }}
                      onBlur={() => setEditingPlanetId(null)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          setEditingPlanetId(null);
                          (e.target as HTMLInputElement).blur();
                        }
                      }}
                      onChange={(e) => {
                        const updated = planetSettings.planets.map(p => 
                          p.id === planet.id ? { ...p, name: e.target.value } : p
                        );
                        setPlanetSettings(prev => ({ ...prev, planets: updated }));
                      }}
                      className={`flex-1 px-1 py-0.5 text-xs bg-transparent border-b text-white outline-none min-w-0 ${
                        editingPlanetId === planet.id 
                          ? 'border-blue-500 cursor-text' 
                          : 'border-transparent cursor-pointer'
                      }`}
                    />
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const name = prompt('请输入模板名称:', planet.name);
                          if (name) {
                            const template: SavedPlanetTemplate = {
                              id: Date.now().toString(),
                              name,
                              createdAt: Date.now(),
                              planet: {
                                name: planet.name,
                                enabled: planet.enabled,
                                scale: planet.scale,
                                coreSystem: planet.coreSystem,
                                flameSystem: planet.flameSystem,
                                rings: planet.rings,
                                radiation: planet.radiation,
                                fireflies: planet.fireflies,
                                magicCircles: planet.magicCircles,
                                energyBodySystem: planet.energyBodySystem
                              }
                            };
                            saveTemplates([...savedTemplates, template]);
                            alert('模板已保存!');
                          }
                        }}
                        className="p-1 text-xs text-green-400 hover:text-green-300"
                        title="保存为模板"
                      >
                        💾
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          const planetData = { ...planet };
                          const dataStr = JSON.stringify(planetData, null, 2);
                          const blob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `${planet.name}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="p-1 text-xs text-blue-400 hover:text-blue-300"
                        title="导出星球"
                      >
                        📥
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm(`确定删除 "${planet.name}" 吗?`)) {
                            const updated = planetSettings.planets.filter(p => p.id !== planet.id);
                            setPlanetSettings(prev => ({ ...prev, planets: updated }));
                            if (selectedPlanetId === planet.id) setSelectedPlanetId(null);
                          }
                        }}
                        className="p-1 text-xs text-red-400 hover:text-red-300"
                        title="删除"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
              
              {planetSettings.planets.length === 0 && (
                <p className="text-xs text-gray-500 text-center py-4">点击上方按钮添加星球</p>
              )}
            </div>
          </ControlGroup>

          {/* 已保存的模板 */}
          {savedTemplates.length > 0 && (
            <ControlGroup title="已保存模板">
              <div className="space-y-1 max-h-32 overflow-y-auto">
                {savedTemplates.map(template => (
                  <div key={template.id} className="flex items-center justify-between p-1.5 bg-gray-800 rounded text-xs">
                    <span className="text-white truncate flex-1">{template.name}</span>
                    <div className="flex gap-1 flex-shrink-0">
                      <button
                        onClick={() => {
                          if (planetSettings.planets.length >= MAX_PLANETS) {
                            alert(`已达到最大星球数量 (${MAX_PLANETS})`);
                            return;
                          }
                          const id = Date.now().toString();
                          const newPlanet: PlanetSettings = {
                            ...template.planet as any,
                            id,
                            position: { x: Math.random() * 100 - 50, y: Math.random() * 100 - 50, z: 0 }
                          };
                          setPlanetSettings(prev => ({
                            ...prev,
                            planets: [...prev.planets, newPlanet]
                          }));
                          setSelectedPlanetId(id);
                        }}
                        className="px-1.5 py-0.5 bg-green-600 hover:bg-green-500 rounded"
                      >
                        应用
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`确定删除模板 "${template.name}" 吗?`)) {
                            const updated = savedTemplates.filter(t => t.id !== template.id);
                            saveTemplates(updated);
                          }
                        }}
                        className="px-1.5 py-0.5 bg-red-600 hover:bg-red-500 rounded"
                      >
                        删
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ControlGroup>
          )}

          {/* Tab 切换栏 */}
          <div className="flex gap-1 mb-4 bg-gray-800 rounded-lg p-1">
            {[
              { key: 'basic' as PlanetTabType, label: '星系创造', icon: '🪐' },
              { key: 'visual' as PlanetTabType, label: '特殊效果', icon: '✨' },
              { key: 'interact' as PlanetTabType, label: '星系交互', icon: '👆' }
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setPlanetTab(tab.key)}
                className={`flex-1 py-2 px-1 text-xs rounded-md transition-colors flex items-center justify-center gap-1 ${
                  planetTab === tab.key 
                    ? 'bg-gradient-to-r from-orange-600 to-pink-600 text-white shadow-md' 
                    : 'text-gray-400 hover:text-white hover:bg-gray-700'
                }`}
              >
                <span>{tab.icon}</span>
                <span>{tab.label}</span>
              </button>
            ))}
          </div>

          {/* ========== 星系创造 Tab ========== */}
          {planetTab === 'basic' && selectedPlanetId && (() => {
            const planet = planetSettings.planets.find(p => p.id === selectedPlanetId);
            if (!planet) return <p className="text-xs text-gray-500 text-center py-4">请先选择一个星球</p>;
            
            const updatePlanet = (updates: Partial<PlanetSettings>) => {
              setPlanetSettings(prev => ({
                ...prev,
                planets: prev.planets.map(p => 
                  p.id === selectedPlanetId ? { ...p, ...updates } : p
                )
              }));
            };
            
            return (
              <>
                {/* 基础设置 */}
                <ControlGroup title={`基础设置: ${planet.name}`}>
                  <div className="mb-3">
                    <label className="block text-xs text-gray-400 mb-1">位置 (X, Y, Z)</label>
                    <div className="grid grid-cols-3 gap-2">
                      <input type="number" value={planet.position.x} onChange={(e) => updatePlanet({ position: { ...planet.position, x: Number(e.target.value) } })} className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white" placeholder="X" />
                      <input type="number" value={planet.position.y} onChange={(e) => updatePlanet({ position: { ...planet.position, y: Number(e.target.value) } })} className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white" placeholder="Y" />
                      <input type="number" value={planet.position.z} onChange={(e) => updatePlanet({ position: { ...planet.position, z: Number(e.target.value) } })} className="px-2 py-1 text-xs bg-gray-800 border border-gray-700 rounded text-white" placeholder="Z" />
                    </div>
                  </div>
                  <RangeControl label="整体缩放" value={planet.scale} min={0.5} max={3} step={0.1} onChange={(v) => updatePlanet({ scale: v })} />
                  
                  {/* 公转功能 */}
                  <div className="mt-3 p-2 bg-gray-800/50 rounded">
                    <div className="flex items-center justify-between mb-2">
                      <button
                        onClick={() => setOrbitPanelCollapsed(!orbitPanelCollapsed)}
                        className="flex items-center gap-1 text-xs text-gray-300 hover:text-white transition-colors"
                      >
                        <span>🌀 公转</span>
                        <span className={`transform transition-transform text-[10px] ${orbitPanelCollapsed ? '' : 'rotate-180'}`}>▼</span>
                      </button>
                      <button
                        onClick={() => {
                          const currentOrbit = planet.orbit ?? { ...DEFAULT_ORBIT_SETTINGS };
                          updatePlanet({ orbit: { ...currentOrbit, enabled: !currentOrbit.enabled } });
                        }}
                        className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                          planet.orbit?.enabled
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        }`}
                      >
                        {planet.orbit?.enabled ? '已启用' : '已禁用'}
                      </button>
                    </div>
                    
                    {!orbitPanelCollapsed && planet.orbit?.enabled && (
                      <div className="space-y-2">
                        {(
                          <>
                            {/* 公转目标 */}
                            <div>
                              <label className="text-xs text-gray-400 block mb-1">公转目标</label>
                              <select
                                value={planet.orbit?.targetPlanetId ?? ''}
                                onChange={(e) => {
                                  const targetId = e.target.value || null;
                                  updatePlanet({ orbit: { ...planet.orbit!, targetPlanetId: targetId } });
                                }}
                                className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white"
                              >
                                <option value="">场景原点</option>
                                {planetSettings.planets
                                  .filter(p => p.id !== planet.id && p.enabled)
                                  .map(p => (
                                    <option key={p.id} value={p.id}>{p.name}</option>
                                  ))
                                }
                              </select>
                            </div>
                            
                            {/* 公转参数 */}
                            {(() => {
                              // 计算当前公转半径（基于星球位置距离）
                              let orbitRadius = planet.orbit?.orbitRadius ?? 200;
                              const targetId = planet.orbit?.targetPlanetId;
                              if (targetId) {
                                const target = planetSettings.planets.find(p => p.id === targetId);
                                if (target) {
                                  const dx = planet.position.x - target.position.x;
                                  const dy = planet.position.y - target.position.y;
                                  const dz = planet.position.z - target.position.z;
                                  const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
                                  if (dist > 1) orbitRadius = dist;
                                }
                              } else {
                                // 绕原点
                                const dist = Math.sqrt(
                                  planet.position.x ** 2 + 
                                  planet.position.y ** 2 + 
                                  planet.position.z ** 2
                                );
                                if (dist > 1) orbitRadius = dist;
                              }
                              return (
                                <div className="text-xs text-gray-400 mb-2">
                                  <span>公转半径: </span>
                                  <span className="text-white">{orbitRadius.toFixed(0)}</span>
                                  <span className="text-gray-500 ml-1">（基于星球位置距离）</span>
                                </div>
                              );
                            })()}
                            <RangeControl
                              label="公转速度"
                              value={planet.orbit?.orbitSpeed ?? 0.3}
                              min={-2}
                              max={2}
                              step={0.1}
                              onChange={(v) => updatePlanet({ orbit: { ...planet.orbit!, orbitSpeed: v } })}
                            />
                            <RangeControl
                              label="离心率"
                              value={planet.orbit?.eccentricity ?? 0}
                              min={0}
                              max={0.9}
                              step={0.05}
                              onChange={(v) => updatePlanet({ orbit: { ...planet.orbit!, eccentricity: v } })}
                            />
                            <RangeControl
                              label="初始相位"
                              value={planet.orbit?.initialPhase ?? 0}
                              min={0}
                              max={360}
                              step={5}
                              onChange={(v) => updatePlanet({ orbit: { ...planet.orbit!, initialPhase: v } })}
                            />
                            
                            {/* 轨道倾斜 */}
                            <TiltPresetSelector 
                              tilt={planet.orbit?.tilt ?? DEFAULT_TILT_SETTINGS}
                              onChange={(tilt) => updatePlanet({ orbit: { ...planet.orbit!, tilt } })}
                            />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </ControlGroup>

                {/* 七个并列子Tab：核心 | 火焰 | 能量体 | 光环 | 辐射 | 流萤 | 法阵 */}
                <div className="flex gap-1 mb-3 bg-gray-800/50 rounded p-1">
                  {[
                    { key: 'core' as const, icon: '🌍', label: '核心', count: planet.coreSystem.cores.filter(c => c.enabled).length },
                    { key: 'energyBody' as const, icon: '⚡', label: '能量体', count: (planet.energyBodySystem?.energyBodies?.filter(e => e.enabled).length || 0) + (planet.flameSystem?.surfaceFlames?.filter(f => f.enabled).length || 0) },
                    { key: 'rings' as const, icon: '💫', label: '光环', count: planet.rings.particleRings.filter(r => r.enabled).length + planet.rings.continuousRings.filter(r => r.enabled).length + (planet.flameSystem?.spiralFlames?.filter(s => s.enabled).length || 0) },
                    { key: 'afterimage' as const, icon: '👻', label: '残影', count: planet.flameSystem?.flameJets?.filter(j => j.enabled).length || 0 },
                    { key: 'radiation' as const, icon: '🌟', label: '辐射', count: planet.radiation.orbitings.filter(o => o.enabled).length + planet.radiation.emitters.filter(e => e.enabled).length },
                    { key: 'fireflies' as const, icon: '✨', label: '流萤', count: planet.fireflies.orbitingFireflies.filter(f => f.enabled).length + planet.fireflies.wanderingGroups.filter(g => g.enabled).length },
                    { key: 'magicCircle' as const, icon: '🔮', label: '法阵', count: planet.magicCircles?.circles?.filter(c => c.enabled).length || 0 }
                  ].map(tab => (
                    <button
                      key={tab.key}
                      onClick={() => setPlanetSubTab(tab.key)}
                      className={`flex-1 py-2 px-1 text-xs rounded transition-colors flex flex-col items-center ${
                        planetSubTab === tab.key 
                          ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white' 
                          : 'text-gray-400 hover:text-white hover:bg-gray-700'
                      }`}
                    >
                      <span className="text-base">{tab.icon}</span>
                      <span className="text-[10px]">{tab.label}</span>
                      {tab.count > 0 && <span className="mt-0.5 px-1 bg-white/20 rounded text-[9px]">{tab.count}</span>}
                    </button>
                  ))}
                </div>

                {/* ===== 核心 子Tab ===== */}
                {planetSubTab === 'core' && (() => {
                  // 粒子核心相关
                  const effectiveSelectedCoreId = selectedCoreId && planet.coreSystem.cores.find(c => c.id === selectedCoreId) 
                    ? selectedCoreId 
                    : planet.coreSystem.cores[0]?.id || null;
                  const currentCore = planet.coreSystem.cores.find(c => c.id === effectiveSelectedCoreId);
                  
                  const updateCore = (coreId: string, updates: Partial<PlanetCoreSettings>) => {
                    const updatedCores = planet.coreSystem.cores.map(c => 
                      c.id === coreId ? { ...c, ...updates } : c
                    );
                    updatePlanet({ coreSystem: { ...planet.coreSystem, cores: updatedCores } });
                  };
                  
                  // 实体核心相关（多预设多实例）
                  const solidCores: SolidCoreSettings[] = planet.coreSystem.solidCores || [];
                  
                  // 当前选中的实体核心
                  const effectiveSelectedSolidCoreId = selectedSolidCoreId && solidCores.find(c => c.id === selectedSolidCoreId)
                    ? selectedSolidCoreId
                    : solidCores.find(c => c.enabled)?.id || solidCores[0]?.id || null;
                  const currentSolidCore = solidCores.find(c => c.id === effectiveSelectedSolidCoreId);
                  
                  const updateSolidCore = (coreId: string, updates: Partial<SolidCoreSettings>) => {
                    const updatedCores = solidCores.map(c => 
                      c.id === coreId ? { ...c, ...updates } : c
                    );
                    updatePlanet({ coreSystem: { ...planet.coreSystem, solidCores: updatedCores } });
                  };
                  
                  return (
                  <>
                    {/* 核心类型切换Tab */}
                    <div className="mb-3 flex gap-1 p-1 bg-gray-800 rounded-lg">
                      <button
                        onClick={() => setCoreSubTab('particle')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
                          coreSubTab === 'particle'
                            ? 'bg-gradient-to-r from-orange-600 to-yellow-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        粒子核心
                      </button>
                      <button
                        onClick={() => setCoreSubTab('solid')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
                          coreSubTab === 'solid'
                            ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        实体核心
                      </button>
                    </div>
                    
                    {/* ===== 粒子核心面板 ===== */}
                    {coreSubTab === 'particle' && (() => {
                      return (
                      <ControlGroup title="粒子核心">
                        <FloatingListSelector
                          items={planet.coreSystem.cores}
                          selectedId={effectiveSelectedCoreId}
                          onSelect={(id) => setSelectedCoreId(id)}
                          onToggleEnabled={(id, enabled) => updateCore(id, { enabled })}
                          onRename={(id, name) => updateCore(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.coreSystem.cores.filter(c => c.id !== id);
                            updatePlanet({ coreSystem: { ...planet.coreSystem, cores: updated } });
                            if (effectiveSelectedCoreId === id) setSelectedCoreId(updated[0]?.id || null);
                            if (soloCoreId === id) setSoloCoreId(null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newCore = createDefaultCore(id, `核心 ${planet.coreSystem.cores.length + 1}`);
                            updatePlanet({ coreSystem: { ...planet.coreSystem, cores: [...planet.coreSystem.cores, newCore] } });
                            setSelectedCoreId(id);
                          }}
                          globalEnabled={planet.coreSystem.coresEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ coreSystem: { ...planet.coreSystem, coresEnabled: enabled } })}
                          soloId={soloCoreId}
                          onSoloToggle={setSoloCoreId}
                          title="核心"
                          titleColor="text-orange-400"
                          addButtonColor="bg-orange-600 hover:bg-orange-500"
                          emptyText="暂无核心"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.particleCore}
                          builtInPresets={[
                            { id: 'standard', name: '💙 标准蓝', data: PARTICLE_CORE_PRESETS.standard },
                            { id: 'flame', name: '🔥 火焰红', data: PARTICLE_CORE_PRESETS.flame },
                            { id: 'aurora', name: '🌈 极光', data: PARTICLE_CORE_PRESETS.aurora },
                            { id: 'nebula', name: '💜 星云紫', data: PARTICLE_CORE_PRESETS.nebula },
                          ]}
                          currentData={currentCore ? { ...currentCore, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentCore}
                          instanceName="核心"
                          onApplyToInstance={(data) => {
                            if (currentCore) {
                              updateCore(currentCore.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const count = planet.coreSystem.cores.length + 1;
                            const newCore = {
                              ...createDefaultCore(Date.now().toString(), `${presetName.replace(/^[^\s]+\s/, '')} ${count}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ coreSystem: { ...planet.coreSystem, cores: [...planet.coreSystem.cores, newCore] } });
                            setSelectedCoreId(newCore.id);
                          }}
                          title="预设"
                          accentColor="orange"
                        />
                        {/* 导入导出按钮 */}
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton
                            storageKey={PRESET_STORAGE_KEYS.particleCore}
                            moduleName="particleCore"
                            builtInPresets={[
                              { id: 'standard', name: '💙 标准蓝', data: PARTICLE_CORE_PRESETS.standard },
                              { id: 'flame', name: '🔥 火焰红', data: PARTICLE_CORE_PRESETS.flame },
                              { id: 'aurora', name: '🌈 极光', data: PARTICLE_CORE_PRESETS.aurora },
                              { id: 'nebula', name: '💜 星云紫', data: PARTICLE_CORE_PRESETS.nebula },
                            ]}
                          />
                          <ImportPresetButton
                            storageKey={PRESET_STORAGE_KEYS.particleCore}
                            moduleName="particleCore"
                          />
                        </div>
                        
                        {currentCore && (() => {
                          // 当前颜色模式
                          const colorMode = currentCore.gradientColor.enabled ? (currentCore.gradientColor.mode || 'twoColor') : 'none';
                          const setColorMode = (mode: string) => {
                            if (mode === 'none') {
                              updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, enabled: false, mode: 'none' } });
                            } else {
                              updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, enabled: true, mode: mode as any } });
                            }
                          };
                          
                          // 渐变方向控件内容（直接内联使用，避免函数组件导致的问题）
                          const directionSelectJSX = (
                            <select 
                              value={currentCore.gradientColor.direction || 'radial'} 
                              onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, direction: e.target.value as any } })} 
                              className="w-full text-xs bg-gray-700 rounded px-2 py-1.5 text-white cursor-pointer relative z-10"
                            >
                              <option value="radial">径向（中心→外）</option>
                              <option value="linearX">X轴线性</option>
                              <option value="linearY">Y轴线性</option>
                              <option value="linearZ">Z轴线性</option>
                              <option value="linearCustom">自定义方向</option>
                              <option value="spiral">螺旋</option>
                            </select>
                          );
                          
                          const customDirectionJSX = currentCore.gradientColor.direction === 'linearCustom' && (
                            <div className="flex gap-1 items-center text-xs mt-1">
                              <span className="text-gray-500">方向:</span>
                              <input type="number" value={currentCore.gradientColor.directionCustom?.x ?? 1} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, directionCustom: { ...(currentCore.gradientColor.directionCustom || {x:1,y:0,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" placeholder="X" />
                              <input type="number" value={currentCore.gradientColor.directionCustom?.y ?? 0} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, directionCustom: { ...(currentCore.gradientColor.directionCustom || {x:1,y:0,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" placeholder="Y" />
                              <input type="number" value={currentCore.gradientColor.directionCustom?.z ?? 0} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, directionCustom: { ...(currentCore.gradientColor.directionCustom || {x:1,y:0,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" placeholder="Z" />
                            </div>
                          );
                          
                          const spiralOptionsJSX = currentCore.gradientColor.direction === 'spiral' && (
                            <div className="mt-1 space-y-1">
                              <div className="flex gap-2 items-center">
                                <span className="text-xs text-gray-400">旋转轴</span>
                                <select value={currentCore.gradientColor.spiralAxis || 'y'} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, spiralAxis: e.target.value as any } })} className="text-xs bg-gray-700 rounded px-1 py-0.5 text-white cursor-pointer">
                                  <option value="x">X</option>
                                  <option value="y">Y</option>
                                  <option value="z">Z</option>
                                </select>
                                <span className="text-xs text-gray-400 ml-2">圈数</span>
                                <input type="number" value={currentCore.gradientColor.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, spiralDensity: parseFloat(e.target.value) || 2 } })} className="w-12 text-xs bg-gray-700 rounded px-1 text-white text-center" />
                              </div>
                            </div>
                          );
                          
                          return (
                          <div className="mt-3 space-y-3">
                            {/* ===== 基础属性 ===== */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">基础属性</span>
                              <RangeControl label="半径" value={currentCore.baseRadius} min={50} max={500} step={10} onChange={(v) => updateCore(currentCore.id, { baseRadius: v })} />
                              <RangeControl label="粒子密度" value={currentCore.density} min={0.5} max={10} step={0.5} onChange={(v) => updateCore(currentCore.id, { density: v })} />
                              <RangeControl label="粒子填充" value={currentCore.fillPercent} min={0} max={100} step={1} onChange={(v) => updateCore(currentCore.id, { fillPercent: v, fillMode: v === 0 ? PlanetFillMode.Shell : PlanetFillMode.Gradient })} />
                              <RangeControl label="粒子大小" value={currentCore.particleSize || 1.0} min={0.5} max={5.0} step={0.5} onChange={(v) => updateCore(currentCore.id, { particleSize: v })} />
                              <RangeControl label="亮度" value={currentCore.brightness || 1.0} min={0.1} max={3.0} step={0.1} onChange={(v) => updateCore(currentCore.id, { brightness: v })} />
                            </div>
                            
                            {/* ===== 颜色模式 ===== */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">颜色模式</span>
                              
                              {/* 模式切换按钮组 */}
                              <div className="grid grid-cols-4 gap-1 mb-3">
                                {[
                                  { id: 'none', label: '单色' },
                                  { id: 'twoColor', label: '双色' },
                                  { id: 'threeColor', label: '三色' },
                                  { id: 'procedural', label: '混色' }
                                ].map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setColorMode(m.id)}
                                    className={`px-1 py-1 text-[10px] rounded transition-colors ${
                                      colorMode === m.id
                                        ? 'bg-orange-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                              
                              {/* 单色模式 */}
                              {colorMode === 'none' && (
                                <div className="space-y-1">
                                  <RangeControl label="色相" value={currentCore.baseHue} min={0} max={360} step={5} onChange={(v) => updateCore(currentCore.id, { baseHue: v })} />
                                  <div className="h-2 rounded" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />
                                  <RangeControl label="饱和度" value={currentCore.baseSaturation ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => updateCore(currentCore.id, { baseSaturation: v })} />
                                </div>
                              )}
                              
                              {/* 双色渐变 */}
                              {colorMode === 'twoColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center justify-center">
                                    <input type="color" value={currentCore.gradientColor.colors[0] || '#ff6b6b'} onChange={(e) => { const colors = [...(currentCore.gradientColor.colors || [])]; colors[0] = e.target.value; updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colors } }); }} className="w-12 h-8 rounded cursor-pointer" title="起始色" />
                                    <span className="text-gray-400 text-lg">→</span>
                                    <input type="color" value={currentCore.gradientColor.colors[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentCore.gradientColor.colors || [])]; colors[1] = e.target.value; updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colors } }); }} className="w-12 h-8 rounded cursor-pointer" title="结束色" />
                                  </div>
                                  {directionSelectJSX}
                                  {customDirectionJSX}
                                  {spiralOptionsJSX}
                                </div>
                              )}
                              
                              {/* 三色渐变 */}
                              {colorMode === 'threeColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-1 items-center justify-center">
                                    <input type="color" value={currentCore.gradientColor.colors[0] || '#ff6b6b'} onChange={(e) => { const colors = [...(currentCore.gradientColor.colors || [])]; colors[0] = e.target.value; updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="起始色" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentCore.gradientColor.colors[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentCore.gradientColor.colors || [])]; colors[1] = e.target.value; updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="中间色" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentCore.gradientColor.colors[2] || '#ffd93d'} onChange={(e) => { const colors = [...(currentCore.gradientColor.colors || [])]; colors[2] = e.target.value; updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colors } }); }} className="w-10 h-7 rounded cursor-pointer" title="结束色" />
                                  </div>
                                  <RangeControl label="中间色位置" value={currentCore.gradientColor.colorMidPosition ?? 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colorMidPosition: v } })} />
                                  <RangeControl label="中间色宽度" value={currentCore.gradientColor.colorMidWidth ?? 1} min={0} max={5} step={0.05} onChange={(v) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colorMidWidth: v, colorMidWidth2: 0 } })} />
                                  <RangeControl label="纯色带宽度" value={currentCore.gradientColor.colorMidWidth2 ?? 0} min={0} max={0.5} step={0.01} onChange={(v) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, colorMidWidth2: v, colorMidWidth: 1 } })} />
                                  {directionSelectJSX}
                                  {customDirectionJSX}
                                  {spiralOptionsJSX}
                                </div>
                              )}
                              
                              {/* 混色渐变（程序化） */}
                              {colorMode === 'procedural' && (
                                <div className="space-y-2">
                                  <RangeControl label="基础色相" value={currentCore.baseHue} min={0} max={360} step={5} onChange={(v) => updateCore(currentCore.id, { baseHue: v })} />
                                  <div className="h-2 rounded" style={{ background: 'linear-gradient(to right, #ff0000, #ffff00, #00ff00, #00ffff, #0000ff, #ff00ff, #ff0000)' }} />
                                  <RangeControl label="饱和度" value={currentCore.baseSaturation ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => updateCore(currentCore.id, { baseSaturation: v })} />
                                  
                                  <div className="pt-2 border-t border-gray-700">
                                    <div className="flex gap-2 items-center">
                                      <span className="text-xs text-gray-400">混色轴向</span>
                                      <select value={currentCore.gradientColor.proceduralAxis || 'y'} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, proceduralAxis: e.target.value as any } })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                        <option value="x">X轴</option>
                                        <option value="y">Y轴</option>
                                        <option value="z">Z轴</option>
                                        <option value="custom">自定义</option>
                                      </select>
                                    </div>
                                    {currentCore.gradientColor.proceduralAxis === 'custom' && (
                                      <div className="flex gap-1 items-center text-xs mt-1">
                                        <span className="text-gray-500">轴向:</span>
                                        <input type="number" value={currentCore.gradientColor.proceduralCustomAxis?.x ?? 0} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, proceduralCustomAxis: { ...(currentCore.gradientColor.proceduralCustomAxis || {x:0,y:1,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                        <input type="number" value={currentCore.gradientColor.proceduralCustomAxis?.y ?? 1} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, proceduralCustomAxis: { ...(currentCore.gradientColor.proceduralCustomAxis || {x:0,y:1,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                        <input type="number" value={currentCore.gradientColor.proceduralCustomAxis?.z ?? 0} onChange={(e) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, proceduralCustomAxis: { ...(currentCore.gradientColor.proceduralCustomAxis || {x:0,y:1,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      </div>
                                    )}
                                    <RangeControl label="渐变强度" value={currentCore.gradientColor.proceduralIntensity ?? 1.0} min={0.1} max={5} step={0.1} onChange={(v) => updateCore(currentCore.id, { gradientColor: { ...currentCore.gradientColor, proceduralIntensity: v } })} />
                                    <span className="text-[10px] text-gray-500">强度越大，色相跨度越大</span>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* ===== 运动效果 ===== */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">运动效果</span>
                              <RangeControl label="自转速度" value={currentCore.rotationSpeed} min={-2} max={2} step={0.02} onChange={(v) => updateCore(currentCore.id, { rotationSpeed: v })} />
                              <RotationAxisPresetSelector axis={currentCore.rotationAxis} onChange={(axis) => updateCore(currentCore.id, { rotationAxis: axis })} />
                              <RangeControl label="拖尾长度" value={currentCore.trailLength} min={0} max={2} step={0.1} onChange={(v) => updateCore(currentCore.id, { trailLength: v })} />
                            </div>
                          </div>
                          );
                        })()}
                      </ControlGroup>
                      );
                    })()}
                    
                    {/* ===== 实体核心面板 ===== */}
                    {coreSubTab === 'solid' && (() => {
                      // 系统预设列表
                      const presetList = [
                        { id: 'magma', name: '🔥 岩浆' },
                        { id: 'gas', name: '🌀 气态' },
                        { id: 'ice', name: '❄️ 冰晶' },
                        { id: 'cyber', name: '💜 赛博' },
                        { id: 'custom', name: '⚙️ 自定义' },
                      ];
                      
                      // 从预设创建新实体核心
                      const addSolidCoreFromPreset = (presetId: string) => {
                        const preset = SOLID_CORE_PRESETS[presetId as keyof typeof SOLID_CORE_PRESETS];
                        if (preset) {
                          const count = solidCores.filter(c => c.preset === presetId).length;
                          const baseName = presetId === 'magma' ? '岩浆' : presetId === 'gas' ? '气态' : presetId === 'ice' ? '冰晶' : presetId === 'cyber' ? '赛博' : '自定义';
                          const newInstance: SolidCoreSettings = {
                            ...preset,
                            id: `solid_${presetId}_${Date.now()}`,
                            name: count > 0 ? `${baseName} ${count + 1}` : baseName,
                            enabled: true,
                            preset: presetId
                          };
                          updatePlanet({ coreSystem: { ...planet.coreSystem, solidCores: [...solidCores, newInstance] } });
                          setSelectedSolidCoreId(newInstance.id);
                        }
                      };
                      
                      return (
                      <ControlGroup 
                        title="实体核心"
                        rightContent={
                          <EnableButton 
                            enabled={planet.coreSystem.solidCoresEnabled ?? true} 
                            onChange={(enabled) => updatePlanet({ coreSystem: { ...planet.coreSystem, solidCoresEnabled: enabled } })} 
                          />
                        }
                      >
                        {/* 实体核心列表管理 */}
                        <FloatingListSelector
                          items={solidCores}
                          selectedId={effectiveSelectedSolidCoreId}
                          onSelect={(id) => setSelectedSolidCoreId(id)}
                          onToggleEnabled={(id, enabled) => updateSolidCore(id, { enabled })}
                          onRename={(id, name) => updateSolidCore(id, { name })}
                          onDelete={(id) => {
                            const updated = solidCores.filter(c => c.id !== id);
                            updatePlanet({ coreSystem: { ...planet.coreSystem, solidCores: updated } });
                            if (effectiveSelectedSolidCoreId === id) setSelectedSolidCoreId(updated[0]?.id || null);
                          }}
                          onAdd={() => addSolidCoreFromPreset('custom')}
                          globalEnabled={planet.coreSystem.solidCoresEnabled ?? true}
                          onGlobalToggle={(enabled) => updatePlanet({ coreSystem: { ...planet.coreSystem, solidCoresEnabled: enabled } })}
                          title="实体核心"
                          titleColor="text-purple-400"
                          addButtonColor="bg-purple-600 hover:bg-purple-500"
                          emptyText="暂无实体核心"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.solidCore}
                          builtInPresets={[
                            { id: 'magma', name: '🔥 岩浆', data: SOLID_CORE_PRESETS.magma },
                            { id: 'gas', name: '🌀 气态', data: SOLID_CORE_PRESETS.gas },
                            { id: 'ice', name: '❄️ 冰晶', data: SOLID_CORE_PRESETS.ice },
                            { id: 'cyber', name: '💜 赛博', data: SOLID_CORE_PRESETS.cyber },
                          ]}
                          currentData={currentSolidCore ? { ...currentSolidCore, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentSolidCore}
                          instanceName="核心"
                          onApplyToInstance={(data) => {
                            if (currentSolidCore) {
                              updateSolidCore(currentSolidCore.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const count = solidCores.length + 1;
                            const newInstance: SolidCoreSettings = {
                              ...data,
                              id: `solid_${Date.now()}`,
                              name: `${presetName.replace(/^[^\s]+\s/, '')} ${count}`,
                              enabled: true,
                              preset: 'custom'
                            };
                            updatePlanet({ coreSystem: { ...planet.coreSystem, solidCores: [...solidCores, newInstance] } });
                            setSelectedSolidCoreId(newInstance.id);
                          }}
                          title="预设"
                          accentColor="purple"
                        />
                        {/* 导入导出按钮 */}
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton
                            storageKey={PRESET_STORAGE_KEYS.solidCore}
                            moduleName="solidCore"
                            builtInPresets={[
                              { id: 'magma', name: '🔥 岩浆', data: SOLID_CORE_PRESETS.magma },
                              { id: 'gas', name: '🌀 气态', data: SOLID_CORE_PRESETS.gas },
                              { id: 'ice', name: '❄️ 冰晶', data: SOLID_CORE_PRESETS.ice },
                              { id: 'cyber', name: '💜 赛博', data: SOLID_CORE_PRESETS.cyber },
                            ]}
                          />
                          <ImportPresetButton
                            storageKey={PRESET_STORAGE_KEYS.solidCore}
                            moduleName="solidCore"
                          />
                        </div>
                        
                        {/* 参数编辑区域 */}
                        {!currentSolidCore ? (
                          <div className="p-3 text-center text-xs text-gray-500 bg-gray-800/30 rounded">
                            请点击上方"+"按钮或预设按钮添加实体核心
                          </div>
                        ) : (
                        <>
                        {/* 当前编辑提示 + 保存到预设 */}
                        <div className="mb-2 p-1.5 bg-purple-600/30 rounded flex items-center justify-between">
                          <span className="text-xs text-purple-300">正在编辑: {currentSolidCore.name}</span>
                          <SavePresetButton
                            storageKey={PRESET_STORAGE_KEYS.solidCore}
                            currentData={currentSolidCore}
                            defaultName={currentSolidCore.name}
                            accentColor="purple"
                          />
                        </div>
                        
                        {/* ===== 基础属性 ===== */}
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">基础属性</span>
                          <RangeControl label="半径" value={currentSolidCore.radius} min={10} max={300} step={5} onChange={(v) => updateSolidCore(currentSolidCore.id, { radius: v })} />
                          <RangeControl label="亮度" value={currentSolidCore.brightness ?? 1.0} min={0.1} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { brightness: v })} />
                          <RangeControl label="透明度" value={currentSolidCore.opacity} min={0} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { opacity: v })} />
                        </div>
                        
                        {/* ===== 表面颜色 ===== */}
                        {(() => {
                          const sc = currentSolidCore.surfaceColor || { mode: 'none', baseColor: '#ff4400', colors: ['#ff4400', '#ffffff'], colorMidPosition: 0.5, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 };
                          const surfaceColorMode = sc.mode || 'none';
                          const setSurfaceColorMode = (mode: string) => {
                            updateSolidCore(currentSolidCore.id, { surfaceColor: { ...sc, mode: mode as any } });
                          };
                          const updateSurfaceColor = (updates: any) => {
                            updateSolidCore(currentSolidCore.id, { surfaceColor: { ...sc, ...updates } });
                          };
                          
                          return (
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">表面颜色</span>
                            
                            {/* 模式切换 */}
                            <div className="grid grid-cols-4 gap-1 mb-2">
                              {[{ id: 'none', label: '单色' }, { id: 'twoColor', label: '双色' }, { id: 'threeColor', label: '三色' }, { id: 'procedural', label: '混色' }].map(m => (
                                <button key={m.id} onClick={() => setSurfaceColorMode(m.id)} className={`px-1 py-1 text-[10px] rounded ${surfaceColorMode === m.id ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{m.label}</button>
                              ))}
                            </div>
                            
                            {/* 单色 */}
                            {surfaceColorMode === 'none' && (
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-400">基础色</span>
                                <input type="color" value={sc.baseColor || '#ff4400'} onChange={(e) => updateSurfaceColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" />
                              </div>
                            )}
                            
                            {/* 双色渐变 */}
                            {surfaceColorMode === 'twoColor' && (
                              <div className="space-y-2">
                                <div className="flex gap-2 items-center justify-center">
                                  <input type="color" value={sc.colors?.[0] || '#ff4400'} onChange={(e) => { const colors = [...(sc.colors || [])]; colors[0] = e.target.value; updateSurfaceColor({ colors }); }} className="w-10 h-6 rounded cursor-pointer" />
                                  <span className="text-gray-400">→</span>
                                  <input type="color" value={sc.colors?.[1] || '#ffffff'} onChange={(e) => { const colors = [...(sc.colors || [])]; colors[1] = e.target.value; updateSurfaceColor({ colors }); }} className="w-10 h-6 rounded cursor-pointer" />
                                </div>
                                <select value={sc.direction || 'radial'} onChange={(e) => updateSurfaceColor({ direction: e.target.value })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                  <option value="radial">径向</option><option value="linearX">X轴</option><option value="linearY">Y轴</option><option value="linearZ">Z轴</option><option value="linearCustom">自定义</option><option value="spiral">螺旋</option>
                                </select>
                                {sc.direction === 'spiral' && <RangeControl label="螺旋圈数" value={sc.spiralDensity || 3} min={0.5} max={10} step={0.5} onChange={(v) => updateSurfaceColor({ spiralDensity: v })} />}
                              </div>
                            )}
                            
                            {/* 三色渐变 */}
                            {surfaceColorMode === 'threeColor' && (
                              <div className="space-y-2">
                                <div className="flex gap-1 items-center justify-center">
                                  <input type="color" value={sc.colors?.[0] || '#ff4400'} onChange={(e) => { const colors = [...(sc.colors || [])]; colors[0] = e.target.value; updateSurfaceColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                  <span className="text-gray-500">→</span>
                                  <input type="color" value={sc.colors?.[1] || '#ffaa00'} onChange={(e) => { const colors = [...(sc.colors || [])]; colors[1] = e.target.value; updateSurfaceColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                  <span className="text-gray-500">→</span>
                                  <input type="color" value={sc.colors?.[2] || '#ffffff'} onChange={(e) => { const colors = [...(sc.colors || [])]; colors[2] = e.target.value; updateSurfaceColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                </div>
                                <RangeControl label="中间色位置" value={sc.colorMidPosition || 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateSurfaceColor({ colorMidPosition: v })} />
                                <RangeControl label="中间色宽度" value={sc.colorMidWidth ?? 1} min={0} max={5} step={0.05} onChange={(v) => updateSurfaceColor({ colorMidWidth: v, colorMidWidth2: 0 })} />
                                <RangeControl label="纯色带宽度" value={sc.colorMidWidth2 ?? 0} min={0} max={0.5} step={0.01} onChange={(v) => updateSurfaceColor({ colorMidWidth2: v, colorMidWidth: 1 })} />
                                <select value={sc.direction || 'radial'} onChange={(e) => updateSurfaceColor({ direction: e.target.value })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                  <option value="radial">径向</option><option value="linearX">X轴</option><option value="linearY">Y轴</option><option value="linearZ">Z轴</option><option value="spiral">螺旋</option>
                                </select>
                              </div>
                            )}
                            
                            {/* 混色 */}
                            {surfaceColorMode === 'procedural' && (
                              <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">基础色</span>
                                  <input type="color" value={sc.baseColor || '#ff4400'} onChange={(e) => updateSurfaceColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" />
                                </div>
                                <RangeControl label="混色强度" value={sc.proceduralIntensity || 1} min={0.1} max={5} step={0.1} onChange={(v) => updateSurfaceColor({ proceduralIntensity: v })} />
                                <select value={sc.direction || 'radial'} onChange={(e) => updateSurfaceColor({ direction: e.target.value })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                  <option value="radial">径向</option><option value="linearX">X轴</option><option value="linearY">Y轴</option><option value="linearZ">Z轴</option><option value="spiral">螺旋</option>
                                </select>
                              </div>
                            )}
                          </div>
                          );
                        })()}
                        
                        {/* ===== 纹理效果 ===== */}
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">纹理效果</span>
                          <RangeControl label="纹理尺度" value={currentSolidCore.scale} min={0.1} max={10} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { scale: v })} />
                          <RangeControl label="流动速度" value={currentSolidCore.speed} min={0} max={2} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { speed: v })} />
                          <RangeControl label="对比度" value={currentSolidCore.contrast} min={1} max={5} step={0.5} onChange={(v) => updateSolidCore(currentSolidCore.id, { contrast: v })} />
                          
                          {/* 纹理混合子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <span className="text-[10px] text-gray-500 block mb-1">纹理混合</span>
                            <RangeControl label="气态条纹" value={currentSolidCore.bandMix} min={0} max={2} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { bandMix: v })} />
                            <RangeControl label="冰晶锐化" value={currentSolidCore.ridgeMix} min={0} max={2} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { ridgeMix: v })} />
                            <RangeControl label="赛博网格" value={currentSolidCore.gridMix} min={0} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { gridMix: v })} />
                          </div>
                          
                          {/* 熔岩裂隙系统 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">🔥 熔岩裂隙</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentSolidCore.crackEnabled ?? false}
                                  onChange={(e) => updateSolidCore(currentSolidCore.id, { crackEnabled: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-[9px] text-gray-400">启用</span>
                              </label>
                            </div>
                            {currentSolidCore.crackEnabled && (
                              <>
                                <RangeControl label="噪声尺度" value={currentSolidCore.crackScale ?? 4} min={1} max={10} step={0.5} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackScale: v })} />
                                <RangeControl label="阈值" value={currentSolidCore.crackThreshold ?? 0.3} min={0.1} max={0.9} step={0.05} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackThreshold: v })} />
                                <RangeControl label="羽化" value={currentSolidCore.crackFeather ?? 0.1} min={0.01} max={0.3} step={0.01} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackFeather: v })} />
                                <RangeControl label="域扭曲" value={currentSolidCore.crackWarp ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackWarp: v })} />
                                <RangeControl label="扭曲尺度" value={currentSolidCore.crackWarpScale ?? 1.5} min={0.5} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackWarpScale: v })} />
                                <RangeControl label="流动速度" value={currentSolidCore.crackFlowSpeed ?? 0.2} min={0} max={1} step={0.05} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackFlowSpeed: v })} />
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-[9px] text-gray-500">裂隙色</span>
                                  <input
                                    type="color"
                                    value={currentSolidCore.crackColor1 ?? '#ffffff'}
                                    onChange={(e) => updateSolidCore(currentSolidCore.id, { crackColor1: e.target.value })}
                                    className="w-5 h-5 rounded cursor-pointer"
                                    title="内侧色"
                                  />
                                  <span className="text-[8px] text-gray-600">→</span>
                                  <input
                                    type="color"
                                    value={currentSolidCore.crackColor2 ?? '#ffaa00'}
                                    onChange={(e) => updateSolidCore(currentSolidCore.id, { crackColor2: e.target.value })}
                                    className="w-5 h-5 rounded cursor-pointer"
                                    title="外侧色"
                                  />
                                </div>
                                <RangeControl label="裂隙发光" value={currentSolidCore.crackEmission ?? 2} min={0} max={5} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { crackEmission: v })} />
                              </>
                            )}
                          </div>
                          
                          {/* 自发光子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <span className="text-[10px] text-gray-500 block mb-1">✨ 自发光</span>
                            <RangeControl label="发光强度" value={currentSolidCore.emissiveStrength ?? 0} min={0} max={5} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { emissiveStrength: v })} />
                            <span className="text-[9px] text-gray-600 block mt-1">让亮部发光触发Bloom效果</span>
                          </div>
                          
                          {/* 定向光子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">💡 定向光</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentSolidCore.lightEnabled ?? false}
                                  onChange={(e) => updateSolidCore(currentSolidCore.id, { lightEnabled: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-[9px] text-gray-400">启用</span>
                              </label>
                            </div>
                            {currentSolidCore.lightEnabled && (
                              <>
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-[9px] text-gray-500 w-12">光源色</span>
                                  <input
                                    type="color"
                                    value={currentSolidCore.lightColor ?? '#ffffff'}
                                    onChange={(e) => updateSolidCore(currentSolidCore.id, { lightColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer"
                                  />
                                </div>
                                <RangeControl label="光照强度" value={currentSolidCore.lightIntensity ?? 1} min={0} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { lightIntensity: v })} />
                                <RangeControl label="环境光" value={currentSolidCore.lightAmbient ?? 0.2} min={0} max={1} step={0.05} onChange={(v) => updateSolidCore(currentSolidCore.id, { lightAmbient: v })} />
                                <div className="mt-1">
                                  <span className="text-[9px] text-gray-500 block mb-1">光源方向</span>
                                  <div className="grid grid-cols-3 gap-1">
                                    <RangeControl label="X" value={currentSolidCore.lightDirection?.x ?? -1} min={-1} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { lightDirection: { ...(currentSolidCore.lightDirection ?? { x: -1, y: -1, z: 1 }), x: v } })} />
                                    <RangeControl label="Y" value={currentSolidCore.lightDirection?.y ?? -1} min={-1} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { lightDirection: { ...(currentSolidCore.lightDirection ?? { x: -1, y: -1, z: 1 }), y: v } })} />
                                    <RangeControl label="Z" value={currentSolidCore.lightDirection?.z ?? 1} min={-1} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { lightDirection: { ...(currentSolidCore.lightDirection ?? { x: -1, y: -1, z: 1 }), z: v } })} />
                                  </div>
                                </div>
                              </>
                            )}
                          </div>
                          
                          {/* 多频叠加子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">🌍 多频叠加</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentSolidCore.multiFreqEnabled ?? false}
                                  onChange={(e) => updateSolidCore(currentSolidCore.id, { multiFreqEnabled: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-[9px] text-gray-400">启用</span>
                              </label>
                            </div>
                            {currentSolidCore.multiFreqEnabled && (
                              <>
                                <RangeControl label="域扭曲" value={currentSolidCore.warpIntensity ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { warpIntensity: v })} />
                                <RangeControl label="扭曲尺度" value={currentSolidCore.warpScale ?? 1} min={0.5} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { warpScale: v })} />
                                <RangeControl label="细节权重" value={currentSolidCore.detailBalance ?? 0.3} min={0} max={1} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { detailBalance: v })} />
                                <span className="text-[9px] text-gray-600 block mt-1">形成大陆/板块形态</span>
                              </>
                            )}
                          </div>
                          
                          {/* 法线扰动子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">✨ 法线高光</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentSolidCore.bumpEnabled ?? false}
                                  onChange={(e) => updateSolidCore(currentSolidCore.id, { bumpEnabled: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-[9px] text-gray-400">启用</span>
                              </label>
                            </div>
                            {currentSolidCore.bumpEnabled && (
                              <>
                                <RangeControl label="凹凸强度" value={currentSolidCore.bumpStrength ?? 0.3} min={0} max={1} step={0.05} onChange={(v) => updateSolidCore(currentSolidCore.id, { bumpStrength: v })} />
                                <RangeControl label="高光强度" value={currentSolidCore.specularStrength ?? 1} min={0} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { specularStrength: v })} />
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-[9px] text-gray-500 w-12">高光色</span>
                                  <input
                                    type="color"
                                    value={currentSolidCore.specularColor ?? '#ffffff'}
                                    onChange={(e) => updateSolidCore(currentSolidCore.id, { specularColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer"
                                  />
                                </div>
                                <RangeControl label="粗糙度" value={currentSolidCore.roughness ?? 32} min={4} max={128} step={4} onChange={(v) => updateSolidCore(currentSolidCore.id, { roughness: v })} />
                                <span className="text-[9px] text-gray-600 block mt-1">需配合定向光使用</span>
                              </>
                            )}
                          </div>
                          
                          {/* 热点辉斑子组 */}
                          <div className="mt-2 pt-2 border-t border-gray-700">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-[10px] text-gray-500">⚡ 热点辉斑</span>
                              <label className="flex items-center gap-1 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={currentSolidCore.hotspotEnabled ?? false}
                                  onChange={(e) => updateSolidCore(currentSolidCore.id, { hotspotEnabled: e.target.checked })}
                                  className="w-3 h-3 rounded"
                                />
                                <span className="text-[9px] text-gray-400">启用</span>
                              </label>
                            </div>
                            {currentSolidCore.hotspotEnabled && (
                              <>
                                <RangeControl label="热点数量" value={currentSolidCore.hotspotCount ?? 4} min={1} max={8} step={1} onChange={(v) => updateSolidCore(currentSolidCore.id, { hotspotCount: v })} />
                                <RangeControl label="热点大小" value={currentSolidCore.hotspotSize ?? 0.15} min={0.05} max={0.5} step={0.01} onChange={(v) => updateSolidCore(currentSolidCore.id, { hotspotSize: v })} />
                                <RangeControl label="脉冲速度" value={currentSolidCore.hotspotPulseSpeed ?? 1} min={0} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { hotspotPulseSpeed: v })} />
                                <div className="flex items-center gap-1 mb-1">
                                  <span className="text-[9px] text-gray-500 w-12">热点色</span>
                                  <input
                                    type="color"
                                    value={currentSolidCore.hotspotColor ?? '#ffff00'}
                                    onChange={(e) => updateSolidCore(currentSolidCore.id, { hotspotColor: e.target.value })}
                                    className="w-6 h-6 rounded cursor-pointer"
                                  />
                                </div>
                                <RangeControl label="发光强度" value={currentSolidCore.hotspotEmission ?? 3} min={0} max={5} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { hotspotEmission: v })} />
                              </>
                            )}
                          </div>
                        </div>
                        
                        {/* ===== 边缘光晕 ===== */}
                        {(() => {
                          const gc = currentSolidCore.glowColor || { mode: 'none', baseColor: '#ff6600', colors: ['#ff6600', '#ffffff'], colorMidPosition: 0.5, direction: 'radial', directionCustom: { x: 0, y: 1, z: 0 }, spiralDensity: 3, proceduralIntensity: 1.0 };
                          const glowColorMode = gc.mode || 'none';
                          const setGlowColorMode = (mode: string) => {
                            updateSolidCore(currentSolidCore.id, { glowColor: { ...gc, mode: mode as any } });
                          };
                          const updateGlowColor = (updates: any) => {
                            updateSolidCore(currentSolidCore.id, { glowColor: { ...gc, ...updates } });
                          };
                          
                          return (
                          <div className="p-2 bg-gray-800/50 rounded">
                            <span className="text-xs text-gray-400 block mb-2">边缘光晕</span>
                            
                            {/* 光晕颜色 */}
                            <div className="mb-2">
                              <span className="text-[10px] text-gray-500 block mb-1">光晕颜色</span>
                              <div className="grid grid-cols-4 gap-1 mb-2">
                                {[{ id: 'none', label: '单色' }, { id: 'twoColor', label: '双色' }, { id: 'threeColor', label: '三色' }, { id: 'procedural', label: '混色' }].map(m => (
                                  <button key={m.id} onClick={() => setGlowColorMode(m.id)} className={`px-1 py-0.5 text-[10px] rounded ${glowColorMode === m.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{m.label}</button>
                                ))}
                              </div>
                              
                              {glowColorMode === 'none' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">颜色</span>
                                  <input type="color" value={gc.baseColor || '#ff6600'} onChange={(e) => updateGlowColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" />
                                </div>
                              )}
                              
                              {glowColorMode === 'twoColor' && (
                                <div className="space-y-1">
                                  <div className="flex gap-2 items-center justify-center">
                                    <input type="color" value={gc.colors?.[0] || '#ff6600'} onChange={(e) => { const colors = [...(gc.colors || [])]; colors[0] = e.target.value; updateGlowColor({ colors }); }} className="w-10 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-400">→</span>
                                    <input type="color" value={gc.colors?.[1] || '#ffffff'} onChange={(e) => { const colors = [...(gc.colors || [])]; colors[1] = e.target.value; updateGlowColor({ colors }); }} className="w-10 h-6 rounded cursor-pointer" />
                                  </div>
                                  <select value={gc.direction || 'radial'} onChange={(e) => updateGlowColor({ direction: e.target.value })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                    <option value="radial">径向</option><option value="linearX">X轴</option><option value="linearY">Y轴</option><option value="linearZ">Z轴</option><option value="spiral">螺旋</option>
                                  </select>
                                </div>
                              )}
                              
                              {glowColorMode === 'threeColor' && (
                                <div className="space-y-1">
                                  <div className="flex gap-1 items-center justify-center">
                                    <input type="color" value={gc.colors?.[0] || '#ff6600'} onChange={(e) => { const colors = [...(gc.colors || [])]; colors[0] = e.target.value; updateGlowColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={gc.colors?.[1] || '#ffaa00'} onChange={(e) => { const colors = [...(gc.colors || [])]; colors[1] = e.target.value; updateGlowColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={gc.colors?.[2] || '#ffffff'} onChange={(e) => { const colors = [...(gc.colors || [])]; colors[2] = e.target.value; updateGlowColor({ colors }); }} className="w-8 h-6 rounded cursor-pointer" />
                                  </div>
                                  <RangeControl label="中间色位置" value={gc.colorMidPosition || 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateGlowColor({ colorMidPosition: v })} />
                                  <RangeControl label="中间色宽度" value={gc.colorMidWidth ?? 1} min={0} max={5} step={0.05} onChange={(v) => updateGlowColor({ colorMidWidth: v, colorMidWidth2: 0 })} />
                                  <RangeControl label="纯色带宽度" value={gc.colorMidWidth2 ?? 0} min={0} max={0.5} step={0.01} onChange={(v) => updateGlowColor({ colorMidWidth2: v, colorMidWidth: 1 })} />
                                  <select value={gc.direction || 'radial'} onChange={(e) => updateGlowColor({ direction: e.target.value })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                    <option value="radial">径向</option><option value="linearX">X轴</option><option value="linearY">Y轴</option><option value="linearZ">Z轴</option><option value="spiral">螺旋</option>
                                  </select>
                                </div>
                              )}
                              
                              {glowColorMode === 'procedural' && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">基础色</span>
                                    <input type="color" value={gc.baseColor || '#ff6600'} onChange={(e) => updateGlowColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" />
                                  </div>
                                  <RangeControl label="混色强度" value={gc.proceduralIntensity || 1} min={0.1} max={5} step={0.1} onChange={(v) => updateGlowColor({ proceduralIntensity: v })} />
                                </div>
                              )}
                            </div>
                            
                            {/* 光晕形态 */}
                            <div className="mb-2 pt-2 border-t border-gray-700">
                              <span className="text-[10px] text-gray-500 block mb-1">光晕形态</span>
                              <RangeControl label="宽度" value={currentSolidCore.glowLength ?? 2.0} min={0.5} max={10} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { glowLength: v })} />
                              <RangeControl label="强度" value={currentSolidCore.glowStrength ?? 1.0} min={0} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { glowStrength: v })} />
                              <RangeControl label="发散高度" value={currentSolidCore.glowRadius ?? 0.2} min={0} max={1} step={0.01} onChange={(v) => updateSolidCore(currentSolidCore.id, { glowRadius: v })} />
                            </div>
                            
                            {/* 光晕效果 */}
                            <div className="pt-2 border-t border-gray-700">
                              <span className="text-[10px] text-gray-500 block mb-1">光晕效果</span>
                              <RangeControl label="边缘淡出" value={currentSolidCore.glowFalloff ?? 2.0} min={0.5} max={5} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { glowFalloff: v })} />
                              <div className="flex items-center justify-between my-1">
                                <span className="text-xs text-gray-400">内亮外淡</span>
                                <input type="checkbox" checked={currentSolidCore.glowInward ?? false} onChange={(e) => updateSolidCore(currentSolidCore.id, { glowInward: e.target.checked })} className="w-4 h-4 rounded" />
                              </div>
                              <RangeControl label="Bloom外扩" value={currentSolidCore.glowBloomBoost ?? 1.0} min={0} max={3} step={0.1} onChange={(v) => updateSolidCore(currentSolidCore.id, { glowBloomBoost: v })} />
                            </div>
                          </div>
                          );
                        })()}
                        </>
                        )}
                      </ControlGroup>
                      );
                    })()}
                  </>
                  );
                })()}

                {/* ===== 光环 子Tab ===== */}
                {planetSubTab === 'rings' && (() => {
                  // 自动选中第一个粒子环
                  const effectiveSelectedParticleRingId = selectedParticleRingId && planet.rings.particleRings.find(r => r.id === selectedParticleRingId)
                    ? selectedParticleRingId
                    : planet.rings.particleRings[0]?.id || null;
                  const currentParticleRing = planet.rings.particleRings.find(r => r.id === effectiveSelectedParticleRingId);
                  
                  // 自动选中第一个环带
                  const effectiveSelectedContinuousRingId = selectedContinuousRingId && planet.rings.continuousRings.find(r => r.id === selectedContinuousRingId)
                    ? selectedContinuousRingId
                    : planet.rings.continuousRings[0]?.id || null;
                  const currentContinuousRing = planet.rings.continuousRings.find(r => r.id === effectiveSelectedContinuousRingId);
                  
                  const updateParticleRing = (ringId: string, updates: Partial<ParticleRingSettings>) => {
                    const updated = planet.rings.particleRings.map(r => r.id === ringId ? { ...r, ...updates } : r);
                    updatePlanet({ rings: { ...planet.rings, particleRings: updated } });
                  };
                  
                  const updateContinuousRing = (ringId: string, updates: Partial<ContinuousRingSettings>) => {
                    const updated = planet.rings.continuousRings.map(r => r.id === ringId ? { ...r, ...updates } : r);
                    updatePlanet({ rings: { ...planet.rings, continuousRings: updated } });
                  };
                  
                  // 颜色模式辅助函数
                  const getColorMode = (gradientColor: any) => gradientColor?.enabled ? (gradientColor.mode || 'twoColor') : 'none';
                  const setParticleRingColorMode = (mode: string) => {
                    if (!currentParticleRing) return;
                    if (mode === 'none') {
                      updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, enabled: false, mode: 'none' } });
                    } else {
                      updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, enabled: true, mode: mode as any } });
                    }
                  };
                  const setContinuousRingColorMode = (mode: string) => {
                    if (!currentContinuousRing) return;
                    if (mode === 'none') {
                      updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, enabled: false, mode: 'none' } });
                    } else {
                      updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, enabled: true, mode: mode as any } });
                    }
                  };
                  
                  // 螺旋环启用状态
                  const spiralEnabled = planet.flameSystem?.spiralFlamesEnabled !== false;
                  const flameSystem = planet.flameSystem || DEFAULT_FLAME_SYSTEM;
                  
                  return (
                  <ControlGroup title="光环系统" rightContent={
                    <button
                      onClick={() => updatePlanet({ rings: { ...planet.rings, enabled: !(planet.rings.enabled ?? true) } })}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        (planet.rings.enabled ?? true)
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-400 border-2 border-red-500/70'
                      }`}
                    >
                      {(planet.rings.enabled ?? true) ? '已启用' : '已禁用'}
                    </button>
                  }>
                    {/* Tab 切换 */}
                    <div className="flex gap-1 mb-3 bg-gray-800/50 rounded p-1">
                      {[
                        { key: 'particle' as const, label: '💫 粒子环', count: planet.rings.particleRings.filter(r => r.enabled).length },
                        { key: 'continuous' as const, label: '🔘 环带', count: planet.rings.continuousRings.filter(r => r.enabled).length },
                        { key: 'spiral' as const, label: '🌀 螺旋环', count: planet.flameSystem?.spiralFlames?.filter(s => s.enabled).length || 0 }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setRingSubTab(tab.key)}
                          className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                            ringSubTab === tab.key
                              ? 'bg-blue-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>
                    
                    {/* ===== 粒子环 Tab ===== */}
                    {ringSubTab === 'particle' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.rings.particleRings}
                          selectedId={effectiveSelectedParticleRingId}
                          onSelect={(id) => setSelectedParticleRingId(id)}
                          onToggleEnabled={(id, enabled) => updateParticleRing(id, { enabled })}
                          onRename={(id, name) => updateParticleRing(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.rings.particleRings.filter(r => r.id !== id);
                            updatePlanet({ rings: { ...planet.rings, particleRings: updated } });
                            if (effectiveSelectedParticleRingId === id) setSelectedParticleRingId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newRing = createDefaultParticleRing(id, `粒子环 ${planet.rings.particleRings.length + 1}`);
                            updatePlanet({ rings: { ...planet.rings, particleRings: [...planet.rings.particleRings, newRing] } });
                            setSelectedParticleRingId(id);
                          }}
                          globalEnabled={planet.rings.particleRingsEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ rings: { ...planet.rings, particleRingsEnabled: enabled } })}
                          soloId={planet.rings.particleRingsSoloId}
                          onSoloToggle={(id) => updatePlanet({ rings: { ...planet.rings, particleRingsSoloId: id } })}
                          title="粒子环"
                          titleColor="text-blue-400"
                          addButtonColor="bg-blue-600 hover:bg-blue-500"
                          emptyText="暂无粒子环"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.particleRing}
                          builtInPresets={[
                            { id: 'saturn', name: '🪐 土星环', data: PARTICLE_RING_PRESETS.saturn },
                            { id: 'asteroid', name: '☄️ 小行星带', data: PARTICLE_RING_PRESETS.asteroid },
                            { id: 'comet', name: '💫 彗星尾', data: PARTICLE_RING_PRESETS.comet },
                          ]}
                          currentData={currentParticleRing ? { ...currentParticleRing, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentParticleRing}
                          instanceName="粒子环"
                          onApplyToInstance={(data) => {
                            if (currentParticleRing) {
                              updateParticleRing(currentParticleRing.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newRing = {
                              ...createDefaultParticleRing(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.rings.particleRings.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ rings: { ...planet.rings, particleRings: [...planet.rings.particleRings, newRing] } });
                            setSelectedParticleRingId(id);
                          }}
                          title="预设"
                          accentColor="blue"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.particleRing} moduleName="particleRing" builtInPresets={[
                            { id: 'saturn', name: '🪐 土星环', data: PARTICLE_RING_PRESETS.saturn },
                            { id: 'asteroid', name: '☄️ 小行星带', data: PARTICLE_RING_PRESETS.asteroid },
                            { id: 'comet', name: '💫 彗星尾', data: PARTICLE_RING_PRESETS.comet },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.particleRing} moduleName="particleRing" />
                        </div>
                        
                        {currentParticleRing && (
                          <div className="mt-3 space-y-2">
                            {/* 几何参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">几何参数</span>
                              <RangeControl label="轨道半径" value={currentParticleRing.absoluteRadius} min={60} max={1000} step={10} onChange={(v) => updateParticleRing(currentParticleRing.id, { absoluteRadius: v })} />
                              <RangeControl label="离心率" value={currentParticleRing.eccentricity} min={0} max={0.9} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { eccentricity: v })} />
                              <RangeControl label="环宽度" value={currentParticleRing.bandwidth} min={1} max={500} step={5} onChange={(v) => updateParticleRing(currentParticleRing.id, { bandwidth: v })} />
                              <RangeControl label="环厚度" value={currentParticleRing.thickness} min={0} max={20} step={1} onChange={(v) => updateParticleRing(currentParticleRing.id, { thickness: v })} />
                            </div>
                            
                            {/* 粒子外观 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">粒子外观</span>
                              <RangeControl label="粒子密度" value={currentParticleRing.particleDensity} min={1} max={50} step={1} onChange={(v) => updateParticleRing(currentParticleRing.id, { particleDensity: v })} />
                              <RangeControl label="粒子大小" value={currentParticleRing.particleSize || 1.0} min={0.5} max={5.0} step={0.5} onChange={(v) => updateParticleRing(currentParticleRing.id, { particleSize: v })} />
                              <RangeControl label="亮度" value={currentParticleRing.brightness || 1.0} min={0.1} max={2.0} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { brightness: v })} />
                            </div>
                            
                            {/* 颜色模式 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">颜色模式</span>
                              <div className="grid grid-cols-4 gap-1 mb-2">
                                {[
                                  { id: 'none', label: '单色' },
                                  { id: 'twoColor', label: '双色' },
                                  { id: 'threeColor', label: '三色' },
                                  { id: 'procedural', label: '混色' }
                                ].map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setParticleRingColorMode(m.id)}
                                    className={`px-1 py-1 text-[10px] rounded transition-colors ${
                                      getColorMode(currentParticleRing.gradientColor) === m.id
                                        ? 'bg-blue-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                              
                              {/* 单色模式 */}
                              {getColorMode(currentParticleRing.gradientColor) === 'none' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">颜色</span>
                                  <input type="color" value={currentParticleRing.color} onChange={(e) => updateParticleRing(currentParticleRing.id, { color: e.target.value })} className="w-10 h-6 rounded cursor-pointer" />
                                </div>
                              )}
                              
                              {/* 双色渐变 */}
                              {getColorMode(currentParticleRing.gradientColor) === 'twoColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center justify-center">
                                    <input type="color" value={currentParticleRing.gradientColor?.colors?.[0] || currentParticleRing.color} onChange={(e) => { const colors = [...(currentParticleRing.gradientColor?.colors || [])]; colors[0] = e.target.value; updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colors } }); }} className="w-10 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-400">→</span>
                                    <input type="color" value={currentParticleRing.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentParticleRing.gradientColor?.colors || [])]; colors[1] = e.target.value; updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colors } }); }} className="w-10 h-6 rounded cursor-pointer" />
                                  </div>
                                  <select value={currentParticleRing.gradientColor?.direction || 'radial'} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                    <option value="radial">径向（中心→外）</option>
                                    <option value="linearX">X轴线性</option>
                                    <option value="linearY">Y轴线性</option>
                                    <option value="linearZ">Z轴线性</option>
                                    <option value="linearCustom">自定义方向</option>
                                    <option value="spiral">螺旋</option>
                                  </select>
                                  {currentParticleRing.gradientColor?.direction === 'linearCustom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">方向:</span>
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.x ?? 1} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.y ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.z ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  {currentParticleRing.gradientColor?.direction === 'spiral' && (
                                    <div className="flex gap-2 items-center text-xs">
                                      <span className="text-gray-400">旋转轴</span>
                                      <select value={currentParticleRing.gradientColor?.spiralAxis || 'y'} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, spiralAxis: e.target.value as any } })} className="bg-gray-700 rounded px-1 py-0.5 text-white cursor-pointer">
                                        <option value="x">X</option>
                                        <option value="y">Y</option>
                                        <option value="z">Z</option>
                                      </select>
                                      <span className="text-gray-400">圈数</span>
                                      <input type="number" value={currentParticleRing.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, spiralDensity: parseFloat(e.target.value) || 2 } })} className="w-12 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* 三色渐变 */}
                              {getColorMode(currentParticleRing.gradientColor) === 'threeColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-1 items-center justify-center">
                                    <input type="color" value={currentParticleRing.gradientColor?.colors?.[0] || currentParticleRing.color} onChange={(e) => { const colors = [...(currentParticleRing.gradientColor?.colors || [])]; colors[0] = e.target.value; updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentParticleRing.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentParticleRing.gradientColor?.colors || [])]; colors[1] = e.target.value; updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentParticleRing.gradientColor?.colors?.[2] || '#ffd93d'} onChange={(e) => { const colors = [...(currentParticleRing.gradientColor?.colors || [])]; colors[2] = e.target.value; updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                  </div>
                                  <RangeControl label="中间色位置" value={currentParticleRing.gradientColor?.colorMidPosition ?? 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colorMidPosition: v } })} />
                                  <RangeControl label="中间色宽度" value={currentParticleRing.gradientColor?.colorMidWidth ?? 1} min={0} max={5} step={0.05} onChange={(v) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colorMidWidth: v, colorMidWidth2: 0 } })} />
                                  <RangeControl label="纯色带宽度" value={currentParticleRing.gradientColor?.colorMidWidth2 ?? 0} min={0} max={0.5} step={0.01} onChange={(v) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, colorMidWidth2: v, colorMidWidth: 1 } })} />
                                  <select value={currentParticleRing.gradientColor?.direction || 'radial'} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                    <option value="radial">径向（中心→外）</option>
                                    <option value="linearX">X轴线性</option>
                                    <option value="linearY">Y轴线性</option>
                                    <option value="linearZ">Z轴线性</option>
                                    <option value="linearCustom">自定义方向</option>
                                    <option value="spiral">螺旋</option>
                                  </select>
                                  {currentParticleRing.gradientColor?.direction === 'linearCustom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">方向:</span>
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.x ?? 1} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.y ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.directionCustom?.z ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, directionCustom: { ...(currentParticleRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  {currentParticleRing.gradientColor?.direction === 'spiral' && (
                                    <div className="flex gap-2 items-center text-xs">
                                      <span className="text-gray-400">旋转轴</span>
                                      <select value={currentParticleRing.gradientColor?.spiralAxis || 'y'} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, spiralAxis: e.target.value as any } })} className="bg-gray-700 rounded px-1 py-0.5 text-white cursor-pointer">
                                        <option value="x">X</option>
                                        <option value="y">Y</option>
                                        <option value="z">Z</option>
                                      </select>
                                      <span className="text-gray-400">圈数</span>
                                      <input type="number" value={currentParticleRing.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, spiralDensity: parseFloat(e.target.value) || 2 } })} className="w-12 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                </div>
                              )}
                              
                              {/* 混色模式 */}
                              {getColorMode(currentParticleRing.gradientColor) === 'procedural' && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">基础色</span>
                                    <input type="color" value={currentParticleRing.color} onChange={(e) => updateParticleRing(currentParticleRing.id, { color: e.target.value })} className="w-10 h-6 rounded cursor-pointer" />
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs text-gray-400">混色轴向</span>
                                    <select value={currentParticleRing.gradientColor?.proceduralAxis || 'y'} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, proceduralAxis: e.target.value as any } })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                      <option value="x">X轴</option>
                                      <option value="y">Y轴</option>
                                      <option value="z">Z轴</option>
                                      <option value="custom">自定义</option>
                                    </select>
                                  </div>
                                  {currentParticleRing.gradientColor?.proceduralAxis === 'custom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">轴向:</span>
                                      <input type="number" value={currentParticleRing.gradientColor?.proceduralCustomAxis?.x ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, proceduralCustomAxis: { ...(currentParticleRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.proceduralCustomAxis?.y ?? 1} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, proceduralCustomAxis: { ...(currentParticleRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentParticleRing.gradientColor?.proceduralCustomAxis?.z ?? 0} onChange={(e) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, proceduralCustomAxis: { ...(currentParticleRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  <RangeControl label="渐变强度" value={currentParticleRing.gradientColor?.proceduralIntensity ?? 1.0} min={0.1} max={5} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { gradientColor: { ...currentParticleRing.gradientColor, proceduralIntensity: v } })} />
                                </div>
                              )}
                            </div>
                            
                            {/* 漩涡效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">漩涡效果</span>
                                <button
                                  onClick={() => {
                                    const vortex = currentParticleRing.vortex || { enabled: false, armCount: 4, twist: 2, rotationSpeed: 0.5, radialDirection: 'static' as const, radialSpeed: 0.3, hardness: 0.5, colors: ['#ff6b6b', '#4ecdc4'] };
                                    updateParticleRing(currentParticleRing.id, { vortex: { ...vortex, enabled: !vortex.enabled } });
                                  }}
                                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                    currentParticleRing.vortex?.enabled
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {currentParticleRing.vortex?.enabled ? '已启用' : '已禁用'}
                                </button>
                              </div>
                              
                              {currentParticleRing.vortex?.enabled && (
                                <div className="space-y-2">
                                  <RangeControl label="旋臂数量" value={currentParticleRing.vortex?.armCount ?? 4} min={1} max={12} step={1} onChange={(v) => updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, armCount: v } })} />
                                  <RangeControl label="扭曲程度" value={currentParticleRing.vortex?.twist ?? 2} min={0} max={10} step={0.5} onChange={(v) => updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, twist: v } })} />
                                  <RangeControl label="硬边程度" value={currentParticleRing.vortex?.hardness ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, hardness: v } })} />
                                  
                                  {/* 漩涡颜色 */}
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-gray-400 text-xs">旋臂颜色</span>
                                      {(currentParticleRing.vortex?.colors?.length ?? 2) < 7 && (
                                        <button
                                          onClick={() => {
                                            const colors = [...(currentParticleRing.vortex?.colors || ['#ff6b6b', '#4ecdc4'])];
                                            colors.push('#ffd93d');
                                            updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, colors } });
                                          }}
                                          className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                                        >
                                          + 添加
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {(currentParticleRing.vortex?.colors || ['#ff6b6b', '#4ecdc4']).map((color, idx) => (
                                        <div key={idx} className="flex items-center gap-0.5">
                                          <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                              const colors = [...(currentParticleRing.vortex?.colors || ['#ff6b6b', '#4ecdc4'])];
                                              colors[idx] = e.target.value;
                                              updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, colors } });
                                            }}
                                            className="w-6 h-6 rounded cursor-pointer"
                                          />
                                          {(currentParticleRing.vortex?.colors?.length ?? 2) > 2 && (
                                            <button
                                              onClick={() => {
                                                const colors = [...(currentParticleRing.vortex?.colors || [])];
                                                colors.splice(idx, 1);
                                                updateParticleRing(currentParticleRing.id, { vortex: { ...currentParticleRing.vortex!, colors } });
                                              }}
                                              className="text-gray-500 hover:text-red-400 text-xs"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 丝线效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">丝线效果</span>
                                <button
                                  onClick={() => {
                                    const silk = currentParticleRing.silkEffect || { enabled: false, thicknessVariation: 0.5, dashPattern: 0.3, noiseStrength: 0.3, noiseFrequency: 1.0, ringCount: 5, ringSharpness: 0.7 };
                                    updateParticleRing(currentParticleRing.id, { silkEffect: { ...silk, enabled: !silk.enabled } });
                                  }}
                                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                    currentParticleRing.silkEffect?.enabled
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {currentParticleRing.silkEffect?.enabled ? '已启用' : '已禁用'}
                                </button>
                              </div>
                              
                              {currentParticleRing.silkEffect?.enabled && (
                                <div className="space-y-1">
                                  <RangeControl label="细环数量" value={currentParticleRing.silkEffect?.ringCount ?? 5} min={1} max={20} step={1} onChange={(v) => updateParticleRing(currentParticleRing.id, { silkEffect: { ...currentParticleRing.silkEffect!, ringCount: v } })} />
                                  <RangeControl label="环边锐度" value={currentParticleRing.silkEffect?.ringSharpness ?? 0.7} min={0} max={1} step={0.05} onChange={(v) => updateParticleRing(currentParticleRing.id, { silkEffect: { ...currentParticleRing.silkEffect!, ringSharpness: v } })} />
                                  <RangeControl label="粗细变化" value={currentParticleRing.silkEffect?.thicknessVariation ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { silkEffect: { ...currentParticleRing.silkEffect!, thicknessVariation: v } })} />
                                  <RangeControl label="噪声扰动" value={currentParticleRing.silkEffect?.noiseStrength ?? 0.3} min={0} max={1} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { silkEffect: { ...currentParticleRing.silkEffect!, noiseStrength: v } })} />
                                </div>
                              )}
                            </div>
                            
                            {/* 运动速度 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">运动速度</span>
                              <RangeControl label="公转速度" value={currentParticleRing.orbitSpeed} min={-2} max={2} step={0.02} onChange={(v) => updateParticleRing(currentParticleRing.id, { orbitSpeed: v })} />
                              <RangeControl label="自转速度" value={currentParticleRing.rotationSpeed ?? 0.3} min={-2} max={2} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { rotationSpeed: v })} />
                              <RangeControl label="起始相位" value={currentParticleRing.phaseOffset} min={0} max={360} step={15} onChange={(v) => updateParticleRing(currentParticleRing.id, { phaseOffset: v })} />
                              <RangeControl label="拖尾长度" value={currentParticleRing.trailLength ?? 0} min={0} max={1} step={0.1} onChange={(v) => updateParticleRing(currentParticleRing.id, { trailLength: v })} />
                            </div>
                            
                            {/* 姿态设置 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">姿态设置</span>
                              <TiltPresetSelector tilt={currentParticleRing.tilt} onChange={(tilt) => updateParticleRing(currentParticleRing.id, { tilt })} />
                              <OrbitAxisSelector orbitAxis={currentParticleRing.orbitAxis ?? DEFAULT_ORBIT_AXIS_SETTINGS} onChange={(orbitAxis) => updateParticleRing(currentParticleRing.id, { orbitAxis })} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* ===== 环带 Tab ===== */}
                    {ringSubTab === 'continuous' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.rings.continuousRings}
                          selectedId={effectiveSelectedContinuousRingId}
                          onSelect={(id) => setSelectedContinuousRingId(id)}
                          onToggleEnabled={(id, enabled) => updateContinuousRing(id, { enabled })}
                          onRename={(id, name) => updateContinuousRing(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.rings.continuousRings.filter(r => r.id !== id);
                            updatePlanet({ rings: { ...planet.rings, continuousRings: updated } });
                            if (effectiveSelectedContinuousRingId === id) setSelectedContinuousRingId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newRing = createDefaultContinuousRing(id, `环带 ${planet.rings.continuousRings.length + 1}`);
                            updatePlanet({ rings: { ...planet.rings, continuousRings: [...planet.rings.continuousRings, newRing] } });
                            setSelectedContinuousRingId(id);
                          }}
                          globalEnabled={planet.rings.continuousRingsEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ rings: { ...planet.rings, continuousRingsEnabled: enabled } })}
                          soloId={planet.rings.continuousRingsSoloId}
                          onSoloToggle={(id) => updatePlanet({ rings: { ...planet.rings, continuousRingsSoloId: id } })}
                          title="环带"
                          titleColor="text-purple-400"
                          addButtonColor="bg-purple-600 hover:bg-purple-500"
                          emptyText="暂无环带"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.continuousRing}
                          builtInPresets={[
                            { id: 'pure', name: '💎 纯净光环', data: CONTINUOUS_RING_PRESETS.pure },
                            { id: 'metallic', name: '🔩 拉丝金属', data: CONTINUOUS_RING_PRESETS.metallic },
                            { id: 'vortex', name: '🌀 漩涡星云', data: CONTINUOUS_RING_PRESETS.vortex },
                          ]}
                          currentData={currentContinuousRing ? { ...currentContinuousRing, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentContinuousRing}
                          instanceName="环带"
                          onApplyToInstance={(data) => {
                            if (currentContinuousRing) {
                              updateContinuousRing(currentContinuousRing.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newRing = {
                              ...createDefaultContinuousRing(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.rings.continuousRings.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ rings: { ...planet.rings, continuousRings: [...planet.rings.continuousRings, newRing] } });
                            setSelectedContinuousRingId(id);
                          }}
                          title="预设"
                          accentColor="purple"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.continuousRing} moduleName="continuousRing" builtInPresets={[
                            { id: 'pure', name: '💎 纯净光环', data: CONTINUOUS_RING_PRESETS.pure },
                            { id: 'metallic', name: '🔩 拉丝金属', data: CONTINUOUS_RING_PRESETS.metallic },
                            { id: 'vortex', name: '🌀 漩涡星云', data: CONTINUOUS_RING_PRESETS.vortex },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.continuousRing} moduleName="continuousRing" />
                        </div>
                        
                        {currentContinuousRing && (
                          <div className="mt-3 space-y-2">
                            {/* 几何参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">几何参数</span>
                              <RangeControl label="内半径" value={currentContinuousRing.absoluteInnerRadius} min={60} max={1000} step={10} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { absoluteInnerRadius: v })} />
                              <RangeControl label="外半径" value={currentContinuousRing.absoluteOuterRadius} min={60} max={1000} step={10} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { absoluteOuterRadius: v })} />
                              <RangeControl label="离心率" value={currentContinuousRing.eccentricity} min={0} max={0.9} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { eccentricity: v })} />
                            </div>
                            
                            {/* 视觉效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">视觉效果</span>
                              <RangeControl label="透明度" value={currentContinuousRing.opacity} min={0.1} max={1} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { opacity: v })} />
                              <RangeControl label="亮度" value={currentContinuousRing.brightness || 1.0} min={0.5} max={3.0} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { brightness: v })} />
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-gray-400 text-xs">透明度渐变:</span>
                                <select value={currentContinuousRing.opacityGradient} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { opacityGradient: e.target.value as RingOpacityGradient })} className="flex-1 px-2 py-1 bg-gray-700 rounded text-white text-xs cursor-pointer">
                                  <option value="none">无</option>
                                  <option value="fadeIn">渐入（内→外）</option>
                                  <option value="fadeOut">渐出（外→内）</option>
                                  <option value="fadeBoth">两端渐变</option>
                                </select>
                              </div>
                              {currentContinuousRing.opacityGradient !== 'none' && (
                                <RangeControl label="渐变强度" value={currentContinuousRing.opacityGradientStrength ?? 0.5} min={0.1} max={1} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { opacityGradientStrength: v })} />
                              )}
                            </div>
                            
                            {/* 颜色模式 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">颜色模式</span>
                              <div className="grid grid-cols-4 gap-1 mb-2">
                                {[
                                  { id: 'none', label: '单色' },
                                  { id: 'twoColor', label: '双色' },
                                  { id: 'threeColor', label: '三色' },
                                  { id: 'procedural', label: '混色' }
                                ].map(m => (
                                  <button
                                    key={m.id}
                                    onClick={() => setContinuousRingColorMode(m.id)}
                                    className={`px-1 py-1 text-[10px] rounded transition-colors ${
                                      getColorMode(currentContinuousRing.gradientColor) === m.id
                                        ? 'bg-purple-600 text-white'
                                        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                    }`}
                                  >
                                    {m.label}
                                  </button>
                                ))}
                              </div>
                              
                              {/* 单色模式 */}
                              {getColorMode(currentContinuousRing.gradientColor) === 'none' && (
                                <div className="flex items-center gap-2">
                                  <span className="text-xs text-gray-400">颜色</span>
                                  <input type="color" value={currentContinuousRing.color} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { color: e.target.value })} className="w-10 h-6 rounded cursor-pointer" />
                                </div>
                              )}
                              
                              {/* 双色渐变 */}
                              {getColorMode(currentContinuousRing.gradientColor) === 'twoColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-2 items-center justify-center">
                                    <input type="color" value={currentContinuousRing.gradientColor?.colors?.[0] || currentContinuousRing.color} onChange={(e) => { const colors = [...(currentContinuousRing.gradientColor?.colors || [])]; colors[0] = e.target.value; updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colors } }); }} className="w-10 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-400">→</span>
                                    <input type="color" value={currentContinuousRing.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentContinuousRing.gradientColor?.colors || [])]; colors[1] = e.target.value; updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colors } }); }} className="w-10 h-6 rounded cursor-pointer" />
                                  </div>
                                  <select value={currentContinuousRing.gradientColor?.direction || 'radial'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                    <option value="radial">径向（中心→外）</option>
                                    <option value="linearX">X轴线性</option>
                                    <option value="linearY">Y轴线性</option>
                                    <option value="linearZ">Z轴线性</option>
                                    <option value="linearCustom">自定义方向</option>
                                    <option value="spiral">螺旋</option>
                                  </select>
                                  {currentContinuousRing.gradientColor?.direction === 'linearCustom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">方向:</span>
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.x ?? 1} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.y ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.z ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  {currentContinuousRing.gradientColor?.direction === 'spiral' && (
                                    <div className="flex gap-2 items-center text-xs">
                                      <span className="text-gray-400">旋转轴</span>
                                      <select value={currentContinuousRing.gradientColor?.spiralAxis || 'y'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, spiralAxis: e.target.value as any } })} className="bg-gray-700 rounded px-1 py-0.5 text-white cursor-pointer">
                                        <option value="x">X</option>
                                        <option value="y">Y</option>
                                        <option value="z">Z</option>
                                      </select>
                                      <span className="text-gray-400">圈数</span>
                                      <input type="number" value={currentContinuousRing.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, spiralDensity: parseFloat(e.target.value) || 2 } })} className="w-12 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  <RangeControl label="过渡强度" value={currentContinuousRing.gradientColor?.blendStrength ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, blendStrength: v } })} />
                                </div>
                              )}
                              
                              {/* 三色渐变 */}
                              {getColorMode(currentContinuousRing.gradientColor) === 'threeColor' && (
                                <div className="space-y-2">
                                  <div className="flex gap-1 items-center justify-center">
                                    <input type="color" value={currentContinuousRing.gradientColor?.colors?.[0] || currentContinuousRing.color} onChange={(e) => { const colors = [...(currentContinuousRing.gradientColor?.colors || [])]; colors[0] = e.target.value; updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentContinuousRing.gradientColor?.colors?.[1] || '#4ecdc4'} onChange={(e) => { const colors = [...(currentContinuousRing.gradientColor?.colors || [])]; colors[1] = e.target.value; updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                    <span className="text-gray-500">→</span>
                                    <input type="color" value={currentContinuousRing.gradientColor?.colors?.[2] || '#ffd93d'} onChange={(e) => { const colors = [...(currentContinuousRing.gradientColor?.colors || [])]; colors[2] = e.target.value; updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colors } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                  </div>
                                  <RangeControl label="中间色位置" value={currentContinuousRing.gradientColor?.colorMidPosition ?? 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colorMidPosition: v } })} />
                                  <RangeControl label="中间色宽度" value={currentContinuousRing.gradientColor?.colorMidWidth ?? 0} min={0} max={5} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, colorMidWidth: v } })} />
                                  <select value={currentContinuousRing.gradientColor?.direction || 'radial'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, direction: e.target.value as any } })} className="w-full text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                    <option value="radial">径向（中心→外）</option>
                                    <option value="linearX">X轴线性</option>
                                    <option value="linearY">Y轴线性</option>
                                    <option value="linearZ">Z轴线性</option>
                                    <option value="linearCustom">自定义方向</option>
                                    <option value="spiral">螺旋</option>
                                  </select>
                                  {currentContinuousRing.gradientColor?.direction === 'linearCustom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">方向:</span>
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.x ?? 1} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.y ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.directionCustom?.z ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, directionCustom: { ...(currentContinuousRing.gradientColor?.directionCustom || {x:1,y:0,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  {currentContinuousRing.gradientColor?.direction === 'spiral' && (
                                    <div className="flex gap-2 items-center text-xs">
                                      <span className="text-gray-400">旋转轴</span>
                                      <select value={currentContinuousRing.gradientColor?.spiralAxis || 'y'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, spiralAxis: e.target.value as any } })} className="bg-gray-700 rounded px-1 py-0.5 text-white cursor-pointer">
                                        <option value="x">X</option>
                                        <option value="y">Y</option>
                                        <option value="z">Z</option>
                                      </select>
                                      <span className="text-gray-400">圈数</span>
                                      <input type="number" value={currentContinuousRing.gradientColor?.spiralDensity ?? 2} min={0.5} max={10} step={0.5} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, spiralDensity: parseFloat(e.target.value) || 2 } })} className="w-12 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  <RangeControl label="过渡强度" value={currentContinuousRing.gradientColor?.blendStrength ?? 1.0} min={0} max={1} step={0.05} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, blendStrength: v } })} />
                                </div>
                              )}
                              
                              {/* 混色模式 */}
                              {getColorMode(currentContinuousRing.gradientColor) === 'procedural' && (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-400">基础色</span>
                                    <input type="color" value={currentContinuousRing.color} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { color: e.target.value })} className="w-10 h-6 rounded cursor-pointer" />
                                  </div>
                                  <div className="flex gap-2 items-center">
                                    <span className="text-xs text-gray-400">混色轴向</span>
                                    <select value={currentContinuousRing.gradientColor?.proceduralAxis || 'y'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, proceduralAxis: e.target.value as any } })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                      <option value="x">X轴</option>
                                      <option value="y">Y轴</option>
                                      <option value="z">Z轴</option>
                                      <option value="custom">自定义</option>
                                    </select>
                                  </div>
                                  {currentContinuousRing.gradientColor?.proceduralAxis === 'custom' && (
                                    <div className="flex gap-1 items-center text-xs">
                                      <span className="text-gray-500">轴向:</span>
                                      <input type="number" value={currentContinuousRing.gradientColor?.proceduralCustomAxis?.x ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, proceduralCustomAxis: { ...(currentContinuousRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), x: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.proceduralCustomAxis?.y ?? 1} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, proceduralCustomAxis: { ...(currentContinuousRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), y: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                      <input type="number" value={currentContinuousRing.gradientColor?.proceduralCustomAxis?.z ?? 0} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, proceduralCustomAxis: { ...(currentContinuousRing.gradientColor?.proceduralCustomAxis || {x:0,y:1,z:0}), z: parseFloat(e.target.value) || 0 } } })} className="w-10 bg-gray-700 rounded px-1 text-white text-center" />
                                    </div>
                                  )}
                                  <RangeControl label="渐变强度" value={currentContinuousRing.gradientColor?.proceduralIntensity ?? 1.0} min={0.1} max={5} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { gradientColor: { ...currentContinuousRing.gradientColor, proceduralIntensity: v } })} />
                                </div>
                              )}
                            </div>
                            
                            {/* 漩涡效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">漩涡效果</span>
                                <button
                                  onClick={() => {
                                    const vortex = currentContinuousRing.vortex || { enabled: false, armCount: 4, twist: 2, rotationSpeed: 0.5, radialDirection: 'static' as const, radialSpeed: 0.3, hardness: 0.5, colors: ['#ff6b6b', '#4ecdc4'] };
                                    updateContinuousRing(currentContinuousRing.id, { vortex: { ...vortex, enabled: !vortex.enabled } });
                                  }}
                                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                    currentContinuousRing.vortex?.enabled
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {currentContinuousRing.vortex?.enabled ? '已启用' : '已禁用'}
                                </button>
                              </div>
                              
                              {currentContinuousRing.vortex?.enabled && (
                                <div className="space-y-2">
                                  <RangeControl label="旋臂数量" value={currentContinuousRing.vortex?.armCount ?? 4} min={1} max={12} step={1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, armCount: v } })} />
                                  <RangeControl label="扭曲程度" value={currentContinuousRing.vortex?.twist ?? 2} min={0} max={10} step={0.5} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, twist: v } })} />
                                  <RangeControl label="旋转速度" value={currentContinuousRing.vortex?.rotationSpeed ?? 0.5} min={-2} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, rotationSpeed: v } })} />
                                  <div className="flex items-center gap-2">
                                    <span className="text-gray-400 text-xs">收缩方向:</span>
                                    <select value={currentContinuousRing.vortex?.radialDirection || 'static'} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, radialDirection: e.target.value as 'inward' | 'outward' | 'static' } })} className="flex-1 px-2 py-1 bg-gray-700 rounded text-white text-xs cursor-pointer">
                                      <option value="static">静止</option>
                                      <option value="inward">向内收缩</option>
                                      <option value="outward">向外扩散</option>
                                    </select>
                                  </div>
                                  {currentContinuousRing.vortex?.radialDirection !== 'static' && (
                                    <RangeControl label="收缩速度" value={currentContinuousRing.vortex?.radialSpeed ?? 0.3} min={0} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, radialSpeed: v } })} />
                                  )}
                                  <RangeControl label="硬边程度" value={currentContinuousRing.vortex?.hardness ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, hardness: v } })} />
                                  
                                  {/* 漩涡颜色 */}
                                  <div className="mt-2">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-gray-400 text-xs">旋臂颜色</span>
                                      {(currentContinuousRing.vortex?.colors?.length ?? 2) < 7 && (
                                        <button
                                          onClick={() => {
                                            const colors = [...(currentContinuousRing.vortex?.colors || ['#ff6b6b', '#4ecdc4'])];
                                            colors.push('#ffd93d');
                                            updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, colors } });
                                          }}
                                          className="px-1.5 py-0.5 text-[10px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                                        >
                                          + 添加
                                        </button>
                                      )}
                                    </div>
                                    <div className="flex flex-wrap gap-1">
                                      {(currentContinuousRing.vortex?.colors || ['#ff6b6b', '#4ecdc4']).map((color, idx) => (
                                        <div key={idx} className="flex items-center gap-0.5">
                                          <input
                                            type="color"
                                            value={color}
                                            onChange={(e) => {
                                              const colors = [...(currentContinuousRing.vortex?.colors || ['#ff6b6b', '#4ecdc4'])];
                                              colors[idx] = e.target.value;
                                              updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, colors } });
                                            }}
                                            className="w-6 h-6 rounded cursor-pointer"
                                          />
                                          {(currentContinuousRing.vortex?.colors?.length ?? 2) > 2 && (
                                            <button
                                              onClick={() => {
                                                const colors = [...(currentContinuousRing.vortex?.colors || [])];
                                                colors.splice(idx, 1);
                                                updateContinuousRing(currentContinuousRing.id, { vortex: { ...currentContinuousRing.vortex!, colors } });
                                              }}
                                              className="text-gray-500 hover:text-red-400 text-xs"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 显隐效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">显隐效果</span>
                                <button
                                  onClick={() => {
                                    const vis = currentContinuousRing.visibilityEffect || { enabled: false, zones: [{ startAngle: 0, endAngle: 180 }], fadeAngle: 15, dynamicRotation: false, rotationSpeed: 0.5 };
                                    updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...vis, enabled: !vis.enabled } });
                                  }}
                                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                    currentContinuousRing.visibilityEffect?.enabled
                                      ? 'bg-purple-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {currentContinuousRing.visibilityEffect?.enabled ? '已启用' : '已禁用'}
                                </button>
                              </div>
                              
                              {currentContinuousRing.visibilityEffect?.enabled && (
                                <div className="space-y-2">
                                  {/* 显示区域列表 */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] text-gray-500">显示区域</span>
                                      {(currentContinuousRing.visibilityEffect?.zones?.length ?? 1) < 4 && (
                                        <button
                                          onClick={() => {
                                            const zones = [...(currentContinuousRing.visibilityEffect?.zones || [])];
                                            zones.push({ startAngle: 0, endAngle: 90 });
                                            updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, zones } });
                                          }}
                                          className="px-1 py-0.5 text-[9px] bg-gray-700 text-gray-300 rounded hover:bg-gray-600"
                                        >
                                          + 区域
                                        </button>
                                      )}
                                    </div>
                                    {(currentContinuousRing.visibilityEffect?.zones || [{ startAngle: 0, endAngle: 180 }]).map((zone, idx) => (
                                      <div key={idx} className="flex items-center gap-1 text-[10px]">
                                        <input type="number" value={zone.startAngle} min={0} max={360} onChange={(e) => {
                                          const zones = [...(currentContinuousRing.visibilityEffect?.zones || [])];
                                          zones[idx] = { ...zones[idx], startAngle: parseFloat(e.target.value) || 0 };
                                          updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, zones } });
                                        }} className="w-12 bg-gray-700 rounded px-1 py-0.5 text-white text-center" />
                                        <span className="text-gray-500">→</span>
                                        <input type="number" value={zone.endAngle} min={0} max={360} onChange={(e) => {
                                          const zones = [...(currentContinuousRing.visibilityEffect?.zones || [])];
                                          zones[idx] = { ...zones[idx], endAngle: parseFloat(e.target.value) || 0 };
                                          updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, zones } });
                                        }} className="w-12 bg-gray-700 rounded px-1 py-0.5 text-white text-center" />
                                        <span className="text-gray-500">°</span>
                                        {(currentContinuousRing.visibilityEffect?.zones?.length ?? 1) > 1 && (
                                          <button
                                            onClick={() => {
                                              const zones = [...(currentContinuousRing.visibilityEffect?.zones || [])];
                                              zones.splice(idx, 1);
                                              updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, zones } });
                                            }}
                                            className="text-gray-500 hover:text-red-400"
                                          >×</button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                  <RangeControl label="渐变角度" value={currentContinuousRing.visibilityEffect?.fadeAngle ?? 15} min={0} max={90} step={5} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, fadeAngle: v } })} />
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">动态旋转</span>
                                    <input type="checkbox" checked={currentContinuousRing.visibilityEffect?.dynamicRotation ?? false} onChange={(e) => updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, dynamicRotation: e.target.checked } })} className="w-3 h-3" />
                                  </div>
                                  {currentContinuousRing.visibilityEffect?.dynamicRotation && (
                                    <RangeControl label="旋转速度" value={currentContinuousRing.visibilityEffect?.rotationSpeed ?? 0.5} min={-2} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { visibilityEffect: { ...currentContinuousRing.visibilityEffect!, rotationSpeed: v } })} />
                                  )}
                                </div>
                              )}
                            </div>
                            
                            {/* 拉丝效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center justify-between mb-2">
                                <span className="text-xs text-gray-400">拉丝效果</span>
                                <button
                                  onClick={() => {
                                    const streak = currentContinuousRing.streakMode || { enabled: false, flowSpeed: 0.5, stripeCount: 12, radialStretch: 8, edgeSharpness: 0.3, distortion: 0.5, noiseScale: 1.0, flowDirection: 'cw' as const, brightness: 1.5 };
                                    updateContinuousRing(currentContinuousRing.id, { streakMode: { ...streak, enabled: !streak.enabled } });
                                  }}
                                  className={`px-2 py-0.5 text-[10px] rounded transition-colors ${
                                    currentContinuousRing.streakMode?.enabled
                                      ? 'bg-orange-600 text-white'
                                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                  }`}
                                >
                                  {currentContinuousRing.streakMode?.enabled ? '已启用' : '已禁用'}
                                </button>
                              </div>
                              
                              {currentContinuousRing.streakMode?.enabled && (
                                <div className="space-y-1">
                                  <RangeControl label="流动速度" value={currentContinuousRing.streakMode?.flowSpeed ?? 0.5} min={0.1} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, flowSpeed: v } })} />
                                  <RangeControl label="条纹数量" value={currentContinuousRing.streakMode?.stripeCount ?? 12} min={4} max={30} step={1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, stripeCount: v } })} />
                                  <RangeControl label="径向拉伸" value={currentContinuousRing.streakMode?.radialStretch ?? 8} min={1} max={20} step={1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, radialStretch: v } })} />
                                  <RangeControl label="脊线锐度" value={currentContinuousRing.streakMode?.edgeSharpness ?? 0.3} min={0} max={1} step={0.05} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, edgeSharpness: v } })} />
                                  <RangeControl label="扭曲强度" value={currentContinuousRing.streakMode?.distortion ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, distortion: v } })} />
                                  <RangeControl label="噪声缩放" value={currentContinuousRing.streakMode?.noiseScale ?? 1.0} min={0.5} max={3} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, noiseScale: v } })} />
                                  <RangeControl label="整体亮度" value={currentContinuousRing.streakMode?.brightness ?? 1.5} min={0.5} max={3} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, brightness: v } })} />
                                  <div className="flex items-center justify-between">
                                    <span className="text-[10px] text-gray-500">流动方向</span>
                                    <select
                                      value={currentContinuousRing.streakMode?.flowDirection ?? 'cw'}
                                      onChange={(e) => updateContinuousRing(currentContinuousRing.id, { streakMode: { ...currentContinuousRing.streakMode!, flowDirection: e.target.value as 'cw' | 'ccw' } })}
                                      className="bg-gray-700 text-white text-[10px] rounded px-1 py-0.5"
                                    >
                                      <option value="cw">顺时针</option>
                                      <option value="ccw">逆时针</option>
                                    </select>
                                  </div>
                                </div>
                              )}
                            </div>
                            
                            {/* 运动速度 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">运动速度</span>
                              <RangeControl label="公转速度" value={currentContinuousRing.orbitSpeed} min={-2} max={2} step={0.02} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { orbitSpeed: v })} />
                              <RangeControl label="自转速度" value={currentContinuousRing.rotationSpeed ?? 0.1} min={-2} max={2} step={0.1} onChange={(v) => updateContinuousRing(currentContinuousRing.id, { rotationSpeed: v })} />
                            </div>
                            
                            {/* 姿态设置 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">姿态设置</span>
                              <TiltPresetSelector tilt={currentContinuousRing.tilt} onChange={(tilt) => updateContinuousRing(currentContinuousRing.id, { tilt })} />
                              <OrbitAxisSelector orbitAxis={currentContinuousRing.orbitAxis ?? DEFAULT_ORBIT_AXIS_SETTINGS} onChange={(orbitAxis) => updateContinuousRing(currentContinuousRing.id, { orbitAxis })} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* ===== 螺旋环 Tab ===== */}
                    {ringSubTab === 'spiral' && (() => {
                      const flameSystem = planet.flameSystem || DEFAULT_FLAME_SYSTEM;
                      const spiralFlames = flameSystem.spiralFlames || [];
                      const effectiveSpiralId = spiralFlames[0]?.id || null;
                      const currentSpiral = spiralFlames.find(s => s.id === effectiveSpiralId);
                      
                      const updateSpiral = (id: string, updates: Partial<SpiralFlameSettings>) => {
                        const updated = spiralFlames.map(s => s.id === id ? { ...s, ...updates } : s);
                        updatePlanet({ flameSystem: { ...flameSystem, spiralFlames: updated } });
                      };
                      
                      const addSpiral = (presetId: string) => {
                        const preset = SPIRAL_FLAME_PRESETS[presetId as keyof typeof SPIRAL_FLAME_PRESETS] || {};
                        const name = presetId === 'tornado' ? '龙卷风' : presetId === 'galaxy' ? '星系旋臂' : presetId === 'dna' ? 'DNA螺旋' : presetId === 'vortex' ? '漩涡' : '自定义';
                        const newSpiral: SpiralFlameSettings = { ...createDefaultSpiralFlame(`spiral_${Date.now()}`, `${name} ${spiralFlames.length + 1}`), ...preset, enabled: true };
                        updatePlanet({ flameSystem: { ...flameSystem, spiralFlames: [...spiralFlames, newSpiral] } });
                      };
                      
                      return (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector items={spiralFlames.map(s => ({ id: s.id, name: s.name, enabled: s.enabled }))} selectedId={effectiveSpiralId} onSelect={() => {}} onToggleEnabled={(id, e) => updateSpiral(id, { enabled: e })} onRename={(id, n) => updateSpiral(id, { name: n })} onDelete={(id) => updatePlanet({ flameSystem: { ...flameSystem, spiralFlames: spiralFlames.filter(s => s.id !== id) } })} onAdd={() => addSpiral('custom')} globalEnabled={spiralEnabled} onGlobalToggle={(e) => updatePlanet({ flameSystem: { ...flameSystem, spiralFlamesEnabled: e } })} title="螺旋环" titleColor="text-blue-400" addButtonColor="bg-blue-600 hover:bg-blue-500" emptyText="暂无螺旋环" />
                        
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.spiralFlame}
                          builtInPresets={[
                            { id: 'tornado', name: '🌪️ 龙卷', data: SPIRAL_FLAME_PRESETS.tornado },
                            { id: 'galaxy', name: '🌌 星系', data: SPIRAL_FLAME_PRESETS.galaxy },
                            { id: 'dna', name: '🧬 DNA', data: SPIRAL_FLAME_PRESETS.dna },
                            { id: 'vortex', name: '🌀 漩涡', data: SPIRAL_FLAME_PRESETS.vortex },
                          ]}
                          currentData={currentSpiral ? { ...currentSpiral, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentSpiral}
                          instanceName="螺旋环"
                          onApplyToInstance={(data) => {
                            if (currentSpiral) {
                              updateSpiral(currentSpiral.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const count = spiralFlames.length + 1;
                            const newSpiral: SpiralFlameSettings = { ...createDefaultSpiralFlame(`spiral_${Date.now()}`, `${presetName.replace(/^[^\s]+\s/, '')} ${count}`), ...data, enabled: true };
                            updatePlanet({ flameSystem: { ...flameSystem, spiralFlames: [...spiralFlames, newSpiral] } });
                          }}
                          title="预设"
                          accentColor="blue"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.spiralFlame} moduleName="spiralFlame" builtInPresets={[
                            { id: 'tornado', name: '🌪️ 龙卷', data: SPIRAL_FLAME_PRESETS.tornado },
                            { id: 'galaxy', name: '🌌 星系', data: SPIRAL_FLAME_PRESETS.galaxy },
                            { id: 'dna', name: '🧬 DNA', data: SPIRAL_FLAME_PRESETS.dna },
                            { id: 'vortex', name: '🌀 漩涡', data: SPIRAL_FLAME_PRESETS.vortex },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.spiralFlame} moduleName="spiralFlame" />
                        </div>
                        
                        {currentSpiral && (<>
                          <div className="mb-2 p-1.5 bg-blue-600/30 rounded flex items-center justify-between">
                            <span className="text-xs text-blue-300">编辑: {currentSpiral.name}</span>
                            <SavePresetButton
                              storageKey={PRESET_STORAGE_KEYS.spiralFlame}
                              currentData={currentSpiral}
                              defaultName={currentSpiral.name}
                              accentColor="blue"
                            />
                          </div>
                          
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">螺旋结构</span>
                            <RangeControl label="螺旋条数" value={currentSpiral.spiralCount} min={1} max={6} step={1} onChange={(v) => updateSpiral(currentSpiral.id, { spiralCount: v })} />
                            <div className="grid grid-cols-3 gap-1">
                              {[{ id: 'cw', l: '顺时针' }, { id: 'ccw', l: '逆时针' }, { id: 'both', l: '双向' }].map(d => (
                                <button key={d.id} onClick={() => updateSpiral(currentSpiral.id, { direction: d.id as any })} className={`px-1 py-0.5 text-[10px] rounded ${currentSpiral.direction === d.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{d.l}</button>
                              ))}
                            </div>
                          </div>
                          
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">几何参数</span>
                            <RangeControl label="起始半径" value={currentSpiral.startRadius} min={1.0} max={3.0} step={0.05} onChange={(v) => updateSpiral(currentSpiral.id, { startRadius: v })} />
                            <RangeControl label="终止半径" value={currentSpiral.endRadius} min={1.0} max={3.0} step={0.05} onChange={(v) => updateSpiral(currentSpiral.id, { endRadius: v })} />
                            <RangeControl label="螺旋高度" value={currentSpiral.height} min={50} max={500} step={10} onChange={(v) => updateSpiral(currentSpiral.id, { height: v })} />
                            <RangeControl label="螺距" value={currentSpiral.pitch} min={0.1} max={2} step={0.1} onChange={(v) => updateSpiral(currentSpiral.id, { pitch: v })} />
                            <RangeControl label="带宽" value={currentSpiral.thickness} min={0.02} max={0.3} step={0.01} onChange={(v) => updateSpiral(currentSpiral.id, { thickness: v })} />
                          </div>
                          
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">动态参数</span>
                            <RangeControl label="旋转速度" value={currentSpiral.rotationSpeed} min={0} max={3} step={0.1} onChange={(v) => updateSpiral(currentSpiral.id, { rotationSpeed: v })} />
                            <RangeControl label="上升速度" value={currentSpiral.riseSpeed} min={-1} max={2} step={0.1} onChange={(v) => updateSpiral(currentSpiral.id, { riseSpeed: v })} />
                            <RangeControl label="粒子数量" value={currentSpiral.particleCount} min={200} max={3000} step={100} onChange={(v) => updateSpiral(currentSpiral.id, { particleCount: v })} />
                            <RangeControl label="粒子大小" value={currentSpiral.particleSize ?? 4} min={1} max={10} step={0.5} onChange={(v) => updateSpiral(currentSpiral.id, { particleSize: v })} />
                          </div>
                          
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">视觉效果</span>
                            <RangeControl label="透明度" value={currentSpiral.opacity} min={0} max={1} step={0.05} onChange={(v) => updateSpiral(currentSpiral.id, { opacity: v })} />
                            <RangeControl label="发光强度" value={currentSpiral.emissive} min={0} max={5} step={0.1} onChange={(v) => updateSpiral(currentSpiral.id, { emissive: v })} />
                            <RangeControl label="Bloom增强" value={currentSpiral.bloomBoost} min={0} max={3} step={0.1} onChange={(v) => updateSpiral(currentSpiral.id, { bloomBoost: v })} />
                          </div>
                          
                          <div className="p-2 bg-gray-800/50 rounded mb-2">
                            <span className="text-xs text-gray-400 block mb-2">颜色设置</span>
                            {(() => {
                              const sc = currentSpiral.color || { mode: 'twoColor' as const, baseColor: '#9900ff', colors: ['#9900ff', '#ff00ff'], colorMidPosition: 0.5, proceduralIntensity: 1.0 };
                              const updateSpiralColor = (u: Partial<typeof sc>) => updateSpiral(currentSpiral.id, { color: { ...sc, ...u } as any });
                              return (<>
                                <div className="grid grid-cols-4 gap-1 mb-2">
                                  {[{ id: 'none', l: '单色' }, { id: 'twoColor', l: '双色' }, { id: 'threeColor', l: '三色' }, { id: 'procedural', l: '混色' }].map(m => (
                                    <button key={m.id} onClick={() => updateSpiralColor({ mode: m.id as any })} className={`px-1 py-0.5 text-[10px] rounded ${sc.mode === m.id ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{m.l}</button>
                                  ))}
                                </div>
                                {sc.mode === 'none' && <div className="flex items-center gap-2"><span className="text-xs text-gray-400">基础色</span><input type="color" value={sc.baseColor || '#9900ff'} onChange={(e) => updateSpiralColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" /></div>}
                                {sc.mode === 'twoColor' && <div className="flex gap-2 items-center justify-center"><input type="color" value={sc.colors?.[0] || '#9900ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[0] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-10 h-6 rounded cursor-pointer" /><span className="text-gray-400">→</span><input type="color" value={sc.colors?.[1] || '#ff00ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[1] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-10 h-6 rounded cursor-pointer" /></div>}
                                {sc.mode === 'threeColor' && <><div className="flex gap-1 items-center justify-center"><input type="color" value={sc.colors?.[0] || '#0088ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[0] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><span className="text-gray-500">→</span><input type="color" value={sc.colors?.[1] || '#9900ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[1] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><span className="text-gray-500">→</span><input type="color" value={sc.colors?.[2] || '#ff00ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[2] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /></div><RangeControl label="中间色位置" value={sc.colorMidPosition || 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateSpiralColor({ colorMidPosition: v })} /></>}
                                {sc.mode === 'procedural' && <><div className="flex gap-2 items-center justify-center"><input type="color" value={sc.colors?.[0] || '#9900ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[0] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><input type="color" value={sc.colors?.[1] || '#00ffff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[1] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><input type="color" value={sc.colors?.[2] || '#ff00ff'} onChange={(e) => { const c = [...(sc.colors || [])]; c[2] = e.target.value; updateSpiralColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /></div><RangeControl label="混色强度" value={sc.proceduralIntensity || 1.0} min={0.1} max={3} step={0.1} onChange={(v) => updateSpiralColor({ proceduralIntensity: v })} /></>}
                              </>);
                            })()}
                          </div>
                          
                                                  </>)}
                      </div>
                      );
                    })()}
                  </ControlGroup>
                  );
                })()}
                
                {/* ===== 残影 子Tab ===== */}
                {planetSubTab === 'afterimage' && (() => {
                  // 新版残影系统
                  const afterimageSystem = planet.afterimageSystem || DEFAULT_AFTERIMAGE_SYSTEM;
                  const zones = afterimageSystem.zones || [];
                  const currentZone = zones[0];
                  const particles = afterimageSystem.particles;
                  const texture = afterimageSystem.texture;
                  
                  // 构建核心选项列表
                  const coreOptions: { id: string; name: string; type: 'particle' | 'solid' }[] = [];
                  planet.coreSystem.cores.forEach(c => {
                    if (c.enabled) coreOptions.push({ id: c.id, name: c.name, type: 'particle' });
                  });
                  (planet.coreSystem.solidCores || []).forEach(c => {
                    if (c.enabled) coreOptions.push({ id: c.id, name: c.name, type: 'solid' });
                  });
                  
                  const updateAfterimage = (updates: Partial<AfterimageSystemSettings>) => {
                    updatePlanet({ afterimageSystem: { ...afterimageSystem, ...updates } });
                  };
                  
                  const updateZone = (id: string, updates: Partial<AfterimageZoneSettings>) => {
                    const updated = zones.map(z => z.id === id ? { ...z, ...updates } : z);
                    updateAfterimage({ zones: updated });
                  };
                  
                  const addZone = () => {
                    const newZone = createDefaultAfterimageZone(`zone_${Date.now()}`, `区域 ${zones.length + 1}`);
                    updateAfterimage({ zones: [...zones, newZone] });
                  };
                  
                  return (
                  <ControlGroup title="残影系统" rightContent={
                    <button
                      onClick={() => updateAfterimage({ enabled: !afterimageSystem.enabled })}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        afterimageSystem.enabled 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-400 border-2 border-red-500/70'
                      }`}
                    >
                      {afterimageSystem.enabled ? '已启用' : '已禁用'}
                    </button>
                  }>
                    <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                      {/* 绑定核心选择 */}
                      {coreOptions.length > 0 && (
                        <div className="mb-3 p-2 bg-gray-800/50 rounded">
                          <span className="text-xs text-gray-400 block mb-1">绑定核心</span>
                          <select
                            value={afterimageSystem.bindToCoreId || ''}
                            onChange={(e) => updateAfterimage({ bindToCoreId: e.target.value || undefined })}
                            className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5"
                          >
                            <option value="">自动（第一个启用的核心）</option>
                            {coreOptions.map(opt => (
                              <option key={opt.id} value={opt.id}>
                                {opt.name} ({opt.type === 'particle' ? '粒子' : '实体'})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      
                      {/* 子Tab 切换 */}
                      <div className="flex gap-1 mb-3">
                        <button
                          onClick={() => setAfterimageSubTab('texture')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                            afterimageSubTab === 'texture'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          流动纹理
                        </button>
                        <button
                          onClick={() => setAfterimageSubTab('particles')}
                          className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                            afterimageSubTab === 'particles'
                              ? 'bg-purple-600 text-white'
                              : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                          }`}
                        >
                          发散粒子
                        </button>
                      </div>
                      
                      {/* 区域列表 */}
                      <FloatingListSelector 
                        items={zones.map(z => ({ id: z.id, name: z.name, enabled: z.enabled }))} 
                        selectedId={currentZone?.id || null} 
                        onSelect={() => {}} 
                        onToggleEnabled={(id, e) => updateZone(id, { enabled: e })} 
                        onRename={(id, n) => updateZone(id, { name: n })} 
                        onDelete={(id) => updateAfterimage({ zones: zones.filter(z => z.id !== id) })} 
                        onAdd={addZone} 
                        title="区域" 
                        titleColor="text-purple-400" 
                        addButtonColor="bg-purple-600 hover:bg-purple-500" 
                        emptyText="暂无区域" 
                      />
                      
                      {currentZone && (<>
                        <div className="mb-2 p-1.5 bg-purple-600/30 rounded">
                          <span className="text-xs text-purple-300">编辑: {currentZone.name}</span>
                        </div>
                        
                        {/* 区域形状（共用，不折叠）*/}
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">区域形状</span>
                          <RangeControl label="起始角度" value={currentZone.startAngle} min={0} max={360} step={5} onChange={(v) => updateZone(currentZone.id, { startAngle: v })} />
                          <RangeControl label="角度跨度" value={currentZone.angleSpan} min={10} max={360} step={5} onChange={(v) => updateZone(currentZone.id, { angleSpan: v })} />
                          
                          <div className="mt-2">
                            <span className="text-xs text-gray-500 block mb-1">侧边类型</span>
                            <div className="grid grid-cols-2 gap-1 mb-2">
                              <button onClick={() => updateZone(currentZone.id, { sideLineType: 'straight' })} className={`px-2 py-1 text-[10px] rounded ${currentZone.sideLineType === 'straight' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>直线</button>
                              <button onClick={() => updateZone(currentZone.id, { sideLineType: 'curve' })} className={`px-2 py-1 text-[10px] rounded ${currentZone.sideLineType === 'curve' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>曲线</button>
                            </div>
                          </div>
                          
                          <RangeControl label="侧边长度" value={currentZone.sideLineLength} min={0.5} max={5} step={0.1} onChange={(v) => updateZone(currentZone.id, { sideLineLength: v })} />
                          <RangeControl label="发散角度" value={currentZone.sideLineAngle} min={45} max={135} step={5} onChange={(v) => updateZone(currentZone.id, { sideLineAngle: v })} />
                          <div className="flex justify-between text-[10px] text-gray-500 -mt-1 mb-1">
                            <span>向内收</span><span>90°垂直</span><span>向外散</span>
                          </div>
                          
                          {currentZone.sideLineType === 'curve' && (<>
                            <div className="grid grid-cols-2 gap-1 mt-2 mb-1">
                              <button onClick={() => updateZone(currentZone.id, { curveBendDirection: 'inward' })} className={`px-2 py-1 text-[10px] rounded ${currentZone.curveBendDirection === 'inward' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>凹</button>
                              <button onClick={() => updateZone(currentZone.id, { curveBendDirection: 'outward' })} className={`px-2 py-1 text-[10px] rounded ${currentZone.curveBendDirection === 'outward' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>凸</button>
                            </div>
                            <RangeControl label="弯曲强度" value={currentZone.curveBendStrength} min={0} max={1} step={0.1} onChange={(v) => updateZone(currentZone.id, { curveBendStrength: v })} />
                          </>)}
                        </div>
                      </>)}
                      
                      {/* ===== 流动纹理 Tab ===== */}
                      {afterimageSubTab === 'texture' && (<>
                        {/* 纹理预设 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.afterimageTexture}
                          builtInPresets={[
                            { id: 'flow', name: '🌊 流动火焰', data: AFTERIMAGE_TEXTURE_PRESETS.flow },
                            { id: 'energy', name: '⚡ 能量脉冲', data: AFTERIMAGE_TEXTURE_PRESETS.energy },
                            { id: 'ghostly', name: '👻 幽冥雾气', data: AFTERIMAGE_TEXTURE_PRESETS.ghostly },
                          ]}
                          currentData={texture}
                          hasInstance={true}
                          instanceName="流动纹理"
                          onApplyToInstance={(data) => updateAfterimage({ texture: { ...texture, ...data } })}
                          onCreateInstance={(data) => updateAfterimage({ texture: { ...texture, ...data, enabled: true } })}
                          title="预设"
                          accentColor="purple"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.afterimageTexture} moduleName="afterimageTexture" builtInPresets={[
                            { id: 'flow', name: '🌊 流动火焰', data: AFTERIMAGE_TEXTURE_PRESETS.flow },
                            { id: 'energy', name: '⚡ 能量脉冲', data: AFTERIMAGE_TEXTURE_PRESETS.energy },
                            { id: 'ghostly', name: '👻 幽冥雾气', data: AFTERIMAGE_TEXTURE_PRESETS.ghostly },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.afterimageTexture} moduleName="afterimageTexture" />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">流动纹理</span>
                            <button
                              onClick={() => updateAfterimage({ texture: { ...texture, enabled: !texture.enabled } })}
                              className={`px-2 py-0.5 text-[10px] rounded ${texture.enabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                              {texture.enabled ? '已启用' : '已禁用'}
                            </button>
                          </div>
                          
                          {texture.enabled && (<>
                            <RangeControl label="透明度" value={texture.opacity ?? 0.8} min={0} max={1} step={0.05} onChange={(v) => updateAfterimage({ texture: { ...texture, opacity: v } })} />
                            
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 block mb-1">颜色渐变（暗→亮）</span>
                              <div className="flex gap-2 items-center justify-center">
                                <input type="color" value={texture.colors?.[0] || '#ff00ff'} onChange={(e) => { const c = [...(texture.colors || ['#ff00ff', '#ff66ff', '#ffffff'])]; c[0] = e.target.value; updateAfterimage({ texture: { ...texture, colors: c } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                <span className="text-gray-500">→</span>
                                <input type="color" value={texture.colors?.[1] || '#ff66ff'} onChange={(e) => { const c = [...(texture.colors || ['#ff00ff', '#ff66ff', '#ffffff'])]; c[1] = e.target.value; updateAfterimage({ texture: { ...texture, colors: c } }); }} className="w-8 h-6 rounded cursor-pointer" />
                                <span className="text-gray-500">→</span>
                                <input type="color" value={texture.colors?.[2] || '#ffffff'} onChange={(e) => { const c = [...(texture.colors || ['#ff00ff', '#ff66ff', '#ffffff'])]; c[2] = e.target.value; updateAfterimage({ texture: { ...texture, colors: c } }); }} className="w-8 h-6 rounded cursor-pointer" />
                              </div>
                            </div>
                            
                            {/* 纹理模式选择 */}
                            <div className="mt-3 pt-2 border-t border-gray-700">
                              <span className="text-xs text-gray-400 block mb-2">纹理模式</span>
                              <select
                                value={texture.textureMode || 'flow'}
                                onChange={(e) => updateAfterimage({ texture: { ...texture, textureMode: e.target.value as 'flow' | 'energy' } })}
                                className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5 mb-2"
                              >
                                <option value="flow">流动纹理</option>
                                <option value="energy">能量罩</option>
                              </select>
                            </div>
                            
                            {/* 流动纹理模式参数 */}
                            {(texture.textureMode || 'flow') === 'flow' && (
                              <div className="mt-2">
                                <RangeControl label="流动速度" value={texture.flowSpeed ?? 0.5} min={0.1} max={2} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, flowSpeed: v } })} />
                                <RangeControl label="噪声缩放" value={texture.noiseScale ?? 1.0} min={0.5} max={3} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, noiseScale: v } })} />
                                <RangeControl label="拉伸因子" value={texture.stretchFactor ?? 2.0} min={0.2} max={5} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, stretchFactor: v } })} />
                                
                                {/* 拉丝条纹效果 */}
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <span className="text-xs text-gray-500 block mb-2">拉丝条纹</span>
                                  <RangeControl label="条纹强度" value={texture.stripeIntensity ?? 0} min={0} max={1} step={0.02} onChange={(v) => updateAfterimage({ texture: { ...texture, stripeIntensity: v } })} />
                                  
                                  {(texture.stripeIntensity ?? 0) > 0 && (<>
                                    <RangeControl label="条纹密度" value={texture.stripeCount ?? 8} min={1} max={50} step={1} onChange={(v) => updateAfterimage({ texture: { ...texture, stripeCount: v } })} />
                                    <RangeControl label="径向拉伸" value={texture.directionalStretch ?? 1} min={1} max={50} step={1} onChange={(v) => updateAfterimage({ texture: { ...texture, directionalStretch: v } })} />
                                    <RangeControl label="脊线锐度" value={texture.edgeSharpness ?? 0} min={0} max={1} step={0.02} onChange={(v) => updateAfterimage({ texture: { ...texture, edgeSharpness: v } })} />
                                    <RangeControl label="扭曲强度" value={texture.distortion ?? 0} min={0} max={2} step={0.05} onChange={(v) => updateAfterimage({ texture: { ...texture, distortion: v } })} />
                                  </>)}
                                </div>
                              </div>
                            )}
                            
                            {/* 能量罩模式参数 */}
                            {texture.textureMode === 'energy' && (
                              <div className="mt-2">
                                <RangeControl label="火团缩放" value={texture.energyFlameScale ?? 2.0} min={0.5} max={5} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, energyFlameScale: v } })} />
                                <RangeControl label="火团密度" value={texture.energyDensity ?? 0.5} min={0} max={1} step={0.05} onChange={(v) => updateAfterimage({ texture: { ...texture, energyDensity: v } })} />
                                <RangeControl label="流动速度" value={texture.energyFlowSpeed ?? 0.5} min={0.1} max={3} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, energyFlowSpeed: v } })} />
                                <RangeControl label="湍流强度" value={texture.energyTurbulence ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, energyTurbulence: v } })} />
                                
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500 block mb-1">噪声类型</span>
                                  <select
                                    value={texture.energyNoiseType || 'simplex'}
                                    onChange={(e) => updateAfterimage({ texture: { ...texture, energyNoiseType: e.target.value as 'simplex' | 'voronoi' } })}
                                    className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1"
                                  >
                                    <option value="simplex">Simplex</option>
                                    <option value="voronoi">Voronoi</option>
                                  </select>
                                </div>
                                
                                <RangeControl label="分形层数" value={texture.energyFractalLayers ?? 3} min={1} max={5} step={1} onChange={(v) => updateAfterimage({ texture: { ...texture, energyFractalLayers: v } })} />
                                
                                <div className="mt-2">
                                  <span className="text-xs text-gray-500 block mb-1">动画方向</span>
                                  <select
                                    value={texture.energyDirection || 'up'}
                                    onChange={(e) => updateAfterimage({ texture: { ...texture, energyDirection: e.target.value as 'up' | 'spiral' } })}
                                    className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1"
                                  >
                                    <option value="up">向上</option>
                                    <option value="spiral">螺旋</option>
                                  </select>
                                </div>
                                
                                {/* 脉冲效果 */}
                                <div className="mt-2 pt-2 border-t border-gray-600">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-500">脉冲效果</span>
                                    <button
                                      onClick={() => updateAfterimage({ texture: { ...texture, energyPulseEnabled: !texture.energyPulseEnabled } })}
                                      className={`px-2 py-0.5 text-[10px] rounded ${texture.energyPulseEnabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                                    >
                                      {texture.energyPulseEnabled ? '开' : '关'}
                                    </button>
                                  </div>
                                  {texture.energyPulseEnabled && (<>
                                    <RangeControl label="脉冲速度" value={texture.energyPulseSpeed ?? 1.0} min={0.5} max={3} step={0.1} onChange={(v) => updateAfterimage({ texture: { ...texture, energyPulseSpeed: v } })} />
                                    <RangeControl label="脉冲强度" value={texture.energyPulseIntensity ?? 0.3} min={0} max={1} step={0.05} onChange={(v) => updateAfterimage({ texture: { ...texture, energyPulseIntensity: v } })} />
                                  </>)}
                                </div>
                              </div>
                            )}
                          </>)}
                        </div>
                      </>)}
                      
                      {/* ===== 发散粒子 Tab ===== */}
                      {afterimageSubTab === 'particles' && (<>
                        {/* 粒子预设 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.afterimageParticle}
                          builtInPresets={[
                            { id: 'spark', name: '✨ 火星四溅', data: AFTERIMAGE_PARTICLE_PRESETS.spark },
                            { id: 'dust', name: '🌫️ 星尘飘散', data: AFTERIMAGE_PARTICLE_PRESETS.dust },
                            { id: 'explosion', name: '💥 爆发粒子', data: AFTERIMAGE_PARTICLE_PRESETS.explosion },
                          ]}
                          currentData={particles}
                          hasInstance={true}
                          instanceName="发散粒子"
                          onApplyToInstance={(data) => updateAfterimage({ particles: { ...particles, ...data } })}
                          onCreateInstance={(data) => updateAfterimage({ particles: { ...particles, ...data, enabled: true } })}
                          title="预设"
                          accentColor="purple"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.afterimageParticle} moduleName="afterimageParticle" builtInPresets={[
                            { id: 'spark', name: '✨ 火星四溅', data: AFTERIMAGE_PARTICLE_PRESETS.spark },
                            { id: 'dust', name: '🌫️ 星尘飘散', data: AFTERIMAGE_PARTICLE_PRESETS.dust },
                            { id: 'explosion', name: '💥 爆发粒子', data: AFTERIMAGE_PARTICLE_PRESETS.explosion },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.afterimageParticle} moduleName="afterimageParticle" />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-xs text-gray-400">发散粒子</span>
                            <button
                              onClick={() => updateAfterimage({ particles: { ...particles, enabled: !particles.enabled } })}
                              className={`px-2 py-0.5 text-[10px] rounded ${particles.enabled ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300'}`}
                            >
                              {particles.enabled ? '已启用' : '已禁用'}
                            </button>
                          </div>
                          
                          {particles.enabled && (<>
                            <RangeControl label="发散速度" value={particles.speed} min={0.5} max={5} step={0.1} onChange={(v) => updateAfterimage({ particles: { ...particles, speed: v } })} />
                            <RangeControl label="速度随机" value={particles.speedRandomness} min={0} max={0.5} step={0.05} onChange={(v) => updateAfterimage({ particles: { ...particles, speedRandomness: v } })} />
                            <RangeControl label="粒子密度" value={particles.density} min={10} max={500} step={10} onChange={(v) => updateAfterimage({ particles: { ...particles, density: v } })} />
                            <RangeControl label="粒子大小" value={particles.size} min={1} max={20} step={1} onChange={(v) => updateAfterimage({ particles: { ...particles, size: v } })} />
                            <RangeControl label="生命周期" value={particles.lifespan} min={0.5} max={5} step={0.1} onChange={(v) => updateAfterimage({ particles: { ...particles, lifespan: v } })} />
                            
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 block mb-1">大小衰减</span>
                              <div className="grid grid-cols-3 gap-1">
                                {[{ id: 'none', l: '无' }, { id: 'linear', l: '线性' }, { id: 'exponential', l: '指数' }].map(m => (
                                  <button key={m.id} onClick={() => updateAfterimage({ particles: { ...particles, sizeDecay: m.id as any } })} className={`px-1 py-0.5 text-[10px] rounded ${particles.sizeDecay === m.id ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-300'}`}>{m.l}</button>
                                ))}
                              </div>
                            </div>
                            
                            <div className="mt-2">
                              <span className="text-xs text-gray-500 block mb-1">颜色</span>
                              <div className="flex gap-2 items-center justify-center">
                                <input type="color" value={particles.colors[0] || '#ff4400'} onChange={(e) => { const c = [...particles.colors]; c[0] = e.target.value; updateAfterimage({ particles: { ...particles, colors: c } }); }} className="w-10 h-6 rounded cursor-pointer" />
                                <span className="text-gray-400">→</span>
                                <input type="color" value={particles.colors[1] || '#ffff00'} onChange={(e) => { const c = [...particles.colors]; c[1] = e.target.value; updateAfterimage({ particles: { ...particles, colors: c } }); }} className="w-10 h-6 rounded cursor-pointer" />
                              </div>
                            </div>
                          </>)}
                        </div>
                      </>)}
                    </div>
                  </ControlGroup>
                  );
                })()}
                
                {/* ===== 法阵 子Tab ===== */}
                {planetSubTab === 'magicCircle' && (() => {
                  return <MagicCircleControl planet={planet} updatePlanet={updatePlanet} />;
                })()}
                
                {/* ===== 能量体 子Tab ===== */}
                {planetSubTab === 'energyBody' && (() => {
                  // 如果没有能量体，自动创建一个默认实例
                  let energyBodies = planet.energyBodySystem?.energyBodies || [];
                  if (energyBodies.length === 0) {
                    const defaultId = 'default-energy-body';
                    const defaultEB = createDefaultEnergyBody(defaultId, '能量体 1');
                    energyBodies = [defaultEB];
                    // 延迟更新以避免渲染循环
                    setTimeout(() => {
                      updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, energyBodies: [defaultEB] } });
                    }, 0);
                  }
                  
                  const effectiveSelectedEnergyBodyId = selectedEnergyBodyId && energyBodies.find(e => e.id === selectedEnergyBodyId)
                    ? selectedEnergyBodyId
                    : energyBodies[0]?.id || null;
                  const currentEnergyBody = energyBodies.find(e => e.id === effectiveSelectedEnergyBodyId);
                  
                  const updateEnergyBody = (id: string, updates: Partial<EnergyBodySettings>) => {
                    const updated = energyBodies.map(e => e.id === id ? { ...e, ...updates } : e);
                    updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, energyBodies: updated } });
                  };
                  
                  // 能量罩（原火焰系统表面火焰）
                  const flameSystem = planet.flameSystem || DEFAULT_FLAME_SYSTEM;
                  const surfaceFlames = flameSystem.surfaceFlames || [];
                  const effectiveFlameId = surfaceFlames[0]?.id || null;
                  const currentFlame = surfaceFlames.find(f => f.id === effectiveFlameId);
                  
                  const updateFlame = (id: string, updates: Partial<SurfaceFlameSettings>) => {
                    const updated = surfaceFlames.map(f => f.id === id ? { ...f, ...updates } : f);
                    updatePlanet({ flameSystem: { ...flameSystem, surfaceFlames: updated } });
                  };
                  
                  const addFlame = (presetId: string) => {
                    const preset = SURFACE_FLAME_PRESETS[presetId as keyof typeof SURFACE_FLAME_PRESETS] || {};
                    const name = presetId === 'classic' ? '经典' : presetId === 'rainbow' ? '彩虹' : presetId === 'ghostly' ? '幽冥' : presetId === 'plasma' ? '等离子' : '自定义';
                    const newFlame: SurfaceFlameSettings = { ...createDefaultSurfaceFlame(`flame_${Date.now()}`, `${name} ${surfaceFlames.length + 1}`), ...preset, enabled: true };
                    updatePlanet({ flameSystem: { ...flameSystem, surfaceFlames: [...surfaceFlames, newFlame] } });
                  };
                  
                  // 子模块启用状态
                  const shieldEnabled = flameSystem.surfaceFlamesEnabled !== false;
                  
                  return (
                  <ControlGroup title="能量体系统" rightContent={
                    <button
                      onClick={() => updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, enabled: !(planet.energyBodySystem?.enabled ?? true) } })}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        (planet.energyBodySystem?.enabled ?? true)
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-400 border-2 border-red-500/70'
                      }`}
                    >
                      {(planet.energyBodySystem?.enabled ?? true) ? '已启用' : '已禁用'}
                    </button>
                  }>
                    {/* 能量核 / 能量罩 子Tab 切换 */}
                    <div className="flex gap-1 mb-3 bg-gray-800/50 rounded p-1">
                      {[
                        { key: 'core' as const, label: '⚡ 能量核', count: energyBodies.filter(e => e.enabled).length },
                        { key: 'shield' as const, label: '🔥 能量罩', count: surfaceFlames.filter(f => f.enabled).length }
                      ].map(tab => (
                        <button
                          key={tab.key}
                          onClick={() => setEnergyBodySystemSubTab(tab.key)}
                          className={`flex-1 px-2 py-1.5 text-xs rounded transition-colors ${
                            energyBodySystemSubTab === tab.key
                              ? 'bg-yellow-600 text-white'
                              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                          }`}
                        >
                          {tab.label} ({tab.count})
                        </button>
                      ))}
                    </div>
                    
                    {/* ===== 能量核 Tab ===== */}
                    {energyBodySystemSubTab === 'core' && (
                    <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                      <FloatingListSelector
                        items={energyBodies}
                        selectedId={effectiveSelectedEnergyBodyId}
                        onSelect={(id) => setSelectedEnergyBodyId(id)}
                        onToggleEnabled={(id, enabled) => updateEnergyBody(id, { enabled })}
                        onRename={(id, name) => updateEnergyBody(id, { name })}
                        onDelete={(id) => {
                          const updated = energyBodies.filter(e => e.id !== id);
                          updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, energyBodies: updated } });
                          if (effectiveSelectedEnergyBodyId === id) setSelectedEnergyBodyId(updated[0]?.id || null);
                        }}
                        onAdd={() => {
                          const id = Date.now().toString();
                          const newEB = createDefaultEnergyBody(id, `能量核 ${energyBodies.length + 1}`);
                          updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, energyBodies: [...energyBodies, newEB] } });
                          setSelectedEnergyBodyId(id);
                        }}
                        globalEnabled={planet.energyBodySystem?.coreEnabled ?? true}
                        onGlobalToggle={(enabled) => updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, coreEnabled: enabled } })}
                        soloId={planet.energyBodySystem?.soloId}
                        onSoloToggle={(id) => updatePlanet({ energyBodySystem: { ...planet.energyBodySystem!, soloId: id } })}
                        title="能量核"
                        titleColor="text-yellow-400"
                        addButtonColor="bg-yellow-600 hover:bg-yellow-500"
                        emptyText="暂无能量核"
                      />
                      
                      {currentEnergyBody && (
                        <div className="mt-3 space-y-2">
                          {/* 渲染模式 - 顶层 */}
                          <div className="flex gap-1 mb-2">
                            {(['wireframe', 'shell', 'both'] as const).map(mode => (
                              <button
                                key={mode}
                                onClick={() => updateEnergyBody(currentEnergyBody.id, { renderMode: mode })}
                                className={`flex-1 px-2 py-1.5 text-xs rounded ${currentEnergyBody.renderMode === mode ? 'bg-yellow-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}
                              >
                                {mode === 'wireframe' ? '🔲 线框' : mode === 'shell' ? '🔘 薄壳' : '🔳 两者'}
                              </button>
                            ))}
                          </div>
                          
                          {/* 标签页切换 */}
                          <div className="flex gap-1 border-b border-gray-700 pb-1 mb-2">
                            {[
                              { key: 'geometry' as const, label: '📐 形态' },
                              { key: 'appearance' as const, label: '🎨 外观' },
                              { key: 'animation' as const, label: '🎬 动画' },
                              { key: 'effects' as const, label: '✨ 特效' },
                              { key: 'advanced' as const, label: '⚙️' }
                            ].map(tab => (
                              <button
                                key={tab.key}
                                onClick={() => setEnergyBodySubTab(tab.key)}
                                className={`px-2 py-1 text-xs rounded-t ${energyBodySubTab === tab.key ? 'bg-gray-700 text-yellow-400' : 'text-gray-500 hover:text-gray-300'}`}
                              >
                                {tab.label}
                              </button>
                            ))}
                          </div>
                          
                          {/* ===== 形态标签页 ===== */}
                          {energyBodySubTab === 'geometry' && (
                              <div className="space-y-2">
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <span className="text-xs text-gray-400 block mb-2">基础几何</span>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-400">类型</span>
                                    <select value={currentEnergyBody.polyhedronType} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { polyhedronType: e.target.value as any })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                      <optgroup label="柏拉图立体">
                                        <option value="tetrahedron">正四面体</option>
                                        <option value="cube">正六面体</option>
                                        <option value="octahedron">正八面体</option>
                                        <option value="dodecahedron">正十二面体</option>
                                        <option value="icosahedron">正二十面体</option>
                                      </optgroup>
                                      <optgroup label="截角多面体">
                                        <option value="truncatedTetrahedron">截角四面体</option>
                                        <option value="truncatedCube">截角六面体</option>
                                        <option value="truncatedOctahedron">截角八面体</option>
                                        <option value="truncatedDodecahedron">截角十二面体</option>
                                        <option value="truncatedIcosahedron">截角二十面体(足球)</option>
                                        <option value="cuboctahedron">截半立方体</option>
                                        <option value="icosidodecahedron">截半二十面体</option>
                                      </optgroup>
                                    </select>
                                  </div>
                                  <RangeControl label="半径" value={currentEnergyBody.radius} min={30} max={500} step={10} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { radius: v })} />
                                  {currentEnergyBody.polyhedronType.startsWith('truncated') || currentEnergyBody.polyhedronType === 'cuboctahedron' || currentEnergyBody.polyhedronType === 'icosidodecahedron' ? (
                                    <div className="flex items-center gap-2 mb-1">
                                      <span className="text-xs text-gray-500">细分级别</span>
                                      <span className="text-xs text-yellow-500/70">截角类型固定为0</span>
                                    </div>
                                  ) : (
                                    <RangeControl label="细分级别" value={currentEnergyBody.subdivisionLevel} min={0} max={4} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { subdivisionLevel: v })} />
                                  )}
                                  <RangeControl label="球化程度" value={currentEnergyBody.spherize} min={0} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { spherize: v })} />
                                </div>
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <span className="text-xs text-gray-400 block mb-2">变换</span>
                                  <RangeControl label="旋转速度" value={currentEnergyBody.rotationSpeed} min={-2} max={2} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { rotationSpeed: v })} />
                                  <RotationAxisPresetSelector axis={currentEnergyBody.rotationAxis} onChange={(axis) => updateEnergyBody(currentEnergyBody.id, { rotationAxis: axis })} />
                                  <div className="mt-2">
                                    <TiltPresetSelector tilt={currentEnergyBody.tilt} onChange={(tilt) => updateEnergyBody(currentEnergyBody.id, { tilt })} />
                                  </div>
                                </div>
                              </div>
                            )}
                            
                            {/* ===== 外观标签页 ===== */}
                            {energyBodySubTab === 'appearance' && (
                              <div className="space-y-2">
                                {/* 边缘样式 */}
                                {(currentEnergyBody.renderMode === 'wireframe' || currentEnergyBody.renderMode === 'both') && (
                                  <div className="p-2 bg-gray-800/50 rounded">
                                    <span className="text-xs text-gray-400 block mb-2">边缘样式</span>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs text-gray-400">颜色</span>
                                      <input type="color" value={currentEnergyBody.edgeEffect.color} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, color: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                      <label className="flex items-center gap-1">
                                        <input type="checkbox" checked={currentEnergyBody.edgeEffect.gradientEnabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, gradientEnabled: e.target.checked } })} />
                                        <span className="text-xs text-gray-400">渐变</span>
                                      </label>
                                      {currentEnergyBody.edgeEffect.gradientEnabled && (
                                        <input type="color" value={currentEnergyBody.edgeEffect.gradientEndColor} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, gradientEndColor: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                      )}
                                    </div>
                                    <RangeControl label="发光强度" value={currentEnergyBody.edgeEffect.glowIntensity} min={0} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, glowIntensity: v } })} />
                                    {/* 虚线效果 */}
                                    <div className="flex items-center justify-between mt-2 mb-1">
                                      <span className="text-xs text-gray-400">虚线效果</span>
                                      <input type="checkbox" checked={currentEnergyBody.edgeEffect.dashPattern.enabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, dashPattern: { ...currentEnergyBody.edgeEffect.dashPattern, enabled: e.target.checked } } })} />
                                    </div>
                                    {currentEnergyBody.edgeEffect.dashPattern.enabled && (
                                      <>
                                        <RangeControl label="虚线占比" value={currentEnergyBody.edgeEffect.dashPattern.dashRatio} min={0.1} max={0.9} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, dashPattern: { ...currentEnergyBody.edgeEffect.dashPattern, dashRatio: v } } })} />
                                        <RangeControl label="虚线密度" value={currentEnergyBody.edgeEffect.dashPattern.dashDensity ?? 10} min={2} max={30} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, dashPattern: { ...currentEnergyBody.edgeEffect.dashPattern, dashDensity: v } } })} />
                                        <RangeControl label="流动速度" value={currentEnergyBody.edgeEffect.dashPattern.flowSpeed} min={0} max={5} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeEffect: { ...currentEnergyBody.edgeEffect, dashPattern: { ...currentEnergyBody.edgeEffect.dashPattern, flowSpeed: v } } })} />
                                      </>
                                    )}
                                  </div>
                                )}
                                {/* 顶点样式 */}
                                {(currentEnergyBody.renderMode === 'wireframe' || currentEnergyBody.renderMode === 'both') && (
                                  <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-400">顶点光点</span>
                                      <input type="checkbox" checked={currentEnergyBody.vertexEffect.enabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { vertexEffect: { ...currentEnergyBody.vertexEffect, enabled: e.target.checked } })} />
                                    </div>
                                    {currentEnergyBody.vertexEffect.enabled && (
                                      <>
                                        <div className="flex items-center gap-2 mb-2">
                                          <span className="text-xs text-gray-400">颜色</span>
                                          <input type="color" value={currentEnergyBody.vertexEffect.color} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { vertexEffect: { ...currentEnergyBody.vertexEffect, color: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                          <select value={currentEnergyBody.vertexEffect.shape} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { vertexEffect: { ...currentEnergyBody.vertexEffect, shape: e.target.value as any } })} className="text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                            <option value="circle">圆形</option>
                                            <option value="diamond">菱形</option>
                                            <option value="star">星形</option>
                                          </select>
                                        </div>
                                        <RangeControl label="大小" value={currentEnergyBody.vertexEffect.size} min={1} max={20} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { vertexEffect: { ...currentEnergyBody.vertexEffect, size: v } })} />
                                        <RangeControl label="发光强度" value={currentEnergyBody.vertexEffect.glowIntensity} min={0} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { vertexEffect: { ...currentEnergyBody.vertexEffect, glowIntensity: v } })} />
                                      </>
                                    )}
                                  </div>
                                )}
                                {/* 薄壳样式 */}
                                {(currentEnergyBody.renderMode === 'shell' || currentEnergyBody.renderMode === 'both') && (
                                  <div className="p-2 bg-gray-800/50 rounded">
                                    <span className="text-xs text-gray-400 block mb-2">薄壳效果</span>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs text-gray-400">颜色</span>
                                      <input type="color" value={currentEnergyBody.shellEffect.color} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { shellEffect: { ...currentEnergyBody.shellEffect, color: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                    </div>
                                    <RangeControl label="透明度" value={currentEnergyBody.shellEffect.opacity} min={0} max={1} step={0.05} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { shellEffect: { ...currentEnergyBody.shellEffect, opacity: v } })} />
                                    <RangeControl label="菲涅尔强度" value={currentEnergyBody.shellEffect.fresnelIntensity} min={0} max={2} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { shellEffect: { ...currentEnergyBody.shellEffect, fresnelIntensity: v } })} />
                                    <RangeControl label="菲涅尔指数" value={currentEnergyBody.shellEffect.fresnelPower} min={0.5} max={5} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { shellEffect: { ...currentEnergyBody.shellEffect, fresnelPower: v } })} />
                                  </div>
                                )}
                                {/* 整体 */}
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <span className="text-xs text-gray-400 block mb-2">整体</span>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-400">混合</span>
                                    <select value={currentEnergyBody.blendMode} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { blendMode: e.target.value as 'additive' | 'normal' })} className="text-xs bg-gray-700 rounded px-2 py-1 text-white">
                                      <option value="additive">叠加</option>
                                      <option value="normal">正常</option>
                                    </select>
                                  </div>
                                  <RangeControl label="整体透明度" value={currentEnergyBody.globalOpacity} min={0} max={1} step={0.05} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { globalOpacity: v })} />
                                </div>
                              </div>
                            )}
                            
                            {/* ===== 动画标签页 ===== */}
                            {energyBodySubTab === 'animation' && (
                              <div className="space-y-2">
                                {/* 形态动画 */}
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <span className="text-xs text-gray-400 block mb-2">形态动画</span>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">呼吸缩放</span>
                                    <input type="checkbox" checked={currentEnergyBody.organicAnimation.breathingEnabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, breathingEnabled: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.organicAnimation.breathingEnabled && (
                                    <>
                                      <RangeControl label="呼吸强度" value={currentEnergyBody.organicAnimation.breathingIntensity} min={0} max={0.5} step={0.05} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, breathingIntensity: v } })} />
                                      <RangeControl label="呼吸速度" value={currentEnergyBody.organicAnimation.breathingSpeed} min={0.1} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, breathingSpeed: v } })} />
                                    </>
                                  )}
                                  <div className="flex items-center justify-between mt-2 mb-1">
                                    <span className="text-xs text-gray-400">噪声抖动</span>
                                    <input type="checkbox" checked={currentEnergyBody.organicAnimation.noiseEnabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, noiseEnabled: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.organicAnimation.noiseEnabled && (
                                    <>
                                      <RangeControl label="噪声幅度" value={currentEnergyBody.organicAnimation.noiseAmplitude} min={0} max={0.3} step={0.01} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, noiseAmplitude: v } })} />
                                      <RangeControl label="噪声频率" value={currentEnergyBody.organicAnimation.noiseFrequency} min={0.5} max={5} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, noiseFrequency: v } })} />
                                      <RangeControl label="噪声速度" value={currentEnergyBody.organicAnimation.noiseSpeed} min={0.1} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { organicAnimation: { ...currentEnergyBody.organicAnimation, noiseSpeed: v } })} />
                                    </>
                                  )}
                                </div>
                                {/* 边缘动画 */}
                                {(currentEnergyBody.renderMode === 'wireframe' || currentEnergyBody.renderMode === 'both') && (
                                  <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs text-gray-400">边缘脉动</span>
                                      <input type="checkbox" checked={currentEnergyBody.edgeBreathing?.enabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { edgeBreathing: { ...currentEnergyBody.edgeBreathing, enabled: e.target.checked } })} />
                                    </div>
                                    {currentEnergyBody.edgeBreathing?.enabled && (
                                      <>
                                        <RangeControl label="脉动速度" value={currentEnergyBody.edgeBreathing?.speed ?? 0.5} min={0.1} max={2} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeBreathing: { ...currentEnergyBody.edgeBreathing, speed: v } })} />
                                        <RangeControl label="发光振幅" value={currentEnergyBody.edgeBreathing?.glowAmplitude ?? 0.4} min={0} max={0.8} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeBreathing: { ...currentEnergyBody.edgeBreathing, glowAmplitude: v } })} />
                                        <RangeControl label="透明振幅" value={currentEnergyBody.edgeBreathing?.alphaAmplitude ?? 0.15} min={0} max={0.3} step={0.05} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeBreathing: { ...currentEnergyBody.edgeBreathing, alphaAmplitude: v } })} />
                                        <RangeControl label="噪声混合" value={currentEnergyBody.edgeBreathing?.noiseMix ?? 0.3} min={0} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { edgeBreathing: { ...currentEnergyBody.edgeBreathing, noiseMix: v } })} />
                                      </>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                            
                            {/* ===== 特效标签页 ===== */}
                            {energyBodySubTab === 'effects' && (
                              <div className="space-y-2">
                                {/* 光流巡游 */}
                                {(currentEnergyBody.renderMode === 'wireframe' || currentEnergyBody.renderMode === 'both') && (
                                  <div className="p-2 bg-gray-800/50 rounded">
                                    <div className="flex items-center justify-between mb-2">
                                      <span className="text-xs text-gray-400">光流巡游</span>
                                      <input type="checkbox" checked={currentEnergyBody.lightFlow.enabled} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, enabled: e.target.checked } })} />
                                    </div>
                                    <div className="flex items-center gap-2 mb-2">
                                      <span className="text-xs text-gray-400">颜色</span>
                                      <input type="color" value={currentEnergyBody.lightFlow.color} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, color: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                    </div>
                                    <RangeControl label="流动速度" value={currentEnergyBody.lightFlow.speed} min={0.1} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, speed: v } })} />
                                    <RangeControl label="光斑长度" value={currentEnergyBody.lightFlow.length} min={0.05} max={0.5} step={0.05} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, length: v } })} />
                                    <RangeControl label="光斑强度" value={currentEnergyBody.lightFlow.intensity} min={0} max={3} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, intensity: v } })} />
                                    <RangeControl label="光斑数量" value={currentEnergyBody.lightFlow.count} min={1} max={10} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, count: v } })} />
                                    <div className="flex items-center gap-2 mt-2">
                                      <span className="text-xs text-gray-400 w-16">路径</span>
                                      <select value={currentEnergyBody.lightFlow.pathMode ?? 'edge'} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, pathMode: e.target.value as 'edge' | 'euler' | 'random' } })} className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1">
                                        <option value="edge">沿边</option>
                                        <option value="euler">欧拉回路</option>
                                        <option value="random">随机</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center gap-2 mt-1">
                                      <span className="text-xs text-gray-400 w-16">相位</span>
                                      <select value={currentEnergyBody.lightFlow.phaseMode ?? 'spread'} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, phaseMode: e.target.value as 'sync' | 'spread' } })} className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1">
                                        <option value="sync">同相</option>
                                        <option value="spread">错相</option>
                                      </select>
                                    </div>
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-gray-400">脉冲闪烁</span>
                                      <input type="checkbox" checked={currentEnergyBody.lightFlow.pulseEnabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, pulseEnabled: e.target.checked } })} />
                                    </div>
                                    {currentEnergyBody.lightFlow.pulseEnabled && (
                                      <RangeControl label="脉冲速度" value={currentEnergyBody.lightFlow.pulseSpeed ?? 2} min={0.5} max={5} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, pulseSpeed: v } })} />
                                    )}
                                    <div className="flex items-center justify-between mt-2">
                                      <span className="text-xs text-gray-400">顶点停靠</span>
                                      <input type="checkbox" checked={currentEnergyBody.lightFlow.dwellEnabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, dwellEnabled: e.target.checked } })} />
                                    </div>
                                    {currentEnergyBody.lightFlow.dwellEnabled && (
                                      <>
                                        <RangeControl label="停靠阈值" value={currentEnergyBody.lightFlow.dwellThreshold ?? 4} min={3} max={6} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, dwellThreshold: v } })} />
                                        <RangeControl label="停靠时长" value={currentEnergyBody.lightFlow.dwellDuration ?? 0.3} min={0.1} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { lightFlow: { ...currentEnergyBody.lightFlow, dwellDuration: v } })} />
                                      </>
                                    )}
                                  </div>
                                )}
                                {/* 球面 Voronoi */}
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <div className="flex items-center justify-between mb-2">
                                    <span className="text-xs text-gray-400">球面 Voronoi</span>
                                    <input type="checkbox" checked={currentEnergyBody.sphericalVoronoi?.enabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, enabled: e.target.checked } })} />
                                  </div>
                                  <RangeControl label="细胞数量" value={currentEnergyBody.sphericalVoronoi?.cellCount ?? 12} min={4} max={64} step={1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, cellCount: v } })} />
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-400 w-16">分布</span>
                                    <select value={currentEnergyBody.sphericalVoronoi?.seedDistribution ?? 'fibonacci'} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, seedDistribution: e.target.value as 'random' | 'fibonacci' | 'uniform' } })} className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1">
                                      <option value="fibonacci">斐波那契</option>
                                      <option value="random">随机</option>
                                    </select>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <span className="text-xs text-gray-400">边线颜色</span>
                                    <input type="color" value={currentEnergyBody.sphericalVoronoi?.lineColor ?? '#00ffff'} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, lineColor: e.target.value } })} className="w-8 h-6 rounded cursor-pointer" />
                                  </div>
                                  <RangeControl label="边线宽度" value={currentEnergyBody.sphericalVoronoi?.lineWidth ?? 2} min={0.5} max={5} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, lineWidth: v } })} />
                                  <RangeControl label="边线发光" value={currentEnergyBody.sphericalVoronoi?.lineGlow ?? 1} min={0} max={2} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, lineGlow: v } })} />
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">填充细胞</span>
                                    <input type="checkbox" checked={currentEnergyBody.sphericalVoronoi?.fillEnabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, fillEnabled: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.sphericalVoronoi?.fillEnabled && (
                                    <>
                                      <RangeControl label="填充透明度" value={currentEnergyBody.sphericalVoronoi?.fillOpacity ?? 0.2} min={0} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, fillOpacity: v } })} />
                                      <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs text-gray-400 w-16">着色</span>
                                        <select value={currentEnergyBody.sphericalVoronoi?.colorMode ?? 'gradient'} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, colorMode: e.target.value as 'gradient' | 'random' | 'uniform' } })} className="flex-1 bg-gray-700 text-white text-xs rounded px-2 py-1">
                                          <option value="gradient">渐变</option>
                                          <option value="random">随机</option>
                                          <option value="uniform">统一</option>
                                        </select>
                                      </div>
                                      <RangeControl label="基础色相" value={currentEnergyBody.sphericalVoronoi?.baseHue ?? 180} min={0} max={360} step={10} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, baseHue: v } })} />
                                    </>
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">种子动画</span>
                                    <input type="checkbox" checked={currentEnergyBody.sphericalVoronoi?.animateSeeds ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, animateSeeds: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.sphericalVoronoi?.animateSeeds && (
                                    <RangeControl label="移动速度" value={currentEnergyBody.sphericalVoronoi?.seedSpeed ?? 0.2} min={0} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, seedSpeed: v } })} />
                                  )}
                                  <div className="flex items-center justify-between mt-2">
                                    <span className="text-xs text-gray-400">细胞脉冲</span>
                                    <input type="checkbox" checked={currentEnergyBody.sphericalVoronoi?.cellPulse ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, cellPulse: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.sphericalVoronoi?.cellPulse && (
                                    <RangeControl label="脉冲速度" value={currentEnergyBody.sphericalVoronoi?.cellPulseSpeed ?? 1} min={0.5} max={3} step={0.5} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { sphericalVoronoi: { ...currentEnergyBody.sphericalVoronoi, cellPulseSpeed: v } })} />
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* ===== 高级标签页 ===== */}
                            {energyBodySubTab === 'advanced' && (
                              <div className="space-y-2">
                                <div className="p-2 bg-gray-800/50 rounded">
                                  <span className="text-xs text-gray-400 block mb-2">后期处理</span>
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-xs text-gray-400">色差效果</span>
                                    <input type="checkbox" checked={currentEnergyBody.postEffects?.chromaticAberrationEnabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { postEffects: { ...currentEnergyBody.postEffects, chromaticAberrationEnabled: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.postEffects?.chromaticAberrationEnabled && (
                                    <RangeControl label="色差强度" value={currentEnergyBody.postEffects?.chromaticAberrationIntensity ?? 0.01} min={0} max={0.05} step={0.005} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { postEffects: { ...currentEnergyBody.postEffects, chromaticAberrationIntensity: v } })} />
                                  )}
                                  <div className="flex items-center justify-between mt-2 mb-1">
                                    <span className="text-xs text-gray-400">暗角效果</span>
                                    <input type="checkbox" checked={currentEnergyBody.postEffects?.vignetteEnabled ?? false} onChange={(e) => updateEnergyBody(currentEnergyBody.id, { postEffects: { ...currentEnergyBody.postEffects, vignetteEnabled: e.target.checked } })} />
                                  </div>
                                  {currentEnergyBody.postEffects?.vignetteEnabled && (
                                    <>
                                      <RangeControl label="暗角强度" value={currentEnergyBody.postEffects?.vignetteIntensity ?? 0.5} min={0} max={1} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { postEffects: { ...currentEnergyBody.postEffects, vignetteIntensity: v } })} />
                                      <RangeControl label="暗角半径" value={currentEnergyBody.postEffects?.vignetteRadius ?? 0.8} min={0.3} max={1.2} step={0.1} onChange={(v) => updateEnergyBody(currentEnergyBody.id, { postEffects: { ...currentEnergyBody.postEffects, vignetteRadius: v } })} />
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* ===== 能量罩 Tab ===== */}
                    {energyBodySystemSubTab === 'shield' && (
                    <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                      <FloatingListSelector items={surfaceFlames.map(f => ({ id: f.id, name: f.name, enabled: f.enabled }))} selectedId={effectiveFlameId} onSelect={(id) => setSelectedFlameId(id)} onToggleEnabled={(id, e) => updateFlame(id, { enabled: e })} onRename={(id, n) => updateFlame(id, { name: n })} onDelete={(id) => updatePlanet({ flameSystem: { ...flameSystem, surfaceFlames: surfaceFlames.filter(f => f.id !== id) } })} onAdd={() => addFlame('custom')} globalEnabled={shieldEnabled} onGlobalToggle={(e) => updatePlanet({ flameSystem: { ...flameSystem, surfaceFlamesEnabled: e } })} title="能量罩" titleColor="text-orange-400" addButtonColor="bg-orange-600 hover:bg-orange-500" emptyText="暂无能量罩" />
                      
                      <PresetListBox
                        storageKey={PRESET_STORAGE_KEYS.surfaceFlame}
                        builtInPresets={[
                          { id: 'classic', name: '🔥 经典', data: SURFACE_FLAME_PRESETS.classic },
                          { id: 'rainbow', name: '🌈 彩虹', data: SURFACE_FLAME_PRESETS.rainbow },
                          { id: 'ghostly', name: '👻 幽冥', data: SURFACE_FLAME_PRESETS.ghostly },
                          { id: 'plasma', name: '⚡ 等离子', data: SURFACE_FLAME_PRESETS.plasma },
                        ]}
                        currentData={currentFlame ? { ...currentFlame, id: undefined, name: undefined, enabled: undefined } : null}
                        hasInstance={!!currentFlame}
                        instanceName="能量罩"
                        onApplyToInstance={(data) => {
                          if (currentFlame) {
                            updateFlame(currentFlame.id, { ...data });
                          }
                        }}
                        onCreateInstance={(data, presetName) => {
                          const count = surfaceFlames.length + 1;
                          const newFlame: SurfaceFlameSettings = { ...createDefaultSurfaceFlame(`flame_${Date.now()}`, `${presetName.replace(/^[^\s]+\s/, '')} ${count}`), ...data, enabled: true };
                          updatePlanet({ flameSystem: { ...flameSystem, surfaceFlames: [...surfaceFlames, newFlame] } });
                        }}
                        title="预设"
                        accentColor="orange"
                      />
                      <div className="flex gap-2 mb-2">
                        <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.surfaceFlame} moduleName="surfaceFlame" builtInPresets={[
                          { id: 'classic', name: '🔥 经典', data: SURFACE_FLAME_PRESETS.classic },
                          { id: 'rainbow', name: '🌈 彩虹', data: SURFACE_FLAME_PRESETS.rainbow },
                          { id: 'ghostly', name: '👻 幽冥', data: SURFACE_FLAME_PRESETS.ghostly },
                          { id: 'plasma', name: '⚡ 等离子', data: SURFACE_FLAME_PRESETS.plasma },
                        ]} />
                        <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.surfaceFlame} moduleName="surfaceFlame" />
                      </div>
                      
                      {currentFlame && (
                      <>
                        <div className="mb-2 p-1.5 bg-orange-600/30 rounded flex items-center justify-between">
                          <span className="text-xs text-orange-300">编辑: {currentFlame.name}</span>
                          <SavePresetButton
                            storageKey={PRESET_STORAGE_KEYS.surfaceFlame}
                            currentData={currentFlame}
                            defaultName={currentFlame.name}
                            accentColor="orange"
                          />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">基础属性</span>
                          <RangeControl label="半径" value={currentFlame.radius} min={50} max={300} step={5} onChange={(v) => updateFlame(currentFlame.id, { radius: v })} />
                          <RangeControl label="厚度" value={currentFlame.thickness} min={0.05} max={0.5} step={0.01} onChange={(v) => updateFlame(currentFlame.id, { thickness: v })} />
                          <RangeControl label="透明度" value={currentFlame.opacity} min={0} max={1} step={0.05} onChange={(v) => updateFlame(currentFlame.id, { opacity: v })} />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">能量参数</span>
                          <RangeControl label="能量尺寸" value={currentFlame.flameScale} min={0.1} max={3} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { flameScale: v })} />
                          <RangeControl label="覆盖密度" value={currentFlame.density} min={0.3} max={1} step={0.05} onChange={(v) => updateFlame(currentFlame.id, { density: v })} />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">质感参数</span>
                          <RangeControl label="流动速度" value={currentFlame.flowSpeed} min={0} max={3} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { flowSpeed: v })} />
                          <RangeControl label="扰动强度" value={currentFlame.turbulence} min={0} max={2} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { turbulence: v })} />
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] text-gray-500 w-16">噪声类型</span>
                            <select value={currentFlame.noiseType} onChange={(e) => updateFlame(currentFlame.id, { noiseType: e.target.value as any })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white">
                              <option value="simplex">Simplex</option>
                              <option value="voronoi">Voronoi</option>
                            </select>
                          </div>
                          <RangeControl label="分形层级" value={currentFlame.fractalLayers} min={1} max={5} step={1} onChange={(v) => updateFlame(currentFlame.id, { fractalLayers: v })} />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">视觉效果</span>
                          <RangeControl label="发光强度" value={currentFlame.emissive} min={0} max={5} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { emissive: v })} />
                          <RangeControl label="Bloom增强" value={currentFlame.bloomBoost} min={0} max={3} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { bloomBoost: v })} />
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">动画效果</span>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[9px] text-gray-500 w-16">舔舐方向</span>
                            <select value={currentFlame.direction} onChange={(e) => updateFlame(currentFlame.id, { direction: e.target.value as any })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white">
                              <option value="up">向上</option>
                              <option value="spiral">螺旋上升</option>
                            </select>
                          </div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-[9px] text-gray-500">脉动效果</span>
                            <label className="flex items-center gap-1 cursor-pointer">
                              <input type="checkbox" checked={currentFlame.pulseEnabled} onChange={(e) => updateFlame(currentFlame.id, { pulseEnabled: e.target.checked })} className="w-3 h-3 rounded" />
                              <span className="text-[9px] text-gray-400">启用</span>
                            </label>
                          </div>
                          {currentFlame.pulseEnabled && (<>
                            <RangeControl label="脉动速度" value={currentFlame.pulseSpeed} min={0} max={3} step={0.1} onChange={(v) => updateFlame(currentFlame.id, { pulseSpeed: v })} />
                            <RangeControl label="脉动幅度" value={currentFlame.pulseIntensity} min={0} max={1} step={0.05} onChange={(v) => updateFlame(currentFlame.id, { pulseIntensity: v })} />
                          </>)}
                        </div>
                        
                        <div className="p-2 bg-gray-800/50 rounded mb-2">
                          <span className="text-xs text-gray-400 block mb-2">颜色设置</span>
                          {(() => {
                            const fc = currentFlame.color || { mode: 'twoColor', baseColor: '#ff6600', colors: ['#ff6600', '#ffff00'], colorMidPosition: 0.5, proceduralIntensity: 1.0 };
                            const updateColor = (u: any) => updateFlame(currentFlame.id, { color: { ...fc, ...u } });
                            return (<>
                              <div className="grid grid-cols-4 gap-1 mb-2">
                                {[{ id: 'none', l: '单色' }, { id: 'twoColor', l: '双色' }, { id: 'threeColor', l: '三色' }, { id: 'procedural', l: '混色' }].map(m => (
                                  <button key={m.id} onClick={() => updateColor({ mode: m.id })} className={`px-1 py-0.5 text-[10px] rounded ${fc.mode === m.id ? 'bg-orange-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'}`}>{m.l}</button>
                                ))}
                              </div>
                              {fc.mode === 'none' && <div className="flex items-center gap-2"><span className="text-xs text-gray-400">基础色</span><input type="color" value={fc.baseColor || '#ff6600'} onChange={(e) => updateColor({ baseColor: e.target.value })} className="w-12 h-6 rounded cursor-pointer" /></div>}
                              {fc.mode === 'twoColor' && <div className="flex gap-2 items-center justify-center"><input type="color" value={fc.colors?.[0] || '#ff6600'} onChange={(e) => { const c = [...(fc.colors || [])]; c[0] = e.target.value; updateColor({ colors: c }); }} className="w-10 h-6 rounded cursor-pointer" /><span className="text-gray-400">→</span><input type="color" value={fc.colors?.[1] || '#ffff00'} onChange={(e) => { const c = [...(fc.colors || [])]; c[1] = e.target.value; updateColor({ colors: c }); }} className="w-10 h-6 rounded cursor-pointer" /></div>}
                              {fc.mode === 'threeColor' && <><div className="flex gap-1 items-center justify-center"><input type="color" value={fc.colors?.[0] || '#ffff00'} onChange={(e) => { const c = [...(fc.colors || [])]; c[0] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><span className="text-gray-500">→</span><input type="color" value={fc.colors?.[1] || '#ff6600'} onChange={(e) => { const c = [...(fc.colors || [])]; c[1] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><span className="text-gray-500">→</span><input type="color" value={fc.colors?.[2] || '#ff0000'} onChange={(e) => { const c = [...(fc.colors || [])]; c[2] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /></div><RangeControl label="中间色位置" value={fc.colorMidPosition || 0.5} min={0.1} max={0.9} step={0.05} onChange={(v) => updateColor({ colorMidPosition: v })} /></>}
                              {fc.mode === 'procedural' && <><div className="flex gap-2 items-center justify-center"><input type="color" value={fc.colors?.[0] || '#ff6600'} onChange={(e) => { const c = [...(fc.colors || [])]; c[0] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><input type="color" value={fc.colors?.[1] || '#00ffff'} onChange={(e) => { const c = [...(fc.colors || [])]; c[1] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /><input type="color" value={fc.colors?.[2] || '#00ff88'} onChange={(e) => { const c = [...(fc.colors || [])]; c[2] = e.target.value; updateColor({ colors: c }); }} className="w-8 h-6 rounded cursor-pointer" /></div><RangeControl label="混色强度" value={fc.proceduralIntensity || 1.0} min={0.1} max={3} step={0.1} onChange={(v) => updateColor({ proceduralIntensity: v })} /></>}
                            </>);
                          })()}
                        </div>
                      </>
                      )}
                    </div>
                    )}
                  </ControlGroup>
                  );
                })()}

                {/* ===== 粒子辐射 子Tab ===== */}
                {planetSubTab === 'radiation' && (() => {
                  // 自动选中第一个粒子环绕
                  const effectiveSelectedOrbitingId = selectedOrbitingId && planet.radiation.orbitings.find(o => o.id === selectedOrbitingId)
                    ? selectedOrbitingId
                    : planet.radiation.orbitings[0]?.id || null;
                  const currentOrbiting = planet.radiation.orbitings.find(o => o.id === effectiveSelectedOrbitingId);
                  
                  // 自动选中第一个粒子喷射
                  const effectiveSelectedEmitterId = selectedEmitterId && planet.radiation.emitters.find(e => e.id === selectedEmitterId)
                    ? selectedEmitterId
                    : planet.radiation.emitters[0]?.id || null;
                  const currentEmitter = planet.radiation.emitters.find(e => e.id === effectiveSelectedEmitterId);
                  
                  const updateOrbiting = (orbitingId: string, updates: Partial<OrbitingParticlesSettings>) => {
                    const updated = planet.radiation.orbitings.map(o => o.id === orbitingId ? { ...o, ...updates } : o);
                    updatePlanet({ radiation: { ...planet.radiation, orbitings: updated } });
                  };
                  
                  const updateEmitter = (emitterId: string, updates: Partial<ParticleEmitterSettings>) => {
                    const updated = planet.radiation.emitters.map(e => e.id === emitterId ? { ...e, ...updates } : e);
                    updatePlanet({ radiation: { ...planet.radiation, emitters: updated } });
                  };
                  
                  const radiationEnabled = planet.radiation.enabled !== false;
                  
                  return (
                  <ControlGroup title="粒子辐射系统" rightContent={
                    <button
                      onClick={() => updatePlanet({ radiation: { ...planet.radiation, enabled: !radiationEnabled } })}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        radiationEnabled 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-400 border-2 border-red-500/70'
                      }`}
                    >
                      {radiationEnabled ? '已启用' : '已禁用'}
                    </button>
                  }>
                    {/* 子Tab切换 */}
                    <div className="flex gap-1 mb-3 bg-gray-800/50 rounded p-1">
                      <button
                        onClick={() => setRadiationSubTab('orbiting')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
                          radiationSubTab === 'orbiting'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        粒子环绕
                      </button>
                      <button
                        onClick={() => setRadiationSubTab('emitter')}
                        className={`flex-1 py-1.5 px-2 text-xs rounded transition-colors ${
                          radiationSubTab === 'emitter'
                            ? 'bg-blue-600 text-white'
                            : 'text-gray-400 hover:text-white hover:bg-gray-700'
                        }`}
                      >
                        粒子喷射
                      </button>
                    </div>
                    
                    {/* 粒子环绕 */}
                    {radiationSubTab === 'orbiting' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.radiation.orbitings}
                          selectedId={effectiveSelectedOrbitingId}
                          onSelect={(id) => setSelectedOrbitingId(id)}
                          onToggleEnabled={(id, enabled) => updateOrbiting(id, { enabled })}
                          onRename={(id, name) => updateOrbiting(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.radiation.orbitings.filter(o => o.id !== id);
                            updatePlanet({ radiation: { ...planet.radiation, orbitings: updated } });
                            if (effectiveSelectedOrbitingId === id) setSelectedOrbitingId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newOrbiting = createDefaultOrbiting(id, `粒子环绕 ${planet.radiation.orbitings.length + 1}`);
                            updatePlanet({ radiation: { ...planet.radiation, orbitings: [...planet.radiation.orbitings, newOrbiting] } });
                            setSelectedOrbitingId(id);
                          }}
                          onColorChange={(id, color) => updateOrbiting(id, { color })}
                          globalEnabled={planet.radiation.orbitingEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ radiation: { ...planet.radiation, orbitingEnabled: enabled } })}
                          title="粒子环绕"
                          titleColor="text-cyan-400"
                          addButtonColor="bg-cyan-600 hover:bg-cyan-500"
                          emptyText="暂无粒子环绕"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.orbitingParticles}
                          builtInPresets={[
                            { id: 'electrons', name: '⚛️ 电子云', data: ORBITING_PARTICLES_PRESETS.electrons },
                            { id: 'halo', name: '💫 光环粒子', data: ORBITING_PARTICLES_PRESETS.halo },
                            { id: 'swarm', name: '🐝 粒子蜂群', data: ORBITING_PARTICLES_PRESETS.swarm },
                          ]}
                          currentData={currentOrbiting ? { ...currentOrbiting, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentOrbiting}
                          instanceName="粒子环绕"
                          onApplyToInstance={(data) => {
                            if (currentOrbiting) {
                              updateOrbiting(currentOrbiting.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newOrbiting = {
                              ...createDefaultOrbiting(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.radiation.orbitings.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ radiation: { ...planet.radiation, orbitings: [...planet.radiation.orbitings, newOrbiting] } });
                            setSelectedOrbitingId(id);
                          }}
                          title="预设"
                          accentColor="cyan"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.orbitingParticles} moduleName="orbitingParticles" builtInPresets={[
                            { id: 'electrons', name: '⚛️ 电子云', data: ORBITING_PARTICLES_PRESETS.electrons },
                            { id: 'halo', name: '💫 光环粒子', data: ORBITING_PARTICLES_PRESETS.halo },
                            { id: 'swarm', name: '🐝 粒子蜂群', data: ORBITING_PARTICLES_PRESETS.swarm },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.orbitingParticles} moduleName="orbitingParticles" />
                        </div>
                        
                        {/* 粒子环绕参数区域 */}
                        {currentOrbiting && (
                          <div className="mt-3 space-y-3">
                            {/* 基础参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">基础参数</span>
                              <RangeControl label="粒子密度" value={currentOrbiting.particleDensity ?? 1} min={0.1} max={5} step={0.1} onChange={(v) => updateOrbiting(currentOrbiting.id, { particleDensity: v })} />
                              <RangeControl label="环绕半径(R倍)" value={currentOrbiting.orbitRadius} min={0.1} max={5} step={0.1} onChange={(v) => updateOrbiting(currentOrbiting.id, { orbitRadius: v })} />
                              <RangeControl label="球壳厚度" value={currentOrbiting.thickness} min={1} max={1000} step={1} onChange={(v) => updateOrbiting(currentOrbiting.id, { thickness: v })} />
                            </div>
                            
                            {/* 转动轴 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">转动轴</span>
                              <div className="grid grid-cols-4 gap-1">
                                {[
                                  { label: 'Y轴', value: { x: 0, y: 1, z: 0 } },
                                  { label: 'Y轴30°', value: { x: Math.sin(30 * Math.PI / 180), y: Math.cos(30 * Math.PI / 180), z: 0 } },
                                  { label: 'Y轴45°', value: { x: Math.sin(45 * Math.PI / 180), y: Math.cos(45 * Math.PI / 180), z: 0 } },
                                  { label: 'Y轴60°', value: { x: Math.sin(60 * Math.PI / 180), y: Math.cos(60 * Math.PI / 180), z: 0 } },
                                ].map(preset => {
                                  const currentDir = currentOrbiting.mainDirection || { x: 0, y: 1, z: 0 };
                                  const isActive = Math.abs(currentDir.x - preset.value.x) < 0.01 && Math.abs(currentDir.y - preset.value.y) < 0.01;
                                  return (
                                    <button
                                      key={preset.label}
                                      onClick={() => updateOrbiting(currentOrbiting.id, { mainDirection: preset.value })}
                                      className={`py-1 px-1 text-[10px] rounded transition-colors ${
                                        isActive ? 'bg-cyan-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                                      }`}
                                    >
                                      {preset.label}
                                    </button>
                                  );
                                })}
                              </div>
                              <RangeControl label="旋转速度" value={currentOrbiting.baseSpeed} min={0.1} max={2} step={0.05} onChange={(v) => updateOrbiting(currentOrbiting.id, { baseSpeed: v })} />
                            </div>
                            
                            {/* 外观 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">外观</span>
                              <RangeControl label="亮度" value={currentOrbiting.brightness || 1.0} min={0.1} max={3.0} step={0.1} onChange={(v) => updateOrbiting(currentOrbiting.id, { brightness: v })} />
                              <RangeControl label="粒子大小" value={currentOrbiting.particleSize || 1.0} min={0.5} max={5.0} step={0.5} onChange={(v) => updateOrbiting(currentOrbiting.id, { particleSize: v })} />
                              <RangeControl label="距离淡出" value={currentOrbiting.fadeStrength * 100 || 0} min={0} max={100} step={1} onChange={(v) => updateOrbiting(currentOrbiting.id, { fadeWithDistance: v > 0, fadeStrength: v / 100 })} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  
                    {/* 粒子喷射 */}
                    {radiationSubTab === 'emitter' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.radiation.emitters}
                          selectedId={effectiveSelectedEmitterId}
                          onSelect={(id) => setSelectedEmitterId(id)}
                          onToggleEnabled={(id, enabled) => updateEmitter(id, { enabled })}
                          onRename={(id, name) => updateEmitter(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.radiation.emitters.filter(e => e.id !== id);
                            updatePlanet({ radiation: { ...planet.radiation, emitters: updated } });
                            if (effectiveSelectedEmitterId === id) setSelectedEmitterId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newEmitter = createDefaultEmitter(id, `粒子喷射 ${planet.radiation.emitters.length + 1}`);
                            updatePlanet({ radiation: { ...planet.radiation, emitters: [...planet.radiation.emitters, newEmitter] } });
                            setSelectedEmitterId(id);
                          }}
                          onColorChange={(id, color) => updateEmitter(id, { color })}
                          globalEnabled={planet.radiation.emitterEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ radiation: { ...planet.radiation, emitterEnabled: enabled } })}
                          title="粒子喷射"
                          titleColor="text-orange-400"
                          addButtonColor="bg-orange-600 hover:bg-orange-500"
                          emptyText="暂无粒子喷射"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.emitter}
                          builtInPresets={[
                            { id: 'fountain', name: '⛲ 喷泉', data: EMITTER_PRESETS.fountain },
                            { id: 'jet', name: '🚀 喷射', data: EMITTER_PRESETS.jet },
                            { id: 'explosion', name: '💥 爆发', data: EMITTER_PRESETS.explosion },
                          ]}
                          currentData={currentEmitter ? { ...currentEmitter, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentEmitter}
                          instanceName="粒子喷射"
                          onApplyToInstance={(data) => {
                            if (currentEmitter) {
                              updateEmitter(currentEmitter.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newEmitter = {
                              ...createDefaultEmitter(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.radiation.emitters.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ radiation: { ...planet.radiation, emitters: [...planet.radiation.emitters, newEmitter] } });
                            setSelectedEmitterId(id);
                          }}
                          title="预设"
                          accentColor="orange"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.emitter} moduleName="emitter" builtInPresets={[
                            { id: 'fountain', name: '⛲ 喷泉', data: EMITTER_PRESETS.fountain },
                            { id: 'jet', name: '🚀 喷射', data: EMITTER_PRESETS.jet },
                            { id: 'explosion', name: '💥 爆发', data: EMITTER_PRESETS.explosion },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.emitter} moduleName="emitter" />
                        </div>
                        
                        {/* 粒子喷射参数区域 */}
                        {currentEmitter && (
                          <div className="mt-3 space-y-3">
                            {/* 发射设置 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">发射设置</span>
                              <RangeControl label="发射起点(R倍)" value={currentEmitter.emissionRangeMin} min={0.2} max={5} step={0.1} onChange={(v) => updateEmitter(currentEmitter.id, { emissionRangeMin: v })} />
                              <RangeControl label="消散边界(R倍)" value={currentEmitter.emissionRangeMax} min={0.2} max={15} step={0.1} onChange={(v) => updateEmitter(currentEmitter.id, { emissionRangeMax: v })} />
                              <RangeControl label="发射速率(/秒)" value={currentEmitter.birthRate} min={50} max={2000} step={50} onChange={(v) => updateEmitter(currentEmitter.id, { birthRate: v })} />
                            </div>
                            
                            {/* 运动参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">运动参数</span>
                              <RangeControl label="生命周期(秒)" value={currentEmitter.lifeSpan} min={0.5} max={5} step={0.5} onChange={(v) => updateEmitter(currentEmitter.id, { lifeSpan: v })} />
                              <RangeControl label="初始速度" value={currentEmitter.initialSpeed} min={10} max={200} step={10} onChange={(v) => updateEmitter(currentEmitter.id, { initialSpeed: v })} />
                              <RangeControl label="速度衰减" value={currentEmitter.drag} min={0} max={0.99} step={0.05} onChange={(v) => updateEmitter(currentEmitter.id, { drag: v })} />
                            </div>
                            
                            {/* 外观 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">外观</span>
                              <RangeControl label="亮度" value={currentEmitter.brightness || 1.0} min={0.5} max={3.0} step={0.1} onChange={(v) => updateEmitter(currentEmitter.id, { brightness: v })} />
                              <RangeControl label="粒子大小" value={currentEmitter.particleSize} min={0.5} max={5} step={0.5} onChange={(v) => updateEmitter(currentEmitter.id, { particleSize: v })} />
                              <RangeControl label="淡出强度" value={currentEmitter.fadeOutStrength ?? (currentEmitter.fadeOut ? 1 : 0)} min={0} max={3} step={0.1} onChange={(v) => updateEmitter(currentEmitter.id, { fadeOutStrength: v })} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ControlGroup>
                  );
                })()}

                {/* ===== 流萤 子Tab ===== */}
                {planetSubTab === 'fireflies' && (() => {
                  // 自动选中第一个旋转流萤
                  const effectiveSelectedOrbitingFireflyId = selectedOrbitingFireflyId && planet.fireflies.orbitingFireflies.find(f => f.id === selectedOrbitingFireflyId)
                    ? selectedOrbitingFireflyId
                    : planet.fireflies.orbitingFireflies[0]?.id || null;
                  const currentOrbitingFirefly = planet.fireflies.orbitingFireflies.find(f => f.id === effectiveSelectedOrbitingFireflyId);
                  
                  // 自动选中第一个飞舞流萤组
                  const effectiveSelectedWanderingGroupId = selectedWanderingGroupId && planet.fireflies.wanderingGroups.find(g => g.id === selectedWanderingGroupId)
                    ? selectedWanderingGroupId
                    : planet.fireflies.wanderingGroups[0]?.id || null;
                  const currentWanderingGroup = planet.fireflies.wanderingGroups.find(g => g.id === effectiveSelectedWanderingGroupId);
                  
                  const updateOrbitingFirefly = (fireflyId: string, updates: Partial<OrbitingFireflySettings>) => {
                    const updated = planet.fireflies.orbitingFireflies.map(f => f.id === fireflyId ? { ...f, ...updates } : f);
                    updatePlanet({ fireflies: { ...planet.fireflies, orbitingFireflies: updated } });
                  };
                  
                  const updateWanderingGroup = (groupId: string, updates: Partial<WanderingFireflyGroupSettings>) => {
                    const updated = planet.fireflies.wanderingGroups.map(g => g.id === groupId ? { ...g, ...updates } : g);
                    updatePlanet({ fireflies: { ...planet.fireflies, wanderingGroups: updated } });
                  };
                  
                  const firefliesEnabled = planet.fireflies.enabled !== false;
                  
                  return (
                  <ControlGroup title="流萤系统" rightContent={
                    <button
                      onClick={() => updatePlanet({ fireflies: { ...planet.fireflies, enabled: !firefliesEnabled } })}
                      className={`px-2 py-1 text-[10px] rounded transition-colors ${
                        firefliesEnabled 
                          ? 'bg-green-600 text-white' 
                          : 'bg-gray-600 text-gray-400 border-2 border-red-500/70'
                      }`}
                    >
                      {firefliesEnabled ? '已启用' : '已禁用'}
                    </button>
                  }>
                    {/* 子Tab 切换 */}
                    <div className="flex gap-1 mb-3">
                      <button
                        onClick={() => setFireflySubTab('orbiting')}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${fireflySubTab === 'orbiting' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                      >
                        旋转流萤
                      </button>
                      <button
                        onClick={() => setFireflySubTab('wandering')}
                        className={`flex-1 px-2 py-1.5 rounded text-xs font-medium transition-colors ${fireflySubTab === 'wandering' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}
                      >
                        游走流萤
                      </button>
                    </div>
                    
                    {/* 旋转流萤 */}
                    {fireflySubTab === 'orbiting' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.fireflies.orbitingFireflies}
                          selectedId={effectiveSelectedOrbitingFireflyId}
                          onSelect={(id) => setSelectedOrbitingFireflyId(id)}
                          onToggleEnabled={(id, enabled) => updateOrbitingFirefly(id, { enabled })}
                          onRename={(id, name) => updateOrbitingFirefly(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.fireflies.orbitingFireflies.filter(f => f.id !== id);
                            updatePlanet({ fireflies: { ...planet.fireflies, orbitingFireflies: updated } });
                            if (effectiveSelectedOrbitingFireflyId === id) setSelectedOrbitingFireflyId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newFirefly = createDefaultOrbitingFirefly(id, `旋转流萤 ${planet.fireflies.orbitingFireflies.length + 1}`);
                            updatePlanet({ fireflies: { ...planet.fireflies, orbitingFireflies: [...planet.fireflies.orbitingFireflies, newFirefly] } });
                            setSelectedOrbitingFireflyId(id);
                          }}
                          onColorChange={(id, color) => updateOrbitingFirefly(id, { color })}
                          globalEnabled={planet.fireflies.orbitingEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ fireflies: { ...planet.fireflies, orbitingEnabled: enabled } })}
                          title="旋转流萤"
                          titleColor="text-yellow-400"
                          addButtonColor="bg-yellow-600 hover:bg-yellow-500"
                          emptyText="暂无旋转流萤"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.orbitingFirefly}
                          builtInPresets={[
                            { id: 'classic', name: '✨ 经典流萤', data: ORBITING_FIREFLY_PRESETS.classic },
                            { id: 'comet', name: '☄️ 彗星尾', data: ORBITING_FIREFLY_PRESETS.comet },
                            { id: 'spirit', name: '👻 幽灵光', data: ORBITING_FIREFLY_PRESETS.spirit },
                          ]}
                          currentData={currentOrbitingFirefly ? { ...currentOrbitingFirefly, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentOrbitingFirefly}
                          instanceName="旋转流萤"
                          onApplyToInstance={(data) => {
                            if (currentOrbitingFirefly) {
                              updateOrbitingFirefly(currentOrbitingFirefly.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newFirefly = {
                              ...createDefaultOrbitingFirefly(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.fireflies.orbitingFireflies.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ fireflies: { ...planet.fireflies, orbitingFireflies: [...planet.fireflies.orbitingFireflies, newFirefly] } });
                            setSelectedOrbitingFireflyId(id);
                          }}
                          title="预设"
                          accentColor="yellow"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.orbitingFirefly} moduleName="orbitingFirefly" builtInPresets={[
                            { id: 'classic', name: '✨ 经典流萤', data: ORBITING_FIREFLY_PRESETS.classic },
                            { id: 'comet', name: '☄️ 彗星尾', data: ORBITING_FIREFLY_PRESETS.comet },
                            { id: 'spirit', name: '👻 幽灵光', data: ORBITING_FIREFLY_PRESETS.spirit },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.orbitingFirefly} moduleName="orbitingFirefly" />
                        </div>
                        
                        {/* 旋转流萤参数 */}
                        {currentOrbitingFirefly && (
                          <div className="mt-3 space-y-2">
                            {/* 轨道参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">轨道</span>
                              <RangeControl label="轨道半径" value={currentOrbitingFirefly.absoluteOrbitRadius} min={50} max={500} step={2} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { absoluteOrbitRadius: v })} />
                              <RangeControl label="公转速度" value={currentOrbitingFirefly.orbitSpeed} min={0.1} max={2} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { orbitSpeed: v })} />
                              <div className="flex items-center gap-2 my-1">
                                <input type="checkbox" checked={currentOrbitingFirefly.billboardOrbit || false} onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { billboardOrbit: e.target.checked })} className="w-4 h-4 rounded bg-gray-600" />
                                <span className="text-xs text-gray-300">描边模式</span>
                                <span className="text-xs text-gray-500">（轨道始终面向相机）</span>
                              </div>
                              <div className={currentOrbitingFirefly.billboardOrbit ? 'opacity-40 pointer-events-none' : ''}>
                                <OrbitAxisSelector orbitAxis={currentOrbitingFirefly.orbitAxis} onChange={(orbitAxis) => updateOrbitingFirefly(currentOrbitingFirefly.id, { orbitAxis })} />
                                {currentOrbitingFirefly.billboardOrbit && <span className="text-xs text-gray-500 block -mt-1 mb-1">（描边模式下无效）</span>}
                              </div>
                              <RangeControl label="初始相位" value={currentOrbitingFirefly.initialPhase} min={0} max={360} step={15} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { initialPhase: v })} />
                            </div>
                            
                            {/* 外观参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">外观</span>
                              <RangeControl label="大小" value={currentOrbitingFirefly.size} min={1} max={100} step={1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { size: v })} />
                              <RangeControl label="亮度" value={currentOrbitingFirefly.brightness} min={0.5} max={8} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { brightness: v })} />
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-300 w-16">头部样式</span>
                                <select
                                  value={currentOrbitingFirefly.headStyle || 'flare'}
                                  onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { headStyle: e.target.value as any })}
                                  className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-200"
                                >
                                  <option value="plain">普通圆点</option>
                                  <option value="flare">N叶星芒</option>
                                  <option value="spark">尖锐火花</option>
                                  <option value="texture">贴图</option>
                                </select>
                              </div>
                              {currentOrbitingFirefly.headStyle === 'flare' && (
                                <>
                                  <RangeControl label="星芒强度" value={currentOrbitingFirefly.flareIntensity ?? 1} min={0} max={2} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { flareIntensity: v })} />
                                  <RangeControl label="叶片数" value={currentOrbitingFirefly.flareLeaves ?? 4} min={4} max={8} step={1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { flareLeaves: v })} />
                                  <RangeControl label="星芒宽度" value={currentOrbitingFirefly.flareWidth ?? 0.5} min={0.1} max={1} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { flareWidth: v })} />
                                  <RangeControl label="色散强度" value={currentOrbitingFirefly.chromaticAberration ?? 0.3} min={0} max={1} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { chromaticAberration: v })} />
                                </>
                              )}
                              {currentOrbitingFirefly.headStyle === 'texture' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-300 w-16">选择贴图</span>
                                  <select
                                    value={currentOrbitingFirefly.headTexture || ''}
                                    onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { headTexture: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-200"
                                  >
                                    <option value="">请选择...</option>
                                    <option value="/textures/flare1.png">光效 1</option>
                                    <option value="/textures/flare2.png">光效 2</option>
                                    <option value="/textures/flare3.png">光效 3</option>
                                    <option value="/textures/flare4.png">光效 4</option>
                                    <option value="/textures/flare5.png">光效 5</option>
                                    <option value="/textures/flare6.png">光效 6</option>
                                    <option value="/textures/flare7.png">光效 7</option>
                                    <option value="/textures/flare8.png">光效 8</option>
                                    <option value="/textures/flare9.png">光效 9</option>
                                  </select>
                                </div>
                              )}
                              <RangeControl label="光晕强度" value={currentOrbitingFirefly.glowIntensity ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { glowIntensity: v })} />
                              <RangeControl label="脉冲速度" value={currentOrbitingFirefly.pulseSpeed ?? 1} min={0} max={10} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { pulseSpeed: v })} />
                            </div>
                            
                            {/* 动态效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">动态效果</span>
                              <RangeControl label="速度拉伸" value={currentOrbitingFirefly.velocityStretch ?? 0} min={0} max={2} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { velocityStretch: v })} />
                              <RangeControl label="噪声扰动" value={currentOrbitingFirefly.noiseAmount ?? 0.2} min={0} max={1} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { noiseAmount: v })} />
                            </div>
                            
                            {/* 拖尾参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" checked={currentOrbitingFirefly.trailEnabled} onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { trailEnabled: e.target.checked })} className="w-4 h-4 rounded bg-gray-600" />
                                <span className="text-xs text-gray-400">启用拖尾</span>
                              </div>
                              {currentOrbitingFirefly.trailEnabled && (
                                <>
                                  <RangeControl label="拖尾长度" value={currentOrbitingFirefly.trailLength} min={1} max={1000} step={5} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { trailLength: v })} />
                                  <RangeControl label="粗细衰减" value={currentOrbitingFirefly.trailTaperPower ?? 1.0} min={0.3} max={3} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { trailTaperPower: v })} />
                                  <RangeControl label="拖尾透明度" value={currentOrbitingFirefly.trailOpacity ?? 0.8} min={0} max={1} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { trailOpacity: v })} />
                                </>
                              )}
                            </div>
                            
                            {/* 轨道波动 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <div className="flex items-center gap-2 mb-2">
                                <input type="checkbox" checked={currentOrbitingFirefly.radiusWave?.enabled ?? false} onChange={(e) => {
                                  const wave = currentOrbitingFirefly.radiusWave || { enabled: false, amplitude: 20, frequency: 0.5, randomPhase: true, waveType: 'sine' as const };
                                  updateOrbitingFirefly(currentOrbitingFirefly.id, { radiusWave: { ...wave, enabled: e.target.checked } });
                                }} className="w-4 h-4 rounded bg-gray-600" />
                                <span className="text-xs text-gray-400">轨道半径波动</span>
                              </div>
                              {currentOrbitingFirefly.radiusWave?.enabled && (
                                <>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-gray-400 w-16">波形</span>
                                    <select value={currentOrbitingFirefly.radiusWave?.waveType || 'sine'} onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { radiusWave: { ...currentOrbitingFirefly.radiusWave!, waveType: e.target.value as 'sine' | 'triangle' } })} className="flex-1 text-xs bg-gray-700 rounded px-2 py-1 text-white cursor-pointer">
                                      <option value="sine">正弦波（平滑）</option>
                                      <option value="triangle">三角波（锐利）</option>
                                    </select>
                                  </div>
                                  <RangeControl label="波动幅度" value={currentOrbitingFirefly.radiusWave?.amplitude ?? 20} min={5} max={100} step={5} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { radiusWave: { ...currentOrbitingFirefly.radiusWave!, amplitude: v } })} />
                                  <RangeControl label="波动频率" value={currentOrbitingFirefly.radiusWave?.frequency ?? 0.5} min={0.1} max={3} step={0.1} onChange={(v) => updateOrbitingFirefly(currentOrbitingFirefly.id, { radiusWave: { ...currentOrbitingFirefly.radiusWave!, frequency: v } })} />
                                  <div className="flex items-center gap-2 mt-1">
                                    <input type="checkbox" checked={currentOrbitingFirefly.radiusWave?.randomPhase ?? true} onChange={(e) => updateOrbitingFirefly(currentOrbitingFirefly.id, { radiusWave: { ...currentOrbitingFirefly.radiusWave!, randomPhase: e.target.checked } })} className="w-4 h-4 rounded bg-gray-600" />
                                    <span className="text-xs text-gray-300">随机相位</span>
                                  </div>
                                </>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    
                    {/* 游走流萤 */}
                    {fireflySubTab === 'wandering' && (
                      <div className="border-l-2 pl-2" style={{ borderColor: 'var(--ui-decoration)' }}>
                        <FloatingListSelector
                          items={planet.fireflies.wanderingGroups}
                          selectedId={effectiveSelectedWanderingGroupId}
                          onSelect={(id) => setSelectedWanderingGroupId(id)}
                          onToggleEnabled={(id, enabled) => updateWanderingGroup(id, { enabled })}
                          onRename={(id, name) => updateWanderingGroup(id, { name })}
                          onDelete={(id) => {
                            const updated = planet.fireflies.wanderingGroups.filter(g => g.id !== id);
                            updatePlanet({ fireflies: { ...planet.fireflies, wanderingGroups: updated } });
                            if (effectiveSelectedWanderingGroupId === id) setSelectedWanderingGroupId(updated[0]?.id || null);
                          }}
                          onAdd={() => {
                            const id = Date.now().toString();
                            const newGroup = createDefaultWanderingGroup(id, `游走流萤组 ${planet.fireflies.wanderingGroups.length + 1}`);
                            updatePlanet({ fireflies: { ...planet.fireflies, wanderingGroups: [...planet.fireflies.wanderingGroups, newGroup] } });
                            setSelectedWanderingGroupId(id);
                          }}
                          onColorChange={(id, color) => updateWanderingGroup(id, { color })}
                          globalEnabled={planet.fireflies.wanderingEnabled}
                          onGlobalToggle={(enabled) => updatePlanet({ fireflies: { ...planet.fireflies, wanderingEnabled: enabled } })}
                          title="游走流萤组"
                          titleColor="text-green-400"
                          addButtonColor="bg-green-600 hover:bg-green-500"
                          emptyText="暂无游走流萤组"
                        />
                        
                        {/* 预设列表 */}
                        <PresetListBox
                          storageKey={PRESET_STORAGE_KEYS.wanderingFirefly}
                          builtInPresets={[
                            { id: 'firefly', name: '🌟 萤火虫', data: WANDERING_FIREFLY_PRESETS.firefly },
                            { id: 'fairy', name: '🧚 精灵光', data: WANDERING_FIREFLY_PRESETS.fairy },
                            { id: 'sparkle', name: '💫 闪烁星', data: WANDERING_FIREFLY_PRESETS.sparkle },
                          ]}
                          currentData={currentWanderingGroup ? { ...currentWanderingGroup, id: undefined, name: undefined, enabled: undefined } : null}
                          hasInstance={!!currentWanderingGroup}
                          instanceName="游走流萤组"
                          onApplyToInstance={(data) => {
                            if (currentWanderingGroup) {
                              updateWanderingGroup(currentWanderingGroup.id, { ...data });
                            }
                          }}
                          onCreateInstance={(data, presetName) => {
                            const id = Date.now().toString();
                            const newGroup = {
                              ...createDefaultWanderingGroup(id, `${presetName.replace(/^[^\s]+\s/, '')} ${planet.fireflies.wanderingGroups.length + 1}`),
                              ...data,
                              enabled: true
                            };
                            updatePlanet({ fireflies: { ...planet.fireflies, wanderingGroups: [...planet.fireflies.wanderingGroups, newGroup] } });
                            setSelectedWanderingGroupId(id);
                          }}
                          title="预设"
                          accentColor="green"
                        />
                        <div className="flex gap-2 mb-2">
                          <ExportPresetButton storageKey={PRESET_STORAGE_KEYS.wanderingFirefly} moduleName="wanderingFirefly" builtInPresets={[
                            { id: 'firefly', name: '🌟 萤火虫', data: WANDERING_FIREFLY_PRESETS.firefly },
                            { id: 'fairy', name: '🧚 精灵光', data: WANDERING_FIREFLY_PRESETS.fairy },
                            { id: 'sparkle', name: '💫 闪烁星', data: WANDERING_FIREFLY_PRESETS.sparkle },
                          ]} />
                          <ImportPresetButton storageKey={PRESET_STORAGE_KEYS.wanderingFirefly} moduleName="wanderingFirefly" />
                        </div>
                        
                        {/* 游走流萤组参数 */}
                        {currentWanderingGroup && (
                          <div className="mt-3 space-y-2">
                            {/* 数量和边界 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">数量与边界</span>
                              <RangeControl label="数量" value={currentWanderingGroup.count} min={1} max={1000} step={1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { count: v })} />
                              <RangeControl label="内边界(R)" value={currentWanderingGroup.innerRadius} min={0.5} max={5} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { innerRadius: v })} />
                              <RangeControl label="外边界(R)" value={currentWanderingGroup.outerRadius} min={1} max={15} step={0.5} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { outerRadius: v })} />
                            </div>
                            
                            {/* 运动参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">运动</span>
                              <RangeControl label="移动速度" value={currentWanderingGroup.speed} min={0.1} max={2} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { speed: v })} />
                              <RangeControl label="转向频率" value={currentWanderingGroup.turnFrequency} min={0} max={1} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { turnFrequency: v })} />
                            </div>
                            
                            {/* 外观参数 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">外观</span>
                              <RangeControl label="大小" value={currentWanderingGroup.size} min={1} max={100} step={1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { size: v })} />
                              <RangeControl label="亮度" value={currentWanderingGroup.brightness || 1.0} min={0.5} max={8} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { brightness: v })} />
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-xs text-gray-300 w-16">头部样式</span>
                                <select
                                  value={currentWanderingGroup.headStyle || 'flare'}
                                  onChange={(e) => updateWanderingGroup(currentWanderingGroup.id, { headStyle: e.target.value as any })}
                                  className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-200"
                                >
                                  <option value="plain">普通圆点</option>
                                  <option value="flare">N叶星芒</option>
                                  <option value="spark">尖锐火花</option>
                                  <option value="texture">贴图</option>
                                </select>
                              </div>
                              {currentWanderingGroup.headStyle === 'flare' && (
                                <>
                                  <RangeControl label="星芒强度" value={currentWanderingGroup.flareIntensity ?? 1} min={0} max={2} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { flareIntensity: v })} />
                                  <RangeControl label="叶片数" value={currentWanderingGroup.flareLeaves ?? 4} min={4} max={8} step={1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { flareLeaves: v })} />
                                  <RangeControl label="星芒宽度" value={currentWanderingGroup.flareWidth ?? 0.5} min={0.1} max={1} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { flareWidth: v })} />
                                  <RangeControl label="色散强度" value={currentWanderingGroup.chromaticAberration ?? 0.3} min={0} max={1} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { chromaticAberration: v })} />
                                </>
                              )}
                              {currentWanderingGroup.headStyle === 'texture' && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-gray-300 w-16">选择贴图</span>
                                  <select
                                    value={currentWanderingGroup.headTexture || ''}
                                    onChange={(e) => updateWanderingGroup(currentWanderingGroup.id, { headTexture: e.target.value })}
                                    className="flex-1 px-2 py-1 bg-gray-700 rounded text-xs text-gray-200"
                                  >
                                    <option value="">请选择...</option>
                                    <option value="/textures/flare1.png">光效 1</option>
                                    <option value="/textures/flare2.png">光效 2</option>
                                    <option value="/textures/flare3.png">光效 3</option>
                                    <option value="/textures/flare4.png">光效 4</option>
                                    <option value="/textures/flare5.png">光效 5</option>
                                    <option value="/textures/flare6.png">光效 6</option>
                                    <option value="/textures/flare7.png">光效 7</option>
                                    <option value="/textures/flare8.png">光效 8</option>
                                    <option value="/textures/flare9.png">光效 9</option>
                                  </select>
                                </div>
                              )}
                              <RangeControl label="光晕强度" value={currentWanderingGroup.glowIntensity ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { glowIntensity: v })} />
                              <RangeControl label="脉冲速度" value={currentWanderingGroup.pulseSpeed ?? 1.5} min={0} max={10} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { pulseSpeed: v })} />
                            </div>
                            
                            {/* 动态效果 */}
                            <div className="p-2 bg-gray-800/50 rounded">
                              <span className="text-xs text-gray-400 block mb-2">动态效果</span>
                              <RangeControl label="速度拉伸" value={currentWanderingGroup.velocityStretch ?? 0.5} min={0} max={2} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { velocityStretch: v })} />
                              <RangeControl label="噪声扰动" value={currentWanderingGroup.noiseAmount ?? 0.2} min={0} max={1} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { noiseAmount: v })} />
                              <RangeControl label="粗细衰减" value={currentWanderingGroup.trailTaperPower ?? 1.0} min={0.3} max={3} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { trailTaperPower: v })} />
                              <RangeControl label="拖尾透明度" value={currentWanderingGroup.trailOpacity ?? 0.8} min={0} max={1} step={0.1} onChange={(v) => updateWanderingGroup(currentWanderingGroup.id, { trailOpacity: v })} />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </ControlGroup>
                  );
                })()}
              </>
            );
          })()}
          
          {/* 未选择星球时的提示 */}
          {planetTab === 'basic' && !selectedPlanetId && (
            <div className="p-4 bg-gray-800/50 rounded-lg text-center">
              <p className="text-xs text-gray-400">请先在上方星球列表中选择一个星球</p>
            </div>
          )}

          {/* ========== 特殊效果 Tab ========== */}
          {planetTab === 'visual' && (
            <>
              {/* 视觉效果 */}
              <ControlGroup title="🎨 视觉效果">
                <RangeControl label="Bloom 辉光" value={planetSettings.bloomStrength} min={0} max={10} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, bloomStrength: v }))} />
                
                <div className="flex items-center space-x-2 text-xs text-gray-300 mt-2">
                  <input type="checkbox" checked={planetSettings.trailEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, trailEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                  <span>拖尾残影</span>
                </div>
                {planetSettings.trailEnabled && (
                  <RangeControl label="拖尾长度" value={planetSettings.trailLength} min={0} max={1} step={0.05} onChange={(v) => setPlanetSettings(prev => ({ ...prev, trailLength: v }))} />
                )}
              </ControlGroup>

              {/* 动态效果 */}
              <ControlGroup title="🌊 动态效果">
                {/* 呼吸 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.breathingEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, breathingEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">呼吸效果</span>
                  </div>
                  {planetSettings.breathingEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="呼吸速度" value={planetSettings.breathingSpeed} min={0.1} max={2} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, breathingSpeed: v }))} />
                      <RangeControl label="呼吸幅度" value={planetSettings.breathingIntensity} min={0.05} max={0.5} step={0.05} onChange={(v) => setPlanetSettings(prev => ({ ...prev, breathingIntensity: v }))} />
                    </div>
                  )}
                </div>
                
                {/* 荧光闪烁 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.flickerEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, flickerEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">✨ 荧光闪烁</span>
                  </div>
                  {planetSettings.flickerEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="闪烁强度" value={planetSettings.flickerIntensity} min={0} max={1} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, flickerIntensity: v }))} />
                      <RangeControl label="闪烁速度" value={planetSettings.flickerSpeed} min={0.5} max={5} step={0.5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, flickerSpeed: v }))} />
                    </div>
                  )}
                </div>
                
                {/* 游走闪电 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.wanderingLightningEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, wanderingLightningEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">⚡ 游走闪电</span>
                  </div>
                  {planetSettings.wanderingLightningEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="闪电强度" value={planetSettings.wanderingLightningIntensity} min={0} max={2} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, wanderingLightningIntensity: v }))} />
                      <RangeControl label="游走速度" value={planetSettings.wanderingLightningSpeed} min={0.1} max={3} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, wanderingLightningSpeed: v }))} />
                      <RangeControl label="闪电密度" value={planetSettings.wanderingLightningDensity} min={1} max={10} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, wanderingLightningDensity: v }))} />
                      <RangeControl label="闪电宽度" value={planetSettings.wanderingLightningWidth} min={1} max={10} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, wanderingLightningWidth: v }))} />
                    </div>
                  )}
                </div>
                
                {/* 闪电击穿 */}
                <div className="p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.lightningBreakdownEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, lightningBreakdownEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">🔥 闪电击穿</span>
                  </div>
                  {planetSettings.lightningBreakdownEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="击穿强度" value={planetSettings.lightningBreakdownIntensity} min={0} max={3} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightningBreakdownIntensity: v }))} />
                      <RangeControl label="击穿频率" value={planetSettings.lightningBreakdownFrequency} min={0.1} max={2} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightningBreakdownFrequency: v }))} />
                      <RangeControl label="分支数" value={planetSettings.lightningBreakdownBranches} min={1} max={5} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightningBreakdownBranches: v }))} />
                    </div>
                  )}
                </div>
              </ControlGroup>

              {/* 上升效果 */}
              <ControlGroup title="🌟 上升效果">
                {/* 璀璨星雨 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.starRainEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, starRainEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">✨ 璀璨星雨</span>
                  </div>
                  {planetSettings.starRainEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="粒子数量" value={planetSettings.starRainCount} min={50} max={1500} step={50} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainCount: v }))} />
                      <RangeControl label="粒子大小" value={planetSettings.starRainSize} min={1} max={15} step={0.5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainSize: v }))} />
                      <RangeControl label="上升速度" value={planetSettings.starRainSpeed} min={0.1} max={5} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainSpeed: v }))} />
                      <RangeControl label="速度差异" value={planetSettings.starRainSpeedVariation} min={0} max={1} step={0.05} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainSpeedVariation: v }))} />
                      <RangeControl label="上升高度" value={planetSettings.starRainHeight} min={50} max={1000} step={25} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainHeight: v }))} />
                      <RangeControl label="扩散范围" value={planetSettings.starRainSpread} min={20} max={500} step={10} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainSpread: v }))} />
                      <RangeControl label="拖尾长度" value={planetSettings.starRainTrailLength} min={0} max={1} step={0.05} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainTrailLength: v }))} />
                      <RangeControl label="亮度" value={planetSettings.starRainBrightness} min={0.3} max={5} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, starRainBrightness: v }))} />
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">颜色</span>
                        <input type="color" value={planetSettings.starRainColor} onChange={(e) => setPlanetSettings(prev => ({ ...prev, starRainColor: e.target.value }))} className="w-8 h-6 rounded cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 体积薄雾 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.volumeFogEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, volumeFogEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">🌫️ 体积薄雾</span>
                  </div>
                  {planetSettings.volumeFogEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="层数" value={planetSettings.volumeFogLayers} min={3} max={7} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogLayers: v }))} />
                      <RangeControl label="内半径" value={planetSettings.volumeFogInnerRadius} min={30} max={100} step={5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogInnerRadius: v }))} />
                      <RangeControl label="外半径" value={planetSettings.volumeFogOuterRadius} min={100} max={300} step={10} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogOuterRadius: v }))} />
                      <RangeControl label="高度范围" value={planetSettings.volumeFogHeight} min={50} max={200} step={10} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogHeight: v }))} />
                      <RangeControl label="透明度" value={planetSettings.volumeFogOpacity} min={0.05} max={0.3} step={0.01} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogOpacity: v }))} />
                      <RangeControl label="流动速度" value={planetSettings.volumeFogSpeed} min={0.1} max={1} step={0.05} onChange={(v) => setPlanetSettings(prev => ({ ...prev, volumeFogSpeed: v }))} />
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">颜色</span>
                        <input type="color" value={planetSettings.volumeFogColor} onChange={(e) => setPlanetSettings(prev => ({ ...prev, volumeFogColor: e.target.value }))} className="w-8 h-6 rounded cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 光球灯笼 */}
                <div className="mb-3 p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.lightOrbsEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, lightOrbsEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">🎈 光球灯笼</span>
                  </div>
                  {planetSettings.lightOrbsEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="最大数量" value={planetSettings.lightOrbsMaxCount} min={3} max={10} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsMaxCount: v }))} />
                      <RangeControl label="生成间隔" value={planetSettings.lightOrbsSpawnRate} min={0.5} max={5} step={0.5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsSpawnRate: v }))} />
                      <RangeControl label="初始大小" value={planetSettings.lightOrbsSize} min={5} max={30} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsSize: v }))} />
                      <RangeControl label="膨胀倍数" value={planetSettings.lightOrbsGrowth} min={1} max={3} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsGrowth: v }))} />
                      <RangeControl label="上升速度" value={planetSettings.lightOrbsSpeed} min={0.3} max={1.5} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsSpeed: v }))} />
                      <RangeControl label="上升高度" value={planetSettings.lightOrbsHeight} min={100} max={400} step={20} onChange={(v) => setPlanetSettings(prev => ({ ...prev, lightOrbsHeight: v }))} />
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">颜色</span>
                        <input type="color" value={planetSettings.lightOrbsColor} onChange={(e) => setPlanetSettings(prev => ({ ...prev, lightOrbsColor: e.target.value }))} className="w-8 h-6 rounded cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
                
                {/* 直冲电弧 */}
                <div className="p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2 text-xs text-gray-300 mb-2">
                    <input type="checkbox" checked={planetSettings.electricArcsEnabled} onChange={(e) => setPlanetSettings(prev => ({ ...prev, electricArcsEnabled: e.target.checked }))} className="rounded bg-gray-700" />
                    <span className="font-medium">⚡ 直冲电弧</span>
                  </div>
                  {planetSettings.electricArcsEnabled && (
                    <div className="space-y-1">
                      <RangeControl label="触发间隔" value={planetSettings.electricArcsInterval} min={2} max={10} step={0.5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, electricArcsInterval: v }))} />
                      <RangeControl label="电弧高度" value={planetSettings.electricArcsHeight} min={100} max={500} step={20} onChange={(v) => setPlanetSettings(prev => ({ ...prev, electricArcsHeight: v }))} />
                      <RangeControl label="粗细" value={planetSettings.electricArcsThickness} min={2} max={10} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, electricArcsThickness: v }))} />
                      <RangeControl label="分支数" value={planetSettings.electricArcsBranches} min={0} max={5} step={1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, electricArcsBranches: v }))} />
                      <RangeControl label="持续时间" value={planetSettings.electricArcsDuration} min={0.3} max={1.5} step={0.1} onChange={(v) => setPlanetSettings(prev => ({ ...prev, electricArcsDuration: v }))} />
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-400">颜色</span>
                        <input type="color" value={planetSettings.electricArcsColor} onChange={(e) => setPlanetSettings(prev => ({ ...prev, electricArcsColor: e.target.value }))} className="w-8 h-6 rounded cursor-pointer" />
                      </div>
                    </div>
                  )}
                </div>
              </ControlGroup>

              <p className="text-xs text-gray-500 text-center mt-2">特殊效果为全局设置，不保存到单个星球</p>
            </>
          )}

          {/* ========== 星系交互 Tab ========== */}
          {planetTab === 'interact' && (
            <>
              <ControlGroup title="👆 手势交互">
                {/* 手势控制开关 */}
                <div className="flex items-center justify-between mb-3 p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-300">手势控制</span>
                  <button
                    onClick={() => setGestureEnabled(!gestureEnabled)}
                    className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${
                      gestureEnabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {gestureEnabled ? '已开启' : '已关闭'}
                  </button>
                </div>
                
                <RangeControl label="交互强度" value={planetSettings.interactionStrength} min={0} max={200} step={5} onChange={(v) => setPlanetSettings(prev => ({ ...prev, interactionStrength: v }))} />
                <RangeControl label="影响半径" value={planetSettings.interactionRadius} min={10} max={300} step={10} onChange={(v) => setPlanetSettings(prev => ({ ...prev, interactionRadius: v }))} />
                
                <div className="mt-3">
                  <label className="block text-xs text-gray-400 mb-2">交互类型</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button onClick={() => setPlanetSettings(prev => ({ ...prev, interactionType: 'repulse' }))} className={`px-3 py-2 text-xs rounded transition-colors ${planetSettings.interactionType === 'repulse' ? 'bg-blue-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      💨 排斥
                    </button>
                    <button onClick={() => setPlanetSettings(prev => ({ ...prev, interactionType: 'attract' }))} className={`px-3 py-2 text-xs rounded transition-colors ${planetSettings.interactionType === 'attract' ? 'bg-purple-600 text-white' : 'bg-gray-700 text-gray-400 hover:bg-gray-600'}`}>
                      🧲 吸引
                    </button>
                  </div>
                </div>
              </ControlGroup>

              <ControlGroup title="🌌 背景设置">
                {/* 全景图背景开关 */}
                <div className="flex items-center justify-between mb-3 p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-300">全景图背景</span>
                  <button
                    onClick={() => setPlanetSettings(prev => ({ 
                      ...prev, 
                      background: { ...prev.background, enabled: !prev.background?.enabled } 
                    }))}
                    className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${
                      planetSettings.background?.enabled 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {planetSettings.background?.enabled ? '已开启' : '已关闭'}
                  </button>
                </div>
                
                {/* 全景图选择 */}
                <div className="mb-3">
                  <label className="text-xs text-gray-400 block mb-1">全景图 ({BACKGROUND_IMAGES.length}张)</label>
                  <select 
                    value={planetSettings.background?.panoramaUrl || '/background/starfield.jpg'}
                    onChange={(e) => setPlanetSettings(prev => ({ 
                      ...prev, 
                      background: { ...prev.background, panoramaUrl: e.target.value } 
                    }))}
                    className="w-full bg-gray-700 text-white text-xs rounded px-2 py-1.5"
                  >
                    {BACKGROUND_IMAGES.length > 0 ? (
                      BACKGROUND_IMAGES.map(img => (
                        <option key={img.value} value={img.value}>{img.label}</option>
                      ))
                    ) : (
                      <option value="/background/starfield.jpg">默认星空</option>
                    )}
                  </select>
                  <span className="text-[10px] text-gray-500 mt-1 block">
                    添加图片到 public/background/ 后重新构建生效
                  </span>
                </div>
                
                <RangeControl 
                  label="背景亮度" 
                  value={planetSettings.background?.brightness ?? 1.0} 
                  min={0} 
                  max={2} 
                  step={0.1} 
                  onChange={(v) => setPlanetSettings(prev => ({ 
                    ...prev, 
                    background: { ...prev.background, brightness: v } 
                  }))} 
                />
                
                <RangeControl 
                  label="背景饱和度" 
                  value={planetSettings.background?.saturation ?? 1.0} 
                  min={0} 
                  max={5} 
                  step={0.1} 
                  onChange={(v) => setPlanetSettings(prev => ({ 
                    ...prev, 
                    background: { ...prev.background, saturation: v } 
                  }))} 
                />
                
                <RangeControl 
                  label="背景旋转" 
                  value={planetSettings.background?.rotation ?? 0} 
                  min={0} 
                  max={360} 
                  step={10} 
                  onChange={(v) => setPlanetSettings(prev => ({ 
                    ...prev, 
                    background: { ...prev.background, rotation: v } 
                  }))} 
                />
              </ControlGroup>

              <ControlGroup title="📷 相机设置">
                {/* 相机自动旋转开关 */}
                <div className="flex items-center justify-between mb-3 p-2 bg-gray-800 rounded">
                  <span className="text-xs text-gray-300">视角自动旋转</span>
                  <button
                    onClick={() => setPlanetSettings(prev => ({ ...prev, cameraAutoRotate: !prev.cameraAutoRotate }))}
                    className={`px-3 py-1 text-xs rounded-full font-bold transition-colors ${
                      planetSettings.cameraAutoRotate 
                        ? 'bg-green-600 text-white' 
                        : 'bg-gray-600 text-gray-400'
                    }`}
                  >
                    {planetSettings.cameraAutoRotate ? '已开启' : '已关闭'}
                  </button>
                </div>
                
                {planetSettings.cameraAutoRotate && (
                  <RangeControl 
                    label="旋转速度" 
                    value={planetSettings.cameraAutoRotateSpeed} 
                    min={0.1} 
                    max={2} 
                    step={0.1} 
                    onChange={(v) => setPlanetSettings(prev => ({ ...prev, cameraAutoRotateSpeed: v }))} 
                  />
                )}
              </ControlGroup>

              <div className="p-4 bg-gray-800 rounded-lg">
                <h4 className="text-xs font-bold text-white mb-2">交互说明</h4>
                <ul className="text-xs text-gray-400 list-disc pl-4 space-y-1">
                  <li><strong>鼠标/触控:</strong> 旋转视角</li>
                  <li><strong>滚轮:</strong> 缩放视角</li>
                  <li><strong>手掌平移:</strong> 推动/吸引粒子</li>
                  <li><strong>自动旋转:</strong> 相机缓慢环绕星球</li>
                </ul>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
};

export default ControlPanel;