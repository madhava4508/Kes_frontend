import { useState } from "react";
import { Card } from "../../components/Card";
import { Button } from "../../components/Button";
import { Input } from "../../components/Input";
import { Badge } from "../../components/Badge";
import { 
  User, 
  Shield, 
  HardDrive, 
  Palette,
  Bell,
  Lock,
  Key,
  Download,
  Smartphone
} from "lucide-react";
import {
  profileDefaults,
  notificationToggles,
  storage,
  storageBreakdown,
  storagePlans,
  accentSwatches,
  displayToggles,
} from "../../../data/mockData";

export function Settings() {
  const [activeTab, setActiveTab] = useState("account");

  const tabs = [
    { id: "account", name: "Account", icon: User },
    { id: "security", name: "Security", icon: Shield },
    { id: "storage", name: "Storage", icon: HardDrive },
    { id: "theme", name: "Theme", icon: Palette },
  ];

  return (
    <div className="p-10">
      <div className="mb-10 animate-fade-in">
        <h1 className="text-3xl font-bold mb-2 tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your SecureVault AI preferences</p>
      </div>

      <div className="flex gap-10">
        {/* Tabs */}
        <div className="w-64 space-y-1 animate-slide-in-left">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-[12px] transition-all duration-250 ease-[cubic-bezier(0.4,0,0.2,1)] ${
                  activeTab === tab.id
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="text-sm">{tab.name}</span>
              </button>
            );
          })}
        </div>

        {/* Content */}
        <div className="flex-1 max-w-3xl">
          {activeTab === "account" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <h2 className="text-xl font-semibold mb-6">Profile Information</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Full Name</label>
                    <Input defaultValue={profileDefaults.fullName} />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Email Address</label>
                    <Input defaultValue={profileDefaults.email} type="email" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Company</label>
                    <Input defaultValue={profileDefaults.company} />
                  </div>
                </div>
                <div className="mt-8">
                  <Button variant="primary">Save Changes</Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-6">Notifications</h2>
                <div className="space-y-1">
                  {notificationToggles.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-foreground transition-colors duration-250"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full peer-checked:translate-x-5 transition-transform duration-250"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h2 className="text-xl font-semibold mb-2">Encryption Status</h2>
                    <p className="text-muted-foreground">Your data is protected with end-to-end encryption</p>
                  </div>
                  <Badge variant="success" className="flex items-center gap-2">
                    <Lock className="w-3 h-3" />
                    Active
                  </Badge>
                </div>
                <div className="p-4 bg-white/5 border border-white/10 rounded-[12px]">
                  <p className="text-sm">
                    Zero-knowledge encryption is enabled. All files are encrypted before leaving your device.
                  </p>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-6">Password & Authentication</h2>
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Current Password</label>
                    <Input type="password" placeholder="Enter current password" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">New Password</label>
                    <Input type="password" placeholder="Enter new password" />
                  </div>
                  <div>
                    <label className="block text-sm mb-2 text-muted-foreground">Confirm New Password</label>
                    <Input type="password" placeholder="Confirm new password" />
                  </div>
                </div>
                <div className="mt-8">
                  <Button variant="primary">Update Password</Button>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-4">Two-Factor Authentication</h2>
                <p className="text-muted-foreground mb-6">Add an extra layer of security to your account</p>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-[12px]">
                    <div className="flex items-center gap-3">
                      <Smartphone className="w-5 h-5 text-foreground" />
                      <div>
                        <p className="font-medium">Authenticator App</p>
                        <p className="text-sm text-muted-foreground">Use an app to generate codes</p>
                      </div>
                    </div>
                    <Button variant="secondary" className="text-sm px-4 py-2">Enable</Button>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-4">Encryption Keys</h2>
                <p className="text-muted-foreground mb-6">Backup your encryption keys securely</p>
                <div className="flex items-center gap-3">
                  <Button variant="secondary" className="flex items-center gap-2">
                    <Download className="w-4 h-4" />
                    Download Backup
                  </Button>
                  <Button variant="ghost" className="flex items-center gap-2">
                    <Key className="w-4 h-4" />
                    View Keys
                  </Button>
                </div>
              </Card>
            </div>
          )}

          {activeTab === "storage" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <h2 className="text-xl font-semibold mb-6">Storage Usage</h2>
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-muted-foreground">Used Storage</span>
                    <span className="font-semibold">{storage.usedGB} GB of {storage.totalGB} GB</span>
                  </div>
                  <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                    <div className="h-full bg-foreground rounded-full" style={{ width: storage.barWidth }}></div>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  You have {storage.freeGB} GB of available storage remaining
                </p>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-6">Storage Breakdown</h2>
                <div className="space-y-5">
                  {storageBreakdown.map((item, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm text-muted-foreground">{item.type}</span>
                        <span className="text-sm font-medium">{item.size}</span>
                      </div>
                      <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${item.color}`} style={{ width: `${item.percentage}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-4">Upgrade Storage</h2>
                <p className="text-muted-foreground mb-6">Need more space? Upgrade your plan</p>
                <div className="grid md:grid-cols-3 gap-5">
                  {storagePlans.map((plan, i) => (
                    <div 
                      key={i}
                      className="p-5 border border-border rounded-[16px] hover:border-white/20 transition-all duration-250 text-center"
                    >
                      <p className="font-semibold mb-1">{plan.plan}</p>
                      <p className="text-2xl font-bold text-foreground mb-2">{plan.storage}</p>
                      <p className="text-sm text-muted-foreground mb-4">{plan.price}</p>
                      <Button variant={i === 0 ? "ghost" : "secondary"} className="w-full text-sm py-2">
                        {i === 0 ? "Current" : "Upgrade"}
                      </Button>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {activeTab === "theme" && (
            <div className="space-y-6 animate-fade-in">
              <Card>
                <h2 className="text-xl font-semibold mb-6">Appearance</h2>
                <p className="text-muted-foreground mb-6">Customize how SecureVault AI looks</p>
                <div className="grid md:grid-cols-2 gap-5">
                  <div className="p-6 border-2 border-foreground bg-white/5 rounded-[16px] cursor-pointer">
                    <div className="w-full h-24 bg-background mb-3 border border-border rounded-[8px]"></div>
                    <p className="font-semibold text-center">Dark (Current)</p>
                  </div>
                  <div className="p-6 border border-border rounded-[16px] hover:border-white/20 transition-all duration-250 cursor-pointer opacity-50">
                    <div className="w-full h-24 bg-white mb-3 border border-gray-200 rounded-[8px]"></div>
                    <p className="font-semibold text-center">Light (Coming Soon)</p>
                  </div>
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-6">Accent Color</h2>
                <div className="grid grid-cols-6 gap-4">
                  {accentSwatches.map((item, i) => (
                    <button
                      key={i}
                      className={`aspect-square rounded-[12px] border-2 ${
                        item.active ? "border-foreground" : "border-transparent"
                      } transition-all duration-250 hover:scale-110`}
                      style={{ backgroundColor: item.color }}
                      title={item.name}
                    ></button>
                  ))}
                </div>
              </Card>

              <Card>
                <h2 className="text-xl font-semibold mb-6">Display Settings</h2>
                <div className="space-y-1">
                  {displayToggles.map((item, i) => (
                    <div key={i} className="flex items-center justify-between py-4 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{item.title}</p>
                        <p className="text-sm text-muted-foreground mt-0.5">{item.desc}</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" className="sr-only peer" defaultChecked={item.defaultChecked} />
                        <div className="w-11 h-6 bg-white/10 rounded-full peer peer-checked:bg-foreground transition-colors duration-250"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-background rounded-full peer-checked:translate-x-5 transition-transform duration-250"></div>
                      </label>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
