import React, { useRef, useEffect } from 'react';
import { Particle, GestureType } from '../types';

interface ParticleCanvasProps {
  gesture: GestureType;
}

export const ParticleCanvas: React.FC<ParticleCanvasProps> = ({ gesture }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameRef = useRef<number | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  // Initialize mouse at center of screen so flower defaults to center
  const mouseRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const dimensionsRef = useRef({ width: 0, height: 0 });

  // Initialize Particles
  const initParticles = (width: number, height: number) => {
    const particleCount = 1200; // Number of particles
    const particles: Particle[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 2,
        vy: (Math.random() - 0.5) * 2,
        color: 'rgba(100, 200, 255, 0.8)',
        size: Math.random() * 2 + 1,
        baseX: Math.random() * width,
        baseY: Math.random() * height,
      });
    }
    return particles;
  };

  // Calculate target position for Flower shape
  // Rose Curve: r = a * cos(k * theta)
  const calculateFlowerTarget = (index: number, total: number, centerX: number, centerY: number, width: number, height: number) => {
    // k=5 gives a 5 petal rose
    const k = 5; 
    
    // Distribute theta based on index
    const theta = (index / total) * Math.PI * 2 * 4; // Wrap around a few times for density
    
    const scale = Math.min(width, height) * 0.35; // Size of flower
    
    // Rose curve formula
    const r = scale * Math.cos(k * theta);
    
    const targetX = centerX + r * Math.cos(theta);
    const targetY = centerY + r * Math.sin(theta);
    
    return { x: targetX, y: targetY };
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      dimensionsRef.current = { width: canvas.width, height: canvas.height };
      
      // Update mouse ref center if it was never moved? 
      // We keep it dynamic or simple. Let's just update particles.
      if (particlesRef.current.length === 0) {
        particlesRef.current = initParticles(canvas.width, canvas.height);
      }
    };
    
    window.addEventListener('resize', handleResize);
    handleResize();

    // Ensure mouseRef starts at center after mount/resize
    mouseRef.current = { x: window.innerWidth / 2, y: window.innerHeight / 2 };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      if (!canvas || !ctx) return;
      
      // Clear canvas completely (No trail/mask effect)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      const width = dimensionsRef.current.width;
      const height = dimensionsRef.current.height;
      
      const isFlowerMode = gesture === GestureType.FIST;

      particlesRef.current.forEach((p, i) => {
        // Physics update
        
        if (isFlowerMode) {
          // Flower Mode: Move towards target (centered at mouse)
          const target = calculateFlowerTarget(
            i, 
            particlesRef.current.length, 
            mouseRef.current.x, 
            mouseRef.current.y, 
            width, 
            height
          );
          
          // Easing towards target
          const dx = target.x - p.x;
          const dy = target.y - p.y;
          
          p.vx = dx * 0.05;
          p.vy = dy * 0.05;
          
          p.x += p.vx;
          p.y += p.vy;
          
          // Change color to pinkish/magenta
          p.color = `hsla(${320 + Math.sin(Date.now() * 0.001 + i) * 30}, 80%, 60%, 0.9)`;
          
        } else {
          // Open Mode: Floating or reacting to mouse
          
          // Add some noise
          p.vx += (Math.random() - 0.5) * 0.1;
          p.vy += (Math.random() - 0.5) * 0.1;
          
          // Limit speed
          const maxSpeed = 2;
          p.vx = Math.max(Math.min(p.vx, maxSpeed), -maxSpeed);
          p.vy = Math.max(Math.min(p.vy, maxSpeed), -maxSpeed);
          
          p.x += p.vx;
          p.y += p.vy;
          
          // Wrap around edges
          if (p.x < 0) p.x = width;
          if (p.x > width) p.x = 0;
          if (p.y < 0) p.y = height;
          if (p.y > height) p.y = 0;
          
          // Interactive: Repel from mouse slightly
          const dx = p.x - mouseRef.current.x;
          const dy = p.y - mouseRef.current.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            const angle = Math.atan2(dy, dx);
            const force = (100 - dist) * 0.1;
            p.vx += Math.cos(angle) * force;
            p.vy += Math.sin(angle) * force;
          }

           // Color: Cyan/Blue
           p.color = `hsla(${180 + Math.sin(Date.now() * 0.001 + i) * 30}, 80%, 60%, 0.8)`;
        }

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.fill();
        
        // Optional: Glow
        if (isFlowerMode) {
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
        } else {
            ctx.shadowBlur = 0;
        }
      });
      
      // Reset shadow for next frame performance
      ctx.shadowBlur = 0;

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [gesture]);

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute top-0 left-0 w-full h-full block"
    />
  );
};