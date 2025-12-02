/**
 * Request Context Types
 * Definisce la struttura del contesto iniettato in ogni richiesta
 */

export interface RequestContext {
  /**
   * User Context - Informazioni sull'utente autenticato
   */
  user: {
    id: string;
    email: string;
    name: string;
    role?: {
      id: string;
      name: string;
      departmentId: string;
      departmentName: string;
      permissions: string[]; // Lista di permission names
    };
    settings: {
      language: string;
      timezone: string;
      theme: string;
      dateFormat: string;
      timeFormat: string;
    };
    preferences?: {
      defaultChartType?: string;
      defaultDateRange?: string;
      defaultTablePageSize?: number;
      recentlyViewed?: any; // Json array
      frequentQueries?: any; // Json array
      savedFilters?: any; // Json array
      favoriteCustomers?: any; // Json array (string[])
      favoriteItems?: any; // Json array (string[])
      preferredWarehouse?: string;
    };
  };

  /**
   * Company Context - Informazioni sulla company dell'utente
   */
  company?: {
    id: string;
    name: string;
    language: string;
    currency: string;
    sector?: string;
    vatNumber?: string;
    fluentisCompanyCode?: string;     // Codice Company in Fluentis
    fluentisDepartmentCode?: string;  // Codice Department in Fluentis
  };

  /**
   * UI Context - Stato corrente dell'interfaccia utente
   * Passato dal frontend nelle richieste
   */
  ui?: {
    currentRoute?: string;           // es. "/dashboard", "/chat/session-123"
    entityId?: string;                // es. "order-456" se si sta visualizzando un ordine
    entityType?: string;              // es. "sales_order", "customer", "item", "invoice"
    filters?: Record<string, any>;    // filtri attivi nella UI
    layoutMode?: 'immersive' | 'split' | 'minimized';
    viewportWidth?: number;           // larghezza viewport per responsive hints
    viewportHeight?: number;          // altezza viewport
  };

  /**
   * External Context - Contesto ambientale e temporale
   * Generato automaticamente dal server
   */
  external: {
    timestamp: string;                // ISO 8601 timestamp
    date: {
      iso: string;                    // YYYY-MM-DD
      formatted: string;              // Formattato secondo user.settings.dateFormat
      year: number;
      month: number;
      day: number;
      dayOfWeek: string;              // "Monday", "Tuesday", etc. (localizzato)
    };
    time: {
      iso: string;                    // HH:mm:ss
      formatted: string;              // Formattato secondo user.settings.timeFormat
      hour: number;
      minute: number;
    };
    timezone: {
      name: string;                   // es. "Europe/Rome"
      offset: string;                 // es. "+01:00"
      abbreviation: string;           // es. "CET"
    };
    locale: string;                   // es. "it-IT"
    businessHours: {
      isBusinessHours: boolean;       // Se è in orario lavorativo (9-18)
      nextBusinessDay?: string;       // Prossimo giorno lavorativo se oggi è festivo
    };
  };

  /**
   * Session Context - Informazioni sulla chat session corrente (se applicabile)
   */
  session?: {
    id: string;
    title?: string;
    messageCount: number;
    createdAt: string;
    lastMessageAt?: string;
  };
}

/**
 * UI Context Schema - Quello che il frontend può passare
 */
export interface UIContextInput {
  currentRoute?: string;
  entityId?: string;
  entityType?: string;
  filters?: Record<string, any>;
  layoutMode?: 'immersive' | 'split' | 'minimized';
  viewportWidth?: number;
  viewportHeight?: number;
}
