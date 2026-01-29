import { ReactNode } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface EmptyStateCardProps {
  title: string;
  description: string;
  action?: ReactNode;
}

export function EmptyStateCard({ title, description, action }: EmptyStateCardProps) {
  return (
    <Card className="bg-gradient-card border-construction-steel/30">
      <CardHeader>
        <CardTitle className="text-foreground">{title}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-construction-concrete">{description}</p>
        {action}
      </CardContent>
    </Card>
  );
}
