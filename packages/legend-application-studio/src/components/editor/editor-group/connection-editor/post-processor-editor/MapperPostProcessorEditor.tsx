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
  PlusIcon,
  ResizablePanelSplitter,
  PanelFormTextField,
  PanelForm,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  ControlledDropdownMenu,
  PanelListSelectorItem,
  BlankPanelContent,
  ResizablePanelSplitterLine,
  Panel,
  PanelHeader,
  PanelContent,
  PanelListSelectorItemLabel,
  PanelHeaderActions,
} from '@finos/legend-art';
import {
  type Mapper,
  MapperPostProcessor,
  TableNameMapper,
  SchemaNameMapper,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { MapperPostProcessorEditorState } from '../../../../../stores/editor/editor-state/element-editor-state/connection/PostProcessorEditorState.js';
import {
  mapperPostProcessor_addMapper,
  mapperPostProcessor_deleteMapper,
  mapper_setFrom,
  mapper_setTo,
  schemaNameMapper_setFrom,
  schemaNameMapper_setTo,
} from '../../../../../stores/graph-modifier/STO_Relational_GraphModifierHelper.js';

export const MapperPostProcessorEditor = observer(
  (props: {
    postProcessor: MapperPostProcessor;
    isReadOnly: boolean;
    postProcessorState: MapperPostProcessorEditorState;
  }) => {
    const { postProcessorState, isReadOnly, postProcessor } = props;
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
      postProcessorState.setSelectedMapper(postProcessor.mappers.at(-1));
    };

    const addTableMapper = (): void => {
      mapperPostProcessor_addMapper(
        postProcessor,
        new TableNameMapper('', '', new SchemaNameMapper('', '')),
      );
      postProcessorState.setSelectedMapper(postProcessor.mappers.at(-1));
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

    const mappers = postProcessor.mappers;

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
              <Panel>
                <PanelHeader title="mapper">
                  <PanelHeaderActions>
                    <ControlledDropdownMenu
                      title="Create mapper"
                      className="panel__header__action"
                      disabled={isReadOnly}
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
                        anchorOrigin: {
                          vertical: 'bottom',
                          horizontal: 'right',
                        },
                        transformOrigin: {
                          vertical: 'top',
                          horizontal: 'right',
                        },
                        elevation: 7,
                      }}
                    >
                      <PlusIcon />
                    </ControlledDropdownMenu>
                  </PanelHeaderActions>
                </PanelHeader>
                <PanelContent>
                  {mappers.map((mapper) => (
                    <ContextMenu
                      key={mapper._UUID}
                      disabled={isReadOnly}
                      content={
                        <MenuContent>
                          <MenuContentItem
                            disabled={isReadOnly}
                            onClick={deleteMapper(mapper)}
                          >
                            Delete
                          </MenuContentItem>
                        </MenuContent>
                      }
                      menuProps={{ elevation: 7 }}
                    >
                      <PanelListSelectorItem
                        validationError={isMapperDuplicated(mapper)}
                        isSelected={
                          mapper === postProcessorState.selectedMapper
                        }
                        onSelect={() => selectMapper(mapper)}
                      >
                        <PanelListSelectorItemLabel
                          title={
                            mapper instanceof TableNameMapper
                              ? 'Table Mapper'
                              : 'Schema Mapper'
                          }
                          errorMessage={
                            isMapperDuplicated(mapper)
                              ? 'Mappers have the same values'
                              : undefined
                          }
                        />
                      </PanelListSelectorItem>
                    </ContextMenu>
                  ))}
                </PanelContent>
              </Panel>
            </ResizablePanel>
            <ResizablePanelSplitter>
              <ResizablePanelSplitterLine color="var(--color-dark-grey-200)" />
            </ResizablePanelSplitter>
            <ResizablePanel>
              <Panel>
                <PanelHeader
                  title={
                    postProcessorState.selectedMapper instanceof TableNameMapper
                      ? 'Table Mapper'
                      : 'Schema Mapper'
                  }
                ></PanelHeader>
                <PanelContent>
                  {!selectedMapper && (
                    <BlankPanelContent>
                      {!mappers.length
                        ? 'Add a mapper'
                        : 'Choose a mapper to view'}
                    </BlankPanelContent>
                  )}
                  {selectedMapper && (
                    <PanelForm>
                      <PanelFormTextField
                        isReadOnly={isReadOnly}
                        value={selectedMapper.from}
                        name="From"
                        update={(value: string | undefined): void =>
                          mapper_setFrom(selectedMapper, value ?? '')
                        }
                      />
                      <PanelFormTextField
                        isReadOnly={isReadOnly}
                        value={selectedMapper.to}
                        name="To"
                        update={(value: string | undefined): void =>
                          mapper_setTo(selectedMapper, value ?? '')
                        }
                      />
                      {selectedSchemaNameMapper && (
                        <>
                          <PanelFormTextField
                            isReadOnly={isReadOnly}
                            value={selectedSchemaNameMapper.from}
                            name="Schema - From"
                            update={(value: string | undefined): void => {
                              schemaNameMapper_setFrom(
                                selectedSchemaNameMapper,
                                value ?? '',
                              );
                            }}
                          />
                          <PanelFormTextField
                            isReadOnly={isReadOnly}
                            value={selectedSchemaNameMapper.to}
                            name="Schema - To"
                            update={(value: string | undefined): void =>
                              schemaNameMapper_setTo(
                                selectedSchemaNameMapper,
                                value ?? '',
                              )
                            }
                          />
                        </>
                      )}
                    </PanelForm>
                  )}
                </PanelContent>
              </Panel>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
