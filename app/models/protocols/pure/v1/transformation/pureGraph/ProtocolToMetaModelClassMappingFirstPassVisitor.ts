/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import { assertNonEmptyString, assertNonNullable } from 'Utilities/GeneralUtil';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { SetImplementation as MM_SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { OperationSetImplementation as MM_OperationSetImplementation, getClassMappingOperationType as MM_getClassMappingOperationType } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { PureInstanceSetImplementation as MM_PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { OptionalPackageableElementImplicitReference as MM_OptionalPackageableElementImplicitReference } from 'MM/model/packageableElements/PackageableElementReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ClassMappingVisitor } from 'V1/model/packageableElements/mapping/ClassMapping';
import { OperationClassMapping } from 'V1/model/packageableElements/mapping/OperationClassMapping';
import { PureInstanceClassMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PureInstanceClassMapping';
import { getInferredClassMappingId } from 'V1/transformation/pureGraph/MappingBuilderHelper';

export class ProtocolToMetaModelClassMappingFirstPassVisitor implements ClassMappingVisitor<MM_SetImplementation> {
  context: GraphBuilderContext;
  parent: MM_Mapping;

  constructor(context: GraphBuilderContext, parent: MM_Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_OperationClassMapping(classMapping: OperationClassMapping): MM_SetImplementation {
    assertNonEmptyString(classMapping.class, 'Operation class mapping class is missing');
    assertNonNullable(classMapping.root, 'Operation class mapping root flag is missing');
    assertNonNullable(classMapping.operation, 'Operation class mapping operation is missing');
    const targetClass = this.context.resolveClass(classMapping.class);
    return new MM_OperationSetImplementation(getInferredClassMappingId(targetClass.value, classMapping), this.parent, targetClass, classMapping.root, MM_getClassMappingOperationType(classMapping.operation));
  }

  visit_PureInstanceClassMapping(classMapping: PureInstanceClassMapping): MM_SetImplementation {
    assertNonEmptyString(classMapping.class, 'Model-to-model class mapping class is missing');
    assertNonNullable(classMapping.root, 'Model-to-model class mapping root flag is missing');
    const targetClass = this.context.resolveClass(classMapping.class);
    const srcClassReference = classMapping.srcClass ? this.context.resolveClass(classMapping.srcClass) : undefined;
    const pureInstanceSetImplementation = new MM_PureInstanceSetImplementation(getInferredClassMappingId(targetClass.value, classMapping), this.parent, targetClass, classMapping.root, MM_OptionalPackageableElementImplicitReference.create(srcClassReference?.value, classMapping.srcClass, this.context.section, srcClassReference?.isResolvedFromAutoImports));
    pureInstanceSetImplementation.filter = classMapping.filter ? new MM_Lambda([], classMapping.filter.body) : undefined;
    return pureInstanceSetImplementation;
  }
}
