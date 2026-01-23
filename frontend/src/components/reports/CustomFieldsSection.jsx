import toast from "react-hot-toast";

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
      <h3 className="text-lg font-medium text-gray-900 mb-4">Custom Fields</h3>
      <div className="flex gap-3 mb-4">
        <input
          type="text"
          placeholder="Field name"
          value={customFieldName}
          onChange={(e) => setCustomFieldName(e.target.value)}
          onKeyPress={handleKeyPress}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
        />
        <input
          type="number"
          placeholder="Value"
          value={customFieldValue}
          onChange={(e) => setCustomFieldValue(e.target.value)}
          onKeyPress={handleKeyPress}
          min="0"
          className="w-32 px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
        />
        <button
          type="button"
          onClick={handleAdd}
          className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow"
        >
          Add Field
        </button>
      </div>

      {customFields.length > 0 && (
        <div className="space-y-2">
          {customFields.map((field, index) => (
            <div
              key={index}
              className="flex items-center justify-between px-4 py-2.5 bg-gray-50 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              <span className="text-sm text-gray-700">
                <strong className="font-semibold">{field.name}:</strong>{" "}
                <span className="ml-1">{field.value}</span>
              </span>
              <button
                type="button"
                onClick={() => onRemove(index)}
                className="text-red-600 hover:text-red-800 font-semibold text-lg leading-none transition-colors"
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomFieldsSection;
