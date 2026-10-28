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

import { useCallback, useMemo, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import {
  GENERATION_SPEC_ELEMENT_CARD_DND_TYPE,
  GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE,
  GENERATION_SPEC_PALETTE_FILE_GENERATION_DND_TYPE,
  GenerationSpecificationEditorState,
  type GenerationSpecElementDragSource,
  type GenerationSpecPaletteElementDragSource,
} from '../../../stores/editor/editor-state/GenerationSpecificationEditorState.js';
import { useDrag, useDrop } from 'react-dnd';
import { getElementIcon } from '../../ElementIconUtils.js';
import {
  clsx,
  ArrowDownIcon,
  ArrowUpIcon,
  DragPreviewLayer,
  ExclamationTriangleIcon,
  FireIcon,
  LockIcon,
  LongArrowRightIcon,
  Panel,
  PanelContent,
  PanelHeader,
  PanelHeaderActionItem,
  PanelHeaderActions,
  PURE_FileGenerationIcon,
  RefreshIcon,
  ResizablePanel,
  ResizablePanelGroup,
  ResizablePanelSplitter,
  ResizablePanelSplitterLine,
  TimesIcon,
  useDragPreviewLayer,
} from '@finos/legend-art';
import {
  CORE_DND_TYPE,
  type ElementDragSource,
} from '../../../stores/editor/utils/DnDUtils.js';
import type { DSL_Generation_LegendStudioApplicationPlugin_Extension } from '../../../stores/extensions/DSL_Generation_LegendStudioApplicationPlugin_Extension.js';
import { flowResult } from 'mobx';
import { useEditorStore } from '../EditorStoreProvider.js';
import {
  type DSL_Generation_PureGraphManagerPlugin_Extension,
  type GenerationTreeNode,
  type PackageableElement,
  type PackageableElementReference,
  FileGenerationSpecification,
} from '@finos/legend-graph';
import { useApplicationStore } from '@finos/legend-application';
import {
  generationSpecification_addFileGeneration,
  generationSpecification_deleteFileGeneration,
} from '../../../stores/graph-modifier/DSL_Generation_GraphModifierHelper.js';
import type { GraphGenerationState } from '../../../stores/editor/editor-state/GraphGenerationState.js';

/**
 * The item shapes the board accepts differ by where the drag started: the palette drags an element,
 * a card drags itself out of the stage it is in, and a plugin's project-explorer drag uses the
 * shared element drag source.
 */
const getDraggedElement = (
  item: unknown,
  itemType: string | symbol | null,
): PackageableElement | undefined => {
  if (itemType === GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE) {
    return (item as GenerationSpecPaletteElementDragSource).element;
  }
  if (itemType === GENERATION_SPEC_ELEMENT_CARD_DND_TYPE) {
    return (item as GenerationSpecElementDragSource).elementRef.value;
  }
  // a plugin's drag source is the shared element drag source, but `item` is whatever the backend
  // handed us, so the shape is checked rather than asserted
  return (item as Partial<ElementDragSource>).data?.packageableElement;
};

const PaletteItem = observer(
  (props: {
    element: PackageableElement;
    dndType: string;
    usageCount: number;
  }) => {
    const { element, dndType, usageCount } = props;
    const ref = useRef<HTMLDivElement>(null);
    const editorStore = useEditorStore();
    const [, dragConnector, dragPreviewConnector] =
      useDrag<GenerationSpecPaletteElementDragSource>(
        () => ({
          type: dndType,
          item: () => ({ element }),
        }),
        [element, dndType],
      );
    dragConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        ref={ref}
        className="generation-spec-editor__palette__item"
        title={`${element.path}${
          usageCount ? ` - already in ${usageCount} stage(s)` : ''
        }`}
      >
        <div className="generation-spec-editor__palette__item__icon">
          {getElementIcon(element, editorStore)}
        </div>
        <div className="generation-spec-editor__palette__item__name">
          {element.path}
        </div>
        {usageCount > 0 && (
          <div
            className="generation-spec-editor__palette__item__usage"
            title={`This element is already in ${usageCount} stage(s). The same element may appear in more than one stage - engine warns and the first result wins - but it cannot appear twice in one stage.`}
          >
            {usageCount > 1 ? `in ${usageCount} stages` : 'in use'}
          </div>
        )}
      </div>
    );
  },
);

const GenerationElementPalette = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    modelGenerationElements: PackageableElement[];
  }) => {
    const { specState, modelGenerationElements } = props;
    const editorStore = useEditorStore();
    const usageIndex = specState.elementUsageIndex;
    const fileGenerationsInSpec = specState.spec.fileGenerations.map(
      (fileGeneration) => fileGeneration.value,
    );
    const fileGenerationElements =
      editorStore.graphManagerState.graph.ownFileGenerations;

    return (
      <div className="generation-spec-editor__palette">
        <div className="generation-spec-editor__palette__section">
          <div className="generation-spec-editor__palette__section__title">
            Elements
          </div>
          <div className="generation-spec-editor__palette__section__hint">
            Drag onto a stage to add it there. Anything in one stage runs
            together.
          </div>
          {modelGenerationElements.length ? (
            <div className="generation-spec-editor__palette__items">
              {modelGenerationElements.map((element) => (
                <PaletteItem
                  key={element.path}
                  element={element}
                  dndType={GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE}
                  usageCount={usageIndex.get(element.path) ?? 0}
                />
              ))}
            </div>
          ) : (
            <div className="generation-spec-editor__palette__empty">
              No model generation elements. These come from Studio extensions,
              so this list stays empty unless a DSL extension that generates
              models is installed.
            </div>
          )}
        </div>
        <div className="generation-spec-editor__palette__section">
          <div className="generation-spec-editor__palette__section__title">
            File generations
          </div>
          <div className="generation-spec-editor__palette__section__hint">
            Only drop into the band at the end.
          </div>
          {fileGenerationElements.length ? (
            <div className="generation-spec-editor__palette__items">
              {fileGenerationElements.map((element) => (
                <PaletteItem
                  key={element.path}
                  element={element}
                  dndType={GENERATION_SPEC_PALETTE_FILE_GENERATION_DND_TYPE}
                  usageCount={fileGenerationsInSpec.includes(element) ? 1 : 0}
                />
              ))}
            </div>
          ) : (
            <div className="generation-spec-editor__palette__empty">
              No file generations in this project.
            </div>
          )}
        </div>
      </div>
    );
  },
);

const StageElementCard = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    generationGenerationState: GraphGenerationState;
    node: GenerationTreeNode;
    elementRef: PackageableElementReference<PackageableElement>;
  }) => {
    const { specState, generationGenerationState, node, elementRef } = props;
    const ref = useRef<HTMLDivElement>(null);
    const editorStore = useEditorStore();
    const element = elementRef.value;
    const failure = generationGenerationState.getModelGenerationFailure(
      node,
      elementRef,
    );
    const isReadOnly = specState.isReadOnly;
    const canSplitOut = !isReadOnly && node.generationElements.length > 1;
    const [{ isBeingDragged }, dragConnector, dragPreviewConnector] = useDrag<
      GenerationSpecElementDragSource,
      void,
      { isBeingDragged: boolean }
    >(
      () => ({
        type: GENERATION_SPEC_ELEMENT_CARD_DND_TYPE,
        item: () => ({ node, elementRef }),
        canDrag: () => !isReadOnly,
        collect: (monitor) => ({ isBeingDragged: monitor.isDragging() }),
      }),
      [node, elementRef, isReadOnly],
    );
    dragConnector(ref);
    useDragPreviewLayer(dragPreviewConnector);

    return (
      <div
        ref={ref}
        className={clsx('generation-spec-editor__card', {
          'generation-spec-editor__card--dragging': isBeingDragged,
          'generation-spec-editor__card--failed': Boolean(failure),
          'generation-spec-editor__card--read-only': isReadOnly,
        })}
      >
        <div className="generation-spec-editor__card__header">
          <div className="generation-spec-editor__card__icon">
            {getElementIcon(element, editorStore)}
          </div>
          <div
            className="generation-spec-editor__card__name"
            title={element.path}
          >
            {element.name}
          </div>
          <button
            className="generation-spec-editor__card__action"
            onClick={(): void =>
              editorStore.graphEditorMode.openElement(element)
            }
            title="Open element"
            aria-label={`Open ${element.path}`}
          >
            <LongArrowRightIcon />
          </button>
          {!isReadOnly && (
            <button
              className="generation-spec-editor__card__action"
              onClick={(): void => specState.deleteElement(node, elementRef)}
              title="Remove from this stage"
              aria-label={`Remove ${element.path} from this stage`}
            >
              <TimesIcon />
            </button>
          )}
        </div>
        <div
          className="generation-spec-editor__card__package"
          title={element.path}
        >
          {element.package?.path ?? ''}
        </div>
        {failure && (
          <div className="generation-spec-editor__card__failure">
            <div className="generation-spec-editor__card__failure__message">
              <ExclamationTriangleIcon />
              <span title={failure.message}>{failure.message}</span>
            </div>
            {canSplitOut && (
              <button
                className="generation-spec-editor__card__failure__action"
                onClick={(): void =>
                  specState.moveElementToNewStage(node, elementRef)
                }
                title="Everything in a stage is generated against the same model, so nothing in this stage can use what another element of it produces. If this generation needs one of them, a stage of its own - right after this one - gives it that output."
              >
                Move to a new stage
              </button>
            )}
          </div>
        )}
      </div>
    );
  },
);

const GenerationStage = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    generationGenerationState: GraphGenerationState;
    node: GenerationTreeNode;
    index: number;
    modelGenerationDnDTypes: string[];
  }) => {
    const {
      specState,
      generationGenerationState,
      node,
      index,
      modelGenerationDnDTypes,
    } = props;
    const ref = useRef<HTMLDivElement>(null);
    const isReadOnly = specState.isReadOnly;
    const elementCount = node.generationElements.length;
    const isLastStage = index === specState.stageCount - 1;
    // what the field shows while it has focus, so typing is never replaced under the cursor - e.g.
    // by the placeholder, when what is typed happens to spell the default id
    const [idDraft, setIdDraft] = useState<string | undefined>(undefined);
    const isIdUnique =
      specState.spec.generationNodes.filter(
        (otherNode) => otherNode.id === node.id,
      ).length < 2;
    const isIdDefault = node.id === node.defaultId && isIdUnique;

    const handleDrop = useCallback(
      (item: unknown, itemType: string | symbol | null): void => {
        if (itemType === GENERATION_SPEC_ELEMENT_CARD_DND_TYPE) {
          const card = item as GenerationSpecElementDragSource;
          specState.moveElementToStage(card.node, card.elementRef, node);
          return;
        }
        const element = getDraggedElement(item, itemType);
        if (element && !(element instanceof FileGenerationSpecification)) {
          specState.addElementToStage(node, element);
        }
      },
      [node, specState],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      unknown,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: modelGenerationDnDTypes,
        canDrop: (item, monitor): boolean => {
          if (isReadOnly) {
            return false;
          }
          const itemType = monitor.getItemType();
          if (itemType === GENERATION_SPEC_ELEMENT_CARD_DND_TYPE) {
            const card = item as GenerationSpecElementDragSource;
            if (card.node === node) {
              return false;
            }
          }
          const element = getDraggedElement(item, itemType);
          // the same element twice in one stage would generate the same output twice against the
          // same model, which is a hard failure rather than a warning
          return Boolean(
            element &&
              !(element instanceof FileGenerationSpecification) &&
              !specState.nodeHoldsElement(node, element),
          );
        },
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType());
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        }),
      }),
      [handleDrop, modelGenerationDnDTypes, node, specState, isReadOnly],
    );
    dropConnector(ref);

    return (
      <div
        ref={ref}
        className={clsx('generation-spec-editor__stage', {
          'generation-spec-editor__stage--drag-over': isDragOver,
        })}
      >
        <div className="generation-spec-editor__stage__header">
          <div className="generation-spec-editor__stage__header__badge">
            {`Stage ${index + 1}`}
          </div>
          <div className="generation-spec-editor__stage__header__summary">
            {elementCount > 1
              ? `${elementCount} generations, run together against the same compiled model`
              : `1 generation`}
          </div>
          {/* an unnamed stage shows DEFAULT as a placeholder, not as a value, so it can be named;
              clearing the field returns it to the default rather than saving an empty id */}
          <input
            className={clsx('generation-spec-editor__stage__header__id', {
              'generation-spec-editor__stage__header__id--has-error':
                !isIdUnique,
            })}
            spellCheck={false}
            aria-label={`Stage ${index + 1} id`}
            placeholder="DEFAULT"
            value={idDraft ?? (isIdDefault ? '' : node.id)}
            onFocus={(): void => setIdDraft(isIdDefault ? '' : node.id)}
            onChange={(event): void => {
              setIdDraft(event.target.value);
              specState.setStageId(node, event.target.value);
            }}
            onBlur={(): void => setIdDraft(undefined)}
            disabled={isReadOnly}
            title={
              isIdUnique
                ? `Stage id: ${node.id}`
                : `Stage id '${node.id}' is used by another stage`
            }
          />
          {/* the only way to reorder stages that does not need a pointer */}
          {!isReadOnly && (
            <>
              <button
                className="generation-spec-editor__stage__header__action"
                onClick={(): void => specState.moveStage(index, index - 1)}
                disabled={index === 0}
                title="Run this stage earlier"
                aria-label={`Run stage ${index + 1} earlier`}
              >
                <ArrowUpIcon />
              </button>
              <button
                className="generation-spec-editor__stage__header__action"
                onClick={(): void => specState.moveStage(index, index + 1)}
                disabled={isLastStage}
                title="Run this stage later"
                aria-label={`Run stage ${index + 1} later`}
              >
                <ArrowDownIcon />
              </button>
            </>
          )}
        </div>
        <div className="generation-spec-editor__stage__cards">
          {node.generationElements.map((elementRef) => (
            <StageElementCard
              key={elementRef.value.path}
              specState={specState}
              generationGenerationState={generationGenerationState}
              node={node}
              elementRef={elementRef}
            />
          ))}
        </div>
      </div>
    );
  },
);

/**
 * Generated output builds up across stages - the graph is rebuilt from everything generated so far -
 * so a stage can use what every stage above it produced, not only the one directly above.
 */
const StageDivider: React.FC<{ nextStageIndex: number }> = (props) => (
  <div className="generation-spec-editor__divider">
    <ArrowDownIcon className="generation-spec-editor__divider__icon" />
    <div className="generation-spec-editor__divider__label">Recompile</div>
    <div className="generation-spec-editor__divider__line" />
    <div className="generation-spec-editor__divider__note">
      {`Stage ${props.nextStageIndex + 1} can use everything ${
        props.nextStageIndex === 1
          ? 'stage 1'
          : `stages 1-${props.nextStageIndex}`
      } produced`}
    </div>
  </div>
);

const NewStageDropZone = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    modelGenerationDnDTypes: string[];
  }) => {
    const { specState, modelGenerationDnDTypes } = props;
    const ref = useRef<HTMLDivElement>(null);
    const handleDrop = useCallback(
      (item: unknown, itemType: string | symbol | null): void => {
        if (itemType === GENERATION_SPEC_ELEMENT_CARD_DND_TYPE) {
          const card = item as GenerationSpecElementDragSource;
          specState.moveElementToNewStage(
            card.node,
            card.elementRef,
            specState.stageCount,
          );
          return;
        }
        const element = getDraggedElement(item, itemType);
        if (element && !(element instanceof FileGenerationSpecification)) {
          specState.addElementAsNewStage(element);
        }
      },
      [specState],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      unknown,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: modelGenerationDnDTypes,
        canDrop: (item, monitor): boolean => {
          const element = getDraggedElement(item, monitor.getItemType());
          return Boolean(
            element && !(element instanceof FileGenerationSpecification),
          );
        },
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType());
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        }),
      }),
      [handleDrop, modelGenerationDnDTypes],
    );
    dropConnector(ref);

    return (
      <div
        ref={ref}
        className={clsx('generation-spec-editor__new-stage', {
          'generation-spec-editor__new-stage--drag-over': isDragOver,
        })}
      >
        {specState.stageCount
          ? 'Drop here for a new stage - runs after everything above'
          : 'Drag generation elements here. Anything you drop together runs together; drop below a stage to make it wait for everything above.'}
      </div>
    );
  },
);

const FileGenerationCard = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    fileGenerationRef: PackageableElementReference<FileGenerationSpecification>;
  }) => {
    const { specState, fileGenerationRef } = props;
    const editorStore = useEditorStore();
    const isReadOnly = specState.isReadOnly;
    const fileGeneration = fileGenerationRef.value;
    return (
      <div className="generation-spec-editor__card generation-spec-editor__card--file-generation">
        <div className="generation-spec-editor__card__header">
          <div className="generation-spec-editor__card__icon">
            <PURE_FileGenerationIcon />
          </div>
          <div
            className="generation-spec-editor__card__name"
            title={fileGeneration.path}
          >
            {fileGeneration.name}
          </div>
          <button
            className="generation-spec-editor__card__action"
            onClick={(): void =>
              editorStore.graphEditorMode.openElement(fileGeneration)
            }
            title="Open element"
            aria-label={`Open ${fileGeneration.path}`}
          >
            <LongArrowRightIcon />
          </button>
          {!isReadOnly && (
            <button
              className="generation-spec-editor__card__action"
              onClick={(): void =>
                generationSpecification_deleteFileGeneration(
                  specState.spec,
                  fileGenerationRef,
                )
              }
              title="Remove"
              aria-label={`Remove ${fileGeneration.path}`}
            >
              <TimesIcon />
            </button>
          )}
        </div>
        <div className="generation-spec-editor__card__package">
          {fileGeneration.type}
        </div>
      </div>
    );
  },
);

const FileGenerationBand = observer(
  (props: { specState: GenerationSpecificationEditorState }) => {
    const { specState } = props;
    const ref = useRef<HTMLDivElement>(null);
    const isReadOnly = specState.isReadOnly;
    const generationSpec = specState.spec;
    const fileGenerations = generationSpec.fileGenerations.map(
      (fileGeneration) => fileGeneration.value,
    );
    const handleDrop = useCallback(
      (item: unknown, itemType: string | symbol | null): void => {
        const element = getDraggedElement(item, itemType);
        if (
          element instanceof FileGenerationSpecification &&
          !fileGenerations.includes(element)
        ) {
          generationSpecification_addFileGeneration(generationSpec, element);
        }
      },
      [fileGenerations, generationSpec],
    );
    const [{ isDragOver }, dropConnector] = useDrop<
      unknown,
      void,
      { isDragOver: boolean }
    >(
      () => ({
        accept: [
          GENERATION_SPEC_PALETTE_FILE_GENERATION_DND_TYPE,
          CORE_DND_TYPE.PROJECT_EXPLORER_FILE_GENERATION,
        ],
        canDrop: (item, monitor): boolean => {
          if (isReadOnly) {
            return false;
          }
          const element = getDraggedElement(item, monitor.getItemType());
          return Boolean(
            element instanceof FileGenerationSpecification &&
              !fileGenerations.includes(element),
          );
        },
        drop: (item, monitor): void => {
          if (!monitor.didDrop()) {
            handleDrop(item, monitor.getItemType());
          } // prevent drop event propagation to accomondate for nested DnD
        },
        collect: (monitor) => ({
          isDragOver: monitor.isOver({ shallow: true }) && monitor.canDrop(),
        }),
      }),
      [handleDrop, fileGenerations, isReadOnly],
    );
    dropConnector(ref);

    return (
      <>
        <div className="generation-spec-editor__divider generation-spec-editor__divider--model-generation-complete">
          <div className="generation-spec-editor__divider__label">
            {specState.stageCount
              ? 'Model generation complete'
              : 'Nothing to compile'}
          </div>
          <div className="generation-spec-editor__divider__line" />
        </div>
        <div
          ref={ref}
          className={clsx('generation-spec-editor__file-generations', {
            'generation-spec-editor__file-generations--drag-over': isDragOver,
          })}
        >
          <div className="generation-spec-editor__stage__header">
            <div className="generation-spec-editor__stage__header__badge generation-spec-editor__stage__header__badge--file-generation">
              File generations
            </div>
            <div className="generation-spec-editor__stage__header__summary">
              always after model generation, always together, no order between
              them
            </div>
          </div>
          {generationSpec.fileGenerations.length ? (
            <div className="generation-spec-editor__stage__cards">
              {generationSpec.fileGenerations.map((fileGenerationRef) => (
                <FileGenerationCard
                  key={fileGenerationRef.value.path}
                  specState={specState}
                  fileGenerationRef={fileGenerationRef}
                />
              ))}
            </div>
          ) : (
            <div className="generation-spec-editor__file-generations__empty">
              {isReadOnly
                ? 'No file generations.'
                : 'Drop file generations here - they run after all model generation.'}
            </div>
          )}
        </div>
      </>
    );
  },
);

const GenerationStageBoard = observer(
  (props: {
    specState: GenerationSpecificationEditorState;
    generationGenerationState: GraphGenerationState;
    modelGenerationDnDTypes: string[];
  }) => {
    const { specState, generationGenerationState, modelGenerationDnDTypes } =
      props;
    const nodeStates = specState.generationTreeNodeStates;

    return (
      <div className="generation-spec-editor__board">
        <DragPreviewLayer
          labelGetter={(item: GenerationSpecElementDragSource): string =>
            item.elementRef.value.name
          }
          types={[GENERATION_SPEC_ELEMENT_CARD_DND_TYPE]}
        />
        <DragPreviewLayer
          labelGetter={(item: GenerationSpecPaletteElementDragSource): string =>
            item.element.name
          }
          types={[
            GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE,
            GENERATION_SPEC_PALETTE_FILE_GENERATION_DND_TYPE,
          ]}
        />
        {nodeStates.map((nodeState, index) => (
          <div key={nodeState.uuid}>
            {index > 0 && <StageDivider nextStageIndex={index} />}
            <GenerationStage
              specState={specState}
              generationGenerationState={generationGenerationState}
              node={nodeState.node}
              index={index}
              modelGenerationDnDTypes={modelGenerationDnDTypes}
            />
          </div>
        ))}
        {!specState.isReadOnly && (
          <NewStageDropZone
            specState={specState}
            modelGenerationDnDTypes={modelGenerationDnDTypes}
          />
        )}
        <FileGenerationBand specState={specState} />
      </div>
    );
  },
);

export const GenerationSpecificationEditor = observer(() => {
  const editorStore = useEditorStore();
  const applicationStore = useApplicationStore();
  const specState = editorStore.tabManagerState.getCurrentEditorState(
    GenerationSpecificationEditorState,
  );
  const generationGenerationState = editorStore.graphState.graphGenerationState;
  const generationSpec = specState.spec;
  const generate = applicationStore.guardUnhandledError(() =>
    flowResult(generationGenerationState.globalGenerate()),
  );
  const emptyGenerationEntities = applicationStore.guardUnhandledError(() =>
    flowResult(generationGenerationState.clearGenerations()),
  );
  /**
   * What may appear in a stage, and what the stages accept, both come from the extensions that
   * own those element types. Nothing in open-source Studio implements either, so a vanilla build
   * has an empty palette.
   */
  const modelGenerationElements = editorStore.pluginManager
    .getPureGraphManagerPlugins()
    .flatMap(
      (plugin) =>
        (
          plugin as DSL_Generation_PureGraphManagerPlugin_Extension
        ).getExtraModelGenerationElementGetters?.() ?? [],
    )
    .flatMap((getter) => getter(editorStore.graphManagerState.graph));
  const modelGenerationDnDTypes = useMemo(
    () => [
      GENERATION_SPEC_PALETTE_ELEMENT_DND_TYPE,
      GENERATION_SPEC_ELEMENT_CARD_DND_TYPE,
      ...editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Generation_LegendStudioApplicationPlugin_Extension
            ).getExtraModelGenerationSpecificationElementDnDTypes?.() ?? [],
        ),
    ],
    [editorStore],
  );
  const stageCount = specState.stageCount;
  const isReadOnly = specState.isReadOnly;
  const flattenBlockers = specState.flattenBlockers;
  const board = (
    <GenerationStageBoard
      specState={specState}
      generationGenerationState={generationGenerationState}
      modelGenerationDnDTypes={modelGenerationDnDTypes}
    />
  );

  return (
    <div className="generation-spec-editor">
      <Panel>
        <PanelHeader>
          <div className="panel__header__title">
            {isReadOnly && (
              <div
                className="generation-spec-editor__lock"
                title="This specification is read-only"
              >
                <LockIcon />
              </div>
            )}
            <div className="panel__header__title__label">
              Generation Specification
            </div>
            <div className="panel__header__title__content">
              {generationSpec.name}
            </div>
            <div
              className="generation-spec-editor__stat"
              title="Every stage ends in a recompile of the graph, which is what lets the next stage use what it produced. Elements in one stage share a single recompile."
            >
              {`${stageCount} ${
                stageCount === 1 ? 'stage' : 'stages'
              }, ${stageCount} ${
                stageCount === 1 ? 'recompile' : 'recompiles'
              }`}
            </div>
            {/* an action the author takes, never one the editor suggests: whether the stages are
                independent is not something the editor can know, so the tooltip says what is at
                stake, and a card that then fails offers to move back into a stage of its own */}
            {!isReadOnly && stageCount > 1 && (
              <button
                className="generation-spec-editor__flatten"
                onClick={(): void => specState.flattenStages()}
                disabled={!specState.canFlattenStages}
                title={
                  flattenBlockers.length
                    ? `Can't flatten: ${flattenBlockers.join(', ')} ${
                        flattenBlockers.length === 1 ? 'is' : 'are'
                      } in more than one stage, and one stage cannot run the same element twice`
                    : `Move every generation into stage 1, so they all run together - one recompile instead of ${stageCount}. A generation that needs another one's output will then fail, and its card will offer to move it back into a stage of its own.`
                }
              >
                Flatten into one stage
              </button>
            )}
          </div>
          <PanelHeaderActions>
            <PanelHeaderActionItem
              className={clsx(
                'editor__status-bar__action editor__status-bar__generate-btn',
                {
                  'editor__status-bar__generate-btn--wiggling':
                    generationGenerationState.isRunningGlobalGenerate,
                },
              )}
              onClick={generate}
              title="Generate"
            >
              <FireIcon />
            </PanelHeaderActionItem>
            <PanelHeaderActionItem
              className={clsx(
                'editor__status-bar__action editor__status-bar__generate-btn',
                {
                  'local-changes__refresh-btn--loading':
                    generationGenerationState.clearingGenerationEntitiesState
                      .isInProgress,
                },
              )}
              onClick={emptyGenerationEntities}
              title="Clear generation entities"
            >
              <RefreshIcon />
            </PanelHeaderActionItem>
          </PanelHeaderActions>
        </PanelHeader>
        <PanelContent className="generation-spec-editor__content">
          {/* the palette is only a source of drags, so a read-only board does without it */}
          {isReadOnly ? (
            board
          ) : (
            <ResizablePanelGroup orientation="vertical">
              <ResizablePanel size={280} minSize={200}>
                <GenerationElementPalette
                  specState={specState}
                  modelGenerationElements={modelGenerationElements}
                />
              </ResizablePanel>
              <ResizablePanelSplitter>
                <ResizablePanelSplitterLine color="var(--color-border-default)" />
              </ResizablePanelSplitter>
              <ResizablePanel minSize={300}>{board}</ResizablePanel>
            </ResizablePanelGroup>
          )}
        </PanelContent>
      </Panel>
    </div>
  );
});
