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

import { hashArray, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../../../graph/Core_HashUtils.js';
import type { V1_RawLambda } from '../../rawValueSpecification/V1_RawLambda.js';
import type { V1_PackageableElementPointer } from '../V1_PackageableElement.js';

export class V1_DEPRECATED__MappingTest implements Hashable {
  name!: string;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query!: V1_RawLambda;
  inputData: V1_DEPRECATED__InputData[] = [];
  assert!: V1_DEPRECATED__MappingTestAssert;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.MAPPING_TEST_LEGACY,
      this.name,
      this.query,
      hashArray(this.inputData),
      this.assert,
    ]);
  }
}

export abstract class V1_DEPRECATED__InputData implements Hashable {
  abstract get hashCode(): string;
}

export abstract class V1_DEPRECATED__MappingTestAssert implements Hashable {
  abstract get hashCode(): string;
}

export class V1_DEPRECATED__ExpectedOutputMappingTestAssert
  extends V1_DEPRECATED__MappingTestAssert
  implements Hashable
{
  expectedOutput!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
      this.expectedOutput,
    ]);
  }
}

export enum V1_DEPRECATED__ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export class V1_DEPRECATED__ObjectInputData
  extends V1_DEPRECATED__InputData
  implements Hashable
{
  /**
   * Value is set by default for backward compatibility
   * @backwardCompatibility
   */
  inputType = V1_DEPRECATED__ObjectInputType.JSON;
  sourceClass!: string;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass,
      this.inputType,
      this.data,
    ]);
  }
}

export class V1_DEPRECATED__FlatDataInputData
  extends V1_DEPRECATED__InputData
  implements Hashable
{
  sourceFlatData!: V1_PackageableElementPointer;
  data!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      this.sourceFlatData,
      this.data,
    ]);
  }
}

export class V1_DEPRECATED__RelationalInputData
  extends V1_DEPRECATED__InputData
  implements Hashable
{
  database!: string;
  data!: string;
  inputType!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_INPUT_DATA,
      this.database,
      this.data,
      this.inputType,
    ]);
  }
}
