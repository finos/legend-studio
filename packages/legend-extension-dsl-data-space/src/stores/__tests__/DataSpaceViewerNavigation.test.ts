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

import { describe, test, expect } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import {
  encodeRelatedDataSpaceGAV,
  generateRelatedDataSpaceRedirectPath,
  parseRelatedDataSpaceGAV,
  parseRelatedDataSpaceGAVs,
  type DataSpaceWikiRelatedDataSpace,
} from '../DataSpaceViewerNavigation.js';

describe(
  unitTest('DataSpaceInfo::relatedDataSpaces GAV encoding/parsing'),
  () => {
    test('encodes a GAV+path entry into the stored `g:a:v|path` form', () => {
      const encoded = encodeRelatedDataSpaceGAV({
        groupId: 'com.example.dataspaces',
        artifactId: 'my-artifact',
        versionId: '1.2.3',
        path: 'FundOwnershipDataSpace::UseCase3_Migration',
      });
      expect(encoded).toBe(
        'com.example.dataspaces:my-artifact:1.2.3|FundOwnershipDataSpace::UseCase3_Migration',
      );
    });

    test('parses an encoded entry into a display-ready wiki link', () => {
      const encoded = encodeRelatedDataSpaceGAV({
        groupId: 'com.example.dataspaces',
        artifactId: 'my-artifact',
        versionId: '1.2.3',
        path: 'FundOwnershipDataSpace::UseCase3_Migration',
      });

      expect(parseRelatedDataSpaceGAV(encoded)).toEqual({
        name: 'UseCase3_Migration',
        groupId: 'com.example.dataspaces',
        artifactId: 'my-artifact',
        versionId: '1.2.3',
        path: 'FundOwnershipDataSpace::UseCase3_Migration',
      });
    });

    test('preserves element paths that themselves contain the `::` separator', () => {
      const encoded = encodeRelatedDataSpaceGAV({
        groupId: 'com.example',
        artifactId: 'a',
        versionId: '1.0.0',
        path: 'root::mid::leaf::MyDataSpace',
      });

      expect(parseRelatedDataSpaceGAV(encoded)).toEqual({
        name: 'MyDataSpace',
        groupId: 'com.example',
        artifactId: 'a',
        versionId: '1.0.0',
        path: 'root::mid::leaf::MyDataSpace',
      });
    });

    test('parse returns undefined when the path separator is missing', () => {
      expect(parseRelatedDataSpaceGAV('just-a-path')).toBeUndefined();
      expect(
        parseRelatedDataSpaceGAV('com.example:my-artifact:1.0.0'),
      ).toBeUndefined();
      expect(
        parseRelatedDataSpaceGAV(
          'com.example:my-artifact:1.0.0:model::MyDataSpace',
        ),
      ).toBeUndefined();
    });

    test('parse returns undefined when the GAV segment has wrong arity', () => {
      expect(
        parseRelatedDataSpaceGAV('com.example:my-artifact|model::MyDataSpace'),
      ).toBeUndefined();
      expect(
        parseRelatedDataSpaceGAV(
          'com.example:my-artifact:1.0.0:extra|model::MyDataSpace',
        ),
      ).toBeUndefined();
    });

    test('parse returns undefined when any coordinate or path is empty', () => {
      expect(
        parseRelatedDataSpaceGAV(':artifact:1.0.0|model::MyDataSpace'),
      ).toBeUndefined();
      expect(
        parseRelatedDataSpaceGAV('group::1.0.0|model::MyDataSpace'),
      ).toBeUndefined();
      expect(
        parseRelatedDataSpaceGAV('group:artifact:|model::MyDataSpace'),
      ).toBeUndefined();
      expect(parseRelatedDataSpaceGAV('group:artifact:1.0.0|')).toBeUndefined();
    });

    test('parses a batch of engine-analysis-result-style entries as the wiki does', () => {
      const engineAnalysisRelatedDataSpaces = [
        'com.example:a:1.0.0|model::A',
        'com.example:b:2.0.0|model::B::Nested',
        'not-encoded-plain-path',
      ];

      const parsed = engineAnalysisRelatedDataSpaces
        .map((entry) => parseRelatedDataSpaceGAV(entry.trim()))
        .filter((v): v is DataSpaceWikiRelatedDataSpace => v !== undefined);

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        name: 'A',
        groupId: 'com.example',
        artifactId: 'a',
        versionId: '1.0.0',
        path: 'model::A',
      });
      expect(parsed[1]).toEqual({
        name: 'Nested',
        groupId: 'com.example',
        artifactId: 'b',
        versionId: '2.0.0',
        path: 'model::B::Nested',
      });
    });

    test('parses a single tagged value holding multiple comma-separated entries', () => {
      const parsed = parseRelatedDataSpaceGAVs(
        'podium:podium-ih-code-gen:latest|model::USXDEntityNotCompliantHydraException_10292,com.gs.data.client:cde-dataspace:latest|data::client::producer::dataspace::definition::GLASEntityData',
      );

      expect(parsed).toHaveLength(2);
      expect(parsed[0]).toEqual({
        name: 'USXDEntityNotCompliantHydraException_10292',
        groupId: 'podium',
        artifactId: 'podium-ih-code-gen',
        versionId: 'latest',
        path: 'model::USXDEntityNotCompliantHydraException_10292',
      });
      expect(parsed[1]).toEqual({
        name: 'GLASEntityData',
        groupId: 'com.gs.data.client',
        artifactId: 'cde-dataspace',
        versionId: 'latest',
        path: 'data::client::producer::dataspace::definition::GLASEntityData',
      });
    });

    test('skips malformed entries within a comma-separated tagged value', () => {
      const parsed = parseRelatedDataSpaceGAVs(
        'bad-entry, com.example:a:1.0.0|model::A ',
      );

      expect(parsed).toEqual([
        {
          name: 'A',
          groupId: 'com.example',
          artifactId: 'a',
          versionId: '1.0.0',
          path: 'model::A',
        },
      ]);
    });

    test('generates a redirect path pinned to the `latest` version alias', () => {
      const parsed = parseRelatedDataSpaceGAV('com.example:a:1.2.3|model::A');
      expect(parsed).toBeDefined();
      expect(
        generateRelatedDataSpaceRedirectPath(
          parsed as DataSpaceWikiRelatedDataSpace,
        ),
      ).toBe('com.example:a:latest/model::A');
    });
  },
);
