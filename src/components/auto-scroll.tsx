
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

  useEffect(() => {
    const scrollStep = () => {
      if (scrollRef.current) {
        const { scrollHeight, clientHeight, scrollTop } = document.documentElement;
        const isAtBottom = scrollHeight - clientHeight - scrollTop < 1;
        const isAtTop = scrollTop < 1;

        if (direction === 'down') {
          if (isAtBottom) {
            // Pause at the bottom, then go up
            setDirection('up');
            animationFrameRef.current = undefined; // Stop animation
            timeoutRef.current = setTimeout(startScroll, pauseDuration);
            return;
          }
          window.scrollBy(0, speed);
        } else { // direction is 'up'
          if (isAtTop) {
            // Pause at the top, then go down
            setDirection('down');
            animationFrameRef.current = undefined; // Stop animation
            timeoutRef.current = setTimeout(startScroll, pauseDuration);
            return;
          }
          window.scrollBy(0, -speed);
        }
      }
      animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    const startScroll = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        animationFrameRef.current = requestAnimationFrame(scrollStep);
    };

    // Start scrolling after a short delay to ensure content is loaded
    timeoutRef.current = setTimeout(startScroll, pauseDuration);

    return () => {
      // Cleanup on component unmount
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [direction, speed, pauseDuration]);

  return <div ref={scrollRef}>{children}</div>;
}
