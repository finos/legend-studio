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
  SerializationFactory,
  isPlainObject,
  isString,
  type PlainObject,
} from '@finos/legend-shared';
import { createModelSchema, optional, primitive } from 'serializr';

// as in @finos/legend-extension-dsl-data-space, which the dashboard does not
// depend on
export const DEPOT_DATA_SPACE_CLASSIFIER_PATH =
  'meta::pure::metamodel::dataSpace::DataSpace';

const DEPOT_DATA_SPACE_TEMPLATE_EXECUTABLE_TYPE = 'dataSpaceTemplateExecutable';

export const DEPOT_DATA_SPACE_NO_SUPPORT_INFO = 'None';

// the support info kinds a data space can declare
const SUPPORT_INFO_LABEL: Record<string, string> = {
  email: 'Email',
  combined: 'Combined',
  full: 'Full',
};

const readList = (value: unknown): PlainObject[] =>
  Array.isArray(value) ? value.filter(isPlainObject) : [];

const readPointerPath = (value: unknown): string | undefined =>
  isPlainObject(value) && isString(value.path) ? value.path : undefined;

/**
 * The parts of a data space's content the Depot dashboard counts. Read leniently,
 * like the generation specification model: a missing list counts as empty.
 */
export class DepotDataSpace {
  title?: string | undefined;
  description?: string | undefined;
  defaultExecutionContext?: string | undefined;
  executionContextNames: string[] = [];
  // template queries and functions, services... published as executables
  templateQueryCount = 0;
  elementExecutableCount = 0;
  executableTitles: string[] = [];
  diagramPaths: string[] = [];
  // the elements it lists for its users to see
  elementCount = 0;
  // the mappings its execution contexts use, each once
  mappingPaths: string[] = [];
  supportLabel = DEPOT_DATA_SPACE_NO_SUPPORT_INFO;

  static readonly serialization = new SerializationFactory(
    createModelSchema(DepotDataSpace, {
      title: optional(primitive()),
      description: optional(primitive()),
      defaultExecutionContext: optional(primitive()),
    }),
  );

  static fromContent(content: PlainObject): DepotDataSpace {
    const dataSpace = DepotDataSpace.serialization.fromJson(content);
    const executionContexts = readList(content.executionContexts);
    dataSpace.executionContextNames = executionContexts
      .map((context) => context.name)
      .filter(isString);
    dataSpace.mappingPaths = Array.from(
      new Set(
        executionContexts
          .map((context) => readPointerPath(context.mapping))
          .filter(isString),
      ),
    );
    dataSpace.elementCount = readList(content.elements).length;
    readList(content.executables).forEach((executable) => {
      if (executable._type === DEPOT_DATA_SPACE_TEMPLATE_EXECUTABLE_TYPE) {
        dataSpace.templateQueryCount += 1;
      } else {
        dataSpace.elementExecutableCount += 1;
      }
      if (isString(executable.title)) {
        dataSpace.executableTitles.push(executable.title);
      }
    });
    // older data spaces list featured diagrams, which Studio reads as diagrams
    dataSpace.diagramPaths = [
      ...readList(content.diagrams).map((diagram) =>
        readPointerPath(diagram.diagram),
      ),
      ...readList(content.featuredDiagrams).map(readPointerPath),
    ].filter(isString);
    const supportInfo = content.supportInfo;
    if (isPlainObject(supportInfo) && isString(supportInfo._type)) {
      dataSpace.supportLabel =
        SUPPORT_INFO_LABEL[supportInfo._type] ?? supportInfo._type;
    }
    return dataSpace;
  }

  get executableCount(): number {
    return this.templateQueryCount + this.elementExecutableCount;
  }
}
