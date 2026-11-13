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

import {
  type AbstractPureGraphManager,
  PureClientVersion,
  V1_PureGraphManager,
  V1_RemoteEngine,
} from '@finos/legend-graph';
import {
  type PlainObject,
  SerializationFactory,
  guaranteeType,
} from '@finos/legend-shared';
import { createModelSchema, list, optional, primitive, raw } from 'serializr';
import {
  type GraphQLIntrospectionInput,
  GraphQLIntrospectionResult,
  STO_GraphQL_PureGraphManagerExtension,
} from '../STO_GraphQL_PureGraphManagerExtension.js';

const GENERATE_MODELS_FROM_INTROSPECTION =
  'generate GraphQL models from introspection';

export class V1_GraphQLIntrospectionInput {
  url!: string;
  authenticationSpecification?: PlainObject<unknown> | undefined;
  storePath!: string;
  targetPackage!: string;
  targetBindingPath!: string;
  targetMappingPath!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GraphQLIntrospectionInput, {
      authenticationSpecification: optional(raw()),
      storePath: primitive(),
      targetBindingPath: primitive(),
      targetMappingPath: primitive(),
      targetPackage: primitive(),
      url: primitive(),
    }),
  );
}

export class V1_GraphQLIntrospectionResult {
  grammar!: string;
  skippedTypes: string[] = [];
  warnings: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_GraphQLIntrospectionResult, {
      grammar: primitive(),
      skippedTypes: list(primitive()),
      warnings: list(primitive()),
    }),
    { deserializeNullAsUndefined: true },
  );
}

export class V1_STO_GraphQL_PureGraphManagerExtension extends STO_GraphQL_PureGraphManagerExtension {
  declare graphManager: V1_PureGraphManager;

  constructor(graphManager: AbstractPureGraphManager) {
    super(graphManager);
    this.graphManager = guaranteeType(graphManager, V1_PureGraphManager);
  }

  getSupportedProtocolVersion(): string {
    return PureClientVersion.V1_0_0;
  }

  async generateModelsFromIntrospection(
    input: GraphQLIntrospectionInput,
  ): Promise<GraphQLIntrospectionResult> {
    const protocol = new V1_GraphQLIntrospectionInput();
    protocol.url = input.url;
    protocol.authenticationSpecification = input.authenticationSpecification;
    protocol.storePath = input.storePath;
    protocol.targetPackage = input.targetPackage;
    protocol.targetBindingPath = input.targetBindingPath;
    protocol.targetMappingPath = input.targetMappingPath;

    const engineServerClient = guaranteeType(
      this.graphManager.engine,
      V1_RemoteEngine,
      'generateModelsFromIntrospection is only supported by remote engine',
    ).getEngineServerClient();
    const result = V1_GraphQLIntrospectionResult.serialization.fromJson(
      await engineServerClient.postWithTracing<
        PlainObject<V1_GraphQLIntrospectionResult>
      >(
        engineServerClient.getTraceData(GENERATE_MODELS_FROM_INTROSPECTION),
        `${engineServerClient._pure()}/graphQL/generateModelsFromIntrospection`,
        V1_GraphQLIntrospectionInput.serialization.toJson(protocol),
      ),
    );
    return new GraphQLIntrospectionResult(
      result.grammar,
      result.skippedTypes,
      result.warnings,
    );
  }
}
