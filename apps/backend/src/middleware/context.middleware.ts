import { Request, Response, NextFunction } from 'express';
import { prisma } from '../config/database';
import { redis, isConnected as isRedisConnected } from '../config/redis';
import { RequestContext, UIContextInput } from '../types/context.types';

/**
 * Context Builder Middleware
 * 
 * Intercetta ogni richiesta autenticata e costruisce un contesto completo
 * che include informazioni su: User, Company, UI State, External Context
 * 
 * Il contesto viene cachato in Redis per 5 minuti per ottimizzare le performance
 */
export async function contextBuilder(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    // Verifica che l'utente sia autenticato (dovrebbe essere garantito da requireAuth)
    if (!req.user) {
      res.status(401).json({ error: 'Unauthorized', message: 'User not authenticated' });
      return;
    }

    const userId = req.user.id;
    const cacheKey = `context:${userId}`;
    
    // Estrai UI Context dal body (se presente)
    const uiContext: UIContextInput | undefined = req.body?.uiContext;

    // Prova a recuperare il contesto base da Redis (escludendo UI e External che cambiano sempre)
    let baseContext: Partial<RequestContext> | null = null;
    
    if (isRedisConnected) {
      try {
        const cached = await redis.get(cacheKey);
        if (cached) {
          baseContext = JSON.parse(cached);
        }
      } catch (error) {
        console.warn('Redis cache read failed, falling back to DB query:', error);
      }
    }

    // Se non in cache, costruisci da DB
    if (!baseContext) {
      baseContext = await buildBaseContextFromDB(userId);
      
      // Salva in cache per 5 minuti
      if (isRedisConnected && baseContext) {
        try {
          await redis.setEx(cacheKey, 300, JSON.stringify(baseContext));
        } catch (error) {
          console.warn('Redis cache write failed:', error);
        }
      }
    }

    // Costruisci External Context (sempre fresco)
    const externalContext = buildExternalContext(baseContext?.user?.settings?.timezone || 'UTC', baseContext?.user?.settings?.language || 'en');

    // Costruisci Session Context (se presente sessionId nella route)
    const sessionContext = await buildSessionContext(req);

    // Assembla il contesto completo
    const fullContext: RequestContext = {
      ...baseContext,
      ui: uiContext,
      external: externalContext,
      session: sessionContext,
    } as RequestContext;

    // Inietta nel request
    req.context = fullContext;

    next();
  } catch (error) {
    console.error('Context builder error:', error);
    res.status(500).json({ error: 'Failed to build request context' });
  }
}

/**
 * Costruisce il contesto base da database (User + Company)
 */
async function buildBaseContextFromDB(userId: string): Promise<Partial<RequestContext>> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          department: true,
          permissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      company: true,
      settings: true,
    },
  });

  if (!user) {
    throw new Error('User not found');
  }

  // Costruisci User Context
  const userContext = {
    id: user.id,
    email: user.email,
    name: `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          departmentId: user.role.departmentId,
          departmentName: user.role.department.name,
          permissions: user.role.permissions.map((rp) => rp.permission.name),
        }
      : undefined,
    settings: {
      language: user.settings?.language || 'en',
      timezone: user.settings?.timezone || 'UTC',
      theme: user.settings?.theme || 'light',
      dateFormat: user.settings?.dateFormat || 'DD/MM/YYYY',
      timeFormat: user.settings?.timeFormat || '24h',
    },
    preferences: user.settings ? {
      defaultChartType: user.settings.defaultChartType || undefined,
      defaultDateRange: user.settings.defaultDateRange || undefined,
      defaultTablePageSize: user.settings.defaultTablePageSize || undefined,
      recentlyViewed: (user.settings.recentlyViewed as any) || undefined,
      frequentQueries: (user.settings.frequentQueries as any) || undefined,
      savedFilters: (user.settings.savedFilters as any) || undefined,
      favoriteCustomers: user.settings.favoriteCustomers || undefined,
      favoriteItems: user.settings.favoriteItems || undefined,
      preferredWarehouse: user.settings.preferredWarehouse || undefined,
    } : undefined,
  };

  // Costruisci Company Context
  const companyContext = user.company
    ? {
        id: user.company.id,
        name: user.company.name,
        language: user.company.language,
        currency: user.company.currency,
        sector: user.company.sector || undefined,
        vatNumber: user.company.vatNumber || undefined,
        fluentisCompanyCode: user.company.fluentisCompanyCode || undefined,
        fluentisDepartmentCode: user.company.fluentisDepartmentCode || undefined,
      }
    : undefined;

  return {
    user: userContext,
    company: companyContext,
  };
}

/**
 * Costruisce il contesto esterno (data, ora, timezone, etc.)
 */
function buildExternalContext(timezone: string, language: string): RequestContext['external'] {
  const now = new Date();
  
  // Formatter per date/time con timezone e locale corretti
  const dateFormatter = new Intl.DateTimeFormat(language, {
    timeZone: timezone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  const timeFormatter = new Intl.DateTimeFormat(language, {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });

  const dayOfWeekFormatter = new Intl.DateTimeFormat(language, {
    timeZone: timezone,
    weekday: 'long',
  });

  // Parse date components in user timezone
  const dateInTimezone = new Date(now.toLocaleString('en-US', { timeZone: timezone }));
  
  const year = dateInTimezone.getFullYear();
  const month = dateInTimezone.getMonth() + 1;
  const day = dateInTimezone.getDate();
  const hour = dateInTimezone.getHours();
  const minute = dateInTimezone.getMinutes();

  // ISO date string
  const isoDate = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  const isoTime = `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:${String(dateInTimezone.getSeconds()).padStart(2, '0')}`;

  // Timezone info
  const timezoneOffset = -dateInTimezone.getTimezoneOffset();
  const offsetHours = Math.floor(Math.abs(timezoneOffset) / 60);
  const offsetMinutes = Math.abs(timezoneOffset) % 60;
  const offsetString = `${timezoneOffset >= 0 ? '+' : '-'}${String(offsetHours).padStart(2, '0')}:${String(offsetMinutes).padStart(2, '0')}`;

  // Business hours check (9:00 - 18:00 on weekdays)
  const dayOfWeek = dateInTimezone.getDay(); // 0 = Sunday, 6 = Saturday
  const isWeekday = dayOfWeek >= 1 && dayOfWeek <= 5;
  const isBusinessHours = isWeekday && hour >= 9 && hour < 18;

  // Calcola prossimo giorno lavorativo se oggi è weekend
  let nextBusinessDay: string | undefined;
  if (!isWeekday) {
    const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;
    const nextMonday = new Date(dateInTimezone);
    nextMonday.setDate(nextMonday.getDate() + daysUntilMonday);
    nextBusinessDay = `${nextMonday.getFullYear()}-${String(nextMonday.getMonth() + 1).padStart(2, '0')}-${String(nextMonday.getDate()).padStart(2, '0')}`;
  }

  return {
    timestamp: now.toISOString(),
    date: {
      iso: isoDate,
      formatted: dateFormatter.format(now),
      year,
      month,
      day,
      dayOfWeek: dayOfWeekFormatter.format(now),
    },
    time: {
      iso: isoTime,
      formatted: timeFormatter.format(now),
      hour,
      minute,
    },
    timezone: {
      name: timezone,
      offset: offsetString,
      abbreviation: now.toLocaleString('en-US', { timeZone: timezone, timeZoneName: 'short' }).split(' ').pop() || timezone,
    },
    locale: language,
    businessHours: {
      isBusinessHours,
      nextBusinessDay,
    },
  };
}

/**
 * Costruisce il contesto della session (se presente nella route)
 */
async function buildSessionContext(req: Request): Promise<RequestContext['session'] | undefined> {
  // Estrai sessionId dai params della route (se presente)
  const sessionId = req.params.id || req.params.sessionId;
  
  if (!sessionId) {
    return undefined;
  }

  try {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: {
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1, // Solo l'ultimo messaggio per timestamp
        },
        _count: {
          select: { messages: true },
        },
      },
    });

    if (!session) {
      return undefined;
    }

    return {
      id: session.id,
      title: session.title || undefined,
      messageCount: session._count.messages,
      createdAt: session.createdAt.toISOString(),
      lastMessageAt: session.messages[0]?.createdAt.toISOString(),
    };
  } catch (error) {
    console.warn('Failed to build session context:', error);
    return undefined;
  }
}

/**
 * Helper: Invalida la cache del contesto per un utente
 * Usare dopo update di user settings, company, role, etc.
 */
export async function invalidateContextCache(userId: string): Promise<void> {
  if (isRedisConnected) {
    try {
      await redis.del(`context:${userId}`);
    } catch (error) {
      console.warn('Failed to invalidate context cache:', error);
    }
  }
}
