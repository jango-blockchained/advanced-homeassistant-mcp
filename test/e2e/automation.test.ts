
import { describe, test, expect, beforeAll, afterAll } from "bun:test";
import { spawn, type ChildProcessWithoutNullStreams } from "child_process";
import * as readline from "readline";

const SERVER_COMMAND = "bun";
const SERVER_ARGS = ["run", "dist/stdio-server.mjs"]; // Use the built file directly
const CWD = process.cwd();

describe("E2E Tests", () => {
    let serverProcess: ChildProcessWithoutNullStreams;
    let rl: readline.Interface;
    let messageId = 0;
    let responseResolvers = new Map<number | string, (value: any) => void>();

    const createRequest = (method: string, params?: any) => ({
        jsonrpc: "2.0",
        id: messageId++,
        method,
        params,
    });

    // Helper to send request and wait for specific response ID
    const sendRequest = (req: any): Promise<any> => {
        return new Promise((resolve) => {
            responseResolvers.set(req.id, resolve);
            const str = JSON.stringify(req);
            serverProcess.stdin.write(str + "\n");
        });
    };

    beforeAll(async () => {
        // Start Server
        serverProcess = spawn(SERVER_COMMAND, SERVER_ARGS, {
            cwd: CWD,
            env: process.env,
            stdio: ["pipe", "pipe", "inherit"],
        });

        rl = readline.createInterface({
            input: serverProcess.stdout,
            terminal: false,
        });

        // Listen for lines
        rl.on("line", (line) => {
            if (!line.trim()) return;
            try {
                const msg = JSON.parse(line);
                if (msg.id !== undefined && responseResolvers.has(msg.id)) {
                    responseResolvers.get(msg.id)!(msg);
                    responseResolvers.delete(msg.id);
                } else if (msg.method === "notifications/initialized") {
                    // Ignore for now
                }
            } catch (e) {
                // console.error("Error parsing JSON:", e);
            }
        });

        // Initialize Handshake
        const initReq = createRequest("initialize", {
            protocolVersion: "2024-11-05",
            capabilities: {},
            clientInfo: { name: "e2e-test", version: "1.0.0" }
        });

        // We can't use sendRequest for initialize strictly because we need to wait for it before tests run
        // But we can just fire it and wait a bit, or handle it in the first test.
        // For robust test, let's wait for init response here.
        const response = await new Promise<any>((resolve) => {
            const handler = (line: string) => {
                try {
                    const msg = JSON.parse(line);
                    if (msg.id === initReq.id) {
                        serverProcess.stdout.removeListener("data", handler); // This might not work easily with readline
                        resolve(msg);
                    }
                } catch { }
            };
            // Re-implement simple sender for init since RL is already consuming stream
            responseResolvers.set(initReq.id, resolve);
            serverProcess.stdin.write(JSON.stringify(initReq) + "\n");
        });

        expect(response.result).toBeDefined();
        expect(response.result.serverInfo).toBeDefined();

        // Send initialized notification
        serverProcess.stdin.write(JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n");
    });

    afterAll(() => {
        serverProcess.kill();
    });

    test("should list tools", async () => {
        const listReq = createRequest("tools/list");
        const res = await sendRequest(listReq);
        expect(res.result).toBeDefined();
        expect(res.result.tools).toBeInstanceOf(Array);
        const toolNames = res.result.tools.map((t: any) => t.name);
        expect(toolNames).toContain("automation_config");
    });

    test("automation_config create should return compliant content array", async () => {
        const autoId = `test_e2e_${Date.now()}`;
        const req = createRequest("tools/call", {
            name: "automation_config",
            arguments: {
                action: "create",
                automation_id: autoId,
                config: {
                    alias: "E2E Test Automation",
                    trigger: [{ platform: "state", entity_id: "sensor.e2e_test" }],
                    action: [{ service: "test.test" }]
                }
            }
        });

        const res = await sendRequest(req);

        // This is the core verification for Issue #38
        expect(res.result).toBeDefined();
        expect(res.result.content).toBeInstanceOf(Array);
        expect(res.result.content.length).toBeGreaterThan(0);
        expect(res.result.content[0].type).toBe("text");

        const text = res.result.content[0].text;
        expect(typeof text).toBe("string");

        // Parse the inner text
        const inner = JSON.parse(text);
        // We expect failure (Unauthorized) or success, but structurally it must be valid JSON
        // The key thing is the tool did not crash or return raw JSON at top level
        expect(inner.message).toBeDefined();

        // Cleanup if by miracle it succeeded
        if (inner.success && inner.automation_id) {
            const deleteReq = createRequest("tools/call", {
                name: "automation_config",
                arguments: {
                    action: "delete",
                    automation_id: inner.automation_id
                }
            });
            await sendRequest(deleteReq);
        }
    });
});
