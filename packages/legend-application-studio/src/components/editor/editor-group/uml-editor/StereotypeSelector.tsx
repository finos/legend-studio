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

import { useCallback, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  CustomSelectorInput,
  createFilter,
  TimesIcon,
  ArrowCircleRightIcon,
  PanelEntryDragHandle,
  PanelDnDEntry,
  DragPreviewLayer,
  useDragPreviewLayer,
  clsx,
} from '@finos/legend-art';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Profile,
  type StereotypeReference,
  type Stereotype,
  isStubbed_PackageableElement,
  type AnnotatedElement,
} from '@finos/legend-graph';
import {
  annotatedElement_swapStereotypes,
  stereotypeReference_setValue,
} from '../../../../stores/graph-modifier/DomainGraphModifierHelper.js';
import {
  buildElementOption,
  type PackageableElementOption,
} from '@finos/legend-lego/graph-editor';
import { useDrop, useDrag } from 'react-dnd';

interface StereotypeOption {
  label: string;
  value: Stereotype;
}

export const STEREOTYPE_DND_TYPE = 'STEREOTYPE';
export type StereotypeDragSource = {
  stereotype: StereotypeReference;
};

export const StereotypeDragPreviewLayer: React.FC = () => (
  <DragPreviewLayer
    labelGetter={(item: StereotypeDragSource): string =>
      isStubbed_PackageableElement(item.stereotype.ownerReference.value)
        ? '(unknown)'
        : `${item.stereotype.ownerReference.value.name}.${item.stereotype.value.value}`
    }
    types={[STEREOTYPE_DND_TYPE]}
  />
);

export const StereotypeSelector = observer(
  (props: {
    annotatedElement: AnnotatedElement;
    stereotype: StereotypeReference;
    deleteStereotype: () => void;
    isReadOnly: boolean;
    darkTheme?: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const handleRef = useRef<HTMLDivElement>(null);
    const {
      annotatedElement,
      stereotype,
      deleteStereotype,
      isReadOnly,
      darkTheme,
    } = props;
    const editorStore = useEditorStore();

    // Profile
    const profileOptions = editorStore.graphManagerState.usableProfiles
      .map(buildElementOption)
      .filter((p) => p.value.p_stereotypes.length);
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: {
        data: PackageableElementOption<Profile>;
      }): string => option.data.value.path,
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
      editorStore.graphEditorMode.openElement(selectedProfile.value);
    // Stereotype
    const stereotypeOptions = selectedProfile.value.p_stereotypes.map((st) => ({
      label: st.value,
      value: st,
    }));
    const stereotypeFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option: { data: StereotypeOption }): string =>
        option.data.label,
    });
    const selectedStereotype = {
      value: stereotype.value,
      label: stereotype.value.value,
    };
    const updateStereotype = (val: StereotypeOption): void =>
      stereotypeReference_setValue(stereotype, val.value);

    // Drag and Drop
    const handleHover = useCallback(
      (item: StereotypeDragSource): void => {
        const draggingProperty = item.stereotype;
        const hoveredProperty = stereotype;
        annotatedElement_swapStereotypes(
          annotatedElement,
          draggingProperty,
          hoveredProperty,
        );
      },
      [annotatedElement, stereotype],
    );

    const [{ isBeingDraggedStereotype }, dropConnector] = useDrop<
      StereotypeDragSource,
      void,
      { isBeingDraggedStereotype: StereotypeReference | undefined }
    >(
      () => ({
        accept: [STEREOTYPE_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (monitor) => ({
          isBeingDraggedStereotype:
            monitor.getItem<StereotypeDragSource | null>()?.stereotype,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = stereotype === isBeingDraggedStereotype;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<StereotypeDragSource>(
        () => ({
          type: STEREOTYPE_DND_TYPE,
          item: () => ({
            stereotype: stereotype,
          }),
        }),
        [stereotype],
      );
    dragConnector(handleRef);
    dropConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <PanelDnDEntry
        ref={ref}
        className="stereotype-selector__container"
        placeholder={<div className="dnd__placeholder--light"></div>}
        showPlaceholder={isBeingDragged}
      >
        <PanelEntryDragHandle
          dragSourceConnector={handleRef}
          isDragging={isBeingDragged}
        />
        <div
          className={clsx('stereotype-selector', {
            'stereotype-selector--dark': darkTheme,
          })}
        >
          <div className="stereotype-selector__profile">
            <CustomSelectorInput
              className="stereotype-selector__profile__selector"
              disabled={isReadOnly}
              options={profileOptions}
              onChange={changeProfile}
              value={selectedProfile}
              placeholder="Choose a profile"
              filterOption={filterOption}
              darkMode={Boolean(darkTheme)}
            />
            <button
              className="stereotype-selector__profile__visit-btn"
              disabled={isStubbed_PackageableElement(stereotype.value._OWNER)}
              onClick={visitProfile}
              tabIndex={-1}
              title="Visit profile"
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
            placeholder="Choose a stereotype"
            filterOption={stereotypeFilterOption}
            darkMode={Boolean(darkTheme)}
          />
          {!isReadOnly && (
            <button
              className={clsx('uml-element-editor__remove-btn', {
                'btn--dark btn--caution': darkTheme,
              })}
              disabled={isReadOnly}
              onClick={deleteStereotype}
              tabIndex={-1}
              title="Remove"
            >
              <TimesIcon />
            </button>
          )}
        </div>
      </PanelDnDEntry>
    );
  },
);
