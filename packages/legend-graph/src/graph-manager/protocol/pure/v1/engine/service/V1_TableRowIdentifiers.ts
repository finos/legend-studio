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

import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import { createModelSchema, list, primitive, raw } from 'serializr';
import {
  type V1_TablePtr,
  V1_tablePtrModelSchema,
} from '../../../../../../STO_Relational_Exports.js';
import {
  ColumnValuePair,
  RowIdentifier,
  TableRowIdentifiers,
} from '../../../../../../graph/metamodel/pure/packageableElements/service/TableRowIdentifiers.js';
import { V1_buildTablePtr } from '../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper.js';

export class V1_ColumnValuePair {
  name!: string;
  value!: object;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ColumnValuePair, {
      name: primitive(),
      value: raw(),
    }),
  );
}

export class V1_RowIdentifier {
  columnValuePairs: V1_ColumnValuePair[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_RowIdentifier, {
      columnValuePairs: list(
        usingModelSchema(V1_ColumnValuePair.serialization.schema),
      ),
    }),
  );
}

export class V1_TableRowIdentifiers {
  table!: V1_TablePtr;
  rowIdentifiers: V1_RowIdentifier[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_TableRowIdentifiers, {
      table: usingModelSchema(V1_tablePtrModelSchema),
      rowIdentifiers: list(
        usingModelSchema(V1_RowIdentifier.serialization.schema),
      ),
    }),
  );
}

export const V1_buildColumnValuePair = (
  protocol: V1_ColumnValuePair,
): ColumnValuePair => new ColumnValuePair(protocol.name, protocol.value);

export const V1_buildRowIdentifier = (
  protocol: V1_RowIdentifier,
): RowIdentifier =>
  new RowIdentifier(
    protocol.columnValuePairs.map((p) => V1_buildColumnValuePair(p)),
  );

export const V1_buildTableRowIdentifiers = (
  protocol: V1_TableRowIdentifiers,
): TableRowIdentifiers =>
  new TableRowIdentifiers(
    V1_buildTablePtr(protocol.table),
    protocol.rowIdentifiers.map((ri) => V1_buildRowIdentifier(ri)),
  );
