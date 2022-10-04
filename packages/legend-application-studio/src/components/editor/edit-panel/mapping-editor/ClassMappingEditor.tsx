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
import { getElementTypeIcon } from '../../../shared/ElementIconUtils.js';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  type SetImplementation,
  type PureInstanceSetImplementation,
  type FlatDataInstanceSetImplementation,
  type EmbeddedFlatDataPropertyMapping,
  type RootRelationalInstanceSetImplementation,
  fromElementPathToMappingElementId,
  OperationSetImplementation,
  OperationType,
} from '@finos/legend-graph';
import {
  setImpl_nominateRoot,
  operationMapping_setOperation,
  operationMapping_setParameters,
  setImpl_setRoot,
} from '../../../../stores/graphModifier/DSL_Mapping_GraphModifierHelper.js';
import { SET_IMPLEMENTATION_TYPE } from '../../../../stores/shared/ModelClassifierUtils.js';
import type { DSL_Mapping_LegendStudioApplicationPlugin_Extension } from '../../../../stores/DSL_Mapping_LegendStudioApplicationPlugin_Extension.js';

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
}

export const ClassMappingEditor = observer(
  (props: { setImplementation: SetImplementation; isReadOnly: boolean }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const setImplementationType =
      editorStore.graphState.getSetImplementationType(setImplementation);
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

    switch (setImplementationType) {
      case SET_IMPLEMENTATION_TYPE.PUREINSTANCE: {
        sourceType = CLASS_MAPPING_SOURCE_TYPE.CLASS;
        sourceName = (setImplementation as PureInstanceSetImplementation)
          .srcClass?.value.name;
        break;
      }
      case SET_IMPLEMENTATION_TYPE.FLAT_DATA: {
        sourceType = CLASS_MAPPING_SOURCE_TYPE.FLAT_DATA;
        sourceName = (setImplementation as FlatDataInstanceSetImplementation)
          .sourceRootRecordType.value._OWNER.name;
        break;
      }
      case SET_IMPLEMENTATION_TYPE.EMBEDDED_FLAT_DATA: {
        sourceType = CLASS_MAPPING_SOURCE_TYPE.FLAT_DATA;
        const flatDataInstanceSetImpl =
          setImplementation as EmbeddedFlatDataPropertyMapping;
        sourceName = (
          flatDataInstanceSetImpl.rootInstanceSetImplementation as FlatDataInstanceSetImplementation
        ).sourceRootRecordType.value._OWNER.name;
        break;
      }
      case SET_IMPLEMENTATION_TYPE.RELATIONAL: {
        sourceType = CLASS_MAPPING_SOURCE_TYPE.RELATIONAL;
        sourceName = (
          setImplementation as RootRelationalInstanceSetImplementation
        ).mainTableAlias?.relation.value.name;
        break;
      }
      case SET_IMPLEMENTATION_TYPE.OPERATION:
        sourceType = CLASS_MAPPING_SOURCE_TYPE.OPERATION;
        break;
      default: {
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
          }
        }
        break;
      }
    }

    const toggleRoot = (): void => {
      if (!isReadOnly) {
        const isRoot = setImplementation.root.value;
        setImpl_setRoot(setImplementation, !isRoot);
        if (setImplementation.root.value) {
          setImpl_nominateRoot(setImplementation);
        }
      }
    };

    return (
      <div className="editor__main">
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
            {/* Driver */}
            <div
              className={clsx(
                'mapping-element-editor__metadata__chunk',
                'mapping-element-editor__metadata__driver-chunk',
                `mapping-element-editor__metadata__driver--${setImplementationType.toLowerCase()}`,
                {
                  'mapping-element-editor__metadata__source--none': !sourceName,
                },
              )}
            >
              <div className="mapping-element-editor__metadata__sub-chunk">
                using
              </div>
              <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__driver__type">
                {setImplementationType.toUpperCase()}
              </div>
            </div>
            {/* Instance Set Implementation Source */}
            {setImplementationType !== SET_IMPLEMENTATION_TYPE.OPERATION && (
              <div
                className={clsx(
                  'mapping-element-editor__metadata__chunk',
                  'mapping-element-editor__metadata__source-chunk',
                  `background--${setImplementationType.toLowerCase()}`,
                  {
                    'mapping-element-editor__metadata__source-chunk--none':
                      !sourceName,
                  },
                )}
              >
                <div className="mapping-element-editor__metadata__sub-chunk">
                  with{' '}
                  {sourceName
                    ? `source ${sourceType.toLowerCase()}`
                    : `no source`}
                </div>
                {sourceName && (
                  <div className="mapping-element-editor__metadata__sub-chunk mapping-element-editor__metadata__source">
                    <div className="mapping-element-editor__metadata__source__type icon">
                      {getElementTypeIcon(editorStore, sourceType)}
                    </div>
                    <div className="mapping-element-editor__metadata__source__label">
                      {sourceName}
                    </div>
                  </div>
                )}
              </div>
            )}
            {/* Operation Set Implementation Operator */}
            {setImplementationType === SET_IMPLEMENTATION_TYPE.OPERATION && (
              <div className="mapping-element-editor__metadata__operator-selector">
                <OperatorSelector
                  setImplementation={
                    setImplementation as OperationSetImplementation
                  }
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
          {setImplementation instanceof OperationSetImplementation && (
            <OperationSetImplementationEditor
              setImplementation={setImplementation}
              isReadOnly={isReadOnly}
            />
          )}
          {editorStore.graphManagerState.isInstanceSetImplementation(
            setImplementation,
          ) && (
            <InstanceSetImplementationEditor
              setImplementation={setImplementation}
              isReadOnly={isReadOnly}
            />
          )}
        </div>
      </div>
    );
  },
);
