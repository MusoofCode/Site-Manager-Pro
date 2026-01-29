import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { FolderKanban, DollarSign, Package, TrendingUp, AlertTriangle, Wrench, Users } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";

const Dashboard = () => {
  const [stats, setStats] = useState({
    activeProjects: 0,
    totalBudget: 0,
    totalSpent: 0,
    lowStockItems: 0,
    equipmentInUse: 0,
    totalWorkers: 0,
  });
  const [projectsByStatus, setProjectsByStatus] = useState<any[]>([]);

  useEffect(() => {
    fetchStats();
  }, []);

  const fetchStats = async () => {
    const [projects, expenses, materials, equipment, workers, allProjects] = await Promise.all([
        supabase.from("projects").select("*").eq("status", "Active"),
        supabase.from("expenses").select("amount"),
        supabase.from("materials").select("*"),
      supabase.from("equipment").select("*").eq("available", false),
      supabase.from("workers").select("*"),
      supabase.from("projects").select("status"),
      ]);

      const totalBudget = projects.data?.reduce((sum, p) => sum + Number(p.budget), 0) || 0;
      const totalSpent = expenses.data?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
      const lowStock = materials.data?.filter((m) => m.quantity <= m.low_stock_threshold).length || 0;

      setStats({
        activeProjects: projects.data?.length || 0,
        totalBudget,
        totalSpent,
        lowStockItems: lowStock,
      equipmentInUse: equipment.data?.length || 0,
      totalWorkers: workers.data?.length || 0,
      });

    // Project status chart
    const statusCounts: Record<string, number> = {};
    allProjects.data?.forEach((p) => {
      statusCounts[p.status] = (statusCounts[p.status] || 0) + 1;
    });

    const chartData = Object.entries(statusCounts).map(([status, count]) => ({
      name: status,
      value: count,
    }));
    setProjectsByStatus(chartData);
  };

  const cards = [
    { title: "Active Projects", value: stats.activeProjects, icon: FolderKanban, color: "text-construction-orange" },
    { title: "Total Budget", value: `$${stats.totalBudget.toLocaleString()}`, icon: DollarSign, color: "text-green-400" },
    { title: "Total Spent", value: `$${stats.totalSpent.toLocaleString()}`, icon: TrendingUp, color: "text-blue-400" },
    { title: "Low Stock Items", value: stats.lowStockItems, icon: AlertTriangle, color: "text-yellow-400" },
    { title: "Equipment In Use", value: stats.equipmentInUse, icon: Wrench, color: "text-purple-400" },
    { title: "Total Workers", value: stats.totalWorkers, icon: Users, color: "text-cyan-400" },
  ];

  const COLORS = [
    "hsl(var(--construction-orange))",
    "hsl(var(--construction-steel))",
    "hsl(var(--construction-concrete))",
    "hsl(var(--foreground))",
  ];

  return (
    <div className="p-8 space-y-8 page-enter">
      <div>
        <h1 className="text-4xl font-bold text-foreground mb-2">Dashboard</h1>
        <p className="text-construction-concrete">Project overview and key metrics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card) => (
          <Card
            key={card.title}
            className="bg-gradient-card border-construction-steel/30 hover:shadow-construction transition-all duration-300 hover:scale-105"
          >
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-construction-concrete">{card.title}</CardTitle>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-foreground animate-fade-in">{card.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Project Status Chart */}
      {projectsByStatus.length > 0 && (
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-foreground">Projects by Status</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={projectsByStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {projectsByStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--construction-slate))",
                    border: "1px solid hsl(var(--construction-steel) / 0.6)",
                    color: "hsl(var(--foreground))",
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Dashboard;