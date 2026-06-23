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

import { test, expect, describe } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { V1_ModelJoinAssociationMapping } from '../model/packageableElements/mapping/modelJoin/V1_ModelJoinAssociationMapping.js';
import { serialize, deserialize } from 'serializr';

describe('V1_ModelJoinAssociationMapping', () => {
  test(unitTest('can be instantiated with correct defaults'), () => {
    const mapping = new V1_ModelJoinAssociationMapping();
    expect(mapping).toBeDefined();
    expect(mapping.stores).toEqual([]);
    expect(mapping.id).toBeUndefined();
  });

  test(unitTest('hashCode includes joinCondition'), () => {
    const mapping = new V1_ModelJoinAssociationMapping();
    mapping.association = { path: 'test::MyAssociation' } as any;
    mapping.joinCondition = {
      hashCode: 'test-lambda-hash',
    } as any;
    const hash = mapping.hashCode;
    expect(hash).toBeDefined();
    expect(hash.length).toBeGreaterThan(0);
  });
});
