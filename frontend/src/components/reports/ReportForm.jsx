import { useState, useEffect } from "react";
import FieldGroup from "./FieldGroup";
import CustomFieldsSection from "./CustomFieldsSection";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";

const STORAGE_KEY = "pcb_automation_report_form";

const ReportForm = ({ editingReport, setEditingReport, onSuccess }) => {
  useEffect(() => {
    document.title = editingReport
      ? "Edit Report - PCB Automation"
      : "Create Report - PCB Automation";
  }, [editingReport]);

  const getInitialFormData = () => {
    if (editingReport) {
      // Handle migration from old 'keywords' field to 'keyFeatures'
      const data = editingReport.data;
      const keyFeatures = data.keyFeatures ||
        data.keywords || { generated: 0, added: 0 };

      return {
        date: editingReport.date,
        time: editingReport.time,
        ...data,
        keyFeatures: keyFeatures,
      };
    }

    // Try to load from localStorage
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsedData = JSON.parse(savedData);
        // Handle migration from old 'keywords' field to 'keyFeatures'
        if (parsedData.keywords && !parsedData.keyFeatures) {
          parsedData.keyFeatures = parsedData.keywords;
          delete parsedData.keywords;
        }
        // Ensure keyFeatures exists
        if (!parsedData.keyFeatures) {
          parsedData.keyFeatures = { generated: 0, added: 0 };
        }
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
      category: { added: 0 },
      attributes: { added: 0 },
      deliveryCharge: { added: 0 },
      warranty: { added: 0 },
      warrantyClaimReasons: { added: 0 },
      brand: { added: 0 },
      price: { added: 0 },
      customFields: [],
    };
  };

  const [formData, setFormData] = useState(getInitialFormData);

  const [customFieldName, setCustomFieldName] = useState("");
  const [customFieldValue, setCustomFieldValue] = useState(0);

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
    setFormData((prev) => ({
      ...prev,
      customFields: [
        ...prev.customFields,
        { name: customFieldName, value: parseInt(customFieldValue) || 0 },
      ],
    }));
    setCustomFieldName("");
    setCustomFieldValue(0);
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
      keywords: { generated: 0, added: 0 },
      specifications: { generated: 0, added: 0 },
      metaTitleDescription: { generated: 0, added: 0 },
      titleFixed: { fixed: 0, added: 0 },
      imageRenamed: { fixed: 0 },
      category: { added: 0 },
      attributes: { added: 0 },
      deliveryCharge: { added: 0 },
      warranty: { added: 0 },
      warrantyClaimReasons: { added: 0 },
      brand: { added: 0 },
      price: { added: 0 },
      customFields: [],
    };
    setFormData(emptyForm);
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
          category: formData.category,
          attributes: formData.attributes,
          deliveryCharge: formData.deliveryCharge,
          warranty: formData.warranty,
          warrantyClaimReasons: formData.warrantyClaimReasons,
          brand: formData.brand,
          price: formData.price,
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

  return (
    <form onSubmit={handleSubmit} className="bg-white shadow-sm rounded-lg p-6">
      {/* Indicator Legend */}
      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="text-sm font-semibold text-blue-900 mb-2">
          Field Type Indicators:
        </h4>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-green-500 rounded-full"></span>
            <span className="text-gray-700">
              <strong>Generated:</strong> AI/automated content created
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-blue-500 rounded-full"></span>
            <span className="text-gray-700">
              <strong>Added:</strong> Manually added by you
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-orange-500 rounded-full"></span>
            <span className="text-gray-700">
              <strong>Fixed:</strong> Corrected/modified items
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Date
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => setFormData({ ...formData, date: e.target.value })}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Time
          </label>
          <input
            type="time"
            value={formData.time}
            onChange={(e) => setFormData({ ...formData, time: e.target.value })}
            required
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
          />
        </div>
      </div>

      <h3 className="text-lg font-medium text-gray-900 mb-4">Product Work</h3>

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
        label="Category"
        fields={["added"]}
        values={formData.category}
        onChange={(field, value) => handleFieldChange("category", field, value)}
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
        onChange={(field, value) => handleFieldChange("warranty", field, value)}
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
        onChange={(field, value) => handleFieldChange("brand", field, value)}
      />

      <FieldGroup
        label="Price"
        fields={["added"]}
        values={formData.price}
        onChange={(field, value) => handleFieldChange("price", field, value)}
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

      <div className="flex gap-3 mt-6">
        {editingReport && (
          <button
            type="button"
            onClick={() => {
              setEditingReport(null);
              resetForm();
            }}
            className="px-6 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
          >
            Cancel Edit
            {!editingReport && (
              <button
                type="button"
                onClick={resetForm}
                className="px-6 py-2 bg-gray-200 text-gray-800 text-sm font-medium rounded-md hover:bg-gray-300 transition-colors"
              >
                Reset Form
              </button>
            )}
          </button>
        )}
        <button
          type="submit"
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
        >
          {editingReport ? "Update Report" : "Create Report"}
        </button>
      </div>
    </form>
  );
};

export default ReportForm;
