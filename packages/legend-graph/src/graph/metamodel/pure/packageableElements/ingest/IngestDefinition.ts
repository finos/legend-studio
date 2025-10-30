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

import type { RawLambda } from '../../rawValueSpecification/RawLambda.js';
import { INTERNAL__UnknownPackageableElement } from '../INTERNAL__UnknownPackageableElement.js';
import type { PackageableElementVisitor } from '../PackageableElement.js';

export class AppDirNode {
  appDirId!: number;
  level!: string;
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

// will extend UnknownPackageableElement for now until we want to expose more of the forms
export class IngestDefinition extends INTERNAL__UnknownPackageableElement {
  appDirDeployment?: AppDirNode;
  TEMPORARY_MATVIEW_FUNCTION_DATA_SETS: MatViewDataSet[] | undefined;

  override accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_IngestDefinition(this);
  }
}
