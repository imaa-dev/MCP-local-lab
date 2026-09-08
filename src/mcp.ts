import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import * as os from "node:os";

export function buildMcpServer() {

    const server = new McpServer({
        name: "asus-lab-mcp",
        version: "0.2.0",
    });


    server.registerTool(
        "get_server_health",
        {
            title: "Estado del servidor",

            description:
                "Obtiene información actual del servidor Debian",

            inputSchema: z.object({}),
        },

        async () => {

            const bytesToGB = (bytes: number) =>
                Number(
                    (
                        bytes /
                        1024 /
                        1024 /
                        1024
                    ).toFixed(2)
                );


            const health = {

                hostname:
                    os.hostname(),

                platform:
                    os.platform(),

                uptime_seconds:
                    Math.round(
                        os.uptime()
                    ),

                load_average:
                    os.loadavg(),

                memory: {

                    total_gb:
                        bytesToGB(
                            os.totalmem()
                        ),

                    free_gb:
                        bytesToGB(
                            os.freemem()
                        ),
                },

                cpus:
                    os.cpus().length,
            };


            return {

                content: [

                    {
                        type: "text",
                        text: JSON.stringify(
                            health,
                            null,
                            2
                        ),
                    },

                ],

            };
        }
    );


    server.registerTool(
        "list_ollama_models",
        {
            title: "Modelos Ollama",

            description:
                "Lista los modelos instalados en Ollama",

            inputSchema: z.object({}),
        },

        async () => {

            try {

                const response =
                    await fetch(
                        "http://127.0.0.1:11434/api/tags"
                    );


                if (!response.ok) {

                    throw new Error(
                        `Ollama HTTP ${response.status}`
                    );
                }


                const data =
                    await response.json();


                return {

                    content: [

                        {
                            type: "text",

                            text:
                                JSON.stringify(
                                    data,
                                    null,
                                    2
                                ),
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
                                    : String(error),
                        },

                    ],

                    isError: true,
                };
            }
        }
    );


    return server;
}
