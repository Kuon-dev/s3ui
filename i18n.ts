import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';
import React from 'react';

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  if (!locale || !['en', 'zh'].includes(locale)) {
    notFound();
  }

  return {
    locale,
    messages: (await import(`./messages/${locale}.json`)).default,
    timeZone: 'UTC',
    now: new Date(),
    formats: {
      dateTime: {
        short: {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        }
      },
      number: {
        precise: {
          maximumFractionDigits: 5
        }
      }
    },
    defaultTranslationValues: {
      globalString: (value: React.ReactNode) => React.createElement('span', null, value),
      important: (chunks: React.ReactNode) => React.createElement('strong', null, chunks)
    },
    onError(error) {
      if (error.message === 'ENVIRONMENT_FALLBACK') {
        // Ignore timezone warnings in development
        return;
      }
      console.error(error);
    },
    getMessageFallback({namespace, key, error}) {
      const path = [namespace, key].filter((part) => part != null).join('.');
      if (error.code === 'MISSING_MESSAGE') {
        return path;
      } else {
        return `Error: ${path}`;
      }
    }
  };
});