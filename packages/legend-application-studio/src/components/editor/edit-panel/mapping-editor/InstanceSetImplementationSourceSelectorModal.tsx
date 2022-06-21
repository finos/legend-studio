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
} from '../../../../stores/editor-state/element-editor-state/mapping/MappingEditorState.js';
import {
  type InstanceSetImplementation,
  type View,
  Class,
  Table,
  DEFAULT_DATABASE_SCHEMA_NAME,
  TableAlias,
  TableExplicitReference,
  ViewExplicitReference,
} from '@finos/legend-graph';
import { UnsupportedOperationError } from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { useEditorStore } from '../../EditorStoreProvider.js';
import {
  useApplicationStore,
  buildElementOption,
} from '@finos/legend-application';

export const getMappingElementSourceFilterText = (
  option: MappingElementSourceSelectOption,
  plugins: LegendStudioPlugin[],
): string => {
  const val = option.value;
  if (val instanceof Class) {
    return val.path;
  } else if (val instanceof TableAlias) {
    return `${val.relation.ownerReference.value.path}.${val.relation.value.schema.name}.${val.relation.value.name}`;
  }
  const extraMappingElementSourceFilterTextGetters = plugins.flatMap(
    (plugin) =>
      (
        plugin as DSLMapping_LegendStudioPlugin_Extension
      ).getExtraMappingElementSourceFilterTextGetters?.() ?? [],
  );
  for (const getter of extraMappingElementSourceFilterTextGetters) {
    const filterText = getter(option);
    if (filterText) {
      return filterText;
    }
  }
  throw new UnsupportedOperationError();
};

export interface MappingElementSourceSelectOption {
  label: string;
  value: unknown;
}

export const getSourceElementLabel = (
  srcElement: unknown | undefined,
  plugins: LegendStudioPlugin[],
): string => {
  let sourceLabel = '(none)';
  if (srcElement instanceof Class) {
    sourceLabel = srcElement.name;
  } else if (srcElement instanceof TableAlias) {
    sourceLabel = `${srcElement.relation.ownerReference.value.name}.${
      srcElement.relation.value.schema.name === DEFAULT_DATABASE_SCHEMA_NAME
        ? ''
        : `${srcElement.relation.value.schema.name}.`
    }${srcElement.relation.value.name}`;
  }
  if (srcElement) {
    const extraSourceElementLabelerGetters = plugins.flatMap(
      (plugin) =>
        (
          plugin as DSLMapping_LegendStudioPlugin_Extension
        ).getExtraSourceElementLabelerGetters?.() ?? [],
    );
    for (const getter of extraSourceElementLabelerGetters) {
      const label = getter(srcElement);
      if (label) {
        sourceLabel = label;
      }
    }
  }
  return sourceLabel;
};

// TODO: add more visual cue to the type of source (class vs. flat-data vs. db)
export const buildMappingElementSourceOption = (
  source: MappingElementSource | undefined,
  plugins: LegendStudioPlugin[],
): MappingElementSourceSelectOption | null => {
  if (source instanceof Class) {
    return buildElementOption(source) as MappingElementSourceSelectOption;
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
  if (source) {
    const extraMappingElementSourceOptionBuilders = plugins.flatMap(
      (plugin) =>
        (
          plugin as DSLMapping_LegendStudioPlugin_Extension
        ).getExtraMappingElementSourceOptionBuilders?.() ?? [],
    );
    for (const builder of extraMappingElementSourceOptionBuilders) {
      const option = builder(source);
      if (option) {
        return option;
      }
    }
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
    let extraOptions: unknown[] = [];
    const extraSourceOptionGetters = editorStore.pluginManager
      .getStudioPlugins()
      .flatMap(
        (plugin) =>
          (
            plugin as DSLMapping_LegendStudioPlugin_Extension
          ).getExtraSourceOptionGetters?.() ?? [],
      );
    for (const getter of extraSourceOptionGetters) {
      const sources = getter(editorStore);
      extraOptions = extraOptions.concat(sources);
    }
    const options = (
      editorStore.graphManagerState.graph.ownClasses as MappingElementSource[]
    )
      .concat(
        editorStore.graphManagerState.graph.dependencyManager
          .classes as MappingElementSource[],
      )
      .concat(
        editorStore.graphManagerState.graph.ownDatabases
          .concat(
            editorStore.graphManagerState.graph.dependencyManager.databases,
          )
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
      .concat(extraOptions)
      .map((option) =>
        buildMappingElementSourceOption(
          option,
          editorStore.pluginManager.getStudioPlugins(),
        ),
      );
    const filterOption = createFilter({
      ignoreCase: true,
      ignoreAccents: false,
      stringify: (option) =>
        getMappingElementSourceFilterText(
          option,
          editorStore.pluginManager.getStudioPlugins(),
        ),
    });
    const sourceSelectorRef = useRef<SelectComponent>(null);
    const selectedSourceType = buildMappingElementSourceOption(
      sourceElementToSelect ??
        getMappingElementSource(
          setImplementation,
          editorStore.pluginManager.getApplicationPlugins(),
        ),
      editorStore.pluginManager.getStudioPlugins(),
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
            filterOption={filterOption}
          />
        </div>
      </Dialog>
    );
  },
);
