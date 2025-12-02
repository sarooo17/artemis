# 🚀 Artemis: Context-Aware Operating System - Master Development Plan

## 🌟 La Visione
Il sistema evolve da semplice "Chatbot che genera UI" a un **Sistema Operativo Contestuale**.
- **La Chat è il Regista**: Comprende l'intento, orchestra i servizi e decide il layout.
- **La UI è il Palcoscenico**: Uno spazio dinamico che persiste, evolve e reagisce, indipendente dal flusso lineare della chat.

---

## 📅 Fase 1: Il Cervello (Backend Context & Orchestration)
**Obiettivo:** Rendere l'AI consapevole di chi sei, dove sei e cosa vuoi vedere, connettendola ai dati reali.

### 1.1 Context Builder Middleware (`src/middleware/context.middleware.ts`)
Creazione di un middleware che intercetta ogni richiesta e inietta il contesto vitale.
- **User Context**: Ruolo, Dipartimenti abilitati, Lingua.
- **Company Context**: `CompanyId`, `DepartmentId` (fondamentali per Fluentis WebAPI).
- **UI Context**: Route attuale (es. `/dashboard`), ID entità visualizzata (es. `order-123`), Filtri attivi.

### 1.2 Fluentis Service Expansion (`fluentis.service.ts`)
Abbandono del MOCK_MODE per integrazione reale.
- **Read Operations**: Implementare `Export` generico con filtri DevExpress dinamici.
- **Write Operations**: Implementare `Import` (per creazione) e `Operation` (per update) come scoperto nella documentazione.
- **Authentication**: Gestione token/basic auth dinamica per multi-tenancy.

### 1.3 Orchestrator Upgrade (`orchestration.service.ts`)
- **System Prompt Dinamico**: Iniezione del Context JSON nel prompt di sistema.
- **Layout Intent**: L'AI deciderà la modalità di visualizzazione tramite un campo strutturato o tag XML:
  - `immersive`: Chat Full Screen (Brainstorming, Spiegazioni complesse).
  - `split`: Chat + UI (Analisi dati, Operazioni guidate).
  - `minimized`: UI Focus (Dashboard, Data Entry veloce).
- **Tool Expansion**: Aggiunta di nuovi tool OpenAI (es. `create_sales_order`, `update_customer`).

---

## 📅 Fase 2: Il Palcoscenico (Frontend UI & History)
**Obiettivo:** Navigazione temporale indipendente tra Chat e UI.

### 2.1 Decoupled History Engine (`page.tsx` & Context)
Separare la storia della conversazione dalla storia delle interfacce.
- **Chat History**: Lineare, persistente (come ora).
- **UI History Stack**: Stack temporale di stati UI (`{ content: string, timestamp: Date, sourceMessageId: string }`).
- **Navigation Controls**: Barra di navigazione sopra la UI (Indietro/Avanti) per navigare tra gli stati generati senza dover scorrere la chat.

### 2.2 Layout Manager
- Reattività al `layoutIntent` inviato dal backend.
- Transizioni fluide tra le modalità (Immersive/Split/Minimized).
- Gestione dello stato "Thinking" visibile (parsing dei tag `<thinking>` di Thesys).

### 2.3 Pinned Views (Il "Dock")
- Sidebar collassabile a destra.
- Funzionalità "Pin" su ogni generazione UI.
- Ripristino istantaneo di uno stato UI salvato cliccando sul Pin.

---

## 📅 Fase 3: Le Mani (Interattività & Server Actions)
**Obiettivo:** Passare da "Leggere" a "Fare" usando le capacità native di Thesys C1.

### 3.1 Custom Component Library
Creazione di componenti React "Smart" ottimizzati per ERP, registrati tramite schema Zod.
- `FluentisTable`: Tabella con filtri server-side, ordinamento e selezione.
- `FluentisForm`: Form generati dinamicamente dagli schemi di input Fluentis.
- `FluentisKPI`: Widget per metriche chiave.

### 3.2 Action Protocol & Handler
Standardizzazione del flusso di azione.
- **Frontend**: Uso di `onAction` e `useC1State` di Thesys SDK per catturare l'intento utente.
- **Backend Endpoint** (`POST /api/actions/execute`): Proxy sicuro che riceve l'azione, la valida e chiama `fluentisService.operation`.
- **Feedback Loop**: Aggiornamento della UI post-azione (es. Toast notification o rigenerazione parziale).

### 3.3 State Persistence
- Implementazione di `updateMessage` callback.
- Salvataggio dello stato dei form nel DB (Prisma) per non perdere i dati inseriti durante il refresh o la navigazione.

---

## 📅 Fase 4: L'Orientamento (Mental Maps & Optimization)
**Obiettivo:** Mai più "Dove sono finito?".

### 4.1 UI Patching (Delta Updates)
- Invece di rigenerare l'intera UI per piccoli cambiamenti, usare tool che restituiscono solo i dati modificati.
- Aggiornamento dello stato locale tramite `useC1State` senza round-trip completo LLM per interazioni semplici.

### 4.2 Multi-modal Artifacts
- Supporto per tag `<artifact>` di Thesys.
- Generazione di Report PDF, CSV scaricabili o presentazioni direttamente nella chat.
