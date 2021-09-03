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
  FaCheck,
} from 'react-icons/fa';
import { MdSettingsEthernet, MdLink } from 'react-icons/md';
import { FiPackage } from 'react-icons/fi';
import { RiShapeLine } from 'react-icons/ri';

export const PrimitiveTypeIcon: React.FC = () => (
  <div className="icon icon--primitive color--primitive">p</div>
);
export const PackageIcon: React.FC = () => (
  <div className="icon color--package">
    <FiPackage />
  </div>
);
export const ClassIcon: React.FC = () => (
  <div className="icon color--class">C</div>
);
export const AssociationIcon: React.FC = () => (
  <div className="icon color--association">A</div>
);
export const EnumValueIcon: React.FC = () => (
  <div className="icon icon--enum-value color--enum-value">e</div>
);
export const EnumerationIcon: React.FC = () => (
  <div className="icon color--enumeration">E</div>
);
export const MeasureIcon: React.FC = () => (
  <div className="icon color--measure">M</div>
);
export const UnitIcon: React.FC = () => (
  <div className="icon color--unit">u</div>
);
export const ProfileIcon: React.FC = () => (
  <div className="icon color--profile">P</div>
);
export const FunctionIcon: React.FC = () => (
  <div className="icon icon--function color--function">(x)</div>
);
export const FlatDataStoreIcon: React.FC = () => (
  <div className="icon icon--flat-data color--flat-data">
    <FaLayerGroup />
  </div>
);
export const DatabaseIcon: React.FC = () => (
  <div className="icon icon--database color--database">
    <FaDatabase />
  </div>
);

export const SchemaIcon: React.FC = () => (
  <div className="icon icon--schema color--schema">
    <FaServer />
  </div>
);

export const TableIcon: React.FC = () => (
  <div className="icon icon--table color--table">
    <FaTable />
  </div>
);

export const TableJoinIcon: React.FC = () => (
  <div className="icon icon--table-join color--primitive">@</div>
);
export const MappingIcon: React.FC = () => (
  <div className="icon color--mapping">
    <FaMap />
  </div>
);
export const GenerationSpecificationIcon: React.FC = () => (
  <div className="icon">G</div>
);
export const FileGenerationIcon: React.FC = () => (
  <div className="icon color--file-generation">
    <FaFileCode />
  </div>
);
export const ServiceIcon: React.FC = () => (
  <div className="icon color--service">
    <FaRobot />
  </div>
);
export const ConnectionIcon: React.FC = () => (
  <div className="icon icon--connection color--connection">
    <MdLink />
  </div>
);
export const RuntimeIcon: React.FC = () => (
  <div className="icon color--runtime">
    <FaBusinessTime />
  </div>
);
export const ProjectConfigurationIcon: React.FC = () => (
  <div className="icon icon--config color--config">
    <MdSettingsEthernet />
  </div>
);
export const UnknownTypeIcon: React.FC = () => (
  <div>
    <FaQuestion />
  </div>
);
export const ModelStoreIcon: React.FC = () => (
  <div className="icon color--class">
    <RiShapeLine />
  </div>
);

export const CheckIcon: React.FC = () => <FaCheck className="icon__check" />;
