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

import { UnsupportedOperationError } from '@finos/legend-shared';
import type { PackageableElementImplicitReference } from '../../../PackageableElementReference.js';
import type { Database } from './Database.js';
import { Table } from './Table.js';
import type { Relation } from './RelationalOperationElement.js';
import {
  ViewExplicitReference,
  ViewImplicitReference,
} from './ViewReference.js';
import { View } from './View.js';
import {
  TableExplicitReference,
  TableImplicitReference,
} from './TableReference.js';

export const createExplicitRelationReference = (
  value: Relation,
): TableExplicitReference | ViewExplicitReference => {
  if (value instanceof Table) {
    return TableExplicitReference.create(value);
  } else if (value instanceof View) {
    return ViewExplicitReference.create(value);
  }
  throw new UnsupportedOperationError(
    `Can't create explicit reference for relation`,
    value,
  );
};

export const createImplicitRelationReference = (
  ownerReference: PackageableElementImplicitReference<Database>,
  value: Relation,
): TableImplicitReference | ViewImplicitReference => {
  if (value instanceof Table) {
    return TableImplicitReference.create(ownerReference, value);
  } else if (value instanceof View) {
    return ViewImplicitReference.create(ownerReference, value);
  }
  throw new UnsupportedOperationError(
    `Can't create implicit reference for relation`,
    value,
  );
};
