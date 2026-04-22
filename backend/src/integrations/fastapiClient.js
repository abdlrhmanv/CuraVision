const axios = require("axios");

/**
 * Axios instance pre-configured to talk to the FastAPI AI microservice.
 * Base URL is read from the AI_SERVICE_URL env variable.
 */
const fastapiClient = axios.create({
  baseURL: process.env.AI_SERVICE_URL || "http://localhost:8001",
  timeout: 60000, // 60 s — AI calls can be slow
  headers: { "Content-Type": "application/json" },
});

module.exports = { fastapiClient };
