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

  const tabs = [
    {
      id: "create",
      label: editingReport ? "Edit Report" : "Create Hourly Report",
      icon: (
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
            d="M12 4v16m8-8H4"
          />
        </svg>
      ),
    },
    {
      id: "daily",
      label: "Daily Report",
      icon: (
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
            d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
          />
        </svg>
      ),
    },
    {
      id: "dateRange",
      label: "Date Range Report",
      icon: (
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
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
      ),
    },
    {
      id: "history",
      label: "Report History",
      icon: (
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
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-indigo-600 rounded-xl shadow-lg shadow-indigo-200">
              <svg
                className="h-6 w-6 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Updates & Reports
              </h1>
              <p className="text-sm text-gray-500">
                Track and manage your hourly and daily reports
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-1.5 inline-flex gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id !== "create") setEditingReport(null);
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-indigo-600 text-white shadow-md shadow-indigo-200"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
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
