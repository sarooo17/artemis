import { useState, useCallback, useRef } from 'react';
import { api } from '@/lib/api';

interface StreamChunk {
  type: 'thinking' | 'tool_call' | 'data' | 'ui_chunk' | 'text' | 'session' | 'done' | 'error';
  content?: any;
  sessionId?: string;
  error?: string;
}

interface UseOrchestrationOptions {
  sessionId?: string;
  onSessionCreated?: (sessionId: string) => void;
  onToolCall?: (toolCall: { name: string; arguments: any }) => void;
  onData?: (data: any) => void;
  onComplete?: () => void;
}

export function useOrchestration(options: UseOrchestrationOptions = {}) {
  const [isLoading, setIsLoading] = useState(false);
  const [thinking, setThinking] = useState<string | null>(null);
  const [currentResponse, setCurrentResponse] = useState('');
  const [responseType, setResponseType] = useState<'text' | 'ui'>('text');
  const [toolCalls, setToolCalls] = useState<any[]>([]);
  const [sessionId, setSessionId] = useState(options.sessionId);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (message: string) => {
      if (isLoading) return;

      setIsLoading(true);
      setThinking(null);
      setCurrentResponse('');
      setToolCalls([]);
      
      // Create abort controller
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetch(api.chat.orchestrateStream, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            message,
            sessionId,
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        if (!response.body) {
          throw new Error('No response body');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (!line.trim() || !line.startsWith('data: ')) continue;

            const data = line.slice(6); // Remove 'data: ' prefix
            
            try {
              const chunk: StreamChunk = JSON.parse(data);

              switch (chunk.type) {
                case 'session':
                  if (chunk.sessionId) {
                    setSessionId(chunk.sessionId);
                    options.onSessionCreated?.(chunk.sessionId);
                  }
                  break;

                case 'thinking':
                  setThinking(chunk.content);
                  break;

                case 'tool_call':
                  setToolCalls((prev) => [...prev, chunk.content]);
                  options.onToolCall?.(chunk.content);
                  break;

                case 'data':
                  options.onData?.(chunk.content);
                  break;

                case 'ui_chunk':
                  setResponseType('ui');
                  setCurrentResponse((prev) => prev + JSON.stringify(chunk.content));
                  break;

                case 'text':
                  setResponseType('text');
                  setCurrentResponse(chunk.content);
                  break;

                case 'done':
                  setIsLoading(false);
                  setThinking(null);
                  options.onComplete?.();
                  break;

                case 'error':
                  console.error('Stream error:', chunk.error);
                  setIsLoading(false);
                  setThinking(null);
                  throw new Error(chunk.error);
              }
            } catch (parseError) {
              console.error('Failed to parse SSE data:', parseError);
            }
          }
        }
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Orchestration error:', error);
          setIsLoading(false);
          setThinking(null);
          throw error;
        }
      }
    },
    [isLoading, sessionId, options]
  );

  const cancelRequest = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      setIsLoading(false);
      setThinking(null);
    }
  }, []);

  return {
    sendMessage,
    cancelRequest,
    isLoading,
    thinking,
    currentResponse,
    responseType,
    toolCalls,
    sessionId,
  };
}

/**
 * Non-streaming version for simple requests
 */
export async function orchestrate(message: string, sessionId?: string) {
  const response = await fetch(api.chat.orchestrate, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      message,
      sessionId,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Orchestration failed');
  }

  return await response.json();
}
