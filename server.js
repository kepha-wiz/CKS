const { createServer } = require("http");
const next = require("next");
const { initSocket } = require("./src/socket");

const port = process.env.PORT || 3000;
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const server = createServer((req, res) => {
    handle(req, res);
  });

  // Initialize Socket.IO on the same server
  initSocket(server);

  server.listen(port, () => {
    console.log(`Server with Socket.IO running on port ${port}`);
  });
});
