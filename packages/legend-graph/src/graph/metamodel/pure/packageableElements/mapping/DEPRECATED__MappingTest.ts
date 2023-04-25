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

import {
  uuid,
  hashArray,
  type Hashable,
  tryToMinifyLosslessJSONString,
} from '@finos/legend-shared';
import {
  CORE_HASH_STRUCTURE,
  hashElementPointer,
} from '../../../../Core_HashUtils.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import type { PackageableElementReference } from '../PackageableElementReference.js';
import type { Class } from '../domain/Class.js';
import type { FlatData } from '../store/flatData/model/FlatData.js';
import { PackageableElementPointerType } from '../../../../MetaModelConst.js';
import type { Database } from '../store/relational/model/Database.js';

/**
 * TODO: Remove once migration from `MappingTest_Legacy` to `MappingTest` is complete
 * @deprecated
 */
export class DEPRECATED__MappingTest implements Hashable {
  readonly _UUID = uuid();

  name: string;
  /**
   * Studio does not process value specification, they are left in raw JSON form
   *
   * @discrepancy model
   */
  query: RawLambda;
  inputData: DEPRECATED__InputData[] = [];
  assert: DEPRECATED__MappingTestAssert;

  constructor(
    name: string,
    query: RawLambda,
    inputData: DEPRECATED__InputData[],
    assert: DEPRECATED__MappingTestAssert,
  ) {
    this.name = name;
    this.query = query;
    this.inputData = inputData;
    this.assert = assert;
  }

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

export abstract class DEPRECATED__MappingTestAssert implements Hashable {
  abstract get hashCode(): string;
}

export class DEPRECATED__ExpectedOutputMappingTestAssert
  extends DEPRECATED__MappingTestAssert
  implements Hashable
{
  expectedOutput: string;

  constructor(expectedOutput: string) {
    super();
    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    this.expectedOutput = tryToMinifyLosslessJSONString(expectedOutput);
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.EXPECTED_OUTPUT_MAPPING_TEST_ASSERT,
      this.expectedOutput,
    ]);
  }
}

export abstract class DEPRECATED__InputData implements Hashable {
  abstract get hashCode(): string;
}

export enum ObjectInputType {
  JSON = 'JSON',
  XML = 'XML',
}

export class DEPRECATED__ObjectInputData
  extends DEPRECATED__InputData
  implements Hashable
{
  sourceClass: PackageableElementReference<Class>;
  inputType: ObjectInputType;
  data: string;

  constructor(
    sourceClass: PackageableElementReference<Class>,
    inputType: ObjectInputType,
    data: string,
  ) {
    super();
    this.sourceClass = sourceClass;
    this.inputType = inputType;
    /**
     * @workaround https://github.com/finos/legend-studio/issues/68
     */
    this.data =
      inputType === ObjectInputType.JSON
        ? tryToMinifyLosslessJSONString(data)
        : data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.OBJECT_INPUT_DATA,
      this.sourceClass.valueForSerialization ?? '',
      this.inputType,
      this.data,
    ]);
  }
}

export class DEPRECATED__FlatDataInputData
  extends DEPRECATED__InputData
  implements Hashable
{
  sourceFlatData: PackageableElementReference<FlatData>;
  data: string;

  constructor(
    sourceFlatData: PackageableElementReference<FlatData>,
    data: string,
  ) {
    super();
    this.sourceFlatData = sourceFlatData;
    this.data = data;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.FLAT_DATA_INPUT_DATA,
      hashElementPointer(
        PackageableElementPointerType.STORE,
        this.sourceFlatData.valueForSerialization ?? '',
      ),
      this.data,
    ]);
  }
}

export enum RelationalInputType {
  SQL = 'SQL',
  CSV = 'CSV',
}

export class DEPRECATED__RelationalInputData
  extends DEPRECATED__InputData
  implements Hashable
{
  database: PackageableElementReference<Database>;
  data: string;
  inputType: RelationalInputType;

  constructor(
    database: PackageableElementReference<Database>,
    data: string,
    inputType: RelationalInputType,
  ) {
    super();
    this.database = database;
    this.data = data;
    this.inputType = inputType;
  }

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.RELATIONAL_INPUT_DATA,
      this.database.valueForSerialization ?? '',
      this.data,
      this.inputType,
    ]);
  }
}
