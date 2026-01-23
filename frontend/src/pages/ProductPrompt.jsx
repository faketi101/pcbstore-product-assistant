import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import authService from "../services/api";

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
      <div className="min-h-screen bg-slate-100 flex items-center justify-center">
        <div className="text-xl font-semibold text-blue-600 animate-pulse">
          Loading Prompts...
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
      <div className="min-h-screen bg-slate-100 text-gray-800 p-8 font-sans">
        <div className="max-w-6xl mx-auto bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-2xl font-bold text-gray-900">
              Edit Prompt Templates
            </h1>
            <div className="flex gap-4">
              <button
                className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 rounded-lg hover:bg-red-100"
                onClick={handleReset}
              >
                Reset to Default
              </button>
              <div>
                <button
                  className="px-4 py-2 text-sm font-semibold text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 mr-4"
                  onClick={cancelEditing}
                >
                  Cancel
                </button>
                <button
                  className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-md"
                  onClick={saveEdits}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold">
                  Main Prompt Template
                </label>
                <button
                  className="px-3 py-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded hover:bg-orange-100"
                  onClick={handleResetMainPrompt}
                >
                  Reset Main
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                Use {"${variableName}"} for placeholders: productName,
                productSpecs, productCategory, productSubCategory, websiteName,
                location.
              </p>
              <textarea
                className="w-full p-4 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 min-h-[600px] font-mono whitespace-pre-wrap bg-gray-50"
                value={editMainPromptTemplate}
                onChange={(e) => setEditMainPromptTemplate(e.target.value)}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-semibold">
                  Static Prompt (2nd Prompt)
                </label>
                <button
                  className="px-3 py-1 text-xs font-semibold text-orange-600 bg-orange-50 rounded hover:bg-orange-100"
                  onClick={handleResetStaticPrompt}
                >
                  Reset Static
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-2">
                This is the static instruction prompt.
              </p>
              <textarea
                className="w-full p-4 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 min-h-[600px] font-mono whitespace-pre-wrap bg-gray-50"
                value={editStaticPrompt}
                onChange={(e) => setEditStaticPrompt(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 text-gray-800 p-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-2xl font-bold mb-2 text-gray-900">
                SEO Product Content Prompt Generator
              </h1>
              <p className="text-gray-500 text-sm">
                Generate long-form, SEO-optimized product prompts for PCB Store
              </p>
            </div>
            <button
              onClick={startEditing}
              className="px-4 py-2 text-xs font-semibold text-blue-600 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition"
            >
              Edit Templates
            </button>
          </div>

          <label className="block text-sm font-semibold mt-4 mb-2">
            Product Name
          </label>
          <input
            className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition-all"
            value={formData.productName}
            onChange={(e) =>
              setFormData({ ...formData, productName: e.target.value })
            }
            placeholder="e.g. NVIDIA RTX 4090"
          />

          <label className="block text-sm font-semibold mt-4 mb-2">
            Product Specifications / Information
          </label>
          <textarea
            className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition-all min-h-[120px] resize-y"
            value={formData.productSpecs}
            onChange={(e) =>
              setFormData({ ...formData, productSpecs: e.target.value })
            }
            placeholder="Paste raw specs here..."
          ></textarea>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mt-4 mb-2">
                Product Category
              </label>
              <input
                className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition-all"
                value={formData.productCategory}
                onChange={(e) =>
                  setFormData({ ...formData, productCategory: e.target.value })
                }
                placeholder="e.g. Graphics Card"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mt-4 mb-2">
                Product Sub-Category
              </label>
              <input
                className="w-full p-3 text-sm rounded-lg border border-gray-200 focus:outline-none focus:border-blue-600 focus:ring-[3px] focus:ring-blue-600/15 transition-all"
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

          <div className="flex flex-wrap gap-3 mt-6">
            <button
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-gradient-to-br from-blue-600 to-blue-800 text-white shadow-lg shadow-blue-600/25 hover:-translate-y-px hover:shadow-blue-600/35 transition-all cursor-pointer border-none"
              onClick={handleGenerate}
            >
              Generate Prompt
            </button>
            <button
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-gray-100 text-gray-800 border border-gray-200 hover:bg-indigo-50 hover:border-blue-600 transition-all cursor-pointer"
              onClick={() =>
                handleCopy(prompt, "Main prompt copied to clipboard!")
              }
            >
              Copy Main Prompt
            </button>
            <button
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-gray-100 text-gray-800 border border-gray-200 hover:bg-indigo-50 hover:border-blue-600 transition-all cursor-pointer"
              onClick={() =>
                handleCopy(staticPrompt, "Static prompt copied to clipboard!")
              }
            >
              Copy 2nd Prompt
            </button>
            <button
              className="px-6 py-3 text-sm font-semibold rounded-lg bg-red-50 text-red-600 border border-red-200 hover:bg-red-100 transition-all cursor-pointer"
              onClick={() => {
                setFormData({ ...formData, productName: "", productSpecs: "" });
                setPrompt("");
                toast.success("Form reset successfully");
              }}
            >
              Reset Form
            </button>
          </div>

          <div className="mt-8">
            <label className="block text-sm font-semibold mb-2">
              Generated Main Prompt
            </label>
            <textarea
              className="w-full p-3 text-sm rounded-lg border border-gray-200 min-h-[320px] font-mono whitespace-pre-wrap bg-gray-50 text-gray-600"
              readOnly
              value={prompt}
            />
          </div>

          <div className="mt-8">
            <label className="block text-sm font-semibold mb-2">
              Static Prompt – Key Features & Specification Table
            </label>
            <textarea
              className="w-full p-3 text-sm rounded-lg border border-gray-200 min-h-[320px] font-mono whitespace-pre-wrap bg-gray-50 text-gray-600"
              readOnly
              value={staticPrompt}
            />
          </div>
        </div>
        <footer className="text-center mt-8 text-xs text-gray-500">
          SEO Prompt Tool · Developed by TARIKUL ISLAM
        </footer>
      </div>
    </div>
  );
};

export default ProductPrompt;
