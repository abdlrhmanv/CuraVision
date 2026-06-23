import { useState, useEffect } from 'react';
import { chatApi, ChatMessage } from '../lib/apiClient';

export function useChatbot(reportId: string | undefined) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) return;

    const fetchHistory = async () => {
      setLoading(true);
      try {
        const res = await chatApi.history(reportId);
        setSessionId(res.session_id);
        setMessages(res.messages);
      } catch (err) {
        setError(err instanceof Error ? err : new Error(String(err)));
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [reportId]);

  const sendMessage = async (message: string) => {
    if (!reportId) return;
    
    // Optimistically add user message
    const tempUserMsg: ChatMessage = {
      id: Date.now().toString(),
      sender: "PATIENT",
      message,
      created_at: new Date().toISOString()
    };
    
    setMessages(prev => [...prev, tempUserMsg]);
    setLoading(true);
    
    try {
      const res = await chatApi.send(reportId, message);
      
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: "BOT",
        message: res.reply,
        created_at: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, botMsg]);
      setSessionId(res.session_id);
    } catch (err) {
      setError(err instanceof Error ? err : new Error(String(err)));
    } finally {
      setLoading(false);
    }
  };

  return { messages, loading, error, sendMessage, sessionId };
}
