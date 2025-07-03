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

import { useRef } from 'react';
import { observer } from 'mobx-react-lite';
import {
  Dialog,
  type SelectComponent,
  CustomSelectorInput,
  createFilter,
  Modal,
  ModalTitle,
} from '@finos/legend-art';
import {
  getMappingElementSource,
  type MappingElementSource,
  type MappingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  type InstanceSetImplementation,
  type View,
  type Database,
  Class,
  RootFlatDataRecordType,
  Table,
  DEFAULT_DATABASE_SCHEMA_NAME,
  TableAlias,
  TableExplicitReference,
  ViewExplicitReference,
  getAllRecordTypes,
  PackageableElement,
  FlatData,
  ConcreteFunctionDefinition,
  CORE_PURE_PATH,
} from '@finos/legend-graph';
import { isNonNullable, UnsupportedOperationError } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import { useApplicationStore } from '@finos/legend-application';
import {
  buildElementOption,
  getPackageableElementOptionFormatter,
} from '@finos/legend-lego/graph-editor';

export const getMappingElementSourceFilterText = (
  option: MappingElementSourceSelectOption,
): string => {
  const val = option.value;
  if (val instanceof Class) {
    return val.path;
  } else if (val instanceof RootFlatDataRecordType) {
    return val._OWNER.name;
  } else if (val instanceof TableAlias) {
    return `${val.relation.ownerReference.value.path}.${val.relation.value.schema.name}.${val.relation.value.name}`;
  } else if (val instanceof ConcreteFunctionDefinition) {
    return `${val.functionName}`;
  }
  throw new UnsupportedOperationError();
};

export interface MappingElementSourceSelectOption {
  label: string;
  value: unknown;
}

export const getSourceElementLabel = (srcElement: unknown): string => {
  let sourceLabel = '(none)';
  if (srcElement instanceof Class) {
    sourceLabel = srcElement.name;
  } else if (srcElement instanceof RootFlatDataRecordType) {
    sourceLabel = srcElement._OWNER.name;
  } else if (srcElement instanceof TableAlias) {
    sourceLabel = `${srcElement.relation.ownerReference.value.name}.${
      srcElement.relation.value.schema.name === DEFAULT_DATABASE_SCHEMA_NAME
        ? ''
        : `${srcElement.relation.value.schema.name}.`
    }${srcElement.relation.value.name}`;
  } else if (srcElement instanceof ConcreteFunctionDefinition) {
    sourceLabel = srcElement.name;
  }
  return sourceLabel;
};

// TODO: add more visual cue to the type of source (class vs. flat-data vs. db)
export const buildMappingElementSourceOption = (
  source: MappingElementSource,
): MappingElementSourceSelectOption | null => {
  if (source instanceof Class) {
    return buildElementOption(source) as MappingElementSourceSelectOption;
  } else if (source instanceof RootFlatDataRecordType) {
    return {
      label: `${source._OWNER._OWNER.name}.${source._OWNER.name}`,
      value: source,
    };
  } else if (source instanceof TableAlias) {
    return {
      label: `${source.relation.ownerReference.value.name}.${
        source.relation.value.schema.name === DEFAULT_DATABASE_SCHEMA_NAME
          ? ''
          : `${source.relation.value.schema.name}.`
      }${source.relation.value.name}`,
      value: source,
    };
  } else if (source instanceof ConcreteFunctionDefinition) {
    return {
      label: `${source.functionName}`,
      value: source,
    };
  }
  return null;
};

export const InstanceSetImplementationSourceSelectorModal = observer(
  (props: {
    mappingEditorState: MappingEditorState;
    setImplementation: InstanceSetImplementation;
    /**
     * Pass in `null` when we want to open the modal using the existing source.
     * Pass any other to open the source modal using that value as the initial state of the modal.
     */
    sourceElementToSelect: MappingElementSource;
    closeModal: () => void;
    /**
     *  use sourceElementToFilter to compose source element options dropdown
     */
    sourceElementToFilter?: PackageableElement | undefined;
  }) => {
    const {
      mappingEditorState,
      setImplementation,
      closeModal,
      sourceElementToSelect,
      sourceElementToFilter,
    } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const options = (
      sourceElementToFilter === undefined
        ? (
            editorStore.graphManagerState
              .usableClasses as MappingElementSource[]
          )
            .concat(
              editorStore.graphManagerState.graph.ownFlatDatas.flatMap(
                getAllRecordTypes,
              ),
            )
            .concat(
              editorStore.graphManagerState.usableFunctions.filter(
                (def) =>
                  def.returnType.value.rawType.path === CORE_PURE_PATH.RELATION,
              ),
            )
            .concat(
              editorStore.graphManagerState.usableDatabases
                .flatMap((e) =>
                  e.schemas.flatMap((schema) =>
                    (schema.tables as (Table | View)[]).concat(schema.views),
                  ),
                )
                .map((relation) => {
                  const mainTableAlias = new TableAlias();
                  mainTableAlias.relation =
                    relation instanceof Table
                      ? TableExplicitReference.create(relation)
                      : ViewExplicitReference.create(relation);
                  mainTableAlias.name = mainTableAlias.relation.value.name;
                  return mainTableAlias;
                }),
            )
        : sourceElementToFilter instanceof Class
          ? ([sourceElementToFilter] as MappingElementSource[])
          : sourceElementToFilter instanceof FlatData
            ? [sourceElementToFilter].flatMap(getAllRecordTypes)
            : [sourceElementToFilter as Database]
                .flatMap((e) =>
                  e.schemas.flatMap((schema) =>
                    (schema.tables as (Table | View)[]).concat(schema.views),
                  ),
                )
                .map((relation) => {
                  const mainTableAlias = new TableAlias();
                  mainTableAlias.relation =
                    relation instanceof Table
                      ? TableExplicitReference.create(relation)
                      : ViewExplicitReference.create(relation);
                  mainTableAlias.name = mainTableAlias.relation.value.name;
                  return mainTableAlias;
                })
    )
      .map(buildMappingElementSourceOption)
      .filter(isNonNullable);
    const sourceFilterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: getMappingElementSourceFilterText,
    });
    const formatSourceOptionLabel = (
      option: MappingElementSourceSelectOption,
    ): React.ReactNode => {
      if (option.value instanceof PackageableElement) {
        return getPackageableElementOptionFormatter({})(
          buildElementOption(option.value),
        );
      }
      return <div className="mapping-source-option-label">{option.label}</div>;
    };
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const selectedSourceType = buildMappingElementSourceOption(
      sourceElementToSelect ??
        getMappingElementSource(
          setImplementation,
          editorStore.pluginManager.getApplicationPlugins(),
        ),
    );
    const changeSourceType = (val: MappingElementSourceSelectOption | null) => {
      flowResult(
        mappingEditorState.changeClassMappingSourceDriver(
          setImplementation,
          val?.value,
        ),
      )
        .then(() => closeModal())
        .catch(applicationStore.alertUnhandledError);
    };
    const handleEnter = (): void => sourceSelectorRef.current?.focus();

    return (
      <Dialog
        open={true}
        onClose={closeModal}
        TransitionProps={{
          onEnter: handleEnter,
        }}
        classes={{
          container: 'search-modal__container',
        }}
        PaperProps={{
          classes: {
            root: 'search-modal__inner-container',
          },
        }}
      >
        <Modal
          className="modal search-modal"
          darkMode={
            !applicationStore.layoutService.TEMPORARY__isLightColorThemeEnabled
          }
        >
          <ModalTitle title="Choose a Source" />
          <CustomSelectorInput
            inputRef={sourceSelectorRef}
            options={options}
            onChange={changeSourceType}
            value={selectedSourceType}
            placeholder="Choose a source..."
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            isClearable={true}
            filterOption={sourceFilterOption}
            formatOptionLabel={formatSourceOptionLabel}
          />
        </Modal>
      </Dialog>
    );
  },
);
