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
import { resolve, basename } from 'path';
import fs from 'fs';
/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 * See https://github.com/microsoft/TypeScript/issues/50690
 */
import { default as axios, type AxiosResponse } from 'axios';
import {
  type PlainObject,
  type TEMPORARY__JestMatcher,
  WebConsole,
  Log,
  LogEvent,
  ContentType,
  HttpHeader,
} from '@finos/legend-shared';
import {
  type V1_PackageableElement,
  TEST__GraphManagerPluginManager,
  TEST__buildGraphWithEntities,
  TEST__checkGraphHashUnchanged,
  TEST__getTestGraphManagerState,
  GRAPH_MANAGER_EVENT,
  DSLExternalFormat_GraphPreset,
} from '@finos/legend-graph';
import { DSLText_GraphManagerPreset } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLDataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space';
import { DSLPersistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence';
import { DSLMastery_GraphManagerPreset } from '@finos/legend-extension-dsl-mastery';
import { DSLPersistenceCloud_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence-cloud';
import { ESService_GraphManagerPreset } from '@finos/legend-extension-external-store-service';

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
  CHECK_HASH = 'CHECK_HASH',
  GRAMMAR_ROUNDTRIP = 'GRAMMAR_ROUNDTRIP',
  COMPILATION = 'COMPILATION',
}

const SKIP = Symbol('SKIP GRAMMAR ROUNDTRIP TEST');

const EXCLUSIONS: { [key: string]: ROUNTRIP_TEST_PHASES[] | typeof SKIP } = {
  // TODO: remove these when we can properly handle relational mapping `mainTable` and `primaryKey` in transformers.
  // See https://github.com/finos/legend-studio/issues/295
  // See https://github.com/finos/legend-studio/issues/294
  'embedded-relational-mapping.pure': SKIP,
  'nested-embedded-relational-mapping.pure': SKIP,
  'relational-mapping-filter.pure': SKIP,
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
  const pluginManager = new TEST__GraphManagerPluginManager();
  // NOTE: This is temporary, when we split the test here and move them to their respective
  // extensions, this will be updated accordingly
  // See https://github.com/finos/legend-studio/issues/820
  pluginManager
    .usePresets([
      new DSLText_GraphManagerPreset(),
      new DSLDiagram_GraphManagerPreset(),
      new DSLDataSpace_GraphManagerPreset(),
      new DSLExternalFormat_GraphPreset(),
      new DSLPersistence_GraphManagerPreset(),
      new DSLMastery_GraphManagerPreset(),
      new DSLPersistenceCloud_GraphManagerPreset(),
      new ESService_GraphManagerPreset(),
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
  const transformGrammarToJsonResult = await axios.default.post<
    unknown,
    AxiosResponse<{ elements: object[] }>
  >(`${ENGINE_SERVER_URL}/pure/v1/grammar/grammarToJson/model`, grammarText, {
    headers: {
      [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
    },
    params: {
      returnSourceInformation: false,
    },
  });
  if (options?.debug) {
    log.info(
      LogEvent.create('engine.grammar.grammar-to-json'),
      Date.now() - startTime,
      'ms',
    );
  }
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult.data),
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
    TEMPORARY__preserveSectionIndex: true,
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
    (
      expect(
        // received: transformed entity
        transformedEntities.map((entity) => entity.content),
      ) as TEMPORARY__JestMatcher
    ).toIncludeSameMembers(
      // expected: protocol JSON parsed from grammar text
      (
        (transformGrammarToJsonResult.data as { elements: object[] })
          .elements as PlainObject<V1_PackageableElement>[]
      ).filter(
        (elementProtocol: PlainObject<V1_PackageableElement>) =>
          elementProtocol._type !== 'sectionIndex',
      ),
    );
    logSuccess(phase, log, options?.debug);
  }

  // Phase 2: hash and local changes check
  phase = ROUNTRIP_TEST_PHASES.CHECK_HASH;
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
  const transformJsonToGrammarResult = await axios.default.post<
    unknown,
    AxiosResponse<string>
  >(
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
  if (options?.debug) {
    log.info(
      LogEvent.create('engine.grammar.json-to-grammar'),
      Date.now() - startTime,
      'ms',
    );
  }
  if (!excludes.includes(phase)) {
    expect(transformJsonToGrammarResult.data).toEqual(grammarText);
    logSuccess(phase, log, options?.debug);
  }

  // Phase 4: Compilation check using serialized protocol
  phase = ROUNTRIP_TEST_PHASES.COMPILATION;
  logPhase(phase, excludes, log, options?.debug);
  if (!excludes.includes(phase)) {
    // Test successful compilation with graph from serialization
    startTime = Date.now();
    const compileResult = await axios.default.post<
      unknown,
      AxiosResponse<{ message: string }>
    >(`${ENGINE_SERVER_URL}/pure/v1/compilation/compile`, modelDataContext);
    if (options?.debug) {
      log.info(
        LogEvent.create('engine.compilation'),
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
