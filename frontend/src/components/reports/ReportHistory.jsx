import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";

const ReportHistory = ({ onEdit, lastEditedReportId, onClearLastEdited }) => {
  const [hourlyReports, setHourlyReports] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Report History - PCB Automation";
  }, []);

  const fetchHourlyReports = async () => {
    setLoading(true);
    try {
      const filters = {};
      if (filterStartDate) filters.startDate = filterStartDate;
      if (filterEndDate) filters.endDate = filterEndDate;

      const response = await reportService.getHourlyReports(filters);
      setHourlyReports(response.reports);
      setCurrentPage(1);
    } catch (error) {
      console.error("Error fetching hourly reports:", error);
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteReport = async (id) => {
    if (!confirm("Are you sure you want to delete this report?")) return;

    try {
      await reportService.deleteHourlyReport(id);
      toast.success("Report deleted successfully");
      fetchHourlyReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    }
  };

  // new codes
  const formatParts = (parts) => {
    return Object.entries(parts)
      .filter(([_, value]) => value > 0)
      .map(([key, value]) => `${capitalize(key)} ${value}`)
      .join(", ");
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  const formatHourlyReportForWhatsApp = (report) => {
    let text = `*Hourly Report*\nProducts:\n`;
    const data = report.data;
    let hasData = false;

    const addLine = (label, parts) => {
      const line = formatParts(parts);
      if (line) {
        text += `- ${label}: ${line}\n`;
        hasData = true;
      }
    };

    addLine("Description", data.description || {});
    addLine("FAQ", data.faq || {});
    addLine("Key Features", data.keyFeatures || data.keywords || {});
    addLine("Specifications", data.specifications || {});
    addLine("Meta Title & Description", data.metaTitleDescription || {});
    addLine("Title", data.titleFixed || {});
    addLine("Image Renamed & Fixed", { fixed: data.imageRenamed?.fixed || 0 });
    addLine("Category", data.category || {});
    addLine("Attributes", data.attributes || {});
    addLine("Delivery Charge", data.deliveryCharge || {});
    addLine("Warranty", data.warranty || {});
    addLine("Warranty Claim Reasons", data.warrantyClaimReasons || {});
    addLine("Brand", data.brand || {});
    addLine("Price", data.price || {});

    if (data.customFields?.length) {
      data.customFields.forEach((field) => {
        if (field.value > 0) {
          text += `- ${field.name}: ${field.value}\n`;
          hasData = true;
        }
      });
    }

    if (!hasData) {
      text += `No data recorded\n`;
    }

    return text;
  };

  // old ones

  // const formatHourlyReportForWhatsApp = (report) => {
  //   let text = `*Hourly Report*\n`;
  //   text += `Products:\n`;

  //   const data = report.data;
  //   let hasData = false;

  //   if (
  //     data.description &&
  //     (data.description.generated > 0 || data.description.added > 0)
  //   ) {
  //     text += `- Description: Generated ${data.description.generated}, Added ${data.description.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.faq && (data.faq.generated > 0 || data.faq.added > 0)) {
  //     text += `- FAQ: Generated ${data.faq.generated}, Added ${data.faq.added}\n`;
  //     hasData = true;
  //   }
  //   if (
  //     data.keywords &&
  //     (data.keywords.generated > 0 || data.keywords.added > 0)
  //   ) {
  //     text += `- Keywords: Generated ${data.keywords.generated}, Added ${data.keywords.added}\n`;
  //     hasData = true;
  //   }
  //   if (
  //     data.specifications &&
  //     (data.specifications.generated > 0 || data.specifications.added > 0)
  //   ) {
  //     text += `- Specifications: Generated ${data.specifications.generated}, Added ${data.specifications.added}\n`;
  //     hasData = true;
  //   }
  //   if (
  //     data.metaTitleDescription &&
  //     (data.metaTitleDescription.generated > 0 ||
  //       data.metaTitleDescription.added > 0)
  //   ) {
  //     text += `- Meta Title & Description: Generated ${data.metaTitleDescription.generated}, Added ${data.metaTitleDescription.added}\n`;
  //     hasData = true;
  //   }
  //   if (
  //     data.titleFixed &&
  //     (data.titleFixed.fixed > 0 || data.titleFixed.added > 0)
  //   ) {
  //     text += `- Title: Fixed ${data.titleFixed.fixed}, Added ${data.titleFixed.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.imageRenamed && data.imageRenamed.fixed > 0) {
  //     text += `- Image Renamed & Fixed: ${data.imageRenamed.fixed}\n`;
  //     hasData = true;
  //   }
  //   if (data.category && data.category.added > 0) {
  //     text += `- Category: Added ${data.category.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.attributes && data.attributes.added > 0) {
  //     text += `- Attributes: Added ${data.attributes.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.deliveryCharge && data.deliveryCharge.added > 0) {
  //     text += `- Delivery Charge: Added ${data.deliveryCharge.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.warranty && data.warranty.added > 0) {
  //     text += `- Warranty: Added ${data.warranty.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.warrantyClaimReasons && data.warrantyClaimReasons.added > 0) {
  //     text += `- Warranty Claim Reasons: Added ${data.warrantyClaimReasons.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.brand && data.brand.added > 0) {
  //     text += `- Brand: Added ${data.brand.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.price && data.price.added > 0) {
  //     text += `- Price: Added ${data.price.added}\n`;
  //     hasData = true;
  //   }
  //   if (data.customFields && data.customFields.length > 0) {
  //     data.customFields.forEach((field) => {
  //       if (field.value > 0) {
  //         text += `- ${field.name}: ${field.value}\n`;
  //         hasData = true;
  //       }
  //     });
  //   }

  //   if (!hasData) {
  //     text += `No data recorded\n`;
  //   }

  //   return text;
  // };

  const copyHourlyReportToClipboard = (report) => {
    const text = formatHourlyReportForWhatsApp(report);
    navigator.clipboard
      .writeText(text)
      .then(() => {
        toast.success("Hourly report copied to clipboard!");
      })
      .catch((err) => {
        console.error("Failed to copy:", err);
        toast.error("Failed to copy to clipboard");
      });
  };

  useEffect(() => {
    fetchHourlyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Navigate to the page containing the last edited report
  useEffect(() => {
    if (lastEditedReportId && hourlyReports.length > 0) {
      const editedIndex = hourlyReports.findIndex(
        (report) => report.id === lastEditedReportId,
      );
      if (editedIndex !== -1) {
        const pageContainingReport = Math.floor(editedIndex / itemsPerPage) + 1;
        setCurrentPage(pageContainingReport);
        onClearLastEdited();
      }
    }
  }, [lastEditedReportId, hourlyReports, itemsPerPage, onClearLastEdited]);

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = hourlyReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(hourlyReports.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div className="bg-white shadow-sm rounded-lg p-6">
      <div className="flex flex-wrap gap-4 mb-6">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Start Date
          </label>
          <input
            type="date"
            value={filterStartDate}
            onChange={(e) => setFilterStartDate(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            End Date
          </label>
          <input
            type="date"
            value={filterEndDate}
            onChange={(e) => setFilterEndDate(e.target.value)}
            className="block w-full px-3 py-2 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm transition-all"
          />
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={fetchHourlyReports}
            disabled={loading}
            className="px-6 py-2 bg-indigo-600 text-white text-sm font-semibold rounded-lg hover:bg-indigo-700 transition-all shadow-sm hover:shadow disabled:opacity-50"
          >
            {loading ? "Loading..." : "Apply Filter"}
          </button>
          <button
            onClick={() => {
              setFilterStartDate("");
              setFilterEndDate("");
            }}
            className="px-6 py-2 bg-gray-200 text-gray-800 text-sm font-semibold rounded-lg hover:bg-gray-300 transition-all shadow-sm hover:shadow"
          >
            Clear
          </button>
        </div>
      </div>

      {currentItems.length > 0 ? (
        <>
          <div className="space-y-4 mb-6">
            {currentItems.map((report) => (
              <div
                key={report.id}
                className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">
                      {report.date} at {report.time}
                    </h4>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => copyHourlyReportToClipboard(report)}
                      className="px-3 py-1 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 transition-colors"
                      title="Copy hourly report"
                    >
                      📋 Copy
                    </button>
                    <button
                      onClick={() => onEdit(report)}
                      className="px-3 py-1 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteReport(report.id)}
                      className="px-3 py-1 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(report.data).map(([key, value]) => {
                    if (key === "customFields") {
                      return value.length > 0 ? (
                        <span
                          key={key}
                          className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800"
                        >
                          Custom:{" "}
                          {value
                            .map((f) => `${f.name} (${f.value})`)
                            .join(", ")}
                        </span>
                      ) : null;
                    }
                    // Ensure value is an object before calculating total
                    if (!value || typeof value !== "object") return null;

                    const total = Object.values(value).reduce(
                      (a, b) => (a || 0) + (b || 0),
                      0,
                    );
                    return total > 0 ? (
                      <span
                        key={key}
                        className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800"
                      >
                        {key}: {total}
                      </span>
                    ) : null;
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-200 pt-4">
              <div className="text-sm text-gray-700">
                Showing{" "}
                <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                <span className="font-medium">
                  {Math.min(indexOfLastItem, hourlyReports.length)}
                </span>{" "}
                of <span className="font-medium">{hourlyReports.length}</span>{" "}
                reports
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => paginate(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const pageNumber = index + 1;
                  // Show first, last, current, and adjacent pages
                  if (
                    pageNumber === 1 ||
                    pageNumber === totalPages ||
                    (pageNumber >= currentPage - 1 &&
                      pageNumber <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNumber}
                        onClick={() => paginate(pageNumber)}
                        className={`px-3 py-1 border rounded-md text-sm font-medium ${
                          currentPage === pageNumber
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "border-gray-300 text-gray-700 hover:bg-gray-50"
                        }`}
                      >
                        {pageNumber}
                      </button>
                    );
                  } else if (
                    pageNumber === currentPage - 2 ||
                    pageNumber === currentPage + 2
                  ) {
                    return (
                      <span key={pageNumber} className="px-2">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  onClick={() => paginate(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      ) : (
        <div className="text-center py-12">
          <svg
            className="mx-auto h-12 w-12 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
            />
          </svg>
          <h3 className="mt-2 text-sm font-medium text-gray-900">
            No hourly reports found
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            Create your first hourly report to get started
          </p>
        </div>
      )}
    </div>
  );
};

export default ReportHistory;
