const dns = require("dns");

dns.setServers(["8.8.8.8", "1.1.1.1"]);

require("dotenv").config();

const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const helmet = require("helmet");
const compression = require("compression");
const mongoSanitize = require("express-mongo-sanitize");
const connectDB = require("./config/db");
const errorHandler = require("./middleware/errorHandler");
const logger = require("./middleware/logger");
const { apiLimiter } = require("./middleware/rateLimiter");

const app = express();
const server = http.createServer(app);
const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
  "http://127.0.0.1:5173",
].filter(Boolean);
const corsOptions = {
  origin(origin, callback) {
    if (
      !origin ||
      process.env.NODE_ENV !== "production" ||
      allowedOrigins.includes(origin)
    )
      return callback(null, true);
    return callback(new Error("Origin is not allowed"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
};
const io = new Server(server, { cors: corsOptions });

app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
);
app.use(compression());
app.use(cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(mongoSanitize());
app.use(logger);
app.use("/api", apiLimiter);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/import", require("./routes/dataImport"));
app.use("/api/datasets", require("./routes/datasets"));
app.use("/api/chat", require("./routes/chatbot"));
app.use("/api/equipment", require("./routes/equipment"));
app.use("/api/sensors", require("./routes/sensors"));
app.use("/api/alerts", require("./routes/alerts"));
app.use("/api/analytics", require("./routes/analytics"));
app.use("/api/maintenance", require("./routes/maintenance"));
app.use("/api/anomalies", require("./routes/anomalies"));
app.get("/api/health", (_req, res) =>
  res.json({ success: true, data: { status: "ok", timestamp: new Date() } }),
);
app.get("/", (_req, res) => res.send("AI Predictive Maintenance API"));

io.on("connection", (socket) => {
  socket.on("subscribe:equipment", (equipmentId) =>
    socket.join(`equipment:${equipmentId}`),
  );
});
app.use(errorHandler);

const port = Number(process.env.PORT) || 5000;
async function start() {
  await connectDB();
  server.listen(port, () => console.log(`API listening on ${port}`));
}
start().catch((error) => {
  console.error("Failed to start API:", error);
  process.exit(1);
});
