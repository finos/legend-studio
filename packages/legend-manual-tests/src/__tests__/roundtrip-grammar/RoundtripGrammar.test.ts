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

import { resolve, basename } from 'path';
import fs from 'fs';
import axios, { type AxiosResponse } from 'axios';
import {
  type PlainObject,
  WebConsole,
  Log,
  LogEvent,
} from '@finos/legend-shared';
import {
  type V1_PackageableElement,
  TEST__GraphPluginManager,
  TEST__buildGraphWithEntities,
  TEST__checkGraphHashUnchanged,
  TEST__getTestGraphManagerState,
  DSLExternalFormat_GraphPreset,
  GRAPH_MANAGER_EVENT,
  V1_ENGINE_EVENT,
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
const TEST_CASE_DIR = resolve(__dirname, 'cases');

enum ROUNTRIP_TEST_PHASES {
  PROTOCOL_ROUNDTRIP = 'PROTOCOL_ROUNDTRIP',
  HASH = 'HASH',
  GRAMMAR_ROUNDTRIP = 'GRAMMAR_ROUNDTRIP',
  COMPILATION = 'COMPILATION',
}

const SKIP = Symbol('SKIP GRAMMAR ROUNDTRIP TEST');

const EXCLUSIONS: { [key: string]: ROUNTRIP_TEST_PHASES[] | typeof SKIP } = {
  // post processor mismatch between engine (undefined) vs studio ([])
  'relational-connection.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],
  'relational-connection-databricks.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],

  // TODO: remove these when we can properly handle relational mapping `mainTable` and `primaryKey` in transformers.
  // See https://github.com/finos/legend-studio/issues/295
  // See https://github.com/finos/legend-studio/issues/294
  'embedded-relational-mapping.pure': SKIP,
  'nested-embedded-relational-mapping.pure': SKIP,
  'relational-mapping-filter.pure': SKIP,

  // Needs a fix on engine. Engine shouldn't produce `source` for pure property mapping and
  // relational property mapping beacuse they can be resolved at compilation.
  'pure-property-mapping-local-property.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  'relational-property-mapping-local-property.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  'merge-operation-mapping.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],

  // TODO: remove this when https://github.com/finos/legend-engine/pull/519 is merged.
  'ESService-path-offset.pure': SKIP,

  // TODO: remove these when the issue of source ID in relational property mapping is resolved.
  // Engine is removing these sources when the owner is the parent class mapping and studio is not
  'basic-class-mapping-extends.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],
  'basic-inline-embedded-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  'basic-otherwise-embedded-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  'xstore-mapping.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],
  'mapping-include-enum-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  // Used to test graph building performance. Test passes but will SKIP as to not increase build time
  // Current time to complete test is 6576 ms
  'profiling-model-cdm.pure': SKIP,
};

type GrammarRoundtripOptions = {
  debug?: boolean;
};

const logPhase = (
  phase: ROUNTRIP_TEST_PHASES,
  excludeConfig: ROUNTRIP_TEST_PHASES[] | typeof SKIP,
  log: Log,
  debug?: boolean,
): void => {
  if (debug) {
    const skip = excludeConfig === SKIP || excludeConfig.includes(phase);
    log.info(
      LogEvent.create(`${skip ? 'Skipping' : 'Running'} phase '${phase}'`),
    );
  }
};

const logSuccess = (
  phase: ROUNTRIP_TEST_PHASES,
  log: Log,
  debug?: boolean,
): void => {
  if (debug) {
    log.info(LogEvent.create(`Success running phase '${phase}' `));
  }
};

const isTestSkipped = (filePath: string): boolean =>
  Object.keys(EXCLUSIONS).includes(basename(filePath)) &&
  EXCLUSIONS[basename(filePath)] === SKIP;
const isPartialTest = (filePath: string): boolean =>
  Object.keys(EXCLUSIONS).includes(basename(filePath));

const checkGrammarRoundtrip = async (
  testCase: string,
  filePath: string,
  options?: GrammarRoundtripOptions,
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

  if (options?.debug) {
    log.info(LogEvent.create(`Roundtrip test case: ${testCase}`));
  }
  const excludes = Object.keys(EXCLUSIONS)
    .filter((key) => EXCLUSIONS[key] !== SKIP)
    .includes(basename(filePath))
    ? (EXCLUSIONS[basename(filePath)] as ROUNTRIP_TEST_PHASES[])
    : [];

  // Phase 1: protocol roundtrip check
  let phase = ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP;
  logPhase(phase, excludes, log, options?.debug);
  const grammarText = fs.readFileSync(filePath, { encoding: 'utf-8' });
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
  if (options?.debug) {
    log.info(
      LogEvent.create(V1_ENGINE_EVENT.GRAMMAR_TO_JSON),
      Date.now() - startTime,
      'ms',
    );
  }
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult.data.modelDataContext),
  );
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_ENTITIES_FETCHED),
      `[entities: ${entities.length}]`,
    );
  }
  GRAPH_MANAGER_EVENT;
  startTime = Date.now();
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__keepSectionIndex: true,
  });
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_INITIALIZED),
      Date.now() - startTime,
      'ms',
    );
    GRAPH_MANAGER_EVENT;
  }
  startTime = Date.now();
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.GRAPH_PROTOCOL_SERIALIZED),
      Date.now() - startTime,
      'ms',
    );
    GRAPH_MANAGER_EVENT;
  }

  if (!excludes.includes(phase)) {
    // ensure that transformed entities have all fields ordered alphabetically
    expect(
      // received: transformed entity
      transformedEntities
        .map((entity) => entity.content)
        .map(graphManagerState.graphManager.pruneSourceInformation),
    ).toIncludeSameMembers(
      // expected: protocol JSON parsed from grammar text
      transformGrammarToJsonResult.data.modelDataContext.elements
        .map(graphManagerState.graphManager.pruneSourceInformation)
        .filter(
          (elementProtocol: PlainObject<V1_PackageableElement>) =>
            elementProtocol._type !== 'sectionIndex',
        ),
    );
    logSuccess(phase, log, options?.debug);
  }

  // Phase 2: hash and local changes check
  phase = ROUNTRIP_TEST_PHASES.HASH;
  logPhase(phase, excludes, log, options?.debug);
  // check hash computation

  if (!excludes.includes(phase)) {
    await TEST__checkGraphHashUnchanged(graphManagerState, entities);
    logSuccess(phase, log, options?.debug);
  }

  // Phase 3: grammar roundtrip check
  phase = ROUNTRIP_TEST_PHASES.GRAMMAR_ROUNDTRIP;
  logPhase(phase, excludes, log, options?.debug);
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
  const transformJsonToGrammarResult = await axios.post<
    unknown,
    AxiosResponse<{ code: string }>
  >(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformJsonToGrammar`,
    {
      modelDataContext,
      renderStyle: 'STANDARD',
    },
    {},
  );
  if (options?.debug) {
    log.info(
      LogEvent.create(V1_ENGINE_EVENT.JSON_TO_GRAMMAR),
      Date.now() - startTime,
      'ms',
    );
  }
  if (!excludes.includes(phase)) {
    expect(transformJsonToGrammarResult.data.code).toEqual(grammarText);
    logSuccess(phase, log, options?.debug);
  }

  // Phase 4: Compilation check using serialized protocol
  phase = ROUNTRIP_TEST_PHASES.COMPILATION;
  logPhase(phase, excludes, log, options?.debug);
  if (!excludes.includes(phase)) {
    // Test successful compilation with graph from serialization
    startTime = Date.now();
    const compileResult = await axios.post<
      unknown,
      AxiosResponse<{ message: string }>
    >(`${ENGINE_SERVER_URL}/pure/v1/compilation/compile`, modelDataContext);
    if (options?.debug) {
      log.info(
        LogEvent.create(V1_ENGINE_EVENT.COMPILATION),
        Date.now() - startTime,
        'ms',
      );
    }
    expect(compileResult.status).toBe(200);
    expect(compileResult.data.message).toEqual('OK');
    logSuccess(phase, log, options?.debug);
  }
};

const testNameFrom = (filePath: string): string => {
  const isSkipped = isTestSkipped(filePath);
  const isPartial = isPartialTest(filePath);
  const name = basename(filePath, '.pure').split('-').join(' ').trim();
  if (!name) {
    throw new Error(`Found bad name for test file '${filePath}'`);
  }
  return `${isSkipped ? '(SKIPPED) ' : isPartial ? '(partial) ' : ''}${(
    name[0] as string
  ).toUpperCase()}${name.substring(1, name.length)}`;
};

const cases: [string, string, boolean][] = fs
  .readdirSync(TEST_CASE_DIR)
  .map((caseName) => resolve(TEST_CASE_DIR, caseName))
  .filter((filePath) => fs.statSync(filePath).isFile())
  .map((filePath) => [
    testNameFrom(filePath),
    filePath,
    isTestSkipped(filePath),
  ]);

describe('Grammar roundtrip test', () => {
  test.each(cases)('%s', async (testName, filePath, isSkipped) => {
    if (!isSkipped) {
      await checkGrammarRoundtrip(testName, filePath, {
        debug: false,
      });
    }
  });
});
