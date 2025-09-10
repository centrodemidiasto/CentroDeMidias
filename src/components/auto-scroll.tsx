
'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoScrollProps {
  children: React.ReactNode;
  speed?: number; // pixels per frame
  pauseDuration?: number; // ms
}

export default function AutoScroll({ children, speed = 0.5, pauseDuration = 5000 }: AutoScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const timeoutRef = useRef<NodeJS.Timeout>();
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [scrollingEnabled, setScrollingEnabled] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.altKey && event.key.toLowerCase() === 'c') {
        event.preventDefault();
        setScrollingEnabled(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);


  useEffect(() => {
    const scrollStep = () => {
      if (scrollRef.current && scrollingEnabled) {
        if (direction === 'down') {
          window.scrollBy(0, speed);
        } else { // direction is 'up'
          if (document.documentElement.scrollTop < 1) {
             setDirection('down');
             stopScroll();
             timeoutRef.current = setTimeout(startScroll, pauseDuration);
             return;
          }
          window.scrollBy(0, -speed);
        }
        animationFrameRef.current = requestAnimationFrame(scrollStep);
      }
    };

    const startScroll = () => {
        if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = requestAnimationFrame(scrollStep);
    };
    
    const stopScroll = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = undefined;
        }
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }
    }

    const observer = new IntersectionObserver(
        (entries) => {
            const entry = entries[0];
            if (entry.isIntersecting && direction === 'down') {
                setDirection('up');
                stopScroll();
                timeoutRef.current = setTimeout(startScroll, pauseDuration);
            }
        },
        { threshold: 1.0 }
    );

    const footer = document.getElementById('horarios-footer');
    if (footer) {
        observer.observe(footer);
    }

    if (scrollingEnabled) {
        timeoutRef.current = setTimeout(startScroll, pauseDuration);
    } else {
        stopScroll();
    }

    return () => {
      stopScroll();
      if (footer) {
        observer.unobserve(footer);
      }
    };
  }, [direction, speed, pauseDuration, scrollingEnabled]);

  return <div ref={scrollRef}>{children}</div>;
}
