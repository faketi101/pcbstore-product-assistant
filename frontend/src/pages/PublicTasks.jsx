import { useState, useEffect, useCallback } from "react";
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

  // Initialize filters from URL params
  const getFiltersFromURL = () => {
    const filters = {
      page: parseInt(searchParams.get("page")) || 1,
      limit: parseInt(searchParams.get("limit")) || 10,
      sortBy: searchParams.get("sortBy") || "statusPriority",
      sortOrder: searchParams.get("sortOrder") || "desc",
      search: searchParams.get("search") || "",
      status: searchParams.getAll("status") || [],
      assignedTo: searchParams.getAll("assignedTo") || [],
      startDateFrom: searchParams.get("startDateFrom") || "",
      startDateTo: searchParams.get("startDateTo") || "",
      dueDateFrom: searchParams.get("dueDateFrom") || "",
      dueDateTo: searchParams.get("dueDateTo") || "",
    };
    return filters;
  };

  const [filters, setFilters] = useState(getFiltersFromURL());

  const fetchTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getPublicTasks(filters);
      setTasks(data.tasks);
      setPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching public tasks:", error);
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const fetchUsers = useCallback(async () => {
    try {
      // Extract unique users from all tasks
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
  }, []);

  useEffect(() => {
    document.title = "Public Tasks - PCB Automation";
    fetchTasks();
    fetchUsers();
  }, [fetchTasks, fetchUsers]);

  // Update URL when filters change
  useEffect(() => {
    const params = new URLSearchParams();

    Object.keys(filters).forEach((key) => {
      if (
        filters[key] !== undefined &&
        filters[key] !== null &&
        filters[key] !== ""
      ) {
        if (Array.isArray(filters[key])) {
          filters[key].forEach((val) => {
            if (val) params.append(key, val);
          });
        } else {
          params.append(key, filters[key]);
        }
      }
    });

    setSearchParams(params);
  }, [filters, setSearchParams]);

  const handleFilterChange = (newFilters) => {
    setFilters({ ...newFilters, page: 1, limit: filters.limit });
  };

  const handleClearFilters = () => {
    const resetFilters = {
      page: 1,
      limit: 10,
      sortBy: "statusPriority",
      sortOrder: "desc",
      search: "",
      status: [],
      assignedTo: [],
      startDateFrom: "",
      startDateTo: "",
      dueDateFrom: "",
      dueDateTo: "",
    };
    setFilters(resetFilters);
  };

  const handlePageChange = (page) => {
    setFilters({ ...filters, page });
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
