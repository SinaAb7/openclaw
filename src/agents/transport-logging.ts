/**
 * Logging utility for agent-to-model interactions.
 * Tracks requests sent to models and responses received.
 */

import { logDebug, logInfo } from "../logger.js";

interface ModelRequestLog {
  model: string;
  provider: string;
  timestamp: number;
  messageCount: number;
  systemPromptLength: number;
  toolsCount: number;
  maxTokens?: number;
}

interface ModelResponseLog {
  model: string;
  provider: string;
  timestamp: number;
  duration: number;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  totalTokens: number;
  cost?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
    total: number;
  };
  thinkingTokens?: number;
  toolCalls: Array<{ name: string; id: string }>;
}

export function logModelRequest(params: {
  model: string;
  provider: string;
  messages: Array<{ role: string; content: unknown }>;
  systemPrompt?: string;
  tools?: Array<{ name: string }>;
  maxTokens?: number;
  thinking?: { type: string; budget?: number } | null;
}) {
  const request: ModelRequestLog = {
    model: params.model,
    provider: params.provider,
    timestamp: Date.now(),
    messageCount: params.messages.length,
    systemPromptLength: params.systemPrompt?.length ?? 0,
    toolsCount: params.tools?.length ?? 0,
    maxTokens: params.maxTokens,
  };

  const thinking = params.thinking
    ? ` [thinking: budget=${(params.thinking as Record<string, unknown>).budget ?? "N/A"}]`
    : "";

  logInfo(
    `→ sending to ${params.provider}:${params.model} (${params.messages.length} messages, ${params.tools?.length ?? 0} tools)${thinking}`,
  );

  // Detailed logging
  logDebug(
    `REQUEST: ${params.provider}/${params.model} ` +
      `msgs=${request.messageCount} ` +
      `system=${request.systemPromptLength}b ` +
      `tools=${request.toolsCount} ` +
      `maxTokens=${request.maxTokens ?? "default"}`,
  );

  if (params.systemPrompt) {
    logDebug(`SYSTEM_PROMPT (first 500 chars): ${params.systemPrompt.substring(0, 500)}...`);
  }

  params.messages.forEach((msg, idx) => {
    const contentStr =
      typeof msg.content === "string"
        ? msg.content.substring(0, 300)
        : JSON.stringify(msg.content).substring(0, 300);
    logDebug(`MSG[${idx}] ${msg.role}: ${contentStr}...`);
  });

  if (params.tools && params.tools.length > 0) {
    logDebug(`TOOLS: ${params.tools.map((t) => t.name).join(", ")}`);
  }
}

export function logModelResponse(params: {
  model: string;
  provider: string;
  duration: number;
  stopReason: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens?: number;
  cacheWriteTokens?: number;
  thinkingTokens?: number;
  cost?: {
    input: number;
    output: number;
    cacheRead?: number;
    cacheWrite?: number;
    total: number;
  };
  toolCalls?: Array<{ name: string; id: string }>;
  responseContent?: string;
}) {
  const totalTokens =
    params.inputTokens +
    params.outputTokens +
    (params.cacheReadTokens ?? 0) +
    (params.cacheWriteTokens ?? 0);

  const toolInfo =
    params.toolCalls && params.toolCalls.length > 0
      ? ` [${params.toolCalls.length} tool calls: ${params.toolCalls.map((t) => t.name).join(", ")}]`
      : "";

  const cacheInfo =
    (params.cacheReadTokens ?? 0) > 0 || (params.cacheWriteTokens ?? 0) > 0
      ? ` [cache_read=${params.cacheReadTokens ?? 0} cache_write=${params.cacheWriteTokens ?? 0}]`
      : "";

  logInfo(
    `← received from ${params.provider}:${params.model} ` +
      `(${params.inputTokens}in + ${params.outputTokens}out = ${totalTokens} tokens, ` +
      `${params.duration}ms, stop=${params.stopReason})${toolInfo}${cacheInfo}`,
  );

  // Detailed logging
  logDebug(
    `RESPONSE: ${params.provider}/${params.model} ` +
      `duration=${params.duration}ms ` +
      `stop_reason=${params.stopReason} ` +
      `tokens_in=${params.inputTokens} ` +
      `tokens_out=${params.outputTokens} ` +
      `tokens_cache_read=${params.cacheReadTokens ?? 0} ` +
      `tokens_cache_write=${params.cacheWriteTokens ?? 0} ` +
      `tokens_thinking=${params.thinkingTokens ?? 0} ` +
      `total_tokens=${totalTokens}`,
  );

  if (params.cost) {
    logDebug(
      `COST: $${params.cost.input.toFixed(6)} (input) + ` +
        `$${params.cost.output.toFixed(6)} (output) + ` +
        `$${(params.cost.cacheRead ?? 0).toFixed(6)} (cache_read) + ` +
        `$${(params.cost.cacheWrite ?? 0).toFixed(6)} (cache_write) = ` +
        `$${params.cost.total.toFixed(6)} total`,
    );
  }

  if (params.toolCalls && params.toolCalls.length > 0) {
    params.toolCalls.forEach((call, idx) => {
      logDebug(`TOOL_CALL[${idx}] id=${call.id} name=${call.name}`);
    });
  }

  if (params.responseContent) {
    const preview = params.responseContent.substring(0, 500);
    logDebug(`RESPONSE_CONTENT (first 500 chars): ${preview}...`);
  }
}

export function logModelError(params: {
  model: string;
  provider: string;
  error: Error;
  duration?: number;
}) {
  logInfo(
    `✗ error from ${params.provider}:${params.model} ` +
      `${params.duration ? `(${params.duration}ms)` : ""}: ${params.error.message}`,
  );
  logDebug(`ERROR_DETAILS: ${params.error.stack || params.error.message}`);
}
