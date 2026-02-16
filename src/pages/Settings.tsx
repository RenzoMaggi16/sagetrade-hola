import { useState } from 'react';
import { Navbar } from '@/components/Navbar';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Settings as SettingsIcon, Check, Moon, Sun, Zap } from "lucide-react";

import ManageAccounts from './ManageAccounts';
import { useColors, THEMES, ThemeType } from '@/context/ColorProvider';
import { cn } from "@/lib/utils";

const Settings = () => {
  const { currentTheme, setTheme, isLoading } = useColors();
  const [isChanging, setIsChanging] = useState(false);

  const handleThemeChange = async (themeKey: ThemeType) => {
    setIsChanging(true);
    await setTheme(themeKey);
    setIsChanging(false);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto px-4 py-8">
          <Skeleton className="h-10 w-48 mb-8" />
          <div className="space-y-4">
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground transition-colors duration-300">
      <Navbar />
      <main className="container mx-auto px-4 py-8">
        <div className="flex items-center space-x-3 mb-8">
          <SettingsIcon className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Configuración</h1>
        </div>

        <Accordion type="single" collapsible className="w-full" defaultValue="item-1">
          {/* Item 1: Apariencia */}
          <AccordionItem value="item-1">
            <AccordionTrigger className="text-xl font-medium">
              Apariencia y Temas
            </AccordionTrigger>
            <AccordionContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                {/* Render Theme Cards */}
                {(Object.entries(THEMES) as [ThemeType, typeof THEMES[ThemeType]][]).map(([key, theme]) => {
                  const isActive = currentTheme === key;

                  return (
                    <Card
                      key={key}
                      className={cn(
                        "cursor-pointer transition-all hover:scale-105 border-2 relative overflow-hidden",
                        isActive ? "border-primary shadow-lg ring-2 ring-primary/20" : "border-border hover:border-primary/50"
                      )}
                      onClick={() => handleThemeChange(key)}
                    >
                      {/* Preview Header inspired by theme background */}
                      <div
                        className="h-24 w-full flex items-center justify-center relative"
                        style={{ backgroundColor: theme.colors.background }}
                      >
                        {/* Mini UI Preview */}
                        <div className="flex gap-4 items-end">
                          <div
                            className="w-4 h-12 rounded-t-sm"
                            style={{ backgroundColor: theme.colors.profit }}
                          />
                          <div
                            className="w-4 h-8 rounded-t-sm"
                            style={{ backgroundColor: theme.colors.loss }}
                          />
                          <div
                            className="w-4 h-16 rounded-t-sm opacity-50"
                            style={{ backgroundColor: theme.colors.chart }}
                          />
                        </div>

                        {isActive && (
                          <div className="absolute top-2 right-2 bg-primary text-primary-foreground rounded-full p-1">
                            <Check className="h-4 w-4" />
                          </div>
                        )}
                      </div>

                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg flex items-center gap-2">
                          {key === 'wakeup' && <Zap className="h-4 w-4 text-yellow-500" />}
                          {key === 'dark' && <Moon className="h-4 w-4" />}
                          {key === 'light' && <Sun className="h-4 w-4" />}
                          {theme.name}
                        </CardTitle>
                        <CardDescription>
                          {key === 'wakeup' && "El tema original de Wakeup Journal. Alto contraste neón."}
                          {key === 'dark' && "Modo oscuro clásico, sobrio y profesional."}
                          {key === 'light' && "Modo claro limpio, ideal para ambientes iluminados."}
                        </CardDescription>
                      </CardHeader>

                      <CardContent>
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.profit }} />
                            <span>Ganancia</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-3 h-3 rounded-full" style={{ backgroundColor: theme.colors.loss }} />
                            <span>Pérdida</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* Item 2: Cuentas */}
          <AccordionItem value="item-2">
            <AccordionTrigger className="text-xl font-medium">
              Gestionar Cuentas
            </AccordionTrigger>
            <AccordionContent>
              <ManageAccounts />
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </main>
    </div>
  );
};

export default Settings;
