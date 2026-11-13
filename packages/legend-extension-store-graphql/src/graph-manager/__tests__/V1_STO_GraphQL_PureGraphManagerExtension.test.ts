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

import { describe, expect, jest, test } from '@jest/globals';
import { unitTest } from '@finos/legend-shared/test';
import { guaranteeType } from '@finos/legend-shared';
import {
  Core_GraphManagerPreset,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import {
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
} from '@finos/legend-graph/test';
import { STO_GraphQL_GraphManagerPreset } from '../STO_GraphQL_GraphManagerPreset.js';
import {
  GraphQLIntrospectionInput,
  getGraphQLPureGraphManagerExtension,
} from '../protocol/pure/STO_GraphQL_PureGraphManagerExtension.js';

const setup = () => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new STO_GraphQL_GraphManagerPreset(),
    ])
    .install();
  const graphManager = guaranteeType(
    TEST__getTestGraphManagerState(pluginManager).graphManager,
    V1_PureGraphManager,
  );
  const client = guaranteeType(
    graphManager.engine,
    V1_RemoteEngine,
  ).getEngineServerClient();
  return {
    extension: getGraphQLPureGraphManagerExtension(graphManager),
    post: jest.spyOn(client, 'postWithTracing'),
  };
};

describe(unitTest('GraphQL introspection engine call'), () => {
  test('posts the input to the introspection endpoint and maps the result', async () => {
    const { extension, post } = setup();
    post.mockResolvedValue({
      grammar: '###Pure\nClass a::Query {}',
      skippedTypes: ['Query.legacy'],
      warnings: ["custom scalar 'FlexibleDate' is modelled as String"],
    } as never);

    const result = await extension.generateModelsFromIntrospection(
      new GraphQLIntrospectionInput(
        'http://localhost:4000/graphql',
        'a::Store',
        'a::gen',
        'a::gen',
        'a::gen::Mapping',
      ),
    );

    expect(result.grammar).toBe('###Pure\nClass a::Query {}');
    expect(result.skippedTypes).toEqual(['Query.legacy']);
    expect(result.warnings).toEqual([
      "custom scalar 'FlexibleDate' is modelled as String",
    ]);
    expect(post).toHaveBeenCalledTimes(1);
    const [, url, body] = post.mock.calls[0] as [unknown, string, unknown];
    expect(
      url.endsWith('/pure/v1/graphQL/generateModelsFromIntrospection'),
    ).toBe(true);
    // no auth spec given, so the field must be absent, not null or {}
    expect(body).toEqual({
      url: 'http://localhost:4000/graphql',
      storePath: 'a::Store',
      targetPackage: 'a::gen',
      targetBindingPath: 'a::gen',
      targetMappingPath: 'a::gen::Mapping',
    });
    expect(body).not.toHaveProperty('authenticationSpecification');
  });

  test('passes an authentication specification through untouched', async () => {
    const { extension, post } = setup();
    post.mockResolvedValue({ grammar: 'g', skippedTypes: [] } as never);

    await extension.generateModelsFromIntrospection(
      new GraphQLIntrospectionInput(
        'http://x/graphql',
        'a::Store',
        'a::gen',
        'a::gen',
        'a::gen::Mapping',
        { _type: 'oneGS' },
      ),
    );

    const [, , body] = post.mock.calls[0] as [unknown, string, unknown];
    expect(body).toMatchObject({
      authenticationSpecification: { _type: 'oneGS' },
    });
  });

  test('tolerates a null skippedTypes and an empty grammar from the engine', async () => {
    const { extension, post } = setup();
    post.mockResolvedValue({ grammar: '', skippedTypes: null } as never);

    const result = await extension.generateModelsFromIntrospection(
      new GraphQLIntrospectionInput(
        'http://x/graphql',
        'a::S',
        'a',
        'a',
        'a::M',
      ),
    );

    expect(result.grammar).toBe('');
    expect(result.skippedTypes).toEqual([]);
    expect(result.warnings).toEqual([]);
  });
});
