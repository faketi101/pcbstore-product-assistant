import { useState, useEffect } from "react";
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
import { cn } from "@/lib/utils";

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

const ProductPrompt = () => {
  const [formData, setFormData] = useState({
    productName: "",
    productSpecs: "",
    productCategory: "",
    productSubCategory: "",
    websiteName: "PCB Store",
    location: "Bangladesh",
  });

  const [prompt, setPrompt] = useState("");

  // Prompts State
  const [staticPrompt, setStaticPrompt] = useState("");
  const [mainPromptTemplate, setMainPromptTemplate] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Temporary state for editing
  const [editStaticPrompt, setEditStaticPrompt] = useState("");
  const [editMainPromptTemplate, setEditMainPromptTemplate] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    document.title = "Product Prompt Generator - PCB Automation";
  }, []);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getPrompts();
      setStaticPrompt(data.staticPrompt);
      setMainPromptTemplate(data.mainPromptTemplate);
    } catch (error) {
      console.error("Failed to load prompts", error);
      toast.error("Failed to load prompts from server.");
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <Spinner size="lg" className="text-primary" />
          <p className="text-lg font-medium text-muted-foreground animate-pulse">
            Loading Prompts...
          </p>
        </div>
      </div>
    );
  }

  const handleCopy = async (text, successMsg) => {
    if (!text) {
      toast.error("Nothing to copy");
      return;
    }

    if (navigator.clipboard) {
      try {
        await navigator.clipboard.writeText(text);
        toast.success(successMsg);
        return;
      } catch (err) {
        console.error("Clipboard API failed", err);
        toast.error("Copy failed");
      }
    } else {
      toast.error("Clipboard access denied");
    }
  };

  const generatePrompt = () => {
    let generated = mainPromptTemplate;
    // Replace all placeholders
    // Using string replacement for specific placeholders known in the template
    // Safe replacement:
    const replacements = {
      "${productName}": formData.productName,
      "${productSpecs}": formData.productSpecs,
      "${productCategory}": formData.productCategory,
      "${productSubCategory}": formData.productSubCategory,
      "${websiteName}": formData.websiteName,
      "${location}": formData.location,
    };

    // We can use a regex to replace any instance of ${key} even if user typed it
    // But we need to be careful about not replacing non-variables if any exist.
    // The template uses ${variable} syntax.

    Object.keys(replacements).forEach((key) => {
      // Create a regex that searches for the literal key globally
      // Escape the $ and { } for regex
      // eslint-disable-next-line no-useless-escape
      const escapedKey = key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      generated = generated.replace(
        new RegExp(escapedKey, "g"),
        replacements[key] || "",
      );
    });

    return generated;
  };

  const handleGenerate = () => {
    const { productName } = formData;

    if (!productName) {
      toast.error("Product name is required");
      return;
    }

    if (!mainPromptTemplate) {
      toast.error("Prompt template not loaded.");
      return;
    }

    const generated = generatePrompt();
    setPrompt(generated);
    toast.success("Prompt generated successfully");
  };

  const startEditing = () => {
    setEditStaticPrompt(staticPrompt);
    setEditMainPromptTemplate(mainPromptTemplate);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    try {
      await authService.savePrompts({
        staticPrompt: editStaticPrompt,
        mainPromptTemplate: editMainPromptTemplate,
      });
      setStaticPrompt(editStaticPrompt);
      setMainPromptTemplate(editMainPromptTemplate);
      setIsEditing(false);
      toast.success("Prompts saved successfully!");
    } catch (error) {
      console.error("Failed to save prompts", error);
      toast.error("Failed to save prompts.");
    }
  };

  const handleReset = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset BOTH prompts to default? This will overwrite your custom changes.",
      )
    ) {
      return;
    }
    try {
      await authService.resetPrompts();
      await loadPrompts();
      setIsEditing(false);
      toast.success("Both prompts reset to default!");
    } catch (error) {
      console.error("Failed to reset prompts", error);
      toast.error("Failed to reset prompts.");
    }
  };

  const handleResetMainPrompt = async () => {
    if (
      !window.confirm(
        "Reset Main Prompt to default? Your custom main prompt will be overwritten.",
      )
    ) {
      return;
    }
    try {
      await authService.resetMainPrompt();
      const data = await authService.getPrompts();
      setStaticPrompt(data.staticPrompt);
      setMainPromptTemplate(data.mainPromptTemplate);
      setEditStaticPrompt(data.staticPrompt);
      setEditMainPromptTemplate(data.mainPromptTemplate);
      toast.success("Main prompt reset to default!");
    } catch (error) {
      console.error("Failed to reset main prompt", error);
      toast.error("Failed to reset main prompt.");
    }
  };

  const handleResetStaticPrompt = async () => {
    if (
      !window.confirm(
        "Reset Static Prompt to default? Your custom static prompt will be overwritten.",
      )
    ) {
      return;
    }
    try {
      await authService.resetStaticPrompt();
      const data = await authService.getPrompts();
      setStaticPrompt(data.staticPrompt);
      setMainPromptTemplate(data.mainPromptTemplate);
      setEditStaticPrompt(data.staticPrompt);
      setEditMainPromptTemplate(data.mainPromptTemplate);
      toast.success("Static prompt reset to default!");
    } catch (error) {
      console.error("Failed to reset static prompt", error);
      toast.error("Failed to reset static prompt.");
    }
  };

  if (isEditing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Pencil className="h-5 w-5 text-primary" />
                </div>
                <CardTitle>Edit Prompt Templates</CardTitle>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="destructive" size="sm" onClick={handleReset}>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Main Prompt Template</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetMainPrompt}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    Reset Main
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Use {"${variableName}"} for placeholders: productName,
                  productSpecs, productCategory, productSubCategory,
                  websiteName, location.
                </p>
                <Textarea
                  className="min-h-[500px] font-mono text-xs sm:text-sm bg-muted/30"
                  value={editMainPromptTemplate}
                  onChange={(e) => setEditMainPromptTemplate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Static Prompt (2nd Prompt)</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetStaticPrompt}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    Reset Static
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  This is the static instruction prompt.
                </p>
                <Textarea
                  className="min-h-[500px] font-mono text-xs sm:text-sm bg-muted/30"
                  value={editStaticPrompt}
                  onChange={(e) => setEditStaticPrompt(e.target.value)}
                />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle>SEO Product Content Prompt Generator</CardTitle>
                  <CardDescription>
                    Generate long-form, SEO-optimized product prompts
                  </CardDescription>
                </div>
              </div>
              <Button variant="outline" size="sm" onClick={startEditing}>
                <Pencil className="h-4 w-4 mr-2" />
                Edit Templates
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="product-name">Product Name</Label>
              <Input
                id="product-name"
                value={formData.productName}
                onChange={(e) =>
                  setFormData({ ...formData, productName: e.target.value })
                }
                placeholder="e.g. NVIDIA RTX 4090"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="product-specs">
                Product Specifications / Information
              </Label>
              <Textarea
                id="product-specs"
                className="min-h-[120px] resize-y"
                value={formData.productSpecs}
                onChange={(e) =>
                  setFormData({ ...formData, productSpecs: e.target.value })
                }
                placeholder="Paste raw specs here..."
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="product-category">Product Category</Label>
                <Input
                  id="product-category"
                  value={formData.productCategory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productCategory: e.target.value,
                    })
                  }
                  placeholder="e.g. Graphics Card"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="product-subcategory">
                  Product Sub-Category
                </Label>
                <Input
                  id="product-subcategory"
                  value={formData.productSubCategory}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      productSubCategory: e.target.value,
                    })
                  }
                  placeholder="e.g. Desktop GPU"
                />
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button onClick={handleGenerate}>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate Prompt
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleCopy(prompt, "Main prompt copied to clipboard!")
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Copy Main Prompt</span>
                <span className="sm:hidden">Copy Main</span>
              </Button>
              <Button
                variant="outline"
                onClick={() =>
                  handleCopy(staticPrompt, "Static prompt copied to clipboard!")
                }
              >
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Copy 2nd Prompt</span>
                <span className="sm:hidden">Copy 2nd</span>
              </Button>
              <Button
                variant="destructive"
                onClick={() => {
                  setFormData({
                    ...formData,
                    productName: "",
                    productSpecs: "",
                  });
                  setPrompt("");
                  toast.success("Form reset successfully");
                }}
              >
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>

            <div className="space-y-2">
              <Label>Generated Main Prompt</Label>
              <Textarea
                className="min-h-[280px] font-mono text-xs sm:text-sm bg-muted/30"
                readOnly
                value={prompt}
              />
            </div>

            <div className="space-y-2">
              <Label>Static Prompt – Key Features & Specification Table</Label>
              <Textarea
                className="min-h-[280px] font-mono text-xs sm:text-sm bg-muted/30"
                readOnly
                value={staticPrompt}
              />
            </div>
          </CardContent>
        </Card>
        <footer className="text-center mt-8 text-xs text-muted-foreground">
          SEO Prompt Tool · Developed by TARIKUL ISLAM
        </footer>
      </div>
    </div>
  );
};

export default ProductPrompt;
