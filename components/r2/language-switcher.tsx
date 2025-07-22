'use client';

import { useLocale } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import { localeNames, type Locale, locales } from '@/i18n/config';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Globe } from 'lucide-react';
import { useTransition } from 'react';
import { Loader2 } from 'lucide-react';

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [isPending, startTransition] = useTransition();

  const handleLocaleChange = (newLocale: string) => {
    startTransition(() => {
      // Replace the locale in the current path without page reload
      const segments = pathname.split('/');
      segments[1] = newLocale;
      const newPath = segments.join('/');
      
      // Use router.replace to avoid adding to history
      router.replace(newPath);
    });
  };

  const currentLocale = localeNames[locale];

  return (
    <Select value={locale} onValueChange={handleLocaleChange} disabled={isPending}>
      <SelectTrigger className="w-[180px] h-9">
        <div className="flex items-center gap-2">
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Globe className="h-4 w-4" />
          )}
          <SelectValue>
            {currentLocale?.nativeName || currentLocale?.name}
          </SelectValue>
        </div>
      </SelectTrigger>
      <SelectContent>
        {locales.map((localeCode) => {
          const localeInfo = localeNames[localeCode];
          return (
            <SelectItem key={localeCode} value={localeCode}>
              <div className="flex flex-col items-start">
                <span>{localeInfo.nativeName}</span>
                <span className="text-xs text-muted-foreground">
                  {localeInfo.name}
                </span>
              </div>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}