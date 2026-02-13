import React from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/components/theme-provider";

export function ModeToggle() {
  const { theme, setTheme } = useTheme();

  const toggleTheme = () => {
    // Si es oscuro, cambia a claro. Si es cualquier otra cosa (claro o sistema), cambia a oscuro.
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-9 w-9 border border-input bg-transparent hover:bg-accent hover:text-accent-foreground cursor-pointer"
      title="Cambiar tema"
    >
      {/* Icono de Sol: Se muestra en modo claro, rota y desaparece en modo oscuro */}
      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0 text-orange-500" />

      {/* Icono de Luna: Se oculta en modo claro, rota y aparece en modo oscuro */}
      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100 text-blue-400" />

      <span className="sr-only">Cambiar tema</span>
    </Button>
  );
}
