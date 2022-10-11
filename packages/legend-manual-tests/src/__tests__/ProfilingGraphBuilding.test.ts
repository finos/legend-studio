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

import { test, describe, expect } from '@jest/globals';
import { resolve } from 'path';
import fs from 'fs';
import { default as axios, type AxiosResponse } from 'axios';
import {
  WebConsole,
  Log,
  LogEvent,
  ContentType,
  type PlainObject,
  HttpHeader,
} from '@finos/legend-shared';
import {
  TEST__GraphManagerPluginManager,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  GRAPH_MANAGER_EVENT,
  type V1_PureModelContextData,
} from '@finos/legend-graph';

// NOTE: when we reorganize manual tests, i.e. when we remove this module
// we should consider moving this performance test to another module, maybe
// the one where we put the end-to-end tests
// See https://github.com/finos/legend-studio/issues/820

const engineConfig = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../engine-config.json'), {
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

function generatePureCode(options: ProfilingConfiguration): string {
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

type ProfilingConfiguration = {
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

const runProfiling = async (config: ProfilingConfiguration): Promise<void> => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager.usePlugins([new WebConsole()]);
  pluginManager.install();
  const log = new Log();
  log.registerPlugins(pluginManager.getLoggerPlugins());
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager, log);

  if (config.debug) {
    log.info(
      LogEvent.create(
        `Profile test case ${config.name}. [classes: ${config.classes}]`,
      ),
    );
  }

  // Phase 1: Engine Grammar to Json
  let phase = Profile_TEST_PHASE.ENGINE_GRAMMAR_TO_JSON;
  logPhase(phase, log, config.debug);
  const grammarText = generatePureCode(config);

  // TODO: refactor to use `StopWatch` instead
  let startTime = Date.now();
  const transformGrammarToJsonResult = await axios.post<
    unknown,
    AxiosResponse<PlainObject<V1_PureModelContextData>>
  >(`${ENGINE_SERVER_URL}/pure/v1/grammar/grammarToJson/model`, grammarText, {
    headers: {
      [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
    },
    params: {
      returnSourceInformation: false,
    },
  });
  if (config.debug) {
    log.info(
      LogEvent.create('engine.grammar.grammar-to-json'),
      Date.now() - startTime,
      'ms',
    );
  }
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult.data),
  );
  if (config.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED),
      `[entities: ${entities.length}]`,
    );
  }

  // Phase 2: Build Graph
  phase = Profile_TEST_PHASE.GRAPH_BUILDING;
  logPhase(phase, log, config.debug);
  startTime = Date.now();
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: true,
  });
  if (config.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
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
  if (config.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_PROTOCOL_SERIALIZED),
      Date.now() - startTime,
      'ms',
    );
  }
  logPhase(phase, log, config.debug);

  // Phase 3: grammar roundtrip check
  phase = Profile_TEST_PHASE.ENGINE_JSON_TO_GRAMMAR;
  logPhase(phase, log, config.debug);
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
  await axios.post<unknown, AxiosResponse<string>>(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/jsonToGrammar/model`,
    modelDataContext,
    {
      headers: {
        [HttpHeader.ACCEPT]: ContentType.TEXT_PLAIN,
      },
      params: {
        renderStyle: 'STANDARD',
      },
    },
  );
  if (config.debug) {
    log.info(
      LogEvent.create('engine.grammar.json-to-grammar'),
      Date.now() - startTime,
      'ms',
    );
  }
  // Phase 4: Compilation check using serialized protocol
  phase = Profile_TEST_PHASE.ENGINE_COMPILATION;
  logPhase(phase, log, config.debug);

  // Test successful compilation with graph from serialization
  startTime = Date.now();
  const compileResult = await axios.post<
    unknown,
    AxiosResponse<{ message: string }>
  >(`${ENGINE_SERVER_URL}/pure/v1/compilation/compile`, modelDataContext);
  if (config.debug) {
    log.info(
      LogEvent.create('engine.compilation'),
      Date.now() - startTime,
      'ms',
    );
  }
  expect(compileResult.status).toBe(200);
  expect(compileResult.data.message).toEqual('OK');
  logSuccess(phase, log, config.debug);
};

const cases: ProfilingConfiguration[] = [defaultOptions];

describe.skip('Profiling Graph Building test', () => {
  test.each(cases)(
    '%s',
    async (option) => {
      await runProfiling(option);
    },
    100000,
  );
});
