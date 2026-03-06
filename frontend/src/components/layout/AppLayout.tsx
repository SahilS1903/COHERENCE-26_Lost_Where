import { Outlet, useNavigate } from "react-router-dom";
import { AppSidebar } from "./AppSidebar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Plus, Menu, LogOut } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAuth } from "../AuthProvider";

export function AppLayout() {
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { user, logout } = useAuth();

  const initials = user?.name ? user.name.split(" ").map((n: string) => n[0]).join("").substring(0, 2).toUpperCase() : "U";

  return (
    <div className="flex min-h-screen w-full bg-background">
      <AppSidebar open={sidebarOpen} onToggle={() => setSidebarOpen(!sidebarOpen)} />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center justify-between border-b border-border px-4 lg:px-6 bg-card/50 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <Menu className="h-5 w-5" />
            </Button>
            <h2 className="font-heading font-semibold text-foreground text-lg hidden sm:block">OutreachAI Engine</h2>
          </div>
          <div className="flex items-center gap-3">
            <Button size="sm" className="bg-primary text-primary-foreground hover:bg-primary/90 font-mono text-xs" onClick={() => navigate("/workflows/new")}>
              <Plus className="h-4 w-4 mr-1" /> New Workflow
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="outline-none">
                  <Avatar className="h-8 w-8 border border-border cursor-pointer hover:opacity-80 transition-opacity">
                    <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-mono">{initials}</AvatarFallback>
                  </Avatar>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 font-mono">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.name}</p>
                    <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive cursor-pointer">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <main className="flex-1 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
