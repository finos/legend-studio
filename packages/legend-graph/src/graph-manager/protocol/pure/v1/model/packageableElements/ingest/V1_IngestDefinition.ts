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

import type { V1_AppDirNode } from '../../../lakehouse/entitlements/V1_CoreEntitlements.js';
import { hashArray, type Hashable } from '@finos/legend-shared';
import type { V1_RelationTypeColumn } from '../type/V1_RelationType.js';
import { V1_INTERNAL__UnknownPackageableElement } from '../V1_INTERNAL__UnknownPackageableElement.js';
import type { V1_PackageableElementVisitor } from '../V1_PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../../../../graph/Core_HashUtils.js';
import { V1_AtomicTest } from '../../test/V1_AtomicTest.js';
import { V1_TestSuite } from '../../test/V1_TestSuite.js';
import type { V1_DataResolver } from '../../data/V1_DataResolver.js';

export const V1_INGEST_DEFINITION_TYPE = 'ingestDefinition';

export class V1_IngestDefinition extends V1_INTERNAL__UnknownPackageableElement {
  appDirDeployment: V1_AppDirNode | undefined;
  testSuites: V1_IngestTestSuite[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_PACKAGEABLE_ELEMENT,
      this.path,
      hashObjectWithoutSourceInformation(this.content),
      hashArray(this.testSuites),
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: V1_PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_IngestDefinition(this);
  }
}
export class V1_IngestDatasetSchema {
  _type!: string;
  columns: V1_RelationTypeColumn[] = [];
}

export class V1_IngestDatasetSource {
  _type!: string;
  schema!: V1_IngestDatasetSchema;
}

export enum V1_WriteModeType {
  APPEND_ONLY = 'append_only',
  BATCH_MILESTONED = 'batch_milestoned',
  BATCH_MILESTONED_BUSINESS_TEMPORAL = 'batch_milestoned_business_temporal',
}

export class V1_WriteMode {
  _type!: V1_WriteModeType;
}

export class V1_AppendOnly extends V1_WriteMode {
  override _type = V1_WriteModeType.APPEND_ONLY;
}

export class V1_BatchMilestoned extends V1_WriteMode {
  override _type = V1_WriteModeType.BATCH_MILESTONED;
}

export class V1_BatchMilestonedBusinessTemporal extends V1_WriteMode {
  override _type = V1_WriteModeType.BATCH_MILESTONED_BUSINESS_TEMPORAL;
}

export class V1_IngestDataset {
  name!: string;
  primaryKey: string[] = [];
  source!: V1_IngestDatasetSource;
  writeMode?: V1_WriteMode;
}

export class V1_IngestMatViewTest extends V1_AtomicTest implements Hashable {
  datasetId!: string;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INGEST_MAT_VIEW_TEST,
      this.id,
      this.doc ?? '',
      this.datasetId,
      hashArray(this.assertions),
    ]);
  }
}

export class V1_IngestTestSuite extends V1_TestSuite implements Hashable {
  testData: V1_DataResolver[] = [];

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INGEST_TEST_SUITE,
      this.id,
      this.doc ?? '',
      hashArray(this.testData),
      hashArray(this.tests),
    ]);
  }
}

export class V1_IngestDefinitionContent {
  datasets?: V1_IngestDataset[];
  testSuites?: V1_IngestTestSuite[];
  writeMode?: V1_WriteMode;
}
