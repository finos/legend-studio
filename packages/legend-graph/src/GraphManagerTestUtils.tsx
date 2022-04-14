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
import {
  type LoggerPlugin,
  Log,
  AbstractPluginManager,
  promisify,
} from '@finos/legend-shared';
import type { PureGraphManagerPlugin } from './graphManager/PureGraphManagerPlugin';
import { GraphManagerState } from './GraphManagerState';
import { GraphManagerStateProvider } from './GraphManagerStateProvider';
import type { GraphPluginManager } from './GraphPluginManager';
import type { PureProtocolProcessorPlugin } from './models/protocols/pure/PureProtocolProcessorPlugin';
import type { Entity } from '@finos/legend-model-storage';
import { SECTION_INDEX_ELEMENT_PATH } from './MetaModelConst';
import type { GraphBuilderOptions } from './graphManager/AbstractPureGraphManager';
import type { PureGraphPlugin } from './graph/PureGraphPlugin';

export class TEST__GraphPluginManager
  extends AbstractPluginManager
  implements GraphPluginManager
{
  protected loggerPlugins: LoggerPlugin[] = [];
  private pureProtocolProcessorPlugins: PureProtocolProcessorPlugin[] = [];
  private pureGraphManagerPlugins: PureGraphManagerPlugin[] = [];
  private pureGraphPlugins: PureGraphPlugin[] = [];

  registerLoggerPlugin(plugin: LoggerPlugin): void {
    this.loggerPlugins.push(plugin);
  }

  registerPureGraphManagerPlugin(plugin: PureGraphManagerPlugin): void {
    this.pureGraphManagerPlugins.push(plugin);
  }

  registerPureProtocolProcessorPlugin(
    plugin: PureProtocolProcessorPlugin,
  ): void {
    this.pureProtocolProcessorPlugins.push(plugin);
  }

  registerPureGraphPlugin(plugin: PureGraphPlugin): void {
    this.pureGraphPlugins.push(plugin);
  }

  getPureGraphManagerPlugins(): PureGraphManagerPlugin[] {
    return this.pureGraphManagerPlugins;
  }

  getPureProtocolProcessorPlugins(): PureProtocolProcessorPlugin[] {
    return this.pureProtocolProcessorPlugins;
  }

  getPureGraphPlugins(): PureGraphPlugin[] {
    return this.pureGraphPlugins;
  }

  getLoggerPlugins(): LoggerPlugin[] {
    return [...this.loggerPlugins];
  }
}

export const TEST__getTestGraphManagerState = (
  pluginManager?: GraphPluginManager,
  log?: Log,
): GraphManagerState =>
  new GraphManagerState(
    pluginManager ?? new TEST__GraphPluginManager(),
    log ?? new Log(),
  );

export const TEST__provideMockedGraphManagerState = (customization?: {
  mock?: GraphManagerState;
  pluginManager?: GraphPluginManager;
}): GraphManagerState => {
  const value =
    customization?.mock ??
    TEST__getTestGraphManagerState(customization?.pluginManager);
  const MockedGraphManagerStateProvider = require('./GraphManagerStateProvider'); // eslint-disable-line @typescript-eslint/no-unsafe-assignment
  MockedGraphManagerStateProvider.useGraphManagerState = jest.fn();
  MockedGraphManagerStateProvider.useGraphManagerState.mockReturnValue(value);
  return value;
};

export const TEST__GraphManagerStateProvider: React.FC<{
  children: React.ReactNode;
}> = ({ children }) => (
  <GraphManagerStateProvider
    pluginManager={new TEST__GraphPluginManager()}
    log={new Log()}
  >
    {children}
  </GraphManagerStateProvider>
);

export const TEST__excludeSectionIndex = (entities: Entity[]): Entity[] =>
  entities.filter((entity) => entity.path !== SECTION_INDEX_ELEMENT_PATH);

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

export const TEST__buildGraphWithEntities = async (
  graphManagerState: GraphManagerState,
  entities: Entity[],
  options?: GraphBuilderOptions,
): Promise<void> => {
  await graphManagerState.initializeSystem(options);
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    options,
  );
};

export const TEST__checkGraphHashUnchanged = async (
  graphManagerState: GraphManagerState,
  entities: Entity[],
): Promise<void> => {
  const originalHashesIndex =
    await graphManagerState.graphManager.buildHashesIndex(entities);
  const graphHashesIndex = new Map<string, string>();
  await Promise.all<void>(
    graphManagerState.graph.allOwnElements.map((element) =>
      promisify(() => {
        graphHashesIndex.set(element.path, element.hashCode);
      }),
    ),
  );
  expect(
    Array.from(originalHashesIndex.entries()).filter(
      (entry) => entry[0] !== SECTION_INDEX_ELEMENT_PATH,
    ),
  ).toIncludeSameMembers(
    Array.from(graphHashesIndex.entries()).filter(
      (entry) => entry[0] !== SECTION_INDEX_ELEMENT_PATH,
    ),
  );
};

export const TEST__checkBuildingElementsRoundtrip = async (
  entities: Entity[],
  pluginManager?: GraphPluginManager,
): Promise<void> => {
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: true,
  });

  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    TEST__ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    TEST__excludeSectionIndex(entities),
  );
  await TEST__checkGraphHashUnchanged(graphManagerState, entities);
};

export const TEST__checkBuildingResolvedElements = async (
  entities: Entity[],
  resolvedEntities: Entity[],
): Promise<void> => {
  const graphManagerState = TEST__getTestGraphManagerState();
  await graphManagerState.initializeSystem();
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
  );
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  // ensure that transformed entities have all fields ordered alphabetically
  transformedEntities.forEach((entity) =>
    TEST__ensureObjectFieldsAreSortedAlphabetically(entity.content),
  );
  // check if the contents are the same (i.e. roundtrip test)
  expect(transformedEntities).toIncludeSameMembers(
    TEST__excludeSectionIndex(resolvedEntities),
  );
};
