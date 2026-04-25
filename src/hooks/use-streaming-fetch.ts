"use client";

import { useState, useCallback, useRef } from "react";

/**
 * Hook for consuming SSE (Server-Sent Events) streaming responses
 * from the AI generation endpoints.
 *
 * SSE format expected from server:
 *   data: { "content": "partial text" }\n\n
 *   data: [DONE]\n\n
 *
 * Usage:
 *   const { streamFetch, isStreaming, streamedContent, error } = useStreamingFetch();
 *   const content = await streamFetch("/api/ai/generate", { type: "auto", topic: "..." });
 */
export function useStreamingFetch() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamedContent, setStreamedContent] = useState("");
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Stream-fetch an AI endpoint. Returns the full accumulated content
   * when the stream completes.
   */
  const streamFetch = useCallback(
    async (url: string, body: object): Promise<string> => {
      // Abort any previous stream
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      const controller = new AbortController();
      abortControllerRef.current = controller;

      setIsStreaming(true);
      setStreamedContent("");
      setError(null);

      let accumulated = "";

      try {
        const response = await fetch(`${url}?stream=true`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        if (!response.ok) {
          // Try to parse error from response
          let errorMsg = `请求失败 (${response.status})`;
          try {
            const errData = await response.json();
            errorMsg = errData.error || errData.details || errorMsg;
          } catch {
            // ignore parse error
          }
          throw new Error(errorMsg);
        }

        // Check if the response is actually SSE
        const contentType = response.headers.get("content-type") || "";
        if (!contentType.includes("text/event-stream")) {
          // Fallback: not a streaming response, parse as JSON
          const data = await response.json();
          const content =
            data.content || data.result || data.text || "";
          if (content) {
            accumulated = content;
            setStreamedContent(content);
          }
          setIsStreaming(false);
          return accumulated;
        }

        const reader = response.body!.getReader();
        const decoder = new TextDecoder();
        let buffer = ""; // Buffer for incomplete SSE lines

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          // Decode chunk and append to buffer
          buffer += decoder.decode(value, { stream: true });

          // Process complete lines from the buffer
          const lines = buffer.split("\n");
          // Keep the last potentially incomplete line in the buffer
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || !trimmed.startsWith("data: ")) continue;

            const data = trimmed.slice(6); // Remove "data: " prefix

            if (data === "[DONE]") {
              // Stream completed
              continue;
            }

            try {
              const parsed = JSON.parse(data);

              // Check for error in stream
              if (parsed.error) {
                throw new Error(parsed.error);
              }

              if (parsed.content) {
                accumulated += parsed.content;
                setStreamedContent(accumulated);
              }
            } catch (e) {
              // If it's our own thrown error, re-throw
              if (e instanceof Error && e.message !== "Unexpected end of JSON input" && !e.message.includes("JSON")) {
                throw e;
              }
              // Otherwise skip unparseable lines
            }
          }
        }

        // Process any remaining buffer content
        if (buffer.trim().startsWith("data: ")) {
          const remainingData = buffer.trim().slice(6);
          if (remainingData && remainingData !== "[DONE]") {
            try {
              const parsed = JSON.parse(remainingData);
              if (parsed.content) {
                accumulated += parsed.content;
                setStreamedContent(accumulated);
              }
            } catch {
              // Ignore parse errors for final buffer
            }
          }
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") {
          // Stream was cancelled by user, not an error
        } else {
          const message =
            e instanceof Error ? e.message : "流式请求失败";
          setError(message);
          throw e;
        }
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }

      return accumulated;
    },
    [],
  );

  /**
   * Cancel the active stream
   */
  const cancelStream = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /**
   * Reset the streaming state
   */
  const reset = useCallback(() => {
    cancelStream();
    setStreamedContent("");
    setError(null);
  }, [cancelStream]);

  return {
    streamFetch,
    isStreaming,
    streamedContent,
    error,
    cancelStream,
    reset,
  };
}
