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
  FaShapes,
  FaFileCode,
  FaDatabase,
  FaCheck,
} from 'react-icons/fa';
import { MdSettingsEthernet, MdLink } from 'react-icons/md';
import { FiPackage } from 'react-icons/fi';
import { returnUndefOnError } from '@finos/legend-studio-shared';
import { RiShapeLine } from 'react-icons/ri';
import type { PackageableElement } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import { PACKAGEABLE_ELEMENT_TYPE } from '../../models/metamodels/pure/model/packageableElements/PackageableElement';
import type { EditorStore } from '../../stores/EditorStore';
import type { Type } from '../../models/metamodels/pure/model/packageableElements/domain/Type';
import {
  Measure,
  Unit,
} from '../../models/metamodels/pure/model/packageableElements/domain/Measure';
import { Enumeration } from '../../models/metamodels/pure/model/packageableElements/domain/Enumeration';
import { PrimitiveType } from '../../models/metamodels/pure/model/packageableElements/domain/PrimitiveType';
import { Class } from '../../models/metamodels/pure/model/packageableElements/domain/Class';
import type { DSL_EditorPlugin_Extension } from '../../stores/EditorPlugin';

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
export const DiagramIcon: React.FC = () => (
  <div className="icon color--diagram">
    <FaShapes />
  </div>
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

export const getClassPropertyIcon = (type: Type): React.ReactNode => {
  if (type instanceof PrimitiveType) {
    return <PrimitiveTypeIcon />;
  } else if (type instanceof Class) {
    return <ClassIcon />;
  } else if (type instanceof Enumeration) {
    return <EnumerationIcon />;
  } else if (type instanceof Measure) {
    return <MeasureIcon />;
  } else if (type instanceof Unit) {
    return <UnitIcon />;
  }
  return <UnknownTypeIcon />;
};

export const getElementTypeIcon = (
  editorStore: EditorStore,
  type: string | undefined,
): React.ReactNode => {
  switch (type) {
    case PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE:
      return <PrimitiveTypeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE:
      return <PackageIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CLASS:
      return <ClassIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION:
      return <AssociationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION:
      return <EnumerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE:
      return <MeasureIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.UNIT:
      return <UnitIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE:
      return <ProfileIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION:
      return <FunctionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FLAT_DATA_STORE:
      return <FlatDataStoreIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DATABASE:
      return <DatabaseIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING:
      return <MappingIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM:
      return <DiagramIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.SERVICE:
      return <ServiceIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION:
      return <ConnectionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME:
      return <RuntimeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION:
      return <FileGenerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION:
      return <GenerationSpecificationIcon />;
    default: {
      if (type) {
        const extraElementIconGetters =
          editorStore.applicationStore.pluginManager
            .getEditorPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_EditorPlugin_Extension
                ).getExtraElementIconGetters?.() ?? [],
            );
        for (const iconGetter of extraElementIconGetters) {
          const elementIcon = iconGetter(type);
          if (elementIcon) {
            return elementIcon;
          }
        }
      }
      return <UnknownTypeIcon />;
    }
  }
};

export const getElementIcon = (
  editorStore: EditorStore,
  element: PackageableElement | undefined,
): React.ReactNode =>
  getElementTypeIcon(
    editorStore,
    element
      ? returnUndefOnError(() =>
          editorStore.graphState.getPackageableElementType(element),
        )
      : undefined,
  );

export const CheckIcon: React.FC = () => <FaCheck className="icon__check" />;
