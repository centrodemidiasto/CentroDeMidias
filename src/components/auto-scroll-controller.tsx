
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface AutoScrollControllerProps {
  targetId: string;
  speed?: number;
  pauseDuration?: number;
}

export default function AutoScrollController({
  targetId,
  speed = 0.2,
  pauseDuration = 5000,
}: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const isLoopingRef = useRef(false); // To prevent multiple loops
  const { toast } = useToast();

  const stopScroll = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    stopScroll(); // Ensure no multiple loops are running

    const scrollStep = () => {
      window.scrollBy(0, speed);
      animationFrameId.current = requestAnimationFrame(scrollStep);
    };
    
    animationFrameId.current = requestAnimationFrame(scrollStep);
  }, [speed, stopScroll]);

  const toggleScrolling = useCallback(() => {
    setIsScrolling(prev => !prev);
  }, []);

  useEffect(() => {
    if (isScrolling) {
      startScroll();
    } else {
      stopScroll();
    }
    // Cleanup on unmount
    return () => stopScroll();
  }, [isScrolling, startScroll, stopScroll]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry.isIntersecting && isScrolling && !isLoopingRef.current) {
          isLoopingRef.current = true; // Mark as looping
          stopScroll();

          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Allow time for smooth scroll to finish before restarting
            setTimeout(() => {
              if (isScrolling) {
                startScroll();
              }
              isLoopingRef.current = false; // Reset loop flag
            }, 1000); // Wait for scroll-to-top to complete

          }, pauseDuration);
        }
      },
      { threshold: 0.1 } // Trigger when 10% of the element is visible
    );

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      observer.observe(targetElement);
    }

    return () => {
      if (targetElement) {
        observer.unobserve(targetElement);
      }
    };
  }, [targetId, isScrolling, startScroll, stopScroll, pauseDuration]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.code === 'KeyC') {
        event.preventDefault();
        toggleScrolling();
        toast({
          title: `Rolagem Automática ${!isScrolling ? 'Ativada' : 'Desativada'}`,
          description: 'Use Alt+C para alternar.',
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isScrolling, toggleScrolling, toast]);

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleScrolling}
      className="text-gray-400 hover:text-white hover:bg-white/10"
      aria-label={isScrolling ? 'Pausar rolagem automática' : 'Iniciar rolagem automática'}
    >
      {isScrolling ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
    </Button>
  );
}
