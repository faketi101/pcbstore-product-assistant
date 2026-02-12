import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";
import { copyToClipboard } from "../../utils/formatReportForWhatsApp";
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  Input,
  EmptyState,
  Spinner,
} from "../ui";

const DailyReportView = () => {
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [dailyReport, setDailyReport] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Daily Report - PCB Automation";
  }, []);

  const fetchDailyReport = async () => {
    setLoading(true);
    try {
      const response = await reportService.getDailyReport(selectedDate);
      setDailyReport(response.report);
    } catch (error) {
      console.error("Error fetching daily report:", error);
      if (error.response?.status === 404) {
        setDailyReport(null);
        toast.error("No reports found for this date");
      } else {
        toast.error("Failed to fetch daily report");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCopyToClipboard = () => {
    if (dailyReport?.formattedText) {
      copyToClipboard(dailyReport.formattedText, toast);
    }
  };

  useEffect(() => {
    fetchDailyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

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
                d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
              />
            </svg>
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-900">Daily Report</h2>
            <p className="text-sm text-gray-500">
              View aggregated daily report
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Date Selection */}
        <div className="flex gap-4 mb-6 p-4 bg-gray-50 rounded-xl border border-gray-100">
          <div className="flex-1 max-w-xs">
            <Input
              type="date"
              label="Select Date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchDailyReport} loading={loading}>
              {loading ? "Loading..." : "Refresh"}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !dailyReport && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-indigo-600" />
            <p className="mt-4 text-sm text-gray-500">Loading report...</p>
          </div>
        )}

        {/* Report Content */}
        {dailyReport && !loading && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  Daily Report - {dailyReport.date}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  Based on {dailyReport.hourlyReportsCount} hourly report(s)
                </p>
              </div>
              <Button
                variant="success"
                onClick={handleCopyToClipboard}
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
                Copy for WhatsApp
              </Button>
            </div>

            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {dailyReport.formattedText}
              </pre>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!dailyReport && !loading && (
          <EmptyState
            icon={<DocumentIcon />}
            title="No reports found"
            description={`No reports found for ${selectedDate}. Create hourly reports to generate daily summaries.`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DailyReportView;
