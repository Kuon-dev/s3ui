import React from 'react';
import { render, screen } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import { useTranslations } from '@/hooks/use-translations';

// Test component that uses translations
function TestComponent({ namespace }: { namespace: keyof Messages }) {
  const t = useTranslations(namespace);
  
  return (
    <div>
      <p data-testid="cancel">{t('cancel' as any)}</p>
      <p data-testid="with-values">{t('itemsSelected' as any, { count: 5 })}</p>
    </div>
  );
}

// Mock messages
const mockMessages = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete'
  },
  fileBrowser: {
    itemsSelected: '{count} items selected'
  }
};

describe('useTranslations Hook', () => {
  it('should return translated strings', () => {
    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <TestComponent namespace="common" />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('cancel')).toHaveTextContent('Cancel');
  });

  it('should handle interpolated values', () => {
    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <TestComponent namespace="fileBrowser" />
      </NextIntlClientProvider>
    );

    expect(screen.getByTestId('with-values')).toHaveTextContent('5 items selected');
  });

  it('should return key as fallback for missing translations', () => {
    render(
      <NextIntlClientProvider locale="en" messages={mockMessages}>
        <TestComponent namespace="common" />
      </NextIntlClientProvider>
    );

    // This will show the key since 'itemsSelected' doesn't exist in 'common'
    expect(screen.getByTestId('with-values')).toHaveTextContent('common.itemsSelected');
  });
});

// Type imports
import type { Messages } from '@/types/i18n';