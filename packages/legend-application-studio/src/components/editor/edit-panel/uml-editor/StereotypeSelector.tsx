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

import { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  createFilter,
  TimesIcon,
  ArrowCircleRightIcon,
  VerticalDragHandleIcon,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Profile,
  type StereotypeReference,
  type Stereotype,
  isStubbed_PackageableElement,
  Association,
  Class,
  ConcreteFunctionDefinition,
  DataElement,
  Enum,
  Enumeration,
  Property,
} from '@finos/legend-graph';
import {
  association_arrangeStereotypeReferences,
  class_arrangeStereotypeReferences,
  enumeration_arrangeStereotypeReferences,
  enum_arrangeStereotypeReferences,
  function_arrangeStereotypeReferences,
  property_arrangeStereotypeReferences,
  stereotypeReference_setValue,
} from '../../../../stores/graphModifier/DomainGraphModifierHelper.js';
import type { PackageableElementOption } from '@finos/legend-application';
import {
  type AllStereotypeDragSource,
  CLASS_TAGGED_VALUE_DND_TYPE,
} from './ClassEditor.js';
import { action } from 'mobx';
import { type DropTargetMonitor, useDrop, useDrag } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';
import { dataElement_arrangeStereotypeReferences } from '../../../../stores/graphModifier/DSLData_GraphModifierHelper.js';

interface StereotypeOption {
  label: string;
  value: Stereotype;
}

export const StereotypeSelector = observer(
  (props: {
    _parentType: unknown;
    stereotype: StereotypeReference;
    projectionStereotypeState: AllStereotypeDragSource;
    deleteStereotype: () => void;
    isReadOnly: boolean;
    darkTheme?: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const {
      _parentType,
      stereotype,
      projectionStereotypeState,
      deleteStereotype,
      isReadOnly,
      darkTheme,
    } = props;
    const editorStore = useEditorStore();
    // Profile
    const profileOptions = editorStore.profileOptions.filter(
      (p) => p.value.p_stereotypes.length,
    );
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: PackageableElementOption<Profile>): string =>
        option.value.path,
    });
    const [selectedProfile, setSelectedProfile] = useState<
      PackageableElementOption<Profile>
    >({ value: stereotype.value._OWNER, label: stereotype.value._OWNER.name });
    const changeProfile = (val: PackageableElementOption<Profile>): void => {
      if (val.value.p_stereotypes.length) {
        setSelectedProfile(val);
        stereotypeReference_setValue(
          stereotype,
          val.value.p_stereotypes[0] as Stereotype,
        );
      }
    };
    const visitProfile = (): void =>
      editorStore.openElement(selectedProfile.value);
    // Stereotype
    const stereotypeOptions = selectedProfile.value.p_stereotypes.map((st) => ({
      label: st.value,
      value: st,
    }));
    const stereotypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: StereotypeOption): string => option.label,
    });
    const selectedStereotype = {
      value: stereotype.value,
      label: stereotype.value.value,
    };
    const updateStereotype = (val: StereotypeOption): void =>
      stereotypeReference_setValue(stereotype, val.value);

    // Drag and Drop
    const handleHover = useCallback(
      (item: AllStereotypeDragSource, monitor: DropTargetMonitor): void => {
        const draggingProperty = item.stereotype;
        const hoveredProperty = stereotype;
        if (_parentType instanceof Class) {
          class_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof Enum) {
          enum_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof Enumeration) {
          enumeration_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof Association) {
          association_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof ConcreteFunctionDefinition) {
          function_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof DataElement) {
          dataElement_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else if (_parentType instanceof Property) {
          property_arrangeStereotypeReferences(
            _parentType,
            draggingProperty,
            hoveredProperty,
          );
        } else {
          //stereotype editor parent class is something else
        }
      },
      [_parentType, stereotype],
    );

    const [{ isBeingDraggedStereotype }, dropConnector] = useDrop(
      () => ({
        accept: [CLASS_TAGGED_VALUE_DND_TYPE.TAGGED_VALUE],
        hover: (
          item: AllStereotypeDragSource,
          monitor: DropTargetMonitor,
        ): void => handleHover(item, monitor),
        collect: (
          monitor,
        ): { isBeingDraggedStereotype: StereotypeReference | undefined } => ({
          isBeingDraggedStereotype:
            monitor.getItem<AllStereotypeDragSource | null>()?.stereotype,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged =
      projectionStereotypeState.stereotype === isBeingDraggedStereotype;

    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: CLASS_TAGGED_VALUE_DND_TYPE.TAGGED_VALUE,
        item: (): AllStereotypeDragSource => {
          projectionStereotypeState.setIsBeingDragged(true);
          return {
            stereotype: stereotype,
            isBeingDragged: projectionStereotypeState.isBeingDragged,
            setIsBeingDragged: action,
          };
        },
        end: (item: AllStereotypeDragSource | undefined): void =>
          projectionStereotypeState.setIsBeingDragged(false),
      }),
      [projectionStereotypeState],
    );
    dragConnector(dropConnector(ref));

    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div ref={ref}>
        {isBeingDragged && (
          <div className="uml-element-dnd-placeholder-container">
            <div className="uml-element-dnd-placeholder ">
              <span className="uml-element-dnd-name">
                {selectedStereotype.label}
              </span>
            </div>
          </div>
        )}

        {!isBeingDragged && (
          <div className="stereotype-selector">
            <div
              className={`stereotype-selector__profile ${
                darkTheme ? 'stereotype-selector-dark-theme' : ''
              }`}
            >
              <div className="uml-element-editor__drag-handler" tabIndex={-1}>
                <VerticalDragHandleIcon />
              </div>
              <CustomSelectorInput
                className="stereotype-selector__profile__selector"
                disabled={isReadOnly}
                options={profileOptions}
                onChange={changeProfile}
                value={selectedProfile}
                placeholder={'Choose a profile'}
                filterOption={filterOption}
                darkMode={Boolean(darkTheme)}
              />
              <button
                className={`stereotype-selector__profile__visit-btn ${
                  darkTheme ? 'stereotype-selector-dark-theme' : ''
                }`}
                disabled={isStubbed_PackageableElement(stereotype.value._OWNER)}
                onClick={visitProfile}
                tabIndex={-1}
                title={'Visit profile'}
              >
                <ArrowCircleRightIcon />
              </button>
            </div>
            <CustomSelectorInput
              className="stereotype-selector__stereotype"
              disabled={isReadOnly}
              options={stereotypeOptions}
              onChange={updateStereotype}
              value={selectedStereotype}
              placeholder={'Choose a stereotype'}
              filterOption={stereotypeFilterOption}
              darkMode={darkTheme ?? false}
            />
            {!isReadOnly && (
              <button
                className="uml-element-editor__remove-btn"
                disabled={isReadOnly}
                onClick={deleteStereotype}
                tabIndex={-1}
                title={'Remove'}
              >
                <TimesIcon />
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);
