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

import { assertNonNullable, assertNonEmptyString, guaranteeType, guaranteeNonNullable } from 'Utilities/GeneralUtil';
import { Log, LOG_EVENT } from 'Utilities/Logger';
import { PropertyMapping as MM_PropertyMapping } from 'MM/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping as MM_PurePropertyMapping } from 'MM/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';
import { InstanceSetImplementation as MM_InstanceSetImplementation } from 'MM/model/packageableElements/mapping/InstanceSetImplementation';
import { PropertyMappingsImplementation as MM_PropertyMappingsImplementation } from 'MM/model/packageableElements/mapping/PropertyMappingsImplementation';
import { EnumerationMapping as MM_EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { SetImplementation as MM_SetImplementation } from 'MM/model/packageableElements/mapping/SetImplementation';
import { Lambda as MM_Lambda } from 'MM/model/valueSpecification/raw/Lambda';
import { Class as MM_Class } from 'MM/model/packageableElements/domain/Class';
import { GraphBuilderContext } from './GraphBuilderContext';
import { PropertyMappingVisitor } from 'V1/model/packageableElements/mapping/PropertyMapping';
import { PurePropertyMapping } from 'V1/model/packageableElements/store/modelToModel/mapping/PurePropertyMapping';

export class ProtocolToMetaModelPropertyMappingVisitor implements PropertyMappingVisitor<MM_PropertyMapping> {
  private context: GraphBuilderContext;
  private immediateParent: MM_PropertyMappingsImplementation; // either root instance set implementation or the immediate embedded parent property mapping (needed for processing embedded property mapping)
  private topParent: MM_InstanceSetImplementation; // root instance set implementation
  private allEnumerationMappings: MM_EnumerationMapping[] = [];

  constructor(context: GraphBuilderContext, immediateParent: MM_PropertyMappingsImplementation, topParent: MM_InstanceSetImplementation, allEnumerationMappings: MM_EnumerationMapping[]) {
    this.context = context;
    this.immediateParent = immediateParent;
    this.topParent = topParent;
    this.allEnumerationMappings = allEnumerationMappings;
  }

  visit_PurePropertyMapping(propertyMapping: PurePropertyMapping): MM_PropertyMapping {
    assertNonNullable(propertyMapping.property, 'Model-to-model property mapping property is missing');
    assertNonEmptyString(propertyMapping.property.class, 'Model-to-model property mapping property class is missing');
    assertNonEmptyString(propertyMapping.property.property, 'Model-to-model property mapping property name is missing');
    assertNonNullable(propertyMapping.transform, 'Model-to-model property mapping transform lambda is missing');
    // NOTE: mapping for derived property is not supported
    const property = this.context.resolveProperty(propertyMapping.property);
    const propertyType = property.value.genericType.value.rawType;
    let targetSetImplementation: MM_SetImplementation | undefined;
    if (propertyType instanceof MM_Class) {
      if (propertyMapping.target) {
        targetSetImplementation = this.topParent.parent.getClassMapping(propertyMapping.target);
      } else {
        /* @MARKER: ACTION ANALYTICS */
        // NOTE: if no there is one non-root class mapping, auto-nominate that as the target set implementation
        const setImplementation = this.topParent.parent.classMappingsByClass(guaranteeType(propertyType, MM_Class))[0];
        targetSetImplementation = guaranteeNonNullable(setImplementation, `Can't find any class mapping for class '${propertyType.path}' in mapping '${this.topParent.parent.path}'`);
      }
    }
    const purePropertyMapping = new MM_PurePropertyMapping(this.topParent, property, new MM_Lambda([], propertyMapping.transform.body), this.topParent, targetSetImplementation, propertyMapping.explodeProperty);
    if (propertyMapping.enumMappingId) {
      const enumerationMapping = this.allEnumerationMappings.find(enumerationMapping => enumerationMapping.id.value === propertyMapping.enumMappingId);
      if (!enumerationMapping) {
        // TODO: Since we don't support `includedMappings`, this will throw errors, but right now we can just make it undefined.
        Log.debug(LOG_EVENT.GRAPH_PROBLEM, `Can't find enumeration mapping with ID '${propertyMapping.enumMappingId}' in mapping '${this.topParent.parent.path}' (perhaps because we haven't supported included mappings)`);
      }
      purePropertyMapping.transformer = enumerationMapping;
    }
    return purePropertyMapping;
  }
}
