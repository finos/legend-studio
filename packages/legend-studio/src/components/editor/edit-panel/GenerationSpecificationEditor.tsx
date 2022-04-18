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

import { useRef, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import {
  GenerationSpecificationEditorState,
  type GenerationSpecNodeDragSource,
  type GenerationSpecNodeDropTarget,
  type GenerationTreeNodeState,
} from '../../../stores/editor-state/GenerationSpecificationEditorState';
import { getEmptyImage } from 'react-dnd-html5-backend';
import {
  type DropTargetMonitor,
  type XYCoord,
  useDragLayer,
  useDrag,
  useDrop,
} from 'react-dnd';
import { getElementIcon } from '../../shared/ElementIconUtils';
import {
  clsx,
  BlankPanelContent,
  CustomSelectorInput,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  PURE_FileGenerationIcon,
  RefreshIcon,
  FireIcon,
  TimesIcon,
  PlusIcon,
  LongArrowRightIcon,
} from '@finos/legend-art';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
  type FileGenerationSourceDropTarget,
} from '../../../stores/shared/DnDUtil';
import {
  type PackageableElementOption,
  buildElementOption,
} from '../../../stores/shared/PackageableElementOptionUtil';
import { getNullableFirstElement } from '@finos/legend-shared';
import type { DSLGenerationSpecification_LegendStudioPlugin_Extension } from '../../../stores/DSLGenerationSpecification_LegendStudioPlugin_Extension';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider';
import {
  type PackageableElement,
  type PackageableElementReference,
  type DSLGenerationSpecification_PureGraphManagerPlugin_Extension,
  FileGenerationSpecification,
  PackageableElementExplicitReference,
  GenerationTreeNode,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import { packageableElementReference_setValue } from '../../../stores/graphModifier/DomainGraphModifierHelper';
import {
  generationSpecification_addFileGeneration,
  generationSpecification_deleteFileGeneration,
  generationSpecification_setId,
} from '../../../stores/graphModifier/DSLGeneration_GraphModifierHelper';

const ModelGenerationDragLayer: React.FC = () => {
  const { itemType, item, isDragging, currentPosition } = useDragLayer(
    (monitor) => ({
      itemType: monitor.getItemType(),
      item: monitor.getItem<GenerationSpecNodeDragSource | null>(),
      isDragging: monitor.isDragging(),
      initialOffset: monitor.getInitialSourceClientOffset(),
      currentPosition: monitor.getClientOffset(),
    }),
  );
  if (!isDragging || !item || itemType !== CORE_DND_TYPE.GENERATION_SPEC_NODE) {
    return null;
  }
  return (
    <div className="generation-spec-model-generation-editor__item__drag-preview-layer">
      <div
        className="generation-spec-model-generation-editor__item__drag-preview"
        style={
          !currentPosition
            ? { display: 'none' }
            : {
                transform: `translate(${currentPosition.x + 20}px, ${
                  currentPosition.y + 10
                }px)`,
              }
        }
      >
        {item.nodeState.node.generationElement.value.name}
      </div>
    </div>
  );
};

const ModelGenerationItem = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    nodeState: GenerationTreeNodeState;
    options: PackageableElementOption<PackageableElement>[];
    isRearrangingNodes: boolean;
  }) => {
    const ref = useRef<HTMLDivElement>(null);
    const { nodeState, specState, options, isRearrangingNodes } = props;
    const generationTreeNode = nodeState.node;
    const editorStore = useEditorStore();
    const modelGenerationRef = generationTreeNode.generationElement;
    const modelGeneration = modelGenerationRef.value;
    const value = { label: modelGeneration.name, value: modelGeneration };
    const onChange = (
      val: PackageableElementOption<FileGenerationSpecification> | null,
    ): void => {
      if (val !== null) {
        packageableElementReference_setValue(modelGenerationRef, val.value);
      }
    };
    const deleteNode = (): void =>
      specState.deleteGenerationTreeNode(generationTreeNode);
    const visitModelGeneration = (): void =>
      editorStore.openElement(modelGeneration);
    // generation id
    const isUnique =
      specState.spec.generationNodes.filter(
        (n) => n.id === generationTreeNode.id,
      ).length < 2;
    const isDefault =
      generationTreeNode.id ===
        generationTreeNode.generationElement.value.path && isUnique;
    const changeNodeId: React.ChangeEventHandler<HTMLInputElement> = (event) =>
      generationSpecification_setId(generationTreeNode, event.target.value);
    // Drag and Drop
    const handleHover = useCallback(
      (
        item: GenerationSpecNodeDropTarget,
        monitor: DropTargetMonitor,
      ): void => {
        const dragIndex = specState.generationTreeNodeStates.findIndex(
          (e) => e === item.nodeState,
        );
        const hoverIndex = specState.generationTreeNodeStates.findIndex(
          (e) => e === nodeState,
        );
        if (dragIndex === -1 || hoverIndex === -1 || dragIndex === hoverIndex) {
          return;
        }
        // move the item being hovered on when the dragged item position is beyond the its middle point
        const hoverBoundingReact = ref.current?.getBoundingClientRect();
        const distanceThreshold =
          ((hoverBoundingReact?.bottom ?? 0) - (hoverBoundingReact?.top ?? 0)) /
          2;
        const dragDistance =
          (monitor.getClientOffset() as XYCoord).y -
          (hoverBoundingReact?.top ?? 0);
        if (dragIndex < hoverIndex && dragDistance < distanceThreshold) {
          return;
        }
        if (dragIndex > hoverIndex && dragDistance > distanceThreshold) {
          return;
        }
        specState.moveGenerationNode(dragIndex, hoverIndex);
      },
      [nodeState, specState],
    );
    const [, dropConnector] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.GENERATION_SPEC_NODE],
        hover: (
          item: GenerationSpecNodeDragSource,
          monitor: DropTargetMonitor,
        ): void => handleHover(item, monitor),
      }),
      [handleHover],
    );
    const [, dragConnector, dragPreviewConnector] = useDrag(
      () => ({
        type: CORE_DND_TYPE.GENERATION_SPEC_NODE,
        item: (): GenerationSpecNodeDragSource => {
          nodeState.setIsBeingDragged(true);
          return { nodeState };
        },
        end: (item: GenerationSpecNodeDragSource | undefined): void =>
          item?.nodeState.setIsBeingDragged(false),
      }),
      [nodeState],
    );
    dragConnector(dropConnector(ref));
    // hide default HTML5 preview image
    useEffect(() => {
      dragPreviewConnector(getEmptyImage(), { captureDraggingState: true });
    }, [dragPreviewConnector]);
    return (
      <div
        ref={ref}
        className={clsx('generation-spec-model-generation-editor__item', {
          'generation-spec-model-generation-editor__item--dragged':
            nodeState.isBeingDragged,
          'generation-spec-model-generation-editor__item---no-hover':
            isRearrangingNodes,
        })}
      >
        {nodeState.isBeingDragged && (
          <div className="generation-spec-editor__dnd__placeholder" />
        )}
        {!nodeState.isBeingDragged && (
          <>
            <div className="btn--sm generation-spec-model-generation-editor__item__label">
              {getElementIcon(editorStore, modelGeneration)}
            </div>
            <input
              className={clsx(
                'generation-spec-model-generation-editor__item__id',
                {
                  'generation-spec-model-generation-editor__item__id--has-error':
                    !isUnique,
                },
              )}
              spellCheck={false}
              value={isDefault ? 'DEFAULT' : generationTreeNode.id}
              onChange={changeNodeId}
              disabled={isDefault}
            />
            <CustomSelectorInput
              className="generation-spec-model-generation-editor__item__dropdown"
              options={options}
              onChange={onChange}
              value={value}
              darkMode={true}
            />
            <button
              className="btn--dark btn--sm"
              onClick={visitModelGeneration}
              tabIndex={-1}
              title={'See mapping'}
            >
              <LongArrowRightIcon />
            </button>
            <button
              className="generation-spec-model-generation-editor__item__remove-btn"
              onClick={deleteNode}
              tabIndex={-1}
              title={'Remove'}
            >
              <TimesIcon />
            </button>
          </>
        )}
      </div>
    );
  },
);

const ModelGenerationSpecifications = observer(
  (props: { specState: GenerationSpecificationEditorState }) => {
    const { specState } = props;
    const specNodesStates = specState.generationTreeNodeStates;
    const editorStore = useEditorStore();
    const modelGenerationElementsInGraph = editorStore.pluginManager
      .getPureGraphManagerPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLGenerationSpecification_PureGraphManagerPlugin_Extension
          ).getExtraModelGenerationElementGetters?.() ?? [],
      )
      .flatMap((getter) => getter(editorStore.graphManagerState.graph));
    const extraModelGenerationSpecificationElementDnDTypes =
      editorStore.pluginManager
        .getStudioPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSLGenerationSpecification_LegendStudioPlugin_Extension
            ).getExtraModelGenerationSpecificationElementDnDTypes?.() ?? [],
        );
    const modelGenerationElementOptions =
      modelGenerationElementsInGraph.map(buildElementOption);
    const addModelGeneration = (): void => {
      const option = getNullableFirstElement(modelGenerationElementOptions);
      if (option) {
        specState.addGenerationTreeNode(
          new GenerationTreeNode(
            PackageableElementExplicitReference.create(option.value),
          ),
        );
      }
    };
    // Drag and Drop
    const isRearrangingNodes = specNodesStates.some(
      (nodeState) => nodeState.isBeingDragged,
    );
    const handleDrop = useCallback(
      (item: ElementDragSource): void =>
        specState.addGenerationTreeNode(
          new GenerationTreeNode(
            PackageableElementExplicitReference.create(
              item.data.packageableElement,
            ),
          ),
        ),
      [specState],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: extraModelGenerationSpecificationElementDnDTypes,
        drop: (item: ElementDragSource, monitor: DropTargetMonitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    return (
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">Model Generations</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={addModelGeneration}
              disabled={!modelGenerationElementsInGraph.length}
              tabIndex={-1}
              title="Add File Generation"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div
          className="panel__content dnd__overlay__container"
          ref={dropConnector}
        >
          <div className={clsx({ dnd__overlay: isPropertyDragOver })} />
          {specNodesStates.length ? (
            <div className="generation-spec-model-generation-editor__items">
              <ModelGenerationDragLayer />
              {specNodesStates.map((nodeState) => (
                <ModelGenerationItem
                  key={nodeState.uuid}
                  isRearrangingNodes={isRearrangingNodes}
                  specState={specState}
                  nodeState={nodeState}
                  options={modelGenerationElementOptions}
                />
              ))}
            </div>
          ) : (
            <BlankPanelContent>
              <div className="unsupported-element-editor__main">
                <div className="unsupported-element-editor__summary">
                  {modelGenerationElementsInGraph.length
                    ? 'No model generation included in spec'
                    : 'Create a model generation element to include in spec'}
                </div>
              </div>
            </BlankPanelContent>
          )}
        </div>
      </div>
    );
  },
);

const FileGenerationItem = observer(
  (props: {
    generationSpecificationEditorState: GenerationSpecificationEditorState;
    fileGeneraitonRef: PackageableElementReference<FileGenerationSpecification>;
    options: PackageableElementOption<FileGenerationSpecification>[];
  }) => {
    const { fileGeneraitonRef, generationSpecificationEditorState, options } =
      props;
    const editorStore = useEditorStore();
    const fileGeneration = fileGeneraitonRef.value;
    const value = { label: fileGeneration.name, value: fileGeneration };
    const onChange = (
      val: PackageableElementOption<FileGenerationSpecification> | null,
    ): void => {
      if (val !== null) {
        packageableElementReference_setValue(fileGeneraitonRef, val.value);
      }
    };
    const deleteColumnSort = (): void =>
      generationSpecification_deleteFileGeneration(
        generationSpecificationEditorState.spec,
        fileGeneraitonRef,
      );
    const visitFileGen = (): void => editorStore.openElement(fileGeneration);
    return (
      <div className="panel__content__form__section__list__item generation-spec-file-generation-editor__item">
        <div className="btn--sm generation-spec-file-generation-editor__item__label">
          <PURE_FileGenerationIcon />
        </div>
        <CustomSelectorInput
          className="generation-spec-file-generation-editor__item__dropdown"
          options={options}
          onChange={onChange}
          value={value}
          darkMode={true}
        />
        <button
          className="btn--dark btn--sm"
          onClick={visitFileGen}
          tabIndex={-1}
          title={'See mapping'}
        >
          <LongArrowRightIcon />
        </button>
        <button
          className="generation-spec-file-generation-editor__item__remove-btn"
          onClick={deleteColumnSort}
          tabIndex={-1}
          title={'Remove'}
        >
          <TimesIcon />
        </button>
      </div>
    );
  },
);

const FileGenerationSpecifications = observer(
  (props: {
    generationSpecificationEditorState: GenerationSpecificationEditorState;
  }) => {
    const { generationSpecificationEditorState } = props;
    const generationSpec = generationSpecificationEditorState.spec;
    const editorStore = useEditorStore();
    const fileGenerations =
      generationSpecificationEditorState.spec.fileGenerations.map(
        (f) => f.value,
      );
    const fileGenerationInGraph =
      editorStore.graphManagerState.graph.ownFileGenerations;
    const fileGenerationsOptions = fileGenerationInGraph
      .filter((f) => !fileGenerations.includes(f))
      .map(
        buildElementOption,
      ) as PackageableElementOption<FileGenerationSpecification>[];
    const addFileGeneration = (): void => {
      const option = getNullableFirstElement(fileGenerationsOptions);
      if (option) {
        generationSpecification_addFileGeneration(generationSpec, option.value);
      }
    };
    // drag and drop
    const handleDrop = useCallback(
      (item: FileGenerationSourceDropTarget): void => {
        const element = item.data.packageableElement;
        if (
          element instanceof FileGenerationSpecification &&
          !fileGenerations.includes(element)
        ) {
          generationSpecification_addFileGeneration(generationSpec, element);
        }
      },
      [fileGenerations, generationSpec],
    );
    const [{ isPropertyDragOver }, dropConnector] = useDrop(
      () => ({
        accept: [CORE_DND_TYPE.PROJECT_EXPLORER_FILE_GENERATION],
        drop: (item: ElementDragSource, monitor: DropTargetMonitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item);
          }
        },
        collect: (monitor): { isPropertyDragOver: boolean } => ({
          isPropertyDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    return (
      <div className="panel generation-spec-file-generation-editor">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">File Generations</div>
          </div>
          <div className="panel__header__actions">
            <button
              className="panel__header__action"
              onClick={addFileGeneration}
              disabled={!fileGenerationsOptions.length}
              tabIndex={-1}
              title="Add File Generation"
            >
              <PlusIcon />
            </button>
          </div>
        </div>
        <div
          className="panel__content dnd__overlay__container"
          ref={dropConnector}
        >
          <div className={clsx({ dnd__overlay: isPropertyDragOver })} />
          {generationSpec.fileGenerations.length ? (
            <div className="generation-spec-file-generation-editor__items">
              {generationSpec.fileGenerations.map((fileGen) => (
                <FileGenerationItem
                  key={fileGen.value.path}
                  generationSpecificationEditorState={
                    generationSpecificationEditorState
                  }
                  fileGeneraitonRef={fileGen}
                  options={fileGenerationsOptions}
                />
              ))}
            </div>
          ) : (
            <BlankPanelContent>
              <div className="unsupported-element-editor__main">
                <div className="unsupported-element-editor__summary">
                  {fileGenerationInGraph.length
                    ? 'Add file generation to spec'
                    : 'Create a file generation to include in spec'}
                </div>
              </div>
            </BlankPanelContent>
          )}
        </div>
      </div>
    );
  },
);

export const GenerationSpecificationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const generationSpecificationState = editorStore.getCurrentEditorState(
    GenerationSpecificationEditorState,
  );
  const modelGenerationState = editorStore.graphState.graphGenerationState;
  const generationSpec = generationSpecificationState.spec;
  const generate = applicationStore.guardUnhandledError(() =>
    flowResult(modelGenerationState.globalGenerate()),
  );
  const emptyGenerationEntities = applicationStore.guardUnhandledError(() =>
    flowResult(modelGenerationState.clearGenerations()),
  );

  return (
    <div className="generation-spec-editor">
      <div className="panel">
        <div className="panel__header">
          <div className="panel__header__title">
            <div className="panel__header__title__label">
              Generation Specification
            </div>
            <div className="panel__header__title__content">
              {generationSpec.name}
            </div>
          </div>
          <div className="panel__header__actions">
            <button
              className={clsx(
                'editor__status-bar__action editor__status-bar__generate-btn',
                {
                  'editor__status-bar__generate-btn--wiggling':
                    modelGenerationState.isRunningGlobalGenerate,
                },
              )}
              tabIndex={-1}
              onClick={generate}
              title={'Generate'}
            >
              <FireIcon />
            </button>
            <button
              className={clsx(
                'editor__status-bar__action editor__status-bar__generate-btn',
                {
                  'local-changes__refresh-btn--loading':
                    modelGenerationState.isClearingGenerationEntities,
                },
              )}
              onClick={emptyGenerationEntities}
              tabIndex={-1}
              title="Clear generation entities"
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
        <div className="panel__content generation-spec-editor__content">
          <ResizablePanelGroup orientation="horizontal">
            <ResizablePanel size={400} minSize={25}>
              <ModelGenerationSpecifications
                specState={generationSpecificationState}
              />
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <FileGenerationSpecifications
                generationSpecificationEditorState={
                  generationSpecificationState
                }
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      </div>
    </div>
  );
});
