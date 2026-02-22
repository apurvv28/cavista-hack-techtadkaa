"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function ChatbotPopup() {
  const [isOpen, setIsOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [micError, setMicError] = useState("");
  const [messages, setMessages] = useState<Message[]>([
    { role: "assistant", content: "Hi 👋 How can I help you?" },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const startListening = () => {
    setMicError("");

    const SpeechRecognitionConstructor =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognitionConstructor) {
      setMicError(
        "Microphone speech-to-text is not supported in this browser.",
      );
      return;
    }

    if (!recognitionRef.current) {
      const recognition = new SpeechRecognitionConstructor();
      recognition.lang = "en-US";
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0]?.transcript || "")
          .join(" ")
          .trim();

        setInput(transcript);
      };

      recognition.onerror = (event: any) => {
        setMicError(
          event?.error
            ? `Microphone error: ${event.error}`
            : "Microphone failed. Please try again.",
        );
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }

    try {
      recognitionRef.current.start();
      setIsListening(true);
    } catch {
      setMicError(
        "Could not start microphone. Please allow microphone access.",
      );
      setIsListening(false);
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
  };

  const sendMessage = async () => {
    if (!input.trim() || isSending) return;

    const trimmedInput = input.trim();
    const userMessage: Message = { role: "user", content: trimmedInput };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setIsSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: trimmedInput }),
      });

      const data = await res.json();
      const botMessage: Message = {
        role: "assistant",
        content:
          typeof data?.reply === "string" && data.reply.trim().length > 0
            ? data.reply
            : "I could not get a response from the assistant right now.",
      };

      if (!res.ok) {
        botMessage.content =
          typeof data?.error === "string"
            ? `Error: ${data.error}`
            : "Error: Failed to reach the assistant service.";
      }

      setMessages((prev) => [...prev, botMessage]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Error: Unable to connect to the assistant service.",
        },
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-5 right-5 bg-red-800 text-white p-4 rounded-full shadow-lg hover:scale-105 transition"
      >
        💬
      </button>

      {/* Chat Window */}
      {isOpen && (
        <div className="fixed bottom-20 right-5 w-80 h-96 bg-white shadow-2xl rounded-2xl flex flex-col overflow-hidden border">
          {/* Header */}
          <div className="bg-blue-600 text-white p-3 font-semibold">
            AI Assistant
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-y-auto space-y-2 bg-gray-50">
            {messages.map((msg, index) => (
              <div
                key={index}
                className={`p-2 rounded-lg max-w-xs ${
                  msg.role === "user"
                    ? "bg-blue-500 text-white self-end ml-auto"
                    : "bg-gray-200 text-black"
                }`}
              >
                {msg.content}
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="flex border-t">
            <input
              type="text"
              className="flex-1 p-2 outline-none"
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              disabled={isSending}
            />
            <button
              onClick={isListening ? stopListening : startListening}
              className="bg-gray-200 text-black px-3 disabled:opacity-50"
              disabled={isSending}
              aria-label={isListening ? "Stop microphone" : "Start microphone"}
              title={isListening ? "Stop microphone" : "Start microphone"}
            >
              {isListening ? "⏹" : "🎤"}
            </button>
            <button
              onClick={sendMessage}
              className="bg-blue-600 text-white px-4 disabled:opacity-50"
              disabled={isSending}
            >
              {isSending ? "..." : "Send"}
            </button>
          </div>
          {micError && (
            <div className="px-3 py-2 text-xs text-red-600 border-t bg-red-50">
              {micError}
            </div>
          )}
        </div>
      )}
    </>
  );
}
