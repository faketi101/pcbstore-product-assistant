import { useState, useEffect, useContext, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Settings,
  BarChart3,
  ListChecks,
  Plus,
  User,
  Clock,
  CalendarDays,
  CalendarRange,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskList from "../components/tasks/TaskList";
import TaskFormModal from "../components/tasks/TaskFormModal";
import { AuthContext } from "../context/AuthContext";
import { Navigate } from "react-router-dom";
import taskService from "../services/taskService";
import reportService from "../services/reportService";
import toast from "react-hot-toast";

const AdminPanel = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("tasks");
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [reports, setReports] = useState([]);
  const [reportView, setReportView] = useState("hourly");
  const [reportFilters, setReportFilters] = useState({
    startDate: "",
    endDate: "",
    userId: "",
  });

  const [filters, setFilters] = useState({
    page: 1,
    limit: 10,
    sortBy: "statusPriority",
    sortOrder: "desc",
  });

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getAdminTasks(filters);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await taskService.getAdminUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (reportFilters.startDate) params.startDate = reportFilters.startDate;
      if (reportFilters.endDate) params.endDate = reportFilters.endDate;
      if (reportFilters.userId) params.userId = reportFilters.userId;

      let data;
      if (reportView === "daily") {
        data = await reportService.getAdminDailyReports(params);
      } else if (reportView === "range") {
        data = await reportService.getAdminRangeReports(params);
      } else {
        data = await reportService.getDateRangeReport(params);
      }
      setReports(data.reports || []);
    } catch (error) {
      console.error("Error fetching reports:", error);
      toast.error("Failed to fetch reports");
    } finally {
      setLoading(false);
    }
  }, [reportFilters, reportView]);

  // Redirect non-admin users
  useEffect(() => {
    if (user && user.role !== "admin") {
      // Will be handled by Navigate component
    }
  }, [user]);

  useEffect(() => {
    document.title = "Admin Panel - PCB Automation";
    fetchUsers();
    if (activeTab === "tasks" || activeTab === "task-view") {
      fetchTasks();
    } else if (activeTab === "reports") {
      fetchReports();
    }
  }, [activeTab, fetchTasks, fetchUsers, fetchReports]);

  // Check user role before rendering
  if (!user || user.role !== "admin") {
    return <Navigate to="/" replace />;
  }

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1, limit: filters.limit });
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      sortBy: "statusPriority",
      sortOrder: "desc",
    });
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
  };

  const handleCreateTask = () => {
    setEditingTask(null);
    setShowTaskModal(true);
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setShowTaskModal(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      setLoading(true);
      if (editingTask) {
        await taskService.updateAdminTask(editingTask._id, taskData);
        toast.success("Task updated successfully");
      } else {
        await taskService.createTask(taskData);
        toast.success("Task created successfully");
      }
      setShowTaskModal(false);
      setEditingTask(null);
      fetchTasks();
    } catch (error) {
      console.error("Error saving task:", error);
      toast.error(error.response?.data?.message || "Failed to save task");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTask = async (task) => {
    if (!confirm(`Are you sure you want to delete "${task.title}"?`)) {
      return;
    }

    try {
      await taskService.deleteTask(task._id);
      toast.success("Task deleted successfully");
      fetchTasks();
    } catch (error) {
      console.error("Error deleting task:", error);
      toast.error("Failed to delete task");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-primary rounded-lg sm:rounded-xl">
              <Settings className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div className="flex-1">
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Admin Panel
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Manage tasks, view reports, and oversee team activities
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-4 sm:space-y-6"
        >
          <TabsList className="w-full sm:w-auto grid grid-cols-3 sm:inline-flex h-auto p-1">
            <TabsTrigger
              value="reports"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              <BarChart3 className="h-4 w-4" />
              <span>Reports</span>
            </TabsTrigger>
            <TabsTrigger
              value="tasks"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              <Settings className="h-4 w-4" />
              <span>Manage</span>
            </TabsTrigger>
            <TabsTrigger
              value="task-view"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4 py-2"
            >
              <ListChecks className="h-4 w-4" />
              <span>View</span>
            </TabsTrigger>
          </TabsList>

          {/* Reports Tab */}
          <TabsContent value="reports" className="space-y-6">
            {/* Report View Selector */}
            <div className="flex flex-wrap gap-2">
              {[
                { key: "hourly", label: "Hourly", icon: Clock },
                { key: "daily", label: "Daily", icon: CalendarDays },
                { key: "range", label: "Range Summary", icon: CalendarRange },
              ].map(({ key, label, icon: Icon }) => (
                <Button
                  key={key}
                  variant={reportView === key ? "default" : "outline"}
                  size="sm"
                  onClick={() => {
                    setReportView(key);
                    setReports([]);
                  }}
                >
                  <Icon className="h-4 w-4 mr-1.5" />
                  {label}
                </Button>
              ))}
            </div>

            {/* Filters */}
            <div className="bg-muted/50 rounded-lg p-4 border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <input
                    type="date"
                    value={reportFilters.startDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        startDate: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <input
                    type="date"
                    value={reportFilters.endDate}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        endDate: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">User</label>
                  <select
                    value={reportFilters.userId}
                    onChange={(e) =>
                      setReportFilters({
                        ...reportFilters,
                        userId: e.target.value,
                      })
                    }
                    className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
                  >
                    <option value="">All Users</option>
                    {users.map((u) => (
                      <option key={u._id} value={u._id}>
                        {u.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={fetchReports} size="sm">
                  Apply Filters
                </Button>
              </div>
            </div>

            {/* Report Results */}
            <div className="space-y-3">
              {loading ? (
                <div className="text-center py-12">
                  <div className="h-8 w-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : reports.length > 0 ? (
                reports.map((report, idx) => (
                  <div
                    key={report.id || `${report.userId}-${report.date}-${idx}`}
                    className="bg-card rounded-lg border overflow-hidden"
                  >
                    {/* Card Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-muted/30 border-b">
                      <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <User className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm truncate">
                            {report.userName || "Unknown User"}
                          </span>
                          <Badge variant="outline" className="text-xs shrink-0">
                            {reportView === "hourly"
                              ? "Hourly"
                              : reportView === "daily"
                                ? "Daily"
                                : "Range"}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {reportView === "range"
                            ? `${report.dateRange?.from} → ${report.dateRange?.to} · ${report.totalDays} days · ${report.totalReports} reports`
                            : reportView === "daily"
                              ? `${report.date} · ${report.hourlyReportsCount || 0} hourly reports`
                              : `${report.date} at ${report.time || "—"}`}
                        </p>
                      </div>
                    </div>
                    {/* Card Body */}
                    <pre className="text-xs p-4 overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed text-muted-foreground">
                      {report.formattedText ||
                        JSON.stringify(report.data, null, 2)}
                    </pre>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 text-muted-foreground">
                  No reports found. Select filters and click Apply.
                </div>
              )}
            </div>
          </TabsContent>

          {/* Manage Tasks Tab */}
          <TabsContent value="tasks" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">Manage Tasks</h2>
              <Button onClick={handleCreateTask}>
                <Plus className="h-4 w-4 mr-2" />
                Create Task
              </Button>
            </div>

            <TaskFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              showAssignedFilter={true}
              users={users}
            />

            <TaskList
              tasks={tasks}
              pagination={pagination}
              onPageChange={handlePageChange}
              onEdit={handleEditTask}
              onDelete={handleDeleteTask}
              loading={loading}
              showActions={true}
              isAdmin={true}
              emptyMessage="No tasks found"
            />
          </TabsContent>

          {/* Task View Tab */}
          <TabsContent value="task-view" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">All Tasks Overview</h2>
            </div>

            <TaskFilters
              filters={filters}
              onFilterChange={handleFilterChange}
              onClearFilters={handleClearFilters}
              showAssignedFilter={true}
              users={users}
            />

            <TaskList
              tasks={tasks}
              pagination={pagination}
              onPageChange={handlePageChange}
              onEdit={handleEditTask}
              loading={loading}
              showActions={false}
              isAdmin={true}
              emptyMessage="No tasks found"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Task Form Modal */}
      {showTaskModal && (
        <TaskFormModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowTaskModal(false);
            setEditingTask(null);
          }}
          isAdmin={true}
          users={users}
          loading={loading}
        />
      )}
    </div>
  );
};

export default AdminPanel;
