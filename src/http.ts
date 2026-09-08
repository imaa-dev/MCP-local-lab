import http from "node:http";

import {
    createMcpHandler
} from "@modelcontextprotocol/server";

import {
    toNodeHandler
} from "@modelcontextprotocol/node";

import {
    buildMcpServer
} from "./mcp.js";


const PORT =
    Number(
        process.env.MCP_PORT ?? 3001
    );


const HOST =
    process.env.MCP_HOST ??
    "127.0.0.1";


/*
 * createMcpHandler crea el endpoint
 * MCP Streamable HTTP.
 */
const mcpHandler =
    createMcpHandler(
        () => buildMcpServer()
    );


/*
 * Convierte el handler web estándar
 * al modelo http de Node.
 */
const nodeHandler =
    toNodeHandler(
        mcpHandler
    );


const httpServer =
    http.createServer(
        (req, res) => {

            const url =
                new URL(
                    req.url ?? "/",
                    `http://${req.headers.host ?? "localhost"}`
                );


            if (
                url.pathname !== "/mcp"
            ) {

                res.statusCode = 404;

                res.end(
                    "Not Found"
                );

                return;
            }


            void nodeHandler(
                req,
                res
            );
        }
    );


httpServer.listen(
    PORT,
    HOST,

    () => {

        console.error(
            `MCP HTTP escuchando en http://${HOST}:${PORT}/mcp`
        );
    }
);


async function shutdown() {

    console.error(
        "\nCerrando MCP Server..."
    );


    await mcpHandler.close();


    httpServer.close(
        () => process.exit(0)
    );
}


process.on(
    "SIGINT",
    shutdown
);

process.on(
    "SIGTERM",
    shutdown
);
