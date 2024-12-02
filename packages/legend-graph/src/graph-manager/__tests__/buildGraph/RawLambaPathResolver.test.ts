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

import { test } from '@jest/globals';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import { TEST__checkBuildingResolvedElements } from '../../__test-utils__/GraphManagerTestUtils.js';

const getClassEntity = (enumPath: string): Entity => ({
  classifierPath: 'meta::pure::metamodel::type::Class',
  content: {
    _type: 'class',
    name: 'Person',
    package: 'model',
    properties: [
      {
        multiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        name: 'firstName',
        genericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
      },
    ],
    qualifiedProperties: [
      {
        body: [
          {
            _type: 'func',
            function: 'toString',
            parameters: [
              {
                _type: 'property',
                parameters: [
                  {
                    _type: 'packageableElementPtr',
                    fullPath: enumPath,
                  },
                ],
                property: 'A',
              },
            ],
          },
        ],
        name: 'getEnum',
        parameters: [],
        returnMultiplicity: {
          lowerBound: 1,
          upperBound: 1,
        },
        returnGenericType: {
          rawType: {
            _type: 'packageableType',
            fullPath: 'String',
          },
        },
      },
    ],
  },
  path: 'model::Person',
});

const enumEntity: Entity = {
  classifierPath: 'meta::pure::metamodel::type::Enumeration',
  content: {
    _type: 'Enumeration',
    name: 'MyEnum',
    package: 'model',
    values: [
      {
        value: 'A',
      },
      {
        value: 'B',
      },
    ],
  },
  path: 'model::MyEnum',
};

const sectionEntity: Entity = {
  path: '__internal__::SectionIndex',
  content: {
    _type: 'sectionIndex',
    name: 'SectionIndex',
    package: '__internal__',
    sections: [
      {
        _type: 'importAware',
        elements: ['model::MyEnum', 'model::Person'],
        imports: ['model'],
        parserName: 'Pure',
      },
    ],
  },
  classifierPath: 'meta::pure::metamodel::section::SectionIndex',
};

test(
  unitTest(`Raw lambda in a class's derived property has been resolved`),
  async () => {
    await TEST__checkBuildingResolvedElements(
      [getClassEntity('MyEnum'), enumEntity, sectionEntity],
      [getClassEntity('model::MyEnum'), enumEntity],
    );
  },
);
