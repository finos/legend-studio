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

import { setupJestCanvasMock } from 'jest-canvas-mock';
import { beforeEach } from '@jest/globals';

// NOTE: we need to call this before each test since there's an issue
// with jest-canvas-mock and jest.resetAllMocks(), which is called when we set `restoreMocks: true`
// See https://github.com/hustcc/jest-canvas-mock/issues/103
beforeEach(() => {
  setupJestCanvasMock();
});
