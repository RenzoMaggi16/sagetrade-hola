"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useTheme } from "./ThemeProvider";

export type ThemeType = 'wakeup' | 'dark' | 'light';

interface ThemeDefinition {
  name: string;
  type: ThemeType;
  colors: {
    profit: string;
    loss: string;
    chart: string;
    background: string;
    mode: 'dark' | 'light';
  };
}

export const THEMES: Record<ThemeType, ThemeDefinition> = {
  wakeup: {
    name: "Wakeup Theme",
    type: 'wakeup',
    colors: {
      profit: '#03FFFE',
      loss: '#F405F3',
      chart: '#03FFFE',
      background: '#090513',
      mode: 'dark'
    }
  },
  dark: {
    name: "Default Oscuro",
    type: 'dark',
    colors: {
      profit: '#00FF19',
      loss: '#FF0000',
      chart: '#00FF19',
      background: '#141414',
      mode: 'dark'
    }
  },
  light: {
    name: "Default Claro",
    type: 'light',
    colors: {
      profit: '#00FF19',
      loss: '#FF0000',
      chart: '#00FF19',
      background: '#F0F0F0',
      mode: 'light'
    }
  }
};

type ColorProviderState = {
  currentTheme: ThemeType;
  setTheme: (theme: ThemeType) => Promise<void>;
  isLoading: boolean;
};

const ColorProviderContext = createContext<ColorProviderState>({
  currentTheme: 'wakeup',
  setTheme: async () => { },
  isLoading: true,
});

// Helper: Hex to HSL (space separated)
const hexToHsl = (hex: string): string => {
  hex = hex.replace(/^#/, '');
  const r = parseInt(hex.substring(0, 2), 16) / 255;
  const g = parseInt(hex.substring(2, 4), 16) / 255;
  const b = parseInt(hex.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`;
};

// Helper: Hex to RGBA
const hexToRgba = (hex: string, alpha: number): string => {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export function ColorProvider({ children }: { children: React.ReactNode }) {
  const [currentTheme, setCurrentTheme] = useState<ThemeType>('wakeup');
  const [isLoading, setIsLoading] = useState(true);
  const { setTheme: setSystemTheme } = useTheme();

  // Load saved theme
  useEffect(() => {
    const loadTheme = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();

        const localTheme = localStorage.getItem('wakeup-journal-theme') as ThemeType;
        if (localTheme && THEMES[localTheme]) {
          setCurrentTheme(localTheme);
          setIsLoading(false);
          return;
        }

        if (!user) {
          setIsLoading(false);
          return;
        }

        const { data: preferences } = await supabase
          .from('user_preferences')
          .select('profit_color_hex')
          .maybeSingle();

        if (preferences) {
          const foundTheme = (Object.values(THEMES) as ThemeDefinition[]).find(t =>
            t.colors.profit.toLowerCase() === preferences.profit_color_hex?.toLowerCase()
          );
          if (foundTheme) setCurrentTheme(foundTheme.type);
        }
      } catch (error) {
        console.error("Error loading theme", error);
      } finally {
        setIsLoading(false);
      }
    };

    loadTheme();
  }, []);

  // Apply Theme Side Effects
  useEffect(() => {
    const themeDef = THEMES[currentTheme];
    const root = document.documentElement;

    // 1. Set pure HEX variables (for inline styles)
    root.style.setProperty('--profit-color', themeDef.colors.profit);
    root.style.setProperty('--loss-color', themeDef.colors.loss);
    root.style.setProperty('--chart-color', themeDef.colors.chart);

    // 2. Set HSL variables (for Tailwind classes like bg-profit, text-loss)
    root.style.setProperty('--profit', hexToHsl(themeDef.colors.profit));
    root.style.setProperty('--loss', hexToHsl(themeDef.colors.loss));

    // 3. Set RGBA variables (for Calendar Gradients)
    root.style.setProperty('--calendar-profit-bg', hexToRgba(themeDef.colors.profit, 0.3));
    root.style.setProperty('--calendar-loss-bg', hexToRgba(themeDef.colors.loss, 0.3));

    // 4. Set Background/Foreground/Card Variables
    const isDark = themeDef.colors.mode === 'dark';

    if (isDark) {
      if (currentTheme === 'wakeup') {
        // Wakeup Specific: Deep Purple/Black
        root.style.setProperty('--background', '257 59% 5%'); // #090513
        root.style.setProperty('--card', '257 59% 8%');
        root.style.setProperty('--card-foreground', '0 0% 98%');
        root.style.setProperty('--foreground', '0 0% 98%');
      } else {
        // Standard Dark
        root.style.setProperty('--background', '0 0% 8%'); // #141414
        root.style.setProperty('--card', '0 0% 10%');
        root.style.setProperty('--card-foreground', '0 0% 98%');
        root.style.setProperty('--foreground', '0 0% 98%');
      }
      root.style.setProperty('--border', '0 0% 12%');

      // Contrast text for calendar (Dark theme = usually black text on bright profit block?)
      // User said: "contrario para que resalten"
      // If profit is bright neon (#03FFFE), white text is bad. Black is good.
      root.style.setProperty('--calendar-profit-text-color', '#000000');
      root.style.setProperty('--calendar-loss-text-color', '#FFFFFF');
    } else {
      // Light Theme
      root.style.setProperty('--background', '0 0% 94%'); // #F0F0F0
      root.style.setProperty('--card', '0 0% 100%');
      root.style.setProperty('--card-foreground', '0 0% 10%');
      root.style.setProperty('--foreground', '0 0% 10%');

      root.style.setProperty('--border', '0 0% 85%');

      root.style.setProperty('--calendar-profit-text-color', '#000000');
      root.style.setProperty('--calendar-loss-text-color', '#000000'); // Or white if red is dark
    }

    setSystemTheme(themeDef.colors.mode);

  }, [currentTheme, setSystemTheme]);

  const updateTheme = async (newTheme: ThemeType) => {
    setCurrentTheme(newTheme);
    localStorage.setItem('wakeup-journal-theme', newTheme);

    const themeDef = THEMES[newTheme];

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from('user_preferences').upsert({
          user_id: user.id,
          profit_color_hex: themeDef.colors.profit,
          loss_color_hex: themeDef.colors.loss,
          chart_color_hex: themeDef.colors.chart,
          updated_at: new Date().toISOString()
        }, { onConflict: 'user_id' });
      }
    } catch (e) {
      console.error("Error saving theme preference", e);
    }
  };

  const value = {
    currentTheme,
    setTheme: updateTheme,
    isLoading,
  };

  return (
    <ColorProviderContext.Provider value={value}>
      {children}
    </ColorProviderContext.Provider>
  );
}

export const useColors = () => {
  const context = useContext(ColorProviderContext);
  if (context === undefined)
    throw new Error("useColors must be used within a ColorProvider");
  return context;
};
