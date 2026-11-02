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

import { unitTest } from '@finos/legend-shared/test';
import { describe, expect, test } from '@jest/globals';
import { CORE_PURE_PATH, PRIMITIVE_TYPE } from '@finos/legend-graph';
import { _validatePivot } from '../DataCubeSnapshotBuilderUtils.js';
import {
  DataCubeColumnDataType,
  getDataType,
  isVariantType,
} from '../DataCubeQueryEngine.js';

const VARIANT = CORE_PURE_PATH.VARIANT;

describe(unitTest(`Variant: column type`), () => {
  test(`recognizes a Variant column typed by its path or by its name`, () => {
    expect(getDataType(VARIANT)).toBe(DataCubeColumnDataType.VARIANT);
    expect(getDataType('Variant')).toBe(DataCubeColumnDataType.VARIANT);
    expect(isVariantType(VARIANT)).toBe(true);
    expect(isVariantType('Variant')).toBe(true);
    expect(isVariantType(PRIMITIVE_TYPE.STRING)).toBe(false);
  });
});

describe(unitTest(`Variant: building and reading values`), () => {
  test(`refuses to pivot on a Variant column`, () => {
    expect(() =>
      _validatePivot(
        { columns: [{ name: 'doc', type: VARIANT }], castColumns: [] },
        [],
        [],
      ),
    ).toThrow(
      `Can't process pivot() expression: can't pivot on column 'doc' since it holds JSON. Pivot on a value extracted from it instead, e.g. an extended column such as x|$x.doc->get('key')->to(@String)`,
    );
  });
});
