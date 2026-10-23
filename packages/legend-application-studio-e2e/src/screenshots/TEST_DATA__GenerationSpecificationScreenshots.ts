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

import type { Entity } from '../support/TEST_DATA__SDLC.js';

/** Where the images land; whoever runs the script may send them somewhere else. */
export const SHOT_DIR =
  // eslint-disable-next-line no-process-env
  process.env.GENERATION_SPEC_SHOT_DIR ?? './build/screenshots';

const MAPPING_CLASSIFIER = 'meta::pure::mapping::Mapping';
const FILE_GENERATION_CLASSIFIER =
  'meta::pure::generation::metamodel::GenerationConfiguration';
const GENERATION_SPECIFICATION_CLASSIFIER =
  'meta::pure::generation::metamodel::GenerationSpecification';

const mapping = (name: string): Entity => ({
  path: `model::${name}`,
  classifierPath: MAPPING_CLASSIFIER,
  content: {
    _type: 'mapping',
    classMappings: [],
    enumerationMappings: [],
    includedMappings: [],
    name,
    package: 'model',
    tests: [],
  },
});

const fileGeneration = (name: string, type: string): Entity => ({
  path: `model::${name}`,
  classifierPath: FILE_GENERATION_CLASSIFIER,
  content: {
    _type: 'fileGeneration',
    configurationProperties: [],
    name,
    package: 'model',
    scopeElements: [],
    type,
  },
});

/**
 * NOTE: the elements standing in as model generation elements here are plain mappings. Nothing in
 * open-source Studio implements `getExtraModelGenerationElementGetters`, so there is no element
 * type a vanilla build would offer in the palette - but a generation node holds a reference to any
 * element, so the board renders them exactly as it would an extension's own generation elements.
 * This is also why the palette in these images shows its empty state.
 */
export const TEST_DATA__GenerationSpecificationStages: Entity[] = [
  mapping('orderMapping'),
  mapping('tradeMapping'),
  mapping('partyMapping'),
  mapping('consolidatedMapping'),
  fileGeneration('avroGen', 'avro'),
  fileGeneration('protobufGen', 'protobuf'),
  {
    path: 'model::generationSpec',
    classifierPath: GENERATION_SPECIFICATION_CLASSIFIER,
    content: {
      _type: 'generationSpecification',
      fileGenerations: [
        { path: 'model::avroGen', type: 'FILE_GENERATION' },
        { path: 'model::protobufGen', type: 'FILE_GENERATION' },
      ],
      generationNodes: [
        {
          // a node written with the plural field: three generations against one compiled graph
          generationElements: [
            'model::orderMapping',
            'model::tradeMapping',
            'model::partyMapping',
          ],
          id: 'schemas',
        },
        {
          // a node written with the singular field, which keeps that form on save
          generationElement: 'model::consolidatedMapping',
          id: 'consolidated',
        },
      ],
      name: 'generationSpec',
      package: 'model',
    },
  },
];
