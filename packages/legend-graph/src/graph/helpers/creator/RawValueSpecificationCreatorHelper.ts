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

import { Multiplicity } from '../../metamodel/pure/packageableElements/domain/Multiplicity.js';
import type { Type } from '../../metamodel/pure/packageableElements/domain/Type.js';
import { PackageableElementExplicitReference } from '../../metamodel/pure/packageableElements/PackageableElementReference.js';
import { RawLambda } from '../../metamodel/pure/rawValueSpecification/RawLambda.js';
import { RawVariableExpression } from '../../metamodel/pure/rawValueSpecification/RawVariableExpression.js';

export const stub_RawVariableExpression = (type: Type): RawVariableExpression =>
  new RawVariableExpression(
    '',
    Multiplicity.ONE,
    PackageableElementExplicitReference.create(type),
  );

export const stub_RawLambda = (): RawLambda =>
  new RawLambda(undefined, undefined);

export const create_RawLambda = (
  parameters: object | undefined,
  body: object | undefined,
): RawLambda => new RawLambda(parameters, body);

export const isStubbed_RawLambda = (rawLambda: RawLambda): boolean =>
  !rawLambda.body && !rawLambda.parameters;
