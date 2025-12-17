import React, { useState, useEffect } from 'react';
import { ParticleCanvas } from './components/ParticleCanvas';
import { GestureControl } from './components/GestureControl';
import { GestureType } from '../types';
import { Sparkles, Keyboard } from 'lucide-react';

const App: React.FC = () => {
  const [cameraGesture, setCameraGesture] = useState<GestureType>(GestureType.NONE);
  const [isShiftPressed, setIsShiftPressed] = useState(false);

  // Combine camera and keyboard inputs. Keyboard overrides camera.
  const currentGesture = isShiftPressed ? GestureType.FIST : cameraGesture;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black text-white selection:bg-cyan-500/30">
      
      {/* Background Particles */}
      <ParticleCanvas gesture={currentGesture} />
      
      {/* Overlay UI Title */}
      <div className="absolute top-6 left-6 z-10 pointer-events-none select-none">
        <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent flex items-center gap-3">
          <Sparkles className="text-cyan-400 w-8 h-8" />
          Gemini Morph
        </h1>
        <p className="text-gray-400 text-sm mt-1 max-w-md opacity-80 flex items-center gap-2">
          Powered by Gemini 2.5 Flash Vision
        </p>
        <div className="mt-2 flex items-center gap-2 text-xs text-gray-500 bg-gray-900/50 p-2 rounded-lg border border-gray-800 w-fit">
           <Keyboard className="w-3 h-3" />
           <span>Hold <strong>SHIFT</strong> to bloom manually</span>
        </div>
      </div>

      {/* Camera & Logic Control */}
      <GestureControl 
        currentGesture={currentGesture} 
        onGestureDetected={setCameraGesture} 
      />
      
      {/* Removed Center Status Indicator to avoid masking the flower */}
      
    </div>
  );
};

export default App;