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

import { format } from 'util';

const error = global.console.error;

// Sometimes, React errors/warnings are not thrown, but printed as errors using `console.error`
// we would like to catch these in tests as well.
// See https://github.com/facebook/jest/issues/6121#issuecomment-529591574
global.console.error = function (...args) {
  error(...args);
  throw new Error(format(...args));
};
