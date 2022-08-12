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

import { useState, useCallback, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';
import {
  UMLEditorState,
  UML_EDITOR_TAB,
} from '../../../../stores/editor-state/element-editor-state/UMLEditorState.js';
import { type DropTargetMonitor, useDrag, useDrop } from 'react-dnd';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type UMLEditorElementDropTarget,
} from '../../../../stores/shared/DnDUtil.js';
import { prettyCONSTName } from '@finos/legend-shared';
import {
  BlankPanelContent,
  clsx,
  getControlledResizablePanelProps,
  InputWithInlineValidation,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PlusIcon,
  TimesIcon,
  LongArrowRightIcon,
  LockIcon,
  FireIcon,
  StickArrowCircleRightIcon,
  VerticalDragHandleIcon,
} from '@finos/legend-art';
import { LEGEND_STUDIO_TEST_ID } from '../../../LegendStudioTestID.js';
import { StereotypeSelector } from './StereotypeSelector.js';
import { TaggedValueEditor } from './TaggedValueEditor.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type Enumeration,
  type StereotypeReference,
  type TaggedValue,
  type Enum,
  Profile,
  StereotypeExplicitReference,
  stub_TaggedValue,
  stub_Tag,
  stub_Profile,
  stub_Stereotype,
  stub_Enum,
} from '@finos/legend-graph';
import {
  enum_setName,
  annotatedElement_deleteStereotype,
  annotatedElement_addStereotype,
  annotatedElement_addTaggedValue,
  annotatedElement_deleteTaggedValue,
  enum_deleteValue,
  enum_addValue,
  enum_swapValues,
} from '../../../../stores/graphModifier/DomainGraphModifierHelper.js';
import { useApplicationNavigationContext } from '@finos/legend-application';
import { LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY } from '../../../../stores/LegendStudioApplicationNavigationContext.js';
import { getEmptyImage } from 'react-dnd-html5-backend';

type EnumValueDragSource = {
  _enum: Enum;
};

enum ENUEMRATION_VALUE_DND_TYPE {
  ENUMERATION = 'ENUMERATION',
}

const EnumBasicEditor = observer(
  (props: {
    _parentEnumerations: Enum[];
    _enum: Enum;
    selectValue: () => void;
    deleteValue: () => void;
    isReadOnly: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { _enum, _parentEnumerations, selectValue, deleteValue, isReadOnly } =
      props;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      enum_setName(_enum, event.target.value);
    };
    const isEnumValueDuplicated = (val: Enum): boolean =>
      _enum._OWNER.values.filter((value) => value.name === val.name).length >=
      2;

    // Drag and Drop
    const handleHover = useCallback(
      (item: EnumValueDragSource, monitor: DropTargetMonitor): void => {
        const draggingEnumeration = item._enum;
        const hoveredEnumeration = _enum;
        enum_swapValues(
          _parentEnumerations,
          draggingEnumeration,
          hoveredEnumeration,
        );
      },
      [_parentEnumerations, _enum],
    );

    const [{ isBeingDraggedEnumeration }, dropConnector] = useDrop(
      () => ({
        accept: [ENUEMRATION_VALUE_DND_TYPE.ENUMERATION],
        hover: (item: EnumValueDragSource, monitor: DropTargetMonitor): void =>
          handleHover(item, monitor),
        collect: (
          monitor,
        ): { isBeingDraggedEnumeration: Enum | undefined } => ({
          isBeingDraggedEnumeration:
            monitor.getItem<EnumValueDragSource | null>()?._enum,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = _enum === isBeingDraggedEnumeration;

    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: ENUEMRATION_VALUE_DND_TYPE.ENUMERATION,
        item: (): EnumValueDragSource => ({
          _enum: _enum,
        }),
      }),
      [_enum],
    );
    dragConnector(dropConnector(ref));

    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);

    return (
      <div ref={ref}>
        {isBeingDragged && (
          <div className="uml-element-editor__dnd__container">
            <div className="uml-element-editor__dnd ">
              <div className="uml-element-editor__dnd__name">{_enum.name}</div>
            </div>
          </div>
        )}

        {!isBeingDragged && (
          <div className="enum-basic-editor">
            <div className="uml-element-editor__drag-handler">
              <VerticalDragHandleIcon />
            </div>
            <InputWithInlineValidation
              className="enum-basic-editor__name input-group__input"
              spellCheck={false}
              disabled={isReadOnly}
              value={_enum.name}
              onChange={changeValue}
              placeholder={`Enum name`}
              validationErrorMessage={
                isEnumValueDuplicated(_enum) ? 'Duplicated enum' : undefined
              }
            />
            <button
              className="uml-element-editor__basic__detail-btn"
              onClick={selectValue}
              tabIndex={-1}
              title={'See detail'}
            >
              <LongArrowRightIcon />
            </button>
            {!isReadOnly && (
              <button
                className="uml-element-editor__remove-btn"
                disabled={isReadOnly}
                onClick={deleteValue}
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

const EnumEditor = observer(
  (props: { _enum: Enum; deselectValue: () => void; isReadOnly: boolean }) => {
    const { _enum, deselectValue, isReadOnly } = props;
    // Tab
    const [selectedTab, setSelectedTab] = useState<UML_EDITOR_TAB>(
      UML_EDITOR_TAB.TAGGED_VALUES,
    );
    const tabs = [UML_EDITOR_TAB.TAGGED_VALUES, UML_EDITOR_TAB.STEREOTYPES];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void =>
        setSelectedTab(tab);
    // Tagged value and Stereotype
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const addValue = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            _enum,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            _enum,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
          );
        }
      }
    };
    const _deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(_enum, val);
    const _deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(_enum, val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            _enum,
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [_enum, isReadOnly],
    );
    const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
        drop: (item: ElementDragSource): void => handleDropTaggedValue(item),
        collect: (monitor): { isTaggedValueDragOver: boolean } => ({
          isTaggedValueDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropTaggedValue],
    );
    const handleDropStereotype = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addStereotype(
            _enum,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [_enum, isReadOnly],
    );
    const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
        drop: (item: ElementDragSource): void => handleDropStereotype(item),
        collect: (monitor): { isStereotypeDragOver: boolean } => ({
          isStereotypeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropStereotype],
    );

    return (
      <div className="uml-element-editor enum-editor">
        <div data-testid={LEGEND_STUDIO_TEST_ID.PANEL} className="panel">
          <div className="panel__header">
            <div className="panel__header__title">
              {isReadOnly && (
                <div className="uml-element-editor__header__lock">
                  <LockIcon />
                </div>
              )}
              <div className="panel__header__title__label">enum</div>
              <div className="panel__header__title__content">{_enum.name}</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                onClick={deselectValue}
                tabIndex={-1}
                title={'Close'}
              >
                <TimesIcon />
              </button>
            </div>
          </div>
          <div
            data-testid={LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER}
            className="panel__header uml-element-editor__tabs__header"
          >
            <div className="uml-element-editor__tabs">
              {tabs.map((tab) => (
                <div
                  key={tab}
                  onClick={changeTab(tab)}
                  className={clsx('uml-element-editor__tab', {
                    'uml-element-editor__tab--active': tab === selectedTab,
                  })}
                >
                  {prettyCONSTName(tab)}
                </div>
              ))}
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                disabled={isReadOnly}
                onClick={addValue}
                tabIndex={-1}
                title={addButtonTitle}
              >
                <PlusIcon />
              </button>
            </div>
          </div>
          <div className="panel__content">
            {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
              <div
                ref={dropTaggedValueRef}
                className={clsx('panel__content__lists', {
                  'panel__content__lists--dnd-over':
                    isTaggedValueDragOver && !isReadOnly,
                })}
              >
                {_enum.taggedValues.map((taggedValue) => (
                  <TaggedValueEditor
                    annotatedElement={_enum}
                    key={taggedValue._UUID}
                    taggedValue={taggedValue}
                    deleteValue={_deleteTaggedValue(taggedValue)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
            {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
              <div
                ref={dropStereotypeRef}
                className={clsx('panel__content__lists', {
                  'panel__content__lists--dnd-over':
                    isStereotypeDragOver && !isReadOnly,
                })}
              >
                {_enum.stereotypes.map((stereotype) => (
                  <StereotypeSelector
                    key={stereotype.value._UUID}
                    annotatedElement={_enum}
                    stereotype={stereotype}
                    deleteStereotype={_deleteStereotype(stereotype)}
                    isReadOnly={isReadOnly}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  },
);

export const EnumerationEditor = observer(
  (props: { enumeration: Enumeration }) => {
    const { enumeration } = props;
    const editorStore = useEditorStore();
    const editorState = editorStore.getCurrentEditorState(UMLEditorState);
    const isReadOnly = editorState.isReadOnly;
    // Selected enum value
    const [selectedEnum, setSelectedEnum] = useState<Enum | undefined>();
    const deselectValue = (): void => setSelectedEnum(undefined);
    const selectValue =
      (val: Enum): (() => void) =>
      (): void =>
        setSelectedEnum(val);
    // Tab
    const selectedTab = editorState.selectedTab;
    const tabs = [
      UML_EDITOR_TAB.ENUM_VALUES,
      UML_EDITOR_TAB.TAGGED_VALUES,
      UML_EDITOR_TAB.STEREOTYPES,
    ];
    const changeTab =
      (tab: UML_EDITOR_TAB): (() => void) =>
      (): void => {
        editorState.setSelectedTab(tab);
        setSelectedEnum(undefined);
      };
    // Tagged value and Stereotype
    let addButtonTitle = '';
    switch (selectedTab) {
      case UML_EDITOR_TAB.ENUM_VALUES:
        addButtonTitle = 'Add enum value';
        break;
      case UML_EDITOR_TAB.TAGGED_VALUES:
        addButtonTitle = 'Add tagged value';
        break;
      case UML_EDITOR_TAB.STEREOTYPES:
        addButtonTitle = 'Add stereotype';
        break;
      default:
        break;
    }
    const add = (): void => {
      if (!isReadOnly) {
        if (selectedTab === UML_EDITOR_TAB.ENUM_VALUES) {
          enum_addValue(enumeration, stub_Enum(enumeration));
        } else if (selectedTab === UML_EDITOR_TAB.TAGGED_VALUES) {
          annotatedElement_addTaggedValue(
            enumeration,
            stub_TaggedValue(stub_Tag(stub_Profile())),
          );
        } else if (selectedTab === UML_EDITOR_TAB.STEREOTYPES) {
          annotatedElement_addStereotype(
            enumeration,
            StereotypeExplicitReference.create(stub_Stereotype(stub_Profile())),
          );
        }
      }
    };
    const deleteValue =
      (val: Enum): (() => void) =>
      (): void => {
        enum_deleteValue(enumeration, val);
        if (val === selectedEnum) {
          setSelectedEnum(undefined);
        }
      };
    const _deleteStereotype =
      (val: StereotypeReference): (() => void) =>
      (): void =>
        annotatedElement_deleteStereotype(enumeration, val);
    const _deleteTaggedValue =
      (val: TaggedValue): (() => void) =>
      (): void =>
        annotatedElement_deleteTaggedValue(enumeration, val);
    // Drag and Drop
    const handleDropTaggedValue = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addTaggedValue(
            enumeration,
            stub_TaggedValue(stub_Tag(item.data.packageableElement)),
          );
        }
      },
      [enumeration, isReadOnly],
    );
    const [{ isTaggedValueDragOver }, dropTaggedValueRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
        drop: (item: ElementDragSource): void => handleDropTaggedValue(item),
        collect: (monitor): { isTaggedValueDragOver: boolean } => ({
          isTaggedValueDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropTaggedValue],
    );
    const handleDropStereotype = useCallback(
      (item: UMLEditorElementDropTarget): void => {
        if (!isReadOnly && item.data.packageableElement instanceof Profile) {
          annotatedElement_addStereotype(
            enumeration,
            StereotypeExplicitReference.create(
              stub_Stereotype(item.data.packageableElement),
            ),
          );
        }
      },
      [enumeration, isReadOnly],
    );
    const [{ isStereotypeDragOver }, dropStereotypeRef] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_PROFILE],
        drop: (item: ElementDragSource): void => handleDropStereotype(item),
        collect: (monitor): { isStereotypeDragOver: boolean } => ({
          isStereotypeDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDropStereotype],
    );

    // Generation
    const generationParentElementPath =
      editorStore.graphState.graphGenerationState.findGenerationParentPath(
        enumeration.path,
      );
    const generationParentElement = generationParentElementPath
      ? editorStore.graphManagerState.graph.getNullableElement(
          generationParentElementPath,
        )
      : undefined;
    const visitGenerationParentElement = (): void => {
      if (generationParentElement) {
        editorStore.openElement(generationParentElement);
      }
    };

    useApplicationNavigationContext(
      LEGEND_STUDIO_APPLICATION_NAVIGATION_CONTEXT_KEY.ENUMERATION_EDITOR,
    );

    return (
      <div
        data-testid={LEGEND_STUDIO_TEST_ID.ENUMERATION_EDITOR}
        className="uml-element-editor enumeration-editor"
      >
        <ResizablePanelGroup orientation="horizontal">
          <ResizablePanel minSize={56}>
            <div className="panel">
              <div className="panel__header">
                <div className="panel__header__title">
                  <div className="panel__header__title__label">enumeration</div>
                  <div className="panel__header__title__content">
                    {enumeration.name}
                  </div>
                </div>
                <div className="panel__header__actions">
                  {generationParentElement && (
                    <button
                      className="uml-element-editor__header__generation-origin"
                      onClick={visitGenerationParentElement}
                      tabIndex={-1}
                      title={`Visit generation parent '${generationParentElement.path}'`}
                    >
                      <div className="uml-element-editor__header__generation-origin__label">
                        <FireIcon />
                      </div>
                      <div className="uml-element-editor__header__generation-origin__parent-name">
                        {generationParentElement.name}
                      </div>
                      <div className="uml-element-editor__header__generation-origin__visit-btn">
                        <StickArrowCircleRightIcon />
                      </div>
                    </button>
                  )}
                </div>
              </div>
              <div
                data-testid={
                  LEGEND_STUDIO_TEST_ID.UML_ELEMENT_EDITOR__TABS_HEADER
                }
                className="panel__header uml-element-editor__tabs__header"
              >
                <div className="uml-element-editor__tabs">
                  {tabs.map((tab) => (
                    <div
                      key={tab}
                      onClick={changeTab(tab)}
                      className={clsx('uml-element-editor__tab', {
                        'uml-element-editor__tab--active': tab === selectedTab,
                      })}
                    >
                      {prettyCONSTName(tab)}
                    </div>
                  ))}
                </div>
                <div className="panel__header__actions">
                  <button
                    className="panel__header__action"
                    onClick={add}
                    tabIndex={-1}
                    title={addButtonTitle}
                  >
                    <PlusIcon />
                  </button>
                </div>
              </div>
              <div className="panel__content">
                {selectedTab === UML_EDITOR_TAB.ENUM_VALUES && (
                  <div className="panel__content__lists">
                    {enumeration.values.map((enumValue) => (
                      <EnumBasicEditor
                        key={enumValue._UUID}
                        _enum={enumValue}
                        _parentEnumerations={enumeration.values}
                        deleteValue={deleteValue(enumValue)}
                        selectValue={selectValue(enumValue)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                  </div>
                )}
                {selectedTab === UML_EDITOR_TAB.TAGGED_VALUES && (
                  <div
                    ref={dropTaggedValueRef}
                    className={clsx('panel__content__lists', {
                      'panel__content__lists--dnd-over':
                        isTaggedValueDragOver && !isReadOnly,
                    })}
                  >
                    {enumeration.taggedValues.map((taggedValue) => (
                      <TaggedValueEditor
                        annotatedElement={enumeration}
                        key={taggedValue._UUID}
                        taggedValue={taggedValue}
                        deleteValue={_deleteTaggedValue(taggedValue)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                  </div>
                )}
                {selectedTab === UML_EDITOR_TAB.STEREOTYPES && (
                  <div
                    ref={dropStereotypeRef}
                    className={clsx('panel__content__lists', {
                      'panel__content__lists--dnd-over':
                        isStereotypeDragOver && !isReadOnly,
                    })}
                  >
                    {enumeration.stereotypes.map((stereotype) => (
                      <StereotypeSelector
                        key={stereotype.value._UUID}
                        annotatedElement={enumeration}
                        stereotype={stereotype}
                        deleteStereotype={_deleteStereotype(stereotype)}
                        isReadOnly={isReadOnly}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ResizablePanel>
          <ResizablePanelSplitter>
            <ResizablePanelSplitterLine color="var(--color-light-grey-200)" />
          </ResizablePanelSplitter>
          <ResizablePanel
            {...getControlledResizablePanelProps(!selectedEnum, {
              size: 250,
            })}
            direction={-1}
          >
            {selectedEnum ? (
              <EnumEditor
                _enum={selectedEnum}
                deselectValue={deselectValue}
                isReadOnly={isReadOnly}
              />
            ) : (
              <div className="uml-element-editor__sub-editor">
                <BlankPanelContent>No enum selected</BlankPanelContent>
              </div>
            )}
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    );
  },
);
