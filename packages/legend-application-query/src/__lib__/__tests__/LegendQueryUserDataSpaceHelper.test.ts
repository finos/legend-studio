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

import { test, expect, describe } from '@jest/globals';
import type { DataSpaceInfo } from '@finos/legend-extension-dsl-data-space/application';
import {
  createVisitedDataSpaceId,
  createIdFromDataSpaceInfo,
  createSimpleVisitedDataspace,
  createVisitedDataspaceFromInfo,
  hasDataSpaceInfoBeenVisited,
  type VisitedDataspace,
  type SavedVisitedDataSpaces,
} from '../LegendQueryUserDataSpaceHelper.js';

describe('LegendQueryUserDataSpaceHelper', () => {
  describe('createVisitedDataSpaceId', () => {
    test('should create a unique ID for a dataspace', () => {
      const groupId = 'test-group';
      const artifactId = 'test-artifact';
      const dataSpace = 'model::TestDataSpace';

      const result = createVisitedDataSpaceId(groupId, artifactId, dataSpace);

      expect(result).toBe('test-group:test-artifact:model::TestDataSpace');
    });
  });

  describe('createIdFromDataSpaceInfo', () => {
    test('should create an ID from DataSpaceInfo when groupId and artifactId are present', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };

      const result = createIdFromDataSpaceInfo(dataSpaceInfo);

      expect(result).toBe('test-group:test-artifact:model::TestDataSpace');
    });

    test('should return undefined when groupId or artifactId are missing', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: undefined,
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };

      const result = createIdFromDataSpaceInfo(dataSpaceInfo);

      expect(result).toBeUndefined();
    });
  });

  describe('createSimpleVisitedDataspace', () => {
    test('should create a VisitedDataspace object with the provided parameters', () => {
      const groupId = 'test-group';
      const artifactId = 'test-artifact';
      const versionId = '1.0.0';
      const path = 'model::TestDataSpace';
      const execContext = 'test-context';

      const result = createSimpleVisitedDataspace(
        groupId,
        artifactId,
        versionId,
        path,
        execContext,
      );

      expect(result).toEqual({
        id: 'test-group:test-artifact:model::TestDataSpace',
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        execContext: 'test-context',
      });
    });
  });

  describe('createVisitedDataspaceFromInfo', () => {
    test('should create a VisitedDataspace from DataSpaceInfo when groupId and artifactId are present', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };
      const execContext = 'test-context';

      const result = createVisitedDataspaceFromInfo(dataSpaceInfo, execContext);

      expect(result).toEqual({
        id: 'test-group:test-artifact:model::TestDataSpace',
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        execContext: 'test-context',
      });
    });

    test('should return undefined when groupId or artifactId are missing', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: undefined,
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };
      const execContext = 'test-context';

      const result = createVisitedDataspaceFromInfo(dataSpaceInfo, execContext);

      expect(result).toBeUndefined();
    });
  });

  describe('hasDataSpaceInfoBeenVisited', () => {
    test('should return true when the DataSpaceInfo has been visited', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };

      const visitedDataSpaces: SavedVisitedDataSpaces = [
        {
          id: 'test-group:test-artifact:model::TestDataSpace',
          groupId: 'test-group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
          path: 'model::TestDataSpace',
          execContext: 'test-context',
        },
      ];

      const result = hasDataSpaceInfoBeenVisited(
        dataSpaceInfo,
        visitedDataSpaces,
      );

      expect(result).toBe(true);
    });

    test('should return false when the DataSpaceInfo has not been visited', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: 'test-group',
        artifactId: 'test-artifact',
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };

      const visitedDataSpaces: SavedVisitedDataSpaces = [
        {
          id: 'test-group:test-artifact:model::OtherDataSpace',
          groupId: 'test-group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
          path: 'model::OtherDataSpace',
          execContext: 'test-context',
        },
      ];

      const result = hasDataSpaceInfoBeenVisited(
        dataSpaceInfo,
        visitedDataSpaces,
      );

      expect(result).toBe(false);
    });

    test('should return false when the DataSpaceInfo has no ID', () => {
      const dataSpaceInfo: DataSpaceInfo = {
        groupId: undefined,
        artifactId: undefined,
        versionId: '1.0.0',
        path: 'model::TestDataSpace',
        name: 'TestDataSpace',
        title: 'Test Data Space',
        defaultExecutionContext: undefined,
      };

      const visitedDataSpaces: SavedVisitedDataSpaces = [
        {
          id: 'test-group:test-artifact:model::TestDataSpace',
          groupId: 'test-group',
          artifactId: 'test-artifact',
          versionId: '1.0.0',
          path: 'model::TestDataSpace',
          execContext: 'test-context',
        },
      ];

      const result = hasDataSpaceInfoBeenVisited(
        dataSpaceInfo,
        visitedDataSpaces,
      );

      expect(result).toBe(false);
    });
  });
});
