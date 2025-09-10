
'use client';

import { useEffect, useRef, useState } from 'react';

interface AutoScrollProps {
  children: React.ReactNode;
  speed?: number; // pixels per frame
  pauseDuration?: number; // ms
}

export default function AutoScroll({ children, speed = 0.5, pauseDuration = 2000 }: AutoScrollProps) {
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
    const startScroll = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
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

    const scrollStep = () => {
      if (scrollRef.current && scrollingEnabled) {
        const { scrollHeight, clientHeight, scrollTop } = document.documentElement;
        const isAtBottom = scrollHeight - clientHeight - scrollTop < 1;
        const isAtTop = scrollTop < 1;

        if (direction === 'down') {
          if (isAtBottom) {
            setDirection('up');
            stopScroll();
            timeoutRef.current = setTimeout(startScroll, pauseDuration);
            return;
          }
          window.scrollBy(0, speed);
        } else { // direction is 'up'
          if (isAtTop) {
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

    if (scrollingEnabled) {
        timeoutRef.current = setTimeout(startScroll, pauseDuration);
    } else {
        stopScroll();
    }

    return () => {
      stopScroll();
    };
  }, [direction, speed, pauseDuration, scrollingEnabled]);

  return <div ref={scrollRef}>{children}</div>;
}
