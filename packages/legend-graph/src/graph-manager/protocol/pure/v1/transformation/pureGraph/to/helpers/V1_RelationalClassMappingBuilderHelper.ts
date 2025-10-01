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

import type { RootRelationalInstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { RelationalInstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { SetImplementation } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { RelationalPropertyMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RelationalPropertyMapping.js';
import type { Mapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { EnumerationMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/mapping/EnumerationMapping.js';
import {
  type TableAlias,
  TableAliasColumn,
} from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import type { Column } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Column.js';
import { Table } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/Table.js';
import { View } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/View.js';
import { ColumnExplicitReference } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/ColumnReference.js';
import { FilterMapping } from '../../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/FilterMapping.js';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext.js';
import type { V1_RelationalClassMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import type { V1_FilterMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_FilterMapping.js';
import { V1_PropertyMappingBuilder } from '../V1_PropertyMappingBuilder.js';
import {
  V1_buildElementWithJoinsJoinTreeNode,
  V1_buildRelationalOperationElement,
} from './V1_DatabaseBuilderHelper.js';

export const V1_buildRelationalClassMapping = (
  relationalClassMapping: V1_RelationalClassMapping,
  context: V1_GraphBuilderContext,
  immediateParent: RelationalInstanceSetImplementation,
  topParent: RootRelationalInstanceSetImplementation,
  parentMapping: Mapping,
  embeddedRelationalPropertyMappings: EmbeddedRelationalInstanceSetImplementation[],
  enumerationMappings: EnumerationMapping[],
  tableAliasIndex: Map<string, TableAlias>,
): SetImplementation => {
  const pureClass = relationalClassMapping.class
    ? context.resolveClass(relationalClassMapping.class)
    : immediateParent.class;
  // TODO localMappingProperties

  immediateParent.primaryKey = relationalClassMapping.primaryKey.map((key) =>
    V1_buildRelationalOperationElement(
      key,
      context,
      tableAliasIndex,
      [],
      undefined,
      true,
    ),
  );

  immediateParent.propertyMappings =
    relationalClassMapping.propertyMappings.map((propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(
        new V1_PropertyMappingBuilder(
          context,
          immediateParent,
          topParent,
          enumerationMappings,
          tableAliasIndex,
        ),
      ),
    ) as RelationalPropertyMapping[];
  immediateParent.class = pureClass;
  return immediateParent;
};

export const V1_buildRelationalPrimaryKey = (
  rootRelational: RootRelationalInstanceSetImplementation,
): void => {
  // TODO handle distinct
  if (!rootRelational.groupBy && !rootRelational.primaryKey.length) {
    const relation = rootRelational.mainTableAlias?.relation.value;
    const mainTable = rootRelational.mainTableAlias;
    let columns: Column[] = [];
    if (relation instanceof Table || relation instanceof View) {
      columns = relation.primaryKey;
    }
    rootRelational.primaryKey = columns.map((col) => {
      const mainTableAlias = new TableAliasColumn();
      // NOTE: this should be `implicit` because we do some inferencing
      // but we need to test the impact of changing it to `implicit`.
      // This might cause bugs in the future.
      // We need more (manual) tests for confidence
      mainTableAlias.column = ColumnExplicitReference.create(col);
      if (mainTable) {
        mainTableAlias.alias = mainTable;
      }
      return mainTableAlias;
    });
  }
};

export const V1_buildRelationalMappingFilter = (
  v1_filter: V1_FilterMapping,
  context: V1_GraphBuilderContext,
): FilterMapping => {
  const filter = context.resolveFilter(v1_filter.filter);
  const filterMapping = new FilterMapping(
    filter.ownerReference.value,
    filter.value.name,
    filter,
  );
  if (v1_filter.joins) {
    filterMapping.joinTreeNode = V1_buildElementWithJoinsJoinTreeNode(
      v1_filter.joins,
      context,
    );
  }
  return filterMapping;
};
