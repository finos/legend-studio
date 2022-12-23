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

export * from './DSL_Diagram_Extension.js';
export { DSL_Diagram_LegendStudioApplicationPlugin } from './components/studio/DSL_Diagram_LegendStudioApplicationPlugin.js';

export { DiagramEditorState } from './stores/studio/DiagramEditorState.js';

export {
  DiagramRenderer,
  DIAGRAM_ALIGNER_OPERATOR,
  DIAGRAM_ZOOM_LEVELS,
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
} from './DiagramRenderer.js';

export { Diagram } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_Diagram.js';
export { ClassView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_ClassView.js';
export { RelationshipView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_RelationshipView.js';
export { PropertyHolderView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyHolderView.js';
export { PropertyView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_PropertyView.js';
export { AssociationView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_AssociationView.js';
export { GeneralizationView } from './graph/metamodel/pure/packageableElements/diagram/DSL_Diagram_GeneralizationView.js';
export { Point } from './graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Point.js';
export { Rectangle } from './graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_Rectangle.js';
export { PositionedRectangle } from './graph/metamodel/pure/packageableElements/diagram/geometry/DSL_Diagram_PositionedRectangle.js';

export * from './graph/helpers/DSL_Diagram_Helper.js';
export * from './graphManager/DSL_Diagram_GraphManagerHelper.js';
export { V1_DSL_Diagram_PackageableElementPointerType } from './graphManager/protocol/pure/DSL_Diagram_PureProtocolProcessorPlugin.js';
