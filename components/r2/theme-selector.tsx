"use client";

import { Check, Palette, Search } from "lucide-react";
import React, { useMemo, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Theme, useThemeStore } from "@/lib/stores/theme-store";
import { cn } from "@/lib/utils";
import { useTypography } from "@/lib/hooks/use-typography";
import { motion } from "motion/react";
import { springPresets } from "@/lib/animations";

// Theme preview component
const ThemePreview = React.memo(({
  isSelected,
  theme,
}: {
  isSelected: boolean;
  theme: Theme;
}) => {
  const preview = theme.preview || {
    accent: theme.colors.accent,
    primary: theme.colors.primary,
    secondary: theme.colors.secondary,
    text: theme.colors.foreground,
  };

  return (
    <div className="relative">
      {/* Mini theme preview */}
      <div
        className={cn(
          "relative w-full h-20 rounded-lg overflow-hidden border transition-all duration-300",
          isSelected
            ? "border-primary/50 ring-2 ring-primary/30 shadow-lg shadow-primary/20"
            : "border-border/50 hover:border-primary/30",
        )}
        style={{ backgroundColor: theme.colors.background }}
      >
        {/* Preview layout */}
        <div className="absolute inset-0 p-2">
          {/* Header bar */}
          <div
            className="h-2 w-full rounded-full mb-1.5"
            style={{ backgroundColor: theme.colors.card }}
          />

          {/* Content area */}
          <div className="flex gap-1.5">
            {/* Sidebar */}
            <div
              className="w-1/4 h-12 rounded"
              style={{ backgroundColor: theme.colors.sidebar }}
            />

            {/* Main content */}
            <div className="flex-1 space-y-1">
              {/* Primary accent bar */}
              <div
                className="h-3 w-3/4 rounded"
                style={{ backgroundColor: preview.primary }}
              />

              {/* Text lines */}
              <div className="space-y-0.5">
                <div
                  className="h-1.5 w-full rounded-sm"
                  style={{ backgroundColor: theme.colors.muted }}
                />
                <div
                  className="h-1.5 w-5/6 rounded-sm"
                  style={{ backgroundColor: theme.colors.muted }}
                />
                <div
                  className="h-1.5 w-4/6 rounded-sm"
                  style={{ backgroundColor: theme.colors.muted }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Selected indicator */}
        {isSelected && (
          <motion.div 
            className="absolute top-1 right-1 p-1 rounded-full bg-primary text-primary-foreground"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={springPresets.bouncy}
          >
            <Check className="w-3 h-3" />
          </motion.div>
        )}
      </div>

      {/* Color swatches */}
      <div className="flex gap-1 mt-2">
        <motion.div
          className="w-6 h-6 rounded-full border border-border/50"
          style={{ backgroundColor: preview.primary }}
          title="Primary"
          whileHover={{ scale: 1.1 }}
          transition={springPresets.gentle}
        />
        <motion.div
          className="w-6 h-6 rounded-full border border-border/50"
          style={{ backgroundColor: preview.secondary }}
          title="Secondary"
          whileHover={{ scale: 1.1 }}
          transition={springPresets.gentle}
        />
        <motion.div
          className="w-6 h-6 rounded-full border border-border/50"
          style={{ backgroundColor: preview.accent }}
          title="Accent"
          whileHover={{ scale: 1.1 }}
          transition={springPresets.gentle}
        />
      </div>
    </div>
  );
});

ThemePreview.displayName = "ThemePreview";

export const ThemeSelector = React.memo(() => {
  const typography = useTypography();
  const { currentTheme, setTheme, themes } = useThemeStore();
  const [searchQuery, setSearchQuery] = useState("");

  // Filter themes based on search
  const filteredThemes = useMemo(() => {
    return themes.filter((theme) => {
      const query = searchQuery.toLowerCase();
      return searchQuery === ""
        || theme.name.toLowerCase().includes(query)
        || (theme.description && theme.description.toLowerCase().includes(query))
        || (theme.tags && theme.tags.some((tag) => tag.toLowerCase().includes(query)));
    });
  }, [themes, searchQuery]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className={cn("flex items-center gap-2", typography.h3())}>
          <div className="p-1.5 bg-primary/10 rounded-md">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          Color Themes
        </h3>
        <p className={cn("mt-1", typography.caption())}>
          Choose a theme that suits your style and mood
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
        <Input
          className={cn(
            "pl-9 bg-muted/50 border-muted focus:bg-background",
            typography.body()
          )}
          placeholder="Search themes..."
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>

      {/* Theme Grid */}
      <div className="pr-2">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredThemes.map((theme) => (
                <motion.div
                  className={cn(
                    "relative group cursor-pointer",
                    "transition-all duration-300",
                  )}
                  key={theme.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={springPresets.smooth}
                  onClick={() => setTheme(theme.id)}
                >
                  <motion.div
                    className={cn(
                      "p-4 rounded-xl border transition-all duration-300",
                      currentTheme === theme.id
                        ? "bg-accent/20 border-primary/50 shadow-lg"
                        : "bg-card border-border hover:bg-accent/10 hover:border-primary/30",
                    )}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    transition={springPresets.gentle}
                  >
                      {/* Theme info */}
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className={cn("font-medium", typography.h4())}>
                              {theme.name}
                            </h5>
                            <p className={cn("mt-0.5 line-clamp-2", typography.caption())}>
                              {theme.description || `Dark theme with ${theme.name.toLowerCase()} accents`}
                            </p>
                          </div>
                          {currentTheme === theme.id && (
                            <Badge
                              className="border-primary/50 text-primary"
                              variant="outline"
                            >
                              Active
                            </Badge>
                          )}
                        </div>

                        {/* Theme preview */}
                        <ThemePreview
                          isSelected={currentTheme === theme.id}
                          theme={theme}
                        />

                        {/* Tags */}
                        {theme.tags && theme.tags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {theme.tags.map((tag) => (
                              <Badge
                                className={cn(
                                  "px-1.5 py-0 bg-muted/50 text-muted-foreground border-0",
                                  typography.tiny()
                                )}
                                key={tag}
                                variant="secondary"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                  </motion.div>
                </motion.div>
          ))}
        </div>

        {/* No results message */}
        {filteredThemes.length === 0 && (
          <motion.div 
            className="text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={springPresets.smooth}
          >
            <p className={typography.body('text-muted-foreground')}>
              No themes found matching your criteria
            </p>
            <button
              className={cn("mt-2 text-primary hover:underline", typography.small())}
              onClick={() => {
                setSearchQuery("");
              }}
            >
              Clear search
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
});

ThemeSelector.displayName = "ThemeSelector";