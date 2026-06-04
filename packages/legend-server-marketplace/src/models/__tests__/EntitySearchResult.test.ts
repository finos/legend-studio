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
import { unitTest } from '@finos/legend-shared/test';
import {
  EntitySearchRelatedField,
  EntitySearchResult,
  EntitySearchResponse,
} from '../EntitySearchResult.js';

const TEST_DATA__relatedFieldJson = {
  fieldName: 'price',
  fieldDescription: 'The price of the instrument',
  fieldType: 'Float',
  similarityScore: 0.92,
};

const TEST_DATA__entityResultJson = {
  datasetName: 'BondPricing',
  datasetDescription: 'Daily bond pricing dataset',
  dataProductTitle: 'BBG BVAL',
  dataProductDetails: {
    _type: 'legacy',
    groupId: 'com.gs.datadesign',
    artifactId: 'bbg-bval',
    versionId: '3.3.0',
    path: 'Bloomberg::bval::dataspace::BBGBvalDataspace',
  },
  datasetDetails: {
    _type: 'legacy',
    modelPath: 'Bloomberg::bval::model::BondPricing',
  },
  similarityScore: 0.88,
  relatedFields: [TEST_DATA__relatedFieldJson],
};

const TEST_DATA__responseJson = {
  results: [TEST_DATA__entityResultJson],
  metadata: {
    total_count: 15,
    num_pages: 2,
    page_size: 10,
    page_number: 1,
    next_page_number: 2,
  },
};

// ─── EntitySearchRelatedField ────────────────────────────────────────────────

describe(unitTest('EntitySearchRelatedField serialization'), () => {
  test('deserializes all fields', () => {
    const field = EntitySearchRelatedField.serialization.fromJson(
      TEST_DATA__relatedFieldJson,
    );
    expect(field.fieldName).toBe('price');
    expect(field.fieldDescription).toBe('The price of the instrument');
    expect(field.fieldType).toBe('Float');
    expect(field.similarityScore).toBe(0.92);
  });

  test('deserializes with optional fields absent', () => {
    const field = EntitySearchRelatedField.serialization.fromJson({
      fieldName: 'id',
      similarityScore: 0.5,
    });
    expect(field.fieldName).toBe('id');
    expect(field.fieldDescription).toBeUndefined();
    expect(field.fieldType).toBeUndefined();
    expect(field.similarityScore).toBe(0.5);
  });

  test('round-trips through toJson/fromJson', () => {
    const field = EntitySearchRelatedField.serialization.fromJson(
      TEST_DATA__relatedFieldJson,
    );
    const json = EntitySearchRelatedField.serialization.toJson(field);
    expect(json.fieldName).toBe('price');
    expect(json.similarityScore).toBe(0.92);
  });
});

// ─── EntitySearchResult ──────────────────────────────────────────────────────

describe(unitTest('EntitySearchResult serialization'), () => {
  test('deserializes full entity result', () => {
    const result = EntitySearchResult.serialization.fromJson(
      TEST_DATA__entityResultJson,
    );
    expect(result.datasetName).toBe('BondPricing');
    expect(result.datasetDescription).toBe('Daily bond pricing dataset');
    expect(result.dataProductTitle).toBe('BBG BVAL');
    expect(result.similarityScore).toBe(0.88);
    expect(result.dataProductDetails.groupId).toBe('com.gs.datadesign');
    expect(result.dataProductDetails.artifactId).toBe('bbg-bval');
    expect(result.dataProductDetails.versionId).toBe('3.3.0');
    expect(result.dataProductDetails.path).toBe(
      'Bloomberg::bval::dataspace::BBGBvalDataspace',
    );
    expect(result.datasetDetails?.modelPath).toBe(
      'Bloomberg::bval::model::BondPricing',
    );
    expect(result.relatedFields).toHaveLength(1);
    expect(result.relatedFields[0]?.fieldName).toBe('price');
  });

  test('deserializes without optional fields', () => {
    const result = EntitySearchResult.serialization.fromJson({
      datasetName: 'TestDataset',
      dataProductDetails: {
        _type: 'legacy',
        groupId: 'com.test',
        artifactId: 'test',
        versionId: '1.0.0',
        path: 'test::Path',
      },
      similarityScore: 0.75,
      relatedFields: [],
    });
    expect(result.datasetName).toBe('TestDataset');
    expect(result.datasetDescription).toBeUndefined();
    expect(result.dataProductTitle).toBeUndefined();
    expect(result.datasetDetails).toBeUndefined();
    expect(result.relatedFields).toEqual([]);
  });

  test('round-trips through toJson/fromJson', () => {
    const result = EntitySearchResult.serialization.fromJson(
      TEST_DATA__entityResultJson,
    );
    const json = EntitySearchResult.serialization.toJson(result);
    const result2 = EntitySearchResult.serialization.fromJson(json);
    expect(result2.datasetName).toBe(result.datasetName);
    expect(result2.similarityScore).toBe(result.similarityScore);
    expect(result2.relatedFields).toHaveLength(1);
  });

  test('handles multiple related fields', () => {
    const result = EntitySearchResult.serialization.fromJson({
      datasetName: 'Multi',
      dataProductDetails: {
        _type: 'legacy',
        groupId: 'g',
        artifactId: 'a',
        versionId: '1',
        path: 'p',
      },
      similarityScore: 0.9,
      relatedFields: [
        { fieldName: 'f1', similarityScore: 0.8 },
        { fieldName: 'f2', fieldType: 'String', similarityScore: 0.7 },
        {
          fieldName: 'f3',
          fieldDescription: 'desc',
          fieldType: 'Int',
          similarityScore: 0.6,
        },
      ],
    });
    expect(result.relatedFields).toHaveLength(3);
    expect(result.relatedFields[2]?.fieldDescription).toBe('desc');
  });
});

// ─── EntitySearchResponse ────────────────────────────────────────────────────

describe(unitTest('EntitySearchResponse serialization'), () => {
  test('deserializes full response with metadata', () => {
    const response = EntitySearchResponse.serialization.fromJson(
      TEST_DATA__responseJson,
    );
    expect(response.results).toHaveLength(1);
    expect(response.results[0]?.datasetName).toBe('BondPricing');
    expect(response.metadata?.total_count).toBe(15);
    expect(response.metadata?.num_pages).toBe(2);
    expect(response.metadata?.page_size).toBe(10);
    expect(response.metadata?.page_number).toBe(1);
    expect(response.metadata?.next_page_number).toBe(2);
  });

  test('deserializes without metadata', () => {
    const response = EntitySearchResponse.serialization.fromJson({
      results: [],
    });
    expect(response.results).toEqual([]);
    expect(response.metadata).toBeUndefined();
  });

  test('round-trips through toJson/fromJson', () => {
    const response = EntitySearchResponse.serialization.fromJson(
      TEST_DATA__responseJson,
    );
    const json = EntitySearchResponse.serialization.toJson(response);
    const response2 = EntitySearchResponse.serialization.fromJson(json);
    expect(response2.results).toHaveLength(1);
    expect(response2.metadata?.total_count).toBe(15);
  });

  test('handles multiple results', () => {
    const response = EntitySearchResponse.serialization.fromJson({
      results: [
        {
          datasetName: 'DS1',
          dataProductDetails: {
            _type: 'l',
            groupId: 'g',
            artifactId: 'a',
            versionId: '1',
            path: 'p',
          },
          similarityScore: 0.9,
          relatedFields: [],
        },
        {
          datasetName: 'DS2',
          dataProductDetails: {
            _type: 'l',
            groupId: 'g',
            artifactId: 'a',
            versionId: '1',
            path: 'p',
          },
          similarityScore: 0.8,
          relatedFields: [{ fieldName: 'f1', similarityScore: 0.7 }],
        },
      ],
      metadata: {
        total_count: 2,
        num_pages: 1,
        page_size: 10,
        page_number: 1,
      },
    });
    expect(response.results).toHaveLength(2);
    expect(response.results[1]?.relatedFields).toHaveLength(1);
  });
});
