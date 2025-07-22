import { notFound } from 'next/navigation';
import type { Messages } from '@/types/i18n';

export const locales = ['en', 'zh'] as const;
export type Locale = typeof locales[number];

export const defaultLocale: Locale = 'en';

// Locale display names
export const localeNames: Record<Locale, { name: string; nativeName: string }> = {
  en: { name: 'English', nativeName: 'English' },
  zh: { name: 'Chinese', nativeName: '中文' }
};

// Load messages with error handling
export async function getMessages(locale: string): Promise<Messages> {
  try {
    // Validate locale
    if (!locales.includes(locale as Locale)) {
      throw new Error(`Invalid locale: ${locale}`);
    }

    // Dynamic import with fallback
    const messages = await import(`../messages/${locale}.json`)
      .then(module => module.default)
      .catch(async () => {
        // Fallback to English if locale file doesn't exist
        console.warn(`Translation file for locale '${locale}' not found, falling back to English`);
        return import(`../messages/en.json`).then(module => module.default);
      });

    return messages;
  } catch (error) {
    console.error('Failed to load messages:', error);
    notFound();
  }
}

// Get locale from URL path
export function getLocaleFromPathname(pathname: string): Locale {
  const segments = pathname.split('/');
  const locale = segments[1];
  
  if (locales.includes(locale as Locale)) {
    return locale as Locale;
  }
  
  return defaultLocale;
}

// Remove locale from pathname
export function removeLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/');
  if (locales.includes(segments[1] as Locale)) {
    segments.splice(1, 1);
    return segments.join('/') || '/';
  }
  return pathname;
}