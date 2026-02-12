import { useState, useEffect } from "react";
import { Plus, Pencil, ClipboardList, Check, RotateCcw, X } from "lucide-react";
import FieldGroup from "./FieldGroup";
import CustomFieldsSection from "./CustomFieldsSection";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/ui/loading";

const STORAGE_KEY = "pcb_automation_report_form";

const ReportForm = ({ editingReport, setEditingReport, onSuccess }) => {
  useEffect(() => {
    document.title = editingReport
      ? "Edit Report - PCB Automation"
      : "Create Report - PCB Automation";
  }, [editingReport]);

  const getInitialFormData = () => {
    if (editingReport) {
      // Handle migration from old 'keyFeatures' field to 'keyFeatures'
      const data = editingReport.data;
      const keyFeatures = data.keyFeatures ||
        data.keyFeatures || { generated: 0, added: 0 };

      return {
        date: editingReport.date,
        time: editingReport.time,
        description: data.description || { generated: 0, added: 0 },
        faq: data.faq || { generated: 0, added: 0 },
        keyFeatures: keyFeatures,
        specifications: data.specifications || { generated: 0, added: 0 },
        metaTitleDescription: data.metaTitleDescription || {
          generated: 0,
          added: 0,
        },
        titleFixed: data.titleFixed || { fixed: 0, added: 0 },
        imageRenamed: data.imageRenamed || { fixed: 0 },
        productReCheck: data.productReCheck || { check: 0, fixed: 0 },
        category: data.category || { added: 0 },
        attributes: data.attributes || { added: 0 },
        deliveryCharge: data.deliveryCharge || { added: 0 },
        warranty: data.warranty || { added: 0 },
        warrantyClaimReasons: data.warrantyClaimReasons || { added: 0 },
        brand: data.brand || { added: 0 },
        price: data.price || { added: 0 },
        internalLink: data.internalLink || { added: 0 },
        customFields: data.customFields || [],
      };
    }

    // Try to load from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Handle migration from old 'keyFeatures' field to 'keyFeatures'
        if (parsedData.keyFeatures && !parsedData.keyFeatures) {
          // eslint-disable-next-line
          parsedData.keyFeatures = parsedData.keyFeatures;
          delete parsedData.keyFeatures;
        }
        // Ensure keyFeatures exists
        if (!parsedData.keyFeatures) {
          parsedData.keyFeatures = { generated: 0, added: 0 };
        }
        // Ensure internalLink exists
        if (!parsedData.internalLink) {
          parsedData.internalLink = { added: 0 };
        }
        // Ensure customFields exists and is an array
        if (
          !parsedData.customFields ||
          !Array.isArray(parsedData.customFields)
        ) {
          parsedData.customFields = [];
        }
        // Update date and time to current when loading from localStorage
        parsedData.date = new Date().toISOString().split("T")[0];
        parsedData.time = `${new Date().getHours().toString().padStart(2, "0")}:00`;
        return parsedData;
      } catch (error) {
        console.error("Failed to parse saved form data:", error);
      }
    }

    // Default empty form
    return {
      date: new Date().toISOString().split("T")[0],
      time: `${new Date().getHours().toString().padStart(2, "0")}:00`,
      description: { generated: 0, added: 0 },
      faq: { generated: 0, added: 0 },
      keyFeatures: { generated: 0, added: 0 },
      specifications: { generated: 0, added: 0 },
      metaTitleDescription: { generated: 0, added: 0 },
      titleFixed: { fixed: 0, added: 0 },
      imageRenamed: { fixed: 0 },
      productReCheck: { check: 0, fixed: 0 },
      category: { added: 0 },
      attributes: { added: 0 },
      deliveryCharge: { added: 0 },
      warranty: { added: 0 },
      warrantyClaimReasons: { added: 0 },
      brand: { added: 0 },
      price: { added: 0 },
      internalLink: { added: 0 },
      customFields: [],
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState("");

  // Update form data when editingReport changes
  useEffect(() => {
    setFormData(getInitialFormData());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingReport]);

  // Save to localStorage whenever formData changes (but not when editing)
  useEffect(() => {
    if (!editingReport) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(formData));
    }
  }, [formData, editingReport]);

  const handleFieldChange = (field, subField, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: {
        ...prev[field],
        [subField]: parseInt(value) || 0,
      },
    }));
  };

  const addCustomField = () => {
    if (!customFieldName.trim()) {
      toast.error("Please enter a field name");
      return;
    }

    if (customFieldValue === "" || customFieldValue === null) {
      toast.error("Please enter a value");
      return;
    }

    setFormData((prev) => ({
      ...prev,
      customFields: [
        ...(prev.customFields || []),
        {
          name: customFieldName.trim(),
          value: parseInt(customFieldValue) || 0,
        },
      ],
    }));

    setCustomFieldName("");
    setCustomFieldValue("");
    toast.success("Custom field added");
  };

  const removeCustomField = (index) => {
    setFormData((prev) => ({
      ...prev,
      customFields: prev.customFields.filter((_, i) => i !== index),
    }));
  };

  const resetForm = () => {
    const emptyForm = {
      date: new Date().toISOString().split("T")[0],
      time: `${new Date().getHours().toString().padStart(2, "0")}:00`,
      description: { generated: 0, added: 0 },
      faq: { generated: 0, added: 0 },
      keyFeatures: { generated: 0, added: 0 },
      specifications: { generated: 0, added: 0 },
      metaTitleDescription: { generated: 0, added: 0 },
      titleFixed: { fixed: 0, added: 0 },
      imageRenamed: { fixed: 0 },
      productReCheck: { check: 0, fixed: 0 },
      category: { added: 0 },
      attributes: { added: 0 },
      deliveryCharge: { added: 0 },
      warranty: { added: 0 },
      warrantyClaimReasons: { added: 0 },
      brand: { added: 0 },
      price: { added: 0 },
      internalLink: { added: 0 },
      customFields: [],
    };
    setFormData(emptyForm);
    setCustomFieldName("");
    setCustomFieldValue("");
    localStorage.removeItem(STORAGE_KEY);
    toast.success("Form reset successfully");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const reportData = {
        date: formData.date,
        time: formData.time,
        data: {
          description: formData.description,
          faq: formData.faq,
          keyFeatures: formData.keyFeatures,
          specifications: formData.specifications,
          metaTitleDescription: formData.metaTitleDescription,
          titleFixed: formData.titleFixed,
          imageRenamed: formData.imageRenamed,
          productReCheck: formData.productReCheck,
          category: formData.category,
          attributes: formData.attributes,
          deliveryCharge: formData.deliveryCharge,
          warranty: formData.warranty,
          warrantyClaimReasons: formData.warrantyClaimReasons,
          brand: formData.brand,
          price: formData.price,
          internalLink: formData.internalLink,
          customFields: formData.customFields,
        },
      };

      if (editingReport) {
        await reportService.updateHourlyReport(editingReport.id, reportData);
        toast.success("Report updated successfully!");
        setEditingReport(null);
      } else {
        await reportService.createHourlyReport(reportData);
        // Clear localStorage after successful submission
        localStorage.removeItem(STORAGE_KEY);
        toast.success("Hourly report created successfully!");
      }

      resetForm();
      onSuccess();
    } catch (error) {
      console.error("Error saving report:", error);
      toast.error(error.response?.data?.message || "Failed to save report");
    }
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmitWithLoading = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await handleSubmit(e);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div
            className={`flex h-10 w-10 items-center justify-center rounded-lg ${editingReport ? "bg-amber-100 dark:bg-amber-900/30" : "bg-primary/10"}`}
          >
            {editingReport ? (
              <Pencil className="h-5 w-5 text-amber-600 dark:text-amber-400" />
            ) : (
              <Plus className="h-5 w-5 text-primary" />
            )}
          </div>
          <div>
            <CardTitle>
              {editingReport ? "Edit Report" : "Create Hourly Report"}
            </CardTitle>
            <CardDescription>
              {editingReport
                ? `Editing report from ${editingReport.date} at ${editingReport.time}`
                : "Track your hourly work progress"}
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form id="report-form" onSubmit={handleSubmitWithLoading}>
          {/* Indicator Legend */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30 border border-blue-200 dark:border-blue-800 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-3">
              Field Type Indicators
            </h4>
            <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Generated:</strong>{" "}
                  AI/automated
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full shadow-sm"></span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Added:</strong> Manual
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded-full shadow-sm"></span>
                <span className="text-muted-foreground">
                  <strong className="text-foreground">Fixed:</strong> Corrected
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <div className="space-y-2">
              <Label htmlFor="report-date">Date</Label>
              <Input
                id="report-date"
                type="date"
                value={formData.date}
                onChange={(e) =>
                  setFormData({ ...formData, date: e.target.value })
                }
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="report-time">Time</Label>
              <Input
                id="report-time"
                type="time"
                value={formData.time}
                onChange={(e) =>
                  setFormData({ ...formData, time: e.target.value })
                }
                required
              />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-primary" />
              Product Work
            </h3>
          </div>

          <FieldGroup
            label="Description"
            fields={["generated", "added"]}
            values={formData.description}
            onChange={(field, value) =>
              handleFieldChange("description", field, value)
            }
          />

          <FieldGroup
            label="FAQ"
            fields={["generated", "added"]}
            values={formData.faq}
            onChange={(field, value) => handleFieldChange("faq", field, value)}
          />

          <FieldGroup
            label="Key Features"
            fields={["generated", "added"]}
            values={formData.keyFeatures}
            onChange={(field, value) =>
              handleFieldChange("keyFeatures", field, value)
            }
          />

          <FieldGroup
            label="Specifications"
            fields={["generated", "added"]}
            values={formData.specifications}
            onChange={(field, value) =>
              handleFieldChange("specifications", field, value)
            }
          />

          <FieldGroup
            label="Meta Title & Description"
            fields={["generated", "added"]}
            values={formData.metaTitleDescription}
            onChange={(field, value) =>
              handleFieldChange("metaTitleDescription", field, value)
            }
          />

          <FieldGroup
            label="Title"
            fields={["fixed", "added"]}
            values={formData.titleFixed}
            onChange={(field, value) =>
              handleFieldChange("titleFixed", field, value)
            }
          />

          <FieldGroup
            label="Image Renamed & Fixed"
            fields={["fixed"]}
            values={formData.imageRenamed}
            onChange={(field, value) =>
              handleFieldChange("imageRenamed", field, value)
            }
          />

          <FieldGroup
            label="Product ReCheck"
            fields={["check", "fixed"]}
            values={formData.productReCheck}
            onChange={(field, value) =>
              handleFieldChange("productReCheck", field, value)
            }
          />

          <FieldGroup
            label="Category"
            fields={["added"]}
            values={formData.category}
            onChange={(field, value) =>
              handleFieldChange("category", field, value)
            }
          />

          <FieldGroup
            label="Attributes"
            fields={["added"]}
            values={formData.attributes}
            onChange={(field, value) =>
              handleFieldChange("attributes", field, value)
            }
          />

          <FieldGroup
            label="Delivery Charge"
            fields={["added"]}
            values={formData.deliveryCharge}
            onChange={(field, value) =>
              handleFieldChange("deliveryCharge", field, value)
            }
          />

          <FieldGroup
            label="Warranty"
            fields={["added"]}
            values={formData.warranty}
            onChange={(field, value) =>
              handleFieldChange("warranty", field, value)
            }
          />

          <FieldGroup
            label="Warranty Claim Reasons"
            fields={["added"]}
            values={formData.warrantyClaimReasons}
            onChange={(field, value) =>
              handleFieldChange("warrantyClaimReasons", field, value)
            }
          />

          <FieldGroup
            label="Brand"
            fields={["added"]}
            values={formData.brand}
            onChange={(field, value) =>
              handleFieldChange("brand", field, value)
            }
          />

          <FieldGroup
            label="Price"
            fields={["added"]}
            values={formData.price}
            onChange={(field, value) =>
              handleFieldChange("price", field, value)
            }
          />

          <FieldGroup
            label="Internal Link"
            fields={["added"]}
            values={formData.internalLink}
            onChange={(field, value) =>
              handleFieldChange("internalLink", field, value)
            }
          />

          <CustomFieldsSection
            customFields={formData.customFields}
            onAdd={addCustomField}
            onRemove={removeCustomField}
            customFieldName={customFieldName}
            setCustomFieldName={setCustomFieldName}
            customFieldValue={customFieldValue}
            setCustomFieldValue={setCustomFieldValue}
          />
        </form>
      </CardContent>
      <CardFooter>
        <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
          {editingReport && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingReport(null);
                resetForm();
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Cancel
            </Button>
          )}
          {!editingReport && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Reset
            </Button>
          )}
          <Button
            type="submit"
            form="report-form"
            disabled={submitting}
            variant={editingReport ? "warning" : "default"}
          >
            {submitting ? (
              <>
                <Spinner size="sm" className="mr-2" />
                {editingReport ? "Updating..." : "Creating..."}
              </>
            ) : (
              <>
                {editingReport ? (
                  <Check className="h-4 w-4 mr-2" />
                ) : (
                  <Plus className="h-4 w-4 mr-2" />
                )}
                {editingReport ? "Update Report" : "Create Report"}
              </>
            )}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ReportForm;
