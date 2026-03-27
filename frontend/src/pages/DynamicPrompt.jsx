import { useState, useEffect, useCallback } from "react";
import { useParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  Copy,
  Sparkles,
  RotateCcw,
  Pencil,
  Save,
  X,
  RefreshCw,
  FileText,
  FolderOpen,
  Layers,
  BookOpen,
  Zap,
  Globe,
} from "lucide-react";
import authService from "../services/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/loading";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";

// Icon map for dynamic icon rendering
const ICON_MAP = {
  FileText,
  FolderOpen,
  Layers,
  BookOpen,
  Zap,
  Globe,
  Sparkles,
};

// Color map for theming
const COLOR_MAP = {
  primary: {
    iconBg: "bg-primary/10",
    iconText: "text-primary",
  },
  emerald: {
    iconBg: "bg-emerald-100 dark:bg-emerald-900/30",
    iconText: "text-emerald-600 dark:text-emerald-400",
  },
  blue: {
    iconBg: "bg-blue-100 dark:bg-blue-900/30",
    iconText: "text-blue-600 dark:text-blue-400",
  },
  purple: {
    iconBg: "bg-purple-100 dark:bg-purple-900/30",
    iconText: "text-purple-600 dark:text-purple-400",
  },
  amber: {
    iconBg: "bg-amber-100 dark:bg-amber-900/30",
    iconText: "text-amber-600 dark:text-amber-400",
  },
  rose: {
    iconBg: "bg-rose-100 dark:bg-rose-900/30",
    iconText: "text-rose-600 dark:text-rose-400",
  },
};

// Textarea component
const Textarea = ({ className, ...props }) => (
  <textarea
    className={cn(
      "flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  />
);

const DynamicPrompt = () => {
  const { slug } = useParams();

  // Template data from server
  const [template, setTemplate] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Variable form values
  const [formData, setFormData] = useState({});

  // Generated outputs per prompt section
  const [generatedOutputs, setGeneratedOutputs] = useState({});

  // Editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editPrompts, setEditPrompts] = useState({});

  // Active tab (when multiple prompts exist)
  const [activeTab, setActiveTab] = useState("");

  // Load template
  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await authService.getTemplateBySlug(slug);
      setTemplate(data);

      // Initialize form data with defaults
      setFormData((prev) => {
        const initialForm = {};
        data.variables.forEach((v) => {
          initialForm[v.key] = prev[v.key] || v.defaultValue || "";
        });
        return initialForm;
      });

      // Set first prompt tab as active
      setActiveTab(
        (prev) => prev || (data.prompts.length > 0 ? data.prompts[0].key : ""),
      );
    } catch (err) {
      console.error("Failed to load template:", err);
      setError(err.message || "Failed to load template");
      toast.error("Failed to load prompt template");
    } finally {
      setIsLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    loadTemplate();
    // Reset state when slug changes
    setGeneratedOutputs({});
    setIsEditing(false);
    setActiveTab("");
    setFormData({});
  }, [slug, loadTemplate]);

  useEffect(() => {
    if (template) {
      document.title = `${template.name} - PCB Automation`;
    }
  }, [template]);

  // ── Helpers ─────────────────────────────────────────

  const getIcon = () => {
    const IconComp = ICON_MAP[template?.icon] || FileText;
    return IconComp;
  };

  const getColors = () => {
    return COLOR_MAP[template?.color] || COLOR_MAP.primary;
  };

  const handleCopy = async (text, successMsg) => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }
    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMsg);
      } catch {
        toast.error("Copy failed");
      }
    } else {
      toast.error("Clipboard access denied");
    }
  };

  // ── Variable replacement engine ─────────────────────

  const buildVariableRegex = (key) => {
    const escapedKey = key.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
    // Support both ${key} and {{key}} styles with optional spaces.
    return new RegExp(
      `\\$\\{\\s*${escapedKey}\\s*\\}|\\{\\{\\s*${escapedKey}\\s*\\}\\}`,
      "g",
    );
  };

  const generateForPrompt = (promptSection) => {
    if (!promptSection.hasVariables) {
      // Static prompt — return as-is
      return promptSection.template;
    }

    let generated = promptSection.template;

    // Build replacements from form data
    template.variables.forEach((v) => {
      const value = formData[v.key] || "";
      generated = generated.replace(buildVariableRegex(v.key), value);
    });

    return generated;
  };

  const handleGenerate = (promptSection) => {
    // Check required variables that this prompt uses
    const requiredVars = template.variables.filter((v) => v.required);
    for (const v of requiredVars) {
      // Only check if this prompt's template actually references this variable
      if (
        promptSection.hasVariables &&
        buildVariableRegex(v.key).test(promptSection.template || "")
      ) {
        if (!formData[v.key]?.trim()) {
          toast.error(`${v.name} is required`);
          return;
        }
      }
    }

    if (!promptSection.template?.trim()) {
      toast.error("Prompt template not loaded. Please refresh.");
      return;
    }

    const generated = generateForPrompt(promptSection);
    setGeneratedOutputs((prev) => ({
      ...prev,
      [promptSection.key]: generated,
    }));
    toast.success(`${promptSection.name} generated successfully`);
  };

  // ── Reset form ──────────────────────────────────────

  const handleResetForm = () => {
    const resetForm = {};
    template.variables.forEach((v) => {
      // Keep persistent variables
      resetForm[v.key] = v.persistent ? formData[v.key] : v.defaultValue || "";
    });
    setFormData(resetForm);
    setGeneratedOutputs({});
    toast.success("Form reset successfully");
  };

  // ── Editing (per-user template overrides) ───────────

  const startEditing = () => {
    const edits = {};
    template.prompts.forEach((p) => {
      edits[p.key] = p.template;
    });
    setEditPrompts(edits);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    // Validate non-empty
    for (const p of template.prompts) {
      if (!editPrompts[p.key]?.trim()) {
        toast.error(`"${p.name}" cannot be empty`);
        return;
      }
    }

    try {
      await authService.saveTemplateOverrides(template._id, editPrompts);

      // Update local state
      setTemplate((prev) => ({
        ...prev,
        prompts: prev.prompts.map((p) => ({
          ...p,
          template: editPrompts[p.key] || p.template,
        })),
      }));

      setIsEditing(false);
      toast.success("Prompts saved successfully!");
    } catch (err) {
      console.error("Failed to save prompts:", err);
      toast.error("Failed to save prompts");
    }
  };

  const handleResetAll = async () => {
    if (
      !window.confirm(
        "Reset ALL prompts to default? Your custom changes will be lost.",
      )
    ) {
      return;
    }
    try {
      await authService.resetAllTemplateOverrides(template._id);
      await loadTemplate();
      setIsEditing(false);
      toast.success("All prompts reset to default!");
    } catch {
      toast.error("Failed to reset prompts");
    }
  };

  const handleResetSinglePrompt = async (promptKey, promptName) => {
    if (
      !window.confirm(
        `Reset "${promptName}" to default? Your custom changes will be lost.`,
      )
    ) {
      return;
    }
    try {
      await authService.resetTemplatePromptOverride(template._id, promptKey);
      const data = await authService.getTemplateBySlug(slug);
      setTemplate(data);
      // Update edit state too
      const updatedPrompt = data.prompts.find((p) => p.key === promptKey);
      if (updatedPrompt) {
        setEditPrompts((prev) => ({
          ...prev,
          [promptKey]: updatedPrompt.template,
        }));
      }
      toast.success(`${promptName} reset to default!`);
    } catch {
      toast.error("Failed to reset prompt");
    }
  };

  // ── Loading / Error states ──────────────────────────

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" className="text-primary" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse">
            Loading Prompt Template...
          </p>
        </div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6 text-center space-y-4">
            <p className="text-destructive font-medium">
              {error || "Template not found"}
            </p>
            <Button variant="outline" onClick={() => window.history.back()}>
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const Icon = getIcon();
  const colors = getColors();
  const hasTabs = template.prompts.length > 1;

  // ── Editing View ────────────────────────────────────

  if (isEditing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    colors.iconBg,
                  )}
                >
                  <Pencil className={cn("h-5 w-5", colors.iconText)} />
                </div>
                <CardTitle>Edit {template.name} Templates</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={handleResetAll}
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset All
                </Button>
                <Button variant="outline" size="sm" onClick={cancelEditing}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button size="sm" onClick={saveEdits}>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={cn(
                "grid gap-6",
                template.prompts.length === 1
                  ? "grid-cols-1"
                  : "grid-cols-1 lg:grid-cols-2",
              )}
            >
              {template.prompts.map((p) => (
                <div key={p.key} className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label>{p.name}</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResetSinglePrompt(p.key, p.name)}
                      className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                    >
                      Reset {p.name}
                    </Button>
                  </div>
                  {p.description && (
                    <p className="text-xs text-muted-foreground">
                      {p.description}
                    </p>
                  )}
                  <Textarea
                    className="min-h-[500px] font-mono text-xs sm:text-sm bg-muted/30"
                    value={editPrompts[p.key] || ""}
                    onChange={(e) =>
                      setEditPrompts((prev) => ({
                        ...prev,
                        [p.key]: e.target.value,
                      }))
                    }
                  />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Helper: render variables for a specific prompt tab ──
  const getVariablesForPrompt = (promptSection) => {
    if (!promptSection.hasVariables) return [];

    const matchedVariables = template.variables.filter((v) =>
      buildVariableRegex(v.key).test(promptSection.template || ""),
    );

    // Fallback: if no placeholders matched but template has variables configured,
    // still show all variables so users can fill fields and fix placeholders.
    if (matchedVariables.length === 0 && template.variables.length > 0) {
      return template.variables;
    }

    return matchedVariables;
  };

  // ── Helper: render a variable input field ───────────
  const renderVariableField = (variable) => {
    const fieldId = `var-${variable.key}`;

    if (variable.type === "select") {
      return (
        <div
          key={variable.key}
          className={cn(
            "space-y-2",
            variable.gridColumn === "half" ? "" : "sm:col-span-2",
          )}
        >
          <Label htmlFor={fieldId}>
            {variable.name}
            {variable.required && <span className="text-destructive"> *</span>}
          </Label>
          <select
            id={fieldId}
            value={formData[variable.key] || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                [variable.key]: e.target.value,
              }))
            }
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">Select...</option>
            {(variable.options || []).map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>
      );
    }

    if (variable.type === "textarea") {
      return (
        <div key={variable.key} className="space-y-2 sm:col-span-2">
          <Label htmlFor={fieldId}>
            {variable.name}
            {variable.required && <span className="text-destructive"> *</span>}
          </Label>
          <Textarea
            id={fieldId}
            className="min-h-[120px] resize-y"
            value={formData[variable.key] || ""}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                [variable.key]: e.target.value,
              }))
            }
            placeholder={variable.placeholder || ""}
          />
        </div>
      );
    }

    // Default: text input
    return (
      <div
        key={variable.key}
        className={cn(
          "space-y-2",
          variable.gridColumn === "half" ? "" : "sm:col-span-2",
        )}
      >
        <Label htmlFor={fieldId}>
          {variable.name}
          {variable.required && <span className="text-destructive"> *</span>}
        </Label>
        <Input
          id={fieldId}
          value={formData[variable.key] || ""}
          onChange={(e) =>
            setFormData((prev) => ({
              ...prev,
              [variable.key]: e.target.value,
            }))
          }
          placeholder={variable.placeholder || ""}
        />
      </div>
    );
  };

  // ── Helper: render a prompt section content (variables + output only) ──
  const renderPromptSection = (promptSection) => {
    const vars = getVariablesForPrompt(promptSection);

    return (
      <div className="space-y-4">
        {/* Variable inputs */}
        {vars.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vars.map(renderVariableField)}
          </div>
        )}

        {/* Generated output */}
        <div className="space-y-2">
          <Label>
            {promptSection.hasVariables
              ? `Generated ${promptSection.name}`
              : promptSection.name}
          </Label>
          <Textarea
            className="min-h-[280px] font-mono text-xs sm:text-sm bg-muted/30"
            readOnly
            value={
              promptSection.hasVariables
                ? generatedOutputs[promptSection.key] || ""
                : promptSection.template
            }
          />
        </div>
      </div>
    );
  };

  // ── Unified action buttons row ──────────────────────
  const renderActionButtons = () => (
    <div className="flex flex-wrap gap-3">
      {template.prompts.map((p) => (
        <span key={p.key} className="contents">
          {p.hasVariables && (
            <Button onClick={() => handleGenerate(p)}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate{template.prompts.length > 1 ? ` ${p.name}` : ""}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() =>
              handleCopy(
                p.hasVariables ? generatedOutputs[p.key] || "" : p.template,
                `${p.name} copied to clipboard!`,
              )
            }
          >
            <Copy className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Copy {p.name}</span>
            <span className="sm:hidden">
              Copy {template.prompts.length > 1 ? p.name.split(" ")[0] : ""}
            </span>
          </Button>
        </span>
      ))}
      <Button variant="destructive" onClick={handleResetForm}>
        <RotateCcw className="h-4 w-4 mr-2" />
        Reset
      </Button>
    </div>
  );

  // ── Main View ───────────────────────────────────────

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-lg",
                    colors.iconBg,
                  )}
                >
                  <Icon className={cn("h-5 w-5", colors.iconText)} />
                </div>
                <div>
                  <CardTitle>{template.name}</CardTitle>
                  {template.description && (
                    <CardDescription>{template.description}</CardDescription>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadTemplate}>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Refresh</span>
                </Button>
                <Button variant="outline" size="sm" onClick={startEditing}>
                  <Pencil className="h-4 w-4 mr-2" />
                  <span className="hidden sm:inline">Edit Templates</span>
                  <span className="sm:hidden">Edit</span>
                </Button>
              </div>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Unified action buttons */}
            {renderActionButtons()}

            {hasTabs ? (
              <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="w-full"
              >
                <TabsList
                  className={cn(
                    "grid w-full mb-6",
                    `grid-cols-${Math.min(template.prompts.length, 4)}`,
                  )}
                  style={{
                    gridTemplateColumns: `repeat(${template.prompts.length}, minmax(0, 1fr))`,
                  }}
                >
                  {template.prompts.map((p) => {
                    const TabIcon = ICON_MAP[template.icon] || FileText;
                    return (
                      <TabsTrigger
                        key={p.key}
                        value={p.key}
                        className="flex items-center gap-2"
                      >
                        <TabIcon className="h-4 w-4" />
                        <span className="hidden sm:inline">{p.name}</span>
                        <span className="sm:hidden">
                          {p.name.split(" ")[0]}
                        </span>
                      </TabsTrigger>
                    );
                  })}
                </TabsList>

                {template.prompts.map((p) => (
                  <TabsContent key={p.key} value={p.key}>
                    {renderPromptSection(p)}
                  </TabsContent>
                ))}
              </Tabs>
            ) : (
              // Single prompt — no tabs needed
              template.prompts.map((p) => (
                <div key={p.key}>{renderPromptSection(p)}</div>
              ))
            )}
          </CardContent>
        </Card>

        <footer className="text-center mt-8 text-xs text-muted-foreground">
          {template.name} · PCB Automation
        </footer>
      </div>
    </div>
  );
};

export default DynamicPrompt;
