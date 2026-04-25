"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslations, useLocale } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Bot, X, Send, Loader } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getApiUrl } from "@/lib/platform";

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

interface ScanContext {
  disease_name?: string;
  confidence?: number;
}

interface AgriBotWidgetProps {
  scanContext?: ScanContext;
  position?: "bottom-right" | "bottom-left";
}

export function AgriBotWidget({
  scanContext,
  position = "bottom-right",
}: AgriBotWidgetProps) {
  const t = useTranslations("chat");
  const locale = useLocale();
  const isRTL = locale === "ar";
  const chatStreamUrl = `${getApiUrl()}/chat/stream`;

  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatChatError = (err: unknown): string => {
    if (err instanceof DOMException && err.name === "AbortError") {
      return "The assistant took too long to respond. Please try a shorter question.";
    }
    if (err instanceof Error) {
      const lower = err.message.toLowerCase();
      if (lower.includes("failed to fetch") || lower.includes("network")) {
        return "Unable to reach chat service right now. Please try again in a few seconds.";
      }
      return err.message;
    }
    return "Unable to reach chat service right now. Please try again in a few seconds.";
  };

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Focus input when opening
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 65000);
      const response = await fetch(chatStreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "text/event-stream",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage.content,
          scan_context: scanContext || null,
        }),
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        content: "",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const data = line.slice(6).trimEnd();
            if (data && data !== "[DONE]") {
              setMessages((prev) => {
                const updated = [...prev];
                const lastMsg = updated[updated.length - 1];
                if (lastMsg && lastMsg.sender === "assistant") {
                  lastMsg.content += data;
                }
                return updated;
              });
            }
          }
        }
      }

      setIsLoading(false);
    } catch (err) {
      const errorMessage = formatChatError(err);
      setError(errorMessage);
      setIsLoading(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "assistant" && last.content.length === 0) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const positionClasses = {
    "bottom-right": "bottom-3 right-3 sm:bottom-6 sm:right-6",
    "bottom-left": "bottom-3 left-3 sm:bottom-6 sm:left-6",
  };

  const alignmentClasses = {
    "bottom-right": "items-end",
    "bottom-left": "items-start",
  };

  const widget = (
    <div
      className={`fixed ${positionClasses[position]} z-50 flex flex-col ${alignmentClasses[position]} ${isRTL ? "rtl" : "ltr"}`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ duration: 0.3 }}
            className="mb-4"
          >
            <Card className="w-[min(22rem,calc(100vw-1rem))] h-[70dvh] max-h-[32rem] sm:w-96 sm:h-96 flex flex-col shadow-lg dark:shadow-cobalt-lg">
              {/* Header */}
              <div className="flex items-center justify-between border-b border-card-border p-4">
                <div className="flex items-center gap-2">
                  <div className="flex-shrink-0 h-8 w-8 rounded-full bg-[#2563eb] flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-text-primary">
                      {t("agri_expert")}
                    </h3>
                    <p className="text-xs text-text-secondary">{t("online")}</p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="h-8 w-8"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center">
                    <Bot className="h-8 w-8 text-accent mb-2" />
                    <p className="text-sm text-text-secondary">
                      {t("ask_question")}
                    </p>
                  </div>
                ) : (
                  <>
                    {messages.map((msg) => (
                      <motion.div
                        key={msg.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`flex items-end gap-2 ${
                          msg.sender === "user" ? "justify-end" : "justify-start"
                        }`}
                      >
                        {msg.sender === "assistant" && (
                          <div className="flex-shrink-0 h-6 w-6 rounded-full bg-accent/20 flex items-center justify-center">
                            <Bot className="h-3.5 w-3.5 text-white" />
                          </div>
                        )}
                        <div
                          className={`max-w-xs px-4 py-2 rounded-lg text-sm ${
                            msg.sender === "user"
                              ? "bg-accent text-black rounded-br-none"
                              : "bg-bg-secondary text-text-primary rounded-bl-none"
                          }`}
                        >
                          <p className="whitespace-pre-wrap break-words">
                            {msg.content}
                          </p>
                        </div>
                      </motion.div>
                    ))}
                    {isLoading && (
                      <div className="flex justify-start">
                        <div className="bg-bg-secondary text-text-primary px-4 py-2 rounded-lg rounded-bl-none flex gap-1">
                          <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
                          <div
                            className="w-2 h-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <div
                            className="w-2 h-2 bg-current rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    )}
                    {error && (
                      <div className="flex justify-center">
                        <Badge variant="error">{error}</Badge>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </>
                )}
              </div>

              {/* Context badge */}
              {scanContext?.disease_name && (
                <div className="px-4 pt-2">
                  <Badge variant="lime" className="text-xs">
                    {scanContext.disease_name} • {(scanContext.confidence || 0).toFixed(0)}%
                  </Badge>
                </div>
              )}

              {/* Input */}
              <div className="border-t border-card-border p-4">
                <div className="flex gap-2">
                  <Input
                    ref={inputRef}
                    placeholder={t("message")}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    className="text-sm"
                  />
                  <Button
                    size="icon"
                    onClick={handleSendMessage}
                    disabled={!input.trim() || isLoading}
                    className="h-10 w-10"
                  >
                    {isLoading ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating button */}
      <motion.div
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={`h-14 w-14 rounded-full bg-[#2563eb] text-white shadow-lg hover:bg-[#1d4ed8] ${
            isOpen ? "opacity-0 pointer-events-none" : "opacity-100"
          }`}
        >
          <motion.div
            animate={isOpen ? { rotate: 90 } : { rotate: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Bot className="h-6 w-6 text-white" />
          </motion.div>
        </Button>
      </motion.div>
    </div>
  );

  if (!mounted) {
    return null;
  }

  return createPortal(widget, document.body);
}
