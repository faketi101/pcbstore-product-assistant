import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import {
  Calendar,
  BarChart3,
  Copy,
  FileText,
  List,
  FileBarChart,
} from "lucide-react";
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
import { Spinner, EmptyState, LoadingOverlay } from "@/components/ui/loading";

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

  return (
    <div className="space-y-6">
      {/* Date Selection Card */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Generate Date Range Report</CardTitle>
              <CardDescription>
                Select a date range to generate an aggregated report
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start-date">Start Date</Label>
              <Input
                id="start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end-date">End Date</Label>
              <Input
                id="end-date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end sm:col-span-2 lg:col-span-1">
              <Button
                onClick={handleGenerate}
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Spinner size="sm" className="mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <FileBarChart className="h-4 w-4 mr-2" />
                    Generate Report
                  </>
                )}
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
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <BarChart3 className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <CardTitle>Aggregated Report</CardTitle>
                  <CardDescription>
                    {reports.length} day{reports.length !== 1 ? "s" : ""} of
                    data combined
                  </CardDescription>
                </div>
              </div>
              <Button variant="success" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Copy for WhatsApp</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-4 sm:p-5 border overflow-x-auto">
              <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/80 font-mono leading-relaxed">
                {getFormattedWhatsAppMessage()}
              </pre>
            </div>

            {/* Daily Breakdown */}
            <div>
              <h4 className="text-md font-semibold mb-4 flex items-center gap-2">
                <List className="h-5 w-5 text-muted-foreground" />
                Daily Breakdown
              </h4>
              <div className="grid gap-3">
                {reports.map((report, index) => (
                  <div
                    key={index}
                    className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-2 p-4 bg-card rounded-lg border hover:border-primary/50 hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                        <Calendar className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium">{report.date}</span>
                    </div>
                    <Badge variant="secondary">
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
          <CardContent className="pt-6">
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
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
