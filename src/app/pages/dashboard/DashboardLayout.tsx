import { Outlet, Link, useLocation } from "react-router";
import { 
  LayoutDashboard, 
  FolderLock, 
  MessageSquare, 
  Search, 
  Settings, 
  LogOut,
  Shield
} from "lucide-react";

export function DashboardLayout() {
  const location = useLocation();
  
  const navigation = [
    { name: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
    { name: "Vault", path: "/dashboard/vault", icon: FolderLock },
    { name: "AI Assistant", path: "/dashboard/ai-assistant", icon: MessageSquare },
    { name: "Search", path: "/dashboard/search", icon: Search },
    { name: "Settings", path: "/dashboard/settings", icon: Settings },
  ];

  const isActive = (path: string) => {
    if (path === "/dashboard") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-sidebar flex flex-col">
        <div className="p-6 border-b border-border">
          <Link to="/" className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-foreground" />
            <span className="text-lg font-semibold tracking-tight">SecureVault AI</span>
          </Link>
        </div>
        
        <nav className="flex-1 p-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.path);
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-200 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  active
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{item.name}</span>
              </Link>
            );
          })}
        </nav>
        
        <div className="p-4 border-t border-border">
          <button className="flex items-center gap-3 px-4 py-3 w-full rounded-[12px] text-muted-foreground hover:text-foreground hover:bg-white/5 transition-all duration-200">
            <LogOut className="w-5 h-5" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <Outlet />
      </main>
    </div>
  );
}
