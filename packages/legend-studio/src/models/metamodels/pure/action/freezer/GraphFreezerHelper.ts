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

import { UnsupportedOperationError } from '@finos/legend-studio-shared';
import type { Property } from '../../model/packageableElements/domain/Property';
import type { DerivedProperty } from '../../model/packageableElements/domain/DerivedProperty';
import type { FlatDataSection } from '../../model/packageableElements/store/flatData/model/FlatDataSection';
import type { RelationshipView } from '../../model/packageableElements/diagram/RelationshipView';
import type { ServiceExecution } from '../../model/packageableElements/service/ServiceExecution';
import {
  PureSingleExecution,
  PureMultiExecution,
} from '../../model/packageableElements/service/ServiceExecution';
import type { ServiceTest } from '../../model/packageableElements/service/ServiceTest';
import {
  SingleExecutionTest,
  MultiExecutionTest,
} from '../../model/packageableElements/service/ServiceTest';
import type { EnumerationMapping } from '../../model/packageableElements/mapping/EnumerationMapping';
import type { MappingTest } from '../../model/packageableElements/mapping/MappingTest';
import type { MappingTestAssert } from '../../model/packageableElements/mapping/MappingTestAssert';
import type { Runtime } from '../../model/packageableElements/runtime/Runtime';
import {
  RuntimePointer,
  EngineRuntime,
} from '../../model/packageableElements/runtime/Runtime';
import type { ConnectionVisitor } from '../../model/packageableElements/connection/Connection';
import type { FlatDataDataType } from '../../model/packageableElements/store/flatData/model/FlatDataDataType';
import { FlatDataRecordType } from '../../model/packageableElements/store/flatData/model/FlatDataDataType';
import type { Unit } from '../../model/packageableElements/domain/Measure';
import type { Schema } from '../../model/packageableElements/store/relational/model/Schema';
import type { Table } from '../../model/packageableElements/store/relational/model/Table';
import type { View } from '../../model/packageableElements/store/relational/model/View';
import type { Join } from '../../model/packageableElements/store/relational/model/Join';
import type { AuthenticationStrategy } from '../../model/packageableElements/store/relational/connection/AuthenticationStrategy';
import type { DatasourceSpecification } from '../../model/packageableElements/store/relational/connection/DatasourceSpecification';

/**
 * Since we cannot freeze observable object, we have to use a try catch here.
 * For project that uses metamodels but not `mobx`, maybe they can take advantage of this
 * The error message will be something like `Error: [mobx] Observable arrays cannot be frozen`
 * Notice that we have to call `Object.freeze(arr)` because only that will prevent modifying the array
 */
export const freezeArray = <T>(
  arr: T[],
  freezeFn?: (item: T) => void,
): void => {
  try {
    Object.freeze(arr);
  } catch {
    /* do nothing */
  }
  if (freezeFn) {
    arr.forEach(freezeFn);
  }
};

export const freeze = (item: unknown): void => {
  Object.freeze(item);
};

export const freezeUnit = (unit: Unit): void => {
  freeze(unit.conversionFunction);
};

export const freezeProperty = (property: Property): void => {
  freeze(property);
  freeze(property.multiplicity);
  freeze(property.genericType);
  freezeArray(property.stereotypes, freeze);
  freezeArray(property.taggedValues, (tagValue) => {
    freeze(tagValue);
    freeze(tagValue.tag);
  });
};

export const freezeDerivedProperty = (
  derivedProperty: DerivedProperty,
): void => {
  freeze(derivedProperty);
  freeze(derivedProperty.body);
  freeze(derivedProperty.parameters);
  freeze(derivedProperty.multiplicity);
  freeze(derivedProperty.genericType);
  freezeArray(derivedProperty.stereotypes, freeze);
  freezeArray(derivedProperty.taggedValues, (tagValue) => {
    freeze(tagValue);
    freeze(tagValue.tag);
  });
};

export const freezeFlatDataDataType = (
  flatDataDataType: FlatDataDataType,
): void => {
  freeze(flatDataDataType);
  if (flatDataDataType instanceof FlatDataRecordType) {
    freezeArray(flatDataDataType.fields, (field) => {
      freeze(field);
      freezeFlatDataDataType(field.flatDataDataType);
    });
  }
};

export const freezeTable = (table: Table): void => {
  freeze(table);
  freezeArray(table.columns);
  freezeArray(table.primaryKey);
};

export const freezeView = (view: View): void => {
  freeze(view);
  freezeArray(view.columns);
  freezeArray(view.columnMappings);
  freezeArray(view.primaryKey);
};

export const freezeSchema = (schema: Schema): void => {
  freeze(schema);
  freezeArray(schema.tables, freezeTable);
  freezeArray(schema.views, freezeView);
};

export const freezeJoin = (join: Join): void => {
  freeze(join);
  freeze(join.operation);
};

export const freezeFlatDataSection = (section: FlatDataSection): void => {
  freeze(section);
  freezeArray(section.sectionProperties, freeze);
  if (section.recordType) {
    freezeFlatDataDataType(section.recordType);
  }
};

export const freezeRelationshipView = (
  relationshipView: RelationshipView,
): void => {
  freeze(relationshipView);
  freeze(relationshipView.from);
  freeze(relationshipView.to);
  freezeArray(relationshipView.path, freeze);
};

export const freezeRuntime = (
  runtime: Runtime,
  connectionFreezer: ConnectionVisitor<void>,
): void => {
  freeze(runtime);
  if (runtime instanceof RuntimePointer) {
    /* do nothing */
  } else if (runtime instanceof EngineRuntime) {
    freezeArray(runtime.mappings);
    freezeArray(runtime.connections, (storeConnections) => {
      freeze(storeConnections);
      freezeArray(storeConnections.storeConnections, (identifiedConnection) =>
        identifiedConnection.connection.accept_ConnectionVisitor(
          connectionFreezer,
        ),
      );
    });
  } else {
    throw new UnsupportedOperationError();
  }
};

export const freezeServiceExecution = (
  serviceExecution: ServiceExecution,
  connectionFreezer: ConnectionVisitor<void>,
): void => {
  freeze(serviceExecution);
  if (serviceExecution instanceof PureSingleExecution) {
    freeze(serviceExecution.func);
    freezeRuntime(serviceExecution.runtime, connectionFreezer);
  } else if (serviceExecution instanceof PureMultiExecution) {
    freeze(serviceExecution.func);
    freezeArray(
      serviceExecution.executionParameters,
      (keyedExecutionParameter) => {
        freeze(keyedExecutionParameter);
        freezeRuntime(keyedExecutionParameter.runtime, connectionFreezer);
      },
    );
  } else {
    throw new UnsupportedOperationError();
  }
};

export const freezeServiceTest = (serviceTest: ServiceTest): void => {
  freeze(serviceTest);
  if (serviceTest instanceof SingleExecutionTest) {
    freezeArray(serviceTest.asserts, (assert) => {
      freeze(assert);
      freeze(assert.assert);
      freezeArray(assert.parameterValues, freeze);
    });
  } else if (serviceTest instanceof MultiExecutionTest) {
    freezeArray(serviceTest.tests, (test) => {
      freeze(test);
      freezeArray(test.asserts, (assert) => {
        freeze(assert);
        freeze(assert.assert);
        freezeArray(assert.parameterValues, freeze);
      });
    });
  } else {
    throw new UnsupportedOperationError();
  }
};

export const freezeEnumerationMapping = (
  enumerationMapping: EnumerationMapping,
): void => {
  freeze(enumerationMapping);
  freeze(enumerationMapping.id);
  freezeArray(enumerationMapping.enumValueMappings, (enumValueMapping) => {
    freeze(enumValueMapping);
    freezeArray(enumValueMapping.sourceValues, freeze);
  });
};

export const freezeMappingTestAssert = (
  mappingTestAssert: MappingTestAssert,
): void => {
  freeze(mappingTestAssert);
  // TODO
};

export const freezeMappingTest = (mappingTest: MappingTest): void => {
  freeze(mappingTest);
  freeze(mappingTest.query);
  freezeMappingTestAssert(mappingTest.assert);
  freezeArray(mappingTest.inputData, freeze);
};

export const freezeAuthenticationStrategy = (
  auth: AuthenticationStrategy,
): void => {
  freeze(auth);
  // TODO
};

export const freezeDatasourceSpecification = (
  metamodel: DatasourceSpecification,
): void => {
  freeze(metamodel);
  // TODO
};
