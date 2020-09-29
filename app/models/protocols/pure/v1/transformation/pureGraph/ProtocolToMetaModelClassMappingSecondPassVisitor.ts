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

import { assertType, isNonNullable, guaranteeType } from 'Utilities/GeneralUtil';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { Mapping as MM_Mapping } from 'MM/model/packageableElements/mapping/Mapping';
import { PurePropertyMapping as MM_PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { OperationSetImplementation as MM_OperationSetImplementation } from 'MM/model/packageableElements/mapping/OperationSetImplementation';
import { SetImplementationContainer as MM_SetImplementationContainer } from 'MM/model/packageableElements/mapping/SetImplementationContainer';
import { PureInstanceSetImplementation as MM_PureInstanceSetImplementation } from 'MM/model/packageableElements/store/modelToModel/mapping/PureInstanceSetImplementation';
import { SetImplementationExplicitReference as MM_SetImplementationExplicitReference } from 'MM/model/packageableElements/mapping/SetImplementationReference';
import { GraphBuilderContext } from './GraphBuilderContext';
import { ClassMappingVisitor } from 'V1/model/packageableElements/mapping/ClassMapping';
import { OperationClassMapping } from 'V1/model/packageableElements/mapping/OperationClassMapping';
import { PureInstanceClassMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PureInstanceClassMapping';
import { ProtocolToMetaModelPropertyMappingVisitor } from './ProtocolToMetaModelPropertyMappingVisitor';
import { getInferredClassMappingId } from './MappingBuilderHelper';

export class ProtocolToMetaModelClassMappingSecondPassVisitor implements ClassMappingVisitor<void> {
  context: GraphBuilderContext;
  parent: MM_Mapping;

  constructor(context: GraphBuilderContext, parent: MM_Mapping) {
    this.context = context;
    this.parent = parent;
  }

  visit_OperationClassMapping(classMapping: OperationClassMapping): void {
    const id = getInferredClassMappingId(this.context.resolveClass(classMapping.class).value, classMapping).value;
    const operationSetImplementation = this.parent.getClassMapping(id);
    assertType(operationSetImplementation, MM_OperationSetImplementation, `Class mapping '${id}' is not of type operation set implementation`);
    operationSetImplementation.parameters = classMapping.parameters
      .map(parameter => {
        const setImplementation = this.parent.allClassMappings.find(cm => cm.id.value === parameter);
        if (!setImplementation) {
          // TODO: we will get these cases sometimes since we haven't supported includedMappings
          Log.debug(LOG_EVENT.GRAPH_PROBLEM, `Can't find class mapping of ID '${parameter}' in mapping '${this.parent.path}' (perhaps because we haven't supported included mappings)`);
          return undefined;
        }
        return new MM_SetImplementationContainer(MM_SetImplementationExplicitReference.create(setImplementation));
      })
      .filter(isNonNullable);
  }

  visit_PureInstanceClassMapping(classMapping: PureInstanceClassMapping): void {
    const pureInstanceSetImplementation = guaranteeType(this.parent.getClassMapping(getInferredClassMappingId(this.context.resolveClass(classMapping.class).value, classMapping).value), MM_PureInstanceSetImplementation);
    // NOTE: we have to process property mappings here instead of in the first pass like the backend because we actually resolve `target` and `source`
    // at this point instead of just passing in the IDs. This means we have to go through the first pass to create basic mapping elements first
    // before we can finally use/resolve them in this pass
    pureInstanceSetImplementation.propertyMappings = classMapping.propertyMappings.map(propertyMapping => propertyMapping.accept_PropertyMappingVisitor(new ProtocolToMetaModelPropertyMappingVisitor(this.context, pureInstanceSetImplementation, pureInstanceSetImplementation, this.parent.enumerationMappings))) as MM_PurePropertyMapping[];
  }
}
