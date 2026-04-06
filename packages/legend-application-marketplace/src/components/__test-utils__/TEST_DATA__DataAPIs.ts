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

import type { PlainObject } from '@finos/legend-shared';

// Minimal V1_Service plain-object shape used by `getServicesDetailsFromCache`
export const mockServices: PlainObject[] = [
  {
    _type: 'service',
    name: 'service1',
    package: 'test::services',
    pattern: '/test/alloy/service1',
    documentation: 'First test service description',
    owners: [],
    ownership: {
      _type: 'userListOwnership',
      users: ['alice@example.com', 'bob@example.com'],
    },
    autoActivateUpdates: false,
    execution: { _type: 'pureExecution' },
    stereotypes: [],
    taggedValues: [],
    testSuites: [],
    postValidations: [],
  },
  {
    _type: 'service',
    name: 'service2',
    package: 'test::services',
    pattern: '/test/alloy/service2',
    documentation: 'Second test service description',
    owners: [],
    ownership: {
      _type: 'userListOwnership',
      users: ['charlie@example.com'],
    },
    autoActivateUpdates: false,
    execution: { _type: 'pureExecution' },
    stereotypes: [],
    taggedValues: [],
    testSuites: [],
    postValidations: [],
  },
  {
    _type: 'service',
    name: 'deployed',
    package: 'test::services',
    pattern: '/test/alloy/deployed',
    documentation: 'Deployment-owned service',
    owners: [],
    ownership: {
      _type: 'deploymentOwnership',
      identifier: 'deploy-id-42',
    },
    autoActivateUpdates: false,
    execution: { _type: 'pureExecution' },
    stereotypes: [],
    taggedValues: [],
    testSuites: [],
    postValidations: [],
  },
  {
    _type: 'service',
    name: 'legacy',
    package: 'test::services',
    pattern: '/test/alloy/legacy',
    documentation: 'Legacy owners service',
    owners: ['linnag', 'naraab'],
    autoActivateUpdates: true,
    stereotypes: [],
    taggedValues: [],
    postValidations: [],
  },
];
