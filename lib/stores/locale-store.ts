import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const SUPPORTED_LOCALES = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'zh', name: 'Chinese', nativeName: '中文' }
] as const;

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]['code'];

interface LocaleState {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set) => ({
      locale: 'en',
      setLocale: (locale) => {
        set({ locale });
        // Reload the page to apply new locale
        window.location.pathname = `/${locale}${window.location.pathname.replace(/^\/[a-z]{2}/, '')}`;
      }
    }),
    {
      name: 'r2-locale-preferences'
    }
  )
);