import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import {
  HardDrive,
  Upload,
  FileText,
  FolderOpen,
  Layers,
  TrendingUp,
  Loader2,
  AlertCircle,
  Image,
  File,
} from "lucide-react";
import { fetchInventorySummary, type InventorySummary } from "../../../lib/chatApi";

// ── Icon lookup for file_types ──────────────────────────────────────────────

const FILE_TYPE_ICONS: Record<string, React.ReactNode> = {
  pdf: <FileText className="w-4 h-4" />,
  image: <Image className="w-4 h-4" />,
};
const DEFAULT_FILE_ICON = <File className="w-4 h-4" />;

// ── Helper ──────────────────────────────────────────────────────────────────

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}

// ── Component ───────────────────────────────────────────────────────────────

export function DashboardHome() {
  const navigate = useNavigate();

  const [data, setData] = useState<InventorySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInventorySummary()
      .then(setData)
      .catch((err) => {
        console.error("[Dashboard] Failed to load inventory summary:", err);
        setError((err as Error).message);
      })
      .finally(() => setLoading(false));
  }, []);

  // ── Loading ─────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-3 text-muted-foreground animate-fade-in">
        <Loader2 className="w-5 h-5 animate-spin" />
        <span>Loading dashboard...</span>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────

  if (error || !data) {
    return (
      <div className="p-10 animate-fade-in">
        <div className="mb-10">
          <h1 className="text-3xl font-bold mb-2 tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back to SecureVault AI</p>
        </div>
        <Card>
          <div className="flex items-center gap-3 text-muted-foreground">
            <AlertCircle className="w-5 h-5" />
            <span>Could not load dashboard data. {error}</span>
          </div>
        </Card>
      </div>
    );
  }

  // ── Derived values ──────────────────────────────────────────────────────────

  const { storage, counts, file_types } = data;
  const barWidth = `${Math.min(storage.percent_used, 100)}%`;
  const fileTypeEntries = Object.entries(file_types);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="p-10">
      {/* Header */}
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">{data.user}</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        {/* Storage */}
        <Card className="animate-fade-in-up stagger-1">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <HardDrive className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="secondary">{storage.percent_used}%</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Storage Used</p>
          <p className="text-2xl font-bold">{formatBytes(storage.usage)}</p>
          <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <div
              className="h-full bg-foreground rounded-full transition-all duration-500"
              style={{ width: barWidth }}
            />
          </div>
        </Card>

        {/* Files */}
        <Card className="animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <FileText className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="secondary">{counts.files}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Files</p>
          <p className="text-2xl font-bold">{counts.files}</p>
        </Card>

        {/* Folders */}
        <Card className="animate-fade-in-up stagger-3">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <FolderOpen className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="secondary">{counts.folders}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Folders</p>
          <p className="text-2xl font-bold">{counts.folders}</p>
        </Card>

        {/* Total Items */}
        <Card className="animate-fade-in-up stagger-4">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <Layers className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="primary">{counts.total_items}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Total Items</p>
          <p className="text-2xl font-bold">{counts.total_items}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <Card
          hover
          className="cursor-pointer animate-fade-in-up stagger-5"
          onClick={() => navigate("/dashboard/ai-assistant")}
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/5 rounded-[16px]">
              <Upload className="w-8 h-8 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Upload Files</h3>
              <p className="text-sm text-muted-foreground">Add new encrypted documents</p>
            </div>
          </div>
        </Card>

        <Card
          hover
          className="cursor-pointer animate-fade-in-up stagger-6"
          onClick={() => navigate("/dashboard/ai-assistant")}
        >
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/5 rounded-[16px]">
              <FileText className="w-8 h-8 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Ask AI</h3>
              <p className="text-sm text-muted-foreground">Query your documents</p>
            </div>
          </div>
        </Card>

        <Card hover className="cursor-pointer animate-fade-in-up stagger-7">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-white/5 rounded-[16px]">
              <TrendingUp className="w-8 h-8 text-foreground" />
            </div>
            <div>
              <h3 className="font-semibold mb-1">Analytics</h3>
              <p className="text-sm text-muted-foreground">View usage statistics</p>
            </div>
          </div>
        </Card>
      </div>

      {/* File Types */}
      {fileTypeEntries.length > 0 && (
        <Card className="animate-fade-in-up stagger-8">
          <h2 className="text-xl font-semibold mb-6">File Types</h2>
          <div className="space-y-1">
            {fileTypeEntries.map(([type, count]) => (
              <div
                key={type}
                className="flex items-center justify-between p-4 rounded-[12px] hover:bg-white/[0.03] transition-all duration-200"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/5 rounded-[8px] text-foreground">
                    {FILE_TYPE_ICONS[type] ?? DEFAULT_FILE_ICON}
                  </div>
                  <p className="font-medium capitalize">{type}</p>
                </div>
                <Badge variant="secondary">
                  {count} {count === 1 ? "file" : "files"}
                </Badge>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
