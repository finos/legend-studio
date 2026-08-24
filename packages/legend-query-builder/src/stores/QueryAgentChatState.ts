/**
 * Copyright (c) 2026-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

export abstract class QueryAgentChatState {
  /**
   * When set, the current lambda in the builder was produced by the Legend
   * AI agent chat (via "Load query into builder") and this is the `trace_id`
   * the agent surfaced in its response. Downstream telemetry providers can
   * pick this up to correlate save / update / run events to the agent
   * conversation that produced them. In-memory only; not persisted.
   *
   * NOTE: subclasses are responsible for registering this field as
   * `observable` (and `setAgentChatTraceId` as `action`) in their own
   * `makeObservable` call — mobx does not support multiple `makeObservable`
   * invocations across an inheritance chain on the same instance.
   */
  agentChatTraceId?: string | undefined;

  setAgentChatTraceId(val: string | undefined): void {
    this.agentChatTraceId = val;
  }

  abstract abort(): void;
}
