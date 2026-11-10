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
  isNonNullable,
  isObject,
  isString,
  SerializationFactory,
  usingModelSchema,
  type PlainObject,
} from '@finos/legend-shared';
import {
  createModelSchema,
  custom,
  list,
  optional,
  primitive,
  SKIP,
} from 'serializr';

/**
 * One stage of a generation specification: a single generation element, or
 * several generated in parallel against the same graph.
 */
export class DepotGenerationNode {
  id!: string;
  generationElement?: string | undefined;
  generationElements: string[] = [];

  static readonly serialization = new SerializationFactory(
    createModelSchema(DepotGenerationNode, {
      id: primitive(),
      generationElement: optional(primitive()),
      generationElements: optional(list(primitive())),
    }),
  );

  get elementPaths(): string[] {
    if (this.generationElements.length) {
      return this.generationElements;
    }
    return this.generationElement ? [this.generationElement] : [];
  }
}

// A file generation is referenced as a pointer (`{ type, path }`) or, in older
// entities, as a plain path
const toFileGenerationPath = (value: unknown): string | undefined => {
  if (isString(value)) {
    return value;
  }
  if (isObject(value)) {
    const path = (value as PlainObject).path;
    return isString(path) ? path : undefined;
  }
  return undefined;
};

/**
 * The parts of a generation specification the Depot dashboard shows, read
 * from the entity content Depot returns.
 */
export class DepotGenerationSpecification {
  generationNodes: DepotGenerationNode[] = [];
  fileGenerations: string[] = [];

  get stageCount(): number {
    return this.generationNodes.length;
  }

  get generationElementPaths(): string[] {
    return this.generationNodes.flatMap((node) => node.elementPaths);
  }

  static readonly serialization = new SerializationFactory(
    createModelSchema(DepotGenerationSpecification, {
      generationNodes: optional(
        list(usingModelSchema(DepotGenerationNode.serialization.schema)),
      ),
      fileGenerations: custom(
        () => SKIP,
        (value: unknown) =>
          Array.isArray(value)
            ? value.map(toFileGenerationPath).filter(isNonNullable)
            : [],
      ),
    }),
  );
}
