/**
 * Reusable WhatsApp report formatter
 * This is the canonical template used across all report views
 */

/**
 * Format report data for WhatsApp sharing
 * @param {Object} data - The report data object
 * @param {Object} options - Formatting options
 * @param {string} options.type - 'hourly' | 'daily' | 'dateRange'
 * @param {string} options.date - Date string for the report
 * @param {string} options.startDate - Start date for date range reports
 * @param {string} options.endDate - End date for date range reports
 * @returns {string} Formatted text for WhatsApp
 */
export const formatReportForWhatsApp = (data, options = {}) => {
  const { type = "hourly", date = "", startDate = "", endDate = "" } = options;

  // Build header based on type
  let output = "";
  if (type === "dateRange" && startDate && endDate) {
    output = `*Date Range Report (${startDate} to ${endDate})*\n\nProducts:\n`;
  } else if (type === "daily") {
    output = date
      ? `Today's work done (${date}):\n\nProducts\n`
      : "Today's work done:\n\nProducts\n";
  } else {
    output = date
      ? `Hourly Update (${date}):\n\nProducts\n`
      : "Hourly Update:\n\nProducts\n";
  }

  const lines = [];

  /**
   * Get action text parts from a field object
   */
  const getActionTexts = (field) => {
    if (!field) return [];

    const actions = [];
    if (field.generated > 0) actions.push(`generated ${field.generated}`);
    if (field.added > 0) actions.push(`added ${field.added}`);
    if (field.fixed > 0) actions.push(`fixed ${field.fixed}`);
    if (field.check > 0) actions.push(`checked ${field.check}`);

    return actions;
  };

  /**
   * Push a line to the output if it has values
   */
  const pushLine = (label, field) => {
    const actions = getActionTexts(field);
    if (actions.length) {
      lines.push(`- ${label} ${actions.join(", ")}`);
    }
  };

  // Standard fields with generated/added
  pushLine("description", data.description);
  pushLine("FAQ", data.faq);
  pushLine("key features", data.keyFeatures);
  pushLine("specifications", data.specifications);
  pushLine("meta title and description", data.metaTitleDescription);
  pushLine("warranty claim reasons", data.warrantyClaimReasons);

  // Title field with fixed/added
  if (data.titleFixed) {
    const actions = [];
    if (data.titleFixed.fixed > 0)
      actions.push(`fixed ${data.titleFixed.fixed}`);
    if (data.titleFixed.added > 0)
      actions.push(`added ${data.titleFixed.added}`);
    if (actions.length) {
      lines.push(`- title ${actions.join(", ")}`);
    }
  }

  // Image renamed field
  if (data.imageRenamed?.fixed > 0) {
    lines.push(`- image renamed and fixed ${data.imageRenamed.fixed}`);
  }

  // Product recheck with check and fixed
  if (data.productReCheck) {
    const actions = [];
    if (data.productReCheck.check > 0)
      actions.push(`checked ${data.productReCheck.check}`);
    if (data.productReCheck.fixed > 0)
      actions.push(`fixed ${data.productReCheck.fixed}`);
    if (actions.length) {
      lines.push(`- product recheck ${actions.join(", ")}`);
    }
  }

  // Simple added-only fields
  if (data.category?.added > 0)
    lines.push(`- category added ${data.category.added}`);
  if (data.attributes?.added > 0)
    lines.push(`- attributes added ${data.attributes.added}`);
  if (data.deliveryCharge?.added > 0)
    lines.push(`- delivery charge added ${data.deliveryCharge.added}`);
  if (data.warranty?.added > 0)
    lines.push(`- warranty added ${data.warranty.added}`);
  if (data.brand?.added > 0) lines.push(`- brand added ${data.brand.added}`);
  if (data.price?.added > 0) lines.push(`- price added ${data.price.added}`);
  if (data.internalLink?.added > 0)
    lines.push(`- internal link added ${data.internalLink.added}`);

  // Custom fields
  if (data.customFields?.length) {
    data.customFields.forEach((field) => {
      if (field.value > 0) {
        lines.push(`- ${field.name} ${field.value}`);
      }
    });
  }

  output += lines.join(",\n");
  return output;
};

/**
 * Copy text to clipboard with toast notification
 * @param {string} text - Text to copy
 * @param {Function} toast - Toast function from react-hot-toast
 */
export const copyToClipboard = async (text, toast) => {
  try {
    await navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  } catch (err) {
    console.error("Failed to copy:", err);
    toast.error("Failed to copy to clipboard");
  }
};

export default formatReportForWhatsApp;
