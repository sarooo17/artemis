# Artemis Authentication System

Sistema di autenticazione completo JWT-based per Artemis.

## 🚀 Quick Start

### 1. Setup Database

```bash
# Installa PostgreSQL (se non già installato)
# Windows: https://www.postgresql.org/download/windows/
# Mac: brew install postgresql

# Crea il database
createdb artemis

# Oppure con psql:
psql -U postgres
CREATE DATABASE artemis;
\q
```

### 2. Backend Setup

```bash
cd apps/backend

# Installa dipendenze
pnpm install

# Configura variabili d'ambiente
cp .env.example .env
# Modifica .env con le tue configurazioni

# Genera Prisma Client
pnpm prisma:generate

# Esegui migrations
pnpm prisma:migrate

# Crea utente di test
npx tsx prisma/seed.ts

# Avvia server
pnpm dev
```

Il backend sarà disponibile su `http://localhost:3001`

### 3. Frontend Setup

```bash
cd apps/frontend/artemis

# Installa dipendenze (se necessario)
pnpm install

# Avvia frontend
pnpm dev
```

Il frontend sarà disponibile su `http://localhost:3000`

## 🔐 Credenziali di Test

Dopo aver eseguito il seed:

- **Email**: `admin@artemis.com`
- **Password**: `Admin123!`

## 📚 API Endpoints

### Authentication

#### POST `/api/auth/login`
Login utente
```json
{
  "email": "admin@artemis.com",
  "password": "Admin123!"
}
```

Response:
```json
{
  "user": {
    "id": "uuid",
    "email": "admin@artemis.com",
    "createdAt": "2024-01-01T00:00:00.000Z"
  },
  "accessToken": "jwt-token"
}
```

#### GET `/api/auth/me`
Ottieni utente corrente (richiede autenticazione)

Headers:
```
Authorization: Bearer <access-token>
```

#### POST `/api/auth/refresh`
Refresh access token (usa refresh token da cookie)

#### POST `/api/auth/logout`
Logout utente

### Chat

#### GET `/api/chat/sessions`
Lista sessioni chat dell'utente (richiede autenticazione)

#### GET `/api/chat/sessions/:id`
Dettagli sessione chat (richiede autenticazione)

#### POST `/api/chat/sessions`
Crea nuova sessione chat (richiede autenticazione)

#### POST `/api/chat/sessions/:id/messages`
Aggiungi messaggio a sessione (richiede autenticazione)

#### DELETE `/api/chat/sessions/:id`
Elimina sessione chat (richiede autenticazione)

#### POST `/api/chat/claim-sessions`
Associa sessioni anonime all'utente dopo login (richiede autenticazione)

## 🏗️ Architettura

### Token System

- **Access Token**: JWT con vita breve (15 minuti)
  - Inviato via `Authorization: Bearer <token>` header
  - Contiene `userId` e `email`
  
- **Refresh Token**: JWT con vita lunga (7 giorni)
  - Salvato in **HttpOnly cookie** (sicuro)
  - Usato per ottenere nuovo access token
  - Salvato in database per revoca

### Database Schema

```prisma
User {
  id                 String
  email              String @unique
  hashedPassword     String
  isTwoFactorEnabled Boolean
  twoFactorSecret    String?
  createdAt          DateTime
  updatedAt          DateTime
  chatSessions       ChatSession[]
  refreshTokens      RefreshToken[]
}

RefreshToken {
  id        String
  token     String @unique
  userId    String
  expiresAt DateTime
  createdAt DateTime
}

ChatSession {
  id            String
  userId        String?
  tempSessionId String?
  title         String?
  createdAt     DateTime
  updatedAt     DateTime
  messages      ChatMessage[]
}

ChatMessage {
  id        String
  sessionId String
  role      String
  content   String
  createdAt DateTime
}
```

### Frontend Flow

1. **Login**: Utente inserisce credenziali → API `/auth/login` → Riceve access token + refresh token in cookie
2. **Navigazione**: Ogni richiesta include `Authorization: Bearer <token>`
3. **Refresh**: Se access token scade (401), automaticamente richiama `/auth/refresh`
4. **Logout**: Chiama `/auth/logout` → Revoca refresh token → Redirect a login

### Route Protection

Tutte le pagine principali sono protette da `ProtectedRoute`:
- Verifica autenticazione
- Redirect a `/login` se non autenticato
- Mostra loading durante verifica

## 🔒 Sicurezza

- ✅ Password hashate con **bcrypt** (12 rounds)
- ✅ Access token vita breve (15 minuti)
- ✅ Refresh token in **HttpOnly + Secure + SameSite** cookies
- ✅ Token revocation in database
- ✅ Rate limiting (100 req/15min)
- ✅ CORS configurato per frontend specifico
- ✅ Validazione input con Zod
- ✅ Ready per MFA TOTP (campi già nel DB)

## 🛠️ Development

### Prisma Commands

```bash
# Genera client dopo modifica schema
pnpm prisma:generate

# Crea migration
pnpm prisma:migrate

# Apri Prisma Studio (DB GUI)
pnpm prisma:studio

# Reset database
pnpm prisma migrate reset
```

### Environment Variables

Backend (`.env`):
```env
NODE_ENV=development
PORT=3001
FRONTEND_URL=http://localhost:3000
DATABASE_URL="postgresql://user:password@localhost:5432/artemis"
JWT_ACCESS_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret-key
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false
```

## 📝 TODO / Future Enhancements

- [ ] Implementare MFA TOTP
- [ ] Password reset via email
- [ ] Email verification
- [ ] OAuth providers (Google, Microsoft)
- [ ] Session management dashboard
- [ ] Audit log per azioni sensibili
- [ ] Rate limiting più granulare
- [ ] Soft delete per utenti
- [ ] Account lockout dopo tentativi falliti

## 🐛 Troubleshooting

### "Cannot connect to database"
- Verifica che PostgreSQL sia in esecuzione
- Controlla `DATABASE_URL` in `.env`
- Verifica credenziali database

### "Invalid token"
- Access token potrebbe essere scaduto → Refresh automatico dovrebbe gestirlo
- Verifica che `JWT_ACCESS_SECRET` sia consistente

### "Refresh token not found"
- Cookie potrebbe essere stato cancellato
- Utente deve fare login di nuovo

### CORS errors
- Verifica che `FRONTEND_URL` in backend `.env` corrisponda all'URL frontend
- Controlla che `credentials: 'include'` sia presente nelle fetch
