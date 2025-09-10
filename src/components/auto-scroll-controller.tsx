
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface AutoScrollControllerProps {
  targetId: string;
  speed?: number;
}

export default function AutoScrollController({ targetId, speed = 0.2 }: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const controllerRef = useRef<HTMLButtonElement>(null);

  const scrollStep = () => {
    window.scrollBy(0, speed);
    animationFrameId.current = requestAnimationFrame(scrollStep);
  };

  const toggleScroll = () => {
    setIsScrolling(prev => !prev);
  };

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
    if (!targetElement) {
      console.error(`[AutoScroll] Target element #${targetId} not found.`);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && isScrolling) {
            console.log('[AutoScroll] Bottom element intersected. Pausing and returning to top.');
            
            // 1. Stop the current animation frame
            if (animationFrameId.current) {
              cancelAnimationFrame(animationFrameId.current);
              animationFrameId.current = null;
            }

            // 2. Wait 2 seconds, then jump to top and restart
            setTimeout(() => {
              console.log('[AutoScroll] Jumping to top.');
              window.scrollTo(0, 0);
              
              // 3. Restart the scrolling if still active
              if (isScrolling) {
                 console.log('[AutoScroll] Restarting scroll from top.');
                 animationFrameId.current = requestAnimationFrame(scrollStep);
              }
            }, 2000);
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
        if (animationFrameId.current) {
          cancelAnimationFrame(animationFrameId.current);
        }
    };
  }, [targetId, isScrolling]); // Re-run effect if isScrolling changes to attach setTimeout correctly

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
