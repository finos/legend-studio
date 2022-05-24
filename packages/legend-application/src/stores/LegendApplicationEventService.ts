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

import { action, computed, makeObservable, observable } from 'mobx';
import type {
  NotificationEventData,
  EventNotifierPlugin,
} from '@finos/legend-shared';

export class LegendApplicationEventService {
  private notifierPlugins: EventNotifierPlugin[] = [];
  private _event?: string | undefined;

  constructor() {
    makeObservable<LegendApplicationEventService, '_event'>(this, {
      _event: observable,
      latestEvent: computed,
      post: action,
    });
  }

  registerEventNotifierPlugins(plugins: EventNotifierPlugin[]): void {
    this.notifierPlugins = plugins;
  }

  notify(event: string, data: NotificationEventData): void {
    this.notifierPlugins.forEach((plugin) => plugin.notify(event, data));
  }

  get latestEvent(): string | undefined {
    return this._event;
  }

  post(val: string | undefined): void {
    this._event = val;
  }
}
