/**
 * Copyright 2020 Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import React from 'react';
import { FaMap, FaFile, FaQuestion, FaBusinessTime, FaShapes, FaFileCode } from 'react-icons/fa';
import { MdSettingsEthernet, MdLink } from 'react-icons/md';
import { FiPackage } from 'react-icons/fi';
import { getPackageableElementType } from 'Utilities/GraphUtil';
import { returnUndefOnError } from 'Utilities/GeneralUtil';
import SvgIcon, { SvgIconProps } from '@material-ui/core/SvgIcon';
import { RiShapeLine } from 'react-icons/ri';
import { PackageableElement, PACKAGEABLE_ELEMENT_TYPE } from 'MM/model/packageableElements/PackageableElement';

/* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
export const ElementIcon: React.FC<{
  element?: PackageableElement;
  type?: PACKAGEABLE_ELEMENT_TYPE;
}> = props => {
  const { element, type } = props;
  const elementType = type ?? (element ? returnUndefOnError(() => getPackageableElementType(element)) : undefined);
  switch (elementType) {
    case PACKAGEABLE_ELEMENT_TYPE.PRIMITIVE: return <PrimitiveTypeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PACKAGE: return <PackageIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CLASS: return <ClassIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ASSOCIATION: return <AssociationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.ENUMERATION: return <EnumerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MEASURE: return <MeasureIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.UNIT: return <UnitIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.PROFILE: return <ProfileIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FUNCTION: return <FunctionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.MAPPING: return <MappingIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.DIAGRAM: return <DiagramIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.TEXT: return <TextElementIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.CONNECTION: return <ConnectionIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.RUNTIME: return <RuntimeIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.FILE_GENERATION: return <FileGenerationIcon />;
    case PACKAGEABLE_ELEMENT_TYPE.GENERATION_SPECIFICATION: return <GenerationSpecificationIcon />;
    default: return <UnknownTypeIcon />;
  }
};

export const PrimitiveTypeIcon: React.FC = () => <div className="icon icon--primitive color--primitive">p</div>;
export const PackageIcon: React.FC = () => <div className="icon color--package"><FiPackage /></div>;
export const ClassIcon: React.FC = () => <div className="icon color--class">C</div>;
export const AssociationIcon: React.FC = () => <div className="icon color--association">A</div>;
export const EnumValueIcon: React.FC = () => <div className="icon icon--enum-value color--enum-value">e</div>;
export const EnumerationIcon: React.FC = () => <div className="icon color--enumeration">E</div>;
export const MeasureIcon: React.FC = () => <div className="icon color--measure">M</div>;
export const UnitIcon: React.FC = () => <div className="icon color--unit">u</div>;
export const ProfileIcon: React.FC = () => <div className="icon color--profile">P</div>;
export const FunctionIcon: React.FC = () => <div className="icon icon--function color--function">(x)</div>;
export const MappingIcon: React.FC = () => <div className="icon color--mapping"><FaMap /></div>;
// FIXME change color and icon
export const GenerationSpecificationIcon: React.FC = () => <div className="icon icon--function color--function">G</div>;
// export const DiagramIcon: React.FC = () => <div className="icon color--diagram">D</div>;
export const DiagramIcon: React.FC = () => <div className="icon color--diagram"><FaShapes /></div>;
export const TextElementIcon: React.FC = () => <div className="icon color--text-element"><FaFile /></div>;
export const FileGenerationIcon: React.FC = () => <div className="icon color--text-element"><FaFileCode /></div>;
export const ConnectionIcon: React.FC = () => <div className="icon icon--connection color--connection"><MdLink /></div>;
export const RuntimeIcon: React.FC = () => <div className="icon color--runtime"><FaBusinessTime /></div>;
export const ProjectConfigurationIcon: React.FC = () => <div className="icon icon--config color--config"><MdSettingsEthernet /></div>;
export const UnknownTypeIcon: React.FC = () => <div><FaQuestion /></div>;
export const ModelStoreIcon: React.FC = () => <div className="icon color--class"><RiShapeLine /></div>;

/**
 * As our use case gets more specific, we should freeze the design of icons
 * and stop relying on FontAwesome 4 or IonIcons 4 etc.
 *
 * Currently, we are using several icons from VS Code for now.
 * Since this is licensed under CC, we cannot modify this, so ideally, we should design our own icon later
 * See https://github.com/microsoft/vscode-codicons
 */
export const GoToFileIcon: React.FC<SvgIconProps> = props => (
  // See https://github.com/microsoft/vscode-codicons/blob/master/src/icons/go-to-file.svg
  <SvgIcon viewBox="0 0 16 16" fontSize="inherit" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M8.06065 3.85356L5.91421 6L5.2071 5.29289L6.49999 4H3.5C3.10218 4 2.72064 4.15804 2.43934 4.43934C2.15804 4.72065 2 5.10218 2 5.5C2 5.89783 2.15804 6.27936 2.43934 6.56066C2.72064 6.84197 3.10218 7 3.5 7H4V8H3.5C2.83696 8 2.20107 7.73661 1.73223 7.26777C1.26339 6.79893 1 6.16305 1 5.5C1 4.83696 1.26339 4.20108 1.73223 3.73224C2.20107 3.2634 2.83696 3 3.5 3H6.49999L6.49999 3H6.49996L6 2.50004V2.50001L5.2071 1.70711L5.91421 1L8.06065 3.14645L8.06065 3.85356ZM5 6.50003L5.91421 7.41424L6 7.32845V14H14V7H10V3H9.06065V2.73227L8.32838 2H11.2L11.5 2.1L14.9 5.6L15 6V14.5L14.5 15H5.5L5 14.5V9.00003V6.50003ZM11 3V6H13.9032L11 3Z" />
  </SvgIcon>
);

export const ErrorIcon: React.FC<SvgIconProps> = props => (
  // See https://github.com/microsoft/vscode-codicons/blob/master/src/icons/error.svg
  <SvgIcon viewBox="0 0 16 16" fontSize="inherit" {...props}>
    <path fillRule="evenodd" clipRule="evenodd" d="M8.6 1c1.6.1 3.1.9 4.2 2 1.3 1.4 2 3.1 2 5.1 0 1.6-.6 3.1-1.6 4.4-1 1.2-2.4 2.1-4 2.4-1.6.3-3.2.1-4.6-.7-1.4-.8-2.5-2-3.1-3.5C.9 9.2.8 7.5 1.3 6c.5-1.6 1.4-2.9 2.8-3.8C5.4 1.3 7 .9 8.6 1zm.5 12.9c1.3-.3 2.5-1 3.4-2.1.8-1.1 1.3-2.4 1.2-3.8 0-1.6-.6-3.2-1.7-4.3-1-1-2.2-1.6-3.6-1.7-1.3-.1-2.7.2-3.8 1-1.1.8-1.9 1.9-2.3 3.3-.4 1.3-.4 2.7.2 4 .6 1.3 1.5 2.3 2.7 3 1.2.7 2.6.9 3.9.6zM7.9 7.5L10.3 5l.7.7-2.4 2.5 2.4 2.5-.7.7-2.4-2.5-2.4 2.5-.7-.7 2.4-2.5-2.4-2.5.7-.7 2.4 2.5z" />
  </SvgIcon>
);
