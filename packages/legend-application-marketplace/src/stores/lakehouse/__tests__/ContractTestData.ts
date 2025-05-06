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

export const CREATE_CONTRACT_RESPONSE = {
  dataContracts: [
    {
      dataContract: {
        description: 'test',
        guid: '1',
        version: 1,
        state: 'OPEN_FOR_PRIVILEGE_MANAGER_APPROVAL',
        resource: {
          _type: 'AccessPointGroupReference',
          dataProduct: {
            name: 'TestDataProduct',
            guid: '2',
            accessPoints: [
              {
                name: 'simple',
                guid: '3',
                groups: ['AccessGroup1'],
              },
            ],
            owner: {
              appDirId: 10,
              level: 'DEPLOYMENT',
            },
          },
          accessPointGroup: 'AccessGroup1',
        },
        consumer: {
          _type: 'AdHocTeam',
          users: [
            {
              name: 'user1',
              userType: 'WORKFORCE_USER',
            },
          ],
        },
        createdBy: 'user1',
      },
    },
  ],
};

export const Data_Product = {
  _type: 'dataProduct',
  accessPointGroups: [
    {
      accessPoints: [
        {
          _type: 'lakehouseAccessPoint',
          func: {
            _type: 'lambda',
            body: [
              {
                _type: 'func',
                function: 'limit',
                parameters: [
                  {
                    _type: 'classInstance',
                    type: 'I',
                    value: {
                      path: ['myPackage', 'METADIR'],
                    },
                  },
                  {
                    _type: 'integer',
                    value: 10,
                  },
                ],
              },
            ],
            parameters: [],
          },
          id: 'simple',
          targetEnvironment: 'Snowflake',
        },
      ],
      description: 'testing group',
      id: 'AccessGroup1',
    },
  ],
  description: 'used for data',
  name: 'TestDataProduct',
  package: 'model',
  title: 'Test DataProduct',
};
