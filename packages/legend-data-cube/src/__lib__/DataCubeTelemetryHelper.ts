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

import type { TelemetryService } from '@finos/legend-application';
import type { ProjectGAVCoordinates } from '@finos/legend-storage';

type DataCube_TelemetryData = {
  dataCubeId?: string | undefined;
  error?: string | undefined;
};

type DataCube_LegendQuery_TelemetryData = DataCube_TelemetryData & {
  project?: ProjectGAVCoordinates | undefined;
  query: {
    name?: string | undefined;
    id: string;
  };
};

type DataCube_UserDefinedFunction_TelemetryData = DataCube_TelemetryData & {
  project?: ProjectGAVCoordinates | undefined;
  function: {
    path: string;
    runtime?: string | undefined;
  };
};

type DataCube_LocalFile_TelemetryData = DataCube_TelemetryData & {
  file: {
    name: string;
    format: string;
  };
};

type DataCube_AdhocQuery_TelemetryData = DataCube_TelemetryData & {
  project?: ProjectGAVCoordinates | undefined;
  adhocQuery: {
    mapping?: string | undefined;
    runtime: string;
  };
};

export class DataCubeTelemetryHelper {
  static logEvent_Datacube(
    service: TelemetryService,
    data: DataCube_TelemetryData,
    eventType: string,
  ): void {
    service.logEvent(eventType, data);
  }

  static logEvent_Datacube_LegendQuery(
    service: TelemetryService,
    data: DataCube_LegendQuery_TelemetryData,
    eventType: string,
  ): void {
    service.logEvent(eventType, data);
  }

  static logEvent_Datacube_AdhocFunction(
    service: TelemetryService,
    data: DataCube_UserDefinedFunction_TelemetryData,
    eventType: string,
  ): void {
    service.logEvent(eventType, data);
  }

  static logEvent_Datacube_LocalFile(
    service: TelemetryService,
    data: DataCube_LocalFile_TelemetryData,
    eventType: string,
  ): void {
    service.logEvent(eventType, data);
  }

  static logEvent_Datacube_AdhocQuery(
    service: TelemetryService,
    data: DataCube_AdhocQuery_TelemetryData,
    eventType: string,
  ): void {
    service.logEvent(eventType, data);
  }
}
