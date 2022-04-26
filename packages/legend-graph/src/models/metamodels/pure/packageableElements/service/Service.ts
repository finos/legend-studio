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

import { hashArray, uniq, type Hashable } from '@finos/legend-shared';
import { CORE_HASH_STRUCTURE } from '../../../../../MetaModelConst';
import type { ServiceExecution } from './ServiceExecution';
import {
  type PackageableElementVisitor,
  PackageableElement,
} from '../PackageableElement';
import type { StereotypeReference } from '../domain/StereotypeReference';
import type { TaggedValue } from '../domain/TaggedValue';
import type { ServiceTest_Legacy } from './ServiceTest_Legacy';
import type { TestSuite } from '../../test/TestSuite';

export const DEFAULT_SERVICE_PATTERN = '/';

export class Service extends PackageableElement implements Hashable {
  stereotypes: StereotypeReference[] = [];
  taggedValues: TaggedValue[] = [];
  pattern = '/';
  owners: string[] = [];
  documentation = '';
  autoActivateUpdates = true;
  execution!: ServiceExecution;
  test?: ServiceTest_Legacy | undefined;
  testSuites: TestSuite[] = [];

  get patternParameters(): string[] {
    return uniq(
      (this.pattern.match(/\{\w+\}/gu) ?? []).map((parameter) =>
        parameter.substring(1, parameter.length - 1),
      ),
    );
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.SERVICE,
      hashArray(
        this.stereotypes.map((stereotype) => stereotype.pointerHashCode),
      ),
      hashArray(this.taggedValues),
      this.path,
      this.pattern,
      hashArray(this.owners),
      this.documentation,
      this.autoActivateUpdates.toString(),
      this.execution,
      this.test ?? '',
      hashArray(this.testSuites),
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_Service(this);
  }
}
