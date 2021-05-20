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

import type { RootRelationalInstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { RelationalInstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RelationalInstanceSetImplementation';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { SetImplementation } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { RelationalPropertyMapping } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RelationalPropertyMapping';
import type { Mapping } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { EnumerationMapping } from '../../../../../../../metamodels/pure/model/packageableElements/mapping/EnumerationMapping';
import type { TableAlias } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import { TableAliasColumn } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import type { Column } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Column';
import { Table } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/Table';
import { View } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/View';
import { ColumnExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/ColumnReference';
import { FilterExplicitReference } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/model/FilterReference';
import { FilterMapping } from '../../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/FilterMapping';
import type { V1_GraphBuilderContext } from '../../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_RelationalClassMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import type { V1_FilterMapping } from '../../../../model/packageableElements/store/relational/mapping/V1_FilterMapping';
import { V1_ProtocolToMetaModelPropertyMappingVisitor } from '../../../../transformation/pureGraph/to/V1_ProtocolToMetaModelPropertyMappingVisitor';
import {
  V1_buildElementWithJoinsJoinTreeNode,
  V1_processRelationalOperationElement,
} from './V1_DatabaseBuilderHelper';

export const V1_processRelationalClassMapping = (
  relationalClassMapping: V1_RelationalClassMapping,
  context: V1_GraphBuilderContext,
  base: RelationalInstanceSetImplementation,
  topParent: RootRelationalInstanceSetImplementation,
  parentMapping: Mapping,
  embeddedRelationalPropertyMappings: EmbeddedRelationalInstanceSetImplementation[],
  enumerationMappings: EnumerationMapping[],
  tableAliasMap: Map<string, TableAlias>,
): SetImplementation => {
  const pureClass = relationalClassMapping.class
    ? context.resolveClass(relationalClassMapping.class)
    : base.class;
  // TODO localMappingProperties
  base.primaryKey = relationalClassMapping.primaryKey.map((key) =>
    V1_processRelationalOperationElement(key, context, tableAliasMap, []),
  );
  base.propertyMappings = relationalClassMapping.propertyMappings.map(
    (propertyMapping) =>
      propertyMapping.accept_PropertyMappingVisitor(
        new V1_ProtocolToMetaModelPropertyMappingVisitor(
          context,
          base,
          topParent,
          enumerationMappings,
          tableAliasMap,
        ),
      ),
  ) as RelationalPropertyMapping[];
  base.class = pureClass;
  return base;
};

export const V1_processRelationalPrimaryKey = (
  rootRelational: RootRelationalInstanceSetImplementation,
): void => {
  // TODO handle distinct
  if (rootRelational.groupBy) {
    rootRelational.primaryKey = rootRelational.groupBy.columns;
  } else if (!rootRelational.primaryKey.length) {
    const relation = rootRelational.mainTableAlias.relation.value;
    const mainTable = rootRelational.mainTableAlias;
    let columns: Column[] = [];
    if (relation instanceof Table || relation instanceof View) {
      columns = relation.primaryKey;
    }
    rootRelational.primaryKey = columns.map((col) => {
      const mainTableAlias = new TableAliasColumn();
      mainTableAlias.column = ColumnExplicitReference.create(col);
      mainTableAlias.alias = mainTable;
      return mainTableAlias;
    });
  }
};

export const V1_processRelationalMappingFilter = (
  v1_filter: V1_FilterMapping,
  context: V1_GraphBuilderContext,
): FilterMapping => {
  const db = context.resolveDatabase(v1_filter.filter.db).value;
  const filter = db.getFilter(v1_filter.filter.name);
  const filterMapping = new FilterMapping(
    db,
    filter.name,
    FilterExplicitReference.create(filter),
  );
  if (v1_filter.joins) {
    filterMapping.joinTreeNode = V1_buildElementWithJoinsJoinTreeNode(
      v1_filter.joins,
      context,
    );
  }
  return filterMapping;
};
