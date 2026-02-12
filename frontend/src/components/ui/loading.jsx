import * as React from "react";
import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";

function Spinner({ className, size = "default" }) {
  const sizeClasses = {
    sm: "h-4 w-4",
    default: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <Loader2
      className={cn(
        "animate-spin text-muted-foreground",
        sizeClasses[size],
        className,
      )}
    />
  );
}

function LoadingOverlay({ show, message = "Loading..." }) {
  if (!show) return null;

  return (
    <div className="absolute inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 rounded-xl">
      <div className="flex flex-col items-center gap-3">
        <Spinner size="lg" className="text-primary" />
        <span className="text-sm font-medium text-muted-foreground">
          {message}
        </span>
      </div>
    </div>
  );
}

function EmptyState({ icon, title, description, action, className }) {
  // Handle both JSX elements and component references
  const renderIcon = () => {
    if (!icon) return null;
    // Check if icon is a JSX element (has $$typeof property) or a valid element
    if (React.isValidElement(icon)) {
      return icon;
    }
    // Otherwise treat it as a component reference
    const Icon = icon;
    return <Icon className="h-8 w-8 text-muted-foreground" />;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center py-12 text-center",
        className,
      )}
    >
      {icon && (
        <div className="rounded-full bg-muted p-4 mb-4 text-muted-foreground">
          {renderIcon()}
        </div>
      )}
      <h3 className="font-semibold text-foreground">{title}</h3>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

function Skeleton({ className }) {
  return <div className={cn("animate-pulse rounded-md bg-muted", className)} />;
}

export { Spinner, LoadingOverlay, EmptyState, Skeleton };
