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

import { useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { FaTimes, FaArrowAltCircleRight, FaPlus } from 'react-icons/fa';
import { MappingEditorState } from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState';
import { clsx, CustomSelectorInput, createFilter } from '@finos/legend-art';
import type {
  OperationSetImplementationDropTarget,
  MappingElementDragSource,
} from '../../../../stores/shared/DnDUtil';
import { CORE_DND_TYPE } from '../../../../stores/shared/DnDUtil';
import { useDrop } from 'react-dnd';
import { noop } from '@finos/legend-shared';
import {
  MappingElementDecorator,
  MappingElementDecorationCleaner,
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingElementDecorator';
import {
  Mapping,
  OperationSetImplementation,
  OperationType,
  SetImplementation,
  Class,
  SetImplementationContainer,
  InferableMappingElementIdExplicitValue,
  PackageableElementExplicitReference,
  SetImplementationExplicitReference,
  InferableMappingElementRootExplicitValue,
  getClassMappingsByClass,
} from '@finos/legend-graph';
import { useEditorStore } from '../../EditorStoreProvider';

interface SetImplementationOption {
  value: SetImplementation;
  label: string;
}

export const OperationSetImplementationEditor = observer(
  (props: {
    setImplementation: OperationSetImplementation;
    isReadOnly: boolean;
  }) => {
    const { setImplementation, isReadOnly } = props;
    const editorStore = useEditorStore();
    const mappingEditorState =
      editorStore.getCurrentEditorState(MappingEditorState);
    const mapping = mappingEditorState.mapping;
    // Parameters
    const setImplementationOptions = getClassMappingsByClass(
      mapping,
      setImplementation.class.value,
    )
      .filter((si) => si.id.value !== setImplementation.id.value)
      .map((si) => ({ value: si, label: si.id.value }));
    const filterOption = createFilter({
      stringify: (option: SetImplementationOption): string => option.label,
    });
    const addParameter = (): void =>
      setImplementation.addParameter(
        new SetImplementationContainer(
          SetImplementationExplicitReference.create(
            new OperationSetImplementation(
              InferableMappingElementIdExplicitValue.create('', ''),
              new Mapping(''),
              PackageableElementExplicitReference.create(new Class('')),
              InferableMappingElementRootExplicitValue.create(false),
              OperationType.STORE_UNION,
            ),
          ),
        ),
      );
    const deleteParameter =
      (val: SetImplementationContainer): (() => void) =>
      (): void =>
        setImplementation.deleteParameter(val);
    const changeParamater =
      (
        val: SetImplementationContainer,
      ): ((option: SetImplementationOption | null) => void) =>
      (option: SetImplementationOption | null): void => {
        const setImpl = option?.value;
        if (setImpl) {
          setImplementation.changeParameter(
            val,
            new SetImplementationContainer(
              SetImplementationExplicitReference.create(setImpl),
            ),
          );
        }
      };
    // Drag and Drop
    const handleDrop = useCallback(
      (item: OperationSetImplementationDropTarget): void => {
        const mappingElement = item.data;
        if (
          mappingElement instanceof SetImplementation &&
          setImplementation.operation !== OperationType.INHERITANCE &&
          mappingElement.class.value === setImplementation.class.value &&
          !setImplementation.parameters.find(
            (param) => param.setImplementation.value === mappingElement,
          ) &&
          mappingElement !== setImplementation
        ) {
          setImplementation.addParameter(
            new SetImplementationContainer(
              SetImplementationExplicitReference.create(mappingElement),
            ),
          );
        }
      },
      [setImplementation],
    );
    const [{ isDragOver }, dropRef] = useDrop(
      () => ({
        accept: CORE_DND_TYPE.MAPPING_EXPLORER_CLASS_MAPPING,
        drop: (item: MappingElementDragSource): void => handleDrop(item),
        collect: (monitor): { isDragOver: boolean } => ({
          isDragOver: monitor.isOver({ shallow: true }),
        }),
      }),
      [handleDrop],
    );
    // actions
    const visit =
      (param: SetImplementationContainer): (() => void) =>
      (): void =>
        mappingEditorState.openMappingElement(
          param.setImplementation.value,
          true,
        );

    useEffect(() => {
      if (!isReadOnly) {
        setImplementation.accept_SetImplementationVisitor(
          new MappingElementDecorator(),
        );
      }
      return isReadOnly
        ? noop()
        : (): void =>
            setImplementation.accept_SetImplementationVisitor(
              new MappingElementDecorationCleaner(),
            );
    }, [setImplementation, isReadOnly]);

    return (
      <div className="mapping-element-editor__content">
        <div className="panel">
          <div className="panel__header">
            <div className="panel__header__title">
              <div className="panel__header__title__content">PARAMETERS</div>
            </div>
            <div className="panel__header__actions">
              <button
                className="panel__header__action"
                disabled={
                  isReadOnly ||
                  setImplementation.operation === OperationType.INHERITANCE
                }
                onClick={addParameter}
                tabIndex={-1}
                title={'Add parameter'}
              >
                <FaPlus />
              </button>
            </div>
          </div>
          <div
            ref={dropRef}
            className={clsx('panel__content', {
              'operation-mapping-editor__parameters--dnd-over':
                isDragOver && !isReadOnly,
            })}
          >
            {setImplementation.parameters.map((param) => (
              <div
                key={param.uuid}
                className="operation-mapping-editor__parameter"
              >
                <div className="operation-mapping-editor__parameter__selector">
                  <CustomSelectorInput
                    options={setImplementationOptions}
                    disabled={isReadOnly}
                    onChange={changeParamater(param)}
                    filterOption={filterOption}
                    value={{
                      value: param,
                      label: param.setImplementation.value.id.value,
                    }}
                    placeholder={`Select parameter ID`}
                  />
                </div>
                <button
                  className="operation-mapping-editor__parameter__visit-btn"
                  onClick={visit(param)}
                  tabIndex={-1}
                  title={'Visit mapping element'}
                >
                  <FaArrowAltCircleRight />
                </button>
                {!isReadOnly && (
                  <button
                    className="operation-mapping-editor__parameter__remove-btn"
                    disabled={isReadOnly}
                    onClick={deleteParameter(param)}
                    tabIndex={-1}
                    title={'Remove'}
                  >
                    <FaTimes />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  },
);
