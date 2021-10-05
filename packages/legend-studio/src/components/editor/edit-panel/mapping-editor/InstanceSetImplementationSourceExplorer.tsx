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
  useApplicationStore,
  ActionAlertActionType,
} from '@finos/legend-application';
import { clsx, BlankPanelPlaceholder } from '@finos/legend-art';
import {
  InstanceSetImplementation,
  PackageableElement,
  Class,
  FlatData,
  Database,
  View,
  Table,
  Type,
  RootFlatDataRecordType,
} from '@finos/legend-graph';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import { useState, useCallback } from 'react';
import { useDrop } from 'react-dnd';
import { FaEdit } from 'react-icons/fa';
import { CORE_DND_TYPE, ElementDragSource, TypeTree } from '../../../..';
import { FlatDataInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/FlatDataInstanceSetImplementationState';
import {
  MappingEditorState,
  getMappingElementSource,
  MappingElementSource,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import {
  MappingElementState,
  InstanceSetImplementationState,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementState';
import { PureInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/PureInstanceSetImplementationState';
import { UnsupportedInstanceSetImplementationState } from '../../../../stores/editor-state/element-editor-state/mapping/UnsupportedInstanceSetImplementationState';
import type { MappingElementSourceDropTarget } from '../../../../stores/shared/DnDUtil';
import { STUDIO_TEST_ID } from '../../../StudioTestID';
import { useEditorStore } from '../../EditorStoreProvider';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor';
import { FlatDataRecordTypeTree } from './FlatDataRecordTypeTree';
import {
  getSourceElementLabel,
  InstanceSetImplementationSourceSelectorModal,
} from './InstanceSetImplementationSourceSelectorModal';
import { TableOrViewSourceTree } from './relational/TableOrViewSourceTree';

export const InstanceSetImplementationSourceExplorer = observer(
  (props: {
    setImplementation: InstanceSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const instanceSetImplementationState =
      mappingEditorState.currentTabState instanceof MappingElementState
        ? mappingEditorState.currentTabState
        : undefined;
    const srcElement = getMappingElementSource(setImplementation);
    const sourceLabel = getSourceElementLabel(srcElement);
    // `null` is when we want to open the modal using the existing source
    // `undefined` is to close the source modal
    // any other value to open the source modal using that value as the initial state of the modal
    const [
      sourceElementForSourceSelectorModal,
      setSourceElementForSourceSelectorModal,
    ] = useState<MappingElementSource | undefined | null>();
    const CHANGING_SOURCE_ON_EMBEDDED =
      'Changing source on mapping with embedded children will delete all its children';
    const showSourceSelectorModal = (): void => {
      if (!isReadOnly) {
        const embeddedSetImpls =
          setImplementation.getEmbeddedSetImplmentations();
        if (!embeddedSetImpls.length) {
          setSourceElementForSourceSelectorModal(null);
        } else {
          editorStore.setActionAltertInfo({
            message: CHANGING_SOURCE_ON_EMBEDDED,
            onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
            onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
            actions: [
              {
                label: 'Continue',
                handler: (): void =>
                  setSourceElementForSourceSelectorModal(null),
                type: ActionAlertActionType.PROCEED,
              },
              {
                label: 'Cancel',
              },
            ],
          });
        }
      }
    };
    const hideSourceSelectorModal = (): void =>
      setSourceElementForSourceSelectorModal(undefined);
    // Drag and Drop
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    const dndType = [
      CORE_DND_TYPE.PROJECT_EXPLORER_CLASS,
      CORE_DND_TYPE.PROJECT_EXPLORER_FLAT_DATA,
      CORE_DND_TYPE.PROJECT_EXPLORER_DATABASE,
    ];
    /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
    // smartly analyze the content of the source and automatically assign it or its sub-part
    // as class mapping source when possible
    const changeClassMappingSourceDriver = useCallback(
      (droppedPackagableElement: PackageableElement): void => {
        if (droppedPackagableElement instanceof Class) {
          flowResult(
            mappingEditorState.changeClassMappingSourceDriver(
              setImplementation,
              droppedPackagableElement,
            ),
          ).catch(applicationStore.alertIllegalUnhandledError);
        } else if (droppedPackagableElement instanceof FlatData) {
          if (droppedPackagableElement.recordTypes.length === 0) {
            applicationStore.notifyWarning(
              `Source flat-data store '${droppedPackagableElement.path}' must have at least one action`,
            );
            return;
          }
          if (droppedPackagableElement.recordTypes.length === 1) {
            flowResult(
              mappingEditorState.changeClassMappingSourceDriver(
                setImplementation,
                droppedPackagableElement.recordTypes[0],
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
          } else {
            setSourceElementForSourceSelectorModal(
              droppedPackagableElement.recordTypes[0],
            );
          }
        } else if (droppedPackagableElement instanceof Database) {
          const relations = droppedPackagableElement.schemas.flatMap((schema) =>
            (schema.tables as (Table | View)[]).concat(schema.views),
          );
          if (relations.length === 0) {
            applicationStore.notifyWarning(
              `Source database '${droppedPackagableElement.path}' must have at least one table or view`,
            );
            return;
          }
          if (relations.length === 1) {
            flowResult(
              mappingEditorState.changeClassMappingSourceDriver(
                setImplementation,
                relations[0],
              ),
            ).catch(applicationStore.alertIllegalUnhandledError);
          } else {
            setSourceElementForSourceSelectorModal(relations[0]);
          }
        }
      },
      [applicationStore, mappingEditorState, setImplementation],
    );
    const handleDrop = useCallback(
      (item: MappingElementSourceDropTarget): void => {
        if (!setImplementation.isEmbedded && !isReadOnly) {
          const embeddedSetImpls =
            setImplementation.getEmbeddedSetImplmentations();
          const droppedPackagableElement = item.data.packageableElement;
          if (!embeddedSetImpls.length) {
            changeClassMappingSourceDriver(droppedPackagableElement);
          } else {
            editorStore.setActionAltertInfo({
              message: CHANGING_SOURCE_ON_EMBEDDED,
              onEnter: (): void => editorStore.setBlockGlobalHotkeys(true),
              onClose: (): void => editorStore.setBlockGlobalHotkeys(false),
              actions: [
                {
                  label: 'Continue',
                  handler: (): void =>
                    changeClassMappingSourceDriver(droppedPackagableElement),
                  type: ActionAlertActionType.PROCEED,
                },
                {
                  label: 'Cancel',
                },
              ],
            });
          }
        }
      },
      [
        changeClassMappingSourceDriver,
        editorStore,
        isReadOnly,
        setImplementation,
      ],
    );
    const [{ isDragOver, canDrop }, dropRef] = useDrop(
      () => ({
        accept: dndType,
        drop: (item: ElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean; canDrop: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
          canDrop: monitor.canDrop(),
        }),
      }),
      [handleDrop],
    );
    const isUnsupported =
      instanceSetImplementationState instanceof
      UnsupportedInstanceSetImplementationState;
    if (
      !(
        instanceSetImplementationState instanceof InstanceSetImplementationState
      )
    ) {
      return null;
    }
    return (
      <div
        data-testid={STUDIO_TEST_ID.SOURCE_PANEL}
        className={clsx('panel source-panel', {
          /* @MARKER: NEW CLASS MAPPING TYPE SUPPORT --- consider adding class mapping type handler here whenever support for a new one is added to the app */
          backdrop__element:
            (instanceSetImplementationState instanceof
            PureInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false) ||
            (instanceSetImplementationState instanceof
            FlatDataInstanceSetImplementationState
              ? instanceSetImplementationState.hasParserError
              : false),
        })}
      >
        <div className="panel__header">
          <div className="panel__header__title source-panel__header__title">
            <div className="panel__header__title__label">source</div>
            <div className="panel__header__title__content">{sourceLabel}</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={showSourceSelectorModal}
              disabled={
                isReadOnly || setImplementation.isEmbedded || isUnsupported
              }
              tabIndex={-1}
              title="Select Source..."
            >
              <FaEdit />
            </button>
          </div>
        </div>
        <div ref={dropRef} className="panel__content dnd__dropzone">
          {srcElement && isDragOver && !isReadOnly && (
            <div className="dnd__overlay"></div>
          )}
          {srcElement && (
            <div className="source-panel__explorer">
              {srcElement instanceof Type && (
                <TypeTree
                  type={srcElement}
                  selectedType={instanceSetImplementationState.selectedType}
                />
              )}
              {srcElement instanceof RootFlatDataRecordType && (
                <FlatDataRecordTypeTree
                  recordType={srcElement}
                  selectedType={instanceSetImplementationState.selectedType}
                />
              )}
              {(srcElement instanceof Table || srcElement instanceof View) && (
                <TableOrViewSourceTree
                  relation={srcElement}
                  selectedType={instanceSetImplementationState.selectedType}
                />
              )}
            </div>
          )}
          {!srcElement && (
            <BlankPanelPlaceholder
              placeholderText="Choose a source"
              onClick={showSourceSelectorModal}
              clickActionType="add"
              tooltipText="Drop a class mapping source, or click to choose one"
              dndProps={{
                isDragOver: isDragOver && !isReadOnly,
                canDrop: canDrop && !isReadOnly,
              }}
              readOnlyProps={
                !isReadOnly
                  ? undefined
                  : {
                      placeholderText: 'No source',
                    }
              }
            />
          )}
          {isUnsupported && (
            <UnsupportedEditorPanel
              isReadOnly={isReadOnly}
              text={`Can't display class mapping source in form mode`}
            ></UnsupportedEditorPanel>
          )}
          {sourceElementForSourceSelectorModal !== undefined && (
            <InstanceSetImplementationSourceSelectorModal
              mappingEditorState={mappingEditorState}
              setImplementation={setImplementation}
              sourceElementToSelect={sourceElementForSourceSelectorModal}
              closeModal={hideSourceSelectorModal}
            />
          )}
        </div>
      </div>
    );
  },
);
