
'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

const SCROLL_SPEED = 0.5;
const PAUSE_AT_BOTTOM_DURATION = 5000;
const PAUSE_AT_TOP_DURATION = 7000;

interface AutoScrollControllerProps {
  targetId: string;
}

export default function AutoScrollController({ targetId }: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const observer = useRef<IntersectionObserver | null>(null);
  const timeouts = useRef<NodeJS.Timeout[]>([]);

  const stopScroll = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    stopScroll(); // Garante que não haja animações concorrentes

    const scrollStep = () => {
      if (window.scrollY + window.innerHeight < document.documentElement.scrollHeight) {
        window.scrollBy(0, SCROLL_SPEED);
        animationFrameId.current = requestAnimationFrame(scrollStep);
      } else {
        // Chegou ao fim (fallback caso o observer falhe)
        stopScroll();
      }
    };
    animationFrameId.current = requestAnimationFrame(scrollStep);
  }, [stopScroll]);

  const handleIntersection = useCallback((entries: IntersectionObserverEntry[]) => {
    const entry = entries[0];
    if (entry.isIntersecting) {
      setIsScrolling(false); // Pausa o estado de rolagem
      stopScroll();

      const timeout1 = setTimeout(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        
        const timeout2 = setTimeout(() => {
          setIsScrolling(true); // Reinicia o estado de rolagem para o loop
        }, PAUSE_AT_TOP_DURATION);

        timeouts.current.push(timeout2);
      }, PAUSE_AT_BOTTOM_DURATION);

      timeouts.current.push(timeout1);
    }
  }, [stopScroll]);

  // Efeito para controlar a animação e o observador
  useEffect(() => {
    if (isScrolling) {
      startScroll();
    } else {
      stopScroll();
    }

    const targetElement = document.getElementById(targetId);
    if (targetElement) {
      if (observer.current) observer.current.disconnect();
      
      observer.current = new IntersectionObserver(handleIntersection, {
        root: null,
        rootMargin: '0px',
        threshold: 1.0,
      });
      observer.current.observe(targetElement);
    }

    // Função de limpeza
    return () => {
      stopScroll();
      timeouts.current.forEach(clearTimeout);
      if (observer.current) {
        observer.current.disconnect();
      }
    };
  }, [isScrolling, startScroll, stopScroll, handleIntersection, targetId]);

  // Efeito para o atalho de teclado
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.code === 'KeyC') {
        event.preventDefault();
        setIsScrolling(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);


  const toggleScrolling = () => {
    setIsScrolling(prev => !prev);
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleScrolling}
      className="text-gray-400 hover:text-white hover:bg-white/10"
      aria-label={isScrolling ? "Pausar rolagem automática" : "Iniciar rolagem automática"}
    >
      {isScrolling ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6" />}
    </Button>
  );
}
