// API Configuration
const config = {
  // Change this to your local network IP when needed
  // Examples:
  // - localhost: 'http://localhost:5000'
  // - local network: 'http://192.168.1.100:5000'
  API_BASE_URL: import.meta.env.VITE_API_URL || "https://pcbserver.bitobi.co.uk",
  API_ENDPOINT: "/api",

  // Computed API URL
  get API_URL() {
    return `${this.API_BASE_URL}${this.API_ENDPOINT}`;
  },
};

export default config;
