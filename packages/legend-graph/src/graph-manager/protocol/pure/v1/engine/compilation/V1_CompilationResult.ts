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

import type { V1_SourceInformation } from '../../model/V1_SourceInformation.js';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import type { V1_CompilationWarning } from './V1_CompilationWarning.js';

export interface V1_CompilationResult {
  warnings: V1_CompilationWarning[] | undefined;
}

export interface V1_TextCompilationResult extends V1_CompilationResult {
  model: V1_PureModelContextData;
  sourceInformationIndex: Map<string, V1_SourceInformation>;
}
