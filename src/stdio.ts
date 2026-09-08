import {
    StdioServerTransport
} from "@modelcontextprotocol/server/stdio";

import {
    buildMcpServer
} from "./mcp.js";


async function main() {

    const server =
        buildMcpServer();

    const transport =
        new StdioServerTransport();

    await server.connect(
        transport
    );


    console.error(
        "MCP Server stdio iniciado"
    );
}


main().catch((error) => {

    console.error(error);

    process.exit(1);
});
