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
  type V1_DataProduct,
  V1_AppDirLevel,
  V1_dataProductModelSchema,
  type V1_EntitlementsDataProductDetails,
  V1_EntitlementsDataProductDetailsModelSchema,
  V1_EntitlementsLakehouseEnvironmentType,
} from '@finos/legend-graph';
import { type StoredFileGeneration } from '@finos/legend-storage';
import { deserialize } from 'serializr';

export const mockEntitlementsSDLCDataProduct: V1_EntitlementsDataProductDetails =
  deserialize(V1_EntitlementsDataProductDetailsModelSchema, {
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
  });

export const mockSDLCDataProduct: V1_DataProduct = deserialize(
  V1_dataProductModelSchema,
  {
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
        title: 'Main Group Test',
        description: 'Test access point group',
        accessPoints: [
          {
            _type: 'lakehouseAccessPoint',
            id: 'customer_demographics',
            title: 'Customer Demographics',
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
);

export const mockEntitlementsSDLCDataProductNoSupportInfo: V1_EntitlementsDataProductDetails =
  deserialize(V1_EntitlementsDataProductDetailsModelSchema, {
    id: 'MOCK_SDLC_DATAPRODUCT',
    deploymentId: 11111,
    title: 'Mock SDLC Data Product',
    description:
      'Comprehensive customer analytics data for business intelligence and reporting',
    origin: {
      type: 'SdlcDeployment',
      group: 'com.example.analytics',
      artifact: 'customer-analytics-no-support-info',
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
  });

export const mockSDLCDataProductNoSupportInfo: V1_DataProduct = deserialize(
  V1_dataProductModelSchema,
  {
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
  },
);

export const mockEntitlementsEnterpriseDataProduct: V1_EntitlementsDataProductDetails =
  deserialize(V1_EntitlementsDataProductDetailsModelSchema, {
    id: 'MOCK_ENTERPRISE_DATAPRODUCT',
    deploymentId: 33333,
    title: 'Mock Enterprise Data Product',
    description:
      'Robust and secure data product for enterprise-wide analytics and reporting',
    origin: {
      type: 'SdlcDeployment',
      group: 'com.example.analytics',
      artifact: 'enterprise-data-product',
      version: '1.0.0',
    },
    lakehouseEnvironment: {
      producerEnvironmentName: 'production-analytics',
      type: V1_EntitlementsLakehouseEnvironmentType.PRODUCTION,
    },
    dataProduct: {
      name: 'MOCK_ENTERPRISE_DATAPRODUCT',
      accessPoints: [
        {
          name: 'enterprise_data',
          groups: ['ENTERPRISE_GROUP'],
        },
      ],
      accessPointGroupStereotypeMappings: [],
      owner: {
        appDirId: 33333,
        level: V1_AppDirLevel.DEPLOYMENT,
      },
    },
  });

export const mockEnterpriseDataProduct: V1_DataProduct = deserialize(
  V1_dataProductModelSchema,
  {
    _type: 'dataProduct',
    package: 'test',
    name: 'Mock_Enterprise_DataProduct',
    title: 'Mock Enterprise Data Product',
    description:
      'Robust and secure data product for enterprise-wide analytics and reporting',
    accessPointGroups: [
      {
        _type: 'defaultAccessPointGroup',
        id: 'ENTERPRISE_GROUP',
        description: 'Test enterprise access point group',
        stereotypes: [
          {
            profile: 'test::profile::EnterpriseDataProduct',
            value: 'enterprise',
          },
        ],
        accessPoints: [
          {
            _type: 'lakehouseAccessPoint',
            id: 'enterprise_data',
            description: 'Enterprise data access point',
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
);

export const mockEntitlementsAdHocDataProduct: V1_EntitlementsDataProductDetails =
  deserialize(V1_EntitlementsDataProductDetailsModelSchema, {
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
  });

export const getMockDataProductGenerationFilesByType = (
  dataProduct: V1_DataProduct,
): StoredFileGeneration[] => [
  {
    artifactId: 'test-artifact',
    groupId: 'test.group',
    path: dataProduct.path,
    type: 'dataProduct',
    versionId: 'test-version',
    file: {
      path: '/test/path/dataProduct/generation.json',
      content: JSON.stringify({
        dataProduct: {
          dataProductType: {
            _type: 'internalDataProductType',
          },
          path: dataProduct.path,
          deploymentId: '11111',
          description: dataProduct.description,
          title: dataProduct.title,
        },
        accessPointGroups: dataProduct.accessPointGroups.map((group) => ({
          id: group.id,
          desecription: group.description,
          accessPointImplementations: group.accessPoints.map((ap) => ({
            resourceBuilder: {
              _type: 'databaseDDL',
              reproducible: false,
              targetEnvironment: 'Snowflake',
              script: '',
              resourceType: 'VIEW',
            },
            id: ap.id,
            lambdaGenericType: {
              rawType: {
                _type: 'packageableType',
                fullPath:
                  'meta::external::ingest::accessor::IngestRelationAccessor',
              },
              typeArguments: [
                {
                  rawType: {
                    _type: 'relationType',
                    columns: [
                      {
                        name: 'artifact_varchar_val',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        genericType: {
                          multiplicityArguments: [],
                          typeArguments: [],
                          rawType: {
                            _type: 'packageableType',
                            fullPath: 'meta::pure::precisePrimitives::Varchar',
                          },
                          typeVariableValues: [
                            { _type: 'integer', value: 500 },
                          ],
                        },
                      },
                      {
                        name: 'artifact_int_val',
                        multiplicity: {
                          lowerBound: 1,
                          upperBound: 1,
                        },
                        genericType: {
                          multiplicityArguments: [],
                          typeArguments: [],
                          rawType: {
                            _type: 'packageableType',
                            fullPath: 'meta::pure::precisePrimitives::Int',
                          },
                          typeVariableValues: [],
                        },
                      },
                    ],
                  },
                },
              ],
            },
          })),
        })),
      }),
    },
  },
];
