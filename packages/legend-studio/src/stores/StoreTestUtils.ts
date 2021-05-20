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
import { ApplicationConfig } from './ApplicationConfig';
import type { Entity } from '../models/sdlc/models/entity/Entity';
import { ApplicationStore } from './ApplicationStore';
import { EditorStore } from './EditorStore';
import { createBrowserHistory } from 'history';
import { EntityChangeType } from '../models/sdlc/models/entity/EntityChange';
import { PluginManager } from '../application/PluginManager';
import { URL_PATH_PLACEHOLDER } from './Router';

export const testApplicationConfigData = {
  appName: 'test-app',
  env: 'test-env',
  sdlc: {
    url: 'https://testSdlcUrl',
  },
  engine: {
    url: 'https://testEngineUrl',
  },
  metadata: {
    url: 'https://testMetadataUrl',
  },
  documentation: {
    url: 'https://testDocUrl',
  },
};

export const testApplicationVersionData = {
  buildTime: '2001-01-01T00:00:00-0000',
  version: 'test-version',
  commitSHA: 'test-commit-id',
};

export const getTestApplicationConfig = (
  extraConfigData = {},
): ApplicationConfig => {
  const config = new ApplicationConfig(
    {
      ...testApplicationConfigData,
      ...extraConfigData,
    },
    testApplicationVersionData,
    '/studio/',
  );
  config.setSDLCServerKey(URL_PATH_PLACEHOLDER);
  return config;
};

export const getTestEditorStore = (
  applicationConfig = getTestApplicationConfig(),
  pluginManager = PluginManager.create(),
): EditorStore => {
  const applicationStore = new ApplicationStore(
    createBrowserHistory(),
    applicationConfig,
    pluginManager,
  );
  applicationStore.logger.mute();
  return new EditorStore(applicationStore);
};

export const excludeSectionIndex = (entities: Entity[]): Entity[] =>
  entities.filter((entity) => entity.path !== '__internal__::SectionIndex');

export const DEBUG_expectToIncludeSameMembers = (
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

export const ensureObjectFieldsAreSortedAlphabetically = (
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

export const checkBuildingElementsRoundtrip = async (
  entities: Entity[],
  editorStore = getTestEditorStore(),
): Promise<void> => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    entities,
    { TEMPORARY__keepSectionIndex: true },
  );
  const transformedEntities = editorStore.graphState.graph.allElements.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    excludeSectionIndex(entities),
  );
  // check hash
  await editorStore.graphState.graph.precomputeHashes(
    editorStore.applicationStore.logger,
  );
  const protocolHashesIndex =
    await editorStore.graphState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await editorStore.changeDetectionState.computeLocalChanges(true);
  // TODO: avoid listing section index as part of change detection for now
  expect(
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes.filter(
      (change) =>
        change.entityChangeType !== EntityChangeType.DELETE ||
        change.oldPath !== '__internal__::SectionIndex',
    ).length,
  ).toBe(0);
};

export const checkBuildingResolvedElements = async (
  entities: Entity[],
  resolvedEntities: Entity[],
  editorStore = getTestEditorStore(),
): Promise<void> => {
  await editorStore.graphState.initializeSystem();
  await editorStore.graphState.graphManager.buildGraph(
    editorStore.graphState.graph,
    entities,
  );
  const transformedEntities = editorStore.graphState.graph.allElements.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    excludeSectionIndex(resolvedEntities),
  );
  // check hash
  await editorStore.graphState.graph.precomputeHashes(
    editorStore.applicationStore.logger,
  );
  const protocolHashesIndex =
    await editorStore.graphState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await editorStore.changeDetectionState.computeLocalChanges(true);
};
