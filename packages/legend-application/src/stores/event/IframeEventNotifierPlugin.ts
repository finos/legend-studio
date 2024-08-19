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

import packageJson from '../../../package.json' with { type: 'json' };
import {
  type NotificationEventData,
  EventNotifierPlugin,
} from './EventService.js';

export class IframeEventNotifierPlugin extends EventNotifierPlugin {
  constructor() {
    super(
      packageJson.extensions.iframeEventNotifierPlugin,
      packageJson.version,
    );
  }

  notify(event: string, data: NotificationEventData): void {
    // NOTE: here we only open communication channel with parent frame, hence `window.parent`
    // instead of `window.top`
    //
    // To receive messages like this, the parent frame can use `window.onmessage = ...`
    //
    // Notice that we specify `targetOrigin = '*'` which means no restriction,
    // this is for flexibility, but it could also stir some security concern
    // See https://developer.mozilla.org/en-US/docs/Web/API/Window/postMessage
    window.parent.postMessage({ event, data }, '*');
  }
}
