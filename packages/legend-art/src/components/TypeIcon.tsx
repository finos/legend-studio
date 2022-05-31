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
  FaMap,
  FaQuestion,
  FaLayerGroup,
  FaRobot,
  FaBusinessTime,
  FaFileCode,
  FaDatabase,
  FaServer,
  FaTable,
} from 'react-icons/fa';
import { MdSettingsEthernet, MdLink } from 'react-icons/md';
import { FiPackage } from 'react-icons/fi';
import { RiShapeLine } from 'react-icons/ri';
import { TabulatedDataFileIcon } from './Icon';

export const PURE_PrimitiveTypeIcon: React.FC = () => (
  <div className="icon icon--primitive color--primitive">p</div>
);

export const PURE_PackageIcon: React.FC = () => (
  <div className="icon color--package">
    <FiPackage />
  </div>
);

export const PURE_ClassIcon: React.FC = () => (
  <div className="icon color--class">C</div>
);

export const PURE_AssociationIcon: React.FC = () => (
  <div className="icon color--association">A</div>
);

export const PURE_EnumValueIcon: React.FC = () => (
  <div className="icon icon--enum-value color--enum-value">e</div>
);

export const PURE_EnumerationIcon: React.FC = () => (
  <div className="icon color--enumeration">E</div>
);

export const PURE_MeasureIcon: React.FC = () => (
  <div className="icon color--measure">M</div>
);

export const PURE_UnitIcon: React.FC = () => (
  <div className="icon color--unit">u</div>
);

export const PURE_ProfileIcon: React.FC = () => (
  <div className="icon color--profile">P</div>
);

export const PURE_FunctionIcon: React.FC = () => (
  <div className="icon icon--function color--function">(x)</div>
);

export const PURE_FlatDataStoreIcon: React.FC = () => (
  <div className="icon icon--flat-data color--flat-data">
    <FaLayerGroup />
  </div>
);

export const PURE_DatabaseIcon: React.FC = () => (
  <div className="icon icon--database color--database">
    <FaDatabase />
  </div>
);

export const PURE_DatabaseSchemaIcon: React.FC = () => (
  <div className="icon icon--schema color--schema">
    <FaServer />
  </div>
);

export const PURE_DatabaseTableIcon: React.FC = () => (
  <div className="icon icon--table color--table">
    <FaTable />
  </div>
);

export const PURE_DatabaseTableJoinIcon: React.FC = () => (
  <div className="icon icon--table-join color--primitive">@</div>
);

export const PURE_MappingIcon: React.FC = () => (
  <div className="icon color--mapping">
    <FaMap />
  </div>
);

export const PURE_GenerationSpecificationIcon: React.FC = () => (
  <div className="icon">G</div>
);

export const PURE_FileGenerationIcon: React.FC = () => (
  <div className="icon color--file-generation">
    <FaFileCode />
  </div>
);

export const PURE_ServiceIcon: React.FC = () => (
  <div className="icon color--service">
    <FaRobot />
  </div>
);

export const PURE_ConnectionIcon: React.FC = () => (
  <div className="icon icon--connection color--connection">
    <MdLink />
  </div>
);

export const PURE_RuntimeIcon: React.FC = () => (
  <div className="icon color--runtime">
    <FaBusinessTime />
  </div>
);

export const PURE_ModelStoreIcon: React.FC = () => (
  <div className="icon color--class">
    <RiShapeLine />
  </div>
);

export const PURE_DataIcon: React.FC = () => (
  <div className="icon color--data">
    <TabulatedDataFileIcon />
  </div>
);

export const PURE_UnknownElementTypeIcon: React.FC = () => (
  <div>
    <FaQuestion />
  </div>
);

// TODO: consider moving this back to `Icon`?
export const ProjectConfigurationIcon: React.FC = () => (
  <div className="icon icon--config color--config">
    <MdSettingsEthernet />
  </div>
);
