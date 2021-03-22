/**
 * Copyright Goldman Sachs
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
  getClass,
  UnsupportedOperationError,
} from '@finos/legend-studio-shared';
import type { PackageableElementImplicitReference } from '../../../../../model/packageableElements/PackageableElementReference';
import type { Database } from '../../../../../model/packageableElements/store/relational/model/Database';
import { Table } from '../../../../../model/packageableElements/store/relational/model/Table';
import type { Relation } from '../../../../../model/packageableElements/store/relational/model/RelationalOperationElement';
import {
  ViewExplicitReference,
  ViewImplicitReference,
} from '../../../../../model/packageableElements/store/relational/model/ViewReference';
import { View } from '../../../../../model/packageableElements/store/relational/model/View';
import type { Schema } from '../../../../../model/packageableElements/store/relational/model/Schema';
import {
  TableExplicitReference,
  TableImplicitReference,
} from '../../../../../model/packageableElements/store/relational/model/TableReference';

export const getSchemaFromRelation = (value: Relation): Schema => {
  if (value instanceof Table || value instanceof View) {
    return value.schema;
  }
  throw new UnsupportedOperationError(
    `Can't derive schema for relation of type '${getClass(value).name}'`,
  );
};

export const createExplicitRelationReference = (
  value: Relation,
): TableExplicitReference | ViewExplicitReference => {
  if (value instanceof Table) {
    return TableExplicitReference.create(value);
  } else if (value instanceof View) {
    return ViewExplicitReference.create(value);
  }
  throw new UnsupportedOperationError(
    `Can't create explicit reference for relation of type '${
      getClass(value).name
    }'`,
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
    `Can't create implicit reference for relation of type '${
      getClass(value).name
    }'`,
  );
};
