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
} from '@finos/legend-art';
import {
  getMappingElementSource,
  type MappingElementSource,
  type MappingEditorState,
} from '../../../../stores/editor/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  type InstanceSetImplementation,
  type View,
  Class,
  RootFlatDataRecordType,
  Table,
  DEFAULT_DATABASE_SCHEMA_NAME,
  TableAlias,
  TableExplicitReference,
  ViewExplicitReference,
  getAllRecordTypes,
  PackageableElement,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
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
  }
  throw new UnsupportedOperationError();
};

export interface MappingElementSourceSelectOption {
  label: string;
  value: unknown;
}

export const getSourceElementLabel = (
  srcElement: unknown | undefined,
): string => {
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
  }
  return sourceLabel;
};

// TODO: add more visual cue to the type of source (class vs. flat-data vs. db)
export const buildMappingElementSourceOption = (
  source: MappingElementSource | undefined,
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
    sourceElementToSelect: MappingElementSource | null;
    closeModal: () => void;
  }) => {
    const {
      mappingEditorState,
      setImplementation,
      closeModal,
      sourceElementToSelect,
    } = props;
    const editorStore = useEditorStore();
    const applicationStore = useApplicationStore();
    const options = (
      editorStore.graphManagerState.usableClasses as MappingElementSource[]
    )
      .concat(
        editorStore.graphManagerState.graph.ownFlatDatas.flatMap(
          getAllRecordTypes,
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
      .map(buildMappingElementSourceOption);
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
    const changeSourceType = (
      val: MappingElementSourceSelectOption | null,
    ): Promise<void> =>
      flowResult(
        mappingEditorState.changeClassMappingSourceDriver(
          setImplementation,
          val?.value,
        ),
      )
        .then(() => closeModal())
        .catch(applicationStore.alertUnhandledError);
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
        <div className="modal search-modal">
          <div className="modal__title">Choose a Source</div>
          <CustomSelectorInput
            ref={sourceSelectorRef}
            options={options}
            onChange={changeSourceType}
            value={selectedSourceType}
            placeholder={`Select a source...`}
            isClearable={true}
            filterOption={sourceFilterOption}
            formatOptionLabel={formatSourceOptionLabel}
          />
        </div>
      </Dialog>
    );
  },
);
