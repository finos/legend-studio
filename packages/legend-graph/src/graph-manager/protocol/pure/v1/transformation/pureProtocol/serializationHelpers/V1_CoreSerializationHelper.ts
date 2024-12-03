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

import { primitive, createModelSchema, optional, deserialize } from 'serializr';
import {
  SerializationFactory,
  isString,
  optionalCustomUsingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import { V1_Multiplicity } from '../../../model/packageableElements/domain/V1_Multiplicity.js';
import { V1_PackageableElementPointer } from '../../../model/packageableElements/V1_PackageableElement.js';
import { V1_SourceInformation } from '../../../model/V1_SourceInformation.js';

export const V1_sourceInformationSerialization = new SerializationFactory(
  createModelSchema(V1_SourceInformation, {
    sourceId: primitive(),
    startLine: primitive(),
    startColumn: primitive(),
    endLine: primitive(),
    endColumn: primitive(),
  }),
);

export class V1_INTERNAL__PackageableElementWithSourceInformation {
  package!: string;
  name!: string;
  sourceInformation?: V1_SourceInformation;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_INTERNAL__PackageableElementWithSourceInformation, {
      package: primitive(),
      name: primitive(),
      sourceInformation: optionalCustomUsingModelSchema(
        V1_sourceInformationSerialization.schema,
      ),
    }),
  );
}

export const V1_packageableElementPointerModelSchema = createModelSchema(
  V1_PackageableElementPointer,
  {
    path: primitive(),
    type: optional(primitive()),
  },
);

export const V1_multiplicityModelSchema = createModelSchema(V1_Multiplicity, {
  lowerBound: primitive(),
  upperBound: optional(primitive()),
});

export const V1_serializePackageableElementPointer = (
  json: PlainObject<V1_PackageableElementPointer> | string,
  type?: string | undefined,
): V1_PackageableElementPointer => {
  // For backward compatible: see https://github.com/finos/legend-engine/pull/2621
  if (isString(json)) {
    return new V1_PackageableElementPointer(type, json);
  }
  return deserialize(V1_packageableElementPointerModelSchema, json);
};
