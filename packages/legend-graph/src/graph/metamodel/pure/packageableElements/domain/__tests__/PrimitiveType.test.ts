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
import { unitTest } from '@finos/legend-shared/test';
import {
  PRECISE_PRIMITIVE_TYPE,
  PRIMITIVE_TYPE,
} from '../../../../../MetaModelConst.js';
import { getCorrespondingStandardPrimitiveType } from '../PrimitiveType.js';

describe('getCorrespondingStandardPrimitiveType', () => {
  // -------------------- Full path matching --------------------

  test(unitTest('VARCHAR full path maps to STRING'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.VARCHAR),
    ).toBe(PRIMITIVE_TYPE.STRING);
  });

  test(unitTest('INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('TINY_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.TINY_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('U_TINY_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.U_TINY_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('SMALL_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.SMALL_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('U_SMALL_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.U_SMALL_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('U_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.U_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('BIG_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.BIG_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('U_BIG_INT full path maps to INTEGER'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.U_BIG_INT),
    ).toBe(PRIMITIVE_TYPE.INTEGER);
  });

  test(unitTest('FLOAT full path maps to FLOAT'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.FLOAT),
    ).toBe(PRIMITIVE_TYPE.FLOAT);
  });

  test(unitTest('DOUBLE full path maps to FLOAT'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.DOUBLE),
    ).toBe(PRIMITIVE_TYPE.FLOAT);
  });

  test(unitTest('DECIMAL full path maps to DECIMAL'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.DECIMAL),
    ).toBe(PRIMITIVE_TYPE.DECIMAL);
  });

  test(unitTest('NUMERIC full path maps to DECIMAL'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.NUMERIC),
    ).toBe(PRIMITIVE_TYPE.DECIMAL);
  });

  test(unitTest('STRICTDATE full path maps to STRICTDATE'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.STRICTDATE),
    ).toBe(PRIMITIVE_TYPE.STRICTDATE);
  });

  test(unitTest('DATETIME full path maps to DATETIME'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.DATETIME),
    ).toBe(PRIMITIVE_TYPE.DATETIME);
  });

  test(unitTest('TIMESTAMP full path maps to DATETIME'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.TIMESTAMP),
    ).toBe(PRIMITIVE_TYPE.DATETIME);
  });

  test(unitTest('STRICTTIME full path maps to STRICTTIME'), () => {
    expect(
      getCorrespondingStandardPrimitiveType(PRECISE_PRIMITIVE_TYPE.STRICTTIME),
    ).toBe(PRIMITIVE_TYPE.STRICTTIME);
  });

  // -------------------- Short name matching --------------------

  test(unitTest('Short name "Varchar" maps to STRING'), () => {
    expect(getCorrespondingStandardPrimitiveType('Varchar')).toBe(
      PRIMITIVE_TYPE.STRING,
    );
  });

  test(unitTest('Short name "Int" maps to INTEGER'), () => {
    expect(getCorrespondingStandardPrimitiveType('Int')).toBe(
      PRIMITIVE_TYPE.INTEGER,
    );
  });

  test(unitTest('Short name "BigInt" maps to INTEGER'), () => {
    expect(getCorrespondingStandardPrimitiveType('BigInt')).toBe(
      PRIMITIVE_TYPE.INTEGER,
    );
  });

  test(unitTest('Short name "Float4" maps to FLOAT'), () => {
    expect(getCorrespondingStandardPrimitiveType('Float4')).toBe(
      PRIMITIVE_TYPE.FLOAT,
    );
  });

  test(unitTest('Short name "Double" maps to FLOAT'), () => {
    expect(getCorrespondingStandardPrimitiveType('Double')).toBe(
      PRIMITIVE_TYPE.FLOAT,
    );
  });

  test(unitTest('Short name "Numeric" maps to DECIMAL'), () => {
    expect(getCorrespondingStandardPrimitiveType('Numeric')).toBe(
      PRIMITIVE_TYPE.DECIMAL,
    );
  });

  test(unitTest('Short name "Timestamp" maps to DATETIME'), () => {
    expect(getCorrespondingStandardPrimitiveType('Timestamp')).toBe(
      PRIMITIVE_TYPE.DATETIME,
    );
  });

  test(unitTest('Short name "Time" maps to STRICTTIME'), () => {
    expect(getCorrespondingStandardPrimitiveType('Time')).toBe(
      PRIMITIVE_TYPE.STRICTTIME,
    );
  });

  // -------------------- Invalid inputs --------------------

  test(unitTest('Standard primitive type path returns undefined'), () => {
    expect(getCorrespondingStandardPrimitiveType('String')).toBeUndefined();
    expect(getCorrespondingStandardPrimitiveType('Integer')).toBeUndefined();
    expect(getCorrespondingStandardPrimitiveType('Boolean')).toBeUndefined();
  });

  test(unitTest('Arbitrary path with delimiter returns undefined'), () => {
    expect(getCorrespondingStandardPrimitiveType('x::Varchar')).toBeUndefined();
    expect(
      getCorrespondingStandardPrimitiveType('foo::bar::Int'),
    ).toBeUndefined();
  });

  test(unitTest('Unknown short name returns undefined'), () => {
    expect(getCorrespondingStandardPrimitiveType('Foo')).toBeUndefined();
    expect(getCorrespondingStandardPrimitiveType('')).toBeUndefined();
  });
});
