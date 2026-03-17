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
import { render } from '@testing-library/react';
import { unitTest } from '@finos/legend-shared/test';
import {
  V1_buildExecutionResult,
  V1_deserializeExecutionResult,
  TDSExecutionResult,
} from '@finos/legend-graph';
import {
  PlayGroundSQLExecutionResultGrid,
  TEMPORARY_PlaygroundTDSResultGrid,
} from '../sql-playground/SQLPlaygroundGrid.js';

// ------------------------------------
// Shared test data
// ------------------------------------

const SIMPLE_CSV = 'Name,Age\nAlice,30\nBob,25';

const SIMPLE_TDS_RESULT_JSON = {
  builder: {
    _type: 'tdsBuilder',
    columns: [
      { name: 'Name', type: 'String' },
      { name: 'Age', type: 'Integer' },
    ],
  },
  activities: [],
  result: {
    columns: ['Name', 'Age'],
    rows: [{ values: ['Alice', 30] }, { values: ['Bob', 25] }],
  },
};

const buildTDSResult = (): TDSExecutionResult => {
  const result = V1_buildExecutionResult(
    V1_deserializeExecutionResult(SIMPLE_TDS_RESULT_JSON),
  );
  if (!(result instanceof TDSExecutionResult)) {
    throw new Error('Expected TDSExecutionResult');
  }
  return result;
};

// ------------------------------------
// PlayGroundSQLExecutionResultGrid
// ------------------------------------

describe(unitTest('PlayGroundSQLExecutionResultGrid'), () => {
  test(unitTest('renders error message for invalid CSV'), () => {
    const { container } = render(
      <PlayGroundSQLExecutionResultGrid result="" />,
    );
    expect(container.textContent).toContain("Can't parse result");
  });

  test(unitTest('renders grid container for valid CSV in basic mode'), () => {
    const { container } = render(
      <PlayGroundSQLExecutionResultGrid result={SIMPLE_CSV} />,
    );
    expect(
      container.querySelector('.sql-playground__result__grid'),
    ).not.toBeNull();
  });

  test(
    unitTest('renders grid container for valid CSV in advanced server mode'),
    () => {
      const { container } = render(
        <PlayGroundSQLExecutionResultGrid
          result={SIMPLE_CSV}
          useAdvancedGrid={true}
          useLocalMode={false}
        />,
      );
      expect(
        container.querySelector('.sql-playground__result__grid'),
      ).not.toBeNull();
    },
  );

  test(
    unitTest('renders grid container for valid CSV in advanced local mode'),
    () => {
      const { container } = render(
        <PlayGroundSQLExecutionResultGrid
          result={SIMPLE_CSV}
          useAdvancedGrid={true}
          useLocalMode={true}
        />,
      );
      expect(
        container.querySelector('.sql-playground__result__grid'),
      ).not.toBeNull();
    },
  );

  test(unitTest('applies dark mode theme class'), () => {
    const { container } = render(
      <PlayGroundSQLExecutionResultGrid
        result={SIMPLE_CSV}
        enableDarkMode={true}
      />,
    );
    expect(container.querySelector('.ag-theme-balham-dark')).not.toBeNull();
    expect(container.querySelector('.ag-theme-balham')).toBeNull();
  });

  test(unitTest('applies light mode theme class by default'), () => {
    const { container } = render(
      <PlayGroundSQLExecutionResultGrid result={SIMPLE_CSV} />,
    );
    expect(container.querySelector('.ag-theme-balham')).not.toBeNull();
    expect(container.querySelector('.ag-theme-balham-dark')).toBeNull();
  });
});

// ------------------------------------
// TEMPORARY_PlaygroundTDSResultGrid
// ------------------------------------

describe(unitTest('TEMPORARY_PlaygroundTDSResultGrid'), () => {
  test(unitTest('renders grid container for TDSExecutionResult'), () => {
    const result = buildTDSResult();
    const { container } = render(
      <TEMPORARY_PlaygroundTDSResultGrid result={result} />,
    );
    expect(
      container.querySelector('.sql-playground__result__grid'),
    ).not.toBeNull();
  });

  test(
    unitTest(
      'renders grid container for TDSExecutionResult in advanced server mode',
    ),
    () => {
      const result = buildTDSResult();
      const { container } = render(
        <TEMPORARY_PlaygroundTDSResultGrid
          result={result}
          useAdvancedGrid={true}
          useLocalMode={false}
        />,
      );
      expect(
        container.querySelector('.sql-playground__result__grid'),
      ).not.toBeNull();
    },
  );

  test(
    unitTest(
      'renders grid container for TDSExecutionResult in advanced local mode',
    ),
    () => {
      const result = buildTDSResult();
      const { container } = render(
        <TEMPORARY_PlaygroundTDSResultGrid
          result={result}
          useAdvancedGrid={true}
          useLocalMode={true}
        />,
      );
      expect(
        container.querySelector('.sql-playground__result__grid'),
      ).not.toBeNull();
    },
  );

  test(unitTest('applies dark mode theme class'), () => {
    const result = buildTDSResult();
    const { container } = render(
      <TEMPORARY_PlaygroundTDSResultGrid
        result={result}
        enableDarkMode={true}
      />,
    );
    expect(container.querySelector('.ag-theme-balham-dark')).not.toBeNull();
    expect(container.querySelector('.ag-theme-balham')).toBeNull();
  });

  test(unitTest('applies light mode theme class by default'), () => {
    const result = buildTDSResult();
    const { container } = render(
      <TEMPORARY_PlaygroundTDSResultGrid result={result} />,
    );
    expect(container.querySelector('.ag-theme-balham')).not.toBeNull();
    expect(container.querySelector('.ag-theme-balham-dark')).toBeNull();
  });
});
