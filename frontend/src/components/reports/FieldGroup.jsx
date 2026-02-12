import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const FieldGroup = ({ label, fields, values = {}, onChange }) => {
  const getFieldStyles = (field) => {
    const styles = {
      generated: {
        border:
          "border-emerald-400 focus-visible:border-emerald-500 focus-visible:ring-emerald-500/20",
        dot: "bg-emerald-500",
      },
      added: {
        border:
          "border-blue-400 focus-visible:border-blue-500 focus-visible:ring-blue-500/20",
        dot: "bg-blue-500",
      },
      fixed: {
        border:
          "border-orange-400 focus-visible:border-orange-500 focus-visible:ring-orange-500/20",
        dot: "bg-orange-500",
      },
      check: {
        border:
          "border-purple-400 focus-visible:border-purple-500 focus-visible:ring-purple-500/20",
        dot: "bg-purple-500",
      },
    };
    return styles[field] || { border: "", dot: "bg-gray-400" };
  };

  const getFieldLabel = (field) => {
    const labels = {
      generated: "Generated",
      added: "Added",
      fixed: "Fixed",
      check: "Check",
    };
    return labels[field] || field.charAt(0).toUpperCase() + field.slice(1);
  };

  return (
    <div className="mb-5 p-4 bg-muted/30 rounded-lg border">
      <Label className="block text-sm font-semibold mb-3">{label}</Label>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {fields.map((field) => {
          const styles = getFieldStyles(field);
          return (
            <div key={field} className="space-y-1.5">
              <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <span className={cn("w-2 h-2 rounded-full", styles.dot)} />
                {getFieldLabel(field)}
              </Label>
              <Input
                type="number"
                value={values[field] ?? 0}
                onChange={(e) => onChange(field, e.target.value)}
                min="0"
                className={cn("text-center font-medium", styles.border)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default FieldGroup;
