let io = null;

module.exports = {
  init: (httpServer) => {
    const { Server } = require("socket.io");
    io = new Server(httpServer, {
      cors: {
        origin: "http://localhost:8081",
        methods: ["GET", "POST","PUT","DELETE","PATCH"]
      }
    });
    return io;
  },
  getIO: () => {
    if (!io) {
      throw new Error("Socket.io not initialized! Call init() first.");
    }
    return io;
  }
};