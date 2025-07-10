"use client";

import { useThemeStore } from "@/lib/stores/theme-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Palette, Check } from "lucide-react";

export function ThemeSwitcher() {
  const { currentTheme, themes, setTheme } = useThemeStore();

  const currentThemeData = themes.find((t) => t.id === currentTheme);

  const themesByCategory = themes.reduce((acc, theme) => {
    const category = theme.category || "uncategorized";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(theme);
    return acc;
  }, {} as Record<string, typeof themes>);

  const categoryOrder = ["vibrant", "warm", "cool", "minimal"];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Palette className="h-4 w-4" />
          {currentThemeData?.name || "Theme"}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Choose Theme</DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        {categoryOrder.map((category) => {
          const categoryThemes = themesByCategory[category];
          if (!categoryThemes) return null;

          return (
            <DropdownMenuGroup key={category}>
              <DropdownMenuLabel className="text-xs font-medium text-muted-foreground capitalize">
                {category}
              </DropdownMenuLabel>
              {categoryThemes.map((theme) => (
                <DropdownMenuItem
                  key={theme.id}
                  onClick={() => setTheme(theme.id)}
                  className="cursor-pointer"
                >
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex gap-1">
                      <div 
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: theme.preview?.primary || theme.colors.primary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: theme.preview?.secondary || theme.colors.secondary }}
                      />
                      <div 
                        className="w-3 h-3 rounded-full border border-border"
                        style={{ backgroundColor: theme.preview?.accent || theme.colors.accent }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{theme.name}</div>
                      {theme.description && (
                        <div className="text-xs text-muted-foreground truncate">
                          {theme.description}
                        </div>
                      )}
                    </div>
                    {currentTheme === theme.id && (
                      <Check className="h-4 w-4 text-primary" />
                    )}
                  </div>
                </DropdownMenuItem>
              ))}
            </DropdownMenuGroup>
          );
        })}
        
        {themesByCategory.uncategorized && (
          <DropdownMenuGroup>
            <DropdownMenuSeparator />
            {themesByCategory.uncategorized.map((theme) => (
              <DropdownMenuItem
                key={theme.id}
                onClick={() => setTheme(theme.id)}
                className="cursor-pointer"
              >
                <div className="flex items-center gap-3 w-full">
                  <div className="flex gap-1">
                    <div 
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: theme.preview?.primary || theme.colors.primary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: theme.preview?.secondary || theme.colors.secondary }}
                    />
                    <div 
                      className="w-3 h-3 rounded-full border border-border"
                      style={{ backgroundColor: theme.preview?.accent || theme.colors.accent }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{theme.name}</div>
                    {theme.description && (
                      <div className="text-xs text-muted-foreground truncate">
                        {theme.description}
                      </div>
                    )}
                  </div>
                  {currentTheme === theme.id && (
                    <Check className="h-4 w-4 text-primary" />
                  )}
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuGroup>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}