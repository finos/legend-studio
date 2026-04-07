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

import { hashArray, isNonNullable, type Hashable } from '@finos/legend-shared';
import type { RelationType } from './RelationType.js';
import type { DataProduct } from '../../dataProduct/DataProduct.js';
import type { IngestDefinition } from '../ingest/IngestDefinition.js';
import type { Database } from '../store/relational/model/Database.js';
import { InstanceValue } from '../../valueSpecification/InstanceValue.js';
import { Multiplicity } from '../domain/Multiplicity.js';
import { CORE_HASH_STRUCTURE } from '../../../../Core_HashUtils.js';
import type { ValueSpecificationVisitor } from '../../valueSpecification/ValueSpecification.js';

export type AccessorOwner = DataProduct | IngestDefinition | Database;

export abstract class Accessor implements Hashable {
  accessorOwner: string;
  schema: string | undefined;
  accessor: string;
  relationType: RelationType;
  parentElement: AccessorOwner;

  constructor(
    accessorOwner: string,
    schema: string | undefined,
    accessor: string,
    relationType: RelationType,
    parentElement: AccessorOwner,
  ) {
    this.accessorOwner = accessorOwner;
    this.schema = schema;
    this.accessor = accessor;
    this.relationType = relationType;
    this.parentElement = parentElement;
  }

  get path(): string[] {
    return [this.accessorOwner, this.schema, this.accessor].filter(
      isNonNullable,
    );
  }

  get hashCode(): string {
    return hashArray([this.accessorOwnerLabel, this.path.join('.')]);
  }

  abstract get accessorOwnerLabel(): string;

  abstract get accessorLabel(): string;

  get schemaLabel(): string | undefined {
    return undefined;
  }
}

export class DataProductAccessor extends Accessor {
  declare parentElement: DataProduct;

  override get accessorOwnerLabel(): string {
    return 'Data Product';
  }
  override get accessorLabel(): string {
    return 'Access Point';
  }

  override get schemaLabel(): string | undefined {
    return 'Access Point Group';
  }
}

export class IngestionAccessor extends Accessor {
  declare parentElement: IngestDefinition;

  override get accessorOwnerLabel(): string {
    return 'Ingestion Source';
  }
  override get accessorLabel(): string {
    return 'Ingestion Data Set';
  }

  override get schemaLabel(): string | undefined {
    return undefined;
  }
}

export class RelationalStoreAccessor extends Accessor implements Hashable {
  declare parentElement: Database;

  override get accessorOwnerLabel(): string {
    return 'Relational Database';
  }
  override get accessorLabel(): string {
    return 'Table';
  }

  override get schemaLabel(): string | undefined {
    return 'Schema';
  }
}

export class AccessorInstanceValue extends InstanceValue implements Hashable {
  override values: Accessor[] = [];

  constructor() {
    super(Multiplicity.ONE);
  }

  override get hashCode(): string {
    return hashArray([
      CORE_HASH_STRUCTURE.ACCESSOR_INSTANCE_VALUE,
      hashArray(this.values),
    ]);
  }

  override accept_ValueSpecificationVisitor<T>(
    visitor: ValueSpecificationVisitor<T>,
  ): T {
    return visitor.visit_AccessorInstanceValue(this);
  }
}
