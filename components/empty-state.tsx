import { type LucideIcon } from "lucide-react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="bg-white rounded-2xl border border-kvsr-soft p-12 text-center shadow-sm">
      <div className="w-12 h-12 rounded-xl bg-kvsr-navy/5 flex items-center justify-center mx-auto mb-4">
        <Icon className="w-6 h-6 text-kvsr-muted" />
      </div>
      <p className="font-semibold text-kvsr-ink">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
          {description}
        </p>
      )}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
