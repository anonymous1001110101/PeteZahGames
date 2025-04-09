import { createBareServer } from "@tomphttp/bare-server-node";
import express from "express";
import { createServer } from "node:http";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { join } from "node:path";
import { hostname } from "node:os";

const bare = createBareServer("/bare/");
const app = express();
const publicPath = "public";

app.use(express.static(publicPath));
app.use("/static/uv/", express.static(uvPath));

app.use((req, res) => {
  res.status(404);
  res.sendFile(join(publicPath, "404.html"));
});

const server = createServer();

server.on("request", (req, res) => {
  console.log(`Request: ${req.method} ${req.url}`); // Debug
  if (bare.shouldRoute(req)) {
    try {
      bare.routeRequest(req, res);
    } catch (err) {
      console.error("Error in routeRequest:", err);
      res.writeHead(500);
      res.end("Internal Server Error");
    }
  } else {
    app(req, res);
  }
});

server.on("upgrade", (req, socket, head) => {
  if (bare.shouldRoute(req)) {
    bare.routeUpgrade(req, socket, head);
  } else {
    socket.end();
  }
});

const port = parseInt(process.env.PORT || "3000");

server.listen(port, () => {
  const address = server.address();
  console.log("Listening on:");
  console.log(`\thttp://localhost:${address.port}`);
  console.log(`\thttp://${hostname()}:${address.port}`);
  console.log(
    `\thttp://${
      address.family === "IPv6" ? `[${address.address}]` : address.address
    }:${address.port}`
  );
});

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
  console.log("SIGTERM signal received: closing HTTP server");
  server.close();
  bare.close();
  process.exit(0);
}
