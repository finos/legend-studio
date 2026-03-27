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

import { createModelSchema, optional, primitive } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { V1_sourceInformationSerialization } from '../../transformation/pureProtocol/serializationHelpers/V1_CoreSerializationHelper.js';
import type { V1_SourceInformation } from '../../model/V1_SourceInformation.js';
import { V1_Defect, V1_DefectSeverityLevel } from './V1_Defect.js';

export const V1_PURE_WARNING_DEFECT_TYPE_ID = 'PureWarning';

export class V1_CompilationWarning extends V1_Defect {
  declare message: string;
  declare sourceInformation: V1_SourceInformation | undefined;

  constructor() {
    super();
    this.defectTypeId = V1_PURE_WARNING_DEFECT_TYPE_ID;
    this.defectSeverityLevel = V1_DefectSeverityLevel.WARN;
  }

  static override readonly serialization = new SerializationFactory(
    createModelSchema(V1_CompilationWarning, {
      defectSeverityLevel: primitive(),
      defectTypeId: primitive(),
      message: primitive(),
      sourceInformation: optional(
        usingModelSchema(V1_sourceInformationSerialization.schema),
      ),
    }),
  );
}
