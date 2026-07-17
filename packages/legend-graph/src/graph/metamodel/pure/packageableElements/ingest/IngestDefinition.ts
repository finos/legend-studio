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
import type { DataResolver } from '../../data/DataResolver.js';
import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import { AtomicTest, TestSuite } from '../../test/Test.js';
import { INTERNAL__UnknownPackageableElement } from '../INTERNAL__UnknownPackageableElement.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';
import {
  CORE_HASH_STRUCTURE,
  hashObjectWithoutSourceInformation,
} from '../../../../Core_HashUtils.js';
import type { Testable } from '../../test/Testable.js';

export enum AppDirLevel {
  BUSINESS_UNIT = 'BUSINESS_UNIT',
  SUB_BUSINESS_UNIT = 'SUB_BUSINESS_UNIT',
  FAMILY = 'FAMILY',
  APPLICATION = 'APPLICATION',
  DEPLOYMENT = 'DEPLOYMENT',
}

export class AppDirNode implements Hashable {
  appDirId!: number;
  level!: AppDirLevel;

  get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.APP_DIR_NODE,
      this.appDirId.toString(),
      this.level,
    ]);
  }
}

export interface TEMPORARY_IngestLambdaFunction {
  _type: string;
  body: unknown[];
  parameters?: unknown[];
}

export interface TEMPORARY_IngestDataset {
  name: string;
  source?: {
    _type: string;
    function?: TEMPORARY_IngestLambdaFunction;
  };
}

export interface TEMPORARY_IngestContent {
  _type: string;
  datasets?: TEMPORARY_IngestDataset[];
}

export interface MatViewDataSet {
  name: string;
  source: {
    function: RawLambda;
  };
}

export class IngestMatViewTest extends AtomicTest implements Hashable {
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

export class IngestTestSuite extends TestSuite implements Hashable {
  testData: DataResolver[] = [];

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INGEST_TEST_SUITE,
      this.id,
      this.doc ?? '',
      hashArray(this.testData),
      hashArray(this.tests),
    ]);
  }
}

// will extend UnknownPackageableElement for now until we want to expose more of the forms
export class IngestDefinition
  extends INTERNAL__UnknownPackageableElement
  implements Testable
{
  appDirDeployment?: AppDirNode;
  tests: IngestTestSuite[] = [];
  TEMPORARY_MATVIEW_FUNCTION_DATA_SETS: MatViewDataSet[] | undefined;

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.INTERNAL__UNKNOWN_PACKAGEABLE_ELEMENT,
      this.path,
      hashObjectWithoutSourceInformation(this.content),
      hashArray(this.tests),
    ]);
  }

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_IngestDefinition(this);
  }
}
