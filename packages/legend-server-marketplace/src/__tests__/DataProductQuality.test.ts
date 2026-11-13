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

import { describe, expect, test } from '@jest/globals';
import { QUALITY_LEVEL } from '../models/QualityLevel.js';
import { DataProductQualityResponse } from '../models/DataProductQuality.js';
import { DataSpaceQualityResponse } from '../models/DataSpaceQuality.js';

const BREAKDOWN = {
  isDescriptionDocumented: true,
  isAccessPointsPresent: true,
  isAccessPointGroupDescriptionsDocumented: true,
  isEveryAccessPointDocumented: false,
  attributeCoverage: 0.4,
  documentedAttributeCount: 4,
  totalAttributeCount: 10,
};

describe('DataProductQualityResponse', () => {
  test.each(Object.values(QUALITY_LEVEL))(
    'deserializes the %s quality level',
    (level) => {
      const response = DataProductQualityResponse.serialization.fromJson({
        qualityLevel: level,
        qualityBreakdown: BREAKDOWN,
      });
      expect(response.qualityLevel).toBe(level);
      expect(response.qualityBreakdown.totalAttributeCount).toBe(10);
    },
  );

  test.each(['gold', '', null, undefined, 3])(
    'throws on the unrecognized quality level %p',
    (qualityLevel) => {
      expect(() =>
        DataProductQualityResponse.serialization.fromJson({
          qualityLevel,
          qualityBreakdown: BREAKDOWN,
        }),
      ).toThrow('Unrecognized quality level');
    },
  );

  test('throws on an unrecognized quality level', () => {
    expect(() =>
      DataProductQualityResponse.serialization.fromJson({
        qualityLevel: 'COPPER',
        qualityBreakdown: BREAKDOWN,
      }),
    ).toThrow('Unrecognized quality level: COPPER');
  });
});

describe('DataSpaceQualityResponse', () => {
  const DATA_SPACE_BREAKDOWN = {
    isDescriptionDocumented: true,
    isExecutablesPresent: true,
    isModelsDocumentationPresent: false,
    isEveryServiceDocumented: false,
    attributeCoverage: 0.4,
    documentedAttributeCount: 4,
    totalAttributeCount: 10,
  };

  test.each(Object.values(QUALITY_LEVEL))(
    'deserializes the %s quality level, the same tiers as a data product',
    (level) => {
      const response = DataSpaceQualityResponse.serialization.fromJson({
        qualityLevel: level,
        qualityBreakdown: DATA_SPACE_BREAKDOWN,
      });
      expect(response.qualityLevel).toBe(level);
      expect(response.qualityBreakdown.totalAttributeCount).toBe(10);
    },
  );

  test.each(['COPPER', 'gold', '', null, undefined, 3])(
    'throws on the unrecognized quality level %p',
    (qualityLevel) => {
      expect(() =>
        DataSpaceQualityResponse.serialization.fromJson({
          qualityLevel,
          qualityBreakdown: DATA_SPACE_BREAKDOWN,
        }),
      ).toThrow('Unrecognized quality level');
    },
  );
});
