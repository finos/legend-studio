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

import { test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { Class } from '../metamodel/pure/packageableElements/domain/Class.js';
import { GenericType } from '../metamodel/pure/packageableElements/domain/GenericType.js';
import { PackageableElementExplicitReference } from '../metamodel/pure/packageableElements/PackageableElementReference.js';

test(unitTest('Metamodel ids are unique and stable'), () => {
  const _class = new Class('Person');
  const reference1 = PackageableElementExplicitReference.create(_class);
  const reference2 = PackageableElementExplicitReference.create(_class);
  const genericType = new GenericType(_class);

  const ids = [
    _class._UUID,
    reference1._UUID,
    reference2._UUID,
    genericType._UUID,
  ];
  expect(new Set(ids).size).toBe(ids.length);
  expect(_class._UUID).toBe(ids[0]);
  expect(reference1._UUID).toBe(ids[1]);
  expect(genericType._UUID).toBe(ids[3]);
});

test(unitTest('Metamodel ids are only created when read'), () => {
  const _class = new Class('Person');
  const reference = PackageableElementExplicitReference.create(_class);

  // building a graph creates millions of references whose ids are never read
  expect(reference._lazyUUID).toBeUndefined();
  expect(_class._lazyUUID).toBeUndefined();

  const id = reference._UUID;
  expect(reference._lazyUUID).toBe(id);
  expect(_class._lazyUUID).toBeUndefined();
});
