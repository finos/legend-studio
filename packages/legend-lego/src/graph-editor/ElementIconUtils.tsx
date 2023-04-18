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

import {
  type Type,
  Class,
  Enumeration,
  Measure,
  Unit,
  PrimitiveType,
} from '@finos/legend-graph';
import {
  PURE_ClassIcon,
  PURE_PrimitiveTypeIcon,
  PURE_EnumerationIcon,
  PURE_MeasureIcon,
  PURE_UnknownElementTypeIcon,
  PURE_UnitIcon,
} from '@finos/legend-art';

export const getClassPropertyIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    return <PURE_PrimitiveTypeIcon />;
  } else if (type instanceof Class) {
    return <PURE_ClassIcon />;
  } else if (type instanceof Enumeration) {
    return <PURE_EnumerationIcon />;
  } else if (type instanceof Measure) {
    return <PURE_MeasureIcon />;
  } else if (type instanceof Unit) {
    return <PURE_UnitIcon />;
  }
  return <PURE_UnknownElementTypeIcon />;
};
