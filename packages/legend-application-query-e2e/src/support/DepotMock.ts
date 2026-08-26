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

import type { Page } from '@playwright/test';

/**
 * Depot responses are served by the real mock depot server
 * (`@finos/legend-fixture-mock-server`), which holds a single data space
 * with a single execution context — enough for most tests, but not for
 * exercising the setup panel's selectors.
 *
 * Rather than growing that shared fixture (it backs local development for
 * every Legend app), these helpers intercept its responses and enrich them
 * per-test, so the extra shapes live next to the specs that assert on them
 * and stay in sync with the fixture they extend.
 */

/** Prefix of the extra data spaces added by {@link mockAdditionalDataSpaces}. */
export const EXTRA_DATA_SPACE_TITLE_PREFIX = 'Extra DataSpace';

/** Name of the execution context added by {@link mockSecondExecutionContext}. */
export const SECOND_EXECUTION_CONTEXT_NAME = 'secondContext';

/** Title of the execution context added by {@link mockSecondExecutionContext}. */
export const SECOND_EXECUTION_CONTEXT_TITLE = 'Second Context';

interface DataSpaceStoredEntity {
  entity: {
    path: string;
    content: Record<string, unknown>;
  };
}

/**
 * Pad the data space listing out to `total` entries by cloning the fixture's
 * data space under new paths and titles.
 *
 * NOTE: only the fixture's own data space has backing model data, so the
 * clones are listing-only — a test may assert they appear in the dropdown,
 * but must not select one.
 */
export const mockAdditionalDataSpaces = async (
  page: Page,
  total: number,
): Promise<void> => {
  await page.route(/\/depot\/api\/classifiers\/.*\/entities/, async (route) => {
    const response = await route.fetch();
    const entries = (await response.json()) as DataSpaceStoredEntity[];
    const base = entries[0];
    if (!base) {
      await route.fulfill({ json: entries });
      return;
    }
    const clones = Array.from({ length: Math.max(total - 1, 0) }, (_, idx) => {
      const suffix = idx + 1;
      return {
        ...base,
        entity: {
          ...base.entity,
          path: `test::ExtraDataSpace${suffix}`,
          content: {
            ...base.entity.content,
            name: `ExtraDataSpace${suffix}`,
            title: `${EXTRA_DATA_SPACE_TITLE_PREFIX} ${suffix}`,
          },
        },
      };
    });
    await route.fulfill({ json: [base, ...clones] });
  });
};

/**
 * Give the fixture's data space a second execution context.
 *
 * The setup panel only renders its context selector when a data space has
 * more than one context, and it reads them from the built graph — so this
 * patches the project entities the graph is built from, not the data space
 * analytics artifact.
 *
 * The added context reuses the first one's mapping and runtime, so it stays
 * valid without the fixture needing extra model elements.
 */
export const mockSecondExecutionContext = async (page: Page): Promise<void> => {
  const addExecutionContext = (node: unknown): void => {
    if (!node || typeof node !== 'object') {
      return;
    }
    if (Array.isArray(node)) {
      node.forEach(addExecutionContext);
      return;
    }
    const record = node as Record<string, unknown>;
    if (
      record._type === 'dataSpace' &&
      Array.isArray(record.executionContexts) &&
      record.executionContexts.length === 1
    ) {
      const [first] = record.executionContexts as Record<string, unknown>[];
      record.executionContexts = [
        first,
        {
          ...first,
          name: SECOND_EXECUTION_CONTEXT_NAME,
          title: SECOND_EXECUTION_CONTEXT_TITLE,
        },
      ];
      return;
    }
    Object.values(record).forEach(addExecutionContext);
  };

  // the graph is built from either of these, depending on the flow
  for (const pattern of [
    /\/depot\/api\/projects\/.*\/versions\/[^/]+$/,
    /\/pureModelContextData$/,
  ]) {
    await page.route(pattern, async (route) => {
      const response = await route.fetch();
      const data = (await response.json()) as unknown;
      addExecutionContext(data);
      await route.fulfill({ json: data });
    });
  }
};
