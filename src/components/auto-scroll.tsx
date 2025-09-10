
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
  const timeoutRef = useRef<NodeJS.Timeout>();
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
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
  }, []);

  const startScroll = useCallback(() => {
    stopScroll(); // Ensure no multiple loops are running

    const scrollStep = () => {
      let currentDirection = direction;
      
      // This is a check for the top of the page.
      if (window.scrollY <= 0 && direction === 'up') {
        setDirection('down');
        currentDirection = 'down';
      }
      
      if (currentDirection === 'down') {
        window.scrollBy(0, speed);
      } else {
        window.scrollBy(0, -speed);
      }

      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    if (scrollingEnabled) {
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    }

  }, [direction, speed, scrollingEnabled, stopScroll]);
  
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
