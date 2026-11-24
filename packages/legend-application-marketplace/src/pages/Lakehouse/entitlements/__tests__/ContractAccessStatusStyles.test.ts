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

import { describe, expect, test } from '@jest/globals';
import { execFileSync } from 'child_process';
import { existsSync, readFileSync } from 'fs';
import { resolve } from 'path';

const PACKAGE_ROOT = resolve(__dirname, '../../../../..');
const LEGEND_ART_SCSS = resolve(
  PACKAGE_ROOT,
  '../../node_modules/@finos/legend-art/scss',
);

// The classes the access status cell puts on its elements. They are styled in
// sass, where a rule nested under the wrong parent compiles to a different
// selector and silently styles nothing, so this checks the compiled css.
const ACCESS_STATUS_CLASSES = [
  'marketplace-lakehouse-entitlements__access-status',
  'marketplace-lakehouse-entitlements__access-status__state',
  'marketplace-lakehouse-entitlements__access-status__chip',
];

describe('access status cell styles', () => {
  const cellSource = readFileSync(
    resolve(
      PACKAGE_ROOT,
      'src/pages/Lakehouse/entitlements/ContractAccessStatusCell.tsx',
    ),
    'utf8',
  );
  // Compiled by the sass command in its own process: the sass package does not
  // work in the browser-like environment the tests run in. It is installed in the
  // package, or hoisted to the root of the repository.
  const sassCommand = [
    resolve(PACKAGE_ROOT, 'node_modules/sass/sass.js'),
    resolve(PACKAGE_ROOT, '../../node_modules/sass/sass.js'),
  ].find((candidate) => existsSync(candidate));
  const css = execFileSync(
    process.execPath,
    [
      sassCommand ?? 'sass',
      resolve(PACKAGE_ROOT, 'style/index.scss'),
      `--load-path=${LEGEND_ART_SCSS}`,
      '--quiet',
      '--quiet-deps',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 },
  );

  test.each(ACCESS_STATUS_CLASSES)(
    'the cell uses the class %s',
    (className) => {
      expect(cellSource).toContain(className);
    },
  );

  test.each(ACCESS_STATUS_CLASSES)(
    'the class %s has a rule in the compiled css',
    (className) => {
      expect(css).toMatch(new RegExp(`\\.${className}[\\s.{:,]`));
    },
  );

  test('the chip is spaced from the state, and is sized', () => {
    const rule = (selector: string): string =>
      new RegExp(`${selector.replace(/\./g, '\\.')}\\s*\\{([^}]*)\\}`).exec(
        css,
      )?.[1] ?? '';

    // the exact sizes are a matter of taste: they only have to be set
    expect(rule('.marketplace-lakehouse-entitlements__access-status')).toMatch(
      /gap:\s*[\d.]+rem/,
    );
    const chip = rule(
      '.marketplace-lakehouse-entitlements__access-status__chip.MuiChip-root',
    );
    expect(chip).toMatch(/height:\s*[\d.]+rem/);
    expect(chip).toMatch(/font-size:\s*[\d.]+rem/);
  });

  test('a long list of contract error items scrolls within its area', () => {
    const className =
      'marketplace-lakehouse-entitlements__data-access-request-viewer__missing-ingests__details--items';
    // the viewer puts this class on a layer that lists items...
    const viewerSource = readFileSync(
      resolve(
        PACKAGE_ROOT,
        '../legend-extension-dsl-data-product/src/components/DataProduct/DataContract/DataAccessRequestViewer.tsx',
      ),
      'utf8',
    );
    expect(viewerSource).toContain(className);
    // ...and the css bounds its height, also when the layer is a child layer
    const rules = Array.from(
      css.matchAll(new RegExp(`[^{}]*${className}\\s*\\{([^}]*)\\}`, 'g')),
    );
    expect(rules.length).toBeGreaterThan(0);
    rules.forEach((rule) => {
      expect(rule[1]).toMatch(/max-height:\s*24rem/);
      expect(rule[1]).toMatch(/overflow-y:\s*auto/);
    });
  });

  test('the state and the chip are never cut off, the chip wraps instead', () => {
    const rule = (selector: string): string =>
      new RegExp(`${selector.replace(/\\./g, '\\\\.')}\\s*\\{([^}]*)\\}`).exec(
        css,
      )?.[1] ?? '';

    const container = rule(
      '.marketplace-lakehouse-entitlements__access-status',
    );
    expect(container).toMatch(/flex-wrap:\s*wrap/);
    expect(container).toMatch(/max-width:\s*100%/);
    // no ellipsis: the state is shown in full, and neither of them shrinks
    const state = rule(
      '.marketplace-lakehouse-entitlements__access-status__state',
    );
    expect(state).toMatch(/flex-shrink:\s*0/);
    expect(state).toMatch(/white-space:\s*nowrap/);
    expect(state).not.toMatch(/text-overflow/);
    expect(
      rule(
        '.marketplace-lakehouse-entitlements__access-status__chip.MuiChip-root',
      ),
    ).toMatch(/flex-shrink:\s*0/);
  });

  test('the contract errors of the viewer are not shrunk away by the content below them', () => {
    const className =
      'marketplace-lakehouse-entitlements__data-access-request-viewer__missing-ingests-wrapper';
    const viewerSource = readFileSync(
      resolve(
        PACKAGE_ROOT,
        '../legend-extension-dsl-data-product/src/components/DataProduct/DataContract/DataAccessRequestViewer.tsx',
      ),
      'utf8',
    );
    expect(viewerSource).toContain(className);
    // the content of the viewer is a flex column of a bounded height: without this,
    // the wrapper (which has overflow set) is the first thing to be shrunk to
    // nothing once the content below it grows
    const rule = new RegExp(`\\.${className}\\s*\\{([^}]*)\\}`).exec(css)?.[1];
    expect(rule).toMatch(/flex-shrink:\s*0/);
  });
});
