
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
  pauseDuration = 10000,
}: AutoScrollControllerProps) {
  const [isScrolling, setIsScrolling] = useState(false);
  const animationFrameId = useRef<number | null>(null);
  const isLoopingRef = useRef(false);
  const { toast } = useToast();

  const stopScroll = useCallback(() => {
    if (animationFrameId.current) {
      cancelAnimationFrame(animationFrameId.current);
      animationFrameId.current = null;
    }
  }, []);

  const startScroll = useCallback(() => {
    // Garante que não haja loops duplicados
    stopScroll(); 

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
    // A limpeza garante que a rolagem pare se o componente for desmontado
    return () => stopScroll();
  }, [isScrolling, startScroll, stopScroll]);


  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // Otimização: Apenas aciona se a rolagem estiver ativa e não já em um processo de loop
        if (entry.isIntersecting && isScrolling && !isLoopingRef.current) {
          isLoopingRef.current = true;
          stopScroll();

          setTimeout(() => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
            
            // Aguarda o scroll suave terminar antes de reiniciar
            setTimeout(() => {
              if (isScrolling) {
                 startScroll(); // Reinicia a rolagem
              }
              isLoopingRef.current = false;
            }, 1000); 

          }, pauseDuration);
        }
      },
      { threshold: 0.1 } 
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
        
        // Usamos a função de callback para obter o estado mais recente
        setIsScrolling(current => {
            const nextState = !current;
             toast({
                title: `Rolagem Automática ${nextState ? 'Ativada' : 'Desativada'}`,
                description: 'Use Alt+C para alternar.',
            });
            return nextState;
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [toast]);

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
