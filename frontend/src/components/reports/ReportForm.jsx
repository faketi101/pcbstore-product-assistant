import { useState, useEffect } from "react";
import FieldGroup from "./FieldGroup";
import CustomFieldsSection from "./CustomFieldsSection";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Input,
} from "../ui";

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
            className={`p-2 rounded-lg ${editingReport ? "bg-amber-100" : "bg-indigo-100"}`}
          >
            <svg
              className={`h-5 w-5 ${editingReport ? "text-amber-600" : "text-indigo-600"}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={
                  editingReport
                    ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                    : "M12 4v16m8-8H4"
                }
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">
              {editingReport ? "Edit Report" : "Create Hourly Report"}
            </h2>
            <p className="text-sm text-gray-500">
              {editingReport
                ? `Editing report from ${editingReport.date} at ${editingReport.time}`
                : "Track your hourly work progress"}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form id="report-form" onSubmit={handleSubmitWithLoading}>
          {/* Indicator Legend */}
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-xl">
            <h4 className="text-sm font-semibold text-blue-900 mb-3">
              Field Type Indicators
            </h4>
            <div className="flex flex-wrap gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-emerald-500 rounded-full shadow-sm"></span>
                <span className="text-gray-700">
                  <strong>Generated:</strong> AI/automated content
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-blue-500 rounded-full shadow-sm"></span>
                <span className="text-gray-700">
                  <strong>Added:</strong> Manually added
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 bg-orange-500 rounded-full shadow-sm"></span>
                <span className="text-gray-700">
                  <strong>Fixed:</strong> Corrected/modified
                </span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <Input
              type="date"
              label="Date"
              value={formData.date}
              onChange={(e) =>
                setFormData({ ...formData, date: e.target.value })
              }
              required
            />
            <Input
              type="time"
              label="Time"
              value={formData.time}
              onChange={(e) =>
                setFormData({ ...formData, time: e.target.value })
              }
              required
            />
          </div>

          <div className="mb-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <svg
                className="h-5 w-5 text-indigo-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
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
        <div className="flex gap-3">
          {editingReport && (
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditingReport(null);
                resetForm();
              }}
            >
              Cancel Edit
            </Button>
          )}
          {!editingReport && (
            <Button type="button" variant="secondary" onClick={resetForm}>
              Reset Form
            </Button>
          )}
          <Button
            type="submit"
            form="report-form"
            loading={submitting}
            variant={editingReport ? "warning" : "primary"}
            leftIcon={
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d={editingReport ? "M5 13l4 4L19 7" : "M12 4v16m8-8H4"}
                />
              </svg>
            }
          >
            {submitting
              ? editingReport
                ? "Updating..."
                : "Creating..."
              : editingReport
                ? "Update Report"
                : "Create Report"}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default ReportForm;
