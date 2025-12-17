import React, { useRef, useEffect, useState, useCallback } from 'react';
import { Camera, RefreshCw, AlertCircle, Keyboard } from 'lucide-react';
import { detectHandGesture } from '../services/gemini';
import { GestureType } from '../types';

interface GestureControlProps {
  onGestureDetected: (gesture: GestureType) => void;
  currentGesture: GestureType;
}

const CAPTURE_INTERVAL_MS = 800; // Check every 800ms

export const GestureControl: React.FC<GestureControlProps> = ({ onGestureDetected, currentGesture }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const timerRef = useRef<number | null>(null);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraReady(false);
  };

  const handleStreamSuccess = (stream: MediaStream) => {
    streamRef.current = stream;
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.onloadedmetadata = () => {
        setIsCameraReady(true);
        videoRef.current?.play().catch(e => console.error("Play error:", e));
      };
    }
    setError(null);
  };

  const handleError = (err: any) => {
    console.error("Final Camera Error:", err);
    let msg = "Unable to access camera.";
    
    if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
      msg = "Permission denied. Please allow camera access.";
    } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
      msg = "Camera is in use by another app.";
    } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
      msg = "No camera found.";
    } else if (err.message && err.message.includes("Could not start video source")) {
      msg = "Hardware error: Camera may be busy.";
    }

    setError(msg);
  };

  const startCamera = async () => {
    stopCamera(); // Ensure clean slate
    setError(null);

    // Strategy 1: Ideal constraints (Low bandwidth/CPU)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user',
          width: { ideal: 320 },
          height: { ideal: 240 }
        } 
      });
      handleStreamSuccess(stream);
      return;
    } catch (e) {
      console.warn("Strategy 1 failed:", e);
    }

    // Strategy 2: Generic request (Let browser decide)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      handleStreamSuccess(stream);
      return;
    } catch (e) {
      console.warn("Strategy 2 failed:", e);
    }

    // Strategy 3: Explicit device enumeration (Find *any* camera)
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(d => d.kind === 'videoinput');
      
      if (videoDevices.length > 0) {
        // Try the first available video device
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { deviceId: { exact: videoDevices[0].deviceId } } 
        });
        handleStreamSuccess(stream);
        return;
      } else {
        throw new Error("No video input devices found");
      }
    } catch (finalErr) {
      handleError(finalErr);
    }
  };

  useEffect(() => {
    startCamera();
    return () => {
      stopCamera();
    };
  }, []);

  const captureAndAnalyze = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !isCameraReady || isProcessing) return;

    const video = videoRef.current;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    setIsProcessing(true);

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      
      if (ctx) {
        // Match canvas size to video size
        if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
        if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
        
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        // Slightly higher quality for better recognition
        const base64Image = canvas.toDataURL('image/jpeg', 0.8);

        const gesture = await detectHandGesture(base64Image);
        onGestureDetected(gesture);
      }
    } catch (e) {
      console.error("Analysis failed", e);
    } finally {
      setIsProcessing(false);
    }
  }, [isCameraReady, isProcessing, onGestureDetected]);

  useEffect(() => {
    if (isCameraReady) {
      timerRef.current = window.setInterval(captureAndAnalyze, CAPTURE_INTERVAL_MS);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isCameraReady, captureAndAnalyze]);

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end pointer-events-none">
      <div className={`
        bg-black/90 backdrop-blur-md border border-gray-700 p-3 rounded-2xl shadow-2xl 
        flex flex-col gap-3 w-64 transition-all duration-300 pointer-events-auto
        ${error ? 'border-red-500' : 'border-gray-700'}
      `}>
        <div className="flex justify-between items-center text-sm font-medium text-gray-300">
          <div className="flex items-center gap-2">
            <Camera className="w-4 h-4 text-cyan-400" />
            <span>Vision Input</span>
          </div>
          <div className="flex items-center gap-2">
            {isProcessing ? (
              <RefreshCw className="w-3 h-3 animate-spin text-cyan-500" />
            ) : (
              <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'} animate-pulse`} />
            )}
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${
              currentGesture === GestureType.FIST ? 'bg-pink-900 text-pink-200' :
              currentGesture === GestureType.OPEN ? 'bg-blue-900 text-blue-200' :
              'bg-gray-800 text-gray-400'
            }`}>
              {currentGesture === GestureType.NONE ? 'NO HAND' : currentGesture}
            </span>
          </div>
        </div>

        <div className="relative w-full aspect-[4/3] bg-gray-900 rounded-lg overflow-hidden border border-gray-800 group">
          <video 
            ref={videoRef} 
            className="w-full h-full object-cover transform scale-x-[-1] opacity-80 group-hover:opacity-100 transition-opacity" 
            playsInline 
            muted 
            autoPlay
          />
          <canvas ref={canvasRef} className="hidden" />
          
          {/* Scanning Line Effect */}
          {isCameraReady && !error && (
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
               <div className="w-full h-1 bg-cyan-400/30 blur-sm absolute top-0 animate-[scan_2s_ease-in-out_infinite]" />
            </div>
          )}

          {!isCameraReady && !error && (
            <div className="absolute inset-0 flex items-center justify-center text-gray-500 text-xs">
              Initializing...
            </div>
          )}

          {error && (
             <div className="absolute inset-0 flex flex-col items-center justify-center text-red-400 p-4 text-center bg-black/90 z-10">
               <AlertCircle className="w-8 h-8 mb-2" />
               <span className="text-xs font-medium">{error}</span>
               <button 
                 onClick={() => startCamera()}
                 className="mt-3 px-3 py-1 bg-gray-700 hover:bg-gray-600 rounded text-xs text-white border border-gray-600"
               >
                 Retry
               </button>
             </div>
          )}
        </div>
        
        <div className="text-[10px] text-gray-500 leading-tight flex flex-col gap-1">
          <p>Show <strong>FIST</strong> to bloom flower.</p>
          <p>Show <strong>OPEN HAND</strong> to release.</p>
          <p className="flex items-center gap-1 text-cyan-400">
             <Keyboard className="w-3 h-3" />
             Hold <strong>SHIFT</strong> to simulate FIST.
          </p>
        </div>
      </div>
      <style>{`
        @keyframes scan {
          0% { top: 0%; opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
};