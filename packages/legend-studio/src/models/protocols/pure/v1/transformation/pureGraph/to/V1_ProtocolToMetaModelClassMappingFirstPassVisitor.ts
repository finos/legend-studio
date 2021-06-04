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
} from '@finos/legend-studio-shared';
import type { Mapping } from '../../../../../../metamodels/pure/model/packageableElements/mapping/Mapping';
import type { SetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/SetImplementation';
import {
  OperationSetImplementation,
  getClassMappingOperationType,
} from '../../../../../../metamodels/pure/model/packageableElements/mapping/OperationSetImplementation';
import { PureInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { FlatDataInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/flatData/mapping/FlatDataInstanceSetImplementation';
import { RootRelationalInstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/store/relational/mapping/RootRelationalInstanceSetImplementation';
import { OptionalPackageableElementImplicitReference } from '../../../../../../metamodels/pure/model/packageableElements/PackageableElementReference';
import { InferableMappingElementRootExplicitValue } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InferableMappingElementRoot';
import type { V1_GraphBuilderContext } from '../../../transformation/pureGraph/to/V1_GraphBuilderContext';
import type { V1_ClassMappingVisitor } from '../../../model/packageableElements/mapping/V1_ClassMapping';
import type { V1_OperationClassMapping } from '../../../model/packageableElements/mapping/V1_OperationClassMapping';
import type { V1_PureInstanceClassMapping } from '../../../model/packageableElements/store/modelToModel/mapping/V1_PureInstanceClassMapping';
import type { V1_RelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RelationalClassMapping';
import type { V1_RootFlatDataClassMapping } from '../../../model/packageableElements/store/flatData/mapping/V1_RootFlatDataClassMapping';
import type { V1_RootRelationalClassMapping } from '../../../model/packageableElements/store/relational/mapping/V1_RootRelationalClassMapping';
import type { V1_AggregationAwareClassMapping } from '../../../model/packageableElements/store/relational/mapping/aggregationAware/V1_AggregationAwareClassMapping';
import { V1_getInferredClassMappingId } from '../../../transformation/pureGraph/to/helpers/V1_MappingBuilderHelper';
import { AggregationAwareSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/aggregationAware/AggregationAwareSetImplementation';
import type { InstanceSetImplementation } from '../../../../../../metamodels/pure/model/packageableElements/mapping/InstanceSetImplementation';
import { V1_processAggregateContainer } from './helpers/V1_AggregationAwareClassMappingBuilderHelper';
import { V1_rawLambdaBuilderWithResolver } from './helpers/V1_RawLambdaResolver';
import { V1_processRelationalMappingFilter } from './helpers/V1_RelationalClassMappingBuilderHelper';

export class V1_ProtocolToMetaModelClassMappingFirstPassVisitor
  implements V1_ClassMappingVisitor<SetImplementation>
{
  context: V1_GraphBuilderContext;
  parent: Mapping;

  constructor(context: V1_GraphBuilderContext, parent: Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_OperationClassMapping(
    classMapping: V1_OperationClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Operation class mapping class is missing',
    );
    assertNonNullable(
      classMapping.root,
      'Operation class mapping root flag is missing',
    );
    assertNonNullable(
      classMapping.operation,
      'Operation class mapping operation is missing',
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

  visit_PureInstanceClassMapping(
    classMapping: V1_PureInstanceClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Model-to-model class mapping class is missing',
    );
    assertNonNullable(
      classMapping.root,
      'Model-to-model class mapping root flag is missing',
    );
    const targetClass = this.context.resolveClass(classMapping.class);
    const srcClassReference = classMapping.srcClass
      ? this.context.resolveClass(classMapping.srcClass)
      : undefined;
    const pureInstanceSetImplementation = new PureInstanceSetImplementation(
      V1_getInferredClassMappingId(targetClass.value, classMapping),
      this.parent,
      targetClass,
      InferableMappingElementRootExplicitValue.create(classMapping.root),
      OptionalPackageableElementImplicitReference.create(
        srcClassReference?.value,
        classMapping.srcClass,
        this.context.section,
        srcClassReference?.isInferred,
      ),
    );
    pureInstanceSetImplementation.filter = classMapping.filter
      ? V1_rawLambdaBuilderWithResolver(
          this.context,
          [],
          classMapping.filter.body,
        )
      : undefined;
    return pureInstanceSetImplementation;
  }

  visit_RootFlatDataClassMapping(
    classMapping: V1_RootFlatDataClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Flat-data class mapping class is missing',
    );
    assertNonNullable(
      classMapping.root,
      'Flat-data class mapping root flag is missing',
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
      ? V1_rawLambdaBuilderWithResolver(
          this.context,
          [],
          classMapping.filter.body,
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
      'Relational class mapping class is missing',
    );
    assertNonNullable(
      classMapping.root,
      'Relational class mapping root flag is missing',
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
      ? V1_processRelationalMappingFilter(classMapping.filter, this.context)
      : undefined;
    return rootRelationalInstanceSetImplementation;
  }

  visit_AggregationAwareClassMapping(
    classMapping: V1_AggregationAwareClassMapping,
  ): SetImplementation {
    assertNonEmptyString(
      classMapping.class,
      'Aggregation-aware class mapping class is missing',
    );
    assertNonNullable(
      classMapping.root,
      'Aggregation-aware class mapping root flag is missing',
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
          new V1_ProtocolToMetaModelClassMappingFirstPassVisitor(
            this.context,
            mapping,
          ),
        ) as InstanceSetImplementation,
      );
    aggragetionAwareInstanceSetImplementation.aggregateSetImplementations =
      classMapping.aggregateSetImplementations.map((setImplementation) =>
        V1_processAggregateContainer(setImplementation, this.context, mapping),
      );
    return aggragetionAwareInstanceSetImplementation;
  }
}
