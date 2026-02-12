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
  FolderOpen,
  ListChecks,
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

const CategoryPrompt = () => {
  const [formData, setFormData] = useState({
    productName: "",
    productMainCategory: "",
    productSubCategory: "",
    productSubCategory2: "",
    relatedCategories: "",
    specs: "",
  });

  // For Prompt 2 - Key Features & Specs
  const [productContent, setProductContent] = useState("");

  const [prompt1, setPrompt1] = useState("");
  const [prompt2, setPrompt2] = useState("");

  // Prompts State
  const [categoryPrompt1Template, setCategoryPrompt1Template] = useState("");
  const [categoryPrompt2Template, setCategoryPrompt2Template] = useState("");
  const [isEditing, setIsEditing] = useState(false);

  // Temporary state for editing
  const [editCategoryPrompt1, setEditCategoryPrompt1] = useState("");
  const [editCategoryPrompt2, setEditCategoryPrompt2] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Active tab for switching between the two prompts
  const [activeTab, setActiveTab] = useState("prompt1");

  useEffect(() => {
    document.title = "Category Prompt Generator - PCB Automation";
  }, []);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setIsLoading(true);
    try {
      const data = await authService.getCategoryPrompts();
      console.log("Loaded category prompts:", data);
      setCategoryPrompt1Template(data.categoryPrompt1 || "");
      setCategoryPrompt2Template(data.categoryPrompt2 || "");
    } catch (error) {
      console.error("Failed to load category prompts", error);
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
            Loading Category Prompts...
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

  const generatePrompt1 = () => {
    let generated = categoryPrompt1Template;

    // Build related categories string
    const relatedCatsArray = formData.relatedCategories
      .split(",")
      .map((c) => c.trim())
      .filter((c) => c);

    const replacements = {
      "${productName}": formData.productName,
      "${productMainCategory}": formData.productMainCategory,
      "${productSubCategory}": formData.productSubCategory,
      "${productSubCategory2}": formData.productSubCategory2,
      "${relatedCategories}": relatedCatsArray.join(", "),
      "${specs}": formData.specs,
    };

    Object.keys(replacements).forEach((key) => {
      // eslint-disable-next-line no-useless-escape
      const escapedKey = key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      generated = generated.replace(
        new RegExp(escapedKey, "g"),
        replacements[key] || "",
      );
    });

    // Clean up empty placeholders if fields were not provided
    // Remove lines with empty optional fields
    generated = generated
      .split("\n")
      .filter((line) => {
        // Keep line if it doesn't have empty placeholders for optional fields
        if (
          line.includes("Product Sub Category 2:") &&
          !formData.productSubCategory2
        )
          return false;
        if (
          line.includes("Product Related Category:") &&
          !formData.relatedCategories
        )
          return false;
        return true;
      })
      .join("\n");

    return generated;
  };

  const generatePrompt2 = () => {
    let generated = categoryPrompt2Template;

    const replacements = {
      "${productContent}": productContent,
    };

    Object.keys(replacements).forEach((key) => {
      // eslint-disable-next-line no-useless-escape
      const escapedKey = key.replace(/([.*+?^=!:${}()|\[\]\/\\])/g, "\\$1");
      generated = generated.replace(
        new RegExp(escapedKey, "g"),
        replacements[key] || "",
      );
    });

    return generated;
  };

  const handleGeneratePrompt1 = () => {
    const { productName, productMainCategory } = formData;

    if (!productName.trim()) {
      toast.error("Product name is required");
      return;
    }

    if (!productMainCategory.trim()) {
      toast.error("Product main category is required");
      return;
    }

    if (!categoryPrompt1Template || !categoryPrompt1Template.trim()) {
      toast.error(
        "SEO Category prompt template not loaded. Please refresh the page.",
      );
      return;
    }

    const generated = generatePrompt1();
    setPrompt1(generated);
    toast.success("SEO Category Prompt generated successfully");
  };

  const handleGeneratePrompt2 = () => {
    if (!productContent.trim()) {
      toast.error("Product content is required");
      return;
    }

    if (!categoryPrompt2Template || !categoryPrompt2Template.trim()) {
      toast.error(
        "Key Features & Specs prompt template not loaded. Please refresh the page.",
      );
      return;
    }

    const generated = generatePrompt2();
    setPrompt2(generated);
    toast.success("Key Features & Specs Prompt generated successfully");
  };

  const startEditing = () => {
    setEditCategoryPrompt1(categoryPrompt1Template);
    setEditCategoryPrompt2(categoryPrompt2Template);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
  };

  const saveEdits = async () => {
    if (!editCategoryPrompt1.trim() || !editCategoryPrompt2.trim()) {
      toast.error("Both prompts must have content before saving.");
      return;
    }

    try {
      console.log("Saving prompts:", {
        categoryPrompt1: editCategoryPrompt1.length,
        categoryPrompt2: editCategoryPrompt2.length,
      });
      await authService.saveCategoryPrompts({
        categoryPrompt1: editCategoryPrompt1,
        categoryPrompt2: editCategoryPrompt2,
      });
      setCategoryPrompt1Template(editCategoryPrompt1);
      setCategoryPrompt2Template(editCategoryPrompt2);
      setIsEditing(false);
      toast.success("Category prompts saved successfully!");
    } catch (error) {
      console.error("Failed to save prompts", error);
      toast.error("Failed to save prompts.");
    }
  };

  const handleResetAll = async () => {
    if (
      !window.confirm(
        "Are you sure you want to reset BOTH category prompts to default? This will overwrite your custom changes.",
      )
    ) {
      return;
    }
    try {
      await authService.resetCategoryPrompts();
      await loadPrompts();
      setIsEditing(false);
      toast.success("Both category prompts reset to default!");
    } catch (error) {
      console.error("Failed to reset prompts", error);
      toast.error("Failed to reset prompts.");
    }
  };

  const handleResetPrompt1 = async () => {
    if (
      !window.confirm(
        "Reset SEO Category Prompt to default? Your custom prompt will be overwritten.",
      )
    ) {
      return;
    }
    try {
      await authService.resetCategoryPrompt1();
      const data = await authService.getCategoryPrompts();
      setCategoryPrompt1Template(data.categoryPrompt1);
      setEditCategoryPrompt1(data.categoryPrompt1);
      toast.success("SEO Category prompt reset to default!");
    } catch (error) {
      console.error("Failed to reset prompt", error);
      toast.error("Failed to reset prompt.");
    }
  };

  const handleResetPrompt2 = async () => {
    if (
      !window.confirm(
        "Reset Key Features & Specs Prompt to default? Your custom prompt will be overwritten.",
      )
    ) {
      return;
    }
    try {
      await authService.resetCategoryPrompt2();
      const data = await authService.getCategoryPrompts();
      setCategoryPrompt2Template(data.categoryPrompt2);
      setEditCategoryPrompt2(data.categoryPrompt2);
      toast.success("Key Features & Specs prompt reset to default!");
    } catch (error) {
      console.error("Failed to reset prompt", error);
      toast.error("Failed to reset prompt.");
    }
  };

  if (isEditing) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-background p-4 sm:p-8">
        <Card className="max-w-6xl mx-auto">
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <Pencil className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <CardTitle>Edit Category Prompt Templates</CardTitle>
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
                <Button size="sm" variant="success" onClick={saveEdits}>
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
                  <Label>SEO Category Content Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPrompt1}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    Reset Prompt 1
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Placeholders: {"${productName}"}, {"${productMainCategory}"},{" "}
                  {"${productSubCategory}"}, {"${productSubCategory2}"},{" "}
                  {"${relatedCategories}"}, {"${specs}"}
                </p>
                <Textarea
                  className="min-h-[500px] font-mono text-xs sm:text-sm bg-muted/30"
                  value={editCategoryPrompt1}
                  onChange={(e) => setEditCategoryPrompt1(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label>Key Features & Specs Prompt</Label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleResetPrompt2}
                    className="text-amber-600 hover:text-amber-700 hover:bg-amber-50"
                  >
                    Reset Prompt 2
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Placeholder: {"${productContent}"}
                </p>
                <Textarea
                  className="min-h-[500px] font-mono text-xs sm:text-sm bg-muted/30"
                  value={editCategoryPrompt2}
                  onChange={(e) => setEditCategoryPrompt2(e.target.value)}
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
      <div className="max-w-5xl mx-auto">
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 dark:bg-emerald-900/30">
                  <FolderOpen className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <CardTitle>Category Content Prompt Generator</CardTitle>
                  <CardDescription>
                    Generate SEO-optimized category content and key
                    features/specs prompts
                  </CardDescription>
                </div>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={loadPrompts}>
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
          <CardContent>
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="w-full"
            >
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger
                  value="prompt1"
                  className="flex items-center gap-2"
                >
                  <FolderOpen className="h-4 w-4" />
                  <span className="hidden sm:inline">SEO Category Content</span>
                  <span className="sm:hidden">SEO</span>
                </TabsTrigger>
                <TabsTrigger
                  value="prompt2"
                  className="flex items-center gap-2"
                >
                  <ListChecks className="h-4 w-4" />
                  <span className="hidden sm:inline">Key Features & Specs</span>
                  <span className="sm:hidden">Features</span>
                </TabsTrigger>
              </TabsList>

              {/* Prompt 1 - SEO Category Content */}
              <TabsContent value="prompt1" className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-product-name">
                      Product Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cat-product-name"
                      value={formData.productName}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productName: e.target.value,
                        })
                      }
                      placeholder="e.g. NVIDIA RTX 4090"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-main-category">
                      Product Main Category{" "}
                      <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="cat-main-category"
                      value={formData.productMainCategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productMainCategory: e.target.value,
                        })
                      }
                      placeholder="e.g. PC Components"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cat-sub-category">
                      Product Sub Category
                    </Label>
                    <Input
                      id="cat-sub-category"
                      value={formData.productSubCategory}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productSubCategory: e.target.value,
                        })
                      }
                      placeholder="e.g. Graphics Cards"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cat-sub-category-2">
                      Product Sub Category 2
                    </Label>
                    <Input
                      id="cat-sub-category-2"
                      value={formData.productSubCategory2}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          productSubCategory2: e.target.value,
                        })
                      }
                      placeholder="e.g. NVIDIA GPUs"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-related">
                    Related Categories (comma separated)
                  </Label>
                  <Input
                    id="cat-related"
                    value={formData.relatedCategories}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        relatedCategories: e.target.value,
                      })
                    }
                    placeholder="e.g. Gaming Monitors, Power Supplies, CPU Coolers"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cat-specs">
                    Specs <span className="text-destructive">*</span>
                  </Label>
                  <Textarea
                    id="cat-specs"
                    className="min-h-[120px] resize-y"
                    value={formData.specs}
                    onChange={(e) =>
                      setFormData({ ...formData, specs: e.target.value })
                    }
                    placeholder="Paste product specifications here..."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="success" onClick={handleGeneratePrompt1}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate SEO Prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleCopy(
                        prompt1,
                        "SEO Category prompt copied to clipboard!",
                      )
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Prompt
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setFormData({
                        ...formData,
                        productName: "",
                        productMainCategory: "",
                        productSubCategory: "",
                        productSubCategory2: "",
                        relatedCategories: "",
                        specs: "",
                      });
                      setPrompt1("");
                      toast.success("Form reset successfully");
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Generated SEO Category Prompt</Label>
                  <Textarea
                    className="min-h-[280px] font-mono text-xs sm:text-sm bg-muted/30"
                    readOnly
                    value={prompt1}
                  />
                </div>
              </TabsContent>

              {/* Prompt 2 - Key Features & Specs */}
              <TabsContent value="prompt2" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="product-content">
                    Product Content <span className="text-destructive">*</span>
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Paste the complete product content/information here
                  </p>
                  <Textarea
                    id="product-content"
                    className="min-h-[200px] resize-y"
                    value={productContent}
                    onChange={(e) => setProductContent(e.target.value)}
                    placeholder="Paste complete product content here..."
                  />
                </div>

                <div className="flex flex-wrap gap-3">
                  <Button variant="success" onClick={handleGeneratePrompt2}>
                    <Sparkles className="h-4 w-4 mr-2" />
                    Generate Features Prompt
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() =>
                      handleCopy(
                        prompt2,
                        "Key Features & Specs prompt copied to clipboard!",
                      )
                    }
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Prompt
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={() => {
                      setProductContent("");
                      setPrompt2("");
                      toast.success("Form reset successfully");
                    }}
                  >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Reset
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label>Generated Key Features & Specs Prompt</Label>
                  <Textarea
                    className="min-h-[280px] font-mono text-xs sm:text-sm bg-muted/30"
                    readOnly
                    value={prompt2}
                  />
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        <footer className="text-center mt-8 text-xs text-muted-foreground">
          Category Prompt Tool · Developed by TARIKUL ISLAM
        </footer>
      </div>
    </div>
  );
};

export default CategoryPrompt;
