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
  pushLine("Description:", data.description);
  pushLine("FAQ:", data.faq);
  pushLine("Key Features:", data.keyFeatures);
  pushLine("Specifications:", data.specifications);
  pushLine("Meta Title and Description:", data.metaTitleDescription);
  pushLine("Warranty Claim Reasons:", data.warrantyClaimReasons);

  // Title field with fixed/added
  if (data.titleFixed) {
    const actions = [];
    if (data.titleFixed.fixed > 0)
      actions.push(`fixed ${data.titleFixed.fixed}`);
    if (data.titleFixed.added > 0)
      actions.push(`added ${data.titleFixed.added}`);
    if (actions.length) {
      lines.push(`- Title: ${actions.join(", ")}`);
    }
  }

  // Image renamed field
  if (data.imageRenamed?.fixed > 0) {
    lines.push(`- Image Renamed and Fixed: ${data.imageRenamed.fixed}`);
  }

  // Product recheck with check and fixed
  if (data.productReCheck) {
    const actions = [];
    if (data.productReCheck.check > 0)
      actions.push(`checked ${data.productReCheck.check}`);
    if (data.productReCheck.fixed > 0)
      actions.push(`fixed ${data.productReCheck.fixed}`);
    if (actions.length) {
      lines.push(`- Product Recheck: ${actions.join(", ")}`);
    }
  }

  // Simple added-only fields
  if (data.category?.added > 0)
    lines.push(`- Category Added: ${data.category.added}`);
  if (data.attributes?.added > 0)
    lines.push(`- Attributes Added: ${data.attributes.added}`);
  if (data.deliveryCharge?.added > 0)
    lines.push(`- Delivery Charge Added: ${data.deliveryCharge.added}`);
  if (data.warranty?.added > 0)
    lines.push(`- Warranty Added: ${data.warranty.added}`);
  if (data.brand?.added > 0) lines.push(`- Brand Added: ${data.brand.added}`);
  if (data.price?.added > 0) lines.push(`- Price Added: ${data.price.added}`);
  if (data.internalLink?.added > 0)
    lines.push(`- Internal Link Added: ${data.internalLink.added}`);

  // Custom fields
  if (data.customFields?.length) {
    data.customFields.forEach((field) => {
      if (field.value > 0) {
        lines.push(`- ${field.name}: ${field.value}`);
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
