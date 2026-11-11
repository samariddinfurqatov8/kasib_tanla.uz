import React, { useEffect, useRef, useState } from 'react';
import { MessageSquareText, Send, Trash2 } from 'lucide-react';
import { AppShell } from '../components/Layout.tsx';
import { useApp } from '../context/AppContext.tsx';
import { apiFetch, ApiError } from '../lib/api.ts';
import type { AdvisorMessage } from '../types/index.ts';

export function AdvisorPage() {
  const { language, t } = useApp();
  const [messages, setMessages] = useState<AdvisorMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const res = await apiFetch<{ messages: AdvisorMessage[] }>('/api/advisor/messages');
        if (active) setMessages(res.messages ?? []);
      } catch (err) {
        if (active) {
          setError(err instanceof Error ? err.message : 'Suhbat tarixini yuklab bo‘lmadi.');
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, sending]);

  const sendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (trimmed.length < 2 || sending) return;

    setError(null);
    setSending(true);
    setInput('');

    const optimisticUser: AdvisorMessage = {
      id: Date.now(),
      userId: 0,
      role: 'user',
      content: trimmed,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await apiFetch<{ reply: string }>('/api/advisor/chat', {
        method: 'POST',
        body: JSON.stringify({ message: trimmed, language }),
      });

      const assistantMsg: AdvisorMessage = {
        id: Date.now() + 1,
        userId: 0,
        role: 'assistant',
        content: res.reply,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err) {
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
      setInput(trimmed);
      setError(
        err instanceof ApiError
          ? err.message
          : 'AI maslahatchi bilan bog‘lanishda xatolik yuz berdi.'
      );
    } finally {
      setSending(false);
    }
  };

  const handleClear = async () => {
    try {
      await apiFetch('/api/advisor/messages', { method: 'DELETE' });
      setMessages([]);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tozalashda xatolik.');
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void sendMessage(input);
  };

  return (
    <AppShell
      breadcrumb={t.nav.advisor}
      actionButton={
        messages.length > 0 ? (
          <button
            type="button"
            onClick={() => void handleClear()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>{t.advisor.clearChat}</span>
          </button>
        ) : undefined
      }
    >
      <div className="max-w-4xl mx-auto flex flex-col gap-5">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight">
            {t.advisor.title}
          </h1>
          <p className="text-sm sm:text-base mt-1" style={{ color: 'var(--text-secondary)' }}>
            {t.advisor.subtitle}
          </p>
        </div>

        {error && (
          <div
            className="p-4 rounded-xl border text-sm leading-relaxed"
            style={{
              backgroundColor: 'rgba(245, 158, 11, 0.1)',
              borderColor: 'rgba(245, 158, 11, 0.35)',
              color: '#FBBF24',
            }}
          >
            {error}
          </div>
        )}

        {/* Chat Container */}
        <div
          className="rounded-xl border flex flex-col min-h-[460px] max-h-[65vh]"
          style={{
            backgroundColor: 'var(--bg-card)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-4">
            {loading ? (
              <div
                className="h-32 rounded-lg animate-pulse"
                style={{ backgroundColor: 'var(--bg-elevated)' }}
              />
            ) : messages.length === 0 ? (
              <div className="py-6 space-y-6 max-w-2xl mx-auto text-center">
                <MessageSquareText
                  className="w-10 h-10 mx-auto"
                  style={{ color: 'var(--accent-cyan)' }}
                />
                <div>
                  <h2 className="font-display text-lg font-semibold mb-2">
                    {t.advisor.emptyTitle}
                  </h2>
                  <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                    {t.advisor.emptyDesc}
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-left">
                  {t.advisor.prompts.map((promptText) => (
                    <button
                      key={promptText}
                      type="button"
                      disabled={sending}
                      onClick={() => void sendMessage(promptText)}
                      className="p-3.5 rounded-lg border text-xs sm:text-sm font-medium transition-colors cursor-pointer hover:border-[#2878FF]"
                      style={{
                        backgroundColor: 'var(--bg-secondary)',
                        borderColor: 'var(--border-subtle)',
                        color: 'var(--text-main)',
                      }}
                    >
                      {promptText}
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className="max-w-[85%] rounded-xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap border"
                      style={{
                        backgroundColor: isUser
                          ? 'var(--accent-blue)'
                          : 'var(--bg-secondary)',
                        borderColor: isUser
                          ? 'var(--accent-blue)'
                          : 'var(--border-subtle)',
                        color: isUser ? '#FFFFFF' : 'var(--text-main)',
                      }}
                    >
                      {msg.content}
                    </div>
                  </div>
                );
              })
            )}

            {sending && (
              <div className="flex justify-start">
                <div
                  className="rounded-xl px-4 py-3 text-sm border"
                  style={{
                    backgroundColor: 'var(--bg-secondary)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  {t.advisor.thinking}
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form
            onSubmit={handleSubmit}
            className="p-4 border-t flex items-center gap-3"
            style={{ borderColor: 'var(--border-subtle)' }}
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.advisor.placeholder}
              disabled={sending}
              className="flex-1 px-4 py-2.5 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-[#2878FF]"
              style={{
                backgroundColor: 'var(--bg-main)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-main)',
              }}
            />
            <button
              type="submit"
              disabled={sending || input.trim().length < 2}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-45"
              style={{ backgroundColor: 'var(--accent-blue)' }}
            >
              <Send className="w-4 h-4" />
              <span>{t.advisor.sendBtn}</span>
            </button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
