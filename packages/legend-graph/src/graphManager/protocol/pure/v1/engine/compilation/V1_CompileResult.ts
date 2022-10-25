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

import type { V1_CompilationWarning } from './V1_CompilationWarning.js';

/**
 * NOTE: technically, this endpoint should be returning 204 (No Content), and 400 (Bad Request) when there are
 * compilation errors but for backward compatibility, we have to resort to return something, i.e. 200 (OK) with
 * a dummy object { message: 'OK' }
 *
 * On the other hand, we might want to keep this around since compilation API might change in the future to return
 * some state or meaningful results.
 */
export type V1_CompileResult = {
  message: string;
  warnings?: V1_CompilationWarning[] | undefined;
};
