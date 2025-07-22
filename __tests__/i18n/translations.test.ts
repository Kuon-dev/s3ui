import { describe, it, expect } from '@jest/globals';
import { locales, getMessages, getLocaleFromPathname, removeLocaleFromPathname } from '@/i18n/config';
import type { Messages } from '@/types/i18n';

describe('i18n Configuration', () => {
  describe('getMessages', () => {
    it('should load messages for all supported locales', async () => {
      for (const locale of locales) {
        const messages = await getMessages(locale);
        expect(messages).toBeDefined();
        expect(messages.common).toBeDefined();
        expect(messages.common.cancel).toBeTruthy();
      }
    });

    it('should have consistent message structure across all locales', async () => {
      const enMessages = await getMessages('en');
      const messageKeys = getNestedKeys(enMessages);

      for (const locale of locales.filter(l => l !== 'en')) {
        const messages = await getMessages(locale);
        const localeKeys = getNestedKeys(messages);
        
        // Check that all keys exist
        for (const key of messageKeys) {
          expect(localeKeys.has(key)).toBe(true);
        }
      }
    });
  });

  describe('getLocaleFromPathname', () => {
    it('should extract locale from pathname', () => {
      expect(getLocaleFromPathname('/en')).toBe('en');
      expect(getLocaleFromPathname('/zh/settings')).toBe('zh');
      expect(getLocaleFromPathname('/en/folder/subfolder')).toBe('en');
    });

    it('should return default locale for invalid paths', () => {
      expect(getLocaleFromPathname('/')).toBe('en');
      expect(getLocaleFromPathname('/invalid')).toBe('en');
      expect(getLocaleFromPathname('/settings')).toBe('en');
    });
  });

  describe('removeLocaleFromPathname', () => {
    it('should remove locale from pathname', () => {
      expect(removeLocaleFromPathname('/en')).toBe('/');
      expect(removeLocaleFromPathname('/zh/settings')).toBe('/settings');
      expect(removeLocaleFromPathname('/en/folder/subfolder')).toBe('/folder/subfolder');
    });

    it('should not modify paths without locale', () => {
      expect(removeLocaleFromPathname('/')).toBe('/');
      expect(removeLocaleFromPathname('/settings')).toBe('/settings');
      expect(removeLocaleFromPathname('/folder/subfolder')).toBe('/folder/subfolder');
    });
  });
});

// Helper function to get all nested keys from an object
function getNestedKeys(obj: any, prefix = ''): Set<string> {
  const keys = new Set<string>();
  
  for (const [key, value] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${key}` : key;
    
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      const nestedKeys = getNestedKeys(value, fullKey);
      nestedKeys.forEach(k => keys.add(k));
    } else {
      keys.add(fullKey);
    }
  }
  
  return keys;
}