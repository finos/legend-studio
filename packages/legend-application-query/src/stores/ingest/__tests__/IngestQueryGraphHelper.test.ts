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

import { describe, test, expect, jest } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import type { DepotServerClient } from '@finos/legend-server-depot';
import type { Entity, EntityWithOrigin } from '@finos/legend-storage';
import {
  type GraphManagerState,
  CORE_PURE_PATH,
  IngestDefinition,
  LegendSDLC,
} from '@finos/legend-graph';
import {
  fetchIngestEntitiesByClassifier,
  swapIngestInGraph,
} from '../IngestQueryGraphHelper.js';

// ---------------------------------------------------------------------------
// fetchIngestEntitiesByClassifier
// ---------------------------------------------------------------------------

const makeWrapped = (path: string, classifierPath: string): EntityWithOrigin =>
  ({
    entity: {
      path,
      classifierPath,
      content: {},
    },
  }) as unknown as EntityWithOrigin;

describe(unitTest('fetchIngestEntitiesByClassifier'), () => {
  test(
    unitTest('calls DepotServerClient with GAV + INGEST_DEFINITION classifier'),
    async () => {
      const getVersionEntities = jest
        .fn<
          (
            groupId: string,
            artifactId: string,
            version: string,
            classifier?: string,
          ) => Promise<EntityWithOrigin[]>
        >()
        .mockResolvedValue([]);
      const depot = {
        getVersionEntities,
      } as unknown as DepotServerClient;

      await fetchIngestEntitiesByClassifier(
        depot,
        'org.finos',
        'my-artifact',
        '1.0.0',
      );

      expect(getVersionEntities).toHaveBeenCalledTimes(1);
      const call = getVersionEntities.mock.calls[0];
      expect(call?.[0]).toBe('org.finos');
      expect(call?.[1]).toBe('my-artifact');
      // 3rd arg is a resolved version, don't assert exact string
      expect(call?.[3]).toBe(CORE_PURE_PATH.INGEST_DEFINITION);
    },
  );

  test(
    unitTest('unwraps EntityWithOrigin payloads and keys by entity path'),
    async () => {
      const depot = {
        getVersionEntities: async () => [
          makeWrapped('model::IngestA', CORE_PURE_PATH.INGEST_DEFINITION),
          makeWrapped('model::IngestB', CORE_PURE_PATH.INGEST_DEFINITION),
        ],
      } as unknown as DepotServerClient;

      const result = await fetchIngestEntitiesByClassifier(
        depot,
        'g',
        'a',
        '1.0.0',
      );

      expect(result.size).toBe(2);
      expect(result.get('model::IngestA')?.path).toBe('model::IngestA');
      expect(result.get('model::IngestB')?.path).toBe('model::IngestB');
    },
  );

  test(
    unitTest('filters out entities with a different classifierPath'),
    async () => {
      const depot = {
        getVersionEntities: async () => [
          makeWrapped('model::IngestA', CORE_PURE_PATH.INGEST_DEFINITION),
          makeWrapped('model::SomeClass', 'meta::pure::metamodel::type::Class'),
        ],
      } as unknown as DepotServerClient;

      const result = await fetchIngestEntitiesByClassifier(
        depot,
        'g',
        'a',
        '1.0.0',
      );

      expect(result.size).toBe(1);
      expect(result.has('model::IngestA')).toBe(true);
      expect(result.has('model::SomeClass')).toBe(false);
    },
  );
});

// ---------------------------------------------------------------------------
// swapIngestInGraph
// ---------------------------------------------------------------------------

/**
 * Minimal `GraphManagerState`-shaped stub. We only exercise the properties
 * `swapIngestInGraph` touches: `graph.ingests`, `graph.deleteElement`,
 * `graph.getElement`, `graph.origin`, `graphManager.buildGraph`, and
 * `graphBuildState`.
 */
const makeGraphManagerStub = (options: {
  ingests: IngestDefinition[];
  origin: LegendSDLC | undefined;
  getElement?: (path: string) => unknown;
  buildGraphImpl?: (entities: Entity[]) => void;
}) => {
  const deleteElement = jest.fn((el: IngestDefinition) => {
    const idx = options.ingests.indexOf(el);
    if (idx >= 0) {
      options.ingests.splice(idx, 1);
    }
  });
  const buildGraph = jest.fn(
    async (
      _graph: unknown,
      entities: Entity[],
      _buildState: unknown,
      _options: unknown,
    ) => {
      options.buildGraphImpl?.(entities);
    },
  );
  const state = {
    graph: {
      ingests: options.ingests,
      origin: options.origin,
      deleteElement,
      getElement: (path: string) =>
        options.getElement
          ? options.getElement(path)
          : options.ingests.find((i) => i.path === path),
    },
    graphManager: { buildGraph },
    graphBuildState: {},
  } as unknown as GraphManagerState;
  return { state, buildGraph, deleteElement };
};

const makeIngest = (path: string): IngestDefinition =>
  // Skip `package` wiring — `PackageableElement.path` falls back to `name`
  // when no package is set, which is exactly what our stubs need.
  new IngestDefinition(path);

describe(unitTest('swapIngestInGraph'), () => {
  test(
    unitTest('builds the new ingest and returns the metamodel instance'),
    async () => {
      const built: IngestDefinition[] = [];
      const target: Entity = {
        path: 'model::IngestA',
        classifierPath: CORE_PURE_PATH.INGEST_DEFINITION,
        content: {},
      };
      const { state, buildGraph, deleteElement } = makeGraphManagerStub({
        ingests: built,
        origin: undefined,
        buildGraphImpl: () => {
          built.push(makeIngest('model::IngestA'));
        },
      });

      const result = await swapIngestInGraph(state, target, {
        groupId: 'g',
        artifactId: 'a',
        versionId: '1.0.0',
      });

      expect(deleteElement).not.toHaveBeenCalled();
      expect(buildGraph).toHaveBeenCalledTimes(1);
      expect(result).toBeInstanceOf(IngestDefinition);
      expect(result.path).toBe('model::IngestA');
    },
  );

  test(
    unitTest(
      'passes SDLC origin when the graph has none, and omits it otherwise',
    ),
    async () => {
      const target: Entity = {
        path: 'model::IngestA',
        classifierPath: CORE_PURE_PATH.INGEST_DEFINITION,
        content: {},
      };

      // Case 1: origin undefined → SDLC options passed
      const scenario1 = makeGraphManagerStub({
        ingests: [],
        origin: undefined,
        buildGraphImpl: () => {
          scenario1.state.graph.ingests.push(makeIngest('model::IngestA'));
        },
      });
      await swapIngestInGraph(scenario1.state, target, {
        groupId: 'g',
        artifactId: 'a',
        versionId: '1.0.0',
      });
      const optionsArg1 = scenario1.buildGraph.mock.calls[0]?.[3] as
        | { origin?: LegendSDLC }
        | undefined;
      expect(optionsArg1?.origin).toBeInstanceOf(LegendSDLC);

      // Case 2: origin already set → options passed as undefined
      const scenario2 = makeGraphManagerStub({
        ingests: [],
        origin: new LegendSDLC('g', 'a', '1.0.0'),
        buildGraphImpl: () => {
          scenario2.state.graph.ingests.push(makeIngest('model::IngestA'));
        },
      });
      await swapIngestInGraph(scenario2.state, target, {
        groupId: 'g',
        artifactId: 'a',
        versionId: '1.0.0',
      });
      expect(scenario2.buildGraph.mock.calls[0]?.[3]).toBeUndefined();
    },
  );

  test(
    unitTest('deletes the currently built ingest when currentPath matches'),
    async () => {
      const existing = makeIngest('model::IngestA');
      const built: IngestDefinition[] = [existing];
      const target: Entity = {
        path: 'model::IngestB',
        classifierPath: CORE_PURE_PATH.INGEST_DEFINITION,
        content: {},
      };
      const { state, deleteElement } = makeGraphManagerStub({
        ingests: built,
        origin: new LegendSDLC('g', 'a', '1.0.0'),
        buildGraphImpl: () => {
          built.push(makeIngest('model::IngestB'));
        },
      });

      const result = await swapIngestInGraph(state, target, {
        currentPath: 'model::IngestA',
        groupId: 'g',
        artifactId: 'a',
        versionId: '1.0.0',
      });

      expect(deleteElement).toHaveBeenCalledWith(existing);
      expect(built.map((i) => i.path)).toEqual(['model::IngestB']);
      expect(result.path).toBe('model::IngestB');
    },
  );

  test(
    unitTest('does nothing to graph.ingests when currentPath does not resolve'),
    async () => {
      const built: IngestDefinition[] = [];
      const target: Entity = {
        path: 'model::IngestA',
        classifierPath: CORE_PURE_PATH.INGEST_DEFINITION,
        content: {},
      };
      const { state, deleteElement } = makeGraphManagerStub({
        ingests: built,
        origin: new LegendSDLC('g', 'a', '1.0.0'),
        buildGraphImpl: () => {
          built.push(makeIngest('model::IngestA'));
        },
      });

      await swapIngestInGraph(state, target, {
        currentPath: 'model::Unknown',
        groupId: 'g',
        artifactId: 'a',
        versionId: '1.0.0',
      });

      expect(deleteElement).not.toHaveBeenCalled();
    },
  );

  test(
    unitTest(
      'throws when the built element is not an IngestDefinition (guaranteeType)',
    ),
    async () => {
      const target: Entity = {
        path: 'model::NotIngest',
        classifierPath: CORE_PURE_PATH.INGEST_DEFINITION,
        content: {},
      };
      const { state } = makeGraphManagerStub({
        ingests: [],
        origin: new LegendSDLC('g', 'a', '1.0.0'),
        getElement: () => ({ path: 'model::NotIngest' }), // wrong type
      });

      await expect(
        swapIngestInGraph(state, target, {
          groupId: 'g',
          artifactId: 'a',
          versionId: '1.0.0',
        }),
      ).rejects.toThrow(
        `Can't find ingest definition 'model::NotIngest' after build`,
      );
    },
  );
});
