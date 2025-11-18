# Artemis Frontend - Playground

## 📁 Struttura

```
apps/frontend/artemis/
├── app/
│   ├── layout.tsx              # Root layout con configurazione globale
│   ├── page.tsx                # Home page (redirect a /playground)
│   ├── globals.css             # Stili globali Tailwind CSS v4
│   └── playground/
│       ├── page.tsx            # Pagina principale playground
│       └── genui/
│           └── page.tsx        # Test environment per Gen UI
├── components/
│   ├── Sidebar.tsx             # Sidebar di navigazione
│   ├── TaskCard.tsx            # Card per task e notifiche
│   ├── RecentItem.tsx          # Item per documenti recenti
│   └── GenUIRenderer.tsx       # Renderer per UI generate da AI
└── postcss.config.mjs          # Configurazione PostCSS per Tailwind v4
```

## 🎨 Design System

### Colori
- **Primary**: `#3b82f6` (blue-500)
- **Background**: `#fafafa` (gray-50)
- **Sidebar**: `#ffffff` (white)
- **Text**: `#171717` (gray-900)

### Typography
- **Font Family**: Geist Sans & Geist Mono
- **Sizes**: 
  - Title: `text-4xl` (36px)
  - Heading: `text-xl` (20px)
  - Body: `text-sm` (14px)
  - Caption: `text-xs` (12px)

### Spacing
- Container max-width: `max-w-2xl` (672px)
- Main padding: `px-8 py-12`
- Card padding: `p-6`
- Item padding: `p-3`

## 🚀 Routes

- `/` - Home (redirect to /playground)
- `/playground` - Main playground interface
- `/playground/genui` - Gen UI test environment

## 🧩 Componenti

### Sidebar
Navigazione laterale con:
- Logo Artemis
- Menu items (Home, External, Grid, Search)
- User avatar

### TaskCard
Card per visualizzare task e notifiche con:
- Icon
- Title
- Action button
- Hover effects

### RecentItem
Item per documenti/risorse recenti con:
- Icon
- Title
- Timestamp
- Keyboard shortcut (opzionale)

### GenUIRenderer
Sandbox per testare UI generate da AI con:
- Textarea per prompt
- Generate button
- Clear button
- Preview area
- Loading state
- Empty state

## 🎯 Prossimi Step

1. Implementare chiamate API per Gen UI reale
2. Aggiungere autenticazione e gestione utenti
3. Implementare routing avanzato con layout dinamici
4. Aggiungere dark mode
5. Implementare sistema di notifiche real-time
6. Creare componenti UI riutilizzabili (Button, Input, Card, etc.)

## 🛠️ Tecnologie

- **Framework**: Next.js 16 (App Router + Turbopack)
- **Styling**: Tailwind CSS v4
- **Language**: TypeScript
- **Package Manager**: pnpm (workspace monorepo)
