import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, GitBranch, Users, Mail, BarChart3, Settings, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: GitBranch, label: "Workflows", path: "/workflows/new" },
  { icon: Users, label: "Leads", path: "/leads" },
  { icon: Mail, label: "Outbox", path: "/outbox" },
  { icon: BarChart3, label: "Analytics", path: "/dashboard" },
  { icon: Settings, label: "Settings", path: "/dashboard" },
];

interface AppSidebarProps {
  open: boolean;
  onToggle: () => void;
}

export function AppSidebar({ open }: AppSidebarProps) {
  const location = useLocation();

  return (
    <>
      {open && <div className="fixed inset-0 bg-background/80 z-40 lg:hidden" onClick={() => {}} />}
      <aside className={cn(
        "fixed lg:relative z-50 h-screen flex flex-col border-r border-border bg-sidebar transition-all duration-300",
        open ? "w-56 translate-x-0" : "w-16 -translate-x-full lg:translate-x-0"
      )}>
        <div className="h-14 flex items-center gap-2 px-4 border-b border-border">
          <div className="h-8 w-8 rounded-lg bg-primary/20 flex items-center justify-center">
            <Zap className="h-4 w-4 text-primary" />
          </div>
          {open && <span className="font-heading font-bold text-foreground text-sm">OutreachAI</span>}
        </div>
        <nav className="flex-1 py-4 px-2 space-y-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path || (item.path === "/workflows/new" && location.pathname.startsWith("/workflows"));
            return (
              <NavLink
                key={item.label}
                to={item.path}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <item.icon className="h-5 w-5 flex-shrink-0" />
                {open && <span className="font-mono text-xs">{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
