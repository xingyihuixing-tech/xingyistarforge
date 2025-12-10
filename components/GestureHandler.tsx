import React, { useEffect, useRef, useState } from 'react';
import { HandData } from '../types';
import { FilesetResolver, HandLandmarker } from "@mediapipe/tasks-vision";

interface GestureHandlerProps {
  handDataRef: React.MutableRefObject<HandData>;
  enabled: boolean;
  showVideo?: boolean; // 是否显示摄像头小窗，默认 true
}

// Configuration for gesture stability
const GESTURE_CONFIG = {
  // Number of consecutive frames required to confirm a gesture change
  STABILITY_FRAMES: 3,
  // Threshold for fist detection (relaxed for easier detection)
  FIST_THRESHOLD: 1.1, // tipDist < mcpDist * threshold
  // Minimum fingers that must be closed for fist
  MIN_CLOSED_FINGERS: 3,
  // Number of frames without hand before deactivating
  NO_HAND_FRAMES: 5,
  // Smoothing factor for position (0-1, lower = smoother)
  POSITION_SMOOTHING: 0.3,
  // Smoothing factor for openness
  OPENNESS_SMOOTHING: 0.2,
};

const GestureHandler: React.FC<GestureHandlerProps> = ({ handDataRef, enabled, showVideo = true }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastVideoTimeRef = useRef(-1);
  const handLandmarkerRef = useRef<HandLandmarker | null>(null);
  const requestRef = useRef<number>(0);

  // Stability tracking refs
  const closedFrameCountRef = useRef(0);
  const openFrameCountRef = useRef(0);
  const noHandFrameCountRef = useRef(0);
  const confirmedClosedRef = useRef(false);
  
  // Smoothed position refs
  const smoothedPosRef = useRef({ x: 0, y: 0 });
  const smoothedOpennessRef = useRef(0);

  useEffect(() => {
    const init = async () => {
      try {
        const vision = await FilesetResolver.forVisionTasks(
          "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
        );
        const handLandmarker = await HandLandmarker.createFromOptions(vision, {
          baseOptions: {
            modelAssetPath: "https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task",
            delegate: "GPU"
          },
          runningMode: "VIDEO",
          numHands: 1,
          minHandDetectionConfidence: 0.7, // Higher confidence threshold
          minHandPresenceConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });
        handLandmarkerRef.current = handLandmarker;
        setIsLoaded(true);
      } catch (err) {
        console.error(err);
        setError("无法加载 MediaPipe");
      }
    };
    if (enabled) init();
  }, [enabled]);

  useEffect(() => {
    if (!isLoaded || !enabled) return;

    const enableCam = async () => {
        if (!navigator.mediaDevices?.getUserMedia) {
            setError("不支持摄像头");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.addEventListener("loadeddata", predictWebcam);
            }
        } catch (err) {
            setError("摄像头权限被拒绝");
        }
    };

    enableCam();

    return () => {
        // Cleanup
        if (videoRef.current && videoRef.current.srcObject) {
             const stream = videoRef.current.srcObject as MediaStream;
             stream.getTracks().forEach(track => track.stop());
        }
        cancelAnimationFrame(requestRef.current);
    };
  }, [isLoaded, enabled]);


  const predictWebcam = () => {
    if (!handLandmarkerRef.current || !videoRef.current) return;
    
    let startTimeMs = performance.now();
    
    if (lastVideoTimeRef.current !== videoRef.current.currentTime) {
        lastVideoTimeRef.current = videoRef.current.currentTime;
        const results = handLandmarkerRef.current.detectForVideo(videoRef.current, startTimeMs);
        
        if (results.landmarks && results.landmarks.length > 0) {
            noHandFrameCountRef.current = 0; // Reset no-hand counter
            const landmarks = results.landmarks[0];
            
            const wrist = landmarks[0];
            const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky tips
            const mcps = [5, 9, 13, 17]; // Corresponding MCP joints
            
            // Calculate openness: average distance of fingertips from wrist
            // compared to MCP joints distance (normalized 0-1)
            let totalOpenness = 0;
            let fingersClosedCount = 0;
            
            for(let i = 0; i < 4; i++) {
                const tip = landmarks[tips[i]];
                const mcp = landmarks[mcps[i]];
                
                const tipDist = Math.sqrt(Math.pow(tip.x - wrist.x, 2) + Math.pow(tip.y - wrist.y, 2));
                const mcpDist = Math.sqrt(Math.pow(mcp.x - wrist.x, 2) + Math.pow(mcp.y - wrist.y, 2));
                
                // Calculate how extended this finger is (0 = closed, 1+ = open)
                const fingerExtension = tipDist / mcpDist;
                
                // Openness contribution: clamp between 0-1
                // When tipDist > mcpDist * 1.5, finger is fully extended
                // When tipDist < mcpDist, finger is closed
                const fingerOpenness = Math.max(0, Math.min(1, (fingerExtension - 0.8) / 0.7));
                totalOpenness += fingerOpenness;
                
                // Check if finger is closed
                if (tipDist < mcpDist * GESTURE_CONFIG.FIST_THRESHOLD) {
                    fingersClosedCount++;
                }
            }
            
            // Average openness (0-1)
            const rawOpenness = totalOpenness / 4;
            
            // Smooth the openness value
            smoothedOpennessRef.current += (rawOpenness - smoothedOpennessRef.current) * GESTURE_CONFIG.OPENNESS_SMOOTHING;
            
            // Fist detection: most fingers closed
            const rawIsClosed = fingersClosedCount >= GESTURE_CONFIG.MIN_CLOSED_FINGERS;

            // Stability logic for fist detection
            if (rawIsClosed) {
                closedFrameCountRef.current++;
                openFrameCountRef.current = 0;
                
                if (closedFrameCountRef.current >= GESTURE_CONFIG.STABILITY_FRAMES) {
                    confirmedClosedRef.current = true;
                }
            } else {
                openFrameCountRef.current++;
                closedFrameCountRef.current = 0;
                
                if (openFrameCountRef.current >= GESTURE_CONFIG.STABILITY_FRAMES) {
                    confirmedClosedRef.current = false;
                }
            }

            // Position with smoothing
            const palmX = landmarks[9].x;
            const palmY = landmarks[9].y;

            // Map to Screen Coordinates (-1 to 1), mirrored
            const rawNdcX = -(palmX * 2 - 1); 
            const rawNdcY = -(palmY * 2 - 1); 

            // Apply exponential smoothing
            smoothedPosRef.current.x += (rawNdcX - smoothedPosRef.current.x) * GESTURE_CONFIG.POSITION_SMOOTHING;
            smoothedPosRef.current.y += (rawNdcY - smoothedPosRef.current.y) * GESTURE_CONFIG.POSITION_SMOOTHING;

            handDataRef.current = {
                isActive: true,
                x: smoothedPosRef.current.x,
                y: smoothedPosRef.current.y,
                z: landmarks[9].z, 
                isPinching: false, // No longer used
                isClosed: confirmedClosedRef.current,
                openness: smoothedOpennessRef.current
            };
        } else {
            // No hand detected - use frame counting before deactivating
            noHandFrameCountRef.current++;
            
            if (noHandFrameCountRef.current >= GESTURE_CONFIG.NO_HAND_FRAMES) {
                // Reset all states when hand is gone for a while
                handDataRef.current = { ...handDataRef.current, isActive: false };
                confirmedClosedRef.current = false;
                closedFrameCountRef.current = 0;
                openFrameCountRef.current = 0;
            }
            // Keep previous state for a few frames to avoid flickering
        }
    }
    requestRef.current = requestAnimationFrame(predictWebcam);
  };

  if (!enabled) return null;

  // 如果不显示视频，只渲染隐藏的 video 元素用于手势检测
  if (!showVideo) {
    return (
      <video 
        ref={videoRef} 
        className="hidden" 
        autoPlay 
        muted 
        playsInline 
      />
    );
  }

  return (
    <div className="absolute bottom-4 left-4 z-50 pointer-events-none">
      <div className="relative border border-white/20 rounded overflow-hidden shadow-lg w-32 h-24 bg-black">
        <video 
            ref={videoRef} 
            className="w-full h-full object-cover opacity-50 transform scale-x-[-1]" 
            autoPlay 
            muted 
            playsInline 
        />
        {error && <div className="absolute inset-0 flex items-center justify-center text-red-500 text-xs text-center p-1 bg-black/80">{error}</div>}
        <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-green-500 animate-pulse" />
      </div>
      <p className="text-xs text-white/50 mt-1 ml-1 font-mono">手势追踪已激活</p>
    </div>
  );
};

export default GestureHandler;