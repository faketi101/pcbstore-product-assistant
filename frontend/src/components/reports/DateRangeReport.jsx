import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import reportService from "../../services/reportService";

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
        category: { added: 0 },
        attributes: { added: 0 },
        deliveryCharge: { added: 0 },
        warranty: { added: 0 },
        brand: { added: 0 },
        price: { added: 0 },
      };

      response.reports.forEach((report) => {
        const data = report.data;
        Object.keys(aggregated).forEach((key) => {
          if (data[key]) {
            Object.keys(data[key]).forEach((subKey) => {
              aggregated[key][subKey] += data[key][subKey] || 0;
            });
          }
        });
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

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  const formatWhatsAppMessage = () => {
    if (!aggregatedData) return "";

    let text = `*Date Range Report (${startDate} to ${endDate})*\n\nProducts:\n`;

    const addLine = (label, data) => {
      const parts = [];
      if (data.generated > 0) parts.push(`generated ${data.generated}`);
      if (data.added > 0) parts.push(`added ${data.added}`);
      if (data.fixed > 0) parts.push(`fixed ${data.fixed}`);
      if (parts.length > 0) {
        text += `- ${label}: ${parts.join(", ")}\n`;
      }
    };

    addLine("description", aggregatedData.description);
    addLine("FAQ", aggregatedData.faq);
    addLine("key features", aggregatedData.keyFeatures);
    addLine("specifications", aggregatedData.specifications);
    addLine("meta title and description", aggregatedData.metaTitleDescription);
    addLine("warranty claim reasons", aggregatedData.warrantyClaimReasons);
    addLine("title", aggregatedData.titleFixed);

    if (aggregatedData.imageRenamed?.fixed > 0) {
      text += `- image renamed and fixed: ${aggregatedData.imageRenamed.fixed}\n`;
    }

    if (aggregatedData.category?.added > 0)
      text += `- category: added ${aggregatedData.category.added}\n`;
    if (aggregatedData.attributes?.added > 0)
      text += `- attributes: added ${aggregatedData.attributes.added}\n`;
    if (aggregatedData.deliveryCharge?.added > 0)
      text += `- delivery charge: added ${aggregatedData.deliveryCharge.added}\n`;
    if (aggregatedData.warranty?.added > 0)
      text += `- warranty: added ${aggregatedData.warranty.added}\n`;
    if (aggregatedData.brand?.added > 0)
      text += `- brand: added ${aggregatedData.brand.added}\n`;
    if (aggregatedData.price?.added > 0)
      text += `- price: added ${aggregatedData.price.added}\n`;

    return text;
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-4">
          Generate Date Range Report
        </h2>
        <p className="text-sm text-gray-600 mb-6">
          Select a date range to generate an aggregated report
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Start Date
            </label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              End Date
            </label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="w-full px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Generating..." : "Generate Report"}
            </button>
          </div>
        </div>
      </div>

      {aggregatedData && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Aggregated Report ({reports.length} days)
            </h3>
            <button
              onClick={() => copyToClipboard(formatWhatsAppMessage())}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
            >
              Copy for WhatsApp
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <pre className="whitespace-pre-wrap text-sm text-gray-700 font-mono">
              {formatWhatsAppMessage()}
            </pre>
          </div>

          <div className="mt-6">
            <h4 className="text-md font-semibold text-gray-900 mb-3">
              Daily Breakdown
            </h4>
            <div className="space-y-2">
              {reports.map((report, index) => (
                <div
                  key={index}
                  className="p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">
                      {report.date}
                    </span>
                    <span className="text-sm text-gray-600">
                      {report.hourlyReportsCount} hourly report(s)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangeReport;
