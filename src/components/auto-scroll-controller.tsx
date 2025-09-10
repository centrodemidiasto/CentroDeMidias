
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface AutoScrollControllerProps {
  targetId: string;
  speed?: number;
  pauseDuration?: number; 
}

export default function AutoScrollController({ targetId, speed = 0.2, pauseDuration = 2000 }: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const controllerRef = useRef<HTMLButtonElement>(null);

  const scrollStep = () => {
    window.scrollBy(0, speed);
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const startScroll = () => {
    if (animationFrameId.current) return;
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const stopScroll = () => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  };

  useEffect(() => {
    if (isScrolling) {
      startScroll();
    } else {
      stopScroll();
    }

    // Cleanup on unmount
    return () => stopScroll();
  }, [isScrolling]);

  useEffect(() => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.error(`[AutoScroll] Target element #${targetId} not found.`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        // Check if the target is intersecting and if we are supposed to be scrolling
        if (entry.isIntersecting && isScrolling) {
          stopScroll();

          // Wait for the specified duration
          setTimeout(() => {
            // Check if user has paused during the timeout
            if (isScrolling) {
                window.scrollTo({ top: 0, behavior: 'auto' });
                // IMPORTANT: Restart the scrolling from the top
                startScroll();
            }
          }, pauseDuration);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(targetElement);

    const handleKeyDown = (event: KeyboardEvent) => {
        if (event.altKey && event.key.toLowerCase() === 'c') {
            event.preventDefault();
            toggleScroll();
        }
    };
    
    window.addEventListener('keydown', handleKeyDown);

    return () => {
        observer.disconnect();
        window.removeEventListener('keydown', handleKeyDown);
        stopScroll(); // Final cleanup
    };
  }, [targetId, isScrolling, pauseDuration, speed]); 

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
