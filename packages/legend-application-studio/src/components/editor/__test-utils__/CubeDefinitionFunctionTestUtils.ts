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
import type { ProjectVersionEntities } from '@finos/legend-server-depot';
import type { Entity } from '@finos/legend-storage';
import type { RenderResult } from '@testing-library/react';
import type { EditorStore } from '../../../stores/editor/EditorStore.js';
import {
  TEST__setUpEditorWithDefaultSDLCData,
  TEST_DATA__DefaultSDLCInfo,
} from './EditorComponentTestUtils.js';
import TEST_DATA from './TEST_DATA__CubeDefinitionFunctions.json' with { type: 'json' };

/**
 * The user-defined functions a definition's flow opens into containers
 * (PLAN §11.33), in a project built from Legend Cube's mock, as the engine
 * prints it: an ingest definition whose views, and a data product whose
 * access points, call `shop::orders::activeOrders()`, a function of the
 * project, and `shop::common::onlyOpen(…)`, one of a project it depends on
 */
export const TEST_DATA__CubeDefinitionFunctions = TEST_DATA;

/** The project a dependency's function comes from, as its container says it */
export const TEST__CUBE_DEFINITION_FUNCTION_DEPENDENCY = `${TEST_DATA.dependency.groupId}:${TEST_DATA.dependency.artifactId}:${TEST_DATA.dependency.versionId}`;

/** The editor, on the workspace of that project, its dependency built */
export const TEST__setUpEditorWithCubeDefinitionFunctions = (
  editorStore: EditorStore,
): Promise<RenderResult> => {
  const { dependency } = TEST_DATA;
  return TEST__setUpEditorWithDefaultSDLCData(editorStore, {
    entities: TEST_DATA.entities as PlainObject<Entity>[],
    projectConfiguration: {
      ...TEST_DATA__DefaultSDLCInfo.projectConfig,
      projectDependencies: [
        {
          projectId: `${dependency.groupId}:${dependency.artifactId}`,
          versionId: dependency.versionId,
        },
      ],
    },
    projects: [
      {
        id: 'SHOP-COMMON',
        projectId: 'SHOP-COMMON',
        groupId: dependency.groupId,
        artifactId: dependency.artifactId,
        versions: [dependency.versionId],
        latestVersion: dependency.versionId,
      },
    ],
    projectDependency: [
      dependency as unknown as PlainObject<ProjectVersionEntities>,
    ],
  });
};
