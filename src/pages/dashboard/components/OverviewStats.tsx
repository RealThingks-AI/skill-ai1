import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface OverviewStatsProps {
  title: string;
  description?: string;
  children: React.ReactNode;
}

export const OverviewStats = ({ title, description, children }: OverviewStatsProps) => {
  return (
    <Card className="col-span-3">
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {children}
        </div>
      </CardContent>
    </Card>
  );
};

export const StatItem = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between">
    <Badge variant="secondary">{label}</Badge>
    <span className="text-sm text-muted-foreground">{value}</span>
  </div>
);