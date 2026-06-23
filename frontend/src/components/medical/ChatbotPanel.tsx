import React, { useState, useRef, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../ui/Card';
import { Button } from '../ui/Button';
import { useChatbot } from '../../hooks/useChatbot';
import { Send } from 'lucide-react';

interface ChatbotPanelProps {
  reportId?: string;
}

export function ChatbotPanel({ reportId }: ChatbotPanelProps) {
  const { messages, loading, sendMessage, error } = useChatbot(reportId);
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    
    const userMsg = input;
    setInput('');
    await sendMessage(userMsg);
  };

  if (!reportId) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-gray-500">
          No report selected.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col h-[600px]">
      <CardHeader className="border-b pb-4">
        <CardTitle>AI Assistant</CardTitle>
        <p className="text-xs text-gray-500">Ask questions about your scan and report</p>
      </CardHeader>
      <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-sm text-gray-500 mt-10">
            Hello! I&apos;m here to help you understand your medical report. Ask me anything.
          </div>
        ) : (
          messages.map((msg, idx) => (
            <div key={idx} className={`flex ${msg.sender === 'PATIENT' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[80%] rounded-lg p-3 text-sm ${
                msg.sender === 'PATIENT' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'
              }`}>
                {msg.message}
              </div>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] rounded-lg p-3 text-sm bg-gray-100 text-gray-800 flex items-center space-x-2">
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce"></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.2s' }}></span>
              <span className="w-2 h-2 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: '0.4s' }}></span>
            </div>
          </div>
        )}
        {error && (
          <div className="text-red-500 text-xs text-center">Failed to send message. Please try again.</div>
        )}
        <div ref={messagesEndRef} />
      </CardContent>
      <div className="p-4 border-t">
        <form onSubmit={handleSubmit} className="flex space-x-2">
          <input
            type="text"
            className="flex-1 border rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500"
            placeholder="Type your question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
          />
          <Button type="submit" disabled={!input.trim() || loading} size="sm">
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </Card>
  );
}
