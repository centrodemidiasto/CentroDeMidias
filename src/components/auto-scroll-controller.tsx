
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
    if (directionRef.current === 'down') {
      window.scrollBy(0, speed);
    } else {
      window.scrollBy(0, -speed);
    }
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };
  
  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
    console.log(`[AutoScroll] Scrolling toggled. New state: ${!isScrolling}`);
  }

  useEffect(() => {
    if (isScrolling) {
      console.log('[AutoScroll] Starting scroll loop.');
      animationFrameId.current = requestAnimationFrame(scrollStep);
    } else {
      if (animationFrameId.current) {
        console.log('[AutoScroll] Pausing scroll loop.');
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
    const topElement = controllerRef.current;

    if (!targetElement || !topElement) {
        console.error('[AutoScroll] Target or Top element not found.');
        return;
    }

    console.log('[AutoScroll] Setting up observers.');

    // Observer for the bottom element
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && directionRef.current === 'down') {
            console.log(`[AutoScroll] Bottom element intersected. Current direction: ${directionRef.current}. Changing to 'up'.`);
            directionRef.current = 'up';
          }
        });
      },
      { threshold: 0.1 }
    );
    bottomObserver.observe(targetElement);
    console.log(`[AutoScroll] Bottom observer attached to #${targetId}.`);

    // Observer for the top element (the controller itself)
    const topObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Additional check for scrollY to prevent it from firing when the page loads at the top.
          if (entry.isIntersecting && directionRef.current === 'up' && window.scrollY < 10) {
            console.log(`[AutoScroll] Top element intersected. Current direction: ${directionRef.current}. Changing to 'down'.`);
             directionRef.current = 'down';
          }
        });
      },
      { threshold: 0.9 } // <-- CORREÇÃO: Alterado de 1.0 para 0.9
    );
    topObserver.observe(topElement);
    console.log('[AutoScroll] Top observer attached to controller button.');

    return () => {
        console.log('[AutoScroll] Disconnecting observers.');
        bottomObserver.disconnect();
        topObserver.disconnect();
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
