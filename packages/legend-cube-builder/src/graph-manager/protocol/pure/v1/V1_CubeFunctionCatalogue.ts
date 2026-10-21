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
  type PlainObject,
  SerializationFactory,
  usingModelSchema,
} from '@finos/legend-shared';
import { alias, createModelSchema, list, optional, primitive } from 'serializr';
import {
  CubeFunction,
  CubeFunctionCatalogue,
  CubeFunctionParameter,
  CubeFunctionSignature,
  parseCubeFunctionSignature,
  readCubeFunctionParameterNames,
} from '../../../CubeFunctionCatalogue.js';

// The engine's PCT documentation (`/api/pct/pct-docs.json`, built by
// legend-pure's `DocumentationGeneration`), read for its functions'
// signatures and documentation; its test results by database are left for
// later (EXPRESSION-EDITOR.md, round 2)

export class V1_CubePCTFunctionSignature {
  /** As Pure writes it: `meta::pure::functions::string::contains(String[1], String[1]):Boolean[1]` */
  simple!: string;
  /** Its package path, then its name and types: `meta::pure::functions::string::contains_String_1__…` */
  id!: string;
  documentation?: string | undefined;
  /** The operator written for it, e.g. `+` for `plus` */
  grammarCharacter?: string | undefined;
  platformOnly?: boolean | undefined;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubePCTFunctionSignature, {
      simple: primitive(),
      id: primitive(),
      documentation: optional(primitive()),
      grammarCharacter: optional(primitive()),
      platformOnly: optional(primitive()),
    }),
  );
}

export class V1_CubePCTFunctionDefinition {
  packagePath?: string | undefined;
  name!: string;
  signatures: V1_CubePCTFunctionSignature[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubePCTFunctionDefinition, {
      packagePath: alias('_package', optional(primitive())),
      name: primitive(),
      signatures: list(
        usingModelSchema(V1_CubePCTFunctionSignature.serialization.schema),
      ),
    }),
  );
}

export class V1_CubePCTFunctionDocumentation {
  functionDefinition!: V1_CubePCTFunctionDefinition;

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubePCTFunctionDocumentation, {
      functionDefinition: usingModelSchema(
        V1_CubePCTFunctionDefinition.serialization.schema,
      ),
    }),
  );
}

export class V1_CubePCTDocumentation {
  functionsDocumentation: V1_CubePCTFunctionDocumentation[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(V1_CubePCTDocumentation, {
      functionsDocumentation: list(
        usingModelSchema(V1_CubePCTFunctionDocumentation.serialization.schema),
      ),
    }),
  );
}

/** A signature read from the documentation; undefined when its text can't be read */
const buildSignature = (
  signature: V1_CubePCTFunctionSignature,
): CubeFunctionSignature | undefined => {
  const parsed = parseCubeFunctionSignature(signature.simple);
  if (!parsed) {
    return undefined;
  }
  const documentation = signature.documentation ?? '';
  // the documentation's names, when it names every parameter
  const named = readCubeFunctionParameterNames(documentation);
  const parameters = parsed.parameters.map(
    (parameter, index) =>
      new CubeFunctionParameter(
        named.length === parsed.parameters.length
          ? named[index]?.name
          : undefined,
        parameter.type,
        parameter.multiplicity,
        named.length === parsed.parameters.length
          ? named[index]?.description
          : undefined,
      ),
  );
  return new CubeFunctionSignature(
    signature.id,
    parsed.name,
    parameters,
    parsed.returnType,
    parsed.returnMultiplicity,
    documentation,
    Boolean(signature.grammarCharacter),
    Boolean(signature.platformOnly),
  );
};

/** The functions of the engine's PCT documentation, by name across their packages */
export const V1_buildCubeFunctionCatalogue = (
  json: PlainObject,
): CubeFunctionCatalogue => {
  const documentation = V1_CubePCTDocumentation.serialization.fromJson(json);
  const byName = new Map<
    string,
    { packages: string[]; signatures: CubeFunctionSignature[] }
  >();
  documentation.functionsDocumentation.forEach(({ functionDefinition }) => {
    const signatures = functionDefinition.signatures.flatMap((signature) => {
      const built = buildSignature(signature);
      return built ? [built] : [];
    });
    if (!signatures.length) {
      return;
    }
    const entry = byName.get(functionDefinition.name) ?? {
      packages: [],
      signatures: [],
    };
    if (functionDefinition.packagePath) {
      entry.packages.push(functionDefinition.packagePath);
    }
    entry.signatures.push(...signatures);
    byName.set(functionDefinition.name, entry);
  });
  return new CubeFunctionCatalogue(
    [...byName].map(
      ([name, entry]) =>
        new CubeFunction(name, entry.packages, entry.signatures),
    ),
  );
};
