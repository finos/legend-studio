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

import {
  LegendStudioPluginManager,
  TEST__provideMockedEditorStore,
  TEST__setUpEditorWithDefaultSDLCData,
  TEST__openElementFromExplorerTree,
  LEGEND_STUDIO_TEST_ID,
} from '@finos/legend-studio';
import { MappingGeneration_GraphPreset } from '../../models/MappingGeneration_Extension';
import {
  GENERATION_TYPE_NAME,
  MappingGeneration_LegendStudioPlugin,
} from '../MappingGeneration_LegendStudioPlugin';
import { integrationTest, prettyCONSTName } from '@finos/legend-shared';
import { fireEvent, waitFor, screen, getByText } from '@testing-library/react';
import { MAPPING_GENERATION_TEST_ID } from '../MappingGeneration_TestID';

const TEST_DATA__dummyModel = [
  {
    path: 'model::Person',
    content: {
      _type: 'class',
      name: 'Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'model::_Person',
    content: {
      _type: 'class',
      name: '_Person',
      package: 'model',
      properties: [
        {
          multiplicity: {
            lowerBound: 1,
            upperBound: 1,
          },
          name: 'name',
          type: 'String',
        },
      ],
    },
    classifierPath: 'meta::pure::metamodel::type::Class',
  },
  {
    path: 'test::M',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'model::Person',
                property: 'name',
              },
              source: 'model::_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [{ _type: 'var', name: 'src' }],
                    property: 'name',
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'M',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
  {
    path: 'test::F',
    content: {
      _type: 'mapping',
      classMappings: [
        {
          _type: 'pureInstance',
          class: 'model::Person',
          propertyMappings: [
            {
              _type: 'purePropertyMapping',
              property: {
                class: 'model::Person',
                property: 'name',
              },
              source: 'model::_Person',
              transform: {
                _type: 'lambda',
                body: [
                  {
                    _type: 'property',
                    parameters: [{ _type: 'var', name: 'src' }],
                    property: 'name',
                  },
                ],
                parameters: [],
              },
              explodeProperty: false,
            },
          ],
          root: false,
        },
      ],
      enumerationMappings: [],
      includedMappings: [],
      name: 'F',
      package: 'test',
      tests: [],
    },
    classifierPath: 'meta::pure::mapping::Mapping',
  },
];

const pluginManager = LegendStudioPluginManager.create();
pluginManager
  .usePresets([new MappingGeneration_GraphPreset()])
  .usePlugins([new MappingGeneration_LegendStudioPlugin()])
  .install();

test(integrationTest('Open mapping generation panel'), async () => {
  const mockedEditorStore = TEST__provideMockedEditorStore({ pluginManager });
  const renderResult = await TEST__setUpEditorWithDefaultSDLCData(
    mockedEditorStore,
    {
      entities: TEST_DATA__dummyModel,
    },
  );
  await TEST__openElementFromExplorerTree('test::M', renderResult);
  const button = screen.getByTitle('Open model', { exact: false });
  expect(button).toBeDefined();
  fireEvent.click(button);
  await waitFor(() =>
    renderResult.getByTestId(LEGEND_STUDIO_TEST_ID.MODEL_LOADER),
  );

  const modelLoaderMenu = renderResult.getByTestId(
    LEGEND_STUDIO_TEST_ID.MODEL_LOADER_CONFIG_TYPES,
  );

  fireEvent.click(modelLoaderMenu);
  await waitFor(() =>
    renderResult.getByText(prettyCONSTName(GENERATION_TYPE_NAME)),
  );
  fireEvent.click(
    renderResult.getByText(prettyCONSTName(GENERATION_TYPE_NAME)),
  );
  await waitFor(() =>
    renderResult.getByTestId(
      MAPPING_GENERATION_TEST_ID.MAPPING_GENERATION_EDITOR,
    ),
  );
  const mappingToGenerate = await waitFor(() =>
    renderResult.getByTestId(MAPPING_GENERATION_TEST_ID.MAPPING_TO_GENERATE),
  );
  fireEvent.click(getByText(mappingToGenerate, 'Choose mapping to regenerate'));

  //TODO: add test for choosing mappings from selector and mapping generation
});
