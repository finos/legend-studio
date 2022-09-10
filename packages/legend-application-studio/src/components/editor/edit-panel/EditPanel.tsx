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
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type WheelEvent,
} from 'react';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  DropdownMenu,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  TimesIcon,
  PlusIcon,
  ArrowsAltHIcon,
  useResizeDetector,
  useDragPreviewLayer,
  PanelEntryDropZonePlaceholderWithoutBorder,
} from '@finos/legend-art';
import { MappingEditor } from './mapping-editor/MappingEditor.js';
import { UMLEditor } from './uml-editor/UMLEditor.js';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { UMLEditorState } from '../../../stores/editor-state/element-editor-state/UMLEditorState.js';
import { ElementEditorState } from '../../../stores/editor-state/element-editor-state/ElementEditorState.js';
import { LEGEND_STUDIO_TEST_ID } from '../../LegendStudioTestID.js';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../stores/EditorConfig.js';
import type { EditorState } from '../../../stores/editor-state/EditorState.js';
import {
  DIFF_VIEW_MODE,
  EntityDiffViewState,
} from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState.js';
import { EntityDiffView } from '../../editor/edit-panel/diff-editor/EntityDiffView.js';
import { ModelImporter } from './ModelImporter.js';
import { ModelImporterState } from '../../../stores/editor-state/ModelImporterState.js';
import { FunctionEditorState } from '../../../stores/editor-state/element-editor-state/FunctionEditorState.js';
import { ServiceEditorState } from '../../../stores/editor-state/element-editor-state/service/ServiceEditorState.js';
import { ProjectConfigurationEditorState } from '../../../stores/editor-state/ProjectConfigurationEditorState.js';
import { ProjectConfigurationEditor } from '../../editor/edit-panel/project-configuration-editor/ProjectConfigurationEditor.js';
import { ElementGenerationEditor } from './element-generation-editor/ElementGenerationEditor.js';
import { FunctionEditor } from './FunctionEditor.js';
import { ElementNativeView } from './element-generation-editor/ElementNativeView.js';
import { ServiceEditor } from './service-editor/ServiceEditor.js';
import { PackageableRuntimeEditor } from './RuntimeEditor.js';
import { PackageableRuntimeEditorState } from '../../../stores/editor-state/element-editor-state/RuntimeEditorState.js';
import { PackageableConnectionEditorState } from '../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import { PackageableConnectionEditor } from './connection-editor/ConnectionEditor.js';
import { FileGenerationEditorState } from '../../../stores/editor-state/element-editor-state/FileGenerationEditorState.js';
import { FileGenerationEditor } from './element-generation-editor/FileGenerationEditor.js';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState.js';
import { EntityChangeConflictEditor } from './diff-editor/EntityChangeConflictEditor.js';
import { UnsupportedElementEditorState } from '../../../stores/editor-state/UnsupportedElementEditorState.js';
import { UnsupportedElementEditor } from './UnsupportedElementEditor.js';
import { getPrettyLabelForRevision } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState.js';
import { GenerationSpecificationEditorState } from '../../../stores/editor-state/GenerationSpecificationEditorState.js';
import { GenerationSpecificationEditor } from './GenerationSpecificationEditor.js';
import { FileGenerationViewerState } from '../../../stores/editor-state/FileGenerationViewerState.js';
import { FileGenerationViewer } from '../../editor/edit-panel/FileGenerationViewer.js';
import type { DSL_LegendStudioApplicationPlugin_Extension } from '../../../stores/LegendStudioApplicationPlugin.js';
import { useEditorStore } from '../EditorStoreProvider.js';
import { PackageableDataEditorState } from '../../../stores/editor-state/element-editor-state/data/DataEditorState.js';
import { DataElementEditor } from './data-editor/DataElementEditor.js';
import { useDrag, useDrop } from 'react-dnd';

export const ViewerEditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 50;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const EditPanelSplashScreen: React.FC = () => {
  const commandListWidth = 300;
  const commandListHeight = 180;
  const [showCommandList, setShowCommandList] = useState(false);
  const { ref, width, height } = useResizeDetector<HTMLDivElement>();

  useEffect(() => {
    setShowCommandList(
      (width ?? 0) > commandListWidth && (height ?? 0) > commandListHeight,
    );
  }, [width, height]);

  return (
    <div ref={ref} className="edit-panel__splash-screen">
      <div
        className={clsx('edit-panel__splash-screen__content', {
          'edit-panel__splash-screen__content--hidden': !showCommandList,
        })}
      >
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Open or Search for an Element
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Push Local Changes
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <PlusIcon />
            </div>
            <div className="hotkey__key">S</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Toggle Hackermode
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F8</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Compile
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">F9</div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EditPanelHeaderTabContextMenu = observer(
  forwardRef<
    HTMLDivElement,
    {
      editorState: EditorState;
    }
  >(function EditPanelHeaderTabContextMenu(props, ref) {
    const { editorState } = props;
    const editorStore = useEditorStore();
    const close = (): void => editorStore.closeState(editorState);
    const closeOthers = (): void =>
      editorStore.closeAllOtherStates(editorState);
    const closeAll = (): void => editorStore.closeAllStates();
    const openLastClosedTab = (): void => editorStore.openLastClosedTab();

    return (
      <div ref={ref} className="edit-panel__header__tab__context-menu">
        <button
          className="edit-panel__header__tab__context-menu__item"
          onClick={close}
        >
          Close
        </button>
        <button
          className="edit-panel__header__tab__context-menu__item"
          disabled={editorStore.openedEditorStates.length < 2}
          onClick={closeOthers}
        >
          Close Others
        </button>
        <button
          className="edit-panel__header__tab__context-menu__item"
          onClick={closeAll}
        >
          Close All
        </button>
        <button
          className="edit-panel__header__tab__context-menu__item"
          disabled={editorStore.tabHistory.size() < 1}
          onClick={openLastClosedTab}
        >
          Open Last Closed Tab
        </button>
      </div>
    );
  }),
);

const EDITOR_DND_TYPE = 'EDITOR_STATE';

export const EditorMainTabEditor = observer(
  (props: {
    editorState: EditorState;
    currentEditorState: EditorState;
    renderHeaderLabel: (editorState: EditorState) => React.ReactNode;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { editorState, currentEditorState, renderHeaderLabel } = props;

    const editorStore = useEditorStore();

    // actions
    const closeTab =
      (newEditorState: EditorState): React.MouseEventHandler =>
      (event): void => {
        editorStore.closeState(newEditorState);
      };

    const closeTabOnMiddleClick =
      (newEditorState: EditorState): React.MouseEventHandler =>
      (event): void => {
        if (event.nativeEvent.button === 1) {
          editorStore.closeState(newEditorState);
        }
      };
    const openTab =
      (newEditorState: EditorState): (() => void) =>
      (): void => {
        editorStore.openState(newEditorState);
      };

    // Drag and Drop
    const handleHover = useCallback(
      (item: EditorPanelDragSource): void => {
        const draggingProperty = item.panel;
        const hoveredProperty = editorState;

        editorStore.swapTabs(draggingProperty, hoveredProperty);
      },
      [editorStore, editorState],
    );

    const [{ isBeingDraggedProperty }, dropConnector] = useDrop<
      EditorPanelDragSource,
      void,
      { isBeingDraggedProperty: EditorState | undefined }
    >(
      () => ({
        accept: [EDITOR_DND_TYPE],
        hover: (item) => handleHover(item),
        collect: (
          monitor,
        ): {
          isBeingDraggedProperty: EditorState | undefined;
        } => ({
          isBeingDraggedProperty:
            monitor.getItem<EditorPanelDragSource | null>()?.panel,
        }),
      }),
      [handleHover],
    );
    const isBeingDragged = editorState === isBeingDraggedProperty;

    const [, dragConnector, dragPreviewConnector] =
      useDrag<EditorPanelDragSource>(
        () => ({
          type: EDITOR_DND_TYPE,
          item: () => ({
            panel: editorState,
          }),
        }),
        [editorState],
      );
    dragConnector(dropConnector(ref));
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        ref={ref}
        key={editorState.uuid}
        className={clsx('edit-panel__header__tab', {
          'edit-panel__header__tab--active': editorState === currentEditorState,
        })}
        onMouseUp={closeTabOnMiddleClick(editorState)}
      >
        <PanelEntryDropZonePlaceholderWithoutBorder
          showPlaceholder={isBeingDragged}
          label={editorState.headerName}
          className="edit-panel__header__dnd__placeholder"
        >
          <ContextMenu
            content={
              <EditPanelHeaderTabContextMenu editorState={editorState} />
            }
            className="edit-panel__header__tab__content"
          >
            <button
              className="edit-panel__header__tab__label"
              tabIndex={-1}
              onClick={openTab(editorState)}
              title={
                editorState instanceof ElementEditorState
                  ? editorState.element.path
                  : editorState instanceof EntityDiffViewState
                  ? editorState.headerTooltip
                  : editorState.headerName
              }
            >
              {renderHeaderLabel(editorState)}
            </button>
            <button
              className="edit-panel__header__tab__close-btn"
              onClick={closeTab(editorState)}
              tabIndex={-1}
              title={'Close'}
            >
              <TimesIcon />
            </button>
          </ContextMenu>
        </PanelEntryDropZonePlaceholderWithoutBorder>
      </div>
    );
  },
);

type EditorPanelDragSource = {
  panel: EditorState;
};

export const EditPanel = observer(() => {
  const editorStore = useEditorStore();
  const currentEditorState = editorStore.currentEditorState;
  const openedEditorStates = editorStore.openedEditorStates;
  const nativeViewModes =
    currentEditorState instanceof ElementEditorState
      ? Object.values(ELEMENT_NATIVE_VIEW_MODE)
      : [];
  const generationViewModes =
    currentEditorState instanceof ElementEditorState
      ? editorStore.graphState.graphGenerationState.fileGenerationConfigurations
          .slice()
          .sort((a, b): number => a.label.localeCompare(b.label))
      : [];

  const renderActiveElementTab = (): React.ReactNode => {
    if (currentEditorState instanceof ElementEditorState) {
      if (currentEditorState.generationViewMode) {
        const elementGenerationState = editorStore.elementGenerationStates.find(
          (state) =>
            state.fileGenerationType === currentEditorState.generationViewMode,
        );
        return (
          <ElementGenerationEditor
            key={elementGenerationState?.uuid}
            elementGenerationState={guaranteeNonNullable(
              elementGenerationState,
            )}
            currentElementState={currentEditorState}
          />
        );
      }
      switch (currentEditorState.editMode) {
        case ELEMENT_NATIVE_VIEW_MODE.FORM: {
          if (currentEditorState instanceof UMLEditorState) {
            return <UMLEditor key={currentEditorState.uuid} />;
          } else if (currentEditorState instanceof FunctionEditorState) {
            return <FunctionEditor key={currentEditorState.uuid} />;
          } else if (currentEditorState instanceof MappingEditorState) {
            return <MappingEditor key={currentEditorState.uuid} />;
          } else if (currentEditorState instanceof ServiceEditorState) {
            return <ServiceEditor key={currentEditorState.uuid} />;
          } else if (
            currentEditorState instanceof PackageableRuntimeEditorState
          ) {
            return <PackageableRuntimeEditor key={currentEditorState.uuid} />;
          } else if (
            currentEditorState instanceof PackageableConnectionEditorState
          ) {
            return (
              <PackageableConnectionEditor key={currentEditorState.uuid} />
            );
          } else if (currentEditorState instanceof FileGenerationEditorState) {
            return <FileGenerationEditor key={currentEditorState.uuid} />;
          } else if (currentEditorState instanceof PackageableDataEditorState) {
            return <DataElementEditor key={currentEditorState.uuid} />;
          } else if (
            currentEditorState instanceof GenerationSpecificationEditorState
          ) {
            return (
              <GenerationSpecificationEditor key={currentEditorState.uuid} />
            );
          } else if (
            currentEditorState instanceof UnsupportedElementEditorState
          ) {
            return <UnsupportedElementEditor key={currentEditorState.uuid} />;
          }
          const extraElementEditorCreators = editorStore.pluginManager
            .getApplicationPlugins()
            .flatMap(
              (plugin) =>
                (
                  plugin as DSL_LegendStudioApplicationPlugin_Extension
                ).getExtraElementEditorRenderers?.() ?? [],
            );
          for (const elementEditorCreators of extraElementEditorCreators) {
            const elementEditor = elementEditorCreators(currentEditorState);
            if (elementEditor) {
              return elementEditor;
            }
          }
          break;
        }
        case ELEMENT_NATIVE_VIEW_MODE.JSON:
        case ELEMENT_NATIVE_VIEW_MODE.GRAMMAR:
          return (
            <ElementNativeView
              key={currentEditorState.uuid}
              currentElementState={currentEditorState}
            />
          );
        default:
          return null;
      }
    } else if (currentEditorState instanceof EntityDiffViewState) {
      return (
        <EntityDiffView
          key={currentEditorState.uuid}
          entityDiffViewState={currentEditorState}
        />
      );
    } else if (currentEditorState instanceof EntityChangeConflictEditorState) {
      return (
        <EntityChangeConflictEditor
          key={currentEditorState.uuid}
          conflictEditorState={currentEditorState}
        />
      );
    } else if (currentEditorState instanceof FileGenerationViewerState) {
      return <FileGenerationViewer key={currentEditorState.uuid} />;
    } else if (currentEditorState instanceof ModelImporterState) {
      return <ModelImporter />;
    } else if (currentEditorState instanceof ProjectConfigurationEditorState) {
      return <ProjectConfigurationEditor />;
    }
    return null;
  };

  const renderHeaderLabel = (editorState: EditorState): React.ReactNode => {
    if (editorState instanceof EntityDiffViewState) {
      return (
        <div className="edit-panel__header__tab__label__diff">
          <div className="edit-panel__header__tab__label__diff__element-name">
            {editorState.headerName}
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            ({getPrettyLabelForRevision(editorState.fromRevision)}
          </div>
          <div className="edit-panel__header__tab__label__diff__icon">
            <ArrowsAltHIcon />
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            {getPrettyLabelForRevision(editorState.toRevision)})
          </div>
        </div>
      );
    } else if (editorState instanceof EntityChangeConflictEditorState) {
      return (
        <div className="edit-panel__header__tab__label__diff">
          <div className="edit-panel__header__tab__label__diff__element-name">
            {editorState.headerName}
          </div>
          <div className="edit-panel__header__tab__label__diff__text">
            {editorState.isReadOnly ? '(Merge Preview)' : '(Merged)'}
          </div>
        </div>
      );
    }
    return editorState.headerName;
  };

  function horizontalScroll(event: WheelEvent): void {
    if (event.deltaY === 0) {
      return;
    }
    event.currentTarget.scrollBy(event.deltaY, 0);
  }

  if (!currentEditorState) {
    return editorStore.isInViewerMode ? (
      <ViewerEditPanelSplashScreen />
    ) : (
      <EditPanelSplashScreen />
    );
  }
  return (
    <div
      data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL}
      className="panel edit-panel"
    >
      <ContextMenu disabled={true} className="panel__header edit-panel__header">
        <div
          data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL__HEADER_TABS}
          className="edit-panel__header__tabs"
          onWheel={horizontalScroll}
        >
          {openedEditorStates.map((editorState) => (
            <EditorMainTabEditor
              key={editorState.uuid}
              editorState={editorState}
              renderHeaderLabel={renderHeaderLabel}
              currentEditorState={currentEditorState}
            />
          ))}
        </div>

        <div className="edit-panel__header__actions">
          {currentEditorState instanceof ElementEditorState && (
            <DropdownMenu
              className="edit-panel__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS
                  }
                  className="edit-panel__view-mode__options edit-panel__view-mode__options--with-group"
                >
                  <div className="edit-panel__view-mode__option__group edit-panel__view-mode__option__group--native">
                    <div className="edit-panel__view-mode__option__group__name">
                      native
                    </div>
                    <div className="edit-panel__view-mode__option__group__options">
                      {nativeViewModes.map((mode) => (
                        <MenuContentItem
                          key={mode}
                          className="edit-panel__view-mode__option"
                          onClick={(): void =>
                            currentEditorState.setEditMode(mode)
                          }
                        >
                          {mode}
                        </MenuContentItem>
                      ))}
                    </div>
                  </div>
                  {Boolean(generationViewModes.length) && (
                    <>
                      <div className="edit-panel__view-mode__option__group__separator" />
                      <div className="edit-panel__view-mode__option__group edit-panel__view-mode__option__group--generation">
                        <div className="edit-panel__view-mode__option__group__name">
                          generation
                        </div>
                        <div className="edit-panel__view-mode__option__group__options">
                          {generationViewModes.map((mode) => (
                            <MenuContentItem
                              key={mode.key}
                              className="edit-panel__view-mode__option"
                              disabled={
                                !editorStore.graphState.graphGenerationState.supportedFileGenerationConfigurationsForCurrentElement.includes(
                                  mode,
                                )
                              }
                              onClick={(): void =>
                                currentEditorState.setGenerationViewMode(
                                  mode.key,
                                )
                              }
                            >
                              {mode.label}
                            </MenuContentItem>
                          ))}
                        </div>
                      </div>
                    </>
                  )}
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="edit-panel__view-mode__type__label">
                {currentEditorState.generationViewMode
                  ? editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
                      currentEditorState.generationViewMode,
                    ).label
                  : currentEditorState.editMode}
              </div>
            </DropdownMenu>
          )}
          {currentEditorState instanceof EntityDiffViewState && (
            <DropdownMenu
              className="edit-panel__view-mode__type"
              title="View as..."
              content={
                <MenuContent
                  data-testid={
                    LEGEND_STUDIO_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS
                  }
                  className="edit-panel__view-mode__options"
                >
                  <MenuContentItem
                    className="edit-panel__view-mode__option"
                    onClick={(): void =>
                      currentEditorState.setDiffMode(DIFF_VIEW_MODE.GRAMMAR)
                    }
                  >
                    {DIFF_VIEW_MODE.GRAMMAR}
                  </MenuContentItem>
                  <MenuContentItem
                    className="edit-panel__view-mode__option"
                    onClick={(): void =>
                      currentEditorState.setDiffMode(DIFF_VIEW_MODE.JSON)
                    }
                  >
                    {DIFF_VIEW_MODE.JSON}
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
              }}
            >
              <div className="edit-panel__view-mode__type__label">
                {currentEditorState.diffMode}
              </div>
            </DropdownMenu>
          )}
        </div>
      </ContextMenu>
      <div
        // NOTE: This is one small but extremely important line. Using `key` we effectivly force-remounting the element editor
        // component every time current element editor state is changed. This is great to control errors that has to do with stale states
        // when we `reprocess` world or when we switch tabs between 2 elements of the same type (i.e. 2 classes, 2 mappings, etc.)
        // See https://github.com/bvaughn/react-error-boundary/issues/23#issuecomment-425470511
        key={currentEditorState.uuid}
        className="panel__content edit-panel__content"
        data-testid={LEGEND_STUDIO_TEST_ID.EDIT_PANEL_CONTENT}
      >
        {renderActiveElementTab()}
      </div>
    </div>
  );
});
