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

import { type PlainObject } from '@finos/legend-shared';
import type { DataProductSearchResult } from '@finos/legend-server-marketplace';

export const mockProdSearchResultResponse: PlainObject<DataProductSearchResult>[] =
  [
    {
      dataProductTitle: 'Lakehouse SDLC Data Product',
      dataProductDescription: 'This is a lakehouse SDLC Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
        deploymentId: 12345,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'PRODUCTION',
        origin: {
          _type: 'SdlcDeployment',
          groupId: 'com.example.lakehouse',
          artifactId: 'lakehouse-sdlc-data-product',
          versionId: '1.0.0',
          path: 'test::Lakehouse_Sdlc_Data_Product',
        },
      },
    },
    {
      dataProductTitle: null,
      dataProductDescription: null,
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT_NO_TITLE',
        deploymentId: 12345,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'PRODUCTION',
        origin: {
          _type: 'SdlcDeployment',
          groupId: 'com.example.lakehouse',
          artifactId: 'lakehouse-sdlc-data-product',
          versionId: '1.0.0',
          path: 'test::Lakehouse_Sdlc_Data_Product_No_Title',
        },
      },
    },
    {
      dataProductTitle: 'Legacy Data Product',
      dataProductDescription: 'This is a legacy Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'legacy',
        groupId: 'com.example.legacy',
        artifactId: 'legacy-data-product',
        versionId: '2.0.0',
        path: 'test::Legacy_Data_Product',
      },
    },
    {
      dataProductTitle: null,
      dataProductDescription: null,
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'legacy',
        groupId: 'com.example.legacy',
        artifactId: 'legacy-data-product',
        versionId: '2.0.0',
        path: 'test::Legacy_Data_Product_No_Title',
      },
    },
  ];

export const mockProdParSearchResultResponse: PlainObject<DataProductSearchResult>[] =
  [
    {
      dataProductTitle: 'Lakehouse SDLC Data Product',
      dataProductDescription: 'This is a lakehouse SDLC Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
        deploymentId: 23456,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'PRODUCTION_PARALLEL',
        origin: {
          _type: 'SdlcDeployment',
          groupId: 'com.example',
          artifactId: 'lakehouse-sdlc-data-product',
          versionId: '1.0.0',
          path: 'test::Lakehouse_Sdlc_Data_Product',
        },
      },
    },
    {
      dataProductTitle: 'Lakehouse Ad-hoc Data Product',
      dataProductDescription: 'This is a lakehouse Ad-hoc Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_ADHOC_DATA_PRODUCT',
        deploymentId: 34567,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'PRODUCTION_PARALLEL',
        origin: {
          _type: 'AdHocDeployment',
        },
      },
    },
  ];

export const mockDevSearchResultResponse: PlainObject<DataProductSearchResult>[] =
  [
    {
      dataProductTitle: 'Lakehouse SDLC Data Product',
      dataProductDescription: 'This is a lakehouse SDLC Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_SDLC_DATA_PRODUCT',
        deploymentId: 45678,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'DEVELOPMENT',
        origin: {
          _type: 'SdlcDeployment',
          groupId: 'com.example',
          artifactId: 'lakehouse-sdlc-data-product',
          versionId: 'test_branch-SNAPSHOT',
          path: 'test::Lakehouse_Sdlc_Data_Product',
        },
      },
    },
    {
      dataProductTitle: 'Lakehouse Ad-hoc Data Product',
      dataProductDescription: 'This is a lakehouse Ad-hoc Data Product',
      tags1: [],
      tags2: [],
      tag_score: 0,
      similarity: 0,
      dataProductDetails: {
        _type: 'lakehouse',
        dataProductId: 'LAKEHOUSE_ADHOC_DATA_PRODUCT',
        deploymentId: 45678,
        producerEnvironmentName: 'test-prod-producer-env',
        producerEnvironmentType: 'DEVELOPMENT',
        origin: {
          _type: 'AdHocDeployment',
        },
      },
    },
  ];
