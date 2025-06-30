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
import { InstanceSetImplementationEditor } from './InstanceSetImplementationEditor.js';
import { OperationSetImplementationEditor } from './OperationSetImplementationEditor.js';
import {
  clsx,
  CustomSelectorInput,
  PURE_ClassIcon,
  EmptySquareIcon,
  CheckSquareIcon,
} from '@finos/legend-art';
import { getElementTypeIcon } from '../../../ElementIconUtils.js';
import { MappingEditorState } from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type SetImplementation,
  PureInstanceSetImplementation,
  FlatDataInstanceSetImplementation,
  EmbeddedFlatDataPropertyMapping,
  RootRelationalInstanceSetImplementation,
  fromElementPathToMappingElementId,
  OperationSetImplementation,
  OperationType,
  INTERNAL__UnknownSetImplementation,
  RelationFunctionInstanceSetImplementation,
} from '@finos/legend-graph';
import {
  setImpl_nominateRoot,
  operationMapping_setOperation,
  operationMapping_setParameters,
  setImplementation_setRoot,
} from '../../../../stores/graph-modifier/DSL_Mapping_GraphModifierHelper.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/extensions/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';
import { UnsupportedEditorPanel } from '../UnsupportedElementEditor.js';

export const OperatorSelector = observer(
  (props: {
    setImplementation: OperationSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const operationsOptions = Object.values(OperationType).map((value) => ({
      value,
      label: value,
    }));
    const selectedSourceType = {
      value: setImplementation.operation,
      label: setImplementation.operation,
    };
    const changeSourceType = (
      val: { label: string; value: OperationType } | null,
    ): void => {
      const value = val?.value ? OperationType[val.value] : undefined;
      if (value && setImplementation.operation !== value) {
        operationMapping_setOperation(setImplementation, value);
        operationMapping_setParameters(setImplementation, []);
      }
    };
    return (
      <CustomSelectorInput
        disabled={isReadOnly}
        options={operationsOptions}
        onChange={changeSourceType}
        value={selectedSourceType}
        placeholder="Select operation ID"
      />
    );
  },
);

export enum CLASS_MAPPING_SOURCE_TYPE {
  CLASS = 'CLASS',
  FLAT_DATA = 'FLAT DATA',
  OPERATION = 'OPERATION',
  RELATIONAL = 'DATABASE TABLE',
  RELATION_FUNCTION = 'RELATION',
}

export const ClassMappingEditor = observer(
  (props: { setImplementation: SetImplementation; isReadOnly: boolean }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.tabManagerState.getCurrentEditorState(MappingEditorState);
    const _class = setImplementation.class;
    // ID
    const isDefaultId =
      fromElementPathToMappingElementId(_class.value.path) ===
      setImplementation.id.value;
    const showId =
      Object.keys(mappingEditorState.mappingElementsWithSimilarTarget).length >
      1;
    // Root
    const rootHasNotBeenSet =
      mappingEditorState.mappingElementsWithSimilarTarget.length === 1 &&
      setImplementation.root.value === false;
    // Source
    // TODO: Turn this into a packageable element
    let sourceType = '';
    let sourceName: string | undefined;

    if (setImplementation instanceof PureInstanceSetImplementation) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.CLASS;
      sourceName = setImplementation.srcClass?.value.name;
    } else if (setImplementation instanceof FlatDataInstanceSetImplementation) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.FLAT_DATA;
      sourceName = setImplementation.sourceRootRecordType.value._OWNER.name;
    } else if (setImplementation instanceof EmbeddedFlatDataPropertyMapping) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.FLAT_DATA;
      sourceName = (
        setImplementation.rootInstanceSetImplementation as FlatDataInstanceSetImplementation
      ).sourceRootRecordType.value._OWNER.name;
    } else if (
      setImplementation instanceof RootRelationalInstanceSetImplementation
    ) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.RELATIONAL;
      sourceName = setImplementation.mainTableAlias?.relation.value.name;
    } else if (
      setImplementation instanceof RelationFunctionInstanceSetImplementation
    ) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.RELATION_FUNCTION;
      sourceName = setImplementation.relationFunction?.name;
    } else if (setImplementation instanceof OperationSetImplementation) {
      sourceType = CLASS_MAPPING_SOURCE_TYPE.OPERATION;
    } else {
      const extraMappingSourceTypeInfoGetters = editorStore.pluginManager
        .getApplicationPlugins()
        .flatMap(
          (plugin) =>
            (
              plugin as DSL_Mapping_LegendStudioApplicationPlugin_Extension
            ).getExtraMappingSourceTypeInfoGetters?.() ?? [],
        );
      for (const sourceTypeInfoGetter of extraMappingSourceTypeInfoGetters) {
        const mappingSourceTypeInfo = sourceTypeInfoGetter(setImplementation);
        if (mappingSourceTypeInfo) {
          sourceType = mappingSourceTypeInfo.sourceType;
          sourceName = mappingSourceTypeInfo.sourceName;
          break;
        }
      }
    }

    const toggleRoot = (): void => {
      if (!isReadOnly) {
        const isRoot = setImplementation.root.value;
        setImplementation_setRoot(setImplementation, !isRoot);
        if (setImplementation.root.value) {
          setImpl_nominateRoot(setImplementation);
        }
      }
    };

    return (
      <div className="mapping-element-editor class-mapping-editor">
        <div className="mapping-element-editor__metadata">
          {/* Target */}
          <div className="mapping-element-editor__metadata__chunk mapping-element-editor__metadata__overview-chunk background--class">
            <div className="mapping-element-editor__metadata__sub-chunk">
              class mapping
            </div>
            {showId && (
              <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__overview__id">
                {isDefaultId ? 'default ID' : setImplementation.id.value}
              </div>
            )}
            <div className="mapping-element-editor__metadata__sub-chunk">
              for
            </div>
            <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__target">
              <div className="mapping-element-editor__metadata__target__type icon">
                <PURE_ClassIcon />
              </div>
              <div className="mapping-element-editor__metadata__target__label">
                {_class.value.name}
              </div>
            </div>
          </div>
          {/* Instance Set Implementation Source */}
          {!(
            setImplementation instanceof OperationSetImplementation ||
            setImplementation instanceof INTERNAL__UnknownSetImplementation
          ) && (
            <div
              className={clsx(
                'mapping-element-editor__metadata__chunk',
                'mapping-element-editor__metadata__source-chunk',
                {
                  'mapping-element-editor__metadata__source-chunk--none':
                    !sourceName,
                },
              )}
            >
              <div className="mapping-element-editor__metadata__sub-chunk">
                {`with ${
                  sourceName
                    ? `source ${sourceType.toLowerCase()}`
                    : `no source`
                }`}
              </div>
              {sourceName && (
                <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__source">
                  <div className="mapping-element-editor__metadata__source__type icon">
                    {getElementTypeIcon(sourceType, editorStore)}
                  </div>
                  <div className="mapping-element-editor__metadata__source__label">
                    {sourceName}
                  </div>
                </div>
              )}
            </div>
          )}
          {/* Operation Set Implementation Operator */}
          {setImplementation instanceof OperationSetImplementation && (
            <div className="mapping-element-editor__metadata__operator-selector">
              <OperatorSelector
                setImplementation={setImplementation}
                isReadOnly={isReadOnly}
              />
            </div>
          )}
          {/* Root */}
          {(showId || rootHasNotBeenSet) && (
            <button
              className={clsx(
                'mapping-element-editor__metadata__chunk',
                'mapping-element-editor__metadata__root-chunk',
                {
                  'mapping-element-editor__metadata__root-chunk--checked':
                    setImplementation.root.value,
                },
              )}
              onClick={toggleRoot}
              disabled={isReadOnly}
              tabIndex={-1}
              title="Toggle set class mapping as root"
            >
              {setImplementation.root.value ? (
                <CheckSquareIcon />
              ) : (
                <EmptySquareIcon />
              )}
              root
            </button>
          )}
        </div>
        {setImplementation instanceof INTERNAL__UnknownSetImplementation && (
          <UnsupportedEditorPanel
            text="Can't display this set implementation in form-mode"
            isReadOnly={isReadOnly}
          />
        )}
        {setImplementation instanceof OperationSetImplementation && (
          <OperationSetImplementationEditor
            setImplementation={setImplementation}
            isReadOnly={isReadOnly}
          />
        )}
        {!(
          setImplementation instanceof OperationSetImplementation ||
          setImplementation instanceof INTERNAL__UnknownSetImplementation
        ) &&
          editorStore.graphManagerState.graphManager.isInstanceSetImplementation(
            setImplementation,
          ) && (
            <InstanceSetImplementationEditor
              setImplementation={setImplementation}
              isReadOnly={isReadOnly}
            />
          )}
      </div>
    );
  },
);
