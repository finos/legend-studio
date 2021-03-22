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

import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import { SourceInformation } from '../../../../../../../metamodels/pure/action/SourceInformation';
import type { V1_SourceInformation } from '../../../../model/V1_SourceInformation';

export const V1_buildSourceInformation = (
  sourceInformation: V1_SourceInformation,
): SourceInformation =>
  new SourceInformation(
    guaranteeNonNullable(
      sourceInformation.sourceId,
      'Source information source ID is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.startLine,
      'Source information start line is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.startColumn,
      'Source information start column is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.endLine,
      'Source information end line is missing',
    ),
    guaranteeNonNullable(
      sourceInformation.endColumn,
      'Source information end column is missing',
    ),
  );
