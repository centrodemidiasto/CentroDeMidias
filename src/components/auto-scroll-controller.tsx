
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface AutoScrollControllerProps {
  targetId: string;
  speed?: number;
}

export default function AutoScrollController({ targetId, speed = 0.5 }: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const directionRef = useRef<'down' | 'up'>('down');
  const animationFrameId = useRef<number | null>(null);

  const scrollStep = () => {
    // Se a direção é 'up' e já estamos no topo, mude a direção para 'down'.
    if (directionRef.current === 'up' && window.scrollY <= 0) {
        directionRef.current = 'down';
    }
    
    if (directionRef.current === 'down') {
      window.scrollBy(0, speed);
    } else {
      window.scrollBy(0, -speed);
    }

    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const startScroll = () => {
    if (animationFrameId.current === null) {
      animationFrameId.current = requestAnimationFrame(scrollStep);
    }
  };
  
  const stopScroll = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  }

  useEffect(() => {
    if (isScrolling) {
      startScroll();
    } else {
      stopScroll();
    }

    return () => stopScroll();
  }, [isScrolling]);

  useEffect(() => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Quando o alvo (rodapé) está visível E estamos rolando para baixo, mude a direção para 'up'
          if (entry.isIntersecting && directionRef.current === 'down') {
            directionRef.current = 'up';
          }
        });
      },
      { threshold: 1.0 } // 1.0 significa que o elemento precisa estar 100% visível
    );

    observer.observe(targetElement);

    return () => observer.disconnect();
  }, [targetId]);

  return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleScroll}
        className="text-gray-400 hover:text-white hover:bg-white/10"
        aria-label={isScrolling ? "Pausar rolagem" : "Iniciar rolagem"}
      >
        {isScrolling ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
      </Button>
  );
}
