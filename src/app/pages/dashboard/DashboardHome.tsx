import { useNavigate } from "react-router";
import { Card } from "../../components/Card";
import { Badge } from "../../components/Badge";
import { 
  HardDrive, 
  Upload, 
  FileText, 
  TrendingUp,
  Clock,
  Shield
} from "lucide-react";
import { recentFiles, storage, dashboardStats } from "../../../data/mockData";

export function DashboardHome() {
  const navigate = useNavigate();

  return (
    <div className="p-10">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back to SecureVault AI</p>
      </div>

      {/* Stats Grid */}
      <div className="grid md:grid-cols-4 gap-6 mb-10">
        <Card className="animate-fade-in-up stagger-1">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <HardDrive className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="success">{dashboardStats.storageBadge}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Total Storage Used</p>
          <p className="text-2xl font-bold">{storage.usedGB} GB</p>
          <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
            <div className="h-full bg-foreground rounded-full" style={{ width: storage.barWidth }}></div>
          </div>
        </Card>

        <Card className="animate-fade-in-up stagger-2">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <FileText className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="secondary">{dashboardStats.filesBadge}</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Files Stored</p>
          <p className="text-2xl font-bold">{dashboardStats.filesStored}</p>
        </Card>

        <Card className="animate-fade-in-up stagger-3">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <TrendingUp className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="primary">Active</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">AI Queries</p>
          <p className="text-2xl font-bold">{dashboardStats.aiQueries}</p>
        </Card>

        <Card className="animate-fade-in-up stagger-4">
          <div className="flex items-start justify-between mb-4">
            <div className="p-3 bg-white/5 rounded-[12px]">
              <Shield className="w-6 h-6 text-foreground" />
            </div>
            <Badge variant="success">100%</Badge>
          </div>
          <p className="text-muted-foreground text-sm mb-1">Encryption Status</p>
          <p className="text-2xl font-bold">{dashboardStats.encryptionStatus}</p>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="grid md:grid-cols-3 gap-6 mb-10">
        <Card hover className="cursor-pointer animate-fade-in-up stagger-5" onClick={() => navigate("/dashboard/ai-assistant")}>
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

        <Card hover className="cursor-pointer animate-fade-in-up stagger-6" onClick={() => navigate("/dashboard/ai-assistant")}>
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

      {/* Recent Files */}
      <Card className="animate-fade-in-up stagger-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold">Recent Files</h2>
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">View All</button>
        </div>
        
        <div className="space-y-1">
          {recentFiles.map((file, i) => (
            <div 
              key={i} 
              className="flex items-center justify-between p-4 rounded-[12px] hover:bg-white/[0.03] transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/5 rounded-[8px]">
                  <FileText className="w-5 h-5 text-foreground" />
                </div>
                <div>
                  <p className="font-medium mb-1">{file.name}</p>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <span>{file.size}</span>
                    <span>·</span>
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      <span>{file.uploadedRelative}</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                {file.encrypted && <Badge variant="success">Encrypted</Badge>}
                <button className="text-sm text-muted-foreground hover:text-foreground transition-colors duration-200">Ask AI</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
