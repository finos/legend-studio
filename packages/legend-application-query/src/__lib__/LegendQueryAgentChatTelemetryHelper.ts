/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import type { TelemetryService } from '@finos/legend-application';
import { LEGEND_QUERY_APP_EVENT } from './LegendQueryEvent.js';
import type { LegendQuerySourceInfo } from './LegendQuerySourceInfo.js';

/**
 * The entry point the suggestion was triggered from ({@link LegendQuerySourceInfo})
 * is spread FLAT into the payload, matching how `sourceInfo` is reported on
 * every other query telemetry event.
 */
export type QueryAISuggest_TelemetryData = {
  sourceInfo?: LegendQuerySourceInfo | undefined;
};

export type QueryAISuggestSuccess_TelemetryData =
  QueryAISuggest_TelemetryData & {
    /** Wall-clock duration of the suggester call, in milliseconds. */
    durationMs: number;
  };

export type QueryAISuggestFailure_TelemetryData =
  QueryAISuggest_TelemetryData & {
    /** Wall-clock duration until the suggester call failed, in milliseconds. */
    durationMs: number;
    errorMessage: string;
  };

const flattenSourceInfo = (
  data: QueryAISuggest_TelemetryData,
): Record<string, unknown> => {
  const { sourceInfo, ...rest } = data;
  return { ...rest, ...(sourceInfo ?? {}) };
};

/**
 * Telemetry surface for Legend AI agent-chat and AI-suggest flows. These
 * events are agent-specific and live here rather than on
 * `LegendQueryTelemetryHelper` so the core query telemetry stays free of
 * agent-chat coupling.
 */
export class LegendQueryAgentChatTelemetryHelper {
  static logEvent_QueryAgentChatOpened(service: TelemetryService): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_AGENT_CHAT__OPENED,
      {},
    );
  }

  static logEvent_QueryAgentChatQueryLoaded(
    service: TelemetryService,
    data: { traceId?: string | undefined },
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_AGENT_CHAT__QUERY_LOADED,
      data,
    );
  }

  static logEvent_QueryAISuggestLaunched(
    service: TelemetryService,
    data: QueryAISuggest_TelemetryData = {},
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__LAUNCH,
      flattenSourceInfo(data),
    );
  }

  static logEvent_QueryAISuggestSucceeded(
    service: TelemetryService,
    data: QueryAISuggestSuccess_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__SUCCESS,
      flattenSourceInfo(data),
    );
  }

  static logEvent_QueryAISuggestApplied(
    service: TelemetryService,
    data: QueryAISuggest_TelemetryData = {},
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__APPLY,
      flattenSourceInfo(data),
    );
  }

  static logEvent_QueryAISuggestDiscarded(
    service: TelemetryService,
    data: QueryAISuggest_TelemetryData = {},
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__DISCARD,
      flattenSourceInfo(data),
    );
  }

  static logEvent_QueryAISuggestFailure(
    service: TelemetryService,
    data: QueryAISuggestFailure_TelemetryData,
  ): void {
    service.logEvent(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_SUGGEST__FAILURE,
      flattenSourceInfo(data),
    );
  }
}
