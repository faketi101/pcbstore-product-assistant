import { useState, useEffect } from "react";
import ReportForm from "../components/reports/ReportForm";
import DailyReportView from "../components/reports/DailyReportView";
import DateRangeReport from "../components/reports/DateRangeReport";
import ReportHistory from "../components/reports/ReportHistory";

const Reports = () => {
  const [activeTab, setActiveTab] = useState("create");
  const [editingReport, setEditingReport] = useState(null);
  const [lastEditedReportId, setLastEditedReportId] = useState(null);

  useEffect(() => {
    const titles = {
      create: editingReport ? "Edit Report" : "Create Report",
      daily: "Daily Report",
      dateRange: "Date Range Report",
      history: "Report History",
    };
    document.title = `${titles[activeTab] || "Reports"} - PCB Automation`;
  }, [activeTab, editingReport]);

  const handleEditReport = (report) => {
    setEditingReport(report);
    setLastEditedReportId(report.id);
    setActiveTab("create");
  };

  const handleReportSuccess = () => {
    if (activeTab === "create" && editingReport) {
      // After editing, switch back to history tab
      setActiveTab("history");
      setEditingReport(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">
            Updates & Reports
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Track and manage your hourly and daily reports
          </p>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab("create")}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "create"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              {editingReport ? "Edit Report" : "Create Hourly Report"}
            </button>
            <button
              onClick={() => {
                setActiveTab("daily");
                setEditingReport(null);
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "daily"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              Daily Report
            </button>
            <button
              onClick={() => {
                setActiveTab("dateRange");
                setEditingReport(null);
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "dateRange"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              Date Range Report
            </button>
            <button
              onClick={() => {
                setActiveTab("history");
                setEditingReport(null);
              }}
              className={`whitespace-nowrap py-4 px-1 border-b-2 font-semibold text-sm transition-all ${
                activeTab === "history"
                  ? "border-indigo-600 text-indigo-700"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-400"
              }`}
            >
              Report History
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div>
          {activeTab === "create" && (
            <ReportForm
              editingReport={editingReport}
              setEditingReport={setEditingReport}
              onSuccess={handleReportSuccess}
            />
          )}
          {activeTab === "daily" && <DailyReportView />}
          {activeTab === "dateRange" && <DateRangeReport />}
          {activeTab === "history" && (
            <ReportHistory
              onEdit={handleEditReport}
              lastEditedReportId={lastEditedReportId}
              onClearLastEdited={() => setLastEditedReportId(null)}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
