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
  AccessPointIcon,
  BusinessTimeIcon,
  DatabaseIcon,
  FileCodeIcon,
  FunctionIcon,
  LayerGroupIcon,
  LinkIcon,
  MapIcon,
  PackageIcon,
  QuestionSquareIcon,
  RobotIcon,
  ServerIcon,
  ShapeLineIcon,
  Snowflake_BrandIcon,
  TableIcon,
  TabulatedDataFileIcon,
  PiFunctionBoldIcon,
  DatabaseImportIcon,
  SinglestoreIcon,
} from './Icon.js';

export const PURE_PrimitiveTypeIcon: React.FC = () => (
  <div className="icon icon--primitive color--primitive">p</div>
);

export const PURE_PackageIcon: React.FC = () => (
  <div className="icon color--package">
    <PackageIcon />
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
  <div className="icon icon--function color--function">
    <FunctionIcon />
  </div>
);

export const PURE_FlatDataStoreIcon: React.FC = () => (
  <div className="icon icon--flat-data color--flat-data">
    <LayerGroupIcon />
  </div>
);

export const PURE_DatabaseIcon: React.FC = () => (
  <div className="icon icon--database color--database">
    <DatabaseIcon />
  </div>
);

export const PURE_DatabaseSchemaIcon: React.FC = () => (
  <div className="icon icon--schema color--schema">
    <ServerIcon />
  </div>
);

export const PURE_DatabaseTableIcon: React.FC = () => (
  <div className="icon icon--table color--table">
    <TableIcon />
  </div>
);

export const PURE_DatabaseTabularFunctionIcon: React.FC = () => (
  <div className="icon icon--tabular-function color--table">
    <PiFunctionBoldIcon />
  </div>
);

export const PURE_DatabaseTableJoinIcon: React.FC = () => (
  <div className="icon icon--table-join color--primitive">@</div>
);

export const PURE_MappingIcon: React.FC = () => (
  <div className="icon color--mapping">
    <MapIcon />
  </div>
);

export const PURE_GenerationSpecificationIcon: React.FC = () => (
  <div className="icon">G</div>
);

export const PURE_FileGenerationIcon: React.FC = () => (
  <div className="icon color--file-generation">
    <FileCodeIcon />
  </div>
);

export const PURE_ServiceIcon: React.FC = () => (
  <div className="icon color--service">
    <RobotIcon />
  </div>
);

export const PURE_ConnectionIcon: React.FC = () => (
  <div className="icon icon--connection color--connection">
    <LinkIcon />
  </div>
);

export const PURE_RuntimeIcon: React.FC = () => (
  <div className="icon color--runtime">
    <BusinessTimeIcon />
  </div>
);

export const PURE_ModelStoreIcon: React.FC = () => (
  <div className="icon color--class">
    <ShapeLineIcon />
  </div>
);

export const PURE_DataIcon: React.FC = () => (
  <div className="icon color--data">
    <TabulatedDataFileIcon />
  </div>
);

export const PURE_SnowflakeAppIcon: React.FC = () => (
  <div className="icon color--snowflake-app">
    <Snowflake_BrandIcon />
  </div>
);

export const PURE_DataProductIcon: React.FC = () => (
  <div className="icon color--snowflake-app">
    <AccessPointIcon />
  </div>
);

export const PURE_UnknownElementTypeIcon: React.FC = () => (
  <div className="icon icon--unknown">
    <QuestionSquareIcon />
  </div>
);

export const PURE_IngestIcon: React.FC = () => (
  <div className="icon color--data">
    <DatabaseImportIcon />
  </div>
);

export const PURE_MemSQLFunctionIcon: React.FC = () => (
  <div className="icon color--mem-sql-function">
    <SinglestoreIcon />
  </div>
);
