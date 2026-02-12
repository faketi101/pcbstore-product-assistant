import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import {
  formatReportForWhatsApp,
  copyToClipboard,
} from "../../utils/formatReportForWhatsApp";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  Badge,
  EmptyState,
  Spinner,
} from "../ui";

const ReportHistory = ({ onEdit, lastEditedReportId, onClearLastEdited }) => {
  const [hourlyReports, setHourlyReports] = useState([]);
  const [filterStartDate, setFilterStartDate] = useState("");
  const [filterEndDate, setFilterEndDate] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

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
      // Sort by date and time descending (newest first)
      const sortedReports = [...response.reports].sort((a, b) => {
        const dateA = new Date(`${a.date}T${a.time || "00:00"}`);
        const dateB = new Date(`${b.date}T${b.time || "00:00"}`);
        return dateB - dateA;
      });
      setHourlyReports(sortedReports);
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

    setDeletingId(id);
    try {
      await reportService.deleteHourlyReport(id);
      toast.success("Report deleted successfully");
      fetchHourlyReports();
    } catch (error) {
      console.error("Error deleting report:", error);
      toast.error("Failed to delete report");
    } finally {
      setDeletingId(null);
    }
  };

  // Format report for WhatsApp using shared utility
  const copyHourlyReportToClipboard = (report) => {
    const text = formatReportForWhatsApp(report.data, {
      type: "hourly",
      date: `${report.date} at ${report.time}`,
    });
    copyToClipboard(text, toast);
  };

  // Format parts for display
  const formatParts = (parts) => {
    return (
      Object.entries(parts)
        // eslint-disable-next-line no-unused-vars
        .filter(([_, value]) => value > 0)
        .map(([key, value]) => `${capitalize(key)} ${value}`)
        .join(", ")
    );
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

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

  const DocumentIcon = () => (
    <svg
      className="h-12 w-12"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={1.5}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-100 rounded-lg">
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
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Report History</h2>
            <p className="text-sm text-gray-500">
              View and manage your hourly reports
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex-1 min-w-[180px]">
            <Input
              type="date"
              label="Start Date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
            />
          </div>
          <div className="flex-1 min-w-[180px]">
            <Input
              type="date"
              label="End Date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button onClick={fetchHourlyReports} loading={loading}>
              {loading ? "Loading..." : "Apply Filter"}
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                setFilterStartDate("");
                setFilterEndDate("");
              }}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && hourlyReports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-indigo-600" />
            <p className="mt-4 text-sm text-gray-500">Loading reports...</p>
          </div>
        )}

        {/* Reports List */}
        {!loading && currentItems.length > 0 && (
          <>
            <div className="space-y-4 mb-6">
              {currentItems.map((report) => (
                <div
                  key={report.id}
                  className={`border rounded-xl p-5 transition-all hover:shadow-md ${
                    deletingId === report.id
                      ? "opacity-50 pointer-events-none"
                      : "border-gray-200 hover:border-indigo-200"
                  }`}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-gray-100 rounded-lg">
                        <svg
                          className="h-5 w-5 text-gray-600"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                          />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900">
                          {report.date}
                        </h4>
                        <p className="text-sm text-gray-500">
                          at {report.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => copyHourlyReportToClipboard(report)}
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
                              d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                            />
                          </svg>
                        }
                      >
                        Copy
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => onEdit(report)}
                      >
                        Edit
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        loading={deletingId === report.id}
                        onClick={() => handleDeleteReport(report.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(report.data).map(([key, value]) => {
                      if (key === "customFields") {
                        return value.length > 0 ? (
                          <Badge key={key} variant="purple">
                            Custom:{" "}
                            {value
                              .map((f) => `${f.name} (${f.value})`)
                              .join(", ")}
                          </Badge>
                        ) : null;
                      }
                      // Ensure value is an object before formatting
                      if (!value || typeof value !== "object") return null;

                      const formatted = formatParts(value);
                      return formatted ? (
                        <Badge key={key} variant="primary">
                          {capitalize(key)}: {formatted}
                        </Badge>
                      ) : null;
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-200 pt-4">
                <div className="text-sm text-gray-600">
                  Showing{" "}
                  <span className="font-semibold">{indexOfFirstItem + 1}</span>{" "}
                  to{" "}
                  <span className="font-semibold">
                    {Math.min(indexOfLastItem, hourlyReports.length)}
                  </span>{" "}
                  of{" "}
                  <span className="font-semibold">{hourlyReports.length}</span>{" "}
                  reports
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    Previous
                  </Button>
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
                        <Button
                          key={pageNumber}
                          variant={
                            currentPage === pageNumber ? "primary" : "secondary"
                          }
                          size="sm"
                          onClick={() => paginate(pageNumber)}
                        >
                          {pageNumber}
                        </Button>
                      );
                    } else if (
                      pageNumber === currentPage - 2 ||
                      pageNumber === currentPage + 2
                    ) {
                      return (
                        <span
                          key={pageNumber}
                          className="px-2 text-gray-400 self-center"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && currentItems.length === 0 && (
          <EmptyState
            icon={<DocumentIcon />}
            title="No hourly reports found"
            description="Create your first hourly report to get started"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ReportHistory;
