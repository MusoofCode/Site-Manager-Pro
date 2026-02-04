import { useMemo } from "react";
import type React from "react";
import { useLocation } from "react-router-dom";
import {
  ClipboardCheck,
  CreditCard,
  DollarSign,
  FileBarChart2,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Package,
  Users,
  Wrench,
  LogOut,
} from "lucide-react";

import { NavLink } from "@/components/NavLink";
import logoDark from "@/assets/logo-dark.png";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type NavItem = {
  to: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
};

export function AppSidebar({ onLogout }: { onLogout: () => void }) {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const groups = useMemo(
    () =>
      [
        {
          label: "Overview",
          items: [
            { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
            { to: "/projects", label: "Projects", icon: FolderKanban },
            { to: "/reports", label: "Reports", icon: FileBarChart2 },
          ] satisfies NavItem[],
        },
        {
          label: "Operations",
          items: [
            { to: "/inventory", label: "Materials", icon: Package },
            { to: "/equipment", label: "Equipment", icon: Wrench },
            { to: "/maintenance", label: "Maintenance", icon: Wrench },
            { to: "/documents", label: "Documents", icon: FileText },
          ] satisfies NavItem[],
        },
        {
          label: "People & Finance",
          items: [
            { to: "/workers", label: "Workers", icon: Users },
            { to: "/attendance", label: "Attendance", icon: ClipboardCheck },
            { to: "/payments", label: "Payments", icon: CreditCard },
            { to: "/budget", label: "Budget & Costs", icon: DollarSign },
          ] satisfies NavItem[],
        },
      ] as const,
    [],
  );

  return (
    <Sidebar
      collapsible="icon"
      variant="floating"
      className={cn(
        "border border-sidebar-border/70 bg-sidebar shadow-construction",
        // breathing room like the reference
        "m-2",
        // make the floating sidebar feel more "oval" like the reference
        "[&_[data-sidebar=sidebar]]:rounded-[2.75rem] [&_[data-sidebar=sidebar]]:overflow-hidden",
      )}
    >
      <SidebarHeader className="gap-3 p-3">
        <div className="flex items-center gap-3 px-1">
          <img
            src={logoDark}
            alt="SOMPROPERTY"
            className={cn("h-9 w-9 shrink-0 rounded-xl object-contain p-0.5")}
            loading="eager"
          />
          {!collapsed && (
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-sidebar-foreground">SOMPROPERTY</p>
              <p className="truncate text-xs text-sidebar-foreground/60">Construction OS</p>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarSeparator />

      <SidebarContent className="pb-3">
        {groups.map((group) => {
          const hasActive = group.items.some((i) => location.pathname === i.to);
          return (
            <SidebarGroup key={group.label}>
              <SidebarGroupLabel className="text-sidebar-foreground/60">
                {group.label}
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {group.items.map((item) => {
                    const isActive = location.pathname === item.to;
                    return (
                      <SidebarMenuItem key={item.to}>
                        <SidebarMenuButton asChild isActive={isActive} tooltip={item.label}>
                          <NavLink
                            to={item.to}
                            className={cn(
                              "flex items-center gap-2 rounded-full",
                              hasActive ? "" : "",
                            )}
                            activeClassName="bg-sidebar-accent text-sidebar-accent-foreground"
                          >
                            <item.icon className="h-4 w-4" />
                            {!collapsed && <span>{item.label}</span>}
                          </NavLink>
                        </SidebarMenuButton>
                      </SidebarMenuItem>
                    );
                  })}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
      </SidebarContent>

      <SidebarFooter className="p-3">
        <Button
          type="button"
          variant="outline"
          onClick={onLogout}
          className={cn("w-full", collapsed ? "px-0 justify-center" : "justify-start")}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
