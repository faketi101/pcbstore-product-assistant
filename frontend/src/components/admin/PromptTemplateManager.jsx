import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Plus,
  Pencil,
  Trash2,
  GripVertical,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Save,
  X,
  Copy,
  Variable,
} from "lucide-react";
import authService from "../../services/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const Textarea = ({ className, ...props }) => (
  <textarea
    className={cn(
      "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

const ICON_OPTIONS = [
  "FileText",
  "FolderOpen",
  "Layers",
  "BookOpen",
  "Zap",
  "Globe",
  "Sparkles",
];
const COLOR_OPTIONS = ["primary", "emerald", "blue", "purple", "amber", "rose"];
const VARIABLE_TYPES = ["text", "textarea", "select"];
const GRID_COLUMNS = ["full", "half"];

// ── Empty defaults ────────────────────────────────────

const emptyVariable = {
  name: "",
  key: "",
  type: "text",
  defaultValue: "",
  placeholder: "",
  required: false,
  persistent: false,
  options: [],
  order: 0,
  gridColumn: "full",
};

const emptyPrompt = {
  name: "",
  key: "",
  defaultTemplate: "",
  description: "",
  order: 0,
  hasVariables: true,
};

const emptyTemplate = {
  name: "",
  slug: "",
  description: "",
  icon: "FileText",
  color: "primary",
  order: 0,
  isActive: true,
  prompts: [],
  variables: [],
};

// ── Sub-component: Variable Editor ────────────────────

const VariableEditor = ({ variable, onChange, onRemove, index }) => {
  const [expanded, setExpanded] = useState(!variable.name);

  const update = (field, value) => {
    onChange({ ...variable, [field]: value });
  };

  const autoKey = (name) =>
    name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toLowerCase());

  return (
    <div className="border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <Variable className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium truncate">
            {variable.name || `Variable ${index + 1}`}
          </span>
          {variable.key && (
            <Badge variant="outline" className="text-xs font-mono">
              {"${" + variable.key + "}"}
            </Badge>
          )}
          {variable.required && (
            <Badge variant="destructive" className="text-xs">
              Required
            </Badge>
          )}
          {variable.persistent && (
            <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              Persistent
            </Badge>
          )}
        </button>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        {variable.key && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20"
            onClick={(e) => {
              e.stopPropagation();
              const placeholder = `\${${variable.key}}`;
              navigator.clipboard.writeText(placeholder);
              toast.success(`Copied: ${placeholder}`);
            }}
            title="Copy variable placeholder"
          >
            <Copy className="h-3.5 w-3.5" />
          </Button>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <Label className="text-xs">Display Name</Label>
            <Input
              value={variable.name}
              onChange={(e) => {
                const nextName = e.target.value;
                const shouldAutoGenerateKey =
                  !variable.key || variable.key === autoKey(variable.name);

                onChange({
                  ...variable,
                  name: nextName,
                  ...(shouldAutoGenerateKey ? { key: autoKey(nextName) } : {}),
                });
              }}
              placeholder="e.g. Product Name"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">
              Variable Key{" "}
              <span className="text-muted-foreground">(used in template)</span>
            </Label>
            <Input
              value={variable.key}
              onChange={(e) =>
                update("key", e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
              }
              placeholder="e.g. productName"
              className="h-8 text-sm font-mono"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Type</Label>
            <select
              value={variable.type}
              onChange={(e) => update("type", e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {VARIABLE_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Grid Column</Label>
            <select
              value={variable.gridColumn}
              onChange={(e) => update("gridColumn", e.target.value)}
              className="flex h-8 w-full rounded-md border border-input bg-transparent px-2 text-sm"
            >
              {GRID_COLUMNS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Default Value</Label>
            <Input
              value={variable.defaultValue}
              onChange={(e) => update("defaultValue", e.target.value)}
              placeholder="Optional default"
              className="h-8 text-sm"
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Placeholder</Label>
            <Input
              value={variable.placeholder}
              onChange={(e) => update("placeholder", e.target.value)}
              placeholder="e.g. Enter product name"
              className="h-8 text-sm"
            />
          </div>
          {variable.type === "select" && (
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">
                Options{" "}
                <span className="text-muted-foreground">(comma separated)</span>
              </Label>
              <Input
                value={(variable.options || []).join(", ")}
                onChange={(e) =>
                  update(
                    "options",
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="Option 1, Option 2, Option 3"
                className="h-8 text-sm"
              />
            </div>
          )}
          <div className="sm:col-span-2 flex gap-4">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={variable.required}
                onChange={(e) => update("required", e.target.checked)}
                className="rounded"
              />
              Required
            </label>
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input
                type="checkbox"
                checked={variable.persistent}
                onChange={(e) => update("persistent", e.target.checked)}
                className="rounded"
              />
              Persistent after reset
            </label>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Sub-component: Prompt Section Editor ──────────────

const PromptSectionEditor = ({ prompt, onChange, onRemove, index }) => {
  const [expanded, setExpanded] = useState(!prompt.name);

  const update = (field, value) => {
    onChange({ ...prompt, [field]: value });
  };

  const autoKey = (name) =>
    name
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+(.)/g, (_, c) => c.toUpperCase())
      .replace(/^\w/, (c) => c.toLowerCase());

  return (
    <div className="border rounded-lg p-3 bg-muted/20">
      <div className="flex items-center gap-2">
        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
        <button
          onClick={() => setExpanded(!expanded)}
          className="flex-1 flex items-center gap-2 text-left"
        >
          <span className="text-sm font-medium truncate">
            {prompt.name || `Prompt Section ${index + 1}`}
          </span>
          {prompt.key && (
            <Badge variant="outline" className="text-xs font-mono">
              {prompt.key}
            </Badge>
          )}
          {!prompt.hasVariables && (
            <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              Static
            </Badge>
          )}
        </button>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:bg-destructive/10"
          onClick={onRemove}
        >
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Prompt Name</Label>
              <Input
                value={prompt.name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  const shouldAutoGenerateKey =
                    !prompt.key || prompt.key === autoKey(prompt.name);

                  onChange({
                    ...prompt,
                    name: nextName,
                    ...(shouldAutoGenerateKey
                      ? { key: autoKey(nextName) }
                      : {}),
                  });
                }}
                placeholder="e.g. Main Prompt"
                className="h-8 text-sm"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Key</Label>
              <Input
                value={prompt.key}
                onChange={(e) =>
                  update("key", e.target.value.replace(/[^a-zA-Z0-9]/g, ""))
                }
                placeholder="e.g. mainPrompt"
                className="h-8 text-sm font-mono"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Description / Help Text</Label>
            <Input
              value={prompt.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Instructions shown when editing"
              className="h-8 text-sm"
            />
          </div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={prompt.hasVariables}
              onChange={(e) => update("hasVariables", e.target.checked)}
              className="rounded"
            />
            Uses variable replacement ({"${variable}"} placeholders)
          </label>
          <div className="space-y-1">
            <Label className="text-xs">Default Template</Label>
            <Textarea
              value={prompt.defaultTemplate}
              onChange={(e) => update("defaultTemplate", e.target.value)}
              placeholder="Paste the default prompt template text here..."
              className="min-h-[200px] font-mono text-xs"
            />
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Component ────────────────────────────────────

const PromptTemplateManager = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const data = await authService.getAdminTemplates();
      setTemplates(data);
    } catch (err) {
      console.error("Error fetching templates:", err);
      toast.error("Failed to fetch prompt templates");
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingTemplate({ ...emptyTemplate });
    setIsCreating(true);
  };

  const handleEdit = (template) => {
    setEditingTemplate(JSON.parse(JSON.stringify(template)));
    setIsCreating(false);
  };

  const handleDelete = async (template) => {
    if (
      !window.confirm(
        `Delete "${template.name}"? This will also delete all user overrides for this template.`,
      )
    ) {
      return;
    }
    try {
      await authService.deleteAdminTemplate(template._id);
      toast.success("Template deleted");
      fetchTemplates();
    } catch {
      toast.error("Failed to delete template");
    }
  };

  const handleToggleActive = async (template) => {
    try {
      await authService.updateAdminTemplate(template._id, {
        isActive: !template.isActive,
      });
      toast.success(
        template.isActive ? "Template deactivated" : "Template activated",
      );
      fetchTemplates();
    } catch {
      toast.error("Failed to update template");
    }
  };

  const handleSave = async () => {
    if (!editingTemplate.name?.trim()) {
      toast.error("Template name is required");
      return;
    }

    // Validate prompts
    for (const p of editingTemplate.prompts) {
      if (!p.name?.trim() || !p.key?.trim()) {
        toast.error("All prompts must have a name and key");
        return;
      }
    }

    // Validate variables
    for (const v of editingTemplate.variables) {
      if (!v.name?.trim() || !v.key?.trim()) {
        toast.error("All variables must have a name and key");
        return;
      }
    }

    // Auto-assign order
    editingTemplate.prompts = editingTemplate.prompts.map((p, i) => ({
      ...p,
      order: i,
    }));
    editingTemplate.variables = editingTemplate.variables.map((v, i) => ({
      ...v,
      order: i,
    }));

    setSaving(true);
    try {
      if (isCreating) {
        await authService.createAdminTemplate(editingTemplate);
        toast.success("Template created!");
      } else {
        await authService.updateAdminTemplate(
          editingTemplate._id,
          editingTemplate,
        );
        toast.success("Template updated!");
      }
      setEditingTemplate(null);
      fetchTemplates();
    } catch (err) {
      toast.error(err.message || "Failed to save template");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setEditingTemplate(null);
  };

  // ── Edit Form ──────────────────────────────────────

  if (editingTemplate) {
    const t = editingTemplate;
    const updateField = (field, value) => {
      setEditingTemplate((prev) => ({ ...prev, [field]: value }));
    };

    const autoSlug = (name) =>
      name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");

    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <h3 className="text-lg font-semibold">
            {isCreating ? "Create New Template" : `Edit: ${t.name}`}
          </h3>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel}>
              <X className="h-4 w-4 mr-1" /> Cancel
            </Button>
            <Button size="sm" onClick={handleSave} disabled={saving}>
              <Save className="h-4 w-4 mr-1" /> {saving ? "Saving..." : "Save"}
            </Button>
          </div>
        </div>

        {/* Basic Info */}
        <div className="border rounded-lg p-4 space-y-4">
          <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
            Basic Information
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-sm">Template Name</Label>
              <Input
                value={t.name}
                onChange={(e) => {
                  const nextName = e.target.value;
                  const shouldAutoGenerateSlug =
                    !t.slug || t.slug === autoSlug(t.name);

                  setEditingTemplate((prev) => ({
                    ...prev,
                    name: nextName,
                    ...(shouldAutoGenerateSlug
                      ? { slug: autoSlug(nextName) }
                      : {}),
                  }));
                }}
                placeholder="e.g. Product Prompt"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">
                URL Slug{" "}
                <span className="text-muted-foreground">(auto-generated)</span>
              </Label>
              <Input
                value={t.slug}
                onChange={(e) =>
                  updateField(
                    "slug",
                    e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""),
                  )
                }
                placeholder="e.g. product-prompt"
                className="font-mono"
              />
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-sm">Description</Label>
              <Input
                value={t.description}
                onChange={(e) => updateField("description", e.target.value)}
                placeholder="Brief description shown on the page"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Icon</Label>
              <select
                value={t.icon}
                onChange={(e) => updateField("icon", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {ICON_OPTIONS.map((ico) => (
                  <option key={ico} value={ico}>
                    {ico}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Color Theme</Label>
              <select
                value={t.color}
                onChange={(e) => updateField("color", e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {COLOR_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <Label className="text-sm">Display Order</Label>
              <Input
                type="number"
                value={t.order}
                onChange={(e) =>
                  updateField("order", parseInt(e.target.value) || 0)
                }
              />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm cursor-pointer pb-2">
                <input
                  type="checkbox"
                  checked={t.isActive}
                  onChange={(e) => updateField("isActive", e.target.checked)}
                  className="rounded"
                />
                Active (visible to users)
              </label>
            </div>
          </div>
        </div>

        {/* Variables Section */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Variables
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateField("variables", [
                  ...t.variables,
                  { ...emptyVariable, order: t.variables.length },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Variable
            </Button>
          </div>

          {t.variables.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No variables defined. Add variables that users will fill in.
            </p>
          ) : (
            <div className="space-y-2">
              {t.variables.map((v, i) => (
                <VariableEditor
                  key={i}
                  variable={v}
                  index={i}
                  onChange={(updated) => {
                    const vars = [...t.variables];
                    vars[i] = updated;
                    updateField("variables", vars);
                  }}
                  onRemove={() => {
                    const vars = t.variables.filter((_, idx) => idx !== i);
                    updateField("variables", vars);
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Prompt Sections */}
        <div className="border rounded-lg p-4 space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium text-sm text-muted-foreground uppercase tracking-wider">
              Prompt Sections
            </h4>
            <Button
              variant="outline"
              size="sm"
              onClick={() =>
                updateField("prompts", [
                  ...t.prompts,
                  { ...emptyPrompt, order: t.prompts.length },
                ])
              }
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Add Prompt
            </Button>
          </div>

          {t.prompts.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-4">
              No prompt sections defined. Add at least one prompt section.
            </p>
          ) : (
            <div className="space-y-2">
              {t.prompts.map((p, i) => (
                <PromptSectionEditor
                  key={i}
                  prompt={p}
                  index={i}
                  onChange={(updated) => {
                    const prompts = [...t.prompts];
                    prompts[i] = updated;
                    updateField("prompts", prompts);
                  }}
                  onRemove={() => {
                    const prompts = t.prompts.filter((_, idx) => idx !== i);
                    updateField("prompts", prompts);
                  }}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Template List ──────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Prompt Templates</h2>
        <Button onClick={handleCreate}>
          <Plus className="h-4 w-4 mr-2" />
          Create Template
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12">
          <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      ) : templates.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
          <p>No prompt templates yet.</p>
          <p className="text-sm mt-1">
            Create your first template to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <div
              key={t._id}
              className="flex items-center gap-4 p-4 rounded-lg border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium">{t.name}</span>
                  <Badge variant="outline" className="text-xs font-mono">
                    /{t.slug}
                  </Badge>
                  {t.isActive ? (
                    <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
                      Active
                    </Badge>
                  ) : (
                    <Badge variant="secondary" className="text-xs">
                      Inactive
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-0.5 truncate">
                  {t.description || "No description"}
                </p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>{t.prompts?.length || 0} prompts</span>
                  <span>{t.variables?.length || 0} variables</span>
                  <span>Order: {t.order}</span>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleToggleActive(t)}
                  title={t.isActive ? "Deactivate" : "Activate"}
                >
                  {t.isActive ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleEdit(t)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:bg-destructive/10"
                  onClick={() => handleDelete(t)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PromptTemplateManager;
