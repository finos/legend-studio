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

import { makeObservable, override } from 'mobx';
import { hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import type { PackageableElementVisitor } from '@finos/legend-graph';
import { PackageableElement } from '@finos/legend-graph';
import { DATA_SPACE_HASH_STRUCTURE } from '../../../../../DSLDataSpace_ModelUtils';

export class DataSpace extends PackageableElement implements Hashable {
  groupId!: string;
  artifactId!: string;
  versionId!: string;
  mapping!: string;
  runtime!: string;
  diagrams: string[] = [];
  description?: string | undefined;
  // NOTE: we're not too sure about this attribute. We feel that this would be needed but maybe
  // we can think of a more generic strategy for this type of metadata
  supportEmail?: string | undefined;

  constructor(name: string) {
    super(name);

    makeObservable<DataSpace, '_elementHashCode'>(this, {
      _elementHashCode: override,
    });
  }

  protected override get _elementHashCode(): string {
    return hashArray([
      DATA_SPACE_HASH_STRUCTURE.DATA_SPACE,
      this.groupId,
      this.artifactId,
      this.versionId,
      this.mapping,
      this.runtime,
      hashArray(this.diagrams),
      this.description ?? '',
      this.supportEmail ?? '',
    ]);
  }

  accept_PackageableElementVisitor<T>(
    visitor: PackageableElementVisitor<T>,
  ): T {
    return visitor.visit_PackageableElement(this);
  }
}
