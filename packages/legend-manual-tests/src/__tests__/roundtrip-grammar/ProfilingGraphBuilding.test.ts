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

// NOTE: mock these methods to make sure we rule out false positive. The grammar parser for any List type field,
// will generate empty array, however, in Studio, we avoid that to lessen the size of the serialized graph
// to save bandwidth, as such the best action is just to mock these methods so in the scope of this test, Studio
// serializers return empty array for these fields just like the parser's
jest.mock('@finos/legend-shared', () => ({
  ...jest.requireActual('@finos/legend-shared'),
  /* eslint-disable @typescript-eslint/no-explicit-any */
  serializeArray: (
    values: any,
    itemSerializer: (val: any) => any,
    skipIfEmpty: boolean,
  ): any[] =>
    Array.isArray(values)
      ? values.length
        ? values.map((value) => itemSerializer(value))
        : []
      : [],
  deserializeArray: (
    values: any,
    itemDeserializer: (val: any) => any,
    skipIfEmpty: boolean,
  ): any[] => (Array.isArray(values) ? values.map(itemDeserializer) : []),
  /* eslint-enable @typescript-eslint/no-explicit-any */
}));

import { resolve } from 'path';
import fs from 'fs';
import axios, { type AxiosResponse } from 'axios';
import { WebConsole, Log, LogEvent } from '@finos/legend-shared';
import {
  TEST__GraphPluginManager,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  DSLExternalFormat_GraphPreset,
  GRAPH_MANAGER_LOG_EVENT,
  V1_ENGINE_LOG_EVENT,
} from '@finos/legend-graph';
import { DSLText_GraphPreset } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_GraphPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLDataSpace_GraphPreset } from '@finos/legend-extension-dsl-data-space';
import { ESService_GraphPreset } from '@finos/legend-extension-external-store-service';

const engineConfig = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../../engine-config.json'), {
    encoding: 'utf-8',
  }),
) as object;
const ENGINE_SERVER_PORT = (engineConfig as any).server.connector // eslint-disable-line @typescript-eslint/no-explicit-any
  .port as number;
const ENGINE_SERVER_URL = `http://localhost:${ENGINE_SERVER_PORT}/api`;

enum Profile_TEST_PHASE {
  ENGINE_GRAMMAR_TO_JSON = 'ENGINE_GRAMMAR_TO_JSON',
  GRAPH_BUILDING = 'GRAPH_BUILDING',
  ENGINE_JSON_TO_GRAMMAR = 'ENGINE_JSON_TO_GRAMMAR',
  ENGINE_COMPILATION = 'ENGINE_COMPILATION',
  SERIALIZATION = 'SERIALIZATION',
}

const DEFAULT_GENERATIONS = 5000;

const generateBarePureClassCode = (
  className: string | number,
  packageName?: string,
): string => `Class ${packageName ?? 'model'}::class_${className}{} `;

const generateBarePureProfileCode = (
  className: string | number,
  packageName?: string,
): string => `Profile ${packageName ?? 'model'}::profile_${className}{} `;

const generateBarePureEnumCode = (
  className: string | number,
  packageName?: string,
): string => `Enum ${packageName ?? 'model'}::enum_${className}{} `;
const generateBarePureMappingCode = (
  className: string | number,
  packageName?: string,
): string =>
  `###Mapping\n Mapping ${packageName ?? 'model'}::mapping_${className}() \n`;

function generateBatchPureCode(
  _func: (idx: number) => string,
  idx = DEFAULT_GENERATIONS,
): string {
  let i = 0;
  let result = '';
  while (i < idx) {
    result = result + _func(i);
    i = i + 1;
  }
  return result;
}

function generatePureCode(options: ProfileRoundtripOptions): string {
  let pureCode = '';
  pureCode = `${
    pureCode +
    generateBatchPureCode(
      (idx: number) => generateBarePureClassCode(idx),
      options.classes,
    )
  }\n${generateBatchPureCode(
    (idx: number) => generateBarePureProfileCode(idx),
    options.profiles,
  )}\n${generateBatchPureCode(
    (idx: number) => generateBarePureEnumCode(idx),
    options.enums,
  )}\n${generateBatchPureCode(
    (idx: number) => generateBarePureMappingCode(idx),
    options.mappings,
  )}`;
  return pureCode;
}
const logPhase = (
  phase: Profile_TEST_PHASE,
  log: Log,
  debug?: boolean,
): void => {
  if (debug) {
    log.info(LogEvent.create(`Running phase '${phase}'`));
  }
};

const logSuccess = (
  phase: Profile_TEST_PHASE,
  log: Log,
  debug?: boolean,
): void => {
  if (debug) {
    log.info(LogEvent.create(`Success running phase '${phase}'`));
  }
};

type ProfileRoundtripOptions = {
  name: string;
  classes: number;
  enums: number;
  profiles: number;
  mappings: number;
  debug?: boolean;
};

const defaultOptions = {
  name: 'default',
  classes: DEFAULT_GENERATIONS,
  enums: DEFAULT_GENERATIONS,
  profiles: DEFAULT_GENERATIONS,
  mappings: DEFAULT_GENERATIONS,
  debug: true,
};
const profileRoundtrip = async (
  options: ProfileRoundtripOptions,
): Promise<void> => {
  const pluginManager = new TEST__GraphPluginManager();
  pluginManager
    .usePresets([
      new DSLText_GraphPreset(),
      new DSLDiagram_GraphPreset(),
      new DSLExternalFormat_GraphPreset(),
      new DSLDataSpace_GraphPreset(),
      new ESService_GraphPreset(),
    ])
    .usePlugins([new WebConsole()]);
  pluginManager.install();
  const log = new Log();
  log.registerPlugins(pluginManager.getLoggerPlugins());
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager, log);

  if (options.debug) {
    log.info(
      LogEvent.create(
        `Profile test case ${options.name}. [classes: ${options.classes}]`,
      ),
    );
  }

  // Phase 1: Engine Grammar to Json
  let phase = Profile_TEST_PHASE.ENGINE_GRAMMAR_TO_JSON;
  logPhase(phase, log, options.debug);
  const grammarText = generatePureCode(options);

  let startTime = Date.now();
  const transformGrammarToJsonResult = await axios.post<
    unknown,
    AxiosResponse<{ modelDataContext: { elements: object[] } }>
  >(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformGrammarToJson`,
    {
      code: grammarText,
    },
    {},
  );
  if (options.debug) {
    log.info(
      LogEvent.create(V1_ENGINE_LOG_EVENT.GRAMMAR_TO_JSON),
      Date.now() - startTime,
      'ms',
    );
  }
  const entities = graphManagerState.graphManager.pureProtocolToEntities(
    JSON.stringify(transformGrammarToJsonResult.data.modelDataContext),
  );
  if (options.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_ENTITIES_FETCHED),
      `[entities: ${entities.length}]`,
    );
  }
  // Phase 2: Build Graph
  phase = Profile_TEST_PHASE.GRAPH_BUILDING;
  startTime = Date.now();
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__keepSectionIndex: true,
    quiet: !options.debug,
  });
  if (options.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_INITIALIZED),
      Date.now() - startTime,
      'ms',
    );
  }
  // Phase 3: Serialization
  phase = Profile_TEST_PHASE.SERIALIZATION;
  startTime = Date.now();
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  if (options.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_LOG_EVENT.GRAPH_PROTOCOL_SERIALIZED),
      Date.now() - startTime,
      'ms',
    );
  }
  logPhase(phase, log, options.debug);

  // Phase 3: grammar roundtrip check
  phase = Profile_TEST_PHASE.ENGINE_JSON_TO_GRAMMAR;
  logPhase(phase, log, options.debug);
  // compose grammar and compare that with original grammar text
  // NOTE: this is optional test as `grammar text <-> protocol` test should be covered
  // in engine already.
  // Here, we do it just so we might be able to detect problem in the grammar roundtrip in engine
  // we include the sections to guarantee the ordering of elements
  const sectionIndices = graphManagerState.graph.ownSectionIndices.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  const modelDataContext = {
    _type: 'data',
    elements: transformedEntities
      .concat(sectionIndices)
      .map((entity) => entity.content),
  };
  startTime = Date.now();
  await axios.post<unknown, AxiosResponse<{ code: string }>>(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformJsonToGrammar`,
    {
      modelDataContext,
      renderStyle: 'STANDARD',
    },
    {},
  );
  if (options.debug) {
    log.info(
      LogEvent.create(V1_ENGINE_LOG_EVENT.JSON_TO_GRAMMAR),
      Date.now() - startTime,
      'ms',
    );
  }
  // Phase 4: Compilation check using serialized protocol
  phase = Profile_TEST_PHASE.ENGINE_COMPILATION;
  logPhase(phase, log, options.debug);

  // Test successful compilation with graph from serialization
  startTime = Date.now();
  const compileResult = await axios.post<
    unknown,
    AxiosResponse<{ message: string }>
  >(`${ENGINE_SERVER_URL}/pure/v1/compilation/compile`, modelDataContext);
  if (options.debug) {
    log.info(
      LogEvent.create(V1_ENGINE_LOG_EVENT.COMPILATION),
      Date.now() - startTime,
      'ms',
    );
  }
  expect(compileResult.status).toBe(200);
  expect(compileResult.data.message).toEqual('OK');
  logSuccess(phase, log, options.debug);
};

const cases: [ProfileRoundtripOptions] = [defaultOptions];

describe.skip('Profiling Graph Building test', () => {
  test.each(cases)(
    '%s',
    async (option) => {
      await profileRoundtrip(option);
    },
    100000,
  );
});
