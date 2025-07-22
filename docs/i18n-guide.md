# Internationalization (i18n) Guide

This guide explains how to use the i18n system implemented in the S3UI application.

## Overview

The application uses `next-intl` for internationalization with support for the following languages:
- English (en) - Default
- Spanish (es)
- French (fr)
- German (de)
- Japanese (ja)
- Chinese (zh)

## How to Use Translations in Components

### 1. Import the translation hook

```tsx
import { useTranslations } from '@/hooks/use-translations';
```

### 2. Use translations in your component

```tsx
export function MyComponent() {
  const t = useTranslations('common'); // 'common' is the namespace
  
  return (
    <div>
      <h1>{t('title')}</h1>
      <button>{t('save')}</button>
    </div>
  );
}
```

### 3. Use translations with variables

```tsx
const t = useTranslations('fileBrowser');
const itemCount = 5;

return <p>{t('itemsSelected', { count: itemCount })}</p>;
// Output: "5 items selected"
```

## Available Translation Namespaces

- `common` - Common UI elements (buttons, labels, etc.)
- `fileBrowser` - File browser specific strings
- `emptyState` - Empty state messages
- `renameDialog` - Rename dialog strings
- `createFolderDialog` - Create folder dialog strings
- `deleteDialog` - Delete confirmation dialog strings
- `uploadDialog` - Upload dialog strings
- `globalSearch` - Global search strings
- `filePreview` - File preview strings
- `settings` - Settings dialog strings
- `errors` - Error messages
- `success` - Success messages
- `info` - Informational messages

## Updating Components for i18n

Here's how to update an existing component:

### Before (hardcoded strings):
```tsx
export function EmptyState() {
  return (
    <div>
      <h3>This folder is empty</h3>
      <p>Drag and drop files here or click the upload button to get started.</p>
      <button>Upload Files</button>
    </div>
  );
}
```

### After (with i18n):
```tsx
import { useTranslations } from '@/hooks/use-translations';

export function EmptyState() {
  const t = useTranslations('emptyState');
  
  return (
    <div>
      <h3>{t('folderEmpty')}</h3>
      <p>{t('dragDropHint')}</p>
      <button>{t('uploadFiles')}</button>
    </div>
  );
}
```

## Toast Messages

For toast messages in stores or non-component files, use the toast utilities:

```tsx
import { toastError, toastSuccess, toastInfo } from '@/lib/utils/toast-messages';

// In your store or utility function:
toastError('loadFiles'); // Will show the translated error message
toastSuccess('folderCreated'); // Will show the translated success message
```

## Adding New Languages

1. Create a new translation file in `/messages/[locale].json`
2. Add the locale to `SUPPORTED_LOCALES` in `/lib/stores/locale-store.ts`
3. Update the middleware matcher in `/middleware.ts`

## Language Switcher

The language switcher is available in the Settings dialog under the Appearance section. Users can change their preferred language there, and the setting will be persisted in localStorage.

## Best Practices

1. Keep translation keys descriptive but concise
2. Use namespaces to organize related translations
3. Always provide fallback text in case translations are missing
4. Use variables for dynamic content instead of concatenating strings
5. Test your UI in different languages to ensure proper layout

## Example: Complete Component Update

Here's a complete example of updating the rename dialog:

```tsx
'use client';

import { useTranslations } from '@/hooks/use-translations';
// ... other imports

export function RenameDialog({ item, onRename }: RenameDialogProps) {
  const t = useTranslations('renameDialog');
  const tCommon = useTranslations('common');
  
  return (
    <Dialog>
      <DialogHeader>
        <DialogTitle>
          {t('title', { type: item.type === 'folder' ? tCommon('folder') : tCommon('file') })}
        </DialogTitle>
      </DialogHeader>
      <DialogContent>
        <Label>{t('newNameLabel')}</Label>
        <Input placeholder={t('placeholder')} />
        <p>{t('currentName', { name: item.name })}</p>
      </DialogContent>
      <DialogFooter>
        <Button variant="ghost">{tCommon('cancel')}</Button>
        <Button>{tCommon('rename')}</Button>
      </DialogFooter>
    </Dialog>
  );
}
```

## Testing Your i18n Implementation

1. Change language in Settings → Appearance → Language
2. Verify all UI elements update to the selected language
3. Test dynamic content with variables
4. Check toast messages appear in the correct language
5. Ensure layout doesn't break with longer translations