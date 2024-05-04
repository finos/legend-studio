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
  collectKeyedCommandConfigEntriesFromConfig,
  collectSettingConfigurationEntriesFromConfig,
  LegendApplicationPlugin,
  type SettingConfigurationEntry,
  type KeyedCommandConfigEntry,
  type LegendApplicationPluginManager,
  type LegendApplicationSetup,
  ActionAlertActionType,
  ActionAlertType,
} from '@finos/legend-application';
import packageJson from '../../package.json' assert { type: 'json' };
import {
  QUERY_BUILDER_SETTING_CONFIG,
  QUERY_BUILDER_SETTING_KEY,
} from '../__lib__/QueryBuilderSetting.js';
import { QUERY_BUILDER_COMMAND_CONFIG } from '../stores/QueryBuilderCommand.js';
import {
  QueryBuilderAdvancedButtonKey,
  type QueryBuilderState,
} from '../stores/QueryBuilderState.js';
import { configureDataGridComponent } from '@finos/legend-lego/data-grid';
import { Chart as ChartJS, ArcElement, Tooltip, LinearScale } from 'chart.js';
import { RedoButton, UndoButton } from '@finos/legend-lego/application';
import {
  CalendarClockIcon,
  CaretDownIcon,
  CheckIcon,
  DropdownMenu,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  MenuContentItemIcon,
  MenuContentItemLabel,
  WaterDropIcon,
} from '@finos/legend-art';
import { guaranteeType } from '@finos/legend-shared';
import { QueryBuilderTDSState } from '../stores/fetch-structure/tds/QueryBuilderTDSState.js';
import { QueryBuilderTextEditorMode } from '../stores/QueryBuilderTextEditorState.js';

export type CheckEntitlementEditorRender = (
  queryBuilderState: QueryBuilderState,
) => React.ReactNode | undefined;

export type QueryBuilderActionConfiguration = {
  key: string;
  renderer: (
    queryBuilderState: QueryBuilderState,
  ) => React.ReactNode | undefined;
};

export type QueryBuilderStatusConfiguration = {
  key: string;
  renderer: (
    queryBuilderState: QueryBuilderState,
  ) => React.ReactNode | undefined;
};

export class QueryBuilder_LegendApplicationPlugin extends LegendApplicationPlugin {
  static NAME = packageJson.extensions.applicationPlugin;

  constructor() {
    super(QueryBuilder_LegendApplicationPlugin.NAME, packageJson.version);
  }

  install(
    pluginManager: LegendApplicationPluginManager<LegendApplicationPlugin>,
  ): void {
    pluginManager.registerApplicationPlugin(this);
  }

  override getExtraApplicationSetups(): LegendApplicationSetup[] {
    return [
      async (applicationStore) => {
        configureDataGridComponent();

        // configure chart component
        ChartJS.register(
          ArcElement,
          Tooltip,
          // NOTE: this is a workaround for a production bundle problem where LinearScale seems to be required
          // in only production build
          // See https://github.com/chartjs/Chart.js/issues/10895
          // See https://github.com/chartjs/Chart.js/issues/11157#issue-1592988375
          LinearScale,
        );
      },
    ];
  }

  override getExtraKeyedCommandConfigEntries(): KeyedCommandConfigEntry[] {
    return collectKeyedCommandConfigEntriesFromConfig(
      QUERY_BUILDER_COMMAND_CONFIG,
    );
  }

  override getExtraSettingConfigurationEntries(): SettingConfigurationEntry[] {
    return collectSettingConfigurationEntriesFromConfig(
      QUERY_BUILDER_SETTING_CONFIG,
    );
  }

  getCoreQueryBuilderActionConfigurations(): QueryBuilderActionConfiguration[] {
    return [
      {
        key: 'undo-redo',
        renderer: (queryBuilderState): React.ReactNode => {
          const undo = (): void => {
            queryBuilderState.changeHistoryState.undo();
          };
          const redo = (): void => {
            queryBuilderState.changeHistoryState.redo();
          };
          return (
            <div className="query-builder__header__actions__undo-redo">
              <UndoButton
                parent={queryBuilderState.queryBuilderRef}
                canUndo={
                  queryBuilderState.changeHistoryState.canUndo &&
                  queryBuilderState.isQuerySupported
                }
                undo={undo}
              />
              <RedoButton
                parent={queryBuilderState.queryBuilderRef}
                canRedo={
                  queryBuilderState.changeHistoryState.canRedo &&
                  queryBuilderState.isQuerySupported
                }
                redo={redo}
              />
            </div>
          );
        },
      },
      {
        key: QueryBuilderAdvancedButtonKey,
        renderer: (queryBuilderState): React.ReactNode => {
          const fetchStructureState = queryBuilderState.fetchStructureState;
          const isTDSState =
            fetchStructureState.implementation instanceof QueryBuilderTDSState;

          const toggleShowFunctionPanel = (): void => {
            queryBuilderState.setShowFunctionsExplorerPanel(
              !queryBuilderState.showFunctionsExplorerPanel,
            );
          };
          const toggleShowParameterPanel = (): void => {
            queryBuilderState.setShowParametersPanel(
              !queryBuilderState.showParametersPanel,
            );
          };
          const toggleConstantPanel = (): void => {
            queryBuilderState.constantState.setShowConstantPanel(
              !queryBuilderState.constantState.showConstantPanel,
            );
          };
          const toggleShowFilterPanel = (): void => {
            queryBuilderState.filterState.setShowPanel(
              !queryBuilderState.filterState.showPanel,
            );
          };
          const toggleShowPostFilterPanel = (): void => {
            if (
              queryBuilderState.fetchStructureState.implementation instanceof
              QueryBuilderTDSState
            ) {
              const tdsState =
                queryBuilderState.fetchStructureState.implementation;
              tdsState.setShowPostFilterPanel(!tdsState.showPostFilterPanel);
              queryBuilderState.applicationStore.settingService.persistValue(
                QUERY_BUILDER_SETTING_KEY.SHOW_POST_FILTER_PANEL,
                tdsState.showPostFilterPanel,
              );
            }
          };

          const openLambdaEditor = (mode: QueryBuilderTextEditorMode): void =>
            queryBuilderState.textEditorState.openModal(mode);

          const openWatermark = (): void => {
            queryBuilderState.watermarkState.setIsEditingWatermark(true);
          };

          const toggleEnableCalendar = (): void => {
            if (queryBuilderState.isCalendarEnabled) {
              queryBuilderState.applicationStore.alertService.setActionAlertInfo(
                {
                  message:
                    'You are about to disable calendar aggregation operations. This will remove all the calendar aggreagtions you added to the query.',
                  prompt: ' Do you want to proceed?',
                  type: ActionAlertType.CAUTION,
                  actions: [
                    {
                      label: 'Proceed',
                      type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                      handler: (): void => {
                        if (
                          queryBuilderState.fetchStructureState
                            .implementation instanceof QueryBuilderTDSState
                        ) {
                          queryBuilderState.fetchStructureState.implementation.aggregationState.disableCalendar();
                        }
                      },
                    },
                    {
                      label: 'Cancel',
                      type: ActionAlertActionType.PROCEED,
                      default: true,
                    },
                  ],
                },
              );
            } else {
              queryBuilderState.applicationStore.alertService.setActionAlertInfo(
                {
                  message:
                    'You are about to enable calendar aggregation operations. This will let you add calendar functions to the aggregation operations that you perform on projection columns, but this would require your calendar database to be included in your database.',
                  prompt: ' Do you want to proceed?',
                  type: ActionAlertType.CAUTION,
                  actions: [
                    {
                      label: 'Proceed',
                      type: ActionAlertActionType.PROCEED_WITH_CAUTION,
                      handler: (): void =>
                        queryBuilderState.setIsCalendarEnabled(true),
                    },
                    {
                      label: 'Cancel',
                      type: ActionAlertActionType.PROCEED,
                      default: true,
                    },
                  ],
                },
              );
            }
          };

          const editQueryInPure = (): void => {
            openLambdaEditor(QueryBuilderTextEditorMode.TEXT);
          };
          const showQueryProtocol = (): void => {
            openLambdaEditor(QueryBuilderTextEditorMode.JSON);
          };

          const openCheckEntitlmentsEditor = (): void => {
            queryBuilderState.checkEntitlementsState.setShowCheckEntitlementsViewer(
              true,
            );
          };

          const toggleShowOLAPGroupByPanel = (): void => {
            if (isTDSState) {
              const tdsState = guaranteeType(
                queryBuilderState.fetchStructureState.implementation,
                QueryBuilderTDSState,
              );
              tdsState.setShowWindowFuncPanel(!tdsState.showWindowFuncPanel);
            }
          };

          return (
            <DropdownMenu
              className="query-builder__header__advanced-dropdown"
              title="Show Advanced Menu..."
              content={
                <MenuContent>
                  <MenuContentItem
                    onClick={toggleShowFunctionPanel}
                    disabled={!queryBuilderState.isQuerySupported}
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.showFunctionsExplorerPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Function(s)
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  {!queryBuilderState.isParameterSupportDisabled && (
                    <MenuContentItem
                      onClick={toggleShowParameterPanel}
                      disabled={
                        !queryBuilderState.isQuerySupported ||
                        queryBuilderState.parametersState.parameterStates
                          .length > 0
                      }
                    >
                      <MenuContentItemIcon>
                        {queryBuilderState.showParametersPanel ? (
                          <CheckIcon />
                        ) : null}
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>
                        Show Parameter(s)
                      </MenuContentItemLabel>
                    </MenuContentItem>
                  )}
                  {
                    <MenuContentItem
                      onClick={toggleConstantPanel}
                      disabled={
                        !queryBuilderState.isQuerySupported ||
                        queryBuilderState.constantState.constants.length > 0
                      }
                    >
                      <MenuContentItemIcon>
                        {queryBuilderState.constantState.showConstantPanel ? (
                          <CheckIcon />
                        ) : null}
                      </MenuContentItemIcon>
                      <MenuContentItemLabel>
                        Show Constant(s)
                      </MenuContentItemLabel>
                    </MenuContentItem>
                  }
                  <MenuContentItem
                    onClick={toggleShowFilterPanel}
                    disabled={
                      !queryBuilderState.isQuerySupported ||
                      Array.from(queryBuilderState.filterState.nodes.values())
                        .length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.filterState.showPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Show Filter</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentDivider />
                  <MenuContentItem
                    onClick={toggleShowOLAPGroupByPanel}
                    disabled={
                      !queryBuilderState.isQuerySupported ||
                      !(
                        queryBuilderState.fetchStructureState
                          .implementation instanceof QueryBuilderTDSState
                      ) ||
                      queryBuilderState.fetchStructureState.implementation
                        .windowState.windowColumns.length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {isTDSState &&
                      guaranteeType(
                        queryBuilderState.fetchStructureState.implementation,
                        QueryBuilderTDSState,
                      ).showWindowFuncPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Window Function(s)
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={toggleShowPostFilterPanel}
                    disabled={
                      !queryBuilderState.isQuerySupported ||
                      !(
                        queryBuilderState.fetchStructureState
                          .implementation instanceof QueryBuilderTDSState
                      ) ||
                      Array.from(
                        queryBuilderState.fetchStructureState.implementation.postFilterState.nodes.values(),
                      ).length > 0
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.fetchStructureState
                        .implementation instanceof QueryBuilderTDSState &&
                      queryBuilderState.fetchStructureState.implementation
                        .showPostFilterPanel ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>
                      Show Post-Filter
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={openWatermark}>
                    <MenuContentItemIcon>{null}</MenuContentItemIcon>
                    <MenuContentItemLabel>Show Watermark</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem
                    onClick={toggleEnableCalendar}
                    disabled={
                      !queryBuilderState.isQuerySupported ||
                      !(
                        queryBuilderState.fetchStructureState
                          .implementation instanceof QueryBuilderTDSState
                      )
                    }
                  >
                    <MenuContentItemIcon>
                      {queryBuilderState.isCalendarEnabled ? (
                        <CheckIcon />
                      ) : null}
                    </MenuContentItemIcon>
                    <MenuContentItemLabel>Enable Calendar</MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentDivider />
                  <MenuContentItem
                    onClick={openCheckEntitlmentsEditor}
                    disabled={
                      queryBuilderState.isQuerySupported &&
                      queryBuilderState.fetchStructureState
                        .implementation instanceof QueryBuilderTDSState &&
                      queryBuilderState.fetchStructureState.implementation
                        .projectionColumns.length === 0
                    }
                  >
                    <MenuContentItemIcon />
                    <MenuContentItemLabel>
                      Check Entitlements
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={editQueryInPure}>
                    <MenuContentItemIcon />
                    <MenuContentItemLabel>
                      Edit Query in Pure
                    </MenuContentItemLabel>
                  </MenuContentItem>
                  <MenuContentItem onClick={showQueryProtocol}>
                    <MenuContentItemIcon />
                    <MenuContentItemLabel>
                      Show Query Protocol
                    </MenuContentItemLabel>
                  </MenuContentItem>
                </MenuContent>
              }
              menuProps={{
                anchorOrigin: { vertical: 'bottom', horizontal: 'right' },
                transformOrigin: { vertical: 'top', horizontal: 'right' },
                elevation: 7,
              }}
            >
              <div className="query-builder__header__advanced-dropdown__label">
                Advanced
              </div>
              <CaretDownIcon className="query-builder__header__advanced-dropdown__icon" />
            </DropdownMenu>
          );
        },
      },
    ];
  }

  getCoreQueryBuilderStatusConfigurations(): QueryBuilderStatusConfiguration[] {
    return [
      {
        key: 'watermark',
        renderer: (queryBuilderState): React.ReactNode => {
          const openWatermark = (): void => {
            queryBuilderState.watermarkState.setIsEditingWatermark(true);
          };
          return (
            <>
              {queryBuilderState.watermarkState.value && (
                <button
                  className="query-builder__header__status query-builder__header__status--action"
                  onClick={openWatermark}
                  tabIndex={-1}
                  title="Used watermark"
                  name="Used watermark"
                >
                  <WaterDropIcon />
                </button>
              )}
            </>
          );
        },
      },
      {
        key: 'calendar',
        renderer: (queryBuilderState): React.ReactNode => (
          <>
            {queryBuilderState.isCalendarEnabled && (
              <div
                className="query-builder__header__status"
                title="Used calendar aggregation"
              >
                <CalendarClockIcon className="query-builder__header__status__icon--calendar" />
              </div>
            )}
          </>
        ),
      },
    ];
  }
}
