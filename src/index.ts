import { McpServer } from "@modelcontextprotocol/server";
import { StdioServerTransport } from "@modelcontextprotocol/server/stdio";

import * as z from "zod/v4";
import * as os from "node:os";


const server = new McpServer({
    name: "asus-lab-mcp",
    version: "0.1.0",
});


server.registerTool(
    "get_server_health",
    {
        title: "Estado del servidor",
        description: "Obtiene información básica del servidor Debian",

        inputSchema: z.object({}),
    },

    async () => {
        const bytesToGB = (bytes: number): number => {
            return Number(
                (bytes / 1024 / 1024 / 1024).toFixed(2)
            );
        };

        const health = {
            hostname: os.hostname(),

            platform: os.platform(),

            uptime_seconds: Math.round(os.uptime()),

            load_average: os.loadavg(),

            memory: {
                total_gb: bytesToGB(os.totalmem()),
                free_gb: bytesToGB(os.freemem()),
            },

            cpus: os.cpus().length,
        };


        return {
            content: [
                {
                    type: "text",
                    text: JSON.stringify(health, null, 2),
                },
            ],
        };
    }
);


server.registerTool(
    "list_ollama_models",
    {
        title: "Modelos de Ollama",

        description:
            "Obtiene los modelos instalados en el servidor Ollama local",

        inputSchema: z.object({}),
    },

    async () => {
        try {

            const response = await fetch(
                "http://127.0.0.1:11434/api/tags"
            );


            if (!response.ok) {
                return {
                    content: [
                        {
                            type: "text",
                            text: `Ollama respondió HTTP ${response.status}`,
                        },
                    ],

                    isError: true,
                };
            }


            const data = await response.json();


            return {
                content: [
                    {
                        type: "text",
                        text: JSON.stringify(data, null, 2),
                    },
                ],
            };

        } catch (error) {

            return {
                content: [
                    {
                        type: "text",

                        text:
                            error instanceof Error
                                ? error.message
                                : "Error desconocido conectando con Ollama",
                    },
                ],

                isError: true,
            };
        }
    }
);


async function main() {

    const transport = new StdioServerTransport();

    await server.connect(transport);

    console.error(
        "ASUS MCP Server iniciado"
    );
}


main().catch((error) => {

    console.error(
        "Error iniciando MCP Server:",
        error
    );

    process.exit(1);

});
