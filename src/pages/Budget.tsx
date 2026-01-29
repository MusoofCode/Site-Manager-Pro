import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ExpenseDialog } from "@/components/budget/ExpenseDialog";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const Budget = () => {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [projectBudgets, setProjectBudgets] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [expensesRes, projectsRes] = await Promise.all([
      supabase.from("expenses").select("*, projects(name)").order("date", { ascending: false }),
      supabase.from("projects").select("id, name, budget"),
    ]);

    setExpenses(expensesRes.data || []);

    // Calculate budgets
    const budgets = await Promise.all(
      (projectsRes.data || []).map(async (project) => {
        const { data: projectExpenses } = await supabase
          .from("expenses")
          .select("amount")
          .eq("project_id", project.id);

        const totalSpent = projectExpenses?.reduce((sum, e) => sum + Number(e.amount), 0) || 0;
        const remaining = Number(project.budget) - totalSpent;
        const percentage = Number(project.budget) > 0 ? (totalSpent / Number(project.budget)) * 100 : 0;

        return {
          ...project,
          totalSpent,
          remaining,
          percentage,
        };
      })
    );
    setProjectBudgets(budgets);

    // Monthly expenses
    const monthlyMap: Record<string, number> = {};
    (expensesRes.data || []).forEach((expense) => {
      const month = new Date(expense.date).toLocaleDateString("en-US", { month: "short", year: "numeric" });
      monthlyMap[month] = (monthlyMap[month] || 0) + Number(expense.amount);
    });

    const chartData = Object.entries(monthlyMap)
      .map(([month, amount]) => ({ month, amount }))
      .slice(-6);
    setMonthlyData(chartData);
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white">Budget & Costs</h1>
          <p className="text-construction-concrete">Track project expenses</p>
        </div>
        <Button
          onClick={() => setDialogOpen(true)}
          className="bg-gradient-hero hover:opacity-90"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Expense
        </Button>
      </div>

      {/* Budget Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {projectBudgets.map((project) => (
          <Card key={project.id} className="bg-gradient-card border-construction-steel/30">
            <CardHeader>
              <CardTitle className="text-white">{project.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-construction-concrete">Total Budget:</span>
                <span className="text-white font-medium">${Number(project.budget).toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-construction-concrete">Total Spent:</span>
                <span className="text-construction-orange font-medium">
                  ${project.totalSpent.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-construction-concrete">Remaining:</span>
                <span
                  className={`font-medium ${
                    project.remaining < 0 ? "text-red-400" : "text-green-400"
                  }`}
                >
                  ${project.remaining.toLocaleString()}
                </span>
              </div>
              <div>
                <div className="flex justify-between text-xs text-construction-concrete mb-1">
                  <span>Budget Usage</span>
                  <span>{Math.round(project.percentage)}%</span>
                </div>
                <Progress
                  value={project.percentage}
                  className={`h-2 ${project.percentage > 90 ? "bg-red-500/20" : ""}`}
                />
                {project.percentage > 90 && (
                  <p className="text-yellow-400 text-xs mt-2">⚠️ Budget threshold exceeded</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Monthly Chart */}
      {monthlyData.length > 0 && (
        <Card className="bg-gradient-card border-construction-steel/30">
          <CardHeader>
            <CardTitle className="text-white">Monthly Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#444" />
                <XAxis dataKey="month" stroke="#888" />
                <YAxis stroke="#888" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#1a1f2e", border: "1px solid #444", color: "#fff" }}
                  formatter={(value: any) => `$${Number(value).toLocaleString()}`}
                />
                <Bar dataKey="amount" fill="hsl(var(--construction-orange))" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Recent Expenses */}
      <Card className="bg-gradient-card border-construction-steel/30">
        <CardHeader>
          <CardTitle className="text-white">Recent Expenses</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.map((expense) => (
              <div key={expense.id} className="flex justify-between items-center p-3 bg-construction-dark rounded-lg">
                <div>
                  <p className="text-white font-medium">{expense.category}</p>
                  <p className="text-construction-concrete text-sm">{expense.description}</p>
                </div>
                <p className="text-construction-orange font-bold">${Number(expense.amount).toLocaleString()}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <ExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} onSuccess={fetchData} />
    </div>
  );
};

export default Budget;