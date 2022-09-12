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
  ResizablePanelGroup,
  ResizablePanel,
  PanelHeaderActionItem,
  PlusIcon,
  ResizablePanelSplitter,
  PanelTextEditor,
  PanelForm,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  DropdownMenu,
  PanelListSelectorItem,
  BlankPanelContent,
  ResizablePanelSplitterLine,
  Panel,
} from '@finos/legend-art';
import {
  type Mapper,
  type PostProcessor,
  MapperPostProcessor,
  TableNameMapper,
  SchemaNameMapper,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { MapperPostProcessorEditorState } from '../../../../../stores/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
import {
  mapperPostProcessor_addMapper,
  mapperPostProcessor_deleteMapper,
  mapperPostProcessor_mapper_setFrom,
  mapperPostProcessor_mapper_setTo,
  mapperPostProcessor_schemaNameMapper_setFrom,
  mapperPostProcessor_schemaNameMapper_setTo,
} from '../../../../../stores/graphModifier/StoreRelational_GraphModifierHelper.js';

export const MapperPostProcessorEditor = observer(
  (props: {
    postProcessor: PostProcessor;
    postProcessorState: MapperPostProcessorEditorState;
  }) => {
    const { postProcessorState, postProcessor } = props;

    const selectedMapper = postProcessorState.selectedMapper;

    const selectedSchemaNameMapper =
      selectedMapper instanceof TableNameMapper
        ? selectedMapper.schema
        : undefined;

    const selectMapper = (val: Mapper): void => {
      postProcessorState.setSelectedMapper(val);
    };

    const addSchemaMapper = (): void => {
      mapperPostProcessor_addMapper(
        postProcessor,
        new SchemaNameMapper('', ''),
      );
      postProcessorState.setSelectedMapper(
        (postProcessor as MapperPostProcessor).mappers.at(-1),
      );
    };

    const addTableMapper = (): void => {
      mapperPostProcessor_addMapper(
        postProcessor,
        new TableNameMapper('', '', new SchemaNameMapper('', '')),
      );
      postProcessorState.setSelectedMapper(
        (postProcessor as MapperPostProcessor).mappers.at(-1),
      );
    };

    const deleteMapper =
      (mapper: Mapper): (() => void) =>
      (): void => {
        if (postProcessorState.postProcessor instanceof MapperPostProcessor) {
          mapperPostProcessor_deleteMapper(
            postProcessorState.postProcessor,
            mapper,
          );
        }

        if (mapper === postProcessorState.selectedMapper) {
          postProcessorState.setSelectedMapper(undefined);
        }
      };

    const mappers = (postProcessor as MapperPostProcessor).mappers;

    const isSchemaMapperDuplicated = (val: Mapper): boolean =>
      mappers.filter(
        (mapper) =>
          mapper.from === val.from &&
          mapper.to === val.to &&
          val instanceof SchemaNameMapper &&
          mapper instanceof SchemaNameMapper,
      ).length >= 2;

    const isTableMapperDuplicated = (val: Mapper): boolean =>
      mappers
        .filter(
          (mapper) =>
            val instanceof TableNameMapper && mapper instanceof TableNameMapper,
        )
        .filter(
          (mapper) =>
            (mapper as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (mapper as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (mapper as TableNameMapper).from ===
              (val as TableNameMapper).from &&
            (mapper as TableNameMapper).from === (val as TableNameMapper).from,
        ).length >= 2;

    const isMapperDuplicated = (val: Mapper): boolean =>
      isSchemaMapperDuplicated(val) || isTableMapperDuplicated(val);

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={170} minSize={70}>
              <Panel
                headerTitle="mapper"
                headerContent={
                  <DropdownMenu
                    content={
                      <MenuContent>
                        <MenuContentItem onClick={addSchemaMapper}>
                          New Schema Mapper
                        </MenuContentItem>
                        <MenuContentItem onClick={addTableMapper}>
                          New Table Mapper
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{
                      anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                      transformOrigin: { vertical: 'top', horizontal: 'right' },
                      elevation: 7,
                    }}
                  >
                    <PanelHeaderActionItem tip="Create Mapper">
                      <PlusIcon />
                    </PanelHeaderActionItem>
                  </DropdownMenu>
                }
              >
                {mappers.map((mapper) => (
                  <ContextMenu
                    key={mapper._UUID}
                    disabled={false}
                    content={
                      <MenuContent>
                        <MenuContentItem onClick={deleteMapper(mapper)}>
                          Delete
                        </MenuContentItem>
                      </MenuContent>
                    }
                    menuProps={{ elevation: 7 }}
                  >
                    <PanelListSelectorItem
                      title={
                        mapper instanceof TableNameMapper
                          ? 'Table Mapper'
                          : 'Schema Mapper'
                      }
                      validationErrorMessage={
                        isMapperDuplicated(mapper)
                          ? 'Mappers have the same values'
                          : undefined
                      }
                      isSelected={mapper === postProcessorState.selectedMapper}
                      onSelect={() => selectMapper(mapper)}
                    />
                  </ContextMenu>
                ))}
              </Panel>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <Panel
                headerTitle={
                  postProcessorState.selectedMapper instanceof TableNameMapper
                    ? 'Table Mapper'
                    : 'Schema Mapper'
                }
              >
                {!selectedMapper && (
                  <BlankPanelContent>
                    {!mappers.length
                      ? 'Add a mapper to view properties'
                      : 'Select a mapper to view properties'}
                  </BlankPanelContent>
                )}
                {selectedMapper && (
                  <PanelForm>
                    <PanelTextEditor
                      isReadOnly={false}
                      value={selectedMapper.from}
                      name="From"
                      update={(value: string | undefined): void =>
                        mapperPostProcessor_mapper_setFrom(
                          selectedMapper,
                          value ?? '',
                        )
                      }
                    />
                    <PanelTextEditor
                      isReadOnly={false}
                      value={selectedMapper.to}
                      name="To"
                      update={(value: string | undefined): void =>
                        mapperPostProcessor_mapper_setTo(
                          selectedMapper,
                          value ?? '',
                        )
                      }
                    />
                    {selectedSchemaNameMapper && (
                      <>
                        <PanelTextEditor
                          isReadOnly={false}
                          value={selectedSchemaNameMapper.from}
                          name="Schema - From"
                          update={(value: string | undefined): void => {
                            mapperPostProcessor_schemaNameMapper_setFrom(
                              selectedSchemaNameMapper,
                              value ?? '',
                            );
                          }}
                        />
                        <PanelTextEditor
                          isReadOnly={false}
                          value={selectedSchemaNameMapper.to}
                          name="Schema - To"
                          update={(value: string | undefined): void =>
                            mapperPostProcessor_schemaNameMapper_setTo(
                              selectedSchemaNameMapper,
                              value ?? '',
                            )
                          }
                        />
                      </>
                    )}
                  </PanelForm>
                )}
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
