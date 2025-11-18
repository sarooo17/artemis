# Artemis – Architecture Overview (MVP)

## Core Concepts

- **Intent Engine**: riceve input naturale e lo trasforma in una lista di "intenti" strutturati.
- **Orchestrator**: coordina gli agenti, mantiene il contesto del flusso e decide i passi successivi.
- **Agents**:
  - UIAgent: costruisce la UI molecolare usando la DSL GenUI.
  - DataAgent: legge/scrive dati (per ora su DB mock).
  - LogicAgent: esegue la business logic (availability, margini, simulazioni).
- **GenUI Engine**: renderer che traduce JSON/DSL in componenti React sul frontend.
- **Replay Mode**: registra ogni step dell'orchestrator per poterlo rivedere.

## Code Structure

- `apps/frontend`: Next.js + React + Tailwind, responsabile del rendering della GenUI.
- `apps/backend`: Node.js + TS, espone API per:
  - parsing intenti
  - orchestrazione flussi
  - generazione layout GenUI
  - replay mode
- `packages/shared`: tipi TypeScript condivisi:
  - tipi degli Intent
  - schema della DSL GenUI
  - tipi comuni (Order, Customer, Product, ecc.)

## Data Layer (MVP)

- SQLite con tabelle:
  - `customers`
  - `products`
  - `inventory`
  - `orders`
  - `invoices`
- Accesso tramite DataAgent con funzioni semplici e tipizzate.

## Technical Stack – MVP

- Frontend: Next.js (App Router) + React + TypeScript
- Styling: Tailwind CSS
- Backend: Node.js + TypeScript (Fastify o Express)
- Database: SQLite (via Prisma o query raw)
- Package manager: pnpm (monorepo: apps + packages)
- AI: OpenAI API per Intent Engine e, in futuro, suggerimenti GenUI
