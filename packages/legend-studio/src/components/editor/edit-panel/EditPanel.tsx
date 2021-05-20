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

import { useEffect, useState } from 'react';
import { FaTimes, FaPlus, FaArrowsAltH } from 'react-icons/fa';
import { observer } from 'mobx-react-lite';
import {
  clsx,
  DropdownMenu,
  ContextMenu,
  MenuContent,
  MenuContentItem,
} from '@finos/legend-studio-components';
import { MappingEditor } from './mapping-editor/MappingEditor';
import { UMLEditor } from './uml-editor/UMLEditor';
import { MappingEditorState } from '../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { UMLEditorState } from '../../../stores/editor-state/element-editor-state/UMLEditorState';
import { ElementEditorState } from '../../../stores/editor-state/element-editor-state/ElementEditorState';
import { useEditorStore } from '../../../stores/EditorStore';
import { CORE_TEST_ID } from '../../../const';
import { ELEMENT_NATIVE_VIEW_MODE } from '../../../stores/EditorConfig';
import { useResizeDetector } from 'react-resize-detector';
import type { EditorState } from '../../../stores/editor-state/EditorState';
import {
  DIFF_VIEW_MODE,
  EntityDiffViewState,
} from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffViewState';
import { EntityDiffView } from '../../editor/edit-panel/diff-editor/EntityDiffView';
import { DiagramEditorState } from '../../../stores/editor-state/element-editor-state/DiagramEditorState';
import { DiagramEditor } from './DiagramEditor';
import { ModelLoader } from '../../editor/edit-panel/ModelLoader';
import { ModelLoaderState } from '../../../stores/editor-state/ModelLoaderState';
import { FunctionEditorState } from '../../../stores/editor-state/element-editor-state/FunctionEditorState';
import { ServiceEditorState } from '../../../stores/editor-state/element-editor-state/service/ServiceEditorState';
import { ProjectConfigurationEditorState } from '../../../stores/editor-state/ProjectConfigurationEditorState';
import { ProjectConfigurationEditor } from '../../editor/edit-panel/project-configuration-editor/ProjectConfigurationEditor';
import { ElementGenerationEditor } from './element-generation-editor/ElementGenerationEditor';
import { FunctionEditor } from './FunctionEditor';
import { ElementNativeView } from './element-generation-editor/ElementNativeView';
import { ServiceEditor } from './service-editor/ServiceEditor';
import { PackageableRuntimeEditor } from './RuntimeEditor';
import { PackageableRuntimeEditorState } from '../../../stores/editor-state/element-editor-state/RuntimeEditorState';
import { PackageableConnectionEditorState } from '../../../stores/editor-state/element-editor-state/ConnectionEditorState';
import { PackageableConnectionEditor } from './connection-editor/ConnectionEditor';
import { FileGenerationEditorState } from '../../../stores/editor-state/element-editor-state/FileGenerationEditorState';
import { FileGenerationEditor } from './element-generation-editor/FileGenerationEditor';
import { guaranteeNonNullable } from '@finos/legend-studio-shared';
import { EntityChangeConflictEditorState } from '../../../stores/editor-state/entity-diff-editor-state/EntityChangeConflictEditorState';
import { EntityChangeConflictEditor } from './diff-editor/EntityChangeConflictEditor';
import { UnsupportedElementEditorState } from '../../../stores/editor-state/UnsupportedElementEditorState';
import { UnsupportedElementEditor } from './UnsupportedElementEditor';
import { getPrettyLabelForRevision } from '../../../stores/editor-state/entity-diff-editor-state/EntityDiffEditorState';
import { GenerationSpecificationEditorState } from '../../../stores/editor-state/GenerationSpecificationEditorState';
import { GenerationSpecificationEditor } from './GenerationSpecificationEditor';
import { FileGenerationViewerState } from '../../../stores/editor-state/FileGenerationViewerState';
import { FileGenerationViewer } from '../../editor/edit-panel/FileGenerationViewer';
import type { DSL_EditorPlugin_Extension } from '../../../stores/EditorPlugin';

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
              <FaPlus />
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
              <FaPlus />
            </div>
            <div className="hotkey__key">P</div>
          </div>
        </div>
        <div className="edit-panel__splash-screen__content__item">
          <div className="edit-panel__splash-screen__content__item__label">
            Sync with Workspace
          </div>
          <div className="edit-panel__splash-screen__content__item__hot-keys">
            <div className="hotkey__key">Ctrl</div>
            <div className="hotkey__plus">
              <FaPlus />
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
  (
    props: {
      editorState: EditorState;
    },
    ref: React.Ref<HTMLDivElement>,
  ) => {
    const { editorState } = props;
    const editorStore = useEditorStore();
    const close = (): void => editorStore.closeState(editorState);
    const closeOthers = (): void =>
      editorStore.closeAllOtherStates(editorState);
    const closeAll = (): void => editorStore.closeAllStates();

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
      </div>
    );
  },
  { forwardRef: true },
);

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
      ? editorStore.graphState.graphGenerationState.supportedFileGenerationConfigurationsForCurrentElement.map(
          (config) => ({ type: config.key, label: config.label }),
        )
      : [];

  /* @MARKER: NEW ELEMENT TYPE SUPPORT --- consider adding new element type handler here whenever support for a new element type is added to the app */
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
          } else if (currentEditorState instanceof DiagramEditorState) {
            return <DiagramEditor key={currentEditorState.uuid} />;
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
          const extraElementEditorCreators =
            editorStore.applicationStore.pluginManager
              .getEditorPlugins()
              .flatMap(
                (plugin) =>
                  (
                    plugin as DSL_EditorPlugin_Extension
                  ).getExtraElementEditorCreators?.() ?? [],
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
      return <EntityDiffView key={currentEditorState.uuid} />;
    } else if (currentEditorState instanceof EntityChangeConflictEditorState) {
      return <EntityChangeConflictEditor key={currentEditorState.uuid} />;
    } else if (currentEditorState instanceof FileGenerationViewerState) {
      return <FileGenerationViewer key={currentEditorState.uuid} />;
    } else if (currentEditorState instanceof ModelLoaderState) {
      return <ModelLoader />;
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
            <FaArrowsAltH />
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

  // actions
  const closeTab =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void =>
      editorStore.closeState(editorState);
  const closeTabOnMiddleClick =
    (editorState: EditorState): React.MouseEventHandler =>
    (event): void => {
      if (event.nativeEvent.button === 1) {
        editorStore.closeState(editorState);
      }
    };
  const openTab =
    (editorState: EditorState): (() => void) =>
    (): void =>
      editorStore.openState(editorState);

  if (!currentEditorState) {
    return editorStore.isInViewerMode ? (
      <ViewerEditPanelSplashScreen />
    ) : (
      <EditPanelSplashScreen />
    );
  }
  return (
    <div data-testid={CORE_TEST_ID.EDIT_PANEL} className="panel edit-panel">
      <ContextMenu disabled={true} className="panel__header edit-panel__header">
        <div
          data-testid={CORE_TEST_ID.EDIT_PANEL__HEADER_TABS}
          className="edit-panel__header__tabs"
        >
          {openedEditorStates.map((editorState) => (
            <div
              key={editorState.uuid}
              className={clsx('edit-panel__header__tab', {
                'edit-panel__header__tab--active':
                  editorState === currentEditorState,
              })}
              onMouseUp={closeTabOnMiddleClick(editorState)}
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
                  <FaTimes />
                </button>
              </ContextMenu>
            </div>
          ))}
        </div>
        <div className="edit-panel__header__actions">
          {currentEditorState instanceof ElementEditorState && (
            <DropdownMenu
              className="edit-panel__element-view"
              content={
                <MenuContent
                  data-testid={CORE_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS}
                  className="edit-panel__element-view__options edit-panel__element-view__options--with-group"
                >
                  <div className="edit-panel__element-view__option__group edit-panel__element-view__option__group--native">
                    <div className="edit-panel__element-view__option__group__name">
                      native
                    </div>
                    <div className="edit-panel__element-view__option__group__options">
                      {nativeViewModes.map((mode) => (
                        <MenuContentItem
                          key={mode}
                          className="edit-panel__element-view__option"
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
                      <div className="edit-panel__element-view__option__group__separator" />
                      <div className="edit-panel__element-view__option__group edit-panel__element-view__option__group--generation">
                        <div className="edit-panel__element-view__option__group__name">
                          generation
                        </div>
                        <div className="edit-panel__element-view__option__group__options">
                          {generationViewModes.map((mode) => (
                            <MenuContentItem
                              key={mode.type}
                              className="edit-panel__element-view__option"
                              onClick={(): void =>
                                currentEditorState.setGenerationViewMode(
                                  mode.type,
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
              <button
                className="edit-panel__element-view__type"
                title="View as..."
              >
                <div className="edit-panel__element-view__type__label">
                  {currentEditorState.generationViewMode
                    ? editorStore.graphState.graphGenerationState.getFileGenerationConfiguration(
                        currentEditorState.generationViewMode,
                      ).label
                    : currentEditorState.editMode}
                </div>
              </button>
            </DropdownMenu>
          )}
          {currentEditorState instanceof EntityDiffViewState && (
            <DropdownMenu
              className="edit-panel__element-view"
              content={
                <MenuContent
                  data-testid={CORE_TEST_ID.EDIT_PANEL__ELEMENT_VIEW__OPTIONS}
                  className="edit-panel__element-view__options"
                >
                  <MenuContentItem
                    className="edit-panel__element-view__option"
                    onClick={(): void =>
                      currentEditorState.setDiffMode(DIFF_VIEW_MODE.GRAMMAR)
                    }
                  >
                    {DIFF_VIEW_MODE.GRAMMAR}
                  </MenuContentItem>
                  <MenuContentItem
                    className="edit-panel__element-view__option"
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
              <button
                className="edit-panel__element-view__type"
                title="View as..."
              >
                <div className="edit-panel__element-view__type__label">
                  {currentEditorState.diffMode}
                </div>
              </button>
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
        data-testid={CORE_TEST_ID.EDIT_PANEL_CONTENT}
      >
        {renderActiveElementTab()}
      </div>
    </div>
  );
});
