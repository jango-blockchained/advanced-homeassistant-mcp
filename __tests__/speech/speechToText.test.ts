/**
 * SpeechToText tests for the current implementation.
 *
 * The current src/speech/speechToText.ts talks to a Fast-Whisper HTTP
 * service (no docker `spawn`, no Bun.spawn — those were the previous
 * incarnation). We mock global.fetch to drive both the health-check in
 * `initialize()` and the audio POST in `transcribe()`.
 */

import { describe, expect, test, beforeEach, afterEach, mock } from "bun:test";
import { SpeechToText, TranscriptionError } from "../../src/speech/speechToText";
import type { SpeechToTextConfig } from "../../src/speech/types";

const config: SpeechToTextConfig = {
  modelPath: "/test/model",
  modelType: "base.en",
  containerName: "test-container",
};

const originalFetch = globalThis.fetch;

describe("SpeechToText", () => {
  let speechToText: SpeechToText;

  beforeEach(() => {
    speechToText = new SpeechToText(config);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  describe("Initialization", () => {
    test("constructs without throwing", () => {
      expect(speechToText).toBeDefined();
    });

    test("initialize() succeeds when whisper /health responds 2xx", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response(JSON.stringify({ ok: true }), { status: 200 })),
      ) as unknown as typeof fetch;

      await expect(speechToText.initialize()).resolves.toBeUndefined();
    });

    test("initialize() does not throw when whisper /health is unreachable", async () => {
      // Source explicitly tolerates an unhealthy whisper at init time
      // (logs a warning rather than failing) so the rest of the pipeline can
      // come up. Verify that contract.
      globalThis.fetch = mock(() =>
        Promise.reject(new Error("ECONNREFUSED")),
      ) as unknown as typeof fetch;

      await expect(speechToText.initialize()).resolves.toBeUndefined();
    });

    test("initialize() is idempotent", async () => {
      const fetchMock = mock(() =>
        Promise.resolve(new Response("{}", { status: 200 })),
      );
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await speechToText.initialize();
      await speechToText.initialize();

      // Second call short-circuits before reaching fetch.
      expect(fetchMock.mock.calls.length).toBe(1);
    });
  });

  describe("transcribe()", () => {
    test("rejects when called before initialize()", async () => {
      await expect(speechToText.transcribe(Buffer.from("audio"))).rejects.toThrow(
        /not initialized/,
      );
    });

    test("POSTs the audio buffer to /asr and returns the transcribed text", async () => {
      const fetchMock = mock((url: string, _init?: RequestInit) => {
        if (url.endsWith("/health")) {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(
          new Response(JSON.stringify({ text: "hello world" }), { status: 200 }),
        );
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await speechToText.initialize();
      const text = await speechToText.transcribe(Buffer.from("not-actually-audio"));

      expect(text).toBe("hello world");

      const calls = fetchMock.mock.calls as unknown as Array<[string, RequestInit?]>;
      const transcriptionCall = calls.find(([url]) => url.includes("/asr"));
      expect(transcriptionCall).toBeDefined();
      expect(transcriptionCall?.[1]?.method).toBe("POST");
    });

    test("wraps non-2xx responses in TranscriptionError", async () => {
      const fetchMock = mock((url: string) => {
        if (url.endsWith("/health")) {
          return Promise.resolve(new Response("{}", { status: 200 }));
        }
        return Promise.resolve(new Response("server error", { status: 500 }));
      });
      globalThis.fetch = fetchMock as unknown as typeof fetch;

      await speechToText.initialize();
      await expect(speechToText.transcribe(Buffer.from("x"))).rejects.toBeInstanceOf(
        TranscriptionError,
      );
    });
  });

  describe("Lifecycle events", () => {
    test("emits 'ready' once initialization succeeds", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("{}", { status: 200 })),
      ) as unknown as typeof fetch;

      const ready = new Promise((resolve) => speechToText.once("ready", resolve));
      await speechToText.initialize();
      await ready;
    });

    test("shutdown() emits 'shutdown' and is idempotent", async () => {
      globalThis.fetch = mock(() =>
        Promise.resolve(new Response("{}", { status: 200 })),
      ) as unknown as typeof fetch;

      await speechToText.initialize();
      const shutdownEvent = new Promise((resolve) => speechToText.once("shutdown", resolve));
      await speechToText.shutdown();
      await shutdownEvent;

      // Second shutdown() short-circuits without re-emitting.
      await expect(speechToText.shutdown()).resolves.toBeUndefined();
    });
  });
});
