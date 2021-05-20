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

import { primitive, createModelSchema, optional } from 'serializr';
import { SerializationFactory } from '@finos/legend-studio-shared';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement';
import { V1_SourceInformation } from '../../../model/V1_SourceInformation';

export const V1_sourceInformationSerialization = new SerializationFactory(
  createModelSchema(V1_SourceInformation, {
    sourceId: primitive(),
    startLine: primitive(),
    startColumn: primitive(),
    endLine: primitive(),
    endColumn: primitive(),
  }),
);

export const V1_packageableElementPointerDeserrializerSchema =
  createModelSchema(V1_PackageableElementPointer, {
    path: primitive(),
    type: primitive(),
  });

export const V1_multiplicitySchema = createModelSchema(V1_Multiplicity, {
  lowerBound: primitive(),
  upperBound: optional(primitive()),
});
