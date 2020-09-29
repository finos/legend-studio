/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { Entity } from 'SDLC/entity/Entity';
import { getGraphManager } from 'PureModelLoader';
import { CLIENT_VERSION } from 'MetaModelConst';

const context = self as unknown as Worker;
// eslint-disable-next-line import/no-default-export
export default null;

context.addEventListener('message', event => {
  const protocol = getGraphManager(CLIENT_VERSION.V1_0_0);
  const entities = event.data as Entity[];
  protocol.getHashInfoAndModelDataFromEntities(entities).then(([hashesIndex, modelContextData]) => {
    context.postMessage({ hashesIndex, modelContextData });
  }).catch(error => {
    // throw this so it will be handled by listener for `unhandledrejection` and then can be properly handled by the `onerror` listener
    throw error;
  });
});

/**
 * NOTE: since we Promise in the message listener, any error thrown inside that will not be handled by
 * `onerror` so we need to catch `unhandledrejection` here to re-throw the error to make sure the unhandled error
 * is caught by the `onerror` handler of the caller of this worker
 * See https://stackoverflow.com/questions/61406859/web-worker-onerror-event-handler-not-triggered-when-rethrowing-an-error-in-the-c
 */
context.addEventListener('unhandledrejection', (event: Event) => {
  throw (event as PromiseRejectionEvent).reason ?? event;
});
