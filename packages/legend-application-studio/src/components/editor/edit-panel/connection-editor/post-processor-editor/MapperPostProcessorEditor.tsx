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
  PanelHeader,
  PanelHeaderActionItem,
  PlusIcon,
  ResizablePanelSplitter,
  BlankPanelPlaceholder,
  PanelTextEditor,
  PanelForm,
  ContextMenu,
  MenuContent,
  MenuContentItem,
  DropdownMenu,
  PanelExplorerItem,
} from '@finos/legend-art';
import {
  type Mapper,
  type PostProcessor,
  type MapperPostProcessor,
  TableNameMapper,
  SchemaNameMapper,
} from '@finos/legend-graph';
import { observer } from 'mobx-react-lite';
import type { RelationalDatabaseConnectionValueState } from '../../../../../stores/editor-state/element-editor-state/connection/ConnectionEditorState.js';
import {
  postProcessor_addMapper,
  postProcessor_deleteMapper,
  postProcessor_setMapperFrom,
  postProcessor_setMapperSchemaFrom,
  postProcessor_setMapperSchemaTo,
  postProcessor_setMapperTo,
} from '../../../../../stores/graphModifier/StoreRelational_GraphModifierHelper.js';

export const MapperPostProcessorEditor = observer(
  (props: {
    postProcessor: PostProcessor;
    connectionValueState: RelationalDatabaseConnectionValueState;
  }) => {
    const { connectionValueState, postProcessor } = props;

    const selectedMapper =
      connectionValueState.selectedPostProcessor?.selectedMapper;

    const selectedSchemaNameMapper =
      selectedMapper instanceof TableNameMapper
        ? selectedMapper.schema
        : undefined;

    const selectMapper = (val: Mapper): void => {
      connectionValueState.selectedPostProcessor?.setSelectedMapper(val);
      if (val instanceof TableNameMapper) {
        connectionValueState.selectedPostProcessor?.setSelectedSchema(
          val.schema,
        );
      }
    };

    const addSchemaMapper = (): void => {
      postProcessor_addMapper(postProcessor, true);
      connectionValueState.selectedPostProcessor?.setSelectedMapper(
        (postProcessor as MapperPostProcessor).mappers.at(-1),
      );
      connectionValueState.selectedPostProcessor?.setSelectedSchema(undefined);
    };

    const addTableMapper = (): void => {
      postProcessor_addMapper(postProcessor, false);
      connectionValueState.selectedPostProcessor?.setSelectedMapper(
        (postProcessor as MapperPostProcessor).mappers.at(-1),
      );
      connectionValueState.selectedPostProcessor?.setSelectedSchema(
        (
          (postProcessor as MapperPostProcessor).mappers.at(
            -1,
          ) as TableNameMapper
        ).schema,
      );
    };

    const deleteMapper =
      (mapper: Mapper): (() => void) =>
      (): void => {
        postProcessor_deleteMapper(connectionValueState, mapper);
        if (
          mapper === connectionValueState.selectedPostProcessor?.selectedMapper
        ) {
          connectionValueState.selectedPostProcessor.setSelectedMapper(
            undefined,
          );
          connectionValueState.selectedPostProcessor.setSelectedSchema(
            undefined,
          );
        }
      };

    const mappers = (postProcessor as MapperPostProcessor).mappers;
    const isSchemaMapperDuplicated = (val: Mapper): boolean =>
      mappers.filter(
        (p) =>
          p.from === val.from &&
          p.to === val.to &&
          val instanceof SchemaNameMapper &&
          p instanceof SchemaNameMapper,
      ).length >= 2;

    const isTableMapperDuplicated = (val: Mapper): boolean =>
      mappers
        .filter(
          (p) => val instanceof TableNameMapper && p instanceof TableNameMapper,
        )
        .filter(
          (p) =>
            (p as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (p as TableNameMapper).schema.from ===
              (val as TableNameMapper).schema.from &&
            (p as TableNameMapper).from === (val as TableNameMapper).from &&
            (p as TableNameMapper).from === (val as TableNameMapper).from,
        ).length >= 2;

    const isMapperDuplicated = (val: Mapper): boolean =>
      isSchemaMapperDuplicated(val) || isTableMapperDuplicated(val);

    return (
      <ResizablePanelGroup orientation="horizontal">
        <ResizablePanel>
          <ResizablePanelGroup orientation="vertical">
            <ResizablePanel size={170} minSize={70}>
              <div className="panel__container panel__container--border-right">
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
                  <PanelHeader title="mapper">
                    <PanelHeaderActionItem tip="Create Mapper">
                      <PlusIcon />
                    </PanelHeaderActionItem>
                  </PanelHeader>
                </DropdownMenu>

                <div className="panel__content">
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
                      <PanelExplorerItem
                        key={mapper._UUID}
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
                        isSelected={
                          mapper ===
                          connectionValueState.selectedPostProcessor
                            ?.selectedMapper
                        }
                        onSelect={() => selectMapper(mapper)}
                      />
                    </ContextMenu>
                  ))}
                </div>
              </div>
            </ResizablePanel>

            <ResizablePanelSplitter />

            <ResizablePanel>
              <div className="panel__container">
                {selectedMapper && (
                  <PanelHeader
                    title={
                      connectionValueState.selectedPostProcessor
                        ?.selectedMapper instanceof TableNameMapper
                        ? 'Table Mapper'
                        : 'Schema Mapper'
                    }
                  ></PanelHeader>
                )}
                <div className="panel__content">
                  {!selectedMapper && (
                    <BlankPanelPlaceholder
                      text=""
                      tooltipText=""
                      disabled={true}
                      previewText={
                        !mappers.length
                          ? 'Add a mapper to view properties'
                          : 'Select a mapper to view properties'
                      }
                    />
                  )}
                  {selectedMapper && (
                    <PanelForm>
                      <PanelTextEditor
                        isReadOnly={false}
                        value={selectedMapper.from}
                        propertyName={'From'}
                        update={(value: string | undefined): void =>
                          postProcessor_setMapperFrom(
                            selectedMapper,
                            value ?? '',
                          )
                        }
                      />
                      <PanelTextEditor
                        isReadOnly={false}
                        value={selectedMapper.to}
                        propertyName={'To'}
                        update={(value: string | undefined): void =>
                          postProcessor_setMapperTo(selectedMapper, value ?? '')
                        }
                      />
                      {selectedSchemaNameMapper && (
                        <>
                          <PanelTextEditor
                            isReadOnly={false}
                            value={selectedSchemaNameMapper.from}
                            propertyName={'Schema - From'}
                            update={(value: string | undefined): void => {
                              postProcessor_setMapperSchemaFrom(
                                selectedSchemaNameMapper,
                                value ?? '',
                              );
                            }}
                          />
                          <PanelTextEditor
                            isReadOnly={false}
                            value={selectedSchemaNameMapper.to}
                            propertyName={'Schema - To'}
                            update={(value: string | undefined): void =>
                              postProcessor_setMapperSchemaTo(
                                selectedSchemaNameMapper,
                                value ?? '',
                              )
                            }
                          />
                        </>
                      )}
                    </PanelForm>
                  )}
                </div>
              </div>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    );
  },
);
