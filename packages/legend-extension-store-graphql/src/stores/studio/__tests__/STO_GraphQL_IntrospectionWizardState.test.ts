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

import { beforeEach, describe, expect, jest, test } from '@jest/globals';
import { flowResult } from 'mobx';
import type { Entity } from '@finos/legend-storage';
import { unitTest } from '@finos/legend-shared/test';
import type { EditorStore } from '@finos/legend-application-studio';
import {
  Core_GraphManagerPreset,
  PackageableElementExplicitReference,
  type PackageableElement,
} from '@finos/legend-graph';
import {
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import { STO_GraphQL_GraphManagerPreset } from '../../../graph-manager/STO_GraphQL_GraphManagerPreset.js';
import { GraphQLConnection } from '../../../graph/metamodel/pure/model/packageableElements/store/graphQL/connection/STO_GraphQL_GraphQLConnection.js';
import { getGraphQLStore } from '../../../graph-manager/STO_GraphQL_GraphManagerHelper.js';
import {
  GraphQLIntrospectionResult,
  getGraphQLPureGraphManagerExtension,
} from '../../../graph-manager/protocol/pure/STO_GraphQL_PureGraphManagerExtension.js';
import { GraphQLIntrospectionWizardState } from '../STO_GraphQL_IntrospectionWizardState.js';

const STORE_PATH = 'demo::Store';

const existingEntities: Entity[] = [
  {
    path: STORE_PATH,
    content: {
      _type: 'graphQLStore',
      includedStores: [],
      name: 'Store',
      package: 'demo',
      schema: { sdl: 'old' },
    },
    classifierPath:
      'meta::external::store::graphQL::metamodel::pure::GraphQLStore',
  },
];

const generatedEntities = (targetPackage: string): Entity[] => [
  {
    path: `${targetPackage}::Query`,
    content: {
      _type: 'class',
      name: 'Query',
      package: targetPackage,
      properties: [
        {
          name: 'employeeProxy',
          multiplicity: { lowerBound: 0, upperBound: 1 },
          genericType: {
            rawType: { _type: 'packageableType', fullPath: 'String' },
          },
          taggedValues: [
            {
              tag: {
                profile:
                  'meta::external::store::graphQL::generation::GeneratedProxyProfile',
                value: 'generatedProxyForQualifiedProperty',
              },
              value: 'employee',
            },
          ],
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: `${targetPackage}::GeneratedSchema`,
    content: {
      _type: 'externalFormatSchemaSet',
      format: 'JSON',
      name: 'GeneratedSchema',
      package: targetPackage,
      schemas: [{ content: '{}', id: 'Query', location: 'Query.json' }],
    },
    classifierPath: 'meta::external::format::shared::metamodel::SchemaSet',
  },
  {
    path: `${targetPackage}::GeneratedBinding`,
    content: {
      _type: 'binding',
      contentType: 'application/json',
      modelUnit: {
        packageableElementExcludes: [],
        packageableElementIncludes: [`${targetPackage}::Query`],
      },
      name: 'GeneratedBinding',
      package: targetPackage,
      schemaSet: `${targetPackage}::GeneratedSchema`,
    },
    classifierPath: 'meta::external::format::shared::binding::Binding',
  },
  {
    path: `${targetPackage}::GeneratedMapping`,
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'graphQLClassMapping',
          bindingPath: `${targetPackage}::GeneratedBinding`,
          class: `${targetPackage}::Query`,
          root: true,
          storePath: STORE_PATH,
          typeName: 'Query',
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'GeneratedMapping',
      package: targetPackage,
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: STORE_PATH,
    content: {
      _type: 'graphQLStore',
      includedStores: [],
      name: 'Store',
      package: 'demo',
      schema: { sdl: 'new' },
    },
    classifierPath:
      'meta::external::store::graphQL::metamodel::pure::GraphQLStore',
  },
];

const setup = async (
  extraExistingEntities: Entity[] = [],
  url = 'http://localhost:4000/graphql',
) => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new STO_GraphQL_GraphManagerPreset(),
    ])
    .install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);
  await TEST__buildGraphWithEntities(graphManagerState, [
    ...existingEntities,
    ...extraExistingEntities,
  ]);

  const notificationService = {
    notifyError: jest.fn(),
    notifySuccess: jest.fn(),
    notifyWarning: jest.fn(),
  };
  const added: string[] = [];
  const globalCompile = jest.fn(async () => undefined);
  const editorStore = {
    graphManagerState,
    graphEditorMode: {
      addElement: jest.fn(
        async (
          element: PackageableElement,
          packagePath: string | undefined,
        ) => {
          graphManagerState.graph.addElement(element, packagePath);
          added.push(element.path);
        },
      ),
      globalCompile,
    },
    applicationStore: {
      notificationService,
      logService: { error: jest.fn() },
    },
  } as unknown as EditorStore;

  const store = getGraphQLStore(STORE_PATH, graphManagerState.graph);
  const connection = new GraphQLConnection(
    PackageableElementExplicitReference.create(store),
  );
  connection.url = url;
  const state = new GraphQLIntrospectionWizardState(editorStore, connection);
  return {
    state,
    globalCompile,
    editorStore,
    graphManagerState,
    notificationService,
    added,
    store,
  };
};

describe(unitTest('GraphQL introspection wizard'), () => {
  beforeEach(() => {
    jest.restoreAllMocks();
  });

  test('defaults the target package to a sub-package of the store package', async () => {
    const { state } = await setup();
    expect(state.targetPackage).toBe('demo::generated');
    expect(state.storePath).toBe(STORE_PATH);
  });

  test('refuses to generate without a connection URL', async () => {
    const { state, graphManagerState, notificationService } = await setup(
      [],
      '',
    );
    const generate = jest.spyOn(
      getGraphQLPureGraphManagerExtension(graphManagerState.graphManager),
      'generateModelsFromIntrospection',
    );
    await flowResult(state.generate());
    expect(generate).not.toHaveBeenCalled();
    expect(notificationService.notifyWarning).toHaveBeenCalledTimes(1);
  });

  test('generate sends the connection and targets, then stores the preview', async () => {
    const { state, graphManagerState } = await setup();
    state.connection.authenticationSpecification = { _type: 'oneGS' };
    const generate = jest
      .spyOn(
        getGraphQLPureGraphManagerExtension(graphManagerState.graphManager),
        'generateModelsFromIntrospection',
      )
      .mockResolvedValue(
        new GraphQLIntrospectionResult(
          'grammar',
          ['Query.x'],
          ["custom scalar 'FlexibleDate' is modelled as String"],
        ),
      );

    await flowResult(state.generate());

    expect(generate).toHaveBeenCalledWith(
      expect.objectContaining({
        url: 'http://localhost:4000/graphql',
        storePath: STORE_PATH,
        targetPackage: 'demo::generated',
        // the engine appends ::GeneratedBinding to this package
        targetBindingPath: 'demo::generated',
        targetMappingPath: 'demo::generated::GeneratedMapping',
        authenticationSpecification: { _type: 'oneGS' },
      }),
    );
    expect(state.grammarPreview).toBe('grammar');
    expect(state.skippedTypes).toEqual(['Query.x']);
    expect(state.warnings).toEqual([
      "custom scalar 'FlexibleDate' is modelled as String",
    ]);
  });

  test('editing a target clears a stale preview', async () => {
    const { state } = await setup();
    state.grammarPreview = 'stale';
    state.setTargetPackage('demo::other');
    expect(state.grammarPreview).toBe('');
  });

  test('apply replaces the store schema and adds the generated elements', async () => {
    const {
      state,
      graphManagerState,
      globalCompile,
      notificationService,
      added,
      store,
    } = await setup();
    state.grammarPreview = 'preview';
    jest
      .spyOn(graphManagerState.graphManager, 'pureCodeToEntities')
      .mockResolvedValue(generatedEntities('demo::generated'));

    await flowResult(state.apply());

    expect(notificationService.notifyError).not.toHaveBeenCalled();
    expect(notificationService.notifySuccess).toHaveBeenCalledTimes(1);
    expect(store.schema).toEqual({ sdl: 'new' });
    expect(added.sort()).toEqual([
      'demo::generated::GeneratedBinding',
      'demo::generated::GeneratedMapping',
      'demo::generated::GeneratedSchema',
      'demo::generated::Query',
    ]);
    // the store itself is updated in place, never added a second time
    expect(added).not.toContain(STORE_PATH);
    expect(globalCompile).toHaveBeenCalledTimes(1);
    expect(state.showModal).toBe(false);
  });

  test('apply changes nothing when a generated element already exists', async () => {
    const { state, graphManagerState, notificationService, added, store } =
      await setup([
        {
          path: 'demo::generated::Query',
          content: {
            _type: 'class',
            name: 'Query',
            package: 'demo::generated',
            properties: [],
          },
          classifierPath: 'meta::pure::metamodel::type::Class',
        },
      ]);
    state.grammarPreview = 'preview';
    jest
      .spyOn(graphManagerState.graphManager, 'pureCodeToEntities')
      .mockResolvedValue(generatedEntities('demo::generated'));

    await flowResult(state.apply());

    expect(notificationService.notifyError).toHaveBeenCalledTimes(1);
    expect(
      String(notificationService.notifyError.mock.calls[0]?.[0]),
    ).toContain('demo::generated::Query');
    expect(added).toEqual([]);
    expect(store.schema).toEqual({ sdl: 'old' });
  });
});
