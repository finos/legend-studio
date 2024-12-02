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
import {
  type PlainObject,
  WebConsole,
  LogService,
  LogEvent,
  LOG_LEVEL,
} from '@finos/legend-shared';
import { type TEMPORARY__JestMatcher } from '@finos/legend-shared/test';
import {
  type V1_PackageableElement,
  GRAPH_MANAGER_EVENT,
  Core_GraphManagerPreset,
} from '@finos/legend-graph';
import {
  TEST__checkGraphHashUnchanged,
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
  ENGINE_TEST_SUPPORT__getClassifierPathMapping,
  ENGINE_TEST_SUPPORT__getSubtypeInfo,
  ENGINE_TEST_SUPPORT__grammarToJSON_model,
  ENGINE_TEST_SUPPORT__JSONToGrammar_model,
  ENGINE_TEST_SUPPORT__compile,
} from '@finos/legend-graph/test';
import { DSL_Text_GraphManagerPreset } from '@finos/legend-extension-dsl-text/graph';
import { DSL_Diagram_GraphManagerPreset as DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram/graph';
import { DSL_DataSpace_GraphManagerPreset } from '@finos/legend-extension-dsl-data-space/graph';
import { DSL_Persistence_GraphManagerPreset } from '@finos/legend-extension-dsl-persistence/graph';
import { STO_ServiceStore_GraphManagerPreset } from '@finos/legend-extension-store-service-store/graph';
import { DSL_DataQuality_GraphManagerPreset } from '@finos/legend-extension-dsl-data-quality/graph';

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
  'STO_Relational-embedded-relational-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
    ROUNTRIP_TEST_PHASES.CHECK_HASH,
  ],
  'STO_Relational-nested-embedded-relational-mapping.pure': SKIP,
  'STO_Relational-relational-mapping-filter.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
    ROUNTRIP_TEST_PHASES.CHECK_HASH,
  ],
  // Update processing to handle Persistence V2 specs
  // See https://github.com/finos/legend-engine/pull/1764
  'DSL_Persistence-basic.pure': SKIP,
  'CORE-legacy-service-tests.pure': SKIP,
};

type GrammarRoundtripOptions = {
  debug?: boolean;
  noExtensions?: boolean;
};

const logPhase = (
  phase: ROUNTRIP_TEST_PHASES,
  excludeConfig: ROUNTRIP_TEST_PHASES[] | typeof SKIP,
  logService: LogService,
  debug?: boolean,
): void => {
  if (debug) {
    const skip = excludeConfig === SKIP || excludeConfig.includes(phase);
    logService.info(
      LogEvent.create(`${skip ? 'Skipping' : 'Running'} phase '${phase}'`),
    );
  }
};

const logSuccess = (
  phase: ROUNTRIP_TEST_PHASES,
  logService: LogService,
  debug?: boolean,
): void => {
  if (debug) {
    logService.info(LogEvent.create(`Success running phase '${phase}' `));
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
  const logger = new WebConsole();
  logger.setLevel(LOG_LEVEL.ERROR);

  // NOTE: This is temporary, when we split the test here and move them to their respective
  // extensions, this will be updated accordingly
  // See https://github.com/finos/legend-studio/issues/820
  pluginManager
    .usePresets(
      options?.noExtensions
        ? [new Core_GraphManagerPreset()]
        : [
            new Core_GraphManagerPreset(),
            new DSL_Text_GraphManagerPreset(),
            new DSL_Diagram_GraphManagerPreset(),
            new DSL_DataSpace_GraphManagerPreset(),
            new DSL_Persistence_GraphManagerPreset(),
            new STO_ServiceStore_GraphManagerPreset(),
            new DSL_DataQuality_GraphManagerPreset(),
          ],
    )
    .usePlugins([logger]);
  pluginManager.install();
  const log = new LogService();
  log.registerPlugins(pluginManager.getLoggerPlugins());
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager, log);
  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
    TEMPORARY__classifierPathMapping:
      await ENGINE_TEST_SUPPORT__getClassifierPathMapping(),
    TEMPORARY__subtypeInfo: await ENGINE_TEST_SUPPORT__getSubtypeInfo(),
  });

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
  const transformGrammarToJsonResult =
    await ENGINE_TEST_SUPPORT__grammarToJSON_model(grammarText);
  if (options?.debug) {
    log.info(
      LogEvent.create('engine.grammar.grammar-to-json'),
      Date.now() - startTime,
      'ms',
    );
  }
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult),
  );
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.FETCH_GRAPH_ENTITIES__SUCCESS),
      `[entities: ${entities.length}]`,
    );
  }
  startTime = Date.now();
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: true,
  });
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.INITIALIZE_GRAPH__SUCCESS),
      Date.now() - startTime,
      'ms',
    );
  }
  startTime = Date.now();
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );
  if (options?.debug) {
    log.info(
      LogEvent.create(GRAPH_MANAGER_EVENT.SERIALIZE_GRAPH_PROTOCOL__SUCCESS),
      Date.now() - startTime,
      'ms',
    );
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
        transformGrammarToJsonResult.elements as PlainObject<V1_PackageableElement>[]
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
  const transformJsonToGrammarResult =
    await ENGINE_TEST_SUPPORT__JSONToGrammar_model(modelDataContext);
  if (options?.debug) {
    log.info(
      LogEvent.create('engine.grammar.json-to-grammar'),
      Date.now() - startTime,
      'ms',
    );
  }
  if (!excludes.includes(phase)) {
    expect(transformJsonToGrammarResult).toEqual(grammarText);
    logSuccess(phase, log, options?.debug);
  }

  // Phase 4: Compilation check using serialized protocol
  phase = ROUNTRIP_TEST_PHASES.COMPILATION;
  logPhase(phase, excludes, log, options?.debug);
  if (!excludes.includes(phase)) {
    // Test successful compilation with graph from serialization
    startTime = Date.now();
    const compileResult = await ENGINE_TEST_SUPPORT__compile(modelDataContext);
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

describe('Grammar roundtrip test (without extensions)', () => {
  test.each(cases)('%s', async (testName, filePath, isSkipped) => {
    // Mapping include dataspace does not play nicely without extensions as the dependent XStore Associations will fail
    if (!isSkipped) {
      await checkGrammarRoundtrip(testName, filePath, {
        debug: false,
        noExtensions: true,
      });
    }
  });
});
