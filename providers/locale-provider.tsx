'use client';

import { NextIntlClientProvider } from 'next-intl';
import { ReactNode } from 'react';

interface LocaleProviderProps {
  children: ReactNode;
  locale: string;
  messages: any;
  timeZone?: string;
  now?: Date;
}

export function LocaleProvider({ 
  children, 
  locale, 
  messages,
  timeZone = 'UTC',
  now = new Date()
}: LocaleProviderProps) {
  return (
    <NextIntlClientProvider 
      locale={locale} 
      messages={messages}
      timeZone={timeZone}
      now={now}
      formats={{
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
      }}
    >
      {children}
    </NextIntlClientProvider>
  );
}