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

/**
 * Simple mock for `react-markdown` to help with running Jest in non-ESM mode.
 * See Jest config for more details
 */
const Mermaid = {
  initialize: jest.fn(),
  contentLoaded: jest.fn(),
};

// eslint-disable-next-line import/no-default-export
export default Mermaid;
