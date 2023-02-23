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

import type { EventService } from '@finos/legend-application';
import { LEGEND_QUERY_APP_EVENT } from './LegendQueryAppEvent.js';

type QueryCreated_EventData = {
  queryId: string;
};

export class LegendQueryEventService {
  private eventService!: EventService;

  private constructor(eventService: EventService) {
    this.eventService = eventService;
  }

  static create(eventService: EventService): LegendQueryEventService {
    return new LegendQueryEventService(eventService);
  }

  notify_QueryCreated(data: QueryCreated_EventData): void {
    this.eventService.notify(
      LEGEND_QUERY_APP_EVENT.CREATE_QUERY__SUCCESS,
      data,
    );
  }
}
