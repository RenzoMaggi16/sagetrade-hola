"use client";

import { ReactLenis } from 'lenis/react';
import React from 'react';

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
      {children}
    </ReactLenis>
  );
};
