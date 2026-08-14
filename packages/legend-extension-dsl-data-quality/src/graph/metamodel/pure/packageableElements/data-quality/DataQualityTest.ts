/**
 * Copyright (c) 2026-present, Goldman Sachs
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
import {
  AtomicTest,
  TestSuite,
  type FunctionTestData,
} from '@finos/legend-graph';
import { DATA_QUALITY_HASH_STRUCTURE } from '../../../DSL_DataQuality_HashUtils.js';

export class DataQualityRelationValidationTest
  extends AtomicTest
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION_TEST,
      this.id,
      this.doc ?? '',
      hashArray(this.assertions),
    ]);
  }
}

export class DataQualityRelationValidationTestData implements Hashable {
  testData: FunctionTestData[] = [];

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION_TEST_DATA,
      hashArray(this.testData),
    ]);
  }
}

export class DataQualityRelationValidationTestSuite
  extends TestSuite
  implements Hashable
{
  testData: DataQualityRelationValidationTestData | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_VALIDATION_TEST_SUITE,
      this.id,
      this.doc ?? '',
      hashArray(this.tests),
      this.testData ?? '',
    ]);
  }
}

export class DataQualityRelationComparisonTest
  extends AtomicTest
  implements Hashable
{
  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_COMPARISON_TEST,
      this.id,
      this.doc ?? '',
      hashArray(this.assertions),
    ]);
  }
}

export class DataQualityRelationComparisonTestData implements Hashable {
  testData: FunctionTestData[] = [];

  get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_COMPARISON_TEST_DATA,
      hashArray(this.testData),
    ]);
  }
}

export class DataQualityRelationComparisonTestSuite
  extends TestSuite
  implements Hashable
{
  testData: DataQualityRelationComparisonTestData | undefined;

  override get hashCode(): string {
    return hashArray([
      DATA_QUALITY_HASH_STRUCTURE.DATA_QUALITY_RELATION_COMPARISON_TEST_SUITE,
      this.id,
      this.doc ?? '',
      hashArray(this.tests),
      this.testData ?? '',
    ]);
  }
}
