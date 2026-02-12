import { Plus, X, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const CustomFieldsSection = ({
  customFields,
  onAdd,
  onRemove,
  customFieldName,
  setCustomFieldName,
  customFieldValue,
  setCustomFieldValue,
}) => {
  const handleAdd = () => {
    if (!customFieldName.trim()) {
      toast.error("Please enter a field name");
      return;
    }
    if (customFieldValue === "" || customFieldValue === null) {
      toast.error("Please enter a value");
      return;
    }
    onAdd();
  };

  const handleKeyPress = (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="mt-6">
      <h3 className="text-lg font-medium mb-4 flex items-center gap-2">
        <Sparkles className="h-5 w-5 text-primary" />
        Custom Fields
      </h3>
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <Input
          type="text"
          placeholder="Field name"
          value={customFieldName}
          onChange={(e) => setCustomFieldName(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1"
        />
        <Input
          type="number"
          placeholder="Value"
          value={customFieldValue}
          onChange={(e) => setCustomFieldValue(e.target.value)}
          onKeyPress={handleKeyPress}
          min="0"
          className="w-full sm:w-32"
        />
        <Button type="button" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Add Field</span>
          <span className="sm:hidden">Add</span>
        </Button>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-2">
          {customFields.map((field, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-2.5 bg-muted/50 rounded-lg border hover:border-primary/30 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span className="font-medium">{field.name}</span>
                <Badge variant="secondary">{field.value}</Badge>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => onRemove(index)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsSection;
