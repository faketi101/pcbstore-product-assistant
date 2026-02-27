import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Eye } from "lucide-react";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskList from "../components/tasks/TaskList";
import taskService from "../services/taskService";

const PublicTasks = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [tasks, setTasks] = useState([]);
  const [pagination, setPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [users, setUsers] = useState([]);
  const [debugInfo, setDebugInfo] = useState("");
  const usersLoaded = useRef(false);

  // Initialize filters from URL params
  const getFiltersFromURL = () => ({
    page: parseInt(searchParams.get("page")) || 1,
    limit: parseInt(searchParams.get("limit")) || 10,
    sortBy: searchParams.get("sortBy") || "statusPriority",
    sortOrder: searchParams.get("sortOrder") || "desc",
    search: searchParams.get("search") || "",
    status: searchParams.getAll("status") || [],
    assignedTo: searchParams.getAll("assignedTo") || [],
    dateFrom: searchParams.get("dateFrom") || "",
    dateTo: searchParams.get("dateTo") || "",
  });

  const [filters, setFilters] = useState(getFiltersFromURL);

  // Build a clean params object with only known keys (avoids circular refs)
  const buildParams = (f) => ({
    page: f.page,
    limit: f.limit,
    sortBy: f.sortBy,
    sortOrder: f.sortOrder,
    search: f.search || "",
    status: f.status || [],
    assignedTo: f.assignedTo || [],
    dateFrom: f.dateFrom || "",
    dateTo: f.dateTo || "",
  });

  // Build URL query string (same logic as taskService.toQuery)
  const toQueryString = (params) => {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") return;
      if (Array.isArray(val)) {
        val.forEach((v) => v && qs.append(key, v));
      } else {
        qs.append(key, val);
      }
    });
    return qs.toString();
  };

  // Fetch tasks whenever filters change
  useEffect(() => {
    let cancelled = false;
    const doFetch = async () => {
      try {
        setLoading(true);
        const params = buildParams(filters);
        const urlStr = `/tasks/public?${toQueryString(params)}`;
        setDebugInfo(`Calling: ${urlStr}`);
        const data = await taskService.getPublicTasks(params);
        if (!cancelled) {
          setTasks(data.tasks);
          setPagination(data.pagination);
          setDebugInfo(
            `URL: ${urlStr} → Total: ${data.pagination.total} (page ${data.pagination.page}/${data.pagination.pages})`,
          );
        }
      } catch (error) {
        console.error("Error fetching public tasks:", error);
        if (!cancelled) setDebugInfo(`Error: ${error.message}`);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    doFetch();
    return () => {
      cancelled = true;
    };
  }, [filters]);

  // Load users once on mount (separate from task fetching)
  useEffect(() => {
    if (usersLoaded.current) return;
    usersLoaded.current = true;
    document.title = "Public Tasks - PCB Automation";
    const loadUsers = async () => {
      try {
        const data = await taskService.getPublicTasks({ limit: 100 });
        const uniqueUsers = new Map();
        data.tasks.forEach((task) => {
          (task.assignedUsers || []).forEach((user) => {
            if (!uniqueUsers.has(user._id)) {
              uniqueUsers.set(user._id, user);
            }
          });
        });
        setUsers(Array.from(uniqueUsers.values()));
      } catch (error) {
        console.error("Error fetching users:", error);
      }
    };
    loadUsers();
  }, []);

  // Update URL when filters change
  useEffect(() => {
    const urlParams = new URLSearchParams();
    const clean = buildParams(filters);
    Object.entries(clean).forEach(([key, val]) => {
      if (val === undefined || val === null || val === "") return;
      if (Array.isArray(val)) {
        val.forEach((v) => {
          if (v) urlParams.append(key, v);
        });
      } else {
        urlParams.append(key, val);
      }
    });
    setSearchParams(urlParams, { replace: true });
  }, [filters, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1, limit: filters.limit });
  };

  const handleClearFilters = () => {
    setFilters({
      page: 1,
      limit: 10,
      sortBy: "statusPriority",
      sortOrder: "desc",
      search: "",
      status: [],
      assignedTo: [],
      dateFrom: "",
      dateTo: "",
    });
  };

  const handlePageChange = (page) => {
    setFilters((prev) => ({ ...prev, page }));
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-primary rounded-lg sm:rounded-xl">
              <Eye className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Public Tasks Board
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                View all team tasks and their progress
              </p>
            </div>
          </div>
        </div>

        {/* Debug Info - remove after testing */}
        {/* {debugInfo && (
          <div className="mb-4 p-2 bg-yellow-100 dark:bg-yellow-900 text-xs font-mono rounded border border-yellow-300 dark:border-yellow-700 break-all">
            {debugInfo}
          </div>
        )} */}

        {/* Filters */}
        <div className="space-y-6">
          <TaskFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onClearFilters={handleClearFilters}
            showAssignedFilter={true}
            users={users}
          />

          {/* Task List */}
          <TaskList
            tasks={tasks}
            pagination={pagination}
            onPageChange={handlePageChange}
            loading={loading}
            showActions={false}
            emptyMessage="No tasks available"
          />
        </div>
      </div>
    </div>
  );
};

export default PublicTasks;
