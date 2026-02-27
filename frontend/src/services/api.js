import config from "../config/api.config";

const API_URL = config.API_URL;

const getHeaders = () => {
  const token = localStorage.getItem("token");
  return {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

const handleResponse = async (response) => {
  if (!response.ok) {
    // Try to parse error body as JSON to extract message
    let errorMessage = response.statusText;
    try {
      const errorData = await response.json();
      errorMessage = errorData.message || errorMessage;
    } catch {
      // If JSON parsing fails, try text
      try {
        errorMessage = (await response.text()) || errorMessage;
      } catch {
        // use statusText as fallback
      }
    }

    if (response.status === 401) {
      // Don't redirect for change-password — 401 means wrong current password
      const url = response.url || "";
      if (!url.includes("change-password")) {
        // Clear user data and redirect to login
        localStorage.removeItem("user");
        localStorage.removeItem("token");
        if (window.location.pathname !== "/login") {
          window.location.href = "/login";
        }
      }
    }
    throw new Error(errorMessage);
  }
  return response.json();
};

const login = async (email, password) => {
  const response = await fetch(`${API_URL}/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  const data = await handleResponse(response);

  // Store token and user info
  if (data.token) {
    localStorage.setItem("token", data.token);
    localStorage.setItem(
      "user",
      JSON.stringify({
        id: data.id,
        name: data.name,
        email: data.email,
        role: data.role,
      }),
    );
  }
  return data;
};

const logout = async () => {
  try {
    await fetch(`${API_URL}/logout`, {
      method: "POST",
      headers: getHeaders(),
    });
  } catch (error) {
    console.error("Logout error:", error);
  } finally {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
  }
};

const getCurrentUser = () => {
  return JSON.parse(localStorage.getItem("user"));
};

const getPrompts = async () => {
  const response = await fetch(`${API_URL}/prompts`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const savePrompts = async (prompts) => {
  const response = await fetch(`${API_URL}/prompts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(prompts),
  });
  return handleResponse(response);
};

const resetPrompts = async () => {
  const response = await fetch(`${API_URL}/prompts`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const resetMainPrompt = async () => {
  const response = await fetch(`${API_URL}/prompts/main`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const resetStaticPrompt = async () => {
  const response = await fetch(`${API_URL}/prompts/static`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

// Category Prompts API
const getCategoryPrompts = async () => {
  const response = await fetch(`${API_URL}/category-prompts`, {
    method: "GET",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const saveCategoryPrompts = async (prompts) => {
  const response = await fetch(`${API_URL}/category-prompts`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(prompts),
  });
  return handleResponse(response);
};

const resetCategoryPrompts = async () => {
  const response = await fetch(`${API_URL}/category-prompts`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const resetCategoryPrompt1 = async () => {
  const response = await fetch(`${API_URL}/category-prompts/prompt1`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const resetCategoryPrompt2 = async () => {
  const response = await fetch(`${API_URL}/category-prompts/prompt2`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const changePassword = async (currentPassword, newPassword) => {
  const response = await fetch(`${API_URL}/change-password`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ currentPassword, newPassword }),
  });
  return handleResponse(response);
};

// Generic HTTP methods for API calls
const get = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "GET",
    headers: getHeaders(),
    cache: "no-store",
  });
  return handleResponse(response);
};

const post = async (endpoint, data) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

const put = async (endpoint, data) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "PUT",
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  return handleResponse(response);
};

const del = async (endpoint) => {
  const response = await fetch(`${API_URL}${endpoint}`, {
    method: "DELETE",
    headers: getHeaders(),
  });
  return handleResponse(response);
};

const authService = {
  login,
  logout,
  getCurrentUser,
  getPrompts,
  savePrompts,
  resetPrompts,
  resetMainPrompt,
  resetStaticPrompt,
  getCategoryPrompts,
  saveCategoryPrompts,
  resetCategoryPrompts,
  resetCategoryPrompt1,
  resetCategoryPrompt2,
  changePassword,
  // Generic HTTP methods
  get,
  post,
  put,
  delete: del,
};

export default authService;
