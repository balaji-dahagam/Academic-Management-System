const connectToMongo = require("./db");
const cors = require("cors");
const express = require("express");
const http = require("http");
const cookieParser = require("cookie-parser");

// Initialize MongoDB first
connectToMongo();

const app = express();
const server = http.createServer(app);

// Middleware setup
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:8081",
  credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// Initialize Socket.io
const socket = require("./socket");
const io = socket.init(server);

// Socket.io connection handling
io.on("connection", (socket) => {
  console.log("New client connected:", socket.id);

  socket.on("joinUserRoom", (userId) => {
    socket.join(userId);
    console.log(`User ${userId} joined their room`);
  });

  socket.on("disconnect", () => {
    console.log("Client disconnected:", socket.id);
  });
});

// Make io accessible in routes AFTER initialization
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes should come after Socket.io initialization
app.use("/api", require("./routes/student"));
app.use("/api", require("./routes/faculty"));
app.use("/api", require("./routes/class"));
app.use("/api", require("./routes/notification"));

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});