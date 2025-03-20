import {
  type ObserverContext,
  type V1_GenericType,
  type V1_PrimitiveValueSpecification,
  PRIMITIVE_TYPE,
  V1_CBoolean,
  V1_CByteArray,
  V1_CDateTime,
  V1_CDecimal,
  V1_CFloat,
  V1_CInteger,
  V1_CStrictDate,
  V1_CStrictTime,
  V1_CString,
  V1_PackageableType,
} from '@finos/legend-graph';
import { guaranteeType } from '@finos/legend-shared';

export const buildV1PrimitiveValueSpecification = (
  type: V1_GenericType,
  value: unknown,
  // observerContext: ObserverContext,
): V1_PrimitiveValueSpecification => {
  const packageableType = guaranteeType(type.rawType, V1_PackageableType);
  switch (packageableType.fullPath) {
    case PRIMITIVE_TYPE.STRING: {
      const val = new V1_CString();
      val.value = value as string;
      return val;
    }
    case PRIMITIVE_TYPE.BOOLEAN: {
      const val = new V1_CBoolean();
      val.value = value as boolean;
      return val;
    }
    case PRIMITIVE_TYPE.INTEGER: {
      const val = new V1_CInteger();
      val.value = value as number;
      return val;
    }
    case PRIMITIVE_TYPE.FLOAT: {
      const val = new V1_CFloat();
      val.value = value as number;
      return val;
    }
    case PRIMITIVE_TYPE.DECIMAL: {
      const val = new V1_CDecimal();
      val.value = value as number;
      return val;
    }
    case PRIMITIVE_TYPE.DATE: {
      const val = new V1_CStrictDate();
      val.value = value as string;
      return val;
    }
    case PRIMITIVE_TYPE.STRICTDATE: {
      const val = new V1_CStrictDate();
      val.value = value as string;
      return val;
    }
    case PRIMITIVE_TYPE.DATETIME: {
      const val = new V1_CDateTime();
      val.value = value as string;
      return val;
    }
    case PRIMITIVE_TYPE.STRICTTIME: {
      const val = new V1_CStrictTime();
      val.value = value as string;
      return val;
    }
    case PRIMITIVE_TYPE.BYTE: {
      const val = new V1_CByteArray();
      val.value = value as string;
      return val;
    }
    default: {
      throw new Error('Unsupported primitive type');
    }
  }
};
