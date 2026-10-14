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

import { beforeEach, describe, expect, test } from '@jest/globals';
import { screen, within } from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../../__lib__/LegendCubeTesting.js';
import { TEST__renderInCubeApplication } from '../../__test-utils__/CubePageTestUtils.js';
import { TEST__createCubeHost } from '../../__test-utils__/CubeTestApplication.js';
import { createFakeCubeIngestCatalog } from '../../__test-utils__/FakeCubeIngestCatalog.js';
import type { CubeHost } from '../../stores/CubeHost.js';
import { CubeEditor } from '../CubeEditor.js';

const renderPage = async (host: CubeHost): Promise<void> => {
  await TEST__renderInCubeApplication(
    <CubeEditor
      host={host}
      headerActions={(editorState) => (
        <button>
          {`Keep ${editorState.document.query.isEmpty ? 'nothing' : 'the cube'}`}
        </button>
      )}
    />,
    host.applicationStore,
    LEGEND_CUBE_TEST_ID.EDITOR,
  );
};

beforeEach(() => {
  localStorage.clear();
});

describe("The host's options on the page", () => {
  test('A host with no sample data, as Studio, shows no Examples, and its own buttons in the header', async () => {
    const { host } = TEST__createCubeHost();
    await renderPage({
      ...host,
      connectionExplorer: undefined,
      dataProductCatalog: undefined,
      ingestCatalog: createFakeCubeIngestCatalog().catalog,
      offersSampleData: false,
    });
    const header = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(
      within(header).queryByRole('button', { name: 'Examples' }),
    ).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'open an example' }),
    ).toBeNull();
    expect(screen.getByText(/^to start a new one\.$/u)).toBeDefined();
    // the host's button gets the page's state
    expect(
      within(header).getByRole('button', { name: 'Keep nothing' }),
    ).toBeDefined();
  });

  test('A host that says nothing, as Legend Query, keeps the Examples', async () => {
    const { host } = TEST__createCubeHost();
    await renderPage(host);
    const header = screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION);
    expect(
      within(header).getByRole('button', { name: 'Examples' }),
    ).toBeDefined();
    expect(
      screen.getByRole('button', { name: 'open an example' }),
    ).toBeDefined();
  });
});
