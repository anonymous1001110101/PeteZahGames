import wisp from "wisp-server-node";
import { createBareServer } from "@tomphttp/bare-server-node";
import { uvPath } from "@titaniumnetwork-dev/ultraviolet";
import { epoxyPath } from "@mercuryworkshop/epoxy-transport";
import { bareModulePath } from "@mercuryworkshop/bare-as-module3";
import { baremuxPath } from "@mercuryworkshop/bare-mux/node";
import express from "express";
import { createServer } from "node:http";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { IncomingMessage, ServerResponse } from "node:http"; // Importing Node's http types

const bare = createBareServer("/bare/");
const __dirname = join(fileURLToPath(import.meta.url), "..");
const app = express();
const publicPath = "public"; // if you renamed your directory to something else other than public

app.use(express.static(publicPath));
app.use("/uv/", express.static(uvPath));
app.use("/epoxy/", express.static(epoxyPath));
app.use("/baremux/", express.static(baremuxPath));
app.use("/baremod/", express.static(bareModulePath));

app.use((req, res) => {
    res.status(404);
    res.sendFile(join(__dirname, publicPath, "404.html")); // change to your 404 page
});

const server = createServer((req, res) => {
    // Ensure we are working with the raw Node.js request object
    if (bare.shouldRoute(req)) {
        // Pass the raw HTTP request and response objects to Bare
        bare.routeRequest(req, res); // Route the request using bare-server
    } else {
        // If not handled by Bare, pass it to Express
        app(req, res);
    }
});

// Handle WebSocket upgrades
server.on("upgrade", (req, socket, head) => {
    if (req.url.endsWith("/wisp/")) {
        wisp.routeRequest(req, socket, head); // Handle WISP upgrade request
    } else if (bare.shouldRoute(req)) {
        bare.routeUpgrade(req, socket, head); // Handle upgrade for Bare
    } else {
        socket.end(); // Close socket if no route matches
    }
});

// Port configuration
let port = parseInt(process.env.PORT || "");

if (isNaN(port)) port = 3000; // default to port 3000 if PORT is not set

server.on("listening", () => {
    const address = server.address();
    console.log("Listening on:");
    console.log(`\thttp://localhost:${address.port}`);
    console.log(
        `\thttp://${
            address.family === "IPv6" ? `[${address.address}]` : address.address
        }:${address.port}`
    );
});

// Graceful shutdown handling
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

function shutdown() {
    console.log("SIGTERM signal received: closing HTTP server");
    server.close();
    bare.close();
    process.exit(0);
}

// Start listening
server.listen({
    port,
});
