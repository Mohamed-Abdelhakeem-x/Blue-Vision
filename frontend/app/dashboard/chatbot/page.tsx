"use client";

import { useState, useRef, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Send, Bot, User, AlertCircle, Loader2, Plus, MessageSquare, Trash2 } from "lucide-react";
import { getStoredAccessToken, askChatbot, getChatSessions, getChatMessages, deleteChatSession } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";
import { type DashboardNavItem } from "@/components/dashboard/dashboard-sidebar";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

type Session = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export default function ChatbotPage() {
  const t = useTranslations("chat");
  const navItems: DashboardNavItem[] = [];
  
  const welcomeMsg: Message = {
    id: "welcome",
    role: "assistant",
    content: t("subtitle") || "Ask questions about fish health, disease treatment, and aquaculture practices. I'll respond in your language."
  };

  const [sessions, setSessions] = useState<Session[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSessionsLoading, setIsSessionsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  useEffect(() => {
    const fetchSessions = async () => {
      try {
        const token = getStoredAccessToken();
        if (!token) return;
        const data = await getChatSessions(token);
        setSessions(data);
      } catch (err) {
        console.error("Failed to fetch sessions", err);
      } finally {
        setIsSessionsLoading(false);
      }
    };
    fetchSessions();
  }, []);

  const handleSelectSession = async (sessionId: string) => {
    if (sessionId === currentSessionId) return;
    setCurrentSessionId(sessionId);
    setMessages([]);
    setIsLoading(true);
    setError(null);
    try {
      const token = getStoredAccessToken();
      if (!token) throw new Error("Authentication required");
      const data = await getChatMessages({ token, sessionId });
      if (data.length === 0) {
        setMessages([welcomeMsg]);
      } else {
        setMessages(data as Message[]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load messages.");
      setMessages([welcomeMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewChat = () => {
    setCurrentSessionId(null);
    setMessages([welcomeMsg]);
    setError(null);
    setInput("");
  };

  const handleDeleteSession = async (e: React.MouseEvent, sessionId: string) => {
    e.stopPropagation();
    try {
      const token = getStoredAccessToken();
      if (!token) return;
      await deleteChatSession({ token, sessionId });
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      if (currentSessionId === sessionId) {
        handleNewChat();
      }
    } catch (err) {
      console.error("Failed to delete session", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", content: input.trim() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const token = getStoredAccessToken();
      if (!token) throw new Error("Authentication required");

      const res = await askChatbot({ 
        token, 
        question: userMsg.content,
        sessionId: currentSessionId || undefined
      });
      
      const botMsg: Message = { id: (Date.now() + 1).toString(), role: "assistant", content: res.answer };
      setMessages(prev => [...prev, botMsg]);
      
      if (!currentSessionId) {
        setCurrentSessionId(res.session_id);
        const data = await getChatSessions(token);
        setSessions(data);
      }
    } catch (err: any) {
      setError(err.message || t("error") || "Failed to get an answer.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <DashboardShell
      navItems={navItems}
      activeSection="chatbot"
      topBarLead={
        <div className="inline-flex items-center gap-2 rounded-full border border-blue-600/20 bg-blue-600/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-blue-700 dark:text-blue-300">
          <Bot className="h-3.5 w-3.5" />
          {t("title") || "BlueVision Assistant"}
        </div>
      }
      contentClassName="overflow-hidden"
    >
      <div className="flex h-full flex-col lg:flex-row gap-4 overflow-hidden">
        {/* Sidebar */}
        <section className="flex w-full lg:w-72 flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,0.94))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))]">
          <Button 
            onClick={handleNewChat}
            className="w-full rounded-2xl bg-blue-600 text-white hover:bg-blue-700 shadow-sm shrink-0 flex items-center justify-center gap-2"
          >
            <Plus className="h-4 w-4" />
            New Chat
          </Button>
          
          <div className="flex-1 overflow-y-auto space-y-2 pr-2">
            {isSessionsLoading ? (
              <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-blue-600" /></div>
            ) : sessions.length === 0 ? (
              <div className="text-center text-sm text-[var(--text-tertiary)] p-4">No past chats</div>
            ) : (
              sessions.map(session => (
                <div key={session.id} className="relative group">
                  <button
                    onClick={() => handleSelectSession(session.id)}
                    className={`w-full text-left p-3 rounded-xl flex items-start gap-3 transition-colors pr-10 ${
                      currentSessionId === session.id 
                        ? "bg-blue-600/10 text-blue-700 dark:text-blue-300 border border-blue-600/20" 
                        : "hover:bg-[var(--card-bg)] text-[var(--text-secondary)] border border-transparent"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 mt-0.5 shrink-0" />
                    <div className="overflow-hidden">
                      <div className="text-sm font-medium truncate">{session.title}</div>
                      <div className="text-xs opacity-70 mt-1">{new Date(session.updated_at).toLocaleDateString()}</div>
                    </div>
                  </button>
                  <button
                    onClick={(e) => handleDeleteSession(e, session.id)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-lg text-red-500 opacity-0 group-hover:opacity-100 hover:bg-red-500/10 transition-all focus:opacity-100"
                    title="Delete Chat"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* Chat Area */}
        <section className="flex flex-1 flex-col gap-4 overflow-hidden rounded-[1.75rem] border border-[var(--card-border)] bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(244,247,245,0.94))] p-4 shadow-[0_24px_60px_rgba(15,23,42,0.08)] dark:bg-[linear-gradient(180deg,rgba(24,24,27,0.96),rgba(39,39,42,0.92))] md:p-8">
          <div className="flex items-center gap-3 border-b border-[var(--card-border)] pb-4 shrink-0">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
              <Bot className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">{t("title") || "BlueVision Assistant"}</h1>
              <p className="text-sm text-[var(--text-tertiary)]">{t("online") || "Always online"}</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto rounded-2xl border border-[var(--card-border)] bg-[var(--card-bg)] p-4 shadow-sm relative">
            <div className="space-y-6 pb-2">
              {messages.map(msg => (
                <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>
                  <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${msg.role === "user" ? "bg-[var(--text-primary)] text-[var(--bg-primary)]" : "bg-blue-600/10 text-blue-600"}`}>
                    {msg.role === "user" ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
                  </div>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-blue-600 text-white shadow-md rounded-tr-none" : "bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-tl-none whitespace-pre-wrap"}`}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3 flex-row">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed bg-[var(--bg-secondary)] text-[var(--text-primary)] border border-[var(--card-border)] rounded-tl-none flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-[var(--text-secondary)]">{t("sending") || "Thinking..."}</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3 text-sm text-red-500">
              <AlertCircle className="h-4 w-4" />
              <p>{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder={t("inputPlaceholder") || "Ask a question about your fish..."}
              className="flex-1 rounded-2xl border border-[var(--card-border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] shadow-sm transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              disabled={isLoading}
            />
            <Button 
              type="submit" 
              disabled={isLoading || !input.trim()}
              className="rounded-2xl h-full px-6 bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
              <span className="hidden sm:inline">{t("send") || "Send"}</span>
            </Button>
          </form>
        </section>
      </div>
    </DashboardShell>
  );
}
