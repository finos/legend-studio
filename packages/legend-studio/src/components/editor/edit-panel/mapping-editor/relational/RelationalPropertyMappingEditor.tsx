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

import { observer } from 'mobx-react-lite';
import type {
  RelationalPropertyMappingState,
  RootRelationalInstanceSetImplementationState,
} from '../../../../../stores/editor-state/element-editor-state/mapping/relational/RelationalInstanceSetImplementationState';
import {
  CLASS_PROPERTY_TYPE,
  getClassPropertyType,
} from '../../../../../models/metamodels/pure/model/packageableElements/domain/Class';

export const RelationalPropertyMappingEditor = observer(
  (props: {
    relationalPropertyMappingState: RelationalPropertyMappingState;
    relationalInstanceSetImplementationState: RootRelationalInstanceSetImplementationState;
    setImplementationHasParserError: boolean;
    isReadOnly: boolean;
  }) => {
    const {
      relationalPropertyMappingState,
      // relationalInstanceSetImplementationState,
      // setImplementationHasParserError,
      // isReadOnly,
    } = props;
    // const editorStore = useEditorStore();
    // const mappingEditorState = editorStore.getCurrentEditorState(MappingEditorState);
    // const visitEmbeddedPropertyMapping = (): void => { if (flatDataPropertyMappingState.propertyMapping instanceof EmbeddedFlatDataPropertyMapping) { mappingEditorState.openMappingElement(flatDataPropertyMappingState.propertyMapping, true) } };
    // const disableEditingTransform =
    //   relationalInstanceSetImplementationState.isConvertingTransformObjects ||
    //   isReadOnly;
    // const transformProps = {
    //   disableTransform:
    //     relationalInstanceSetImplementationState.isConvertingTransformObjects,
    //   forceBackdrop: setImplementationHasParserError,
    // };
    switch (
      getClassPropertyType(
        relationalPropertyMappingState.propertyMapping.property.value
          .genericType.value.rawType,
      )
    ) {
      case CLASS_PROPERTY_TYPE.UNIT:
      case CLASS_PROPERTY_TYPE.MEASURE:
      case CLASS_PROPERTY_TYPE.PRIMITIVE:
      case CLASS_PROPERTY_TYPE.ENUMERATION:
      case CLASS_PROPERTY_TYPE.CLASS:
        return (
          <div className="property-mapping-editor__entry--embedded">
            (edition in Pure code is currently not supported)
          </div>
        );
      default:
        return null;
    }
  },
);
