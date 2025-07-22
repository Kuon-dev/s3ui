// Add custom jest matchers from jest-dom
import '@testing-library/jest-dom';

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
    };
  },
  usePathname() {
    return '/en';
  },
  notFound: jest.fn(),
}));

// Mock next-intl
jest.mock('next-intl', () => ({
  useLocale: () => 'en',
  useTranslations: (namespace) => {
    return (key, values) => {
      if (values) {
        return `${namespace}.${key} with values: ${JSON.stringify(values)}`;
      }
      return `${namespace}.${key}`;
    };
  },
}));

// Suppress console errors in tests
global.console = {
  ...console,
  error: jest.fn(),
  warn: jest.fn(),
};