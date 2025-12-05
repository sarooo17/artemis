"use client";

import { useEffect, useRef, useState } from 'react';
import { C1Component, ThemeProvider } from '@thesysai/genui-sdk';

interface C1RendererProps {
  content: string;
  type: 'ui' | 'text';
  streaming?: boolean;
  onComplete?: () => void;
  onAction?: (event: {
    type?: string;
    params?: Record<string, any>;
    humanFriendlyMessage: string;
    llmFriendlyMessage: string;
  }) => void;
}

/**
 * C1 Renderer Component
 * Renders generative UI from Thesys C1 API
 */
export default function C1Renderer({
  content,
  type,
  streaming = false,
  onComplete,
  onAction,
}: C1RendererProps) {
  const [chunks, setChunks] = useState<string[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Handle C1 state updates (form inputs, toggles, etc.)
  const handleStateUpdate = async (updatedC1Response: string) => {
    console.log('💾 C1 state updated, persisting to database...');
    
    // TODO: Implement API call to save state
    // For now, just log it
    // In production, you'd call:
    // await api.post('/chat/update-ui-state', {
    //   sessionId: currentSessionId,
    //   uiContent: updatedC1Response,
    // });
    
    console.log('State snapshot saved (length:', updatedC1Response.length, 'chars)');
  };

  useEffect(() => {
    if (streaming) {
      // Progressive rendering for streaming
      setChunks((prev) => [...prev, content]);
    } else {
      // Full content render
      setChunks([content]);
    }
  }, [content, streaming]);

  useEffect(() => {
    if (!streaming && onComplete) {
      onComplete();
    }
  }, [streaming, onComplete]);

  if (type === 'text') {
    // Simple markdown-style rendering
    const formatText = (text: string) => {
      return text
        // Bold: **text** or __text__
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/__(.+?)__/g, '<strong>$1</strong>')
        // Italic: *text* or _text_
        .replace(/\*(.+?)\*/g, '<em>$1</em>')
        .replace(/_(.+?)_/g, '<em>$1</em>')
        // Bullet points: - item or * item
        .replace(/^[\-\*]\s+(.+)$/gm, '<li>$1</li>')
        // Numbered lists: 1. item
        .replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>')
        // Line breaks
        .replace(/\n/g, '<br />');
    };
    
    const formatted = formatText(content);
    // Wrap consecutive <li> in <ul>
    const withLists = formatted.replace(/(<li>.*?<\/li>(?:<br \/>)?)+/g, (match) => {
      return '<ul class="list-disc ml-6 my-2">' + match.replace(/<br \/>/g, '') + '</ul>';
    });
    
    return (
      <div className="prose prose-slate dark:prose-invert max-w-none">
        <div
          className="whitespace-pre-wrap text-slate-700 dark:text-slate-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: withLists }}
        />
      </div>
    );
  }

  // UI rendering with C1Component
  const fullContent = chunks.join('');
  
  // Extract JSON from <content thesys="true"> tag if present
  let c1Response = fullContent;
  const contentMatch = fullContent.match(/<content thesys="true">([\s\S]*?)<\/content>/);
  if (contentMatch && contentMatch[1]) {
    c1Response = contentMatch[1].trim();
  }

  return (
    <div ref={containerRef} className="c1-renderer c1-wrapper w-full h-full" suppressHydrationWarning>
      {c1Response ? (
        <ThemeProvider>
          <C1Component 
            c1Response={c1Response} 
            isStreaming={streaming}
            onAction={onAction}
          />
        </ThemeProvider>
      ) : (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
            <span>Generating UI...</span>
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * C1 Chat Component
 * Full chat interface with C1 streaming support
 */
interface C1ChatRendererProps {
  sessionId: string;
  onSendMessage: (message: string) => Promise<void>;
  initialMessages?: Array<{
    role: 'user' | 'assistant';
    content: string;
    type?: 'text' | 'ui';
  }>;
}

export function C1ChatRenderer({
  sessionId,
  onSendMessage,
  initialMessages = [],
}: C1ChatRendererProps) {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setIsLoading(true);

    // Add user message
    setMessages((prev) => [
      ...prev,
      {
        role: 'user',
        content: userMessage,
        type: 'text',
      },
    ]);

    try {
      await onSendMessage(userMessage);
    } catch (error) {
      console.error('Send message error:', error);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, an error occurred. Please try again.',
          type: 'text',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div
            key={index}
            className={`flex ${
              message.role === 'user' ? 'justify-end' : 'justify-start'
            }`}
          >
            <div
              className={`max-w-[80%] rounded-lg p-4 ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-slate-100 dark:bg-slate-800'
              }`}
            >
              {message.role === 'assistant' ? (
                <C1Renderer
                  content={message.content}
                  type={message.type || 'text'}
                />
              ) : (
                <p className="whitespace-pre-wrap">{message.content}</p>
              )}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-slate-100 dark:bg-slate-800 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.2s]" />
                <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:0.4s]" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-slate-200 dark:border-slate-700 p-4">
        <div className="flex space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder="Ask about your data..."
            className="flex-1 px-4 py-2 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100"
            disabled={isLoading}
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}
