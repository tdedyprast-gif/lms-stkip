import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export function StatCard({ icon: Icon, label, value, accent = "primary", testid }) {
  return (
    <Card className="p-5 card-lift border-border" data-testid={testid}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.15em] font-bold text-muted-foreground">{label}</p>
          <p className="mt-2 font-heading text-3xl font-bold">{value}</p>
        </div>
        {Icon && (
          <div
            className="h-11 w-11 rounded-xl flex items-center justify-center"
            style={{ background: `hsl(var(--${accent}) / 0.12)`, color: `hsl(var(--${accent}))` }}
          >
            <Icon className="h-5 w-5" />
          </div>
        )}
      </div>
    </Card>
  );
}

export function ScoreBadge({ score, threshold = 65 }) {
  const ok = score >= threshold;
  return (
    <Badge
      className={`font-bold tabular-nums ${
        ok ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
      }`}
    >
      {Number(score).toFixed(1)}
    </Badge>
  );
}

export function StatusPill({ ok, okText = "Tercapai", badText = "Belum" }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${
        ok ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"
      }`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ok ? "bg-success" : "bg-destructive"}`} />
      {ok ? okText : badText}
    </span>
  );
}

export function PageHeader({ title, subtitle, children, testid }) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6" data-testid={testid}>
      <div>
        <h1 className="font-heading text-3xl font-bold tracking-tight">{title}</h1>
        {subtitle && <p className="text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      {children && <div className="flex items-center gap-2">{children}</div>}
    </div>
  );
}

export function EmptyState({ icon: Icon, title, subtitle, children }) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {Icon && (
        <div className="h-14 w-14 rounded-2xl bg-accent flex items-center justify-center mb-4">
          <Icon className="h-7 w-7 text-primary" />
        </div>
      )}
      <p className="font-heading font-semibold text-lg">{title}</p>
      {subtitle && <p className="text-muted-foreground text-sm mt-1 max-w-sm">{subtitle}</p>}
      {children && <div className="mt-5">{children}</div>}
    </div>
  );
}
