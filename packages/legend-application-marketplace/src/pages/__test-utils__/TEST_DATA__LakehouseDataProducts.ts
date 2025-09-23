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

import {
  type V1_EntitlementsDataProductDetailsResponse,
  CORE_PURE_PATH,
  V1_AppDirLevel,
  V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import type { Entity } from '@finos/legend-storage';

export const mockEntitlementsSDLCDataProduct: V1_EntitlementsDataProductDetailsResponse =
  {
    dataProducts: [
      {
        id: 'MOCK_SDLC_DATAPRODUCT',
        deploymentId: 11111,
        title: 'Mock SDLC Data Product',
        description:
          'Comprehensive customer analytics data for business intelligence and reporting',
        origin: {
          type: 'SdlcDeployment',
          group: 'com.example.analytics',
          artifact: 'customer-analytics',
          version: '1.2.0',
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'production-analytics',
          type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        },
        dataProduct: {
          name: 'MOCK_SDLC_DATAPRODUCT',
          accessPoints: [
            {
              name: 'customer_demographics',
              groups: ['GROUP1'],
            },
          ],
          accessPointGroupStereotypeMappings: [],
          owner: {
            appDirId: 12345,
            level: V1_AppDirLevel.DEPLOYMENT,
          },
        },
      },
    ],
  };

export const mockSDLCDataProductEntitiesResponse: {
  artifactId: string;
  entity: Entity;
  groupId: string;
  versionId: string;
  versionedEntity: boolean;
}[] = [
  {
    artifactId: 'lakehouse-dataproduct',
    groupId: 'com.test',
    versionId: '1.2.0',
    versionedEntity: false,
    entity: {
      path: 'com::test::MockSDLCDataProduct',
      classifierPath: CORE_PURE_PATH.DATA_PRODUCT,
      content: {
        _type: 'dataProduct',
        package: 'test',
        name: 'Mock_SDLC_DataProduct',
        title: 'Mock SDLC Data Product',
        description:
          'Comprehensive customer analytics data for business intelligence and reporting',
        accessPointGroups: [
          {
            _type: 'defaultAccessPointGroup',
            id: 'GROUP1',
            description: 'Test access point group',
            accessPoints: [
              {
                _type: 'lakehouseAccessPoint',
                id: 'customer_demographics',
                description: 'Customer demographics data access point',
                func: {
                  _type: 'lambda',
                  body: [
                    {
                      _type: 'classInstance',
                      type: 'I',
                      value: {
                        metadata: false,
                        path: ['test', 'IngestDefinition'],
                      },
                    },
                  ],
                  parameters: [],
                },
              },
            ],
          },
        ],
        supportInfo: {
          documentation: {
            label: 'Documentation Link Label',
            url: 'https://example.com/docs',
          },
          website: {
            url: 'https://example-website.com',
          },
          emails: [
            {
              title: 'Person 1 Email',
              address: 'person1@example.com',
            },
            {
              title: 'Person 2 Email',
              address: 'person2@example.com',
            },
          ],
        },
      },
    },
  },
];

export const mockEntitlementsAdHocDataProduct: V1_EntitlementsDataProductDetailsResponse =
  {
    dataProducts: [
      {
        id: 'MOCK_ADHOC_DATAPRODUCT',
        deploymentId: 22222,
        title: 'Mock Ad-Hoc Data Product',
        description:
          'Flexible and dynamic data product for ad hoc analysis and reporting',
        origin: {
          type: 'AdHocDeployment',
          definition:
            "###Lakehouse\nIngest test::IngestDefinition Snapshot<CSV> owner=AppDir(production='297484')\n[\nTEST_TABLE(\nint_val: Int,\nvarchar_val: Varchar(500)\n)\npk=[ int_val ];\n]\n\n###DataProduct test::Mock_AdHoc_DataProduct\n{\ntitle: 'Mock Ad-Hoc Data Product'\naccessPoints:\n[\nGROUP1[\nTEST_VIEW: *LH(Snowflake, |#I{test::Ingest.TEST_TABLE}#)\n]\n]\n}",
        },
        lakehouseEnvironment: {
          producerEnvironmentName: 'production-analytics',
          type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
        },
        dataProduct: {
          name: 'MOCK_ADHOC_DATAPRODUCT',
          accessPoints: [
            {
              name: 'TEST_VIEW',
              groups: ['GROUP1'],
            },
          ],
          accessPointGroupStereotypeMappings: [],
          owner: {
            appDirId: 22222,
            level: V1_AppDirLevel.DEPLOYMENT,
          },
        },
      },
    ],
  };

export const mockAdHocDataProductPMCD = {
  _type: 'data',
  elements: [
    {
      _type: 'ingestDefinition',
      package: 'test',
      name: 'IngestDefinition',
      owner: {
        _type: 'appDir',
        production: {
          appDirId: 22222,
          level: 'DEPLOYMENT',
        },
      },
    },
    {
      _type: 'dataProduct',
      package: 'test',
      name: 'Mock_AdHoc_DataProduct',
      title: 'Mock Ad-Hoc Data Product',
      description:
        'Flexible and dynamic data product for ad hoc analysis and reporting',
      accessPointGroups: [
        {
          _type: 'defaultAccessPointGroup',
          id: 'GROUP1',
          description: 'Test ad-hoc access point group',
          accessPoints: [
            {
              _type: 'lakehouseAccessPoint',
              id: 'test_view',
              func: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'classInstance',
                    type: 'I',
                    value: {
                      metadata: false,
                      path: ['test', 'IngestDefinition'],
                    },
                  },
                ],
                parameters: [],
              },
            },
          ],
        },
      ],
    },
  ],
};
