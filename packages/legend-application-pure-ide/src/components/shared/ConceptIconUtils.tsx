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
  AtomIcon,
  DatabaseIcon,
  FunctionIcon,
  PURE_ClassIcon,
  PURE_EnumerationIcon,
  PURE_FunctionIcon,
  PURE_MappingIcon,
  PURE_MeasureIcon,
  PURE_PackageIcon,
  PURE_ProfileIcon,
  PURE_UnitIcon,
  PURE_UnknownElementTypeIcon,
  ShapesIcon,
} from '@finos/legend-art';
import { ConceptType } from '../../server/models/ConceptTree.js';

const PURE_NativeFunctionIcon: React.FC = () => (
  <div className="icon icon--function color--native-function">
    <FunctionIcon />
  </div>
);

const PURE_PropertyIcon: React.FC = () => (
  <div className="icon icon--property color--property">
    <AtomIcon />
  </div>
);

export const PURE_DiagramIcon: React.FC = () => (
  <div className="icon color--diagram">
    <ShapesIcon />
  </div>
);

const PURE_DatabaseIcon: React.FC = () => (
  <div className="icon icon--database">
    <DatabaseIcon />
  </div>
);

export const PURE_AssociationIcon: React.FC = () => (
  <div className="icon color--association color--pure-association">A</div>
);

export const getConceptIcon = (type: string): React.ReactNode => {
  switch (type) {
    case ConceptType.PACKAGE:
      return <PURE_PackageIcon />;
    case ConceptType.PROFILE:
      return <PURE_ProfileIcon />;
    case ConceptType.CLASS:
      return <PURE_ClassIcon />;
    case ConceptType.ASSOCIATION:
      return <PURE_AssociationIcon />;
    case ConceptType.PROPERTY:
    case ConceptType.QUALIFIED_PROPERTY:
      return <PURE_PropertyIcon />;
    case ConceptType.ENUMERATION:
      return <PURE_EnumerationIcon />;
    case ConceptType.MEASURE:
      return <PURE_MeasureIcon />;
    case ConceptType.UNIT:
      return <PURE_UnitIcon />;
    case ConceptType.FUNCTION:
      return <PURE_FunctionIcon />;
    case ConceptType.NATIVE_FUNCTION:
      return <PURE_NativeFunctionIcon />;
    case ConceptType.DIAGRAM:
      return <PURE_DiagramIcon />;
    case ConceptType.DATABASE:
      return <PURE_DatabaseIcon />;
    case ConceptType.MAPPING:
      return <PURE_MappingIcon />;
    default:
      return <PURE_UnknownElementTypeIcon />;
  }
};
