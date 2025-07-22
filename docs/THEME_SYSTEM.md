# Theme System Documentation

## Overview

The S3UI application features an advanced theming system built with OKLCH color space and Tailwind CSS v4. This document covers the architecture, implementation, and usage of the theme system.

## Table of Contents

1. [OKLCH Color Space](#oklch-color-space)
2. [Theme Architecture](#theme-architecture)
3. [Available Themes](#available-themes)
4. [Implementation Details](#implementation-details)
5. [Creating Custom Themes](#creating-custom-themes)
6. [Theme Switching](#theme-switching)
7. [CSS Variables](#css-variables)
8. [Best Practices](#best-practices)

## OKLCH Color Space

### What is OKLCH?

OKLCH (Oklab Lightness Chroma Hue) is a perceptually uniform color space that provides:

- **L (Lightness)**: 0-100% (black to white)
- **C (Chroma)**: 0-0.4+ (gray to vivid)
- **H (Hue)**: 0-360° (color wheel position)

### Benefits

1. **Perceptual Uniformity**: Equal numeric changes produce equal visual changes
2. **Better Gradients**: Smooth transitions without muddy middle colors
3. **Predictable Contrast**: Easier to maintain WCAG compliance
4. **Wide Gamut**: Supports modern display colors

### Example Usage

```css
/* OKLCH syntax: oklch(lightness chroma hue) */
--primary: oklch(70% 0.25 25);      /* Vibrant color */
--muted: oklch(50% 0.05 25);        /* Muted version */
--background: oklch(10% 0 0);       /* Dark neutral */
```

## Theme Architecture

### Store Structure

The theme system is managed by Zustand with persistence:

```typescript
// lib/stores/theme-store.ts
interface ThemeStore {
  theme: ThemeId
  setTheme: (theme: ThemeId) => void
  themes: Theme[]
}

interface Theme {
  id: ThemeId
  name: string
  category: 'vibrant' | 'warm' | 'cool' | 'minimal'
  colors: ThemeColors
}
```

### Color Tokens

Each theme defines these color tokens:

```typescript
interface ThemeColors {
  // Base colors
  background: string
  foreground: string
  
  // Component colors
  card: string
  cardForeground: string
  
  // Interactive colors
  primary: string
  primaryForeground: string
  secondary: string
  secondaryForeground: string
  
  // Feedback colors
  destructive: string
  destructiveForeground: string
  
  // UI colors
  muted: string
  mutedForeground: string
  accent: string
  accentForeground: string
  
  // Borders and overlays
  border: string
  input: string
  ring: string
  overlay: string
}
```

## Available Themes

### Vibrant Themes

#### 1. Sunset Theme
- **ID**: `sunset`
- **Description**: Warm oranges and purples inspired by twilight
- **Primary**: `oklch(70% 0.25 25)` (Vibrant orange)
- **Use Case**: Energetic, creative environments

#### 2. Ocean Theme
- **ID**: `ocean`
- **Description**: Deep blues and teals with aquatic feel
- **Primary**: `oklch(70% 0.2 220)` (Ocean blue)
- **Use Case**: Calm, professional interfaces

#### 3. Forest Theme
- **ID**: `forest`
- **Description**: Natural greens with earthy tones
- **Primary**: `oklch(65% 0.2 145)` (Forest green)
- **Use Case**: Organic, eco-friendly applications

#### 4. Aurora Theme
- **ID**: `aurora`
- **Description**: Northern lights inspired purples and greens
- **Primary**: `oklch(70% 0.25 290)` (Aurora purple)
- **Use Case**: Modern, futuristic designs

### Warm Themes

#### 5. Amber Theme
- **ID**: `amber`
- **Description**: Golden ambers with warm undertones
- **Primary**: `oklch(75% 0.2 70)` (Warm amber)
- **Use Case**: Friendly, approachable interfaces

#### 6. Rose Theme
- **ID**: `rose`
- **Description**: Soft pinks and rose gold accents
- **Primary**: `oklch(70% 0.2 10)` (Rose pink)
- **Use Case**: Elegant, sophisticated applications

#### 7. Coral Theme
- **ID**: `coral`
- **Description**: Vibrant coral with peachy tones
- **Primary**: `oklch(70% 0.2 30)` (Coral)
- **Use Case**: Playful, energetic designs

### Cool Themes

#### 8. Arctic Theme
- **ID**: `arctic`
- **Description**: Icy blues with crisp whites
- **Primary**: `oklch(75% 0.15 200)` (Ice blue)
- **Use Case**: Clean, minimalist interfaces

#### 9. Twilight Theme
- **ID**: `twilight`
- **Description**: Deep purples with night sky inspiration
- **Primary**: `oklch(60% 0.2 270)` (Twilight purple)
- **Use Case**: Mysterious, elegant applications

#### 10. Mint Theme
- **ID**: `mint`
- **Description**: Fresh mint greens with cool undertones
- **Primary**: `oklch(75% 0.15 165)` (Mint green)
- **Use Case**: Fresh, modern designs

### Minimal Themes

#### 11. Mono Theme
- **ID**: `mono`
- **Description**: Pure monochrome with high contrast
- **Primary**: `oklch(100% 0 0)` (Pure white)
- **Use Case**: Brutalist, high-contrast designs

#### 12. Neutral Theme
- **ID**: `neutral`
- **Description**: Balanced grays with subtle accents
- **Primary**: `oklch(70% 0.01 0)` (Neutral gray)
- **Use Case**: Professional, understated interfaces

#### 13. Gray Theme
- **ID**: `gray`
- **Description**: Classic gray scale with blue undertones
- **Primary**: `oklch(70% 0.01 250)` (Blue-gray)
- **Use Case**: Traditional, corporate applications

## Implementation Details

### CSS Variable Injection

Themes are applied by injecting CSS variables at runtime:

```typescript
export function applyTheme(theme: Theme) {
  const root = document.documentElement
  
  // Convert OKLCH to CSS variables
  Object.entries(theme.colors).forEach(([key, value]) => {
    root.style.setProperty(`--${key}`, value)
  })
  
  // Set theme identifier
  root.setAttribute('data-theme', theme.id)
}
```

### Tailwind Integration

Tailwind CSS v4 is configured to use these CSS variables:

```javascript
// tailwind.config.ts
export default {
  theme: {
    extend: {
      colors: {
        background: 'oklch(var(--background))',
        foreground: 'oklch(var(--foreground))',
        primary: {
          DEFAULT: 'oklch(var(--primary))',
          foreground: 'oklch(var(--primary-foreground))',
        },
        // ... other color mappings
      }
    }
  }
}
```

### Theme Persistence

Themes are persisted to localStorage:

```typescript
const useThemeStore = create(
  persist(
    (set, get) => ({
      theme: 'ocean',
      setTheme: (theme) => {
        set({ theme })
        applyTheme(themes.find(t => t.id === theme)!)
      }
    }),
    {
      name: 'theme-storage',
    }
  )
)
```

## Creating Custom Themes

### Step 1: Define Color Palette

```typescript
const customTheme: Theme = {
  id: 'custom',
  name: 'My Custom Theme',
  category: 'vibrant',
  colors: {
    background: 'oklch(5% 0 0)',
    foreground: 'oklch(95% 0 0)',
    primary: 'oklch(70% 0.25 150)',
    // ... define all required colors
  }
}
```

### Step 2: Color Guidelines

1. **Background**: Keep lightness 5-15% for dark themes
2. **Foreground**: Ensure 7:1 contrast ratio with background
3. **Primary**: Use 60-75% lightness for vibrancy
4. **Chroma**: 0.15-0.25 for vibrant colors, 0-0.05 for muted

### Step 3: Add to Theme List

```typescript
// lib/stores/theme-store.ts
const themes: Theme[] = [
  // ... existing themes
  customTheme
]
```

## Theme Switching

### Settings Dialog Integration

The theme switcher is integrated into the Settings dialog, accessible through the settings button in the application header. The Settings dialog also includes:
- Language selection (i18n support for 6 languages)
- UI density controls
- Other appearance preferences

### Component Implementation

```typescript
import { useThemeStore } from '@/lib/stores/theme-store'

export function ThemeSwitcher() {
  const { theme, setTheme, themes } = useThemeStore()
  
  return (
    <Select value={theme} onValueChange={setTheme}>
      <SelectTrigger>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {Object.entries(groupBy(themes, 'category')).map(([category, themes]) => (
          <SelectGroup key={category}>
            <SelectLabel>{category}</SelectLabel>
            {themes.map(theme => (
              <SelectItem key={theme.id} value={theme.id}>
                {theme.name}
              </SelectItem>
            ))}
          </SelectGroup>
        ))}
      </SelectContent>
    </Select>
  )
}
```

### Programmatic Theme Change

```typescript
// Change theme programmatically
useThemeStore.getState().setTheme('ocean')

// Get current theme
const currentTheme = useThemeStore.getState().theme

// Subscribe to theme changes
useThemeStore.subscribe(
  state => state.theme,
  theme => console.log('Theme changed to:', theme)
)
```

## CSS Variables

### Complete Variable List

```css
:root {
  /* Base */
  --background: <oklch-value>;
  --foreground: <oklch-value>;
  
  /* Components */
  --card: <oklch-value>;
  --card-foreground: <oklch-value>;
  --popover: <oklch-value>;
  --popover-foreground: <oklch-value>;
  
  /* Interactive */
  --primary: <oklch-value>;
  --primary-foreground: <oklch-value>;
  --secondary: <oklch-value>;
  --secondary-foreground: <oklch-value>;
  
  /* Feedback */
  --muted: <oklch-value>;
  --muted-foreground: <oklch-value>;
  --accent: <oklch-value>;
  --accent-foreground: <oklch-value>;
  --destructive: <oklch-value>;
  --destructive-foreground: <oklch-value>;
  
  /* UI Elements */
  --border: <oklch-value>;
  --input: <oklch-value>;
  --ring: <oklch-value>;
  --overlay: <oklch-value>;
  
  /* Misc */
  --radius: 0.5rem;
  --chart-1 through --chart-5: <oklch-values>;
}
```

### Using Variables in Components

```css
/* Direct usage */
.custom-component {
  background: oklch(var(--background));
  color: oklch(var(--foreground));
  border: 1px solid oklch(var(--border));
}

/* With opacity */
.overlay {
  background: oklch(var(--overlay) / 0.8);
}

/* Tailwind classes */
<div className="bg-background text-foreground border-border" />
```

## Best Practices

### 1. Accessibility

- Maintain WCAG AA contrast ratios (4.5:1 for normal text, 3:1 for large text)
- Test themes with color blindness simulators
- Provide sufficient color variations for different UI states

### 2. Consistency

- Use semantic color names (primary, secondary) rather than literal colors
- Keep chroma values consistent within a theme category
- Maintain relative lightness relationships between color tokens

### 3. Performance

- Apply themes on the client side to prevent flash of unstyled content
- Use CSS variables for instant theme switching
- Minimize the number of color calculations at runtime

### 4. Testing Themes

```typescript
// Test contrast ratios
function getContrastRatio(color1: string, color2: string): number {
  // Implementation using OKLCH luminance calculation
}

// Validate theme colors
function validateTheme(theme: Theme): ValidationResult {
  const errors = []
  
  // Check contrast ratios
  const bgToFg = getContrastRatio(theme.colors.background, theme.colors.foreground)
  if (bgToFg < 7) {
    errors.push('Insufficient background/foreground contrast')
  }
  
  // Check color completeness
  const requiredColors = ['background', 'foreground', 'primary', /* ... */]
  for (const color of requiredColors) {
    if (!theme.colors[color]) {
      errors.push(`Missing required color: ${color}`)
    }
  }
  
  return { valid: errors.length === 0, errors }
}
```

### 5. Gradients and Transitions

```css
/* Smooth gradients using OKLCH */
.gradient {
  background: linear-gradient(
    to right,
    oklch(var(--primary)),
    oklch(var(--secondary))
  );
}

/* Color transitions */
.transition {
  transition: background-color 200ms ease-in-out;
}
```

### 6. Dark Mode Considerations

All themes in the system are dark by default, but you can create light variants:

```typescript
function createLightVariant(darkTheme: Theme): Theme {
  return {
    ...darkTheme,
    id: `${darkTheme.id}-light`,
    name: `${darkTheme.name} Light`,
    colors: {
      // Invert lightness values
      background: darkTheme.colors.background.replace(/(\d+)%/, (_, l) => 
        `${100 - parseInt(l)}%`
      ),
      // ... adjust other colors
    }
  }
}
```

## Troubleshooting

### Theme Not Applying

1. Check localStorage for corrupted data:
   ```javascript
   localStorage.removeItem('theme-storage')
   window.location.reload()
   ```

2. Verify CSS variables are injected:
   ```javascript
   getComputedStyle(document.documentElement).getPropertyValue('--primary')
   ```

3. Ensure Tailwind is processing OKLCH colors:
   ```css
   /* Should compile to: background-color: oklch(...) */
   @apply bg-primary;
   ```

### Color Rendering Issues

1. Check browser support for OKLCH (Chrome 111+, Safari 15.4+, Firefox 113+)
2. Provide fallbacks for older browsers:
   ```css
   .element {
     background: #007bff; /* Fallback */
     background: oklch(70% 0.2 220); /* Modern browsers */
   }
   ```

### Performance Issues

1. Minimize theme switching animations for large DOMs
2. Use CSS variables instead of runtime color calculations
3. Consider using `will-change` for frequently themed elements

## Conclusion

The OKLCH-based theme system provides a modern, accessible, and flexible approach to application theming. With 12 pre-built themes across four categories and easy customization options, it offers both variety and consistency for different user preferences and use cases.