import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import {
  LayoutDashboard,
  ListChecks,
  Dna,
  History,
  Settings,
  CreditCard,
  Menu,
  LogOut,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { label: "Dashboard", path: "/dashboard", icon: LayoutDashboard },
  { label: "Weekly Action Plan", path: "/action-plan", icon: ListChecks },
  { label: "Menu DNA", path: "/menu", icon: Dna },
  { label: "History", path: "/history", icon: History },
  { label: "Settings", path: "/settings", icon: Settings },
  { label: "Billing", path: "/billing", icon: CreditCard },
];

interface AppLayoutProps {
  children: React.ReactNode;
}

const AppLayout = ({ children }: AppLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();

  const handleNav = (path: string) => {
    navigate(path);
    setMobileOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4">
        <h1 className="font-[var(--font-display)] text-xl font-bold text-foreground tracking-tight">
          Menu <span className="text-foreground/60">DNA</span>
        </h1>
      </div>

      <nav className="flex-1 px-3 space-y-1">
        {navItems.map((item) => {
          const active = location.pathname === item.path;
          return (
            <button
              key={item.path}
              onClick={() => handleNav(item.path)}
              className={cn(
                "flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm transition-colors duration-200",
                active
                  ? "bg-secondary text-foreground"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {(sidebarOpen || mobileOpen) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      <div className="px-3 pb-6">
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full rounded-md px-3 py-2.5 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/50 transition-colors duration-200"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {(sidebarOpen || mobileOpen) && <span>Sign Out</span>}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-[hsl(var(--sidebar-background))] transition-all duration-200",
          sidebarOpen ? "w-60" : "w-16"
        )}
      >
        <SidebarContent />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div className="absolute inset-0 bg-background/80" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-60 h-full bg-[hsl(var(--sidebar-background))] border-r border-border">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="flex items-center h-14 px-4 md:px-6 border-b border-border bg-background">
          <button
            onClick={() => {
              if (window.innerWidth < 768) setMobileOpen(true);
              else setSidebarOpen(!sidebarOpen);
            }}
            className="text-muted-foreground hover:text-foreground transition-colors mr-4"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        <main className="flex-1 p-6 md:p-12 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
