
'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AutoScrollProps {
  children: React.ReactNode;
  speed?: number; // pixels per frame
  pauseDuration?: number; // ms
}

export default function AutoScroll({ children, speed = 0.2, pauseDuration = 0 }: AutoScrollProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const animationFrameRef = useRef<number>();
  const [direction, setDirection] = useState<'down' | 'up'>('down');
  const [scrollingEnabled, setScrollingEnabled] = useState(true);

  // Keyboard shortcut to toggle scrolling
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

  const stopScroll = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
  }, []);
  
  const startScroll = useCallback(() => {
    stopScroll();

    const scrollStep = () => {
      if (direction === 'down') {
        window.scrollBy(0, speed);
      } else {
        if (window.scrollY > 0) {
          window.scrollBy(0, -speed);
        } else {
          // Reached the top, change direction
          setDirection('down');
        }
      }
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    animationFrameRef.current = requestAnimationFrame(scrollStep);
  }, [direction, speed, stopScroll]);
  
  // Main effect to manage scrolling logic
  useEffect(() => {
    if (!scrollingEnabled) {
      stopScroll();
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        // If the footer is intersecting and we are scrolling down, change direction
        if (entry.isIntersecting && direction === 'down') {
            setDirection('up');
        }
      },
      { threshold: 1.0 } // Trigger when 100% of the element is visible
    );

    const footer = document.getElementById('horarios-footer');
    if (footer) {
      observer.observe(footer);
    }

    startScroll();

    return () => {
      stopScroll();
      if (footer) {
        observer.unobserve(footer);
      }
    };
  }, [scrollingEnabled, direction, startScroll, stopScroll]);

  return <div ref={scrollRef}>{children}</div>;
}
