
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
    // This function just scrolls down. The loop is managed by start/stop.
    window.scrollBy(0, speed);
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const startScroll = () => {
    // Prevent multiple loops from starting
    if (animationFrameId.current) return;
    console.log('[AutoScroll] Starting scroll loop.');
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const stopScroll = () => {
    if (animationFrameId.current) {
      console.log('[AutoScroll] Pausing scroll loop.');
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  };

  const toggleScroll = () => {
    console.log('[AutoScroll] Scrolling toggled. New state:', !isScrolling);
    setIsScrolling(prev => !prev);
  };

  useEffect(() => {
    if (isScrolling) {
      startScroll();
    } else {
      stopScroll();
    }

    return () => {
      stopScroll(); // Cleanup on unmount
    };
  }, [isScrolling]);

  useEffect(() => {
    const targetElement = document.getElementById(targetId);
    if (!targetElement) {
      console.error(`[AutoScroll] Target element #${targetId} not found.`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          // Check if the target is intersecting and if we are supposed to be scrolling
          if (entry.isIntersecting && isScrolling) {
            console.log('[AutoScroll] Bottom element intersected. Pausing and returning to top.');
            
            // 1. Stop the current animation frame
            stopScroll();

            // 2. Wait for the specified duration
            setTimeout(() => {
              // Ensure we are still in scrolling mode before proceeding
              if (isScrolling) {
                console.log('[AutoScroll] Jumping to top.');
                window.scrollTo(0, 0);
                
                // 3. IMPORTANT: Restart the scrolling from the top
                console.log('[AutoScroll] Restarting scroll from top.');
                startScroll();
              } else {
                console.log('[AutoScroll] Scroll was toggled off during pause. Not restarting.');
              }
            }, pauseDuration);
          }
        });
      },
      { threshold: 0.1 }
    );

    observer.observe(targetElement);
    console.log(`[AutoScroll] Observer attached to #${targetId}.`);

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
    // We add isScrolling to the dependency array to ensure the setTimeout callback
    // always has the latest `isScrolling` value.
  }, [targetId, isScrolling, pauseDuration]); 

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
