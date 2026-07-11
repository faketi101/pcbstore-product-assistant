import axios from "axios";
import config from "../config/api.config";

const API_URL = `${config.API_URL}/reports`;

// Configure axios to send authorization token
axios.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle 401 errors
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("user");
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

const reportService = {
  getCurrentTemplate: async () => {
    const response = await axios.get(`${config.API_URL}/report-templates/current`);
    return response.data;
  },

  getActiveReportTemplates: async () => {
    const response = await axios.get(`${config.API_URL}/report-templates/active`);
    return response.data;
  },

  getReportFilterTemplates: async (admin = false) => {
    const endpoint = admin
      ? `${API_URL}/admin/filter-templates`
      : `${API_URL}/filter-templates`;
    const response = await axios.get(endpoint);
    return response.data.templates || [];
  },

  getReportTemplates: async () => {
    const response = await axios.get(`${config.API_URL}/report-templates`);
    return response.data;
  },

  createReportTemplate: async (data) => {
    const response = await axios.post(`${config.API_URL}/report-templates`, data);
    return response.data;
  },

  updateReportTemplate: async (id, data) => {
    const response = await axios.put(`${config.API_URL}/report-templates/${id}`, data);
    return response.data;
  },

  deleteReportTemplate: async (id) => {
    const response = await axios.delete(`${config.API_URL}/report-templates/${id}`);
    return response.data;
  },
  // Create new hourly report
  createHourlyReport: async (reportData) => {
    const response = await axios.post(`${API_URL}/hourly`, reportData);
    return response.data;
  },

  // Get hourly reports with optional filters
  getHourlyReports: async (filters = {}) => {
    const params = new URLSearchParams();
    if (filters.date) params.append("date", filters.date);
    if (filters.startDate) params.append("startDate", filters.startDate);
    if (filters.endDate) params.append("endDate", filters.endDate);
    if (filters.templateRole)
      params.append("templateRole", filters.templateRole);

    const response = await axios.get(`${API_URL}/hourly?${params.toString()}`);
    return response.data;
  },

  // Get aggregated daily report for a specific date
  getDailyReport: async (date, templateRole = "") => {
    const params = new URLSearchParams();
    if (templateRole) params.append("templateRole", templateRole);
    const query = params.toString();
    const response = await axios.get(
      `${API_URL}/daily/${date}${query ? `?${query}` : ""}`,
    );
    return response.data;
  },

  // Get multiple daily reports with date range
  getDailyReports: async (startDate, endDate, templateRole = "") => {
    const params = new URLSearchParams();
    if (startDate) params.append("startDate", startDate);
    if (endDate) params.append("endDate", endDate);
    if (templateRole) params.append("templateRole", templateRole);

    const response = await axios.get(`${API_URL}/daily?${params.toString()}`);
    return response.data;
  },

  // Admin: Get reports from all users with date range and optional userId
  getDateRangeReport: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append("startDate", params.startDate);
    if (params.endDate) qs.append("endDate", params.endDate);
    if (params.userId) qs.append("userId", params.userId);
    if (params.templateRole) qs.append("templateRole", params.templateRole);
    const query = qs.toString();
    const response = await axios.get(
      `${API_URL}/admin/reports${query ? `?${query}` : ""}`,
    );
    return response.data;
  },

  // Admin: Get daily aggregated reports across all users
  getAdminDailyReports: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append("startDate", params.startDate);
    if (params.endDate) qs.append("endDate", params.endDate);
    if (params.userId) qs.append("userId", params.userId);
    if (params.templateRole) qs.append("templateRole", params.templateRole);
    const query = qs.toString();
    const response = await axios.get(
      `${API_URL}/admin/daily${query ? `?${query}` : ""}`,
    );
    return response.data;
  },

  // Admin: Get combined range summary across all users
  getAdminRangeReports: async (params = {}) => {
    const qs = new URLSearchParams();
    if (params.startDate) qs.append("startDate", params.startDate);
    if (params.endDate) qs.append("endDate", params.endDate);
    if (params.userId) qs.append("userId", params.userId);
    if (params.templateRole) qs.append("templateRole", params.templateRole);
    const query = qs.toString();
    const response = await axios.get(
      `${API_URL}/admin/range${query ? `?${query}` : ""}`,
    );
    return response.data;
  },

  // Update existing hourly report
  updateHourlyReport: async (id, reportData) => {
    const response = await axios.put(`${API_URL}/hourly/${id}`, reportData);
    return response.data;
  },

  // Delete hourly report
  deleteHourlyReport: async (id) => {
    const response = await axios.delete(`${API_URL}/hourly/${id}`);
    return response.data;
  },
};

export default reportService;
