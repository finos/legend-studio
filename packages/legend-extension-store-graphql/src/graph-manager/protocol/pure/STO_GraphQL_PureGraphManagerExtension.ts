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
  AbstractPureGraphManagerExtension,
} from '@finos/legend-graph';
import { type PlainObject, guaranteeNonNullable } from '@finos/legend-shared';

export class GraphQLIntrospectionInput {
  url: string;
  authenticationSpecification?: PlainObject<unknown> | undefined;
  storePath: string;
  targetPackage: string;
  targetBindingPath: string;
  targetMappingPath: string;

  constructor(
    url: string,
    storePath: string,
    targetPackage: string,
    targetBindingPath: string,
    targetMappingPath: string,
    authenticationSpecification?: PlainObject<unknown> | undefined,
  ) {
    this.url = url;
    this.storePath = storePath;
    this.targetPackage = targetPackage;
    this.targetBindingPath = targetBindingPath;
    this.targetMappingPath = targetMappingPath;
    this.authenticationSpecification = authenticationSpecification;
  }
}

export class GraphQLIntrospectionResult {
  grammar: string;
  skippedTypes: string[];
  warnings: string[];

  constructor(
    grammar: string,
    skippedTypes: string[],
    warnings: string[] = [],
  ) {
    this.grammar = grammar;
    this.skippedTypes = skippedTypes;
    this.warnings = warnings;
  }
}

export abstract class STO_GraphQL_PureGraphManagerExtension extends AbstractPureGraphManagerExtension {
  abstract generateModelsFromIntrospection(
    input: GraphQLIntrospectionInput,
  ): Promise<GraphQLIntrospectionResult>;
}

export const getGraphQLPureGraphManagerExtension = (
  graphManager: AbstractPureGraphManager,
): STO_GraphQL_PureGraphManagerExtension =>
  guaranteeNonNullable(
    graphManager.extensions.find(
      (extension) => extension instanceof STO_GraphQL_PureGraphManagerExtension,
    ),
    `Can't find GraphQL store Pure graph manager extension`,
  );
