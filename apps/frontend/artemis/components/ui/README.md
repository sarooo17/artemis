# Artemis Design System

Sistema di design atomico completo basato su **Atomic Design Pattern**.

## 📐 Architettura

```
components/ui/
├── atoms/          # Componenti base indivisibili
├── molecules/      # Combinazioni semplici di atoms
├── organisms/      # Strutture complesse
└── index.ts        # Export centrale
```

## 🔷 Atoms (Componenti Base)

### Avatar
Avatar utente con stato opzionale.

```tsx
import { Avatar } from "@ui/atoms";

<Avatar 
  src="/avatar.jpg" 
  alt="John Doe" 
  size="md" 
  status="online" 
/>
```

**Props:**
- `src?: string` - URL immagine
- `alt?: string` - Testo alternativo
- `fallback?: string` - Fallback text
- `size?: "xs" | "sm" | "md" | "lg" | "xl"` - Dimensione
- `status?: "online" | "offline" | "busy" | "away"` - Stato

---

### Badge
Etichetta per stato, categoria, conteggio.

```tsx
import { Badge } from "@ui/atoms";

<Badge variant="primary" size="md" rounded>
  New
</Badge>
```

**Props:**
- `variant?: "default" | "primary" | "success" | "warning" | "danger" | "outline"`
- `size?: "sm" | "md" | "lg"`
- `rounded?: boolean` - Badge circolare

---

### Button
Pulsante con varianti, dimensioni, stati.

```tsx
import { Button } from "@ui/atoms";

<Button 
  variant="primary" 
  size="md" 
  isLoading={false}
  leftIcon={<Icon icon="✓" />}
>
  Confirm
</Button>
```

**Props:**
- `variant?: "primary" | "secondary" | "ghost" | "danger" | "outline"`
- `size?: "sm" | "md" | "lg"`
- `isLoading?: boolean`
- `leftIcon?: ReactNode`
- `rightIcon?: ReactNode`

---

### Card
Contenitore generico per contenuti.

```tsx
import { Card } from "@ui/atoms";

<Card variant="elevated" padding="lg" hoverable>
  Contenuto
</Card>
```

**Props:**
- `variant?: "default" | "outlined" | "elevated"`
- `padding?: "none" | "sm" | "md" | "lg"`
- `rounded?: "sm" | "md" | "lg" | "xl"`
- `hoverable?: boolean`

---

### Icon
Icona emoji/simbolo con dimensioni e colori.

```tsx
import { Icon } from "@ui/atoms";

<Icon icon="🔍" size="md" color="primary" />
```

**Props:**
- `icon: string` - Emoji o simbolo
- `size?: "xs" | "sm" | "md" | "lg" | "xl"`
- `color?: "primary" | "secondary" | "muted" | "success" | "warning" | "danger"`

---

### Input
Campo di input con label, errori, icone.

```tsx
import { Input } from "@ui/atoms";

<Input
  label="Email"
  type="email"
  placeholder="email@example.com"
  error="Email non valida"
  leftIcon={<Icon icon="📧" />}
/>
```

**Props:**
- `label?: string`
- `error?: string`
- `helperText?: string`
- `leftIcon?: ReactNode`
- `rightIcon?: ReactNode`

---

### Spinner
Loading spinner animato.

```tsx
import { Spinner } from "@ui/atoms";

<Spinner size="md" color="primary" />
```

**Props:**
- `size?: "xs" | "sm" | "md" | "lg" | "xl"`
- `color?: "primary" | "secondary" | "white"`

---

### Text
Componente tipografico versatile.

```tsx
import { Text } from "@ui/atoms";

<Text 
  variant="h1" 
  weight="bold" 
  color="primary" 
  align="center"
>
  Titolo
</Text>
```

**Props:**
- `as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "label"`
- `variant?: "display" | "h1" | "h2" | "h3" | "h4" | "body" | "small" | "caption"`
- `weight?: "light" | "normal" | "medium" | "semibold" | "bold"`
- `color?: "primary" | "secondary" | "muted" | "success" | "warning" | "danger"`
- `align?: "left" | "center" | "right" | "justify"`
- `truncate?: boolean`

---

### Textarea
Area di testo multilinea.

```tsx
import { Textarea } from "@ui/atoms";

<Textarea
  label="Descrizione"
  rows={4}
  resize="vertical"
  error="Campo obbligatorio"
/>
```

**Props:**
- `label?: string`
- `error?: string`
- `helperText?: string`
- `resize?: "none" | "vertical" | "horizontal" | "both"`

---

## 🔶 Molecules (Combinazioni)

### CommandInput
Input per comandi con pulsante di invio.

```tsx
import { CommandInput } from "@ui/molecules";

<CommandInput
  value={value}
  onChange={setValue}
  onSubmit={handleSubmit}
  placeholder="Type a command..."
  isLoading={false}
/>
```

---

### SearchInput
Input di ricerca con icona.

```tsx
import { SearchInput } from "@ui/molecules";

<SearchInput
  placeholder="Search..."
  onSearch={(value) => console.log(value)}
/>
```

---

### StatCard
Card per visualizzare statistiche.

```tsx
import { StatCard } from "@ui/molecules";

<StatCard
  title="Revenue"
  value="€847,320"
  icon="💰"
  trend={{ value: 12.5, isPositive: true }}
/>
```

**Props:**
- `title: string`
- `value: string | number`
- `icon?: string`
- `trend?: { value: number, isPositive: boolean }`
- `loading?: boolean`

---

### TaskItem
Item per task/notifiche.

```tsx
import { TaskItem } from "@ui/molecules";

<TaskItem
  icon="📄"
  title="Invoice Draft - Rossi SRL"
  description="Edited 17 min ago"
  badge="Urgent"
  completed={false}
  onToggle={() => {}}
  onAction={() => {}}
/>
```

---

### UserCard
Card utente con avatar e info.

```tsx
import { UserCard } from "@ui/molecules";

<UserCard
  name="Riccardo Saro"
  email="riccardo@artemis.com"
  role="Admin"
  status="online"
  onClick={() => {}}
/>
```

---

## 🔴 Organisms (Strutture Complesse)

### NavigationSidebar
Sidebar di navigazione completa.

```tsx
import { NavigationSidebar } from "@ui/organisms";

const items = [
  { id: "home", icon: "🏠", label: "Home" },
  { id: "search", icon: "🔍", label: "Search" },
];

<NavigationSidebar
  items={items}
  logoIcon="A"
  userName="Riccardo"
  userStatus="online"
  activeItem="home"
  onItemClick={(id) => console.log(id)}
/>
```

---

### StatsGrid
Griglia di statistiche.

```tsx
import { StatsGrid } from "@ui/organisms";

const stats = [
  { id: "1", title: "Revenue", value: "€847K", icon: "💰" },
  { id: "2", title: "Orders", value: "1,284", icon: "📦" },
];

<StatsGrid stats={stats} columns={3} />
```

---

### TaskList
Lista di task con titolo.

```tsx
import { TaskList } from "@ui/organisms";

const tasks = [
  { id: "1", icon: "📄", title: "Task 1" },
  { id: "2", icon: "📊", title: "Task 2" },
];

<TaskList
  title="Today you might want to..."
  tasks={tasks}
  emptyMessage="No tasks"
/>
```

---

### WorkspaceMain
Area principale workspace.

```tsx
import { WorkspaceMain } from "@ui/organisms";

<WorkspaceMain
  title="What are you working on?"
  placeholder="Ask for sales review"
  todayTasks={todayTasks}
  recentItems={recentItems}
  onCommandSubmit={(cmd) => console.log(cmd)}
/>
```

---

## 🎨 Design Tokens

### Colors
```css
Primary: #3b82f6 (blue-500)
Secondary: #6b7280 (gray-500)
Success: #10b981 (green-500)
Warning: #f59e0b (orange-500)
Danger: #ef4444 (red-500)
```

### Spacing
```
xs: 0.25rem (4px)
sm: 0.5rem (8px)
md: 1rem (16px)
lg: 1.5rem (24px)
xl: 2rem (32px)
```

### Border Radius
```
sm: 0.375rem (6px)
md: 0.5rem (8px)
lg: 0.75rem (12px)
xl: 1rem (16px)
```

---

## 🚀 Usage

### Import singolo
```tsx
import { Button, Input, Card } from "@ui/atoms";
```

### Import da categoria
```tsx
import { SearchInput, StatCard } from "@ui/molecules";
```

### Import tutto
```tsx
import * as UI from "@/components/ui";

<UI.Button>Click</UI.Button>
```

---

## 📦 Alias TypeScript

Configurato in `tsconfig.json`:

```json
{
  "paths": {
    "@ui/*": ["components/ui/*"]
  }
}
```

---

## ✨ Best Practices

1. **Usa cn() per classi condizionali**
```tsx
import { cn } from "@/lib/utils";

<div className={cn("base-class", isActive && "active-class")} />
```

2. **Forwarding refs quando necessario**
```tsx
const MyInput = forwardRef<HTMLInputElement, Props>((props, ref) => {
  return <input ref={ref} {...props} />;
});
```

3. **TypeScript strict mode**
Tutti i componenti sono fully typed con TypeScript strict mode.

4. **Accessibilità**
Tutti i componenti includono attributi ARIA appropriati.

---

## 🧪 Testing

I componenti sono pronti per test con Jest/React Testing Library:

```tsx
import { render, screen } from "@testing-library/react";
import { Button } from "@ui/atoms";

test("renders button", () => {
  render(<Button>Click me</Button>);
  expect(screen.getByText("Click me")).toBeInTheDocument();
});
```

---

## 📚 References

- [Atomic Design by Brad Frost](https://atomicdesign.bradfrost.com/)
- [Tailwind CSS v4](https://tailwindcss.com/)
- [React TypeScript](https://react-typescript-cheatsheet.netlify.app/)
