const field = (key, label, counters) => ({
  key,
  label,
  counters: counters.map((counter) => ({
    key: counter,
    label: counter === "check" ? "Checked" : counter[0].toUpperCase() + counter.slice(1),
  })),
});

module.exports = {
  role: "product_manager",
  name: "Product Management",
  isActive: true,
  groups: [
    {
      name: "Product Work",
      fields: [
        field("description", "Description", ["generated", "added"]),
        field("faq", "FAQ", ["generated", "added"]),
        field("keyFeatures", "Key Features", ["generated", "added"]),
        field("specifications", "Specifications", ["generated", "added"]),
        field("metaTitleDescription", "Meta Title & Description", ["generated", "added"]),
        field("titleFixed", "Title", ["fixed", "added"]),
        field("imageRenamed", "Image Renamed & Fixed", ["fixed"]),
        field("productReCheck", "Product ReCheck", ["check", "fixed"]),
        field("category", "Category", ["added"]),
        field("attributes", "Attributes", ["added"]),
        field("deliveryCharge", "Delivery Charge", ["added"]),
        field("warranty", "Warranty", ["added"]),
        field("warrantyClaimReasons", "Warranty Claim Reasons", ["added"]),
        field("brand", "Brand", ["added"]),
        field("price", "Price", ["added"]),
        field("internalLink", "Internal Link", ["added"]),
      ],
    },
  ],
};
