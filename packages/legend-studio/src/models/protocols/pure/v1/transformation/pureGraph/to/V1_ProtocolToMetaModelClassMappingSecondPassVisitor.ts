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

import {
  UnsupportedOperationError,
  assertType,
  isNonNullable,
  guaranteeType,
  assertNonEmptyString,
} from '@finos/legend-studio-shared';
import { CORE_LOG_EVENT } from '../../../../../../../utils/Logger';
import type { Mapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { SetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import type { PurePropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { OperationSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { SetImplementationContainer } from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementationContainer';
import { PureInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { TableAlias } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/model/RelationalOperationElement';
import { GroupByMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/GroupByMapping';
import { FlatDataInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { RootRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import type { AbstractFlatDataPropertyMapping } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping';
import { SetImplementationExplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementationReference';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import { V1_processRelationalOperationElement } from '../../../transformation/pureGraph/to/helpers/V1_DatabaseBuilderHelper';
import {
  V1_processRelationalClassMapping,
  V1_processRelationalPrimaryKey,
} from '../../../transformation/pureGraph/to/helpers/V1_RelationalClassMappingBuilderHelper';
import type { V1_ClassMappingVisitor } from '../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_OperationClassMapping } from '../../../model/packageableElements/mapping/V1_OperationClassMapping';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import { V1_ProtocolToMetaModelPropertyMappingVisitor } from './V1_ProtocolToMetaModelPropertyMappingVisitor';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping';
import { V1_getInferredClassMappingId } from '../../../transformation/pureGraph/to/helpers/V1_MappingBuilderHelper';
import { AggregationAwareSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import type { V1_AggregateSetImplementationContainer } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer';

export class V1_ProtocolToMetaModelClassMappingSecondPassVisitor
  implements V1_ClassMappingVisitor<void>
{
  context: V1_GraphBuilderContext;
  parent: Mapping;

  constructor(context: V1_GraphBuilderContext, parent: Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_OperationClassMapping(classMapping: V1_OperationClassMapping): void {
    assertNonEmptyString(
      classMapping.class,
      'Operation class mapping class is missing',
    );
    const id = V1_getInferredClassMappingId(
      this.context.resolveClass(classMapping.class).value,
      classMapping,
    ).value;
    const operationSetImplementation = this.parent.getClassMapping(id);
    assertType(
      operationSetImplementation,
      OperationSetImplementation,
      `Class mapping '${id}' is not of type operation set implementation`,
    );
    operationSetImplementation.parameters = classMapping.parameters
      .map((parameter) => {
        const setImplementation = this.parent.allClassMappings.find(
          (cm) => cm.id.value === parameter,
        );
        if (!setImplementation) {
          // TODO: we will get these cases sometimes since we haven't supported includedMappings
          this.context.logger.debug(
            CORE_LOG_EVENT.GRAPH_PROBLEM,
            `Can't find class mapping of ID '${parameter}' in mapping '${this.parent.path}' (perhaps because we haven't supported included mappings)`,
          );
          return undefined;
        }
        return new SetImplementationContainer(
          SetImplementationExplicitReference.create(setImplementation),
        );
      })
      .filter(isNonNullable);
  }

  visit_PureInstanceClassMapping(
    classMapping: V1_PureInstanceClassMapping,
  ): void {
    assertNonEmptyString(
      classMapping.class,
      'Model-to-model class mapping class is missing',
    );
    const pureInstanceSetImplementation = guaranteeType(
      this.parent.getClassMapping(
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      PureInstanceSetImplementation,
    );
    // NOTE: we have to process property mappings here instead of in the first pass like the backend because we actually resolve `target` and `source`
    // at this point instead of just passing in the IDs. This means we have to go through the first pass to create basic mapping elements first
    // before we can finally use/resolve them in this pass
    pureInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            pureInstanceSetImplementation,
            pureInstanceSetImplementation,
            this.parent.enumerationMappings,
          ),
        ),
      ) as PurePropertyMapping[];
  }

  visit_RootFlatDataClassMapping(
    classMapping: V1_RootFlatDataClassMapping,
  ): void {
    assertNonEmptyString(
      classMapping.class,
      'Flat-data class mapping class is missing',
    );
    const flatDataInstanceSetImplementation = guaranteeType(
      this.parent.getClassMapping(
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      FlatDataInstanceSetImplementation,
    );
    flatDataInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            flatDataInstanceSetImplementation,
            flatDataInstanceSetImplementation,
            this.parent.allEnumerationMappings,
          ),
        ),
      ) as AbstractFlatDataPropertyMapping[];
  }

  visit_RelationalClassMapping(classMapping: V1_RelationalClassMapping): void {
    throw new UnsupportedOperationError();
  }

  visit_RootRelationalClassMapping(
    classMapping: V1_RootRelationalClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Relational class mapping class is missing',
    );
    const rootRelationalInstanceSetImplementation = guaranteeType(
      this.parent.getClassMapping(
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      RootRelationalInstanceSetImplementation,
    );
    rootRelationalInstanceSetImplementation.distinct = classMapping.distinct;
    let mainTableAlias: TableAlias | undefined;
    if (classMapping.mainTable) {
      const relation = this.context.resolveRelation(classMapping.mainTable);
      mainTableAlias = new TableAlias();
      mainTableAlias.relation = relation;
      mainTableAlias.name = relation.value.name;
      rootRelationalInstanceSetImplementation.mainTableAlias = mainTableAlias;
    }
    // TODO MappingClass
    if (classMapping.groupBy.length) {
      const groupBy = new GroupByMapping();
      groupBy.columns = classMapping.groupBy.map((op) =>
        V1_processRelationalOperationElement(
          op,
          this.context,
          new Map<string, TableAlias>(),
          [],
        ),
      );
      rootRelationalInstanceSetImplementation.groupBy = groupBy;
    }
    const embedded: EmbeddedRelationalInstanceSetImplementation[] = [];
    const tableAliasMap = new Map<string, TableAlias>();
    V1_processRelationalClassMapping(
      classMapping,
      this.context,
      rootRelationalInstanceSetImplementation,
      rootRelationalInstanceSetImplementation,
      this.parent,
      embedded,
      this.parent.allEnumerationMappings,
      tableAliasMap,
    );
    // TODO filterMapping
    // NOTE: why are we adding embedded relational property mappings to class mapping in the backend????
    if (!mainTableAlias) {
      const tables = new Set(
        Array.from(tableAliasMap.values()).map((e) => e.relation),
      );
      const dbs = new Set(
        Array.from(tableAliasMap.values()).map(
          (e) => e.relation.value.schema.owner,
        ),
      );
      if (tables.size !== 1) {
        throw new Error(
          `Can't find the main table for class '${rootRelationalInstanceSetImplementation.class.value.path}'. Please specify a main table using the ~mainTable directive.`,
        );
      }
      if (dbs.size !== 1) {
        throw new Error(
          `Can't find the main table for class '${rootRelationalInstanceSetImplementation.class.value.path}'. Inconsistent database definitions for the mapping`,
        );
      }
      mainTableAlias = new TableAlias();
      mainTableAlias.name = '';
      mainTableAlias.relation = Array.from(tables.values())[0];
      mainTableAlias.database = Array.from(dbs.values())[0];
      rootRelationalInstanceSetImplementation.mainTableAlias = mainTableAlias;
    }
    if (!rootRelationalInstanceSetImplementation.primaryKey.length) {
      V1_processRelationalPrimaryKey(rootRelationalInstanceSetImplementation);
    }
    return rootRelationalInstanceSetImplementation;
  }

  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Aggregation-aware class mapping class is missing',
    );
    const aggragetionAwareInstanceSetImplementation = guaranteeType(
      this.parent.getClassMapping(
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      AggregationAwareSetImplementation,
    );
    const mapping = this.context.graph.getMapping(this.parent.path);
    classMapping.mainSetImplementation.accept_ClassMappingVisitor(
      new V1_ProtocolToMetaModelClassMappingSecondPassVisitor(
        this.context,
        mapping,
      ),
    );

    aggragetionAwareInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_ProtocolToMetaModelPropertyMappingVisitor(
            this.context,
            aggragetionAwareInstanceSetImplementation,
            aggragetionAwareInstanceSetImplementation,
            this.parent.enumerationMappings,
            new Map<string, TableAlias>(),
            mapping.allClassMappings,
            undefined,
            aggragetionAwareInstanceSetImplementation,
          ),
        ),
      );

    classMapping.aggregateSetImplementations.forEach(
      (aggregateSetImpl: V1_AggregateSetImplementationContainer) =>
        aggregateSetImpl.setImplementation.accept_ClassMappingVisitor(
          new V1_ProtocolToMetaModelClassMappingSecondPassVisitor(
            this.context,
            mapping,
          ),
        ),
    );

    return aggragetionAwareInstanceSetImplementation;
  }
}
