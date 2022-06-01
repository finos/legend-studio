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

import { jest } from '@jest/globals';
import { WebApplicationNavigator } from '../stores/WebApplicationNavigator';
import { createMemoryHistory, type History } from 'history';

export const TEST__provideMockedWebApplicationNavigator = (customization?: {
  mock?: WebApplicationNavigator;
  history?: History;
}): WebApplicationNavigator => {
  const value =
    customization?.mock ??
    new WebApplicationNavigator(
      customization?.history ?? createMemoryHistory(),
    );
  const MockWebApplicationNavigatorProvider = require('./WebApplicationNavigatorProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockWebApplicationNavigatorProvider.useWebApplicationNavigator = jest.fn();
  MockWebApplicationNavigatorProvider.useWebApplicationNavigator.mockReturnValue(
    value,
  );
  return value;
};
