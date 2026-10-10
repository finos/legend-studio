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
import type { ModelContext } from '@finos/legend-cube';
import {
  checkCubeProjectModel,
  createCubeProjectModel,
  formatCubeProject,
  getCubeProjectCoordinates,
  isCubeProjectModel,
} from '../CubeProject.js';

const PROJECT = {
  groupId: 'com.example',
  artifactId: 'sales',
  versionId: '1.10.0',
};

describe('Project models', () => {
  test("Saves the engine's alloy pointer at the version", () => {
    const model = createCubeProjectModel(PROJECT);
    expect(model).toEqual({
      _type: 'pointer',
      sdlcInfo: {
        _type: 'alloy',
        groupId: 'com.example',
        artifactId: 'sales',
        version: '1.10.0',
        packageableElementPointers: [],
      },
    });
    expect(isCubeProjectModel(model)).toBe(true);
    expect(checkCubeProjectModel(model)).toEqual([]);
    expect(getCubeProjectCoordinates(model)).toEqual(PROJECT);
    expect(formatCubeProject(PROJECT)).toBe('com.example:sales 1.10.0');
  });

  test('Tells other models apart', () => {
    expect(isCubeProjectModel({ _type: 'text', code: '' })).toBe(false);
    expect(
      isCubeProjectModel({
        _type: 'pointer',
        sdlcInfo: { _type: 'pure' },
      } as unknown as ModelContext),
    ).toBe(false);
    expect(getCubeProjectCoordinates({ _type: 'text', code: '' })).toBe(
      undefined,
    );
  });

  test('Refuses a version that moves, and missing coordinates', () => {
    ['master-SNAPSHOT', '1.0.0-SNAPSHOT', 'latest', 'HEAD'].forEach(
      (versionId) => {
        const model = createCubeProjectModel({ ...PROJECT, versionId });
        expect(checkCubeProjectModel(model)).toEqual([
          `Cube reads released versions only, not ${versionId}: pick a released version`,
        ]);
        expect(getCubeProjectCoordinates(model)).toBe(undefined);
      },
    );
    expect(
      checkCubeProjectModel({
        _type: 'pointer',
        sdlcInfo: { _type: 'alloy', groupId: 'com.example' },
      } as unknown as ModelContext),
    ).toEqual([
      "The cube's project has no artifactId",
      "The cube's project has no version",
    ]);
  });
});
