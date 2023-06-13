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

import { createModelSchema, list, optional, primitive } from 'serializr';
import { SerializationFactory, usingModelSchema } from '@finos/legend-shared';
import type { V1_PureModelContextData } from '../../model/context/V1_PureModelContextData.js';
import { V1_pureModelContextPropSchema } from '../../transformation/pureProtocol/V1_PureProtocolSerialization.js';
import {
  ArtifactGenerationExtensionResult,
  ArtifactExtensionResult,
  ArtifactsByExtensionElement,
} from '../../../../../action/generation/ArtifactGenerationExtensionResult.js';
import { V1_buildGenerationOutput } from '../V1_EngineHelper.js';
import { V1_GenerationOutput } from './V1_GenerationOutput.js';

export class V1_SerializedArtifactsByExtensionElement {
  element!: string;
  files: V1_GenerationOutput[] = [];
  extension!: string;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_SerializedArtifactsByExtensionElement, {
      element: primitive(),
      files: list(usingModelSchema(V1_GenerationOutput.serialization.schema)),
      extension: primitive(),
    }),
  );
}

export class V1_SerializedArtifactExtensionResult {
  extension!: string;
  artifactsByExtensionElement: V1_SerializedArtifactsByExtensionElement[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_SerializedArtifactExtensionResult, {
      extension: primitive(),
      artifactsByExtensionElement: list(
        usingModelSchema(
          V1_SerializedArtifactsByExtensionElement.serialization.schema,
        ),
      ),
    }),
  );
}

export class V1_ArtifactGenerationExtensionOutput {
  values: V1_SerializedArtifactExtensionResult[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ArtifactGenerationExtensionOutput, {
      values: list(
        usingModelSchema(
          V1_SerializedArtifactExtensionResult.serialization.schema,
        ),
      ),
    }),
  );
}

export class V1_ArtifactGenerationExtensionInput {
  clientVersion: string | undefined;
  model: V1_PureModelContextData;
  includeElementPaths: string[] = [];
  excludedExtensionKeys: string[] = [];

  constructor(model: V1_PureModelContextData, includeElementPaths: string[]) {
    this.model = model;
    this.includeElementPaths = includeElementPaths;
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_ArtifactGenerationExtensionInput, {
      clientVersion: optional(primitive()),
      model: V1_pureModelContextPropSchema,
      includeElementPaths: list(primitive()),
      excludedExtensionKeys: list(primitive()),
    }),
  );
}

export const V1_buildArtifactsByExtensionElement = (
  input: V1_ArtifactGenerationExtensionOutput,
): ArtifactGenerationExtensionResult => {
  const result = new ArtifactGenerationExtensionResult();
  result.values = input.values.map((v) => {
    const _result = new ArtifactExtensionResult(v.extension);
    _result.artifactsByExtensionElements = v.artifactsByExtensionElement.map(
      (_v) => {
        const __result = new ArtifactsByExtensionElement(_v.extension);
        __result.element = _v.element;
        __result.files = _v.files.map(V1_buildGenerationOutput);
        return __result;
      },
    );
    return _result;
  });
  return result;
};
