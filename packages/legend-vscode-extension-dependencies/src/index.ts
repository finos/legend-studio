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

import '../src/index.css'; // eslint-disable-line @finos/legend/no-cross-workspace-source-usage
// NOTE: tailwind style takes precedence over other styles since it's generated and we should not allow
// other styles to override it
import '../lib/tailwind.css'; // eslint-disable-line @finos/legend/no-cross-workspace-non-export-usage

export {
  type Diagram,
  DIAGRAM_ALIGNER_OPERATOR,
  DIAGRAM_INTERACTION_MODE,
  DIAGRAM_RELATIONSHIP_EDIT_MODE,
  DIAGRAM_ZOOM_LEVELS,
  DiagramRenderer,
  DSL_Diagram_GraphManagerPreset,
  getDiagram,
  Point,
  V1_diagramModelSchema,
  V1_transformDiagram,
} from '@finos/legend-extension-dsl-diagram';

export {
  AlignBottomIcon,
  AlignCenterIcon,
  AlignEndIcon,
  AlignMiddleIcon,
  AlignStartIcon,
  AlignTopIcon,
  BoxArrowUpRightIcon,
  Button,
  CaretDownIcon,
  clsx,
  compareLabelFn,
  ControlledDropdownMenu,
  CubesLoadingIndicator,
  CubesLoadingIndicatorIcon,
  CustomSelectorInput,
  DistributeHorizontalIcon,
  DistributeVerticalIcon,
  LegendStyleProvider,
  MenuContent,
  MenuContentDivider,
  MenuContentItem,
  MousePointerIcon,
  MoveIcon,
  SaveCurrIcon,
  SaveIcon,
  useResizeDetector,
  ZoomInIcon,
  ZoomOutIcon,
} from '@finos/legend-art';

export type { Entity } from '@finos/legend-storage';

export {
  type ExtensionsConfigurationData,
  type GeneratorFn,
  type Parameters,
  type PlainObject,
  type RequestHeaders,
  type RequestProcessConfig,
  type ResponseProcessConfig,
  type TraceData,
  AbstractPlugin,
  AbstractPreset,
  assertErrorThrown,
  assertNonNullable,
  assertTrue,
  ContentType,
  customListWithSchema,
  deserializeMap,
  getContentTypeFileExtension,
  guaranteeNonEmptyString,
  guaranteeNonNullable,
  guaranteeType,
  isBoolean,
  isLossSafeNumber,
  isNonNullable,
  isNullable,
  LogEvent,
  NetworkClientError,
  parseLosslessJSON,
  returnUndefOnError,
  SerializationFactory,
  serializeMap,
  TracerService,
  uniq,
  usingModelSchema,
  uuid,
} from '@finos/legend-shared';

export {
  type LegendApplicationConfigurationData,
  type LegendApplicationConfigurationInput,
  type SettingConfigurationEntry,
  ApplicationFrameworkProvider,
  ApplicationStore,
  ApplicationStoreProvider,
  BrowserEnvironmentProvider,
  collectSettingConfigurationEntriesFromConfig,
  Core_LegendApplicationPlugin,
  LEGEND_APPLICATION_COLOR_THEME,
  LEGEND_APPLICATION_SETTING_KEY,
  LegendApplicationConfig,
  LegendApplicationPlugin,
  LegendApplicationPluginManager,
  useApplicationStore,
} from '@finos/legend-application';

export {
  type FetchStructureLayoutConfig,
  type QueryBuilder_LegendApplicationPlugin_Extension,
  type QueryBuilderHeaderActionConfiguration,
  FunctionQueryBuilderState,
  QueryBuilder_GraphManagerPreset,
  QueryBuilder_LegendApplicationPlugin,
  QueryBuilder,
  QueryBuilderActionConfig,
  QueryBuilderConfig,
  QueryBuilderState,
  QueryBuilderWorkflowState,
  ServiceQueryBuilderState,
} from '@finos/legend-query-builder';

export {
  graph_renameElement,
  pureExecution_setFunction,
  service_setExecution,
} from '@finos/legend-application-studio';

export {
  type CompletionItem,
  type DataCubeAPI,
  type DataCubeConfiguration,
  type DataCubeExecutionResult,
  type DataCubeInnerHeaderComponentParams,
  type DataCubeOptions,
  type DataCubeRelationType,
  _elementPtr,
  _function,
  _functionName,
  _lambda,
  DataCube,
  DataCubeEngine,
  DataCubeFunction,
  DataCubeQuery,
  DataCubeSource,
} from '@finos/legend-data-cube';
