"use client";

import { ReactLenis } from 'lenis/react';
import React, { useEffect } from 'react';

// Stops Lenis smooth scrolling when Radix UI modals are open, preserving native scroll inside the modal
const ScrollLocker = () => {
  useEffect(() => {
    const preventLenis = (e: Event) => {
      if (document.body.hasAttribute('data-scroll-locked')) {
        e.stopPropagation();
      }
    };

    // Use capture phase to catch the event before Lenis does
    window.addEventListener('wheel', preventLenis, { capture: true });
    window.addEventListener('touchstart', preventLenis, { capture: true });
    window.addEventListener('touchmove', preventLenis, { capture: true });

    return () => {
      window.removeEventListener('wheel', preventLenis, { capture: true });
      window.removeEventListener('touchstart', preventLenis, { capture: true });
      window.removeEventListener('touchmove', preventLenis, { capture: true });
    };
  }, []);

  return null;
};

interface SmoothScrollProviderProps {
  children: React.ReactNode;
}

export const SmoothScrollProvider = ({ children }: SmoothScrollProviderProps) => {
  return (
    <ReactLenis 
      root 
      options={{ 
        lerp: 0.08,             // Sensación de "ease-out" (momentum)
        duration: 1.2,          // Duración del scroll
        smoothWheel: true,      // Habilita scroll suave con la rueda del mouse
        wheelMultiplier: 1,     // Velocidad base
        touchMultiplier: 2,     // Multiplicador para pantallas táctiles
      }}
    >
      <ScrollLocker />
      {children}
    </ReactLenis>
  );
};
