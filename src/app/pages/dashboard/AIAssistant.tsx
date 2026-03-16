import { useState } from "react";
import { Input } from "../../components/Input";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Send, Bot, User, FileText, Sparkles } from "lucide-react";
import { initialMessages, aiFallbackResponse } from "../../../data/mockData";
import type { Message } from "../../../data/mockData";

export function AIAssistant() {
  const [messages, setMessages] = useState<Message[]>(initialMessages);

  const [inputValue, setInputValue] = useState("");

  const handleSend = () => {
    if (!inputValue.trim()) return;

    const newMessage: Message = {
      id: messages.length + 1,
      sender: "user",
      text: inputValue,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages([...messages, newMessage]);
    setInputValue("");

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: messages.length + 2,
        sender: "ai",
        text: aiFallbackResponse,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 pb-6 border-b border-border animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">AI Assistant</h1>
            <p className="text-muted-foreground">Ask questions about your encrypted documents</p>
          </div>
          <Badge variant="success" className="flex items-center gap-2">
            <Sparkles className="w-3 h-3" />
            AI Active
          </Badge>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-auto p-8 space-y-6">
        {messages.map((message, index) => (
          <div
            key={message.id}
            className={`flex gap-4 animate-chat-in ${message.sender === "user" ? "flex-row-reverse" : ""}`}
            style={{ animationDelay: `${index * 0.05}s` }}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${
              message.sender === "ai" 
                ? "bg-white/10 text-foreground" 
                : "bg-white/5 text-muted-foreground"
            }`}>
              {message.sender === "ai" ? (
                <Bot className="w-5 h-5" />
              ) : (
                <User className="w-5 h-5" />
              )}
            </div>

            <div className={`flex-1 max-w-2xl ${message.sender === "user" ? "flex justify-end" : ""}`}>
              <Card className={message.sender === "user" ? "bg-white/5" : ""}>
                <div className="mb-2 text-sm text-muted-foreground">
                  {message.sender === "ai" ? "SecureVault AI" : "You"} · {message.timestamp}
                </div>
                <div className="whitespace-pre-wrap leading-relaxed">
                  {message.text}
                </div>
                
                {message.relatedFiles && message.relatedFiles.length > 0 && (
                  <div className="mt-4 pt-4 border-t border-border">
                    <p className="text-sm text-muted-foreground mb-2">Related Documents:</p>
                    <div className="flex flex-wrap gap-2">
                      {message.relatedFiles.map((file, i) => (
                        <div
                          key={i}
                          className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-[8px] text-sm transition-colors duration-200 hover:bg-white/10"
                        >
                          <FileText className="w-4 h-4 text-foreground" />
                          <span>{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </Card>
            </div>
          </div>
        ))}
      </div>

      {/* Input */}
      <div className="p-8 border-t border-border bg-white/[0.02]">
        <div className="max-w-4xl mx-auto">
          <div className="flex gap-3">
            <div className="flex-1">
              <Input
                placeholder="Ask a question about your documents..."
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleSend();
                  }
                }}
              />
            </div>
            <button
              onClick={handleSend}
              className="px-6 py-3 bg-primary text-primary-foreground rounded-[12px] hover:opacity-90 transition-all duration-200 disabled:opacity-50"
              disabled={!inputValue.trim()}
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-muted-foreground mt-3 text-center">
            Your queries are processed on encrypted data. We never see your plaintext documents.
          </p>
        </div>
      </div>
    </div>
  );
}
