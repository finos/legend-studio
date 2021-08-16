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
jest.mock('@finos/legend-studio-shared', () => ({
  ...jest.requireActual('@finos/legend-studio-shared'),
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
import axios from 'axios';
import type { V1_PackageableElement } from '@finos/legend-studio';
import {
  EntityChangeType,
  getTestEditorStore,
  buildGraphBasic,
} from '@finos/legend-studio';
import type { PlainObject } from '@finos/legend-studio-shared';
import { flowResult } from 'mobx';

const engineConfig = JSON.parse(
  fs.readFileSync(resolve(__dirname, '../../../engine-config.json'), {
    encoding: 'utf-8',
  }),
) as object;
const ENGINE_SERVER_PORT = (engineConfig as any).server.connector // eslint-disable-line @typescript-eslint/no-explicit-any
  .port as number;
const ENGINE_SERVER_URL = `http://localhost:${ENGINE_SERVER_PORT}/api`;
const TEST_CASE_DIR = resolve(__dirname, 'cases');
const EXCLUDED_CASE_FILES: string[] = [
  // TODO: remove these when we can properly handle relational mapping `mainTable` and `primaryKey` in transformers.
  // See https://github.com/finos/legend-studio/issues/295
  // See https://github.com/finos/legend-studio/issues/294
  // 'embedded-relational-mapping.pure',
  // 'nested-embedded-relational-mapping.pure',
  // 'relational-mapping-filter.pure',
  'relational-connection.pure',
];

const checkGrammarRoundtrip = async (
  file: string,
  editorStore = getTestEditorStore(),
): Promise<void> => {
  // parse the grammar
  const grammarText = fs.readFileSync(file, { encoding: 'utf-8' });
  const transformGrammarToJsonResult = await axios.post(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformGrammarToJson`,
    {
      code: grammarText,
    },
    {},
  );
  const entities = editorStore.graphState.graphManager.pureProtocolToEntities(
    JSON.stringify(transformGrammarToJsonResult.data.modelDataContext),
  );

  await buildGraphBasic(entities, editorStore, {
    TEMPORARY__keepSectionIndex: true,
  });
  const transformedEntities = editorStore.graphState.graph.allOwnElements.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );

  // ensure that transformed entities have all fields ordered alphabetically
  expect(
    // received: transformed entity
    transformedEntities
      .map((entity) => entity.content)
      .map(editorStore.graphState.graphManager.pruneSourceInformation),
  ).toIncludeSameMembers(
    // expected: protocol JSON parsed from grammar text
    transformGrammarToJsonResult.data.modelDataContext.elements
      .map(editorStore.graphState.graphManager.pruneSourceInformation)
      .filter(
        (elementProtocol: PlainObject<V1_PackageableElement>) =>
          elementProtocol._type !== 'sectionIndex',
      ),
  );

  // check hash computation
  await flowResult(editorStore.graphState.precomputeHashes());
  const protocolHashesIndex =
    await editorStore.graphState.graphManager.buildHashesIndex(entities);
  editorStore.changeDetectionState.workspaceLatestRevisionState.setEntityHashesIndex(
    protocolHashesIndex,
  );
  await flowResult(editorStore.changeDetectionState.computeLocalChanges(true));

  // TODO: avoid listing section index as part of change detection for now
  expect(
    editorStore.changeDetectionState.workspaceLatestRevisionState.changes.filter(
      (change) =>
        change.entityChangeType !== EntityChangeType.DELETE ||
        change.oldPath !== '__internal__::SectionIndex',
    ).length,
  ).toBe(0);

  // compose grammar and compare that with original grammar text
  // NOTE: this is optional test as `grammar text <-> protocol` test should be covered
  // in engine already.
  // Here, we do it just so we might be able to detect problem in the grammar roundtrip in engine
  // we include the sections to guarantee the ordering of elements
  const sectionIndices = editorStore.graphState.graph.ownSectionIndices.map(
    (element) => editorStore.graphState.graphManager.elementToEntity(element),
  );
  const modelDataContext = {
    _type: 'data',
    elements: transformedEntities
      .concat(sectionIndices)
      .map((entity) => entity.content),
  };
  const transformJsonToGrammarResult = await axios.post(
    `${ENGINE_SERVER_URL}/pure/v1/grammar/transformJsonToGrammar`,
    {
      modelDataContext,
      renderStyle: 'STANDARD',
    },
    {},
  );
  expect(transformJsonToGrammarResult.data.code).toEqual(grammarText);
  // Test successful compilation with graph from serialization
  const compileResult = await axios.post(
    `${ENGINE_SERVER_URL}/pure/v1/compilation/compile`,
    modelDataContext,
  );
  expect(compileResult.status).toBe(200);
  expect(compileResult.data.message).toEqual('OK');
};

const testNameFrom = (fileName: string): string => {
  const name = basename(fileName, '.pure').split('-').join(' ');
  return `${name[0].toUpperCase()}${name.substring(1, name.length)}`;
};

const cases = fs
  .readdirSync(TEST_CASE_DIR)
  .filter((caseName) => EXCLUDED_CASE_FILES.includes(caseName))
  .map((caseName) => resolve(TEST_CASE_DIR, caseName))
  .filter((filePath) => fs.statSync(filePath).isFile())
  .map((filePath) => [testNameFrom(filePath), filePath]);

describe('Protocol JSON parsed from grammar text roundtrip test', () => {
  test.each(cases)('%s', async (testName, filePath) => {
    await checkGrammarRoundtrip(filePath);
  });
});
