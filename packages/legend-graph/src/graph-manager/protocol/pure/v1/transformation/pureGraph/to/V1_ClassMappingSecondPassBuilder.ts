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
  LogEvent,
  UnsupportedOperationError,
  assertType,
  isNonNullable,
  guaranteeType,
  assertNonEmptyString,
  assertTrue,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import { GRAPH_MANAGER_EVENT } from '../../../../../../../__lib__/GraphManagerEvent.js';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { SetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import type { PurePropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PurePropertyMapping.js';
import { OperationSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import { SetImplementationContainer } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementationContainer.js';
import { PureInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import { TableAlias } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/model/RelationalOperationElement.js';
import { GroupByMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/GroupByMapping.js';
import { FlatDataInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import { RootRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import type { AbstractFlatDataPropertyMapping } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/AbstractFlatDataPropertyMapping.js';
import { SetImplementationImplicitReference } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementationReference.js';
import type { EmbeddedRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/EmbeddedRelationalInstanceSetImplementation.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';
import { V1_buildRelationalOperationElement } from './helpers/V1_DatabaseBuilderHelper.js';
import {
  V1_buildRelationalClassMapping,
  V1_buildRelationalPrimaryKey,
} from './helpers/V1_RelationalClassMappingBuilderHelper.js';
import type {
  V1_ClassMappingVisitor,
  V1_ClassMapping,
} from '../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_OperationClassMapping } from '../../../model/packageableElements/mapping/V1_OperationClassMapping.js';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping.js';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import { V1_PropertyMappingBuilder } from './V1_PropertyMappingBuilder.js';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping.js';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping.js';
import { V1_getInferredClassMappingId } from './helpers/V1_MappingBuilderHelper.js';
import { AggregationAwareSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import type { V1_AggregateSetImplementationContainer } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregateSetImplementationContainer.js';
import {
  extractClassMappingsFromAggregationAwareClassMappings,
  getAllClassMappings,
  getAllEnumerationMappings,
  getOwnClassMappingById,
} from '../../../../../../../graph/helpers/DSL_Mapping_Helper.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { V1_MergeOperationClassMapping } from '../../../model/packageableElements/mapping/V1_MergeOperationClassMapping.js';
import type { V1_INTERNAL__UnknownClassMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownClassMapping.js';
import type {
  V1_RelationFunctionClassMapping
} from '../../../model/packageableElements/mapping/V1_RelationFunctionClassMapping.js';
import {
  RelationFunctionInstanceSetImplementation
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/RelationFunctionInstanceSetImplementation.js';
import { generateFunctionPrettyName } from '../../../../../../../graph/helpers/PureLanguageHelper.js';

export class V1_ClassMappingSecondPassBuilder
  implements V1_ClassMappingVisitor<void>
{
  context: V1_GraphBuilderContext;
  parent: Mapping;

  constructor(context: V1_GraphBuilderContext, parent: Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_ClassMapping(classMapping: V1_ClassMapping): void {
    const extraClassMappingBuilders = this.context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraClassMappingSecondPassBuilders?.() ?? [],
    );
    for (const builder of extraClassMappingBuilders) {
      builder(classMapping, this.context, this.parent);
    }
  }

  visit_INTERNAL__UnknownClassMapping(
    classMapping: V1_INTERNAL__UnknownClassMapping,
  ): void {
    return;
  }

  visit_OperationClassMapping(classMapping: V1_OperationClassMapping): void {
    assertNonEmptyString(
      classMapping.class,
      `Operation class mapping 'class' field is missing or empty`,
    );
    const id = V1_getInferredClassMappingId(
      this.context.resolveClass(classMapping.class).value,
      classMapping,
    ).value;
    const operationSetImplementation = getOwnClassMappingById(this.parent, id);
    assertType(
      operationSetImplementation,
      OperationSetImplementation,
      `Class mapping with ID '${id}' is not of type operation set implementation`,
    );
    if (classMapping.extendsClassMappingId) {
      operationSetImplementation.superSetImplementationId =
        classMapping.extendsClassMappingId;
    }
    operationSetImplementation.parameters = classMapping.parameters
      .map((parameter) => {
        const setImplementation = getAllClassMappings(this.parent).find(
          (cm) => cm.id.value === parameter,
        );
        if (!setImplementation) {
          // TODO: we will get these cases sometimes since we haven't supported includedMappings
          this.context.logService.debug(
            LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_BUILDER_FAILURE),
            `Can't find class mapping with ID '${parameter}' in mapping '${this.parent.path}' (perhaps because we haven't supported included mappings)`,
          );
          return undefined;
        }
        return new SetImplementationContainer(
          SetImplementationImplicitReference.create(
            setImplementation,
            undefined,
          ),
        );
      })
      .filter(isNonNullable);
  }

  visit_MergeOperationClassMapping(
    classMapping: V1_MergeOperationClassMapping,
  ): void {
    this.visit_OperationClassMapping(classMapping);
  }

  visit_PureInstanceClassMapping(
    classMapping: V1_PureInstanceClassMapping,
  ): void {
    assertNonEmptyString(
      classMapping.class,
      `Pure instance class mapping 'class' field is missing or empty`,
    );
    const pureInstanceSetImplementation = guaranteeType(
      getOwnClassMappingById(
        this.parent,
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      PureInstanceSetImplementation,
    );
    if (classMapping.extendsClassMappingId) {
      pureInstanceSetImplementation.superSetImplementationId =
        classMapping.extendsClassMappingId;
    }
    // NOTE: we have to process property mappings here instead of in the first pass like the backend because we actually resolve `target` and `source`
    // at this point instead of just passing in the IDs. This means we have to go through the first pass to create basic mapping elements first
    // before we can finally use/resolve them in this pass
    pureInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
            this.context,
            pureInstanceSetImplementation,
            pureInstanceSetImplementation,
            getAllEnumerationMappings(this.parent),
          ),
        ),
      ) as PurePropertyMapping[];
  }

  visit_RootFlatDataClassMapping(
    classMapping: V1_RootFlatDataClassMapping,
  ): void {
    assertNonEmptyString(
      classMapping.class,
      `Flat-data class mapping 'class' field is missing or empty`,
    );
    const flatDataInstanceSetImplementation = guaranteeType(
      getOwnClassMappingById(
        this.parent,
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      FlatDataInstanceSetImplementation,
    );
    if (classMapping.extendsClassMappingId) {
      flatDataInstanceSetImplementation.superSetImplementationId =
        classMapping.extendsClassMappingId;
    }
    flatDataInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
            this.context,
            flatDataInstanceSetImplementation,
            flatDataInstanceSetImplementation,
            getAllEnumerationMappings(this.parent),
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
      `Relational class mapping 'class' field is missing or empty`,
    );
    const rootRelationalInstanceSetImplementation = guaranteeType(
      getOwnClassMappingById(
        this.parent,
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      RootRelationalInstanceSetImplementation,
    );
    rootRelationalInstanceSetImplementation.distinct = classMapping.distinct;
    if (classMapping.extendsClassMappingId) {
      rootRelationalInstanceSetImplementation.superSetImplementationId =
        classMapping.extendsClassMappingId;
    }
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
        V1_buildRelationalOperationElement(
          op,
          this.context,
          new Map<string, TableAlias>(),
          [],
        ),
      );
      rootRelationalInstanceSetImplementation.groupBy = groupBy;
    }
    const embedded: EmbeddedRelationalInstanceSetImplementation[] = [];
    const tableAliasIndex = new Map<string, TableAlias>();
    V1_buildRelationalClassMapping(
      classMapping,
      this.context,
      rootRelationalInstanceSetImplementation,
      rootRelationalInstanceSetImplementation,
      this.parent,
      embedded,
      getAllEnumerationMappings(this.parent),
      tableAliasIndex,
    );
    // TODO filterMapping
    // NOTE: why are we adding embedded relational property mappings to class mapping in the backend????
    if (!mainTableAlias && !classMapping.extendsClassMappingId) {
      const tables = new Set(
        Array.from(tableAliasIndex.values()).map((e) => e.relation),
      );
      const dbs = new Set(
        Array.from(tableAliasIndex.values()).map(
          (e) => e.relation.value.schema._OWNER,
        ),
      );
      assertTrue(
        tables.size === 1,
        `Can't find the main table for class '${rootRelationalInstanceSetImplementation.class.value.path}'. Please specify a main table using the ~mainTable directive`,
      );
      assertTrue(
        dbs.size === 1,
        `Can't find the main table for class '${rootRelationalInstanceSetImplementation.class.value.path}': inconsistent database definitions for the mapping`,
      );
      mainTableAlias = new TableAlias();
      mainTableAlias.name = '';
      mainTableAlias.relation = guaranteeNonNullable(
        Array.from(tables.values())[0],
      );
      mainTableAlias.database = Array.from(dbs.values())[0];
      rootRelationalInstanceSetImplementation.mainTableAlias = mainTableAlias;
    }
    if (
      !rootRelationalInstanceSetImplementation.primaryKey.length &&
      !classMapping.extendsClassMappingId
    ) {
      V1_buildRelationalPrimaryKey(rootRelationalInstanceSetImplementation);
    }
    return rootRelationalInstanceSetImplementation;
  }

  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Aggregation-aware class mapping 'class' field is missing or empty`,
    );
    const aggragetionAwareInstanceSetImplementation = guaranteeType(
      getOwnClassMappingById(
        this.parent,
        V1_getInferredClassMappingId(
          this.context.resolveClass(classMapping.class).value,
          classMapping,
        ).value,
      ),
      AggregationAwareSetImplementation,
    );
    if (classMapping.extendsClassMappingId) {
      aggragetionAwareInstanceSetImplementation.superSetImplementationId =
        classMapping.extendsClassMappingId;
    }
    const mapping = this.context.graph.getMapping(this.parent.path);
    classMapping.mainSetImplementation.accept_ClassMappingVisitor(
      new V1_ClassMappingSecondPassBuilder(this.context, mapping),
    );

    aggragetionAwareInstanceSetImplementation.propertyMappings =
      classMapping.propertyMappings.map((propertyMapping) =>
        propertyMapping.accept_PropertyMappingVisitor(
          new V1_PropertyMappingBuilder(
            this.context,
            aggragetionAwareInstanceSetImplementation,
            aggragetionAwareInstanceSetImplementation,
            getAllEnumerationMappings(this.parent),
            new Map<string, TableAlias>(),
            [
              ...getAllClassMappings(mapping),
              ...extractClassMappingsFromAggregationAwareClassMappings(mapping),
            ],
            undefined,
            aggragetionAwareInstanceSetImplementation,
          ),
        ),
      );

    classMapping.aggregateSetImplementations.forEach(
      (aggregateSetImpl: V1_AggregateSetImplementationContainer) =>
        aggregateSetImpl.setImplementation.accept_ClassMappingVisitor(
          new V1_ClassMappingSecondPassBuilder(this.context, mapping),
        ),
    );

    return aggragetionAwareInstanceSetImplementation;
  }

  visit_RelationFunctionClassMapping(classMapping: V1_RelationFunctionClassMapping): SetImplementation {
    assertNonEmptyString(
        classMapping.class,
        `Relation function class mapping 'class' field is missing or empty`,
    );
    const relationFunctionInstanceSetImplementation = guaranteeType(
        getOwnClassMappingById(
            this.parent,
            V1_getInferredClassMappingId(
                this.context.resolveClass(classMapping.class).value,
                classMapping,
            ).value,
        ),
        RelationFunctionInstanceSetImplementation,
    );
    relationFunctionInstanceSetImplementation.relationFunction = guaranteeNonNullable(
        this.context.graph.functions.find(
            (fn) =>
                generateFunctionPrettyName(fn, {
                  fullPath: true,
                  spacing: false,
                  notIncludeParamName: true,
                }).replaceAll(/\s/gu, '')
                === classMapping.relationFunction.path.replaceAll(/\s/gu, ''),
        ),
    );
    relationFunctionInstanceSetImplementation.propertyMappings =
        classMapping.propertyMappings.map((propertyMapping) =>
            propertyMapping.accept_PropertyMappingVisitor(
                new V1_PropertyMappingBuilder(
                    this.context,
                    relationFunctionInstanceSetImplementation,
                    relationFunctionInstanceSetImplementation,
                    getAllEnumerationMappings(this.parent),
                ),
            ),
        );
    return relationFunctionInstanceSetImplementation;
  }
}
