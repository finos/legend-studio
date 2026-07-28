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

import { useCallback } from 'react';
import { assertErrorThrown } from '@finos/legend-shared';
import {
  type LegendAIChatTelemetryEvent,
  type LegendAIChatTelemetryEventType,
  type LegendAIPrimitiveValue,
  type TDSServiceSchema,
  logLegendAIChatTelemetry,
} from './LegendAITypes.js';

/**
 * Loads a host's TDS service schemas and pushes them into React state, guarding
 * against a resolve that lands after unmount. Returns the effect cleanup that
 * cancels a pending load. Host effects supply their own dependency array.
 */
export function bridgeLegendAIServices(
  loadServices: () => Promise<TDSServiceSchema[]>,
  onServicesLoaded: (services: TDSServiceSchema[]) => void,
  onError: (error: Error) => void,
): () => void {
  let cancelled = false;
  loadServices()
    .then((services) => {
      if (!cancelled) {
        onServicesLoaded(services);
      }
    })
    .catch((error) => {
      assertErrorThrown(error);
      onError(error);
    });
  return () => {
    cancelled = true;
  };
}

/**
 * Builds the host-agnostic telemetry callback that maps a chat telemetry event
 * to a concrete host event key and forwards it with the shared context. Hosts
 * provide their own event-key record and telemetry sink.
 */
export function useLegendAIChatTelemetryLogger(
  eventKeys: Record<LegendAIChatTelemetryEventType, string>,
  context: string,
  dataProduct: string,
  telemetryService: {
    logEvent: (
      eventName: string,
      payload: Record<string, LegendAIPrimitiveValue>,
    ) => void;
  },
): (event: LegendAIChatTelemetryEvent) => void {
  return useCallback(
    (event: LegendAIChatTelemetryEvent): void => {
      logLegendAIChatTelemetry(
        event,
        eventKeys,
        { context, data_product: dataProduct },
        (eventName, payload) => telemetryService.logEvent(eventName, payload),
      );
    },
    [eventKeys, context, dataProduct, telemetryService],
  );
}
