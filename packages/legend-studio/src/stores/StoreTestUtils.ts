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

/// <reference types="jest-extended" />
import { ApplicationConfig } from './application/ApplicationConfig';
import { ApplicationStore } from './ApplicationStore';
import { EditorStore } from './EditorStore';
import { createBrowserHistory } from 'history';
import { StudioPluginManager } from '../application/StudioPluginManager';
import { URL_PATH_PLACEHOLDER } from './LegendStudioRouter';
import { flowResult } from 'mobx';
import type { GraphBuilderOptions } from '@finos/legend-graph';
import { TEST__getTestGraphManagerState } from '@finos/legend-graph';
import { WebApplicationNavigator } from './application/WebApplicationNavigator';
import { Log } from '@finos/legend-shared';
import type { Entity } from '@finos/legend-model-storage';
import {
  EntityChangeType,
  TEST__getTestSDLCServerClient,
} from '@finos/legend-server-sdlc';
import { TEST__getTestDepotServerClient } from '@finos/legend-server-depot';

export const TEST_DATA__applicationConfig = {
  appName: 'test-app',
  env: 'test-env',
  sdlc: {
    url: 'https://testSdlcUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  depot: {
    url: 'https://testMetadataUrl',
  },
  documentation: {
    url: 'https://testDocUrl',
  },
};

export const TEST_DATA__applicationVersion = {
  buildTime: '2001-01-01T00:00:00-0000',
  version: 'test-version',
  commitSHA: 'test-commit-id',
};

export const TEST__getTestApplicationConfig = (
  extraConfigData = {},
): ApplicationConfig => {
  const config = new ApplicationConfig(
    {
      ...TEST_DATA__applicationConfig,
      ...extraConfigData,
    },
    TEST_DATA__applicationVersion,
    '/studio/',
  );
  config.setSDLCServerKey(URL_PATH_PLACEHOLDER);
  return config;
};

export const TEST__getTestApplicationStore = (): ApplicationStore =>
  new ApplicationStore(
    TEST__getTestApplicationConfig(),
    new WebApplicationNavigator(createBrowserHistory()),
    new Log(),
  );

export const TEST__getTestEditorStore = (
  pluginManager = StudioPluginManager.create(),
): EditorStore => {
  const applicationStore = TEST__getTestApplicationStore();
  return new EditorStore(
    applicationStore,
    TEST__getTestSDLCServerClient(),
    TEST__getTestDepotServerClient(),
    TEST__getTestGraphManagerState(pluginManager),
    pluginManager,
  );
};

export const TEST__excludeSectionIndex = (entities: Entity[]): Entity[] =>
  entities.filter((entity) => entity.path !== '__internal__::SectionIndex');

export const TEST_DEBUG__expectToIncludeSameMembers = (
  expected: Entity[],
  actual: Entity[],
): void => {
  for (const entity of expected) {
    expect(entity).toEqual(actual.find((entry) => entity.path === entry.path));
  }
  for (const entity of actual) {
    expect(entity).toEqual(
      expected.find((entry) => entity.path === entry.path),
    );
  }
};

export const TEST__ensureObjectFieldsAreSortedAlphabetically = (
  obj: Record<PropertyKey, unknown> | unknown[],
): void => {
  const checkObjectFieldsAreSortedAlphabetically = (
    _obj: Record<PropertyKey, unknown> | unknown[],
  ): void => {
    if (Array.isArray(_obj)) {
      _obj.forEach((element) => {
        if (typeof element === 'object') {
          checkObjectFieldsAreSortedAlphabetically(
            element as Record<PropertyKey, unknown> | unknown[],
          );
        }
      });
    } else {
      expect(Object.keys(_obj)).toEqual(
        /**
         * NOTE: we cannot use `localeCompare` because it is not compatible with
         * the way the backend (i.e. Java's Jackson/GSON sort property fields, which
         * employees a sorting strategy based on ASCII value).
         * e.g. 'enumeration'.localeCompare('enumValueMapping') = -1
         * but 'E' < 'e' in terms of ASCII value.
         * Therefore, we should just uses string comparison here instead
         */
        Object.keys(_obj).sort((k1, k2) => (k1 > k2 ? 1 : k1 < k2 ? -1 : 0)),
      );
      for (const prop in _obj) {
        if (Object.prototype.hasOwnProperty.call(_obj, prop)) {
          const value = _obj[prop];
          if (typeof value === 'object') {
            checkObjectFieldsAreSortedAlphabetically(
              value as Record<PropertyKey, unknown> | unknown[],
            );
          }
        }
      }
    }
  };
  checkObjectFieldsAreSortedAlphabetically(obj);
};

export const TEST__buildGraphBasic = async (
  entities: Entity[],
  editorStore: EditorStore,
  options?: GraphBuilderOptions,
): Promise<void> => {
  await flowResult(editorStore.graphManagerState.initializeSystem());
  await flowResult(
    editorStore.graphManagerState.graphManager.buildGraph(
      editorStore.graphManagerState.graph,
      entities,
      options,
    ),
  );
};

export const TEST__checkBuildingElementsRoundtrip = async (
  entities: Entity[],
  editorStore = TEST__getTestEditorStore(),
): Promise<void> => {
  await TEST__buildGraphBasic(entities, editorStore, {
    TEMPORARY__keepSectionIndex: true,
  });
  const transformedEntities =
    editorStore.graphManagerState.graph.allOwnElements.map((element) =>
      editorStore.graphManagerState.graphManager.elementToEntity(element),
    );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    TEST__ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    TEST__excludeSectionIndex(entities),
  );
  // check hash
  await flowResult(editorStore.graphManagerState.precomputeHashes());
  const protocolHashesIndex =
    await editorStore.graphManagerState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
  // TODO: avoid listing section index as part of change detection for now
  expect(
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes.filter(
      (change) =>
        change.entityChangeType !== EntityChangeType.DELETE ||
        change.oldPath !== '__internal__::SectionIndex',
    ).length,
  ).toBe(0);
};

export const TEST__checkBuildingResolvedElements = async (
  entities: Entity[],
  resolvedEntities: Entity[],
  editorStore = TEST__getTestEditorStore(),
): Promise<void> => {
  await TEST__buildGraphBasic(entities, editorStore);
  const transformedEntities =
    editorStore.graphManagerState.graph.allOwnElements.map((element) =>
      editorStore.graphManagerState.graphManager.elementToEntity(element),
    );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    TEST__ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    TEST__excludeSectionIndex(resolvedEntities),
  );
  // check hash
  await flowResult(editorStore.graphManagerState.precomputeHashes());
  const protocolHashesIndex =
    await editorStore.graphManagerState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));
};
