import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { BarChart3, Copy, RefreshCw, FileText } from "lucide-react";
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
    if (dailyReport?.data) {
      const formattedText = formatReportForWhatsApp(dailyReport.data, {
        type: "daily",
        date: selectedDate,
      });
      copyToClipboard(formattedText, toast);
    }
  };

  useEffect(() => {
    fetchDailyReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
            <BarChart3 className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Daily Report</CardTitle>
            <CardDescription>View aggregated daily report</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Date Selection */}
        <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/50 rounded-xl border">
          <div className="flex-1 sm:max-w-xs space-y-2">
            <Label htmlFor="daily-date">Select Date</Label>
            <Input
              id="daily-date"
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
          <div className="flex items-end">
            <Button onClick={fetchDailyReport} disabled={loading}>
              {loading ? (
                <>
                  <Spinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Loading State */}
        {loading && !dailyReport && (
          <div className="flex flex-col items-center justify-center py-12">
            <Spinner size="lg" className="text-primary" />
            <p className="mt-4 text-sm text-muted-foreground">
              Loading report...
            </p>
          </div>
        )}

        {/* Report Content */}
        {dailyReport && !loading && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
              <div>
                <h3 className="text-lg font-semibold">
                  Daily Report - {dailyReport.date}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="secondary">
                    {dailyReport.hourlyReportsCount} hourly report(s)
                  </Badge>
                </div>
              </div>
              <Button variant="success" onClick={handleCopyToClipboard}>
                <Copy className="h-4 w-4 mr-2" />
                <span className="hidden sm:inline">Copy for WhatsApp</span>
                <span className="sm:hidden">Copy</span>
              </Button>
            </div>

            <div className="bg-gradient-to-br from-muted/30 to-muted/50 rounded-xl p-4 sm:p-5 border overflow-x-auto">
              <pre className="whitespace-pre-wrap text-xs sm:text-sm text-foreground/80 font-mono leading-relaxed">
                {formatReportForWhatsApp(dailyReport.data, {
                  type: "daily",
                  date: selectedDate,
                })}
              </pre>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!dailyReport && !loading && (
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="No reports found"
            description={`No reports found for ${selectedDate}. Create hourly reports to generate daily summaries.`}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default DailyReportView;
