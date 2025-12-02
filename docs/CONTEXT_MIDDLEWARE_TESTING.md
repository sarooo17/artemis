# Context Builder Middleware - Testing Guide

## ✅ Implementazione Completata

Il Context Builder Middleware è stato implementato con successo! Questo documento spiega come testarlo.

## 🎯 Cosa fa il Middleware

Il `contextBuilder` middleware:
1. **Intercetta** ogni richiesta autenticata alle route protette
2. **Estrae** informazioni da DB (User, Company, Role, Settings)
3. **Cachea** in Redis per 5 minuti (performance)
4. **Costruisce** un contesto completo che include:
   - User Context (ruolo, permessi, settings)
   - Company Context (azienda, valuta, settore)
   - UI Context (stato UI inviato dal frontend)
   - External Context (data odierna, timezone, orari lavorativi)
   - Session Context (se presente nella route)
5. **Inietta** tutto in `req.context` disponibile per i servizi

## 🧪 Come Testare

### 1. Verifica che il server parta senza errori

```bash
cd apps/backend
pnpm dev
```

Dovresti vedere:
```
✅ Database connected
✅ Redis connected (o ℹ️ Redis not available in dev)
🚀 Server running on http://localhost:3001
```

### 2. Test del Context Endpoint (Debug)

Abbiamo creato un endpoint di test: `GET /api/chat/context`

**Con curl:**
```bash
# Prima fai login e ottieni il token
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"your@email.com","password":"yourpassword"}' \
  -c cookies.txt

# Poi testa il context
curl http://localhost:3001/api/chat/context \
  -H "Content-Type: application/json" \
  -b cookies.txt
```

**Con Postman/Insomnia:**
1. Fai login su `/api/auth/login`
2. Copia il cookie `accessToken`
3. Fai GET su `/api/chat/context`

**Risposta attesa:**
```json
{
  "message": "Request context successfully built",
  "context": {
    "user": {
      "id": "uuid-here",
      "email": "user@example.com",
      "name": "John Doe",
      "role": {
        "id": "role-uuid",
        "name": "Admin",
        "departmentId": "dept-uuid",
        "departmentName": "Sales",
        "permissions": ["read_chats", "write_chats", "manage_users"]
      },
      "settings": {
        "language": "it",
        "timezone": "Europe/Rome",
        "theme": "dark",
        "dateFormat": "DD/MM/YYYY",
        "timeFormat": "24h"
      }
    },
    "company": {
      "id": "company-uuid",
      "name": "Acme Corp",
      "language": "it",
      "currency": "EUR",
      "sector": "Technology",
      "vatNumber": "IT12345678901"
    },
    "ui": null,
    "external": {
      "timestamp": "2025-12-01T14:30:00.000Z",
      "date": {
        "iso": "2025-12-01",
        "formatted": "01/12/2025",
        "year": 2025,
        "month": 12,
        "day": 1,
        "dayOfWeek": "Lunedì"
      },
      "time": {
        "iso": "14:30:00",
        "formatted": "14:30",
        "hour": 14,
        "minute": 30
      },
      "timezone": {
        "name": "Europe/Rome",
        "offset": "+01:00",
        "abbreviation": "CET"
      },
      "locale": "it-IT",
      "businessHours": {
        "isBusinessHours": true,
        "nextBusinessDay": null
      }
    },
    "session": null
  }
}
```

### 3. Test con UI Context dal Frontend

Quando invii messaggi, puoi includere `uiContext` nel body:

```bash
curl -X POST http://localhost:3001/api/chat/sessions/:sessionId/send \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{
    "message": "Mostrami ordini aperti",
    "uiContext": {
      "currentRoute": "/dashboard",
      "entityType": "sales_order",
      "filters": {
        "status": "open",
        "dateFrom": "2025-01-01"
      },
      "layoutMode": "split",
      "viewportWidth": 1920,
      "viewportHeight": 1080
    }
  }'
```

Il context sarà disponibile in `req.context.ui` con tutti i dati passati.

## 🔍 Verifica Cache Redis

Per verificare che il caching funzioni:

```bash
# Connettiti a Redis
redis-cli

# Cerca le chiavi context
KEYS context:*

# Visualizza un context cachato
GET context:your-user-uuid-here

# Verifica TTL (dovrebbe essere ~300 secondi)
TTL context:your-user-uuid-here
```

## 🛠️ Invalidazione Cache

La cache viene automaticamente invalidata quando:
- L'utente aggiorna le sue impostazioni (`PUT /api/settings/user`)
- L'utente aggiorna il profilo (`PUT /api/settings/account`)

Puoi anche invalidarla manualmente importando la funzione:

```typescript
import { invalidateContextCache } from '../middleware/context.middleware';

// Dopo un update importante
await invalidateContextCache(userId);
```

## 📊 Cosa Contiene il Context

### User Context
- ID, Email, Nome completo
- Ruolo e Dipartimento
- Lista di permessi
- Settings (lingua, timezone, tema, formati)

### Company Context
- ID, Nome, VAT Number
- Lingua e Valuta aziendale
- Settore

### UI Context (dal frontend)
- Route corrente
- ID entità visualizzata
- Tipo di entità
- Filtri attivi
- Modalità layout (immersive/split/minimized)
- Dimensioni viewport

### External Context (auto-generato)
- Timestamp ISO
- Data formattata secondo user settings
- Ora formattata secondo user settings
- Timezone info (nome, offset, abbreviazione)
- Locale (per i18n)
- Business Hours check (se è orario lavorativo 9-18)

### Session Context (se nella route)
- ID sessione
- Titolo
- Numero messaggi
- Timestamp creazione/ultimo messaggio

## 🎯 Prossimi Passi

Ora che il Context è disponibile, puoi:

1. **Usarlo nell'Orchestration Service** per prompt context-aware
2. **Passarlo a Fluentis Service** per query specifiche per company
3. **Usarlo per decisioni di layout** (layoutMode)
4. **Filtrare dati** basandoti su filters in UI Context

Esempio in `orchestration.service.ts`:
```typescript
async orchestrate(message: string, context: RequestContext) {
  const systemPrompt = `
You are an AI assistant for ${context.company?.name}.
Current user: ${context.user.name} (${context.user.role?.name})
Current date: ${context.external.date.formatted}
Current time: ${context.external.time.formatted}
Business hours: ${context.external.businessHours.isBusinessHours ? 'Yes' : 'No'}

${context.ui?.currentRoute ? `User is currently viewing: ${context.ui.currentRoute}` : ''}
${context.ui?.filters ? `Active filters: ${JSON.stringify(context.ui.filters)}` : ''}
  `;
  
  // ... resto della logica
}
```

## 🐛 Troubleshooting

### Context è undefined
- Verifica che `contextBuilder` middleware sia registrato DOPO `requireAuth`
- Verifica che l'ordine in `index.ts` sia corretto

### Redis errors in dev
- È normale se Redis non è in esecuzione in development
- Il sistema funziona comunque, solo senza cache (query DB ogni volta)

### Date/Time non corretti
- Verifica che UserSettings abbia timezone corretto
- Default è UTC se non impostato

### Cache non si invalida
- Verifica che Redis sia connesso
- Verifica che la funzione `invalidateContextCache` venga chiamata

## ✅ Checklist Implementazione

- [x] Type definitions (`context.types.ts`)
- [x] Middleware implementation (`context.middleware.ts`)
- [x] Express.d.ts update (Request.context)
- [x] Validators update (uiContextSchema)
- [x] Middleware registration in index.ts
- [x] Cache invalidation in settings routes
- [x] Debug endpoint (`GET /api/chat/context`)
- [ ] **TODO**: Integrare context in orchestration.service.ts
- [ ] **TODO**: Integrare context in fluentis.service.ts
- [ ] **TODO**: Frontend: inviare uiContext nelle richieste
