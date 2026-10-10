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

import { expect } from '@jest/globals';
import {
  ApplicationFrameworkProvider,
  ApplicationStoreProvider,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import type { CubeDocument } from '@finos/legend-cube';
import {
  act,
  fireEvent,
  type RenderResult,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { LEGEND_CUBE_TEST_ID } from '../__lib__/LegendCubeTesting.js';
import type { CubeEditorState } from '../stores/CubeEditorState.js';

/** React Flow watches the canvas with an IntersectionObserver, which jsdom lacks */
class TEST__IntersectionObserver {
  observe(): void {
    // nothing is ever in view under jsdom
  }
  unobserve(): void {
    // nothing to stop watching
  }
  disconnect(): void {
    // nothing to stop watching
  }
  takeRecords(): IntersectionObserverEntry[] {
    return [];
  }
}

/** Lets the canvas mount under jsdom; call before rendering it */
export const TEST__installCanvasDomStubs = (): void => {
  if (!('IntersectionObserver' in window)) {
    Object.defineProperty(window, 'IntersectionObserver', {
      configurable: true,
      writable: true,
      value: TEST__IntersectionObserver,
    });
  }
};

/**
 * Renders an element inside a Legend application, as a host would, and waits
 * for the element with the given test id: the framework renders nothing until
 * the application store has initialized
 */
export const TEST__renderInCubeApplication = async (
  element: React.ReactNode,
  applicationStore: GenericLegendApplicationStore,
  readyTestId: string,
): Promise<RenderResult> => {
  TEST__installCanvasDomStubs();
  const renderResult = render(
    <ApplicationStoreProvider store={applicationStore}>
      <TEST__BrowserEnvironmentProvider initialEntries={['/']}>
        <ApplicationFrameworkProvider>{element}</ApplicationFrameworkProvider>
      </TEST__BrowserEnvironmentProvider>
    </ApplicationStoreProvider>,
  );
  await waitFor(() => renderResult.getByTestId(readyTestId));
  return renderResult;
};

/**
 * Imports a cube into a rendered page, as Import does, and waits for its
 * tables to be typed again, so nothing changes after the test has ended
 */
export const TEST__importDocument = async (
  editorState: CubeEditorState,
  document: CubeDocument,
  readOnly = false,
): Promise<void> => {
  act(() => editorState.importDocument(document, readOnly));
  await waitFor(() => {
    if (editorState.isResolvingSources) {
      throw new Error('The imported tables are still being typed');
    }
  });
};

/** The graph header's 'Add Items' trigger */
export const TEST__getAddItemsTrigger = (): HTMLButtonElement =>
  within(screen.getByTestId(LEGEND_CUBE_TEST_ID.GRAPH_REGION)).getByRole(
    'button',
    { name: 'Add Items' },
  );

/** Opens 'Add Items' in the graph's header and returns its menu */
export const TEST__openAddItems = async (): Promise<HTMLElement> => {
  fireEvent.click(TEST__getAddItemsTrigger());
  return screen.findByRole('menu');
};

/**
 * Chooses an item of 'Add Items' by its label, as the menu shows it (e.g.
 * 'Relational Database Table', 'Data Product (BETA)', 'Filter by Column'),
 * and waits for the menu to close
 */
export const TEST__chooseAddItem = async (label: string): Promise<void> => {
  const menu = await TEST__openAddItems();
  fireEvent.click(within(menu).getByRole('menuitem', { name: label }));
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};

/** Closes 'Add Items' without choosing an item, as Escape does */
export const TEST__closeAddItems = async (): Promise<void> => {
  fireEvent.keyDown(screen.getByRole('menu'), { key: 'Escape' });
  await waitFor(() => expect(screen.queryByRole('menu')).toBeNull());
};
