
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
  }

  useEffect(() => {
    if (isScrolling) {
      animationFrameId.current = requestAnimationFrame(scrollStep);
    } else {
      if (animationFrameId.current) {
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

    if (!targetElement || !topElement) return;

    // Observer for the bottom element
    const bottomObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && directionRef.current === 'down') {
            directionRef.current = 'up';
          }
        });
      },
      { threshold: 1.0 }
    );
    bottomObserver.observe(targetElement);

    // Observer for the top element (the controller itself)
    const topObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // When the controller is visible and we are scrolling up, change direction
          if (entry.isIntersecting && directionRef.current === 'up') {
             directionRef.current = 'down';
          }
        });
      },
      { threshold: 1.0 }
    );
    topObserver.observe(topElement);

    return () => {
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
