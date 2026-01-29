import { useState } from "react";
import { Outlet, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { NavLink } from "@/components/NavLink";
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
} from "lucide-react";
import logo from "@/assets/logo.png";

const DashboardLayout = () => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

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
            onClick={handleLogout}
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
        <Outlet />
      </main>
    </div>
  );
};

export default DashboardLayout;