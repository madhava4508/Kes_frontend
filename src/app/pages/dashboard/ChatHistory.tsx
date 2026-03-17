import { useState, useEffect } from "react";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { Bot, User, Clock, Loader2, AlertCircle, MessageSquareText } from "lucide-react";
import { getChats, type HistoryRecord } from "../../../lib/chatApi";

export function ChatHistory() {
  const [records, setRecords] = useState<HistoryRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    getChats("yashas")
      .then((data) => setRecords(data))
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) +
      " · " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-8 pb-6 border-b border-border animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold mb-2 tracking-tight">Chat History</h1>
            <p className="text-muted-foreground">All past Q&amp;A sessions stored on the server</p>
          </div>
          {!loading && !error && (
            <Badge variant="secondary">
              {records.length} {records.length === 1 ? "entry" : "entries"}
            </Badge>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto p-8">
        {/* Loading */}
        {loading && (
          <div className="flex items-center gap-3 text-muted-foreground animate-fade-in">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Loading history...</span>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-3 text-muted-foreground animate-fade-in">
            <AlertCircle className="w-5 h-5" />
            <span>Failed to load history: {error}</span>
          </div>
        )}

        {/* Empty */}
        {!loading && !error && records.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-4 animate-fade-in">
            <MessageSquareText className="w-12 h-12 opacity-30" />
            <p>No chat history yet. Ask a question in the AI Assistant to get started.</p>
          </div>
        )}

        {/* Records list */}
        {!loading && !error && records.length > 0 && (
          <div className="space-y-6 max-w-3xl animate-fade-in">
            {records.map((rec) => (
              <Card key={rec.id}>
                {/* Timestamp row */}
                <div className="flex items-center gap-2 mb-4 text-xs text-muted-foreground">
                  <Clock className="w-3.5 h-3.5" />
                  <span>{formatDate(rec.created_at)}</span>
                </div>

                {/* Question */}
                <div className="flex gap-3 mb-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-muted-foreground">
                    <User className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">You</p>
                    <p className="text-sm leading-relaxed">{rec.question}</p>
                  </div>
                </div>

                {/* Divider */}
                <div className="border-t border-border my-3" />

                {/* Answer */}
                <div className="flex gap-3">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-foreground">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-muted-foreground mb-1">SecureVault AI</p>
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">{rec.response}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
