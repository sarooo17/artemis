"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import ProtectedRoute from "@/components/ProtectedRoute";
import { api } from '@/lib/api';
import Navbar from "@/components/Navbar";
import { useAuth } from "@/contexts/AuthContext";
import C1Renderer from "@/components/C1Renderer";
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Toast } from '@/components/Toast';
import { useToast } from '@/hooks/useToast';
import "@crayonai/react-ui/styles/index.css";

type AIResponseBarState = "thinking" | "preview" | "expanded" | "full" | "button" | "hidden";

interface ChatMessage {
  id: string;
  userMessage: string;
  aiResponse: string;
  responseType: 'text' | 'ui';
  timestamp: Date;
}

interface UISnapshot {
  id: string;
  sessionId: string;
  messageId: string;
  branchName: string;
  parentId: string | null;
  content: string;
  layoutIntent: 'full' | 'extended' | 'preview' | 'hidden';
  snapshotIndex: number;
  metadata: Record<string, any> | null;
  isActive: boolean;
  createdAt: string;
}

/**
 * Map C1-generated field names to backend schema field names
 * C1 invents its own field names, we need to translate them
 */
function mapFormFieldNames(actionType: string, formData: Record<string, any>): Record<string, any> {
  const mappings: Record<string, Record<string, string>> = {
    'create_customer': {
      'company_name': 'companyName',
      'companyname': 'companyName',
      'customer_name': 'companyName',
      'name': 'companyName',
      'vat_number': 'vatNumber',
      'vatnumber': 'vatNumber',
      'tax_code': 'taxCode',
      'taxcode': 'taxCode',
      'fiscal_code': 'taxCode',
      'postal_code': 'postalCode',
      'postalcode': 'postalCode',
      'zip_code': 'postalCode',
      'zip': 'postalCode',
      'phone_number': 'phone',
      'phonenumber': 'phone',
      'telephone': 'phone',
      'customer_type': 'customerCategory',
      'customer_category': 'customerCategory',
    },
    'update_customer': {
      'company_name': 'companyName',
      'customer_id': 'customerId',
      'customer_category': 'customerCategory',
      'tax_code': 'taxCode',
      'postal_code': 'postalCode',
      'phone_number': 'phone',
      'vat_number': 'vatNumber',
    },
    // Add mappings for other actions as needed
  };

  const actionMapping = mappings[actionType] || {};
  const mapped: Record<string, any> = {};

  for (const [key, value] of Object.entries(formData)) {
    const mappedKey = actionMapping[key.toLowerCase()] || key;
    mapped[mappedKey] = value;
  }

  // ✅ Post-processing: Add required fields that might be missing
  if (actionType === 'create_customer') {
    // Generate customerId if missing (required by schema)
    if (!mapped.customerId) {
      // Generate a unique ID based on company name
      const companyName = mapped.companyName || 'CUSTOMER';
      const timestamp = Date.now().toString(36);
      const random = Math.random().toString(36).substring(2, 5).toUpperCase();
      mapped.customerId = `${companyName.substring(0, 4).toUpperCase()}-${timestamp}-${random}`;
    }
  }

  return mapped;
}

function ChatPageContent() {
  const params = useParams();
  const router = useRouter();
  const [inputValue, setInputValue] = useState("");
  const initialMessageSentRef = useRef(false);
  
  // AI Response Bar states
  const [aiBarState, setAiBarState] = useState<AIResponseBarState>("hidden");
  const [currentAiResponse, setCurrentAiResponse] = useState("");
  const [currentUserMessage, setCurrentUserMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
  const [thinkingMessage, setThinkingMessage] = useState("Thinking...");
  const [scrollbarVisible, setScrollbarVisible] = useState(false);
  const [shouldScrollToLastMessage, setShouldScrollToLastMessage] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentResponseType, setCurrentResponseType] = useState<'text' | 'ui'>('text');
  const [isStreaming, setIsStreaming] = useState(false);
  const [uiSummaryMessage, setUiSummaryMessage] = useState("");
  const [streamedAiResponse, setStreamedAiResponse] = useState("");
  const [streamedUIContent, setStreamedUIContent] = useState(""); // Separato per UI
  
  // Layout Manager - Auto Apply layoutIntent
  const [userManualOverride, setUserManualOverride] = useState<boolean>(false);
  const [lastLayoutIntent, setLastLayoutIntent] = useState<'full' | 'extended' | 'preview' | 'hidden' | null>(null);
  
  const autoHideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const barHoverRef = useRef(false);
  const uiSummaryMessageRef = useRef("");
  const currentResponseTypeRef = useRef<'text' | 'ui'>('text'); // Track response type immediately
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const scrollbarTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const savedScrollPositionRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const userInteractedRef = useRef(false);
  
  // Toast notifications
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();

  // Auto-hide timer management
  const startAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
    }
    autoHideTimerRef.current = setTimeout(() => {
      if (!barHoverRef.current && aiBarState === "preview") {
        // Go directly to hidden state
        setAiBarState("hidden");
      }
    }, 3000);
  };

  const cancelAutoHideTimer = () => {
    if (autoHideTimerRef.current) {
      clearTimeout(autoHideTimerRef.current);
      autoHideTimerRef.current = null;
    }
  };

  // Handle state transitions
  useEffect(() => {
    if (aiBarState === "preview") {
      // Start timer solo se user ha interagito (chiusura manuale), altrimenti aspetta hover/click
      if (userInteractedRef.current) {
        startAutoHideTimer();
      }
    } else {
      // Clear timer for other states
      cancelAutoHideTimer();
    }
    
    return () => {
      cancelAutoHideTimer();
    };
  }, [aiBarState]);

  // Load chat session from backend
  useEffect(() => {
    if (params.id && typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const hasMessage = searchParams.get('message');
      
      // Only load existing session if there's no initial message to send
      if (!hasMessage) {
        loadChatSession();
      }
    }
  }, [params.id]);

  const loadChatSession = async () => {
    try {
      // ✅ OPTIMIZED: Single request for session + UI snapshots
      const response = await api.get(`/chat/sessions/${params.id}/full`);

      if (response.ok) {
        const data = await response.json();
        console.log('[loadChatSession] Total messages from backend:', data.session.messages.length);
        console.log('[loadChatSession] Total snapshots:', data.snapshots.length);
        
        const messages: ChatMessage[] = [];
        
        // Pair user and assistant messages correctly
        // Messages are already sorted by createdAt, so we pair them sequentially
        for (let i = 0; i < data.session.messages.length; i++) {
          const msg = data.session.messages[i];
          
          // Find user messages
          if (msg.role === 'user') {
            // Look for the next assistant message
            const nextMsg = data.session.messages[i + 1];
            
            if (nextMsg && nextMsg.role === 'assistant') {
              const messageType = (nextMsg.metadata as any)?.type || 'text';
              console.log('[loadChatSession] Processing message pair, type:', messageType);
              
              // ONLY add text messages to chat history
              // UI messages are handled separately via UI Snapshots
              if (messageType === 'text') {
                // Extract response from JSON if needed
                let aiContent = nextMsg.content;
                try {
                  const trimmed = aiContent.trim();
                  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                    const parsed = JSON.parse(trimmed);
                    if (parsed.response) {
                      aiContent = parsed.response;
                    }
                  }
                } catch {
                  // Not JSON or parsing failed, use original content
                }
                
                messages.push({
                  id: msg.id,
                  userMessage: msg.content,
                  aiResponse: aiContent,
                  responseType: messageType,
                  timestamp: new Date(msg.createdAt),
                });
              }
              // Skip the assistant message we just processed
              i++;
            } else {
              // No assistant message found - this happens when UI was generated
              // Add user message with placeholder AI response
              console.log('[loadChatSession] User message without assistant (UI response)');
              messages.push({
                id: msg.id,
                userMessage: msg.content,
                aiResponse: '[UI Response - see workspace]',
                responseType: 'ui',
                timestamp: new Date(msg.createdAt),
              });
            }
          }
        }
        
        console.log('[loadChatSession] Final messages array:', messages.length);
        setChatHistory(messages);
        
        // ✅ OPTIMIZED: Process UI snapshots from same response
        const snapshots = data.snapshots;
        let hasUI = false;
        
        if (snapshots.length > 0) {
          // Render only the latest UI snapshot
          const latestSnapshot = snapshots[snapshots.length - 1];
          setStreamedUIContent(latestSnapshot.content);
          setCurrentResponseType('ui');
          
          // Show summary message in preview bar if available
          if (latestSnapshot.metadata?.summaryMessage) {
            setCurrentAiResponse(latestSnapshot.metadata.summaryMessage);
          }
          
          hasUI = true;
        }
        
        // Set AI bar state based on content
        if (!hasUI && messages.length > 0) {
          const lastMsg = messages[messages.length - 1];
          setCurrentUserMessage(lastMsg.userMessage);
          setCurrentAiResponse(lastMsg.aiResponse);
          setCurrentResponseType(lastMsg.responseType);
          // Show in full mode so user can see full chat history
          setAiBarState("full");
        } else if (hasUI && messages.length > 0) {
          // When UI is loaded, show it in workspace and chat history in expanded mode
          const lastMsg = messages[messages.length - 1];
          setCurrentUserMessage(lastMsg.userMessage);
          // currentAiResponse is already set by UI snapshot summary message
          setAiBarState("expanded");
        } else if (hasUI) {
          // UI loaded but no text messages
          setAiBarState("expanded");
        }
      }
    } catch (error) {
      console.error('Failed to load chat session:', error);
    }
  };

  // UI History navigation removed - only latest snapshot is loaded

  // Layout Manager - Apply layoutIntent from backend
  const applyLayoutIntent = (layoutIntent: 'full' | 'extended' | 'preview' | 'hidden') => {
    if (!userManualOverride) {
      setLastLayoutIntent(layoutIntent);
      
      // Map layoutIntent to AIResponseBarState
      const stateMap: Record<string, AIResponseBarState> = {
        'full': 'full',
        'extended': 'expanded',
        'preview': 'preview',
        'hidden': 'hidden',
      };
      
      const targetState = stateMap[layoutIntent] || 'preview';
      setAiBarState(targetState);
      
      console.log(`🎛️ Auto-applied layoutIntent: ${layoutIntent} → ${targetState}`);
    } else {
      console.log(`🎛️ Skipped layoutIntent (user override active): ${layoutIntent}`);
    }
  };

  // ====== ACTION EXECUTION ======
  
  // State for pending action confirmation
  const [pendingAction, setPendingAction] = useState<{
    actionType: string;
    payload: Record<string, any>;
    humanMessage: string;
    llmMessage: string;
  } | null>(null);

  /**
   * Execute a write action on Fluentis ERP (actual execution, no confirmation)
   */
  const executeActionDirect = async (
    actionType: string,
    payload: Record<string, any>,
    options?: {
      successMessage?: string;
      errorMessage?: string;
    }
  ): Promise<{ success: boolean; result?: any; error?: string; llmMessage?: string; editableForm?: boolean }> => {
    try {
      // Show loading state
      console.log(`⚡ Executing action: ${actionType}`, payload);

      // Call backend action API
      const response = await api.post('/actions/execute', {
        actionType,
        payload,
        sessionId: params.id,
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Success notification
        const message = options?.successMessage || `Action ${actionType} completed successfully`;
        console.log(`✅ ${message}`, data);

        return { success: true, result: data.result, llmMessage: data.llmMessage };
      } else {
        // Error notification
        const errorMsg = data.error || options?.errorMessage || `Action ${actionType} failed`;
        console.error(`❌ ${errorMsg}`, data);
        
        return { success: false, error: errorMsg, editableForm: data.editableForm };
      }
    } catch (error: any) {
      console.error('Action execution error:', error);
      const errorMsg = error.message || 'Network error executing action';
      return { success: false, error: errorMsg };
    }
  };

  /**
   * Handle action triggered from Thesys C1 UI
   */
  const handleC1Action = async (event: {
    type?: string;
    params?: Record<string, any>;
    humanFriendlyMessage: string;
    llmFriendlyMessage: string;
  }) => {
    console.log('🔄 C1 Action triggered:', event);

    // Extract action type and payload from event
    const actionType = event.type || 'unknown';
    const payload = event.params || {};

    // ✅ SPECIAL CASE: continue_conversation from form submit
    // When user submits a form, C1 sends continue_conversation with form data
    // We need to intercept this and show confirmation dialog
    if (actionType === 'continue_conversation' && event.llmFriendlyMessage) {
      const isFormSubmit = event.llmFriendlyMessage.toLowerCase().includes('user clicked on button: submit');
      
      if (isFormSubmit) {
        console.log('📝 Form submit detected, showing confirmation dialog');
        
        // Try to detect which action based on form name
        const formNameMatch = event.llmFriendlyMessage.match(/new[_-]customer[_-]form/i);
        const detectedAction = formNameMatch ? 'create_customer' : 'unknown_action';
        
        // Extract form data from llmFriendlyMessage context
        // The message format is: <content>...</content><context>[...form data...]</context>
        const contextMatch = event.llmFriendlyMessage.match(/<context>\[(.*?)\]<\/context>/);
        let formData: Record<string, any> = {};
        
        if (contextMatch) {
          try {
            // Parse the context JSON (it's escaped)
            const contextStr = contextMatch[1].replace(/&quot;/g, '"');
            const contextArray = JSON.parse(`[${contextStr}]`);
            
            // Extract form values from context
            if (contextArray.length > 1 && contextArray[1] && contextArray[1][0]) {
              const formObject = contextArray[1][0];
              const formKey = Object.keys(formObject)[0]; // e.g., "new_customer_form"
              const fields = formObject[formKey];
              
              // Convert C1 format to flat object
              for (const [key, field] of Object.entries(fields as Record<string, any>)) {
                formData[key] = field.value;
              }
            }
          } catch (e) {
            console.error('Failed to parse form data:', e);
          }
        }
        
        console.log('📋 Extracted form data (raw):', formData);
        
        // ✅ Map C1 field names to backend field names
        const mappedFormData = mapFormFieldNames(detectedAction, formData);
        console.log('📋 Mapped form data:', mappedFormData);
        
        // Show confirmation dialog
        setPendingAction({
          actionType: detectedAction,
          payload: mappedFormData,
          humanMessage: event.humanFriendlyMessage || 'Conferma operazione?',
          llmMessage: event.llmFriendlyMessage || '',
        });
        
        return;
      }
    }
    
    // Filter out non-action events (like continue_conversation, navigation, etc.)
    const nonActionTypes = ['continue_conversation', 'navigate', 'refresh', 'close', 'unknown'];
    if (nonActionTypes.includes(actionType)) {
      console.log(`ℹ️ Skipping non-action event: ${actionType}`);
      // Just send the LLM message for conversation-type actions
      if (event.llmFriendlyMessage) {
        await sendMessageWithText(event.llmFriendlyMessage);
      }
      return;
    }

    // Map C1 action types to backend action types
    const actionTypeMap: Record<string, string> = {
      'create_order': 'create_sales_order',
      'create_sales_order': 'create_sales_order',
      'create_customer': 'create_customer',
      'update_customer': 'update_customer',
      'create_item': 'create_item',
      'update_stock': 'update_stock',
      'create_purchase_order': 'create_purchase_order',
      'create_payment': 'create_payment',
    };

    const backendActionType = actionTypeMap[actionType] || actionType;

    // Set pending action for confirmation (Opzione B - inline chat confirmation)
    setPendingAction({
      actionType: backendActionType,
      payload,
      humanMessage: event.humanFriendlyMessage || `Execute: ${actionType}?`,
      llmMessage: event.llmFriendlyMessage || '',
    });
  };

  /**
   * Confirm and execute pending action
   */
  const confirmPendingAction = async () => {
    if (!pendingAction) return;

    const { actionType, payload } = pendingAction;
    setPendingAction(null); // Clear pending

    // Execute action
    const result = await executeActionDirect(actionType, payload, {
      successMessage: `Operation completed: ${actionType}`,
      errorMessage: `Error executing: ${actionType}`,
    });

    // Show toast notification
    if (result.success) {
      showSuccess('✅ Operazione completata con successo!');
    } else {
      const errorMsg = (result as any).editableForm 
        ? 'Errori di validazione, correggi i dati'
        : result.error || 'Errore durante l\'esecuzione';
      showError(`❌ ${errorMsg}`);
    }

    // Send LLM-friendly message to chat if successful
    if (result.success) {
      // Get LLM message from backend response
      const llmMessage = result.llmMessage || 'Operazione completata con successo.';
      console.log('📩 LLM Message from backend:', llmMessage);
      
      // Build enriched message asking AI to generate confirmation UI
      const confirmationPrompt = `${llmMessage}

Mostra una UI di conferma con:
- Card/riepilogo dell'operazione appena completata
- Dettagli dell'entità creata/modificata
- (Opzionale) Suggerimenti per azioni successive correlate
- (Opzionale) Tabella con entità simili aggiornata

Usa responseFormat='ui' per generare una visualizzazione professionale e informativa.`;
      
      // Send to AI - will generate new UI replacing the form
      await sendMessageWithText(confirmationPrompt);
    } else if (!result.success) {
      // Check if this is a validation error that needs form regeneration
      if ((result as any).editableForm) {
        // Validation error - ask AI to regenerate form with error feedback
        const errorMsg = (result as any).validationErrors || result.error || 'Validation failed';
        const fixPrompt = `La precedente operazione è fallita per errori di validazione: ${errorMsg}. Per favore correggi i dati e riprova.`;
        await sendMessageWithText(fixPrompt);
      } else {
        // Other errors - just show error message
        const errorMsg = result.error || 'Action failed';
        setCurrentAiResponse(`❌ ${errorMsg}`);
        setAiBarState('preview');
      }
    }
  };

  /**
   * Cancel pending action
   */
  const cancelPendingAction = () => {
    setPendingAction(null);
  };

  // Core send message logic - accepts message text directly
  const sendMessageWithText = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isProcessing) {
      return;
    }
    
    const userMessage = messageText.trim();
    setCurrentUserMessage(userMessage);
    
    // Se siamo in full mode, rimaniamo in full, altrimenti andiamo in thinking
    const previousState = aiBarState;
    if (aiBarState !== "full") {
      setAiBarState("thinking");
    }
    setThinkingMessage("Starting...");
    setShouldScrollToLastMessage(true);
    setIsProcessing(true);
    setIsStreaming(true);
    
    // Reset workspace for new request
    setUiSummaryMessage("");
    uiSummaryMessageRef.current = "";
    currentResponseTypeRef.current = 'text'; // Reset response type ref
    // IMPORTANT: Capture current UI content BEFORE resetting states
    const currentUIContent = streamedUIContent || undefined;
    
    setStreamedAiResponse(""); // Reset per nuova risposta testuale
    // ✅ FIX: NON resettare currentResponseType qui - lascia UI visibile
    // Il tipo verrà aggiornato solo quando arriva 'ui_complete' o 'text' event
    
    // Reset layout manager for new AI message
    setUserManualOverride(false);
    
    // Create AbortController for this request
    abortControllerRef.current = new AbortController();
    
    try {
      
      // Build request body
      const requestBody: any = {
        sessionId: params.id,
        message: userMessage,
      };
      
      // Only include currentUIContent if it exists (to avoid sending null)
      if (currentUIContent) {
        requestBody.currentUIContent = currentUIContent;
      }
      
      // Use orchestration endpoint with the current session ID
      const response = await api.post('/chat/orchestrate/stream', requestBody, {
        signal: abortControllerRef.current.signal,
      });

      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }

      if (!response.ok) {
        throw new Error('Failed to send message');
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let streamedResponse = '';
      let streamedUIContent = ''; // Final merged UI from backend
      let uiAction: 'NEW' | 'ADD' | 'MODIFY' | 'REPLACE' = 'NEW'; // Action from orchestrator
      let sessionId = params.id;
      let userMessageId = '';
      let responseType: 'text' | 'ui' = 'text';
      let toolCalls: any[] = [];
      let buffer = ''; // Buffer for incomplete SSE messages

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          const lines = buffer.split('\n');
          
          // Keep the last incomplete line in the buffer
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === 'session') {
                  sessionId = data.sessionId;
                  userMessageId = data.userMessageId;
                  // Update URL to remove the message query param after sending
                  if (typeof window !== 'undefined' && window.location.search.includes('message=')) {
                    router.replace(`/chat/${sessionId}`, { scroll: false });
                  }
                } else if (data.type === 'thinking') {
                  // In full mode mostra thinking inline, altrimenti nella bar
                  if (previousState !== 'full') {
                    setAiBarState('thinking');
                  }
                  setThinkingMessage(data.content);
                } else if (data.type === 'tool_call') {
                  // Show which tool is being called
                  toolCalls.push(data.content);
                  const toolName = data.content.name;
                  const friendlyMessages: Record<string, string> = {
                    'export_sales_orders': 'Sto recuperando i dati delle vendite...',
                    'get_stock_levels': 'Controllo i livelli di stock...',
                    'export_items': 'Carico il catalogo prodotti...',
                    'export_customers': 'Recupero l\'elenco clienti...'
                  };
                  setThinkingMessage(friendlyMessages[toolName] || `Sto cercando: ${toolName}...`);
                } else if (data.type === 'data') {
                  // Data fetched from Fluentis
                  setThinkingMessage('Perfetto! Ora creo la visualizzazione per te...');
                } else if (data.type === 'ui_action') {
                  // Orchestrator tells us the merge strategy
                  uiAction = data.content.action;
                  console.log(`[UI Merge] Action: ${uiAction}, Has existing: ${data.content.hasExisting}`);
                } else if (data.type === 'summary_message') {
                  // Summary message generated by OpenAI for UI responses
                  uiSummaryMessageRef.current = data.content;
                  currentResponseTypeRef.current = 'ui'; // ✅ Set response type immediately in ref
                  setUiSummaryMessage(data.content);
                  setCurrentAiResponse(data.content);
                  setCurrentResponseType('ui');
                  // UI responses always show in preview mode (even if was in full)
                  console.log(`🎛️ [summary_message] Setting AI bar to preview (was: ${aiBarState})`);
                  setAiBarState('preview');
                  setThinkingMessage('Generating UI...');
                } else if (data.type === 'ui_complete') {
                  // ✅ FIX: Backend ha già fatto il merge, aggiorna UI qui
                  responseType = 'ui';
                  setCurrentResponseType('ui');
                  streamedUIContent = data.content;
                  
                  // Update UI display - questo sostituisce la vecchia UI al momento giusto
                  setStreamedUIContent(data.content);
                  console.log(`[UI] Received merged UI (${uiAction} action):`, data.content.substring(0, 100) + '...');
                  
                  // Auto-scroll in full mode
                  if (aiBarState === 'full' && scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                  }
                } else if (data.type === 'text') {
                  // ✅ FIX: Text response - mantieni UI vecchia visibile, mostra solo chat
                  responseType = 'text';
                  // NON cambiare currentResponseType qui - UI vecchia rimane visibile
                  
                  // Show in preview mode by default
                  if (previousState !== 'full' && aiBarState !== 'preview') {
                    setAiBarState('preview');
                  }
                  
                  // Try to parse if content looks like JSON
                  let processedContent = data.content;
                  try {
                    // Check if content starts with { and ends with }
                    const trimmed = data.content.trim();
                    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
                      const parsed = JSON.parse(trimmed);
                      // If it has a 'response' field, extract it
                      if (parsed.response) {
                        processedContent = parsed.response;
                      }
                    }
                  } catch {
                    // Not JSON or parsing failed, use original content
                  }
                  
                  streamedResponse = processedContent;
                  setStreamedAiResponse(processedContent);
                  
                  // Auto-scroll in full mode
                  if (aiBarState === 'full' && scrollContainerRef.current) {
                    scrollContainerRef.current.scrollTop = scrollContainerRef.current.scrollHeight;
                  }
                } else if (data.type === 'title_update') {
                  // Title has been generated for new session
                  console.log(`🏷️  Title updated: ${data.title}`);
                  // Force reload workspaces in navbar to show new title
                  window.dispatchEvent(new CustomEvent('reloadWorkspaces'));
                } else if (data.type === 'done') {
                  setIsStreaming(false);
                  const responseType = currentResponseTypeRef.current; // ✅ Read from ref for immediate value
                  // ✅ FIX: Backend already saves messages to DB, we only need to update local state
                  // Add message to chat history for immediate display (will be reloaded from DB on refresh)
                  if (responseType === 'text' && userMessageId) {
                    const newMessage: ChatMessage = {
                      id: userMessageId,
                      userMessage: userMessage,
                      aiResponse: streamedResponse,
                      responseType: responseType,
                      timestamp: new Date(),
                    };
                    setChatHistory(prev => [...prev, newMessage]);
                  } else if (responseType === 'ui' && userMessageId) {
                    // For UI responses, backend already saved the summary to DB
                    // Just update local state for immediate display
                    const summaryText = uiSummaryMessageRef.current || 'UI generated! Check the workspace.';
                    setCurrentAiResponse(summaryText);
                    
                    // Add summary message to chat history for immediate display
                    const newMessage: ChatMessage = {
                      id: userMessageId,
                      userMessage: userMessage,
                      aiResponse: summaryText,
                      responseType: 'text', // Backend saves as text so it appears in chat
                      timestamp: new Date(),
                    };
                    setChatHistory(prev => [...prev, newMessage]);
                    
                    // Save UI Snapshot to database (simplified - no branching)
                    try {
                      // Skip saving if UI is empty (backend sends merged result)
                      if (!streamedUIContent || streamedUIContent.trim().length === 0) {
                        console.warn('[UI Snapshot] Skipping save - no UI content generated');
                      } else {
                        const snapshotResponse = await api.post(
                          `/chat/sessions/${sessionId}/ui-snapshots`,
                          {
                            messageId: userMessageId,
                            content: streamedUIContent, // Save merged UI from backend
                            branchName: 'main', // Always use main branch
                            parentId: null, // No parent tracking
                            metadata: {
                              toolCalls: toolCalls,
                              summaryMessage: summaryText,
                              timestamp: new Date().toISOString(),
                              uiAction: uiAction, // Save the action used
                            },
                          }
                        );
                        
                        if (snapshotResponse.ok) {
                          console.log('[UI Snapshot] Saved successfully');
                        } else {
                          console.error('Failed to save UI snapshot:', await snapshotResponse.text());
                        }
                      }
                    } catch (error) {
                      console.error('Error saving UI snapshot:', error);
                    }
                  }
                  
                  // If we don't have userMessageId yet, log warning
                  if (!userMessageId) {
                    console.warn('[done] userMessageId is missing, message not saved to history');
                  }
                  
                  // Apply layoutIntent from backend (Layout Manager)
                  console.log(`🎛️ [done] previousState: ${previousState}, currentResponseType: ${responseType}, layoutIntent: ${data.layoutIntent}`);
                  if (data.layoutIntent) {
                    // Se era in full mode ma la risposta è UI, passa a preview
                    if (previousState === 'full' && responseType === 'ui') {
                      console.log('🎛️ [done] Was full + UI response → forcing preview');
                      applyLayoutIntent('preview');
                    } else if (previousState === 'full' && responseType === 'text') {
                      // Se era in full mode e risposta è text, rimani in full
                      console.log('🎛️ [done] Was full + text response → staying full');
                      setAiBarState('full');
                    } else {
                      // Applica layoutIntent dal backend
                      console.log(`🎛️ [done] Applying backend layoutIntent: ${data.layoutIntent}`);
                      applyLayoutIntent(data.layoutIntent);
                    }
                  } else {
                    // Fallback to preview if no layoutIntent
                    console.log('🎛️ [done] No layoutIntent, fallback to preview');
                    userInteractedRef.current = false;
                    setAiBarState('preview');
                  }
                } else if (data.type === 'error') {
                  if (data.code === 'RATE_LIMIT') {
                    alert(data.message || 'Rate limit exceeded. Please wait a moment and try again.');
                  } else if (data.code === 'OPENAI_SERVER_ERROR') {
                    alert(data.message || 'OpenAI service is temporarily unavailable. Please try again later.');
                  } else {
                    alert(data.message || 'Failed to send message. Please try again.');
                  }
                  setAiBarState('hidden');
                }
              } catch (e) {
                console.error('Failed to parse SSE data:', e);
              }
            }
          }
        }
      }
    } catch (error: any) {
      if (thinkingIntervalRef.current) {
        clearInterval(thinkingIntervalRef.current);
        thinkingIntervalRef.current = null;
      }
      
      // Don't show error if request was aborted intentionally
      if (error.name === 'AbortError') {
        console.log('Request cancelled by user');
      } else {
        console.error('Failed to send message:', error);
        alert('Network error. Please check your connection and try again.');
      }
      
      setAiBarState("hidden");
    } finally {
      setIsProcessing(false);
      abortControllerRef.current = null;
    }
  }, [isProcessing, params.id, aiBarState, router]);

  const handleStopProcessing = () => {
    // Save user message to history before stopping
    setIsStreaming(false);
    if (currentUserMessage) {
      const newMessage: ChatMessage = {
        id: `temp-${Date.now()}`,
        userMessage: currentUserMessage,
        aiResponse: "[Request cancelled]",
        responseType: 'text',
        timestamp: new Date(),
      };
      setChatHistory(prev => [...prev, newMessage]);
    }
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    if (thinkingIntervalRef.current) {
      clearInterval(thinkingIntervalRef.current);
      thinkingIntervalRef.current = null;
    }
    setIsProcessing(false);
    setAiBarState("hidden");
  };

  const handleCopyMessage = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Wrapper for handleSendMessage that uses inputValue state
  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;
    
    setInputValue(''); // Clear input
    await sendMessageWithText(message);
  };

  // Send initial message from query string (when coming from home)
  useEffect(() => {
    if (typeof window !== 'undefined' && !initialMessageSentRef.current) {
      const searchParams = new URLSearchParams(window.location.search);
      const message = searchParams.get('message');
      
      if (message && message.trim()) {
        initialMessageSentRef.current = true;
        // Trigger send after component is mounted WITHOUT setting inputValue
        setTimeout(() => {
          sendMessageWithText(message.trim());
        }, 100);
      }
    }
  }, [params.id, sendMessageWithText]);

  // Message editing removed - feature eliminated for simplicity

  const formatTime = (date: Date) => {
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(date);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Scrollbar auto-hide management
  const showScrollbar = () => {
    setScrollbarVisible(true);
    if (scrollbarTimerRef.current) {
      clearTimeout(scrollbarTimerRef.current);
    }
    scrollbarTimerRef.current = setTimeout(() => {
      setScrollbarVisible(false);
    }, 3000);
  };

  const handleScroll = () => {
    showScrollbar();
    if (scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
  };

  const handleScrollMouseEnter = () => {
    setScrollbarVisible(true);
    if (scrollbarTimerRef.current) {
      clearTimeout(scrollbarTimerRef.current);
    }
  };

  const handleScrollMouseLeave = () => {
    if (scrollbarTimerRef.current) {
      clearTimeout(scrollbarTimerRef.current);
    }
    scrollbarTimerRef.current = setTimeout(() => {
      setScrollbarVisible(false);
    }, 3000);
  };

  const handleBarMouseEnter = () => {
    barHoverRef.current = true;
    if (aiBarState === "preview") {
      // Mark user interaction
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
        startAutoHideTimer();
      } else {
        cancelAutoHideTimer();
      }
    }
  };

  const handleBarMouseLeave = () => {
    barHoverRef.current = false;
    if (aiBarState === "preview" && userInteractedRef.current) {
      startAutoHideTimer();
    }
  };

  const handleBarClick = () => {
    if (aiBarState === "preview") {
      // Mark user interaction
      if (!userInteractedRef.current) {
        userInteractedRef.current = true;
      }
      setUserManualOverride(true);
      setAiBarState("expanded");
      cancelAutoHideTimer();
    }
  };

  const handleExpandedClose = () => {
    if (scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    // Chiusura manuale: marca interazione per far partire timer subito
    userInteractedRef.current = true;
    setUserManualOverride(true);
    setAiBarState("preview");
  };

  const handleToggleFull = () => {
    // Salva la posizione dello scroll prima di cambiare stato
    if (scrollContainerRef.current) {
      savedScrollPositionRef.current = scrollContainerRef.current.scrollTop;
    }
    
    setUserManualOverride(true);
    if (aiBarState === "full") {
      // Exit fullscreen: torna a expanded
      setAiBarState("expanded");
    } else {
      // Enter fullscreen da expanded
      setAiBarState("full");
    }
  };

  const handleCloseFromFull = () => {
    // X button in full mode: chiudi e vai a preview
    userInteractedRef.current = true;
    setUserManualOverride(true);
    setAiBarState("preview");
  };

  // Handle scroll position when expanding/collapsing
  useEffect(() => {
    if ((aiBarState === "expanded" || aiBarState === "full") && scrollContainerRef.current) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        if (shouldScrollToLastMessage && lastMessageRef.current && scrollContainerRef.current) {
          // Calculate position to align AI message top with container top
          const containerRect = scrollContainerRef.current.getBoundingClientRect();
          const messageRect = lastMessageRef.current.getBoundingClientRect();
          const scrollOffset = messageRect.top - containerRect.top + scrollContainerRef.current.scrollTop;
          
          // Add some padding to avoid the gradient overlay (32px for the spacer + gradient)
          scrollContainerRef.current.scrollTop = scrollOffset - 20;
          setShouldScrollToLastMessage(false); // Reset flag after scrolling
        } else if (!shouldScrollToLastMessage) {
          // Restore saved scroll position only if not auto-scrolling
          scrollContainerRef.current!.scrollTop = savedScrollPositionRef.current;
        }
      }, 100);
    }
  }, [aiBarState, shouldScrollToLastMessage]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      if (aiBarState === "full") {
        setAiBarState("expanded");
      } else {
        handleExpandedClose();
      }
    }
  };

  const handleShowLastAnswer = () => {
    setAiBarState("preview");
  };

  return (
    <div className="w-screen h-screen bg-white gap-2 flex">
      {/* Toast Notifications */}
      <Toast toasts={toasts} onRemove={removeToast} />
      
      <Navbar />

      {/* WORKSPACE Container - takes full space for generative UI */}
      <div 
        className="relative flex h-full w-full overflow-hidden"
        onClick={(aiBarState === "expanded" || aiBarState === "full") ? handleOverlayClick : undefined}
      >
        {/* UI History Navigation - Back/Forward buttons */}
        {/*(branches.get(currentBranch)?.length ?? 0) > 0 && (
          <div className="absolute top-4 right-4 z-40 flex items-center gap-2 bg-white shadow-md rounded-full px-3 py-2 border border-neutral-200">
            <button
              onClick={goBackInHistory}
              disabled={!canGoBack()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Go back in UI history"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            
            <span className="text-xs text-neutral-600 font-medium min-w-[60px] text-center">
              {isExploringHistory 
                ? `${currentUIIndex + 1}/${branches.get(currentBranch)?.length ?? 0}`
                : 'Live'
              }
            </span>
            
            <button
              onClick={goForwardInHistory}
              disabled={!canGoForward()}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-neutral-100 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              title="Go forward in UI history"
            >
              <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
            
            {/* Branch indicator */}
            {/*currentBranch !== 'main' && (
              <span className="text-xs text-orange-600 font-medium ml-2 px-2 py-1 bg-orange-50 rounded-full">
                {currentBranch}
              </span>
            )}
          </div>
        )*/}

        {/* Generative UI Area - occupies entire workspace */}
        <div className="absolute inset-0 overflow-auto p-8">
          {/* Updating overlay */}
          {isStreaming && currentResponseType === 'ui' && streamedUIContent && (
            <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-blue-500 text-white px-4 py-2 rounded-full shadow-lg flex items-center gap-2">
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="text-sm font-medium">Updating UI...</span>
            </div>
          )}
          
          {streamedUIContent && currentResponseType === 'ui' ? (
            <C1Renderer 
              content={streamedUIContent} 
              type={currentResponseType}
              streaming={isStreaming}
              onAction={handleC1Action}
            />
          ) : (
            <div className="flex items-center justify-center h-full text-neutral-400"></div>
          )}
        </div>

        {/* AI Response Bar - Unified Panel */}
        {aiBarState !== "hidden" && (
          <div className={`absolute z-50 transition-all duration-500 ${
            aiBarState === "full" 
              ? "inset-0" 
              : "left-1/2 -translate-x-1/2 w-full max-w-[calc(48rem+1rem)] px-8 " + (aiBarState === "expanded" ? "bottom-6" : "bottom-26")
          }`}>
            <div 
              {...(aiBarState === "preview" && {
                onClick: (e: React.MouseEvent) => {
                  e.stopPropagation();
                  handleBarClick();
                }
              })}
              onMouseEnter={handleBarMouseEnter}
              onMouseLeave={handleBarMouseLeave}
              className={`bg-white shadow-md border-2 border-neutral-100 backdrop-blur-sm transition-all duration-300 relative ${
                aiBarState === "full" 
                  ? "h-full w-full rounded-none shadow-2xl" 
                  : aiBarState === "expanded" 
                    ? "h-96 shadow-2xl rounded-[34px]" 
                    : "min-h-[52px] rounded-[34px]"
              } ${
                aiBarState === "preview" ? "cursor-pointer hover:shadow-lg" : ""
              }`}
            >
              {/* Expand/Collapse buttons - only in expanded and full modes */}
              {(aiBarState === "expanded" || aiBarState === "full") && currentResponseType === 'ui' && (
                <>
                  <button
                    onClick={handleToggleFull}
                    className="absolute top-4 left-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-neutral-100 transition-colors shadow-md border border-neutral-200"
                    title={aiBarState === "full" ? "Exit fullscreen" : "Fullscreen"}
                  >
                    {aiBarState === "full" ? (
                      <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 text-neutral-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={aiBarState === "full" ? handleCloseFromFull : handleExpandedClose}
                    className="absolute top-4 right-4 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-white hover:bg-neutral-100 transition-colors shadow-md border border-neutral-200"
                  >
                    <span className="text-neutral-600 text-xl">×</span>
                  </button>
                </>
              )}

              {/* Content */}
              <div 
                className={`${(aiBarState === "expanded" || aiBarState === "full") ? "h-full" : aiBarState === "button" ? "" : "px-6 py-3"}`}
              >
                {(aiBarState === "expanded" || aiBarState === "full") && <div className="h-8" />}
                <div 
                  ref={scrollContainerRef}
                  onScroll={handleScroll}
                  onMouseEnter={handleScrollMouseEnter}
                  onMouseLeave={handleScrollMouseLeave}
                  className={(aiBarState === "expanded" || aiBarState === "full") ? `overflow-y-auto ${aiBarState === "full" ? "px-64 pb-18" : "px-6 pb-12"} space-y-4 ai-panel-scroll ${scrollbarVisible ? 'scrollbar-visible' : 'scrollbar-hidden'}` : ""}
                  style={(aiBarState === "expanded" || aiBarState === "full") ? {
                    scrollbarWidth: 'thin',
                    scrollbarColor: '#d4d4d4 transparent',
                    height: 'calc(100% - 64px)'
                  } : undefined}
                >
                {(aiBarState === "expanded" || aiBarState === "full") ? (
                  <div className="absolute top-8 left-0 right-0 h-8 bg-linear-to-t from-transparent to-white pointer-events-none" />
                ) : null}
                {(aiBarState === "expanded" || aiBarState === "full") ? (
                  // Expanded/Full: Show full chat history
                  <>{chatHistory.length === 0 && <div className="text-center text-neutral-400 py-4">No messages yet</div>}
                  {chatHistory.map((message, index) => (
                    <div 
                      key={`msg-${message.id}`} 
                      className="space-y-3"
                    >
                      {/* User message */}
                      <div className="flex justify-end group">
                        <div className="relative">
                          <div className="bg-blue-500 text-white rounded-2xl px-4 py-2 max-w-md">
                            <p className="text-sm">{message.userMessage}</p>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 justify-end mt-1">
                            <span className="text-xs text-neutral-400">{formatTime(message.timestamp)}</span>
                            <button
                              onClick={() => handleCopyMessage(message.userMessage)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-neutral-100 rounded transition-colors"
                              title="Copy"
                            >
                              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                      
                      {/* AI response */}
                      <div 
                        className="flex justify-start group"
                        ref={index === chatHistory.length - 1 ? lastMessageRef : null}
                      >
                        <div className="prose prose-sm max-w-2xl text-sm text-neutral-800 leading-relaxed">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>
                            {message.aiResponse}
                          </ReactMarkdown>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-2 mt-1">
                            <span className="text-xs text-neutral-400">{formatTime(message.timestamp)}</span>
                            <button
                              onClick={() => handleCopyMessage(message.aiResponse)}
                              className="w-5 h-5 flex items-center justify-center hover:bg-neutral-100 rounded transition-colors"
                              title="Copy"
                            >
                              <svg className="w-3.5 h-3.5 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Show thinking message inline in full mode during processing */}
                  {isProcessing && aiBarState === "full" && (
                    <div className="flex justify-start">
                      <div className="flex items-center gap-3 bg-neutral-50 rounded-2xl px-4 py-3">
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                        <span className="text-sm text-neutral-500 ml-2">{thinkingMessage}</span>
                      </div>
                    </div>
                  )}
                  </>
                ) : aiBarState === "thinking" ? (
                  // Thinking state
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                    <span className="text-sm text-neutral-500 ml-2">{thinkingMessage}</span>
                  </div>
                ) : aiBarState === "preview" ? (
                  // Preview state - show last message from history if available
                  <div className="relative max-h-[72px] overflow-hidden prose prose-sm text-sm text-neutral-800 leading-relaxed line-clamp-3">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {chatHistory.length > 0 ? chatHistory[chatHistory.length - 1].aiResponse : currentAiResponse}
                    </ReactMarkdown>
                  </div>
                ) : null}
                </div>
              </div>

              {/* Bottom gradient fade - only show when needed */}
              {(aiBarState === "expanded" || aiBarState === "full") && (
                <div className="absolute bottom-0 left-0 right-0 h-24 bg-linear-to-t from-white to-transparent pointer-events-none rounded-b-[34px]" />
              )}
              {aiBarState === "preview" && currentAiResponse.length > 200 && (
                <div className="absolute bottom-0 left-0 right-0 h-6 bg-linear-to-t from-white to-transparent pointer-events-none rounded-b-[26px]" />
              )}
            </div>
          </div>
        )}

        {/* Action Confirmation Dialog - Inline Chat Style (Opzione B) */}
        {pendingAction && (
          <div className="absolute bottom-28 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-50">
            <div className="bg-white rounded-2xl shadow-2xl border-2 border-blue-200 p-6 space-y-4">
              <div className="flex items-start gap-3">
                <div className="shrink-0 w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-neutral-900 mb-1">Conferma operazione</h3>
                  <p className="text-sm text-neutral-700">{pendingAction.humanMessage}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3 justify-end">
                <button
                  onClick={cancelPendingAction}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Annulla
                </button>
                <button
                  onClick={confirmPendingAction}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 transition-colors"
                >
                  Conferma
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Floating Input Bar with Hot Zone - fixed position, overlays the UI */}
        <div 
          className={`absolute bottom-8 left-1/2 -translate-x-1/2 w-full max-w-3xl px-8 z-50 ${aiBarState === "hidden" && currentAiResponse ? 'group' : ''}`}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Hot zone extension above input bar */}
          {aiBarState === "hidden" && currentAiResponse && (
            <div className="h-28 -mb-16 pointer-events-auto" />
          )}
          
          {/* Show button on hover */}
          {aiBarState === "hidden" && currentAiResponse && (
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
              style={{ zIndex: 10 }}
            >
              <button
                onClick={handleShowLastAnswer}
                className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-lg border border-neutral-200 hover:bg-neutral-50 transition-colors pointer-events-auto"
              >
                <span className="text-sm text-neutral-700">▲</span>
              </button>
            </div>
          )}
          
          <div className={`p-0.5 bg-linear-to-bl from-blue-200 via-neutral-50 to-blue-200 rounded-full ${aiBarState === "expanded" ? 'shadow-none' : 'shadow-lg'}`}>
            <div className="flex items-center gap-3 bg-white rounded-full px-2 py-2 backdrop-blur-sm">
              <button className="w-9 h-9 rounded-full text-gray-600 hover:text-gray-700 text-3xl font-light transition-colors">
                +
              </button>
              <input
                type="text"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 outline-none text-base text-neutral-900 placeholder-neutral-400 bg-transparent"
              />
              <button 
                onClick={isProcessing ? handleStopProcessing : handleSendMessage}
                className={`w-9 h-9 rounded-full flex items-center cursor-pointer justify-center transition-all ${
                  isProcessing ? 'bg-blue-100' : inputValue ? 'bg-blue-500' : 'bg-blue-100'
                }`}
              >
                {isProcessing ? (
                  <div className="w-3.5 h-3.5 bg-blue-500 rounded-sm" />
                ) : (
                  <img 
                    src={inputValue ? "/icon-submit.svg" : "/icon-voice.svg"} 
                    alt={inputValue ? "Send" : "Voice"} 
                    className="w-4 h-4 object-contain transition-all" 
                  />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ChatPage() {
  return (
    <ProtectedRoute>
      <ChatPageContent />
    </ProtectedRoute>
  );
}
