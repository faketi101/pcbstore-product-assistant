import api from "./api";

// Build query string from params object (handles arrays properly)
const toQuery = (params = {}) => {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([key, val]) => {
    if (val === undefined || val === null || val === "") return;
    if (Array.isArray(val)) {
      val.forEach((v) => v && qs.append(key, v));
    } else {
      qs.append(key, val);
    }
  });
  const str = qs.toString();
  return str ? `?${str}` : "";
};

const taskService = {
  // Public
  getPublicTasks: (params) => api.get(`/tasks/public${toQuery(params)}`),

  // Authenticated user
  getUsers: () => api.get("/tasks/users"),
  getMyTasks: (params) => api.get(`/tasks/my-tasks${toQuery(params)}`),
  getAllTasks: (params) => api.get(`/tasks/all-tasks${toQuery(params)}`),
  getTask: (id) => api.get(`/tasks/${id}`),
  updateTask: (id, data) => api.put(`/tasks/${id}`, data),

  // Admin
  getAdminTasks: (params) => api.get(`/tasks/admin/tasks${toQuery(params)}`),
  getAdminUsers: () => api.get("/tasks/admin/users"),
  createTask: (data) => api.post("/tasks", data),
  updateAdminTask: (id, data) => api.put(`/tasks/admin/${id}`, data),
  deleteTask: (id) => api.delete(`/tasks/${id}`),
};

export default taskService;
