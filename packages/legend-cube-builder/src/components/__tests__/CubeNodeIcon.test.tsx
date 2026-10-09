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
import {
  AlignBottomIcon,
  AlignMiddleIcon,
  AlignTopIcon,
  ArrowsJoinIcon,
  CompressIcon,
  DataCubeIcon,
  FilterIcon,
  LayerGroupIcon,
  PackageIcon,
  PencilIcon,
  QuestionSquareIcon,
  SortIcon,
  TableIcon,
} from '@finos/legend-art';
import { createNodeRegistry } from '@finos/legend-cube';
import { render } from '@testing-library/react';
import { CubeNodeIcon } from '../CubeNodeIcon.js';

/** The icon each node type's icon name draws (PLAN §11.4) */
const EXPECTED_ICONS: Readonly<Record<string, React.FC>> = {
  table: TableIcon,
  dataProduct: PackageIcon,
  filter: FilterIcon,
  join: ArrowsJoinIcon,
  concat: LayerGroupIcon,
  limit: AlignTopIcon,
  drop: AlignBottomIcon,
  slice: AlignMiddleIcon,
  distinct: CompressIcon,
  restrict: DataCubeIcon.TableColumns,
  group: DataCubeIcon.TableGroupBy,
  rename: PencilIcon,
  sort: SortIcon,
};

/** The markup an icon draws */
const drawn = (element: React.ReactElement): string =>
  render(element).container.innerHTML;

describe('Node icons', () => {
  test.each(Object.entries(EXPECTED_ICONS))(
    'Draws the icon named %s',
    (name, Icon) => {
      expect(drawn(<CubeNodeIcon icon={name} />)).toBe(drawn(<Icon />));
    },
  );

  test('Has an expected icon for every registered type', () => {
    const registry = createNodeRegistry();
    [...registry.sources, ...registry.transforms].forEach((definition) =>
      expect(Object.keys(EXPECTED_ICONS)).toContain(definition.icon),
    );
  });

  test('Draws a question mark for no icon name or an unknown one', () => {
    const question = drawn(<QuestionSquareIcon />);
    expect(drawn(<CubeNodeIcon icon={undefined} />)).toBe(question);
    expect(drawn(<CubeNodeIcon icon="no-such-icon" />)).toBe(question);
    expect(drawn(<CubeNodeIcon icon="constructor" />)).toBe(question);
  });
});
