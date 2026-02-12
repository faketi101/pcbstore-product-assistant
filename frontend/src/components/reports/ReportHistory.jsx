import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import {
  formatReportForWhatsApp,
  copyToClipboard,
} from "../../utils/formatReportForWhatsApp";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Spinner, EmptyState } from "@/components/ui/loading";
import {
  Clock,
  Calendar,
  Copy,
  Pencil,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileText,
  Filter,
  X,
} from "lucide-react";

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

  const copyHourlyReportToClipboard = (report) => {
    const text = formatReportForWhatsApp(report.data, {
      type: "hourly",
      date: `${report.date} at ${report.time}`,
    });
    copyToClipboard(text, toast);
  };

  const formatParts = (parts) => {
    return Object.entries(parts)
      .filter(([, value]) => value > 0)
      .map(([key, value]) => `${capitalize(key)} ${value}`)
      .join(", ");
  };

  const capitalize = (str) => str.charAt(0).toUpperCase() + str.slice(1);

  useEffect(() => {
    fetchHourlyReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = hourlyReports.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(hourlyReports.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <Clock className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg sm:text-xl">Report History</CardTitle>
            <CardDescription>
              View and manage your hourly reports
            </CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="p-3 sm:p-4 bg-muted/50 rounded-lg border">
          <div className="flex items-center gap-2 mb-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="startDate" className="text-xs">
                Start Date
              </Label>
              <Input
                id="startDate"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="endDate" className="text-xs">
                End Date
              </Label>
              <Input
                id="endDate"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
              />
            </div>
            <div className="flex items-end gap-2 col-span-1 sm:col-span-2 lg:col-span-2">
              <Button
                onClick={fetchHourlyReports}
                loading={loading}
                className="flex-1 sm:flex-none"
              >
                {loading ? "Loading..." : "Apply"}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setFilterStartDate("");
                  setFilterEndDate("");
                }}
              >
                <X className="h-4 w-4 sm:mr-1" />
                <span className="hidden sm:inline">Clear</span>
              </Button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && hourlyReports.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading reports...
            </p>
          </div>
        )}

        {/* Reports List */}
        {!loading && currentItems.length > 0 && (
          <>
            <div className="space-y-3">
              {currentItems.map((report) => (
                <div
                  key={report.id}
                  className={`border rounded-lg p-3 sm:p-4 transition-all hover:shadow-md ${
                    deletingId === report.id
                      ? "opacity-50 pointer-events-none"
                      : "hover:border-primary/30"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-lg shrink-0">
                        <Calendar className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground">
                          {report.date}
                        </h4>
                        <p className="text-sm text-muted-foreground">
                          at {report.time}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap sm:flex-nowrap">
                      <Button
                        variant="success"
                        size="sm"
                        onClick={() => copyHourlyReportToClipboard(report)}
                        className="flex-1 sm:flex-none"
                      >
                        <Copy className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden xs:inline">Copy</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => onEdit(report)}
                        className="flex-1 sm:flex-none"
                      >
                        <Pencil className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden xs:inline">Edit</span>
                      </Button>
                      <Button
                        variant="destructive"
                        size="sm"
                        loading={deletingId === report.id}
                        onClick={() => handleDeleteReport(report.id)}
                        className="flex-1 sm:flex-none"
                      >
                        <Trash2 className="h-3.5 w-3.5 sm:mr-1" />
                        <span className="hidden xs:inline">Delete</span>
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(report.data).map(([key, value]) => {
                      if (key === "customFields") {
                        return value.length > 0 ? (
                          <Badge key={key} variant="purple" className="text-xs">
                            Custom:{" "}
                            {value
                              .map((f) => `${f.name} (${f.value})`)
                              .join(", ")}
                          </Badge>
                        ) : null;
                      }
                      if (!value || typeof value !== "object") return null;
                      const formatted = formatParts(value);
                      return formatted ? (
                        <Badge
                          key={key}
                          variant="secondary"
                          className="text-xs"
                        >
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
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-4 border-t">
                <p className="text-sm text-muted-foreground order-2 sm:order-1">
                  Showing{" "}
                  <span className="font-medium">{indexOfFirstItem + 1}</span> to{" "}
                  <span className="font-medium">
                    {Math.min(indexOfLastItem, hourlyReports.length)}
                  </span>{" "}
                  of <span className="font-medium">{hourlyReports.length}</span>
                </p>
                <div className="flex gap-1.5 order-1 sm:order-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  {[...Array(totalPages)].map((_, index) => {
                    const pageNumber = index + 1;
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
                            currentPage === pageNumber ? "default" : "outline"
                          }
                          size="sm"
                          onClick={() => paginate(pageNumber)}
                          className="w-9"
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
                          className="px-1 text-muted-foreground self-center"
                        >
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty State */}
        {!loading && currentItems.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No hourly reports found"
            description="Create your first hourly report to get started"
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ReportHistory;
