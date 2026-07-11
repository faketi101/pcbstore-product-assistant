import { useState, useEffect } from "react";
import ReportForm from "../components/reports/ReportForm";
import DailyReportView from "../components/reports/DailyReportView";
import DateRangeReport from "../components/reports/DateRangeReport";
import ReportHistory from "../components/reports/ReportHistory";
import reportService from "../services/reportService";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Plus, FileText, Calendar, Clock, BarChart3 } from "lucide-react";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [editingReport, setEditingReport] = useState(null);
  const [lastEditedReportId, setLastEditedReportId] = useState(null);
  const [templateRole, setTemplateRole] = useState("");
  const [filterTemplates, setFilterTemplates] = useState([]);

  useEffect(() => {
    const titles = {
      create: editingReport ? "Edit Report" : "Create Report",
      daily: "Daily Report",
      dateRange: "Date Range Report",
      history: "Report History",
    };
    document.title = `${titles[activeTab] || "Reports"} - PCB Automation`;
  }, [activeTab, editingReport]);

  useEffect(() => {
    reportService
      .getReportFilterTemplates()
      .then(setFilterTemplates)
      .catch((error) =>
        console.error("Could not load report template filters:", error),
      );
  }, []);

  const handleEditReport = (report) => {
    setEditingReport(report);
    setLastEditedReportId(report.id);
    setActiveTab("create");
  };

  const handleReportSuccess = () => {
    if (activeTab === "create") {
      setActiveTab("history");
      setEditingReport(null);
      window.scrollTo(0, 0);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-primary rounded-lg sm:rounded-xl">
              <BarChart3 className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Updates & Reports
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Track and manage your hourly and daily reports
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={(value) => {
            setActiveTab(value);
            if (value !== "create") setEditingReport(null);
          }}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex sm:grid-cols-none gap-1 h-auto p-1">
            <TabsTrigger
              value="create"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2"
            >
              <Plus className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden xs:inline">
                {editingReport ? "Edit" : "Create"}
              </span>
              <span className="xs:hidden">
                {editingReport ? "Edit" : "New"}
              </span>
            </TabsTrigger>
            <TabsTrigger
              value="daily"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2"
            >
              <FileText className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Daily</span>
            </TabsTrigger>
            <TabsTrigger
              value="dateRange"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2"
            >
              <Calendar className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span className="hidden sm:inline">Date Range</span>
              <span className="sm:hidden">Range</span>
            </TabsTrigger>
            <TabsTrigger
              value="history"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3 py-2"
            >
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>

          {activeTab !== "create" && (
            <div className="max-w-sm rounded-lg border bg-muted/40 p-3 space-y-1.5">
              <label htmlFor="report-template-filter" className="text-xs font-medium">
                Report Template
              </label>
              <select
                id="report-template-filter"
                value={templateRole}
                onChange={(event) => setTemplateRole(event.target.value)}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <option value="">All Templates</option>
                {filterTemplates.map((template) => (
                  <option key={template.role} value={template.role}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <TabsContent value="create">
            <ReportForm
              editingReport={editingReport}
              setEditingReport={setEditingReport}
              onSuccess={handleReportSuccess}
            />
          </TabsContent>

          <TabsContent value="daily">
            <DailyReportView templateRole={templateRole} />
          </TabsContent>

          <TabsContent value="dateRange">
            <DateRangeReport
              key={templateRole || "all-templates"}
              templateRole={templateRole}
            />
          </TabsContent>

          <TabsContent value="history">
            <ReportHistory
              onEdit={handleEditReport}
              lastEditedReportId={lastEditedReportId}
              onClearLastEdited={() => setLastEditedReportId(null)}
              templateRole={templateRole}
            />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Reports;
