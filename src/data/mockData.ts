// ─────────────────────────────────────────────────────────────────────────────
// SecureVault AI — Centralized Mock Data
// All dummy data is defined here and imported by each dashboard component.
// ─────────────────────────────────────────────────────────────────────────────

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultFile {
  id: number;
  name: string;
  type: string;
  size: string;
  /** Absolute date string shown in Vault (e.g. "Mar 15, 2026") */
  uploaded: string;
  /** Relative date string shown in DashboardHome (e.g. "2 hours ago") */
  uploadedRelative: string;
  status: "Encrypted";
  encrypted: true;
}

export interface Message {
  id: number;
  sender: "user" | "ai";
  text: string;
  timestamp: string;
  relatedFiles?: string[];
}

export interface SearchResult {
  id: number;
  fileName: string;
  fileType: string;
  snippet: string;
  relevance: number;
  lastModified: string;
}

export interface StorageBreakdownItem {
  type: string;
  size: string;
  percentage: number;
  color: string;
}

export interface StoragePlan {
  plan: string;
  storage: string;
  price: string;
}

export interface AccentSwatch {
  color: string;
  name: string;
  active: boolean;
}

export interface ToggleItem {
  title: string;
  desc: string;
  defaultChecked: boolean;
}

export interface PopularTopic {
  topic: string;
  count: number;
}

// ── Storage ───────────────────────────────────────────────────────────────────

export const storage = {
  usedGB: 47.2,
  totalGB: 100,
  usedPercent: 47,
  freeGB: 52.8,
  /** CSS width value for the progress bar */
  barWidth: "47%",
};

// ── Stats (Dashboard) ─────────────────────────────────────────────────────────

export const dashboardStats = {
  storageBadge: "+12%",
  filesStored: "1,248",
  filesBadge: "+8",
  aiQueries: "342",
  encryptionStatus: "Secured",
};

// ── Vault Files ───────────────────────────────────────────────────────────────

export const vaultFiles: VaultFile[] = [
  { id: 1, name: "Q1 Financial Report.pdf",  type: "PDF",  size: "2.4 MB",  uploaded: "Mar 15, 2026", uploadedRelative: "2 hours ago",  status: "Encrypted", encrypted: true },
  { id: 2, name: "Project Proposal.docx",    type: "DOCX", size: "856 KB",  uploaded: "Mar 15, 2026", uploadedRelative: "5 hours ago",  status: "Encrypted", encrypted: true },
  { id: 3, name: "Research Notes.txt",       type: "TXT",  size: "124 KB",  uploaded: "Mar 14, 2026", uploadedRelative: "1 day ago",    status: "Encrypted", encrypted: true },
  { id: 4, name: "Contract Draft.pdf",       type: "PDF",  size: "1.8 MB",  uploaded: "Mar 13, 2026", uploadedRelative: "2 days ago",   status: "Encrypted", encrypted: true },
  { id: 5, name: "Meeting Minutes.docx",     type: "DOCX", size: "456 KB",  uploaded: "Mar 13, 2026", uploadedRelative: "2 days ago",   status: "Encrypted", encrypted: true },
  { id: 6, name: "Technical Specs.pdf",      type: "PDF",  size: "3.2 MB",  uploaded: "Mar 12, 2026", uploadedRelative: "3 days ago",   status: "Encrypted", encrypted: true },
  { id: 7, name: "Budget Forecast.xlsx",     type: "XLSX", size: "678 KB",  uploaded: "Mar 12, 2026", uploadedRelative: "3 days ago",   status: "Encrypted", encrypted: true },
  { id: 8, name: "Product Roadmap.pdf",      type: "PDF",  size: "1.5 MB",  uploaded: "Mar 11, 2026", uploadedRelative: "4 days ago",   status: "Encrypted", encrypted: true },
];

/** The 4 most-recent files shown on the Dashboard */
export const recentFiles = vaultFiles.slice(0, 4);

// ── AI Assistant — Seed Messages ──────────────────────────────────────────────

export const initialMessages: Message[] = [
  {
    id: 1,
    sender: "ai",
    text: "Hello! I'm your SecureVault AI assistant. I can help you find information in your encrypted documents. What would you like to know?",
    timestamp: "10:00 AM",
  },
  {
    id: 2,
    sender: "user",
    text: "What were the key points from the Q1 financial report?",
    timestamp: "10:02 AM",
  },
  {
    id: 3,
    sender: "ai",
    text: "Based on your Q1 Financial Report, here are the key points:\n\n1. Revenue increased by 23% compared to Q4\n2. Operating costs were reduced by 12%\n3. Net profit margin improved to 18.5%\n4. Customer acquisition cost decreased by 8%\n\nWould you like me to provide more details on any of these areas?",
    timestamp: "10:02 AM",
    relatedFiles: ["Q1 Financial Report.pdf"],
  },
  {
    id: 4,
    sender: "user",
    text: "Can you compare this with the project proposal budget?",
    timestamp: "10:04 AM",
  },
  {
    id: 5,
    sender: "ai",
    text: "I've analyzed both documents. The Q1 revenue aligns well with the project proposal's revenue projections. However, the actual operating costs came in 5% lower than the proposal estimated, which contributed to the better profit margin.\n\nThe proposal projected 15% profit margin, but we achieved 18.5%, largely due to cost optimization efforts.",
    timestamp: "10:04 AM",
    relatedFiles: ["Q1 Financial Report.pdf", "Project Proposal.docx"],
  },
];

/** Fallback AI response text shown for user-typed queries */
export const aiFallbackResponse =
  "I'm processing your encrypted documents to find the answer. This is a demonstration of how the AI assistant would respond to your query while maintaining end-to-end encryption.";

// ── Search ─────────────────────────────────────────────────────────────────────

export const mockSearchResults: SearchResult[] = [
  {
    id: 1,
    fileName: "Q1 Financial Report.pdf",
    fileType: "PDF",
    snippet:
      "Revenue increased by 23% compared to Q4, with operating costs reduced by 12%. The net profit margin improved significantly...",
    relevance: 98,
    lastModified: "Mar 15, 2026",
  },
  {
    id: 2,
    fileName: "Project Proposal.docx",
    fileType: "DOCX",
    snippet:
      "Budget allocation for Q1 operations includes strategic investment in technology infrastructure and customer acquisition...",
    relevance: 87,
    lastModified: "Mar 15, 2026",
  },
  {
    id: 3,
    fileName: "Budget Forecast.xlsx",
    fileType: "XLSX",
    snippet:
      "Financial projections indicate strong growth trajectory with emphasis on cost optimization and revenue diversification...",
    relevance: 82,
    lastModified: "Mar 12, 2026",
  },
  {
    id: 4,
    fileName: "Meeting Minutes.docx",
    fileType: "DOCX",
    snippet:
      "Discussion on Q1 performance metrics and strategic planning for upcoming quarters. Team highlighted key achievements...",
    relevance: 75,
    lastModified: "Mar 13, 2026",
  },
];

export const recentSearches: string[] = [
  "financial performance Q1",
  "project budget allocation",
  "meeting notes march",
  "technical specifications",
];

export const popularTopics: PopularTopic[] = [
  { topic: "Financial Reports", count: 24 },
  { topic: "Project Documents", count: 18 },
  { topic: "Technical Specs", count: 15 },
];

// ── Settings ──────────────────────────────────────────────────────────────────

export const profileDefaults = {
  fullName: "Alex Johnson",
  email: "alex@example.com",
  company: "TechCorp Inc.",
};

export const notificationToggles: ToggleItem[] = [
  { title: "Email Notifications", desc: "Receive updates about your files",     defaultChecked: true },
  { title: "Security Alerts",     desc: "Get notified about security events",   defaultChecked: true },
  { title: "AI Assistant Updates", desc: "Learn about new AI capabilities",     defaultChecked: true },
];

export const storageBreakdown: StorageBreakdownItem[] = [
  { type: "Documents", size: "28.4 GB", percentage: 60, color: "bg-foreground" },
  { type: "Images",    size: "12.8 GB", percentage: 27, color: "bg-white/50"   },
  { type: "Other",     size: "6.0 GB",  percentage: 13, color: "bg-white/30"   },
];

export const storagePlans: StoragePlan[] = [
  { plan: "Basic",      storage: "100 GB",    price: "Free"   },
  { plan: "Pro",        storage: "500 GB",    price: "$9/mo"  },
  { plan: "Enterprise", storage: "Unlimited", price: "$29/mo" },
];

export const accentSwatches: AccentSwatch[] = [
  { color: "#EBEBEB", name: "Silver",   active: true  },
  { color: "#AAAAAA", name: "Gray",     active: false },
  { color: "#888888", name: "Dim",      active: false },
  { color: "#666666", name: "Slate",    active: false },
  { color: "#FFFFFF", name: "White",    active: false },
  { color: "#444444", name: "Charcoal", active: false },
];

export const displayToggles: ToggleItem[] = [
  { title: "Compact Mode",   desc: "Reduce spacing for denser layouts",         defaultChecked: false },
  { title: "Animations",     desc: "Enable smooth transitions and effects",     defaultChecked: true  },
  { title: "High Contrast",  desc: "Increase contrast for better visibility",   defaultChecked: false },
];
