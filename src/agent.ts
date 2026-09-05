import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

import { Ollama } from "ollama";

import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import path from "node:path";


const MODEL =
    process.env.OLLAMA_MODEL ??
    "qwen3:1.7b";


const ollama = new Ollama({
    host: "http://127.0.0.1:11434",
});


const mcpClient = new Client({
    name: "asus-local-agent",
    version: "0.1.0",
});


const mcpServerPath = path.resolve(
    "dist/index.js"
);


const transport = new StdioClientTransport({
    command: process.execPath,
    args: [mcpServerPath],
});


function toolResultToText(result: any): string {

    if (result.structuredContent) {

        return JSON.stringify(
            result.structuredContent,
            null,
            2
        );
    }


    if (!Array.isArray(result.content)) {

        return JSON.stringify(result);
    }


    return result.content
        .map((item: any) => {

            if (item.type === "text") {
                return item.text;
            }

            return JSON.stringify(item);

        })
        .join("\n");
}


async function main() {

    console.log("Conectando con MCP Server...");

    await mcpClient.connect(transport);


    console.log(
        "MCP conectado:",
        mcpClient.getServerVersion()
    );


    /*
     * Descubrimos automáticamente las tools.
     */
    const { tools: mcpTools } =
        await mcpClient.listTools();


    console.log("\nTools MCP disponibles:");

    for (const tool of mcpTools) {
        console.log(` - ${tool.name}`);
    }


    /*
     * Convertimos las tools MCP
     * al formato que entiende Ollama.
     *
     * Ambos utilizan JSON Schema
     * para describir parámetros.
     */
    const ollamaTools = mcpTools.map(
        (tool) => ({
            type: "function",

            function: {
                name: tool.name,

                description:
                    tool.description ??
                    "MCP tool",

                parameters:
                    tool.inputSchema ?? {
                        type: "object",
                        properties: {},
                    },
            },
        })
    );


    const messages: any[] = [

        {
            role: "system",

            content: `
Eres un agente de operaciones ejecutándose
localmente en un servidor Debian.

Tienes herramientas MCP disponibles para obtener
información real del servidor.

Reglas:

- Usa herramientas cuando necesites información
  del sistema.
- No inventes valores del servidor.
- Si existe una herramienta apropiada, úsala.
- Explica los resultados de manera clara.
- Responde en español.
            `.trim(),
        },

    ];


    const rl = createInterface({
        input: stdin,
        output: stdout,
    });


    console.log(
        `\nAgent iniciado usando ${MODEL}`
    );

    console.log(
        'Escribe "salir" para terminar.\n'
    );


    while (true) {

        const question = await rl.question(
            "Tú > "
        );


        if (
            question.trim().toLowerCase()
            === "salir"
        ) {
            break;
        }


        messages.push({
            role: "user",
            content: question,
        });


        /*
         * Máximo de ciclos para evitar que
         * el modelo entre en un loop infinito
         * utilizando herramientas.
         */
        const MAX_TOOL_ROUNDS = 8;


        for (
            let round = 0;
            round < MAX_TOOL_ROUNDS;
            round++
        ) {

            const response =
                await ollama.chat({

                    model: MODEL,

                    messages,

                    tools: ollamaTools as any,

                    stream: false,

                });


            /*
             * Es importante almacenar
             * la respuesta del assistant.
             */
            messages.push(
                response.message
            );


            const toolCalls =
                response.message.tool_calls ?? [];


            /*
             * Si no hay tool calls,
             * tenemos la respuesta final.
             */
            if (toolCalls.length === 0) {

                console.log(
                    `\nAgent > ${response.message.content}\n`
                );

                break;
            }


            /*
             * El modelo decidió utilizar
             * una o varias herramientas.
             */
            for (const call of toolCalls) {

                const name =
                    call.function.name;

                const args =
                    call.function.arguments ??
                    {};


                console.log(
                    `\n[MCP TOOL] ${name}`
                );

                console.log(
                    "[ARGS]",
                    args
                );


                try {

                    const result =
                        await mcpClient.callTool({

                            name,

                            arguments:
                                args as Record<
                                    string,
                                    unknown
                                >,

                        });


                    const resultText =
                        toolResultToText(
                            result
                        );


                    console.log(
                        "[RESULT]",
                        resultText
                    );


                    /*
                     * Enviamos el resultado MCP
                     * nuevamente al LLM.
                     */
                    messages.push({

                        role: "tool",

                        tool_name: name,

                        content: resultText,

                    });


                } catch (error) {

                    const message =
                        error instanceof Error
                            ? error.message
                            : String(error);


                    console.error(
                        `[MCP ERROR] ${message}`
                    );


                    messages.push({

                        role: "tool",

                        tool_name: name,

                        content:
                            `Error ejecutando ${name}: ${message}`,

                    });

                }
            }


            /*
             * El ciclo vuelve a Ollama.
             *
             * Ahora el modelo recibe el
             * resultado real de la tool
             * y puede responder o pedir
             * otra herramienta.
             */
        }
    }


    rl.close();

    await mcpClient.close();

    console.log(
        "\nAgent terminado."
    );
}


main().catch(async (error) => {

    console.error(
        "Error iniciando Agent:",
        error
    );


    try {
        await mcpClient.close();
    } catch {
        // ignoramos errores durante cleanup
    }


    process.exit(1);
});
