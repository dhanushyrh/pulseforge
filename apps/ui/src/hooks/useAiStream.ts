import { useState, useCallback, useRef } from 'react';
import type { SseEvent, UsageStats } from '../types';

interface Message {
  role:    'user' | 'assistant';
  content: string;
}

interface AiStreamState {
  messages:        Message[];
  isStreaming:     boolean;
  limitError:      Extract<SseEvent, { type: 'error' }> | null;
  warningMessage:  string | null;
  usageStats:      UsageStats | null;
  isDegraded:      boolean;
  degradedModel:   string | null;
}

export function useAiStream(conversationId: string) {
  const [state, setState] = useState<AiStreamState>({
    messages:       [],
    isStreaming:    false,
    limitError:     null,
    warningMessage: null,
    usageStats:     null,
    isDegraded:     false,
    degradedModel:  null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string, tripId?: string, mode: 'chat' | 'generate' = 'chat') => {
      if (state.isStreaming) return;

      setState(s => ({
        ...s,
        isStreaming:  true,
        limitError:   null,
        messages: [...s.messages, { role: 'user', content }],
      }));

      abortRef.current = new AbortController();
      const token = localStorage.getItem('pf_access_token');

      let assistantText = '';

      try {
        const response = await fetch(`/v1/ai/conversations/${conversationId}/message`, {
          method: 'POST',
          signal: abortRef.current.signal,
          headers: {
            'Content-Type':  'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: JSON.stringify({ message: content, tripId, mode }),
        });

        if (!response.ok || !response.body) {
          throw new Error(`HTTP ${response.status}`);
        }

        // Append placeholder for streaming assistant message
        setState(s => ({
          ...s,
          messages: [...s.messages, { role: 'assistant', content: '' }],
        }));

        const reader  = response.body.getReader();
        const decoder = new TextDecoder();
        let   buffer  = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            let event: SseEvent;
            try {
              event = JSON.parse(line.slice(6)) as SseEvent;
            } catch {
              continue;
            }

            if (event.type === 'text') {
              assistantText += event.delta;
              setState(s => {
                const msgs = [...s.messages];
                msgs[msgs.length - 1] = { role: 'assistant', content: assistantText };
                return { ...s, messages: msgs };
              });
            } else if (event.type === 'error') {
              setState(s => ({ ...s, limitError: event as Extract<SseEvent, { type: 'error' }> }));
            } else if (event.type === 'warning') {
              setState(s => ({ ...s, warningMessage: event.message }));
            } else if (event.type === 'usage_update') {
              setState(s => ({ ...s, usageStats: event.data }));
            } else if (event.type === 'model_degraded') {
              setState(s => ({ ...s, isDegraded: true, degradedModel: event.model }));
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setState(s => ({
          ...s,
          limitError: { type: 'error', code: 'network_error', message: 'Network error — please try again.' },
        }));
      } finally {
        setState(s => ({ ...s, isStreaming: false }));
      }
    },
    [conversationId, state.isStreaming],
  );

  const clearLimitError = useCallback(() => {
    setState(s => ({ ...s, limitError: null }));
  }, []);

  const clearWarning = useCallback(() => {
    setState(s => ({ ...s, warningMessage: null }));
  }, []);

  const clearDegraded = useCallback(() => {
    setState(s => ({ ...s, isDegraded: false, degradedModel: null }));
  }, []);

  const abort = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  return { ...state, sendMessage, clearLimitError, clearWarning, clearDegraded, abort };
}
