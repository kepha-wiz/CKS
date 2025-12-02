const { Server: SocketIOServer } = require("socket.io");

let io = null;

function initSocket(server) {
  if (io) return io; // prevent double initialisation

  io = new SocketIOServer(server, {
    path: "/socket.io",
    cors: {
      origin: "*"
    }
  });

  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("test", (data) => {
      socket.emit("test-response", {
        message: "Server received test message",
        data,
        timestamp: new Date().toISOString(),
      });
    });

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });

  console.log("Socket.IO initialized");
  return io;
}

function getIO() {
  if (!io) throw new Error("Socket.IO not initialized");
  return io;
}

module.exports = { initSocket, getIO };
