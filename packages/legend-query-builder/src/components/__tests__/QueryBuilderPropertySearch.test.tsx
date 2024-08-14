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

import { test, expect, describe } from '@jest/globals';
import {
  fireEvent,
  getByTitle,
  act,
  findByDisplayValue,
  getByPlaceholderText,
  findByText,
  findByTitle,
  render,
  queryByText,
  getByText,
  findAllByText,
} from '@testing-library/react';
import {
  createMock,
  integrationTest,
  unitTest,
} from '@finos/legend-shared/test';
import TEST_DATA__QueryBuilder_Model_PropertySearch from '../../stores/__tests__/TEST_DATA__QueryBuilder_Model_PropertySearch.json' assert { type: 'json' };
import { stub_RawLambda } from '@finos/legend-graph';
import { QUERY_BUILDER_TEST_ID } from '../../__lib__/QueryBuilderTesting.js';
import { TEST_DATA__ModelCoverageAnalysisResult_CircularDependency } from '../../stores/__tests__/TEST_DATA__ModelCoverageAnalysisResult.js';
import { TEST__setUpQueryBuilder } from '../__test-utils__/QueryBuilderComponentTestUtils.js';
import { formatTextWithHighlightedMatches } from '../explorer/QueryBuilderPropertySearchPanel.js';
import { guaranteeNonNullable, guaranteeType } from '@finos/legend-shared';

test(
  integrationTest(
    'Query builder property search state is properly set after processing a simple getAll()',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type search term to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'name' } });
    await findByDisplayValue(queryBuilder, 'name');
    await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(queryBuilderState.explorerState.propertySearchState.searchText).toBe(
      'name',
    );

    await act(async () => {
      queryBuilderState.explorerState.propertySearchState.setSearchText('Name');
      await queryBuilderState.explorerState.propertySearchState.search();
    });

    expect(
      queryBuilderState.explorerState.propertySearchState.searchResults.length,
    ).toBe(4);
    fireEvent.click(getByTitle(queryBuilder, 'Clear'));
    expect(
      queryBuilderState.explorerState.propertySearchState.searchResults.length,
    ).toBe(0);
  },
);

test(
  integrationTest(
    'Query builder property search panel opens with at least 2 search characters and highlights node',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type one character
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'l' } });
    await findByDisplayValue(queryBuilder, 'l');

    // Verify that the property search panel is not open
    expect(
      renderResult.queryByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
    ).toBeNull();

    // Type a second character
    fireEvent.change(searchInput, { target: { value: 'la' } });
    await findByDisplayValue(queryBuilder, 'la');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );

    // Verify that expected result is shown
    expect(
      await findByText(searchPanel, 'Employees / ', {
        trim: false,
      }),
    ).not.toBeNull();
    expect(await findByText(searchPanel, 'La')).not.toBeNull();
    expect(await findByText(searchPanel, 'st Name')).not.toBeNull();
    expect(
      await findByTitle(
        searchPanel,
        'Multiple values of this property can cause row explosion',
      ),
    ).not.toBeNull();

    // Check that show in tree button works and expands explorer tree
    const MOCK__ScrollIntoView = createMock();
    window.HTMLElement.prototype.scrollIntoView = MOCK__ScrollIntoView;
    fireEvent.click(await findByTitle(searchPanel, 'Show in tree'));
    expect(
      renderResult.queryByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
    ).toBeNull();
    const explorerPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_EXPLORER,
    );
    expect(await findByText(explorerPanel, 'Last Name')).not.toBeNull();
    expect(MOCK__ScrollIntoView).toHaveBeenCalledTimes(1);

    // Type more characters to open property search panel
    fireEvent.change(searchInput, { target: { value: 'la' } });
    await findByDisplayValue(queryBuilder, 'la');
    expect(
      await renderResult.findByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
    ).not.toBeNull();

    // Check that escape key closes search panel
    fireEvent.keyDown(
      renderResult.getByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
      {
        key: 'Escape',
        code: 'Escape',
      },
    );
    expect(
      renderResult.queryByTestId(
        QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
      ),
    ).toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel expands/collapses class node on click',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type characters to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'employees' } });
    await findByDisplayValue(queryBuilder, 'employees');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );
    expect(await findByText(searchPanel, 'Employees')).not.toBeNull();

    // Click class node tooltip icon
    fireEvent.click(getByTitle(searchPanel, 'Property info'));

    // Verify that the class node is still collapsed
    expect(getByText(searchPanel, 'Employees')).not.toBeNull();
    expect(queryByText(searchPanel, 'First Name')).toBeNull();

    // Click class name
    fireEvent.click(getByText(searchPanel, 'Employees'));

    // Veify that the class node is expanded
    expect(await findByText(searchPanel, 'Age')).not.toBeNull();
    expect(await findByText(searchPanel, 'Firm ID')).not.toBeNull();
    expect(await findByText(searchPanel, 'First Name')).not.toBeNull();
    expect(await findByText(searchPanel, 'Last Name')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel filters documentation tagged values',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type characters to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'test doc' } });
    await findByDisplayValue(queryBuilder, 'test doc');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();
    expect(await findByText(searchPanel, 'No result')).not.toBeNull();

    // Turn on include documentation
    const includeDocumentationButton = guaranteeNonNullable(
      getByText(searchPanel, 'Documentation').nextElementSibling
        ?.firstElementChild,
    );
    fireEvent.click(includeDocumentationButton);

    // Veify that search results are now populated
    expect(await findByText(searchPanel, 'Id')).not.toBeNull();
    expect(await findByText(searchPanel, 'test')).not.toBeNull();
    expect(await findByText(searchPanel, 'doc')).not.toBeNull();
    expect(
      await findByText(searchPanel, ' tagged value', { trim: false }),
    ).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel filter by "only" type button works',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type characters to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'legal name' } });
    await findByDisplayValue(queryBuilder, 'legal name');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();
    expect(await findByText(searchPanel, 'Legal')).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();

    // Filter by only number type
    fireEvent.mouseEnter(getByText(searchPanel, 'Number'));
    fireEvent.click(getByText(searchPanel, 'only'));
    fireEvent.mouseLeave(getByText(searchPanel, 'Number'));

    // Verify there are no results
    expect(await findByText(searchPanel, 'No result')).not.toBeNull();

    // Filter by only string type
    fireEvent.mouseEnter(getByText(searchPanel, 'String'));
    fireEvent.click(getByText(searchPanel, 'only'));
    fireEvent.mouseLeave(getByText(searchPanel, 'String'));

    // Verify that there are results
    expect(await findByText(searchPanel, 'Legal')).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel shows full path for property results',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type characters to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'last name' } });
    await findByDisplayValue(queryBuilder, 'last name');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );

    // Verify expected result is shown
    expect(
      await findByText(searchPanel, 'Employees / ', { trim: false }),
    ).not.toBeNull();
    expect(await findByText(searchPanel, 'Last')).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search searches across node label and node path',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Type characters to open property search panel
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'hobby name' } });
    await findByDisplayValue(queryBuilder, 'hobby name');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );

    // Verify expected result is shown
    expect(
      await findByText(searchPanel, 'Employees / Hobbies / ', { trim: false }),
    ).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel filters out circular dependencies',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Search for class that contains circular dependency
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'employees' } });
    await findByDisplayValue(queryBuilder, 'employees');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );

    // Verify expected result is shown
    expect(await findByText(searchPanel, 'Employees')).not.toBeNull();

    // Search for property in class that contains circular dependency
    fireEvent.change(searchInput, { target: { value: 'first name' } });
    await findByDisplayValue(queryBuilder, 'first name');

    // Verify expected result is shown
    expect(
      await findByText(searchPanel, 'Employees / ', { trim: false }),
    ).not.toBeNull();
    expect(await findByText(searchPanel, 'First')).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();

    // Search for property in class is depended on
    fireEvent.change(searchInput, { target: { value: 'legal name' } });
    await findByDisplayValue(queryBuilder, 'legal name');

    // Verify expected result is shown
    expect(await findByText(searchPanel, 'Legal')).not.toBeNull();
    expect(await findByText(searchPanel, 'Name')).not.toBeNull();
  },
);

test(
  integrationTest(
    'Query builder property search panel only shows nested classes and properties when searched directly',
  ),
  async () => {
    const { renderResult, queryBuilderState } = await TEST__setUpQueryBuilder(
      TEST_DATA__QueryBuilder_Model_PropertySearch,
      stub_RawLambda(),
      'my::map',
      'my::runtime',
      TEST_DATA__ModelCoverageAnalysisResult_CircularDependency,
    );

    await act(async () => {
      queryBuilderState.changeClass(
        queryBuilderState.graphManagerState.graph.getClass('my::Firm'),
      );
    });

    const queryBuilderSetupPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_SETUP,
    );
    await findByText(queryBuilderSetupPanel, 'Firm');
    await findByText(queryBuilderSetupPanel, 'map');
    await findByText(queryBuilderSetupPanel, 'runtime');

    const queryBuilder = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER,
    );

    // Search for parent class
    const searchInput = getByPlaceholderText(
      queryBuilder,
      'One or more terms, ESC to clear',
    );
    fireEvent.change(searchInput, { target: { value: 'employees' } });
    await findByDisplayValue(queryBuilder, 'employees');

    // Verify that the property search panel is open
    const searchPanel = await renderResult.findByTestId(
      QUERY_BUILDER_TEST_ID.QUERY_BUILDER_PROPERTY_SEARCH_PANEL,
    );
    expect(searchPanel).not.toBeNull();

    // Toggle on include one-many rows
    fireEvent.click(
      getByText(
        guaranteeType(
          getByText(searchPanel, 'One-Many rows').nextElementSibling,
          HTMLElement,
        ),
        'Include',
      ),
    );

    // Verify expected result is shown
    expect(await findByText(searchPanel, 'Employees')).not.toBeNull();
    expect(queryByText(searchPanel, 'Hobbies')).toBeNull();

    // Search direclty for child class
    fireEvent.change(searchInput, { target: { value: 'hobbies' } });
    await findByDisplayValue(queryBuilder, 'hobbies');

    // Verify expected result is shown
    expect(
      await findByText(searchPanel, 'Employees / ', { trim: false }),
    ).not.toBeNull();
    expect(await findByText(searchPanel, 'Hobbies')).not.toBeNull();

    // Search direclty for child properties
    fireEvent.change(searchInput, { target: { value: 'name' } });
    await findByDisplayValue(queryBuilder, 'name');

    // Verify expected result is shown
    expect(
      await findByText(searchPanel, 'Legal ', { trim: false }),
    ).not.toBeNull();
    expect(
      await findByText(searchPanel, 'Employees / First ', { trim: false }),
    ).not.toBeNull();
    expect(
      await findByText(searchPanel, 'Employees / Last ', { trim: false }),
    ).not.toBeNull();
    expect(
      await findByText(searchPanel, 'Employees / Hobbies / ', { trim: false }),
    ).not.toBeNull();
    expect(await findAllByText(searchPanel, 'Name')).toHaveLength(4);
  },
);

const highlightingCases = [
  {
    testName: 'Simple match',
    displayText: 'Created Date',
    searchTerm: 'rea',
    expectedHighlights: ['rea'],
    expectedRegular: ['C', 'ted Date'],
  },
  {
    testName: 'Match at beginning',
    displayText: 'Created Date',
    searchTerm: 'Cre',
    expectedHighlights: ['Cre'],
    expectedRegular: ['ated Date'],
  },
  {
    testName: 'Match at end',
    displayText: 'Created Date',
    searchTerm: 'Date',
    expectedHighlights: ['Date'],
    expectedRegular: ['Created '],
  },
  {
    testName: 'Multiple matches',
    displayText: 'Created Date',
    searchTerm: 'ate',
    expectedHighlights: ['ate', 'ate'],
    expectedRegular: ['Cre', 'd D'],
  },
  {
    testName: 'Overlapping highlight ranges',
    displayText: 'Created Date',
    searchTerm: 'ated ed Dat',
    expectedHighlights: ['ated', 'Dat'],
    expectedRegular: ['Cre', ' ', 'e'],
  },
  {
    testName: 'No matches',
    displayText: 'Created Date',
    searchTerm: 'test',
    expectedHighlights: [],
    expectedRegular: ['Created Date'],
  },
  {
    testName: 'Match with slashes',
    displayText: 'Employee / First Name',
    searchTerm: 'Employee/Fir',
    expectedHighlights: ['Employee', 'Fir'],
    expectedRegular: [' / ', 'st Name'],
  },
];

describe(
  unitTest('Query builder property search panel highlights matches'),
  () => {
    test.each(highlightingCases)(
      '$testName',
      ({ displayText, searchTerm, expectedHighlights, expectedRegular }) => {
        const { container } = render(
          <div>
            {formatTextWithHighlightedMatches(
              displayText,
              searchTerm,
              'test',
              'id',
            )}
          </div>,
        );

        // Check that the highlighted text is rendered correctly
        const actualHightlights =
          container.querySelectorAll('.test--highlight');
        expect(actualHightlights).toHaveLength(expectedHighlights.length);
        expectedHighlights.forEach((expectedHighlight, index) => {
          expect(actualHightlights[index]).toBeDefined();
          expect(actualHightlights[index]!.textContent).toBe(expectedHighlight);
        });

        // Check that the regular text is rendered correctly
        expectedRegular.forEach((expected) => {
          expect(container.textContent).toContain(expected);
        });
      },
    );
  },
);
