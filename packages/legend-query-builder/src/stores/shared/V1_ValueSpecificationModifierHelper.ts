import {
  V1_CFloat,
  V1_CInteger,
  V1_CStrictTime,
  V1_CString,
  V1_CBoolean,
  V1_CByteArray,
  V1_CDateTime,
  V1_CDecimal,
  V1_CStrictDate,
  V1_AppliedProperty,
} from '@finos/legend-graph';
import {
  guaranteeIsBoolean,
  guaranteeIsNumber,
  guaranteeIsString,
} from '@finos/legend-shared';
import { action } from 'mobx';

export const V1_PrimitiveValue_setValue = action(
  (
    target:
      | V1_CBoolean
      | V1_CByteArray
      | V1_CDateTime
      | V1_CDecimal
      | V1_CFloat
      | V1_CInteger
      | V1_CStrictDate
      | V1_CStrictTime
      | V1_CString,
    val: unknown,
  ) => {
    if (target instanceof V1_CBoolean) {
      target.value = guaranteeIsBoolean(val);
    } else if (
      target instanceof V1_CDecimal ||
      target instanceof V1_CFloat ||
      target instanceof V1_CInteger
    ) {
      target.value = guaranteeIsNumber(val);
    } else {
      target.value = guaranteeIsString(val);
    }
  },
);

export const V1_AppliedPropert_setProperty = action(
  (target: V1_AppliedProperty, val: string) => {
    target.property = val;
  },
);
