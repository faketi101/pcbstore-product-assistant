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
  LoadingOverlay,
} from "../ui";

const DateRangeReport = () => {
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [aggregatedData, setAggregatedData] = useState(null);

  useEffect(() => {
    document.title = "Date Range Report - PCB Automation";
  }, []);

  const handleGenerate = async () => {
    if (!startDate || !endDate) {
      toast.error("Please select both start and end dates");
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      toast.error("Start date must be before end date");
      return;
    }

    setLoading(true);
    try {
      const response = await reportService.getDailyReports(startDate, endDate);
      setReports(response.reports || []);

      // Aggregate all data
      const aggregated = {
        description: { generated: 0, added: 0 },
        faq: { generated: 0, added: 0 },
        keyFeatures: { generated: 0, added: 0 },
        specifications: { generated: 0, added: 0 },
        metaTitleDescription: { generated: 0, added: 0 },
        warrantyClaimReasons: { generated: 0, added: 0 },
        titleFixed: { fixed: 0, added: 0 },
        imageRenamed: { fixed: 0 },
        productReCheck: { check: 0, fixed: 0 },
        category: { added: 0 },
        attributes: { added: 0 },
        deliveryCharge: { added: 0 },
        warranty: { added: 0 },
        brand: { added: 0 },
        price: { added: 0 },
        internalLink: { added: 0 },
        customFields: [],
      };

      response.reports.forEach((report) => {
        const data = report.data;
        Object.keys(aggregated).forEach((key) => {
          if (key === "customFields") return;
          if (data[key]) {
            Object.keys(data[key]).forEach((subKey) => {
              aggregated[key][subKey] += data[key][subKey] || 0;
            });
          }
        });

        // Aggregate custom fields
        if (data.customFields?.length) {
          const customFieldsMap = new Map();

          // First, collect existing aggregated custom fields
          aggregated.customFields.forEach((field) => {
            customFieldsMap.set(field.name, field.value);
          });

          // Then, add values from current report
          data.customFields.forEach((field) => {
            customFieldsMap.set(
              field.name,
              (customFieldsMap.get(field.name) || 0) + field.value,
            );
          });

          // Convert back to array
          aggregated.customFields = Array.from(
            customFieldsMap,
            ([name, value]) => ({
              name,
              value,
            }),
          );
        }
      });

      setAggregatedData(aggregated);
      toast.success(`Generated report for ${response.reports.length} days`);
    } catch (error) {
      console.error("Error generating date range report:", error);
      toast.error("Failed to generate report");
    } finally {
      setLoading(false);
    }
  };

  const getFormattedWhatsAppMessage = () => {
    if (!aggregatedData) return "";
    return formatReportForWhatsApp(aggregatedData, {
      type: "dateRange",
      startDate,
      endDate,
    });
  };

  const handleCopyToClipboard = () => {
    copyToClipboard(getFormattedWhatsAppMessage(), toast);
  };

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

  const CalendarIcon = () => (
    <svg
      className="h-5 w-5 text-gray-400"
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
  );

  return (
    <div className="space-y-6">
      {/* Date Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-100 rounded-lg">
              <CalendarIcon />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Generate Date Range Report
              </h2>
              <p className="text-sm text-gray-500 mt-0.5">
                Select a date range to generate an aggregated report
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Input
              type="date"
              label="Start Date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />

            <Input
              type="date"
              label="End Date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />

            <div className="flex items-end">
              <Button
                onClick={handleGenerate}
                loading={loading}
                className="w-full"
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
                      d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                }
              >
                {loading ? "Generating..." : "Generate Report"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Card */}
      {aggregatedData && (
        <Card className="relative">
          <LoadingOverlay show={loading} message="Generating report..." />
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-100 rounded-lg">
                  <svg
                    className="h-5 w-5 text-emerald-600"
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
                  <h3 className="text-lg font-bold text-gray-900">
                    Aggregated Report
                  </h3>
                  <p className="text-sm text-gray-500">
                    {reports.length} day{reports.length !== 1 ? "s" : ""} of
                    data combined
                  </p>
                </div>
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
          </CardHeader>
          <CardContent>
            <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-5 border border-gray-200">
              <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono leading-relaxed">
                {getFormattedWhatsAppMessage()}
              </pre>
            </div>

            {/* Daily Breakdown */}
            <div className="mt-6">
              <h4 className="text-md font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <svg
                  className="h-5 w-5 text-gray-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 6h16M4 10h16M4 14h16M4 18h16"
                  />
                </svg>
                Daily Breakdown
              </h4>
              <div className="grid gap-3">
                {reports.map((report, index) => (
                  <div
                    key={index}
                    className="flex justify-between items-center p-4 bg-white rounded-lg border border-gray-200 hover:border-indigo-200 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg">
                        <svg
                          className="h-4 w-4 text-indigo-600"
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
                      <span className="font-medium text-gray-900">
                        {report.date}
                      </span>
                    </div>
                    <Badge variant="primary">
                      {report.hourlyReportsCount} hourly report
                      {report.hourlyReportsCount !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!aggregatedData && !loading && (
        <Card>
          <CardContent>
            <EmptyState
              icon={<DocumentIcon />}
              title="No report generated yet"
              description="Select a date range above and click 'Generate Report' to see aggregated data"
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DateRangeReport;
