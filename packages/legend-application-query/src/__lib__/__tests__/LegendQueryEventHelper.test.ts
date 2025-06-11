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

import { test, expect, describe, jest } from '@jest/globals';
import type { EventService } from '@finos/legend-application';
import { LegendQueryEventHelper } from '../LegendQueryEventHelper.js';
import { LEGEND_QUERY_APP_EVENT } from '../LegendQueryEvent.js';

class MockEventService {
  notify = jest.fn();
}

describe('LegendQueryEventHelper', () => {
  test('should notify query creation success', () => {
    const eventService = new MockEventService() as unknown as EventService;
    const queryData = { queryId: 'test-query-id' };

    LegendQueryEventHelper.notify_QueryCreateSucceeded(eventService, queryData);

    expect(eventService.notify).toHaveBeenCalledWith(
      LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS,
      queryData,
    );
  });
});
