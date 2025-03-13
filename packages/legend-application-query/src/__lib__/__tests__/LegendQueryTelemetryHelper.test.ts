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

import { test, expect, describe, jest, beforeEach } from '@jest/globals';
import type { TelemetryService } from '@finos/legend-application';
import { LegendQueryTelemetryHelper } from '../LegendQueryTelemetryHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryEvent.js';
import { GRAPH_MANAGER_EVENT } from '@finos/legend-graph';

class MockTelemetryService {
  logEvent = jest.fn();
}

describe('LegendQueryTelemetryHelper', () => {
  let telemetryService: TelemetryService;

  beforeEach(() => {
    telemetryService =
      new MockTelemetryService() as unknown as TelemetryService;
  });

  test('should log view query success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
      dependenciesCount: 5,
      timeTaken: 100,
    };

    LegendQueryTelemetryHelper.logEvent_ViewQuerySucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.VIEW_QUERY__SUCCESS,
      data,
    );
  });

  test('should log initialize query state success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
      dependenciesCount: 5,
      timeTaken: 100,
    };

    LegendQueryTelemetryHelper.logEvent_InitializeQueryStateSucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.INITIALIZE_QUERY_STATE__SUCCESS,
      data,
    );
  });

  test('should log create query success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
    };

    LegendQueryTelemetryHelper.logEvent_CreateQuerySucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS,
      data,
    );
  });

  test('should log update query success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
    };

    LegendQueryTelemetryHelper.logEvent_UpdateQuerySucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.UPDATE_QUERY__SUCCESS,
      data,
    );
  });

  test('should log query view project launched event', () => {
    LegendQueryTelemetryHelper.logEvent_QueryViewProjectLaunched(
      telemetryService,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.VIEW_PROJECT__LAUNCH,
      {},
    );
  });

  test('should log query view SDLC project launched event', () => {
    LegendQueryTelemetryHelper.logEvent_QueryViewSdlcProjectLaunched(
      telemetryService,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.VIEW_SDLC_PROJECT__LAUNCH,
      {},
    );
  });

  test('should log graph initialization success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
      graph: {
        timeTaken: 200,
        dependenciesCount: 3,
      },
    };

    LegendQueryTelemetryHelper.logEvent_GraphInitializationSucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS,
      data,
    );
  });

  test('should log rename query success event', () => {
    const data = {
      query: {
        name: 'Test Query',
        id: 'test-query-id',
        versionId: '1.0.0',
        groupId: 'test-group',
        artifactId: 'test-artifact',
      },
    };

    LegendQueryTelemetryHelper.logEvent_RenameQuerySucceeded(
      telemetryService,
      data,
    );

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.RENAME_QUERY__SUCCESS,
      data,
    );
  });

  test('should log query chat opened event', () => {
    LegendQueryTelemetryHelper.logEvent_QueryChatOpened(telemetryService);

    expect(telemetryService.logEvent).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.LEGENDAI_QUERY_CHAT__OPENED,
      {},
    );
  });
});
