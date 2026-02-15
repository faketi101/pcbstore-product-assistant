import { useState, useEffect, useContext, useCallback } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { ListTodo, CheckSquare } from "lucide-react";
import TaskFilters from "../components/tasks/TaskFilters";
import TaskList from "../components/tasks/TaskList";
import TaskFormModal from "../components/tasks/TaskFormModal";
import { AuthContext } from "../context/AuthContext";
import taskService from "../services/taskService";
import toast from "react-hot-toast";

const UserTasks = () => {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState("my-tasks");
  const [myTasks, setMyTasks] = useState([]);
  const [allTasks, setAllTasks] = useState([]);
  const [myPagination, setMyPagination] = useState({});
  const [allPagination, setAllPagination] = useState({});
  const [loading, setLoading] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState([]);

  const [myFilters, setMyFilters] = useState({
    page: 1,
    limit: 10,
    sortBy: "statusPriority",
    sortOrder: "desc",
  });

  const [allFilters, setAllFilters] = useState({
    page: 1,
    limit: 10,
    sortBy: "statusPriority",
    sortOrder: "desc",
  });

  const fetchMyTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getMyTasks(myFilters);
      setMyTasks(data.tasks);
      setMyPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching my tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [myFilters]);

  const fetchAllTasks = useCallback(async () => {
    try {
      setLoading(true);
      const data = await taskService.getAllTasks(allFilters);
      setAllTasks(data.tasks);
      setAllPagination(data.pagination);
    } catch (error) {
      console.error("Error fetching all tasks:", error);
      toast.error("Failed to fetch tasks");
    } finally {
      setLoading(false);
    }
  }, [allFilters]);

  const fetchUsers = useCallback(async () => {
    try {
      const data = await taskService.getUsers();
      setUsers(data);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  }, []);

  useEffect(() => {
    document.title = "My Tasks - PCB Automation";
    fetchUsers();
    if (activeTab === "my-tasks") {
      fetchMyTasks();
    } else {
      fetchAllTasks();
    }
  }, [activeTab, fetchMyTasks, fetchAllTasks, fetchUsers]);

  const handleMyFilterChange = (filters) => {
    setMyFilters({ ...filters, page: 1, limit: myFilters.limit });
  };

  const handleAllFilterChange = (filters) => {
    setAllFilters({ ...filters, page: 1, limit: allFilters.limit });
  };

  const handleMyClearFilters = () => {
    setMyFilters({
      page: 1,
      limit: 10,
      sortBy: "statusPriority",
      sortOrder: "desc",
    });
  };

  const handleAllClearFilters = () => {
    setAllFilters({
      page: 1,
      limit: 10,
      sortBy: "statusPriority",
      sortOrder: "desc",
    });
  };

  const handleMyPageChange = (page) => {
    setMyFilters({ ...myFilters, page });
  };

  const handleAllPageChange = (page) => {
    setAllFilters({ ...allFilters, page });
  };

  const handleEditTask = (task) => {
    // Check if user is admin or assigned to the task
    const isAdmin = user?.role === "admin";
    const userId = user?.id || user?._id;
    const isAssigned = (task.assignedUsers || task.assignedTo || []).some(
      (u) => String(u._id || u) === String(userId),
    );

    if (!isAdmin && !isAssigned) {
      toast.error("You don't have permission to edit this task");
      return;
    }

    setEditingTask(task);
    setShowEditModal(true);
  };

  const handleSaveTask = async (taskData) => {
    try {
      setLoading(true);
      await taskService.updateTask(editingTask._id, taskData);
      toast.success("Task updated successfully");
      setShowEditModal(false);
      setEditingTask(null);

      // Refresh the current tab
      if (activeTab === "my-tasks") {
        fetchMyTasks();
      } else {
        fetchAllTasks();
      }
    } catch (error) {
      console.error("Error updating task:", error);
      toast.error(error.response?.data?.message || "Failed to update task");
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = user?.role === "admin";

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-6 sm:py-8 max-w-7xl">
        {/* Header */}
        <div className="mb-6 sm:mb-8">
          <div className="flex items-center gap-3">
            <div className="p-2 sm:p-2.5 bg-primary rounded-lg sm:rounded-xl">
              <ListTodo className="h-5 w-5 sm:h-6 sm:w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                Tasks
              </h1>
              <p className="text-sm text-muted-foreground hidden sm:block">
                Manage and track your team tasks
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
          <TabsList className="w-full sm:w-auto grid grid-cols-2 sm:inline-flex h-auto p-1">
            <TabsTrigger
              value="my-tasks"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <CheckSquare className="h-4 w-4" />
              <span>My Tasks</span>
            </TabsTrigger>
            <TabsTrigger
              value="all-tasks"
              className="gap-1.5 sm:gap-2 text-xs sm:text-sm px-3 sm:px-4 py-2"
            >
              <ListTodo className="h-4 w-4" />
              <span>All Tasks</span>
            </TabsTrigger>
          </TabsList>

          {/* My Tasks Tab */}
          <TabsContent value="my-tasks" className="space-y-6">
            <TaskFilters
              filters={myFilters}
              onFilterChange={handleMyFilterChange}
              onClearFilters={handleMyClearFilters}
              showAssignedFilter={true}
              users={users}
            />
            <TaskList
              tasks={myTasks}
              pagination={myPagination}
              onPageChange={handleMyPageChange}
              onEdit={handleEditTask}
              loading={loading}
              showActions={true}
              isAdmin={isAdmin}
              emptyMessage="You have no assigned tasks"
            />
          </TabsContent>

          {/* All Tasks Tab */}
          <TabsContent value="all-tasks" className="space-y-6">
            <TaskFilters
              filters={allFilters}
              onFilterChange={handleAllFilterChange}
              onClearFilters={handleAllClearFilters}
              showAssignedFilter={true}
              users={users}
            />
            <TaskList
              tasks={allTasks}
              pagination={allPagination}
              onPageChange={handleAllPageChange}
              onEdit={handleEditTask}
              loading={loading}
              showActions={true}
              isAdmin={isAdmin}
              emptyMessage="No tasks found"
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Task Modal */}
      {showEditModal && (
        <TaskFormModal
          task={editingTask}
          onSave={handleSaveTask}
          onClose={() => {
            setShowEditModal(false);
            setEditingTask(null);
          }}
          isAdmin={isAdmin}
          loading={loading}
        />
      )}
    </div>
  );
};

export default UserTasks;
