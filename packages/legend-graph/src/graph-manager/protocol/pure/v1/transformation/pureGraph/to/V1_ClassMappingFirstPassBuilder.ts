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
  assertNonEmptyString,
  assertNonNullable,
  guaranteeNonNullable,
} from '@finos/legend-shared';
import type { Mapping } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/Mapping.js';
import type { SetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/SetImplementation.js';
import {
  OperationSetImplementation,
  OperationType,
} from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/OperationSetImplementation.js';
import { PureInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation.js';
import { FlatDataInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation.js';
import { RootRelationalInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation.js';
import { InferableMappingElementRootExplicitValue } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InferableMappingElementRoot.js';
import type { V1_GraphBuilderContext } from './V1_GraphBuilderContext.js';
import type {
  V1_ClassMappingVisitor,
  V1_ClassMapping,
} from '../../../model/packageableElements/mapping/V1_ClassMapping.js';
import type { V1_OperationClassMapping } from '../../../model/packageableElements/mapping/V1_OperationClassMapping.js';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping.js';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping.js';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping.js';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping.js';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping.js';
import { V1_getInferredClassMappingId } from './helpers/V1_MappingBuilderHelper.js';
import { AggregationAwareSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation.js';
import type { InstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/InstanceSetImplementation.js';
import { V1_buildAggregateContainer } from './helpers/V1_AggregationAwareClassMappingBuilderHelper.js';
import { V1_buildRawLambdaWithResolvedPaths } from './helpers/V1_ValueSpecificationPathResolver.js';
import { V1_buildRelationalMappingFilter } from './helpers/V1_RelationalClassMappingBuilderHelper.js';
import type { DSL_Mapping_PureProtocolProcessorPlugin_Extension } from '../../../../extensions/DSL_Mapping_PureProtocolProcessorPlugin_Extension.js';
import type { V1_MergeOperationClassMapping } from '../../../model/packageableElements/mapping/V1_MergeOperationClassMapping.js';
import { MergeOperationSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/MergeOperationSetImplementation.js';
import type { V1_INTERNAL__UnknownClassMapping } from '../../../model/packageableElements/mapping/V1_INTERNAL__UnknownClassMapping.js';
import { INTERNAL__UnknownSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/INTERNAL__UnknownSetImplementation.js';
import type { V1_RelationFunctionClassMapping } from '../../../model/packageableElements/mapping/V1_RelationFunctionClassMapping.js';
import { RelationFunctionInstanceSetImplementation } from '../../../../../../../graph/metamodel/pure/packageableElements/mapping/relationFunction/RelationFunctionInstanceSetImplementation.js';

const getClassMappingOperationType = (value: string): OperationType =>
  guaranteeNonNullable(
    Object.values(OperationType).find((type) => type === value),
    `Encountered unsupported class mapping operation type '${value}'`,
  );

export class V1_ClassMappingFirstPassBuilder
  implements V1_ClassMappingVisitor<SetImplementation>
{
  context: V1_GraphBuilderContext;
  parent: Mapping;

  constructor(context: V1_GraphBuilderContext, parent: Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_ClassMapping(classMapping: V1_ClassMapping): SetImplementation {
    const extraClassMappingBuilders = this.context.extensions.plugins.flatMap(
      (plugin) =>
        (
          plugin as DSL_Mapping_PureProtocolProcessorPlugin_Extension
        ).V1_getExtraClassMappingFirstPassBuilders?.() ?? [],
    );
    for (const builder of extraClassMappingBuilders) {
      const extraClassMapping = builder(
        classMapping,
        this.context,
        this.parent,
      );
      if (extraClassMapping) {
        return extraClassMapping;
      }
    }
    throw new UnsupportedOperationError(
      `Can't build new class mapping: no compatible builder available from plugins`,
      classMapping,
    );
  }

  visit_INTERNAL__UnknownClassMapping(
    classMapping: V1_INTERNAL__UnknownClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Unknown class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Unknown class mapping 'root' field is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const metamodel = new INTERNAL__UnknownSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
    );
    metamodel.content = classMapping.content;
    return metamodel;
  }

  visit_OperationClassMapping(
    classMapping: V1_OperationClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Operation class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Operation class mapping 'root' field is missing`,
    );
    assertNonNullable(
      classMapping.operation,
      `Operation class mapping operation is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    return new OperationSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
      getClassMappingOperationType(classMapping.operation),
    );
  }

  visit_MergeOperationClassMapping(
    classMapping: V1_MergeOperationClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Merge Operation class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Merge Operation class mapping 'root' field is missing`,
    );
    assertNonNullable(
      classMapping.operation,
      `Merge Operation class mapping operation is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    return new MergeOperationSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
      getClassMappingOperationType(classMapping.operation),
      V1_buildRawLambdaWithResolvedPaths(
        classMapping.validationFunction.parameters,
        classMapping.validationFunction.body,
        this.context,
      ),
    );
  }

  visit_PureInstanceClassMapping(
    classMapping: V1_PureInstanceClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Pure instance class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Pure instance class mapping 'root' field is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const srcClassReference = classMapping.srcClass
      ? this.context.resolveType(classMapping.srcClass)
      : undefined;
    const pureInstanceSetImplementation = new PureInstanceSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
      srcClassReference,
    );
    pureInstanceSetImplementation.filter = classMapping.filter
      ? V1_buildRawLambdaWithResolvedPaths(
          [],
          classMapping.filter.body,
          this.context,
        )
      : undefined;
    return pureInstanceSetImplementation;
  }

  visit_RootFlatDataClassMapping(
    classMapping: V1_RootFlatDataClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Flat-data class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Flat-data class mapping 'root' field is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const sourceRootRecordType =
      this.context.resolveRootFlatDataRecordType(classMapping);
    const flatDataInstanceSetImplementation =
      new FlatDataInstanceSetImplementation(
        V1_getInferredClassMappingId(targetClass.value, classMapping),
        this.parent,
        targetClass,
        InferableMappingElementRootExplicitValue.create(classMapping.root),
        sourceRootRecordType,
      );
    flatDataInstanceSetImplementation.filter = classMapping.filter
      ? V1_buildRawLambdaWithResolvedPaths(
          [],
          classMapping.filter.body,
          this.context,
        )
      : undefined;
    return flatDataInstanceSetImplementation;
  }

  visit_RelationalClassMapping(
    classMapping: V1_RelationalClassMapping,
  ): SetImplementation {
    throw new UnsupportedOperationError();
  }

  visit_RootRelationalClassMapping(
    classMapping: V1_RootRelationalClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Relational class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Relational class mapping 'root' field is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const rootRelationalInstanceSetImplementation =
      new RootRelationalInstanceSetImplementation(
        V1_getInferredClassMappingId(targetClass.value, classMapping),
        this.parent,
        targetClass,
        InferableMappingElementRootExplicitValue.create(classMapping.root),
      );
    rootRelationalInstanceSetImplementation.filter = classMapping.filter
      ? V1_buildRelationalMappingFilter(classMapping.filter, this.context)
      : undefined;
    return rootRelationalInstanceSetImplementation;
  }

  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Aggregation-aware class mapping 'class' field is missing or empty`,
    );
    assertNonNullable(
      classMapping.root,
      `Aggregation-aware class mapping 'root' field is missing`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const mapping = this.context.graph.getMapping(this.parent.path);
    const aggragetionAwareInstanceSetImplementation =
      new AggregationAwareSetImplementation(
        V1_getInferredClassMappingId(targetClass.value, classMapping),
        this.parent,
        targetClass,
        InferableMappingElementRootExplicitValue.create(classMapping.root),
        classMapping.mainSetImplementation.accept_ClassMappingVisitor(
          new V1_ClassMappingFirstPassBuilder(this.context, mapping),
        ) as InstanceSetImplementation,
      );
    aggragetionAwareInstanceSetImplementation.aggregateSetImplementations =
      classMapping.aggregateSetImplementations.map((setImplementation) =>
        V1_buildAggregateContainer(setImplementation, this.context, mapping),
      );
    return aggragetionAwareInstanceSetImplementation;
  }

  visit_RelationFunctionClassMapping(
    classMapping: V1_RelationFunctionClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      `Relation function class mapping 'class' field is missing or empty`,
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    return new RelationFunctionInstanceSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
    );
  }
}
