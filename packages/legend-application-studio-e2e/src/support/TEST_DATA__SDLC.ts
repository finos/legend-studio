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

/**
 * The SDLC side of the workspace every test opens: one project, holding one
 * user workspace, holding a small model. Shapes follow the SDLC server's
 * JSON (see `@finos/legend-server-sdlc`).
 */

export interface Entity {
  path: string;
  classifierPath: string;
  content: Record<string, unknown>;
}

export const TEST_DATA__CurrentUser = {
  userId: 'e2e-user',
  name: 'E2E User',
};

export const TEST_PROJECT_ID = 'E2E-1';
export const TEST_WORKSPACE_ID = 'e2e-workspace';

export const TEST_DATA__Project = {
  projectId: TEST_PROJECT_ID,
  name: 'e2e-test-project',
  description: 'Project behind the Legend Studio e2e tests',
  tags: [],
  webUrl: 'http://localhost/e2e-test-project',
};

export const TEST_DATA__ProjectConfiguration = {
  projectStructureVersion: { version: 13, extensionVersion: 1 },
  projectId: TEST_PROJECT_ID,
  groupId: 'org.finos.legend.test',
  artifactId: 'legend-studio-e2e',
  projectDependencies: [],
  metamodelDependencies: [],
};

export const TEST_DATA__LatestProjectStructureVersion = {
  version: 13,
  extensionVersion: 1,
};

const type = (fullPath: string): Record<string, unknown> => ({
  rawType: { _type: 'packageableType', fullPath },
});

const ONE = { lowerBound: 1, upperBound: 1 };
const ZERO_ONE = { lowerBound: 0, upperBound: 1 };
const ZERO_MANY = { lowerBound: 0 };

/**
 * The model the workspace starts with, as its grammar reads:
 *
 * ```pure
 * Enum model::IncType { LLC, CORP }
 *
 * Class model::Person
 * {
 *   firstName: String[1];
 *   lastName: String[1];
 *   age: Integer[0..1];
 * }
 *
 * Class model::Firm
 * {
 *   legalName: String[1];
 *   incType: model::IncType[1];
 *   employees: model::Person[*];
 * }
 * ```
 */
export const TEST_DATA__Entities: Entity[] = [
  {
    path: 'model::IncType',
    classifierPath: 'meta::pure::metamodel::type::Enumeration',
    content: {
      _type: 'Enumeration',
      name: 'IncType',
      package: 'model',
      values: [{ value: 'LLC' }, { value: 'CORP' }],
    },
  },
  {
    path: 'model::Person',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        { name: 'firstName', multiplicity: ONE, genericType: type('String') },
        { name: 'lastName', multiplicity: ONE, genericType: type('String') },
        { name: 'age', multiplicity: ZERO_ONE, genericType: type('Integer') },
      ],
    },
  },
  {
    path: 'model::Firm',
    classifierPath: 'meta::pure::metamodel::type::Class',
    content: {
      _type: 'class',
      name: 'Firm',
      package: 'model',
      properties: [
        { name: 'legalName', multiplicity: ONE, genericType: type('String') },
        {
          name: 'incType',
          multiplicity: ONE,
          genericType: type('model::IncType'),
        },
        {
          name: 'employees',
          multiplicity: ZERO_MANY,
          genericType: type('model::Person'),
        },
      ],
    },
  },
];
