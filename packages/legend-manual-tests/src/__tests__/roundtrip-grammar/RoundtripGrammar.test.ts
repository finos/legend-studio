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
import type { AxiosResponse } from 'axios';
import axios from 'axios';
import type { PlainObject } from '@finos/legend-shared';
import type { V1_PackageableElement } from '@finos/legend-graph';
import {
  TEST__GraphPluginManager,
  TEST__buildGraphWithEntities,
  TEST__checkGraphHashUnchanged,
  TEST__getTestGraphManagerState,
} from '@finos/legend-graph';
import { DSLText_GraphPreset } from '@finos/legend-extension-dsl-text';
import { DSLDiagram_GraphPreset } from '@finos/legend-extension-dsl-diagram';
import { DSLSerializer_GraphPreset } from '@finos/legend-extension-dsl-serializer';
import { DSLDataSpace_GraphPreset } from '@finos/legend-extension-dsl-data-space';

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
  'DSLDataSpace-basic.pure': SKIP, // Needs https://github.com/finos/legend-engine/pull/397 to be merged
  'DSLSerializer-basic.pure': SKIP, // To be fixed - https://github.com/finos/legend-studio/pull/534
  // post processor mismatch between engine (undefined) vs studio ([])
  'relational-connection.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],
  // TODO: remove these when we can properly handle relational mapping `mainTable` and `primaryKey` in transformers.
  // See https://github.com/finos/legend-studio/issues/295
  // See https://github.com/finos/legend-studio/issues/294
  'embedded-relational-mapping.pure': SKIP,
  'nested-embedded-relational-mapping.pure': SKIP,
  'relational-mapping-filter.pure': SKIP,
  // TODO: remove these two when the issue of source Id in relational property mapping is resolved.
  // Engine is removing these sources when the owner is the parent class mapping and studio is not
  'basic-class-mapping-extends.pure': [ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP],
  'basic-inline-embedded-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
  'basic-otherwise-embedded-mapping.pure': [
    ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP,
  ],
};

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

const checkGrammarRoundtrip = async (
  testCase: string,
  filePath: string,
  options?: GrammarRoundtripOptions,
): Promise<void> => {
  const pluginManager = new TEST__GraphPluginManager();
  pluginManager.usePresets([
    new DSLText_GraphPreset(),
    new DSLDiagram_GraphPreset(),
    new DSLSerializer_GraphPreset(),
    new DSLDataSpace_GraphPreset(),
  ]);
  pluginManager.install();
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

  // Phase 1: protocol roundtrip check
  let phase = ROUNTRIP_TEST_PHASES.PROTOCOL_ROUNDTRIP;
  logPhase(phase, excludes, options?.debug);
  const grammarText = fs.readFileSync(filePath, { encoding: 'utf-8' });
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
  const entities = graphManagerState.graphManager.pureProtocolToEntities(
    JSON.stringify(transformGrammarToJsonResult.data.modelDataContext),
  );
  await TEST__buildGraphWithEntities(graphManagerState, entities, {
    TEMPORARY__keepSectionIndex: true,
  });
  const transformedEntities = graphManagerState.graph.allOwnElements.map(
    (element) => graphManagerState.graphManager.elementToEntity(element),
  );

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
    logSuccess(phase, options?.debug);
  }

  // Phase 2: hash and local changes check
  phase = ROUNTRIP_TEST_PHASES.HASH;
  logPhase(phase, excludes, options?.debug);
  // check hash computation

  if (!excludes.includes(phase)) {
    await TEST__checkGraphHashUnchanged(graphManagerState, entities);
    logSuccess(phase, options?.debug);
  }

  // Phase 3: grammar roundtrip check
  phase = ROUNTRIP_TEST_PHASES.GRAMMAR_ROUNDTRIP;
  logPhase(phase, excludes, options?.debug);
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
    AxiosResponse<{ code: string }>
  >(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformJsonToGrammar`,
    {
      modelDataContext,
      renderStyle: 'STANDARD',
    },
    {},
  );
  if (!excludes.includes(phase)) {
    expect(transformJsonToGrammarResult.data.code).toEqual(grammarText);
    logSuccess(phase, options?.debug);
  }

  // Phase 4: Compilation check using serialized protocol
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

const testNameFrom = (fileName: string, toSkip: boolean): string => {
  const name = basename(fileName, '.pure').split('-').join(' ');
  return `${toSkip ? '(SKIPPED) ' : ''}${name[0].toUpperCase()}${name.substring(
    1,
    name.length,
  )}`;
};

const cases: [string, string, boolean][] = fs
  .readdirSync(TEST_CASE_DIR)
  .map((caseName) => resolve(TEST_CASE_DIR, caseName))
  .filter((filePath) => fs.statSync(filePath).isFile())
  .map((filePath) => [
    testNameFrom(filePath, isTestSkipped(filePath)),
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
