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

/**
 * JSDOM does not have web worker so if we do not stub it here, we will get "Worker is not defined"
 * For tests that do not depend on the behavior of a worker, we do not to mock the worker itself
 * but use this pass-through mocked worker.
 * Otherwise, we would have to mock the worker
 * See https://github.com/facebook/jest/issues/3449
 */
import { PassThruWorker } from 'Utilities/TestUtil';
window.Worker = PassThruWorker;
