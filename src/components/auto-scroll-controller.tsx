
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
  const controllerRef = useRef<HTMLButtonElement>(null);

  const scrollStep = () => {
    // Detect top
    if (directionRef.current === 'up' && window.scrollY <= 0) {
      console.log(`[AutoScroll] Reached top. Changing direction to 'down'.`);
      directionRef.current = 'down';
    }

    if (directionRef.current === 'down') {
      window.scrollBy(0, speed);
    } else {
      window.scrollBy(0, -speed);
    }
    
    // Continue the loop
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };
  
  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  }

  useEffect(() => {
    if (isScrolling) {
      console.log(`[AutoScroll] Starting scroll. Direction: ${directionRef.current}`);
      animationFrameId.current = requestAnimationFrame(scrollStep);
    } else {
      if (animationFrameId.current) {
        console.log('[AutoScroll] Pausing scroll.');
        cancelAnimationFrame(animationFrameId.current);
        animationFrameId.current = null;
      }
    }

    return () => {
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, [isScrolling]);

  useEffect(() => {
    const targetElement = document.getElementById(targetId);

    if (!targetElement) {
        console.error('[AutoScroll] Target element not found.');
        return;
    }
    console.log('[AutoScroll] Setting up bottom observer.');

    const bottomObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && directionRef.current === 'down') {
            console.log(`[AutoScroll] Reached bottom. Changing direction to 'up'.`);
            directionRef.current = 'up';
          }
        });
      },
      { threshold: 0.1 }
    );

    bottomObserver.observe(targetElement);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.altKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            console.log('[AutoScroll] Hotkey pressed.');
            toggleScroll();
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        console.log('[AutoScroll] Disconnecting observer.');
        bottomObserver.disconnect();
        window.removeEventListener('keydown', handleKeyDown);
    };
  }, [targetId]);

  return (
      <Button
        ref={controllerRef}
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
