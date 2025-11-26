# Redis Session Tracking

Redis è usato per il tracking delle sessioni utente con revoca immediata.

## Funzionalità

- **Session Tracking**: Ogni refresh token genera una sessione Redis con TTL di 7 giorni
- **Immediate Revocation**: Le sessioni revocate vengono rimosse da Redis immediatamente
- **Metadata**: Ogni sessione traccia IP, User Agent, timestamp di creazione
- **Graceful Degradation**: Il sistema funziona anche senza Redis (solo JWT expiration)

## Setup Development (Opzionale)

### Windows

1. **Installa Redis tramite Docker** (consigliato):
   ```powershell
   docker run -d -p 6379:6379 --name redis redis:7-alpine
   ```

2. **Oppure installa Memurai** (fork Redis per Windows):
   - Download: https://www.memurai.com/
   - Installa e avvia il servizio

### Linux/macOS

```bash
# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# macOS
brew install redis
brew services start redis
```

## Environment Variables

```env
# .env
REDIS_URL=redis://localhost:6379

# Production con autenticazione
REDIS_URL=redis://:password@redis-host:6379
```

## Setup Production

### Opzione 1: Redis Cloud (Consigliato)
- **Upstash**: https://upstash.com/ (free tier: 10k comandi/giorno)
- **Redis Labs**: https://redis.com/try-free/ (free tier: 30MB)

### Opzione 2: Self-hosted
```bash
# Docker Compose
services:
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes --requirepass YOUR_PASSWORD

volumes:
  redis_data:
```

## API

### SessionService Methods

```typescript
// Crea una sessione
await SessionService.createSession(userId, sessionId, {
  ip: '192.168.1.1',
  userAgent: 'Mozilla/5.0...',
});

// Verifica se una sessione è valida
const isValid = await SessionService.isSessionValid(sessionId);

// Revoca una sessione specifica
await SessionService.revokeSession(sessionId);

// Revoca tutte le sessioni di un utente
await SessionService.revokeAllUserSessions(userId);

// Ottieni tutte le sessioni attive di un utente
const sessions = await SessionService.getUserSessions(userId);
```

## Testing

```bash
# Test manuale con redis-cli
redis-cli

# Verifica sessioni
KEYS session:*
KEYS user_sessions:*

# Vedi dati sessione
GET session:<session-id>

# Vedi TTL
TTL session:<session-id>

# Revoca manuale
DEL session:<session-id>
```

## Monitoring

In produzione, monitora:
- **Memoria Redis**: ~100 bytes per sessione
- **Connessioni**: 1 connessione persistente dal backend
- **Comandi**: ~10 comandi per login + 2 per ogni request auth
- **Hit Rate**: % di sessioni trovate in Redis vs fallback DB

## Troubleshooting

### Redis non si connette
```
ℹ️  Redis not available (session tracking disabled)
```
✅ Normale in development senza Redis installato

### Redis troppo lento in produzione
- Verifica latenza di rete al server Redis
- Considera Redis in stessa regione/datacenter
- Usa pipeline per operazioni batch

### Memoria Redis piena
- Verifica TTL sulle chiavi: `TTL session:*`
- Cleanup manuale: `redis-cli KEYS "session:*" | xargs redis-cli DEL`
- Aumenta memoria o abilita eviction policy

## Sicurezza

✅ **Implementato:**
- TTL automatico (7 giorni)
- Revoca immediata su logout
- Verifica sessione ad ogni refresh token

⚠️ **Best Practices Production:**
- Usa password Redis: `requirepass`
- SSL/TLS se Redis remoto: `rediss://`
- Network isolation: Redis in VPC privata
- Backup regolari: `BGSAVE`

## Performance

**Stima load:**
- 1000 utenti attivi = ~100KB memoria Redis
- 10k logins/giorno = ~100k comandi/giorno Redis
- Latency: <1ms locale, <10ms cloud stesso datacenter

**Scaling:**
- Redis Sentinel per high availability
- Redis Cluster per sharding (>10k utenti concorrenti)
