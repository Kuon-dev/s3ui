import { useTranslations as useNextIntlTranslations } from 'next-intl';
import type { Messages } from '@/types/i18n';

// Type-safe translation hook
export function useTranslations<Namespace extends keyof Messages>(
  namespace: Namespace
): (key: keyof Messages[Namespace], values?: Record<string, any>) => string {
  const t = useNextIntlTranslations(namespace as any);
  return (key: keyof Messages[Namespace], values?: Record<string, any>) => {
    return t(key as any, values);
  };
}

// Common translation helpers with type safety
export function useCommonTranslations() {
  return useTranslations('common');
}

export function useFileBrowserTranslations() {
  return useTranslations('fileBrowser');
}

export function useSettingsTranslations() {
  return useTranslations('settings');
}

export function useErrorTranslations() {
  return useTranslations('errors');
}

export function useSuccessTranslations() {
  return useTranslations('success');
}

export function useInfoTranslations() {
  return useTranslations('info');
}