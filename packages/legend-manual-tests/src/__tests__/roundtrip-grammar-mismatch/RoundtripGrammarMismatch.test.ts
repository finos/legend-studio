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
  TEST__buildGraphWithEntities,
  TEST__getTestGraphManagerState,
  TEST__GraphManagerPluginManager,
  type V1_PureModelContextData,
} from '@finos/legend-graph';
import {
  ContentType,
  HttpHeader,
  type PlainObject,
} from '@finos/legend-shared';
/**
 * Previously, these exports rely on ES module interop to expose `default` export
 * properly. But since we use `ESM` for Typescript resolution now, we lose this
 * so we have to workaround by importing these and re-export them from CJS
 *
 * TODO: remove these when the package properly work with Typescript's nodenext
 * module resolution
 *
 * @workaround ESM
 * See https://github.com/microsoft/TypeScript/issues/49298
 * See https://github.com/axios/axios/pull/5104
 */
import { default as axios, type AxiosResponse } from 'axios';

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
  GRAMMAR_ROUNDTRIP = 'GRAMMAR_ROUNDTRIP',
  COMPILATION = 'COMPILATION',
}

const BEFORE_TOKEN = '--- BEFORE ---\n';
const AFTER_TOKEN = '--- AFTER ---\n';

const SKIP = Symbol('SKIP GRAMMAR ROUNDTRIP TEST');

const EXCLUSIONS: { [key: string]: ROUNTRIP_TEST_PHASES[] | typeof SKIP } = {};

type GrammarRoundtripOptions = {
  debug?: boolean;
};

const logPhase = (
  phase: ROUNTRIP_TEST_PHASES,
  excludeConfig: ROUNTRIP_TEST_PHASES[] | typeof SKIP,
  debug?: boolean,
): void => {
  if (debug) {
    const skip = excludeConfig === SKIP || excludeConfig.includes(phase);
    // eslint-disable-next-line no-console
    console.log(`${skip ? 'Skipping' : 'Running'} phase '${phase}'`);
  }
};

const logSuccess = (phase: ROUNTRIP_TEST_PHASES, debug?: boolean): void => {
  if (debug) {
    // eslint-disable-next-line no-console
    console.log(`Success running phase '${phase}' `);
  }
};

const isTestSkipped = (filePath: string): boolean =>
  Object.keys(EXCLUSIONS).includes(basename(filePath)) &&
  EXCLUSIONS[basename(filePath)] === SKIP;
const isPartialTest = (filePath: string): boolean =>
  Object.keys(EXCLUSIONS).includes(basename(filePath));

const checkGrammarRoundtripMismatch = async (
  testCase: string,
  filePath: string,
  options?: GrammarRoundtripOptions,
): Promise<void> => {
  const pluginManager = new TEST__GraphManagerPluginManager();
  pluginManager.usePresets([new DSL_ExternalFormat_GraphPreset()]).install();
  const graphManagerState = TEST__getTestGraphManagerState(pluginManager);

  if (options?.debug) {
    // eslint-disable-next-line no-console
    console.log(`Roundtrip test case: ${testCase}`);
  }
  const excludes = Object.keys(EXCLUSIONS)
    .filter((key) => EXCLUSIONS[key] !== SKIP)
    .includes(basename(filePath))
    ? (EXCLUSIONS[basename(filePath)] as ROUNTRIP_TEST_PHASES[])
    : [];

  const fileContent = fs.readFileSync(filePath, { encoding: 'utf-8' });

  if (
    !fileContent.includes(BEFORE_TOKEN) ||
    !fileContent.includes(AFTER_TOKEN)
  ) {
    throw new Error(
      `BEFORE_TOKEN and AFTER_TOKEN not found in grammar roundtrip mismatch test case: Make sure you use the right syntax '--- BEFORE ---' and '--- AFTER ---'`,
    );
  }

  const grammarBefore = fileContent.substring(
    fileContent.indexOf(BEFORE_TOKEN) + BEFORE_TOKEN.length,
    fileContent.indexOf(AFTER_TOKEN),
  );
  const grammarAfter = fileContent.substring(
    fileContent.indexOf(AFTER_TOKEN) + AFTER_TOKEN.length,
  );

  // Phase 1: grammar roundtrip check
  let phase = ROUNTRIP_TEST_PHASES.GRAMMAR_ROUNDTRIP;
  logPhase(phase, excludes, options?.debug);

  const transformGrammarToJsonResult = await axios.post<
    unknown,
    AxiosResponse<PlainObject<V1_PureModelContextData>>
  >(`${ENGINE_SERVER_URL}/pure/v1/grammar/grammarToJson/model`, grammarBefore, {
    headers: {
      [HttpHeader.CONTENT_TYPE]: ContentType.TEXT_PLAIN,
    },
    params: {
      returnSourceInformation: false,
    },
  });
  const entities = graphManagerState.graphManager.pureProtocolTextToEntities(
    JSON.stringify(transformGrammarToJsonResult.data),
  );
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__preserveSectionIndex: false,
  });
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );

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
  const transformJsonToGrammarResult = await axios.post<
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
  if (!excludes.includes(phase)) {
    expect(transformJsonToGrammarResult.data).toEqual(grammarAfter);
    logSuccess(phase, options?.debug);
  }

  // Phase 2: Compilation check using serialized protocol
  phase = ROUNTRIP_TEST_PHASES.COMPILATION;
  logPhase(phase, excludes, options?.debug);
  if (!excludes.includes(phase)) {
    // Test successful compilation with graph from serialization
    const compileResult = await axios.post<
      unknown,
      AxiosResponse<{ message: string }>
    >(`${ENGINE_SERVER_URL}/pure/v1/compilation/compile`, modelDataContext);
    expect(compileResult.status).toBe(200);
    expect(compileResult.data.message).toEqual('OK');
    logSuccess(phase, options?.debug);
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

describe('Grammar roundtrip mismatch test', () => {
  test.each(cases)('%s', async (testName, filePath, isSkipped) => {
    if (!isSkipped) {
      await checkGrammarRoundtripMismatch(testName, filePath, { debug: false });
    }
  });
});
