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

import {
  ApplicationFrameworkProvider,
  ApplicationStoreProvider,
  type GenericLegendApplicationStore,
} from '@finos/legend-application';
import { TEST__BrowserEnvironmentProvider } from '@finos/legend-application/test';
import { type RenderResult, render, waitFor } from '@testing-library/react';

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
