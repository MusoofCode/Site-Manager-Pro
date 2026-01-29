import { useEffect, useMemo, useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  FolderKanban,
  DollarSign,
  Package,
  Wrench,
  Users,
  FileText,
  ClipboardCheck,
  CreditCard,
  FileBarChart2,
  LogOut,
  Menu,
  X,
  Sun,
  Moon,
  Clock,
} from "lucide-react";
import logo from "@/assets/logo.png";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const navigate = useNavigate();
  const location = useLocation();
  const { theme, setTheme } = useTheme();

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(t);
  }, []);

  const themeMode = (theme ?? "dark") as "dark" | "light" | "system";
  const isDark = themeMode === "dark";

  const dateTimeLabel = useMemo(() => {
    const date = now.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "2-digit" });
    const time = now.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
    return { date, time };
  }, [now]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/auth");
  };

  const navItems = [
    { to: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { to: "/projects", icon: FolderKanban, label: "Projects" },
    { to: "/budget", icon: DollarSign, label: "Budget & Costs" },
    { to: "/inventory", icon: Package, label: "Materials" },
    { to: "/equipment", icon: Wrench, label: "Equipment" },
    { to: "/workers", icon: Users, label: "Workers" },
    { to: "/attendance", icon: ClipboardCheck, label: "Attendance" },
    { to: "/payments", icon: CreditCard, label: "Payments" },
    { to: "/maintenance", icon: Wrench, label: "Maintenance" },
    { to: "/documents", icon: FileText, label: "Documents" },
    { to: "/reports", icon: FileBarChart2, label: "Reports" },
  ];

  return (
    <div className="min-h-screen bg-construction-dark flex w-full">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-64" : "w-20"
        } bg-construction-slate border-r border-construction-steel/30 transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-construction-steel/30">
          {sidebarOpen ? (
            <>
              <div className="flex items-center gap-3">
                <img src={logo} alt="Logo" className="h-10 w-10" />
                <span className="text-white font-bold text-lg">SOMPROPERTY</span>
              </div>
              <button onClick={() => setSidebarOpen(false)} className="text-construction-concrete hover:text-white">
                <X className="h-5 w-5" />
              </button>
            </>
          ) : (
            <button onClick={() => setSidebarOpen(true)} className="text-construction-concrete hover:text-white mx-auto">
              <Menu className="h-6 w-6" />
            </button>
          )}
        </div>

        <nav className="flex-1 p-4 space-y-2">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition ${
                  isActive
                    ? "bg-gradient-hero text-white font-medium shadow-construction"
                    : "text-construction-concrete hover:bg-construction-steel/20 hover:text-white"
                }`}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {sidebarOpen && <span>{item.label}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className="p-4 border-t border-construction-steel/30">
          <Button
            onClick={() => setLogoutOpen(true)}
            variant="outline"
            className={`w-full ${
              sidebarOpen ? "" : "px-0"
            } border-construction-steel text-construction-concrete hover:text-white hover:bg-construction-steel/20`}
          >
            <LogOut className="h-5 w-5" />
            {sidebarOpen && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        <header className="sticky top-0 z-40 border-b border-construction-steel/30 bg-construction-slate/80 backdrop-blur supports-[backdrop-filter]:bg-construction-slate/60">
          <div className="px-6 py-3 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <img
                src={logo}
                alt="SOMPROPERTY"
                className={
                  "h-8 w-8 shrink-0 rounded-md " +
                  (isDark ? "" : "invert saturate-0")
                }
              />
              <div className="min-w-0">
                <p className="text-white font-semibold leading-tight truncate">SOMPROPERTY</p>
                <p className="text-construction-concrete text-xs leading-tight truncate">
                  {location.pathname.replace("/", "").toUpperCase() || "DASHBOARD"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-md border border-construction-steel/30 bg-construction-dark/40">
                <Clock className="h-4 w-4 text-construction-concrete" />
                <div className="text-xs">
                  <span className="text-white font-medium">{dateTimeLabel.time}</span>
                  <span className="text-construction-concrete"> • {dateTimeLabel.date}</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setTheme(isDark ? "light" : "dark")}
                className="border-construction-steel text-construction-concrete hover:text-white hover:bg-construction-steel/20"
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
              </Button>

              <Button
                type="button"
                variant="outline"
                onClick={() => setLogoutOpen(true)}
                className="border-construction-steel text-construction-concrete hover:text-white hover:bg-construction-steel/20"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline ml-2">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <Outlet />
      </main>

      <AlertDialog open={logoutOpen} onOpenChange={setLogoutOpen}>
        <AlertDialogContent className="bg-construction-slate border-construction-steel/30">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Log out</AlertDialogTitle>
            <AlertDialogDescription className="text-construction-concrete">
              Are you sure you want to log out?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-construction-steel text-construction-concrete">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout} className="bg-gradient-hero hover:opacity-90 text-white">
              Log out
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default DashboardLayout;