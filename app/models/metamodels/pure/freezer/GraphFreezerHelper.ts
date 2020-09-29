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

import { UnsupportedOperationError } from 'Utilities/GeneralUtil';
import { Property } from 'MM/model/packageableElements/domain/Property';
import { DerivedProperty } from 'MM/model/packageableElements/domain/DerivedProperty';
import { RelationshipView } from 'MM/model/packageableElements/diagram/RelationshipView';
import { EnumerationMapping } from 'MM/model/packageableElements/mapping/EnumerationMapping';
import { MappingTest } from 'MM/model/packageableElements/mapping/MappingTest';
import { MappingTestAssert } from 'MM/model/packageableElements/mapping/MappingTestAssert';
import { ExpectedOutputMappingTestAssert } from 'MM/model/packageableElements/mapping/ExpectedOutputMappingTestAssert';
import { Runtime, RuntimePointer, EngineRuntime } from 'MM/model/packageableElements/runtime/Runtime';
import { ConnectionVisitor } from 'MM/model/packageableElements/connection/Connection';
import { Unit } from 'MM/model/packageableElements/domain/Measure';

/**
 * Since we cannot freeze observable object, we have to use a try catch here.
 * For project that uses metamodels but not `mobx`, maybe they can take advantage of this
 * The error message will be something like `Error: [mobx] Observable arrays cannot be frozen`
 * Notice that we have to call `Object.freeze(arr)` because only that will prevent modifying the array
 */
export const freezeArray = <T>(arr: T[], freezeFn?: (item: T) => void): void => {
  try { Object.freeze(arr) } catch { /* do nothing */ }
  if (freezeFn) { arr.forEach(freezeFn) }
};

export const freeze = (item: unknown): void => { Object.freeze(item) };

export const freezeUnit = (unit: Unit): void => {
  freeze(unit.conversionFunction);
};

export const freezeProperty = (property: Property): void => {
  freeze(property);
  freeze(property.multiplicity);
  freeze(property.genericType);
  freezeArray(property.stereotypes, freeze);
  freezeArray(property.taggedValues, tagValue => {
    freeze(tagValue);
    freeze(tagValue.tag);
  });
};

export const freezeDerivedProperty = (derivedProperty: DerivedProperty): void => {
  freeze(derivedProperty);
  freeze(derivedProperty.body);
  freeze(derivedProperty.parameters);
  freeze(derivedProperty.multiplicity);
  freeze(derivedProperty.genericType);
  freezeArray(derivedProperty.stereotypes, freeze);
  freezeArray(derivedProperty.taggedValues, tagValue => {
    freeze(tagValue);
    freeze(tagValue.tag);
  });
};

export const freezeRelationshipView = (relationshipView: RelationshipView): void => {
  freeze(relationshipView);
  freeze(relationshipView.from);
  freeze(relationshipView.to);
  freezeArray(relationshipView.path, freeze);
};

export const freezeRuntime = (runtime: Runtime, connectionFreezer: ConnectionVisitor<void>): void => {
  freeze(runtime);
  if (runtime instanceof RuntimePointer) {
    /* do nothing */
  } else if (runtime instanceof EngineRuntime) {
    freezeArray(runtime.mappings);
    freezeArray(runtime.connections, storeConnections => {
      freeze(storeConnections);
      freezeArray(storeConnections.storeConnections, identifiedConnection => identifiedConnection.connection.accept_ConnectionVisitor(connectionFreezer));
    });
  } else {
    throw new UnsupportedOperationError();
  }
};

export const freezeEnumerationMapping = (enumerationMapping: EnumerationMapping): void => {
  freeze(enumerationMapping);
  freeze(enumerationMapping.id);
  freezeArray(enumerationMapping.enumValueMappings, enumValueMapping => {
    freeze(enumValueMapping);
    freezeArray(enumValueMapping.sourceValues, freeze);
  });
};

export const freezeMappingTestAssert = (mappingTestAssert: MappingTestAssert): void => {
  freeze(mappingTestAssert);
  if (mappingTestAssert instanceof ExpectedOutputMappingTestAssert) {
    /* do nothing */
  } else {
    throw new UnsupportedOperationError();
  }
};

export const freezeMappingTest = (mappingTest: MappingTest): void => {
  freeze(mappingTest);
  freeze(mappingTest.query);
  freezeMappingTestAssert(mappingTest.assert);
  freezeArray(mappingTest.inputData, freeze);
};
