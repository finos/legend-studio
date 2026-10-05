/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { test, describe, expect } from '@jest/globals';
import { isObservableProp } from 'mobx';
import { unitTest } from '@finos/legend-shared/test';
import { observe_EngineRuntime } from '../DSL_Mapping_ObserverHelper.js';
import { ObserverContext } from '../CoreObserverHelper.js';
import {
  EngineRuntime,
  LakehouseRuntime,
  LakehouseSingleStoreRuntime,
} from '../../../../graph/metamodel/pure/packageableElements/runtime/Runtime.js';
import { ConnectionPointer } from '../../../../graph/metamodel/pure/packageableElements/connection/Connection.js';
import { JsonModelConnection } from '../../../../graph/metamodel/pure/packageableElements/store/modelToModel/connection/JsonModelConnection.js';
import { PackageableConnection } from '../../../../graph/metamodel/pure/packageableElements/connection/PackageableConnection.js';
import { ModelStore } from '../../../../graph/metamodel/pure/packageableElements/store/modelToModel/model/ModelStore.js';
import { Class } from '../../../../graph/metamodel/pure/packageableElements/domain/Class.js';
import { PackageableElementExplicitReference } from '../../../../graph/metamodel/pure/packageableElements/PackageableElementReference.js';

const context = new ObserverContext([]);

const buildConnectionPointer = (): ConnectionPointer => {
  const _class = new Class('TestClass');
  const jsonModelConnection = new JsonModelConnection(
    PackageableElementExplicitReference.create(ModelStore.INSTANCE),
    PackageableElementExplicitReference.create(_class),
  );
  const packageableConnection = new PackageableConnection('TestConnection');
  packageableConnection.connectionValue = jsonModelConnection;
  return new ConnectionPointer(
    PackageableElementExplicitReference.create(packageableConnection),
  );
};

describe(unitTest('observe_EngineRuntime for Lakehouse runtimes'), () => {
  test(
    unitTest(
      'makes environment, warehouse, and connectionPointer observable on a LakehouseRuntime with a connection pointer',
    ),
    () => {
      const connectionPointer = buildConnectionPointer();
      const runtime = new LakehouseRuntime('dev01', 'MY_WH', connectionPointer);

      expect(() => observe_EngineRuntime(runtime, context)).not.toThrow();

      expect(isObservableProp(runtime, 'environment')).toBe(true);
      expect(isObservableProp(runtime, 'warehouse')).toBe(true);
      expect(isObservableProp(runtime, 'connectionPointer')).toBe(true);
      // the connection pointer itself should have been observed too (its
      // hashCode getter becomes a computed property, accessible without throwing)
      expect(() => connectionPointer.hashCode).not.toThrow();
    },
  );

  test(
    unitTest(
      'does not throw and still observes environment/warehouse for a LakehouseRuntime with no connection pointer',
    ),
    () => {
      const runtime = new LakehouseRuntime('dev01', 'MY_WH');

      expect(() => observe_EngineRuntime(runtime, context)).not.toThrow();

      expect(isObservableProp(runtime, 'environment')).toBe(true);
      expect(isObservableProp(runtime, 'warehouse')).toBe(true);
      expect(runtime.connectionPointer).toBeUndefined();
    },
  );

  test(
    unitTest(
      'makes only environment observable on a LakehouseSingleStoreRuntime',
    ),
    () => {
      const runtime = new LakehouseSingleStoreRuntime('dev01');

      expect(() => observe_EngineRuntime(runtime, context)).not.toThrow();

      expect(isObservableProp(runtime, 'environment')).toBe(true);
      // LakehouseSingleStoreRuntime has no connectionPointer field at all
      expect('connectionPointer' in runtime).toBe(false);
    },
  );

  test(
    unitTest(
      'does not throw and does not add Lakehouse-specific observables for a plain EngineRuntime',
    ),
    () => {
      const runtime = new EngineRuntime();

      expect(() => observe_EngineRuntime(runtime, context)).not.toThrow();

      expect(isObservableProp(runtime, 'environment')).toBe(false);
      expect(isObservableProp(runtime, 'warehouse')).toBe(false);
    },
  );
});
