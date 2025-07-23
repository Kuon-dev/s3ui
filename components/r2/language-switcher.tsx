'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { localeNames, type Locale, locales } from '@/i18n/config';
import { Globe, Check } from 'lucide-react';
import { useTransition, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from '@/lib/utils';
import { useDensityClasses } from '@/lib/hooks/use-density-classes';
import { springPresets } from '@/lib/animations';

// Language flag emojis for visual representation
const languageFlags: Record<Locale, string> = {
  en: '🇬🇧',
  zh: '🇨🇳'
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();
  const [isOpen, setIsOpen] = useState(false);
  const densityClasses = useDensityClasses();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      const segments = pathname.split('/');
      segments[1] = newLocale;
      const newPath = segments.join('/');
      router.replace(newPath);
      setIsOpen(false);
    });
  };

  const currentLocale = localeNames[locale];

  return (
    <Popover.Root open={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger asChild>
        <button
          className={cn(
            "relative flex items-center gap-2 rounded-lg",
            "bg-card hover:bg-accent/10",
            "border border-border hover:border-accent",
            "px-3 py-2 text-sm font-medium",
            "transition-all duration-200 ease-out",
            "hover:scale-[1.02] active:scale-[0.98]",
            "focus:outline-none focus:ring-2 focus:ring-primary/50"
          )}
        >
          <div
            className={cn(
              "transition-transform duration-1000",
              isPending && "animate-spin"
            )}
          >
            <Globe className="h-4 w-4 text-muted-foreground" />
          </div>
          <span className="flex items-center gap-2">
            <span className="text-lg">{languageFlags[locale]}</span>
            <span>{currentLocale?.nativeName}</span>
          </span>
          <svg
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform duration-200",
              isOpen && "rotate-180"
            )}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </Popover.Trigger>

      <AnimatePresence>
        {isOpen && (
          <Popover.Portal forceMount>
            <Popover.Content asChild sideOffset={8} align="end">
              <motion.div
                initial={{ opacity: 0, y: -8, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.96 }}
                transition={springPresets.snappy}
                className={cn(
                  "z-50 min-w-[200px] rounded-xl",
                  "bg-popover backdrop-blur-xl",
                  "border border-border",
                  "shadow-lg",
                  "p-2"
                )}
              >
                <div className="space-y-1">
                  {locales.map((localeCode, index) => {
                    const localeInfo = localeNames[localeCode];
                    const isSelected = locale === localeCode;
                    
                    return (
                      <button
                        key={localeCode}
                        onClick={() => handleLocaleChange(localeCode)}
                        className={cn(
                          "relative w-full flex items-center gap-3",
                          "rounded-lg px-3 py-2.5",
                          "text-left transition-all duration-200",
                          "hover:bg-accent hover:translate-x-1",
                          "active:scale-[0.98]",
                          isSelected && "bg-primary/10"
                        )}
                      >
                        <span className="text-2xl">{languageFlags[localeCode]}</span>
                        <div className="flex-1">
                          <div className="font-medium text-sm text-foreground">
                            {localeInfo.nativeName}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {localeInfo.name}
                          </div>
                        </div>
                        {isSelected && (
                          <div className="transition-all duration-300">
                            <Check className="h-4 w-4 text-primary" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
                
                {/* Subtle divider */}
                <div className="mt-2 pt-2 border-t border-border">
                  <div className="px-3 py-1.5 text-xs text-muted-foreground">
                    Language affects date and number formats
                  </div>
                </div>
              </motion.div>
            </Popover.Content>
          </Popover.Portal>
        )}
      </AnimatePresence>
    </Popover.Root>
  );
}