import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  MessageSquare,
  X,
  Send,
  RotateCcw,
  Sparkles,
  ExternalLink,
  Loader2,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { sendAssistantChatMessage, AssistantChatMessage } from '../../services/api';

const SUGGESTED_PROMPTS = [
  'What does Procura AI do?',
  'How does SpendGuard work?',
  'How does purchase approval work?',
  'How does PayPal Sandbox checkout work?',
];

const INITIAL_MESSAGE: AssistantChatMessage = {
  role: 'assistant',
  content:
    "Hello! I'm your **Procura AI Assistant**.\n\nI can help you understand our automated procurement intelligence, SpendGuard policy guardrails, stakeholder approval workflows, and PayPal Sandbox demo.\n\nWhat would you like to explore?",
};

export const FloatingChatbot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<AssistantChatMessage[]>([INITIAL_MESSAGE]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);
  const launcherRef = useRef<HTMLButtonElement | null>(null);

  // Auto-scroll to bottom of chat when new messages appear
  const scrollToBottom = useCallback((smooth = true) => {
    messagesEndRef.current?.scrollIntoView({
      behavior: smooth ? 'smooth' : 'auto',
      block: 'nearest',
    });
  }, []);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom(false);
      // Auto focus input when opened only on desktop (on mobile, focusing triggers virtual keyboard immediately and obscures conversation)
      if (typeof window !== 'undefined' && window.innerWidth >= 640) {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  }, [isOpen, scrollToBottom]);

  useEffect(() => {
    if (messages.length > 1) {
      scrollToBottom(true);
    }
  }, [messages, isLoading, scrollToBottom]);

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
        launcherRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  const handleSend = async (messageText?: string) => {
    const textToSend = (messageText ?? inputValue).trim();
    if (!textToSend || isLoading) return;

    setErrorMessage(null);
    setInputValue('');

    const newHistory: AssistantChatMessage[] = [
      ...messages,
      { role: 'user', content: textToSend },
    ];

    setMessages(newHistory);
    setIsLoading(true);

    try {
      const response = await sendAssistantChatMessage({
        message: textToSend,
        history: newHistory.slice(1, -1), // skip initial welcome message and latest user message
      });

      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: response.reply },
      ]);
    } catch (err) {
      const errText = err instanceof Error ? err.message : 'Unable to connect to assistant';
      setErrorMessage(errText);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content:
            "I ran into a temporary connection issue. Don't worry—you can try asking again or check our documentation in the workspace.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleReset = () => {
    setMessages([INITIAL_MESSAGE]);
    setInputValue('');
    setErrorMessage(null);
    inputRef.current?.focus();
  };

  // Helper to render markdown bolding and bullet lists cleanly
  const renderMessageContent = (content: string) => {
    const lines = content.split('\n');

    return (
      <div className="space-y-1.5">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1" />;
          }

          // Bullet points
          if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
            const bulletText = line.trim().replace(/^[-*]\s+/, '');
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-[#2457E6] font-bold text-xs mt-0.5">•</span>
                <span className="flex-1">{formatInlineMarkdown(bulletText)}</span>
              </div>
            );
          }

          // Numbered items (1. 2. etc)
          const numMatch = line.trim().match(/^(\d+)\.\s+(.*)$/);
          if (numMatch) {
            return (
              <div key={idx} className="flex items-start gap-1.5 ml-1">
                <span className="text-[#2457E6] font-mono font-bold text-xs mt-0.5">
                  {numMatch[1]}.
                </span>
                <span className="flex-1">{formatInlineMarkdown(numMatch[2] ?? '')}</span>
              </div>
            );
          }

          return <p key={idx}>{formatInlineMarkdown(line)}</p>;
        })}
      </div>
    );
  };

  const formatInlineMarkdown = (text: string) => {
    // Parse **bold** and `code`
    const parts = text.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return (
          <strong key={index} className="font-bold text-[#111827]">
            {part.slice(2, -2)}
          </strong>
        );
      }
      if (part.startsWith('`') && part.endsWith('`')) {
        return (
          <code
            key={index}
            className="px-1 py-0.5 rounded bg-[#E6EEFE] text-[#2457E6] font-mono text-[11px] font-semibold border border-[#2457E6]/30"
          >
            {part.slice(1, -1)}
          </code>
        );
      }
      return part;
    });
  };

  return (
    <>
      {/* Floating Chat Launcher Button */}
      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-[60] flex items-center">
        <button
          ref={launcherRef}
          onClick={() => setIsOpen((prev) => !prev)}
          className={`size-14 rounded-2xl bg-[#2457E6] text-white border-2 border-[#111827] shadow-[4px_4px_0px_#111827] hover:shadow-[5px_5px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 active:shadow-[2px_2px_0px_#111827] transition-all flex items-center justify-center cursor-pointer touch-manipulation select-none focus:outline-none focus:ring-2 focus:ring-[#2457E6] focus:ring-offset-2 ${
            isOpen ? 'rotate-90' : 'rotate-0'
          }`}
          aria-label={isOpen ? 'Close Procura AI assistant' : 'Open Procura AI assistant'}
          title={isOpen ? 'Close Assistant' : 'Open Assistant'}
        >
          {isOpen ? (
            <X className="size-6 text-white" />
          ) : (
            <div className="relative">
              <MessageSquare className="size-6 text-white" />
              <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-emerald-400 border border-[#111827]" />
            </div>
          )}
        </button>
      </div>

      {/* Chat Window Panel */}
      {isOpen && (
        <section
          role="dialog"
          aria-label="Procura AI Assistant chat window"
          className="fixed bottom-20 left-3 right-3 sm:left-auto sm:right-6 sm:bottom-24 z-[60] sm:w-[410px] max-w-[calc(100vw-1.5rem)] h-[520px] max-h-[calc(100dvh-5.5rem)] sm:max-h-[82vh] bg-white border-2 border-[#111827] rounded-2xl shadow-[6px_6px_0px_#111827] flex flex-col overflow-hidden transition-all duration-200"
        >
          {/* Header */}
          <header className="bg-[#111827] text-white p-3.5 border-b-2 border-[#111827] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="size-9 rounded-xl bg-white border border-white/20 flex items-center justify-center p-1 shadow-[2px_2px_0px_rgba(0,0,0,0.4)] overflow-hidden">
                <img src="/procura-icon.png" alt="Procura AI Assistant" className="size-full object-contain" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-bold text-sm text-white leading-none">
                    Procura AI Assistant
                  </h3>
                  <span className="inline-flex items-center gap-1 font-mono text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 mt-1 font-sans">
                  Your guide to smarter purchasing
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={handleReset}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Restart conversation"
                aria-label="Restart conversation"
              >
                <RotateCcw className="size-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
                title="Close chat"
                aria-label="Close chat"
              >
                <X className="size-4" />
              </button>
            </div>
          </header>

          {/* Quick Notice Banner */}
          <div className="bg-[#E6EEFE] border-b border-[#2457E6]/20 px-3.5 py-1.5 flex items-center justify-between text-[11px] font-mono text-[#2457E6] shrink-0 font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="size-3.5 text-[#2457E6]" />
              SpendGuard & PayPal Demo Verified
            </span>
            <a
              href="/app"
              className="flex items-center gap-1 font-bold hover:underline"
              title="Open Workspace"
            >
              <span>Workspace</span>
              <ExternalLink className="size-3" />
            </a>
          </div>

          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-[#F8FAFC]">
            {messages.map((msg, index) => {
              const isUser = msg.role === 'user';

              return (
                <div
                  key={index}
                  className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                >
                  <div className="flex items-center gap-1 mb-1 px-1">
                    <span className="font-mono text-[10px] uppercase font-bold text-slate-400">
                      {isUser ? 'You' : 'Procura AI'}
                    </span>
                  </div>

                  <div
                    className={`max-w-[88%] text-xs sm:text-[13px] leading-relaxed p-3.5 ${
                      isUser
                        ? 'bg-[#2457E6] text-white rounded-2xl rounded-tr-none border-2 border-[#111827] shadow-[2px_2px_0px_#111827]'
                        : 'bg-white text-[#111827] rounded-2xl rounded-tl-none border-2 border-[#111827] shadow-[3px_3px_0px_#111827]'
                    }`}
                  >
                    {isUser ? (
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    ) : (
                      renderMessageContent(msg.content)
                    )}
                  </div>
                </div>
              );
            })}

            {/* Suggested Prompts (visible when few messages) */}
            {messages.length <= 2 && (
              <div className="pt-2 pb-1 space-y-1.5">
                <p className="font-mono text-[10px] uppercase font-bold text-slate-500 flex items-center gap-1">
                  <Sparkles className="size-3 text-[#2457E6]" />
                  Suggested questions:
                </p>
                <div className="flex flex-col gap-1.5">
                  {SUGGESTED_PROMPTS.map((prompt, idx) => (
                    <button
                      key={idx}
                      disabled={isLoading}
                      onClick={() => handleSend(prompt)}
                      className="text-left text-xs bg-white hover:bg-[#E6EEFE] text-[#111827] hover:text-[#2457E6] px-3 py-2 rounded-xl border border-[#111827]/20 hover:border-[#2457E6] shadow-sm transition-all flex items-center justify-between group cursor-pointer touch-manipulation disabled:opacity-50"
                    >
                      <span className="font-medium">{prompt}</span>
                      <ChevronRight className="size-3 text-slate-400 group-hover:text-[#2457E6] transition-transform group-hover:translate-x-0.5" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {isLoading && (
              <div className="flex flex-col items-start">
                <span className="font-mono text-[10px] uppercase font-bold text-slate-400 mb-1 px-1">
                  Procura AI
                </span>
                <div className="bg-white border-2 border-[#111827] rounded-2xl rounded-tl-none px-4 py-3 shadow-[3px_3px_0px_#111827] flex items-center gap-2">
                  <Loader2 className="size-4 text-[#2457E6] animate-spin" />
                  <span className="text-xs text-slate-500 font-mono font-medium">
                    Formulating response...
                  </span>
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-2.5 rounded-lg bg-red-50 border border-red-200 text-red-600 text-[11px] font-mono">
                {errorMessage}
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Footer Input Area */}
          <footer className="p-3 bg-white border-t-2 border-[#111827] shrink-0">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <textarea
                ref={inputRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Ask about SpendGuard, approvals, demo..."
                rows={1}
                disabled={isLoading}
                className="flex-1 resize-none bg-slate-50 border-2 border-[#111827] rounded-xl px-3 py-2 text-xs sm:text-sm text-[#111827] placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#2457E6] transition-colors max-h-24 disabled:opacity-50"
              />

              <button
                type="submit"
                disabled={!inputValue.trim() || isLoading}
                className="size-9 rounded-xl bg-[#2457E6] text-white border-2 border-[#111827] shadow-[2px_2px_0px_#111827] hover:shadow-[3px_3px_0px_#111827] hover:-translate-x-0.5 hover:-translate-y-0.5 active:translate-x-0.5 active:translate-y-0.5 disabled:opacity-40 disabled:pointer-events-none transition-all flex items-center justify-center shrink-0 cursor-pointer touch-manipulation"
                aria-label="Send message"
              >
                <Send className="size-4" />
              </button>
            </form>

            <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mt-1.5 px-0.5">
              <span>Enter to send • Shift+Enter for newline</span>
              <span className="hidden sm:inline text-[#2457E6] font-semibold">
                Grounded in Procura AI
              </span>
            </div>
          </footer>
        </section>
      )}
    </>
  );
};

export default FloatingChatbot;
