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

import { describe, expect, jest, test } from '@jest/globals';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { APPLICATION_EVENT } from '../LegendApplicationEvent.js';
import { LegendApplicationTelemetryHelper } from '../LegendApplicationTelemetry.js';
import type { TelemetryService } from '../../stores/TelemetryService.js';

type LoggedCall = { event: string; data: Record<string, unknown> };

const buildTelemetryStub = (): {
  service: TelemetryService;
  calls: LoggedCall[];
} => {
  const calls: LoggedCall[] = [];
  const service = {
    logEvent: jest.fn((event: string, data: unknown) => {
      calls.push({ event, data: data as Record<string, unknown> });
    }),
  } as unknown as TelemetryService;
  return { service, calls };
};

describe('LegendApplicationTelemetryHelper.logEvent_ExtensionPageAccessed', () => {
  test('emits EXTENSION_PAGE__ACCESS with entry key, pattern, and path', () => {
    const { service, calls } = buildTelemetryStub();

    LegendApplicationTelemetryHelper.logEvent_ExtensionPageAccessed(service, {
      key: 'dsl-service.productionization',
      pattern: '/extensions/service/:servicePath',
      path: '/extensions/service/model::MyService',
    });

    expect(calls).toHaveLength(1);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(APPLICATION_EVENT.EXTENSION_PAGE__ACCESS);
    expect(call.data).toEqual({
      key: 'dsl-service.productionization',
      pattern: '/extensions/service/:servicePath',
      path: '/extensions/service/model::MyService',
    });
  });
});

describe('LegendApplicationTelemetryHelper.logEvent_RouteNotFound', () => {
  test('emits ROUTE_NOT_FOUND with the unresolved path', () => {
    const { service, calls } = buildTelemetryStub();

    LegendApplicationTelemetryHelper.logEvent_RouteNotFound(service, {
      path: '/some/removed/route',
    });

    expect(calls).toHaveLength(1);
    const call = guaranteeNonNullable(calls[0]);
    expect(call.event).toBe(APPLICATION_EVENT.ROUTE_NOT_FOUND);
    expect(call.data).toEqual({ path: '/some/removed/route' });
  });
});
