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

import { MasterRecordDefinition } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_MasterRecordDefinition.js';
import type { BasicModel, PureModel } from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  FTPConnection,
  HTTPConnection,
  KafkaConnection,
} from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_Connection.js';
import { DataProvider } from '../graph/metamodel/pure/model/packageableElements/mastery/DSL_Mastery_DataProvider.js';

export const getMasterRecordDefinition = (
  path: string,
  graph: PureModel,
): MasterRecordDefinition =>
  graph.getExtensionElement(
    path,
    MasterRecordDefinition,
    `Can't find master record definition '${path}'`,
  );

export const getOwnMasterRecordDefinition = (
  path: string,
  graph: BasicModel,
): MasterRecordDefinition =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, MasterRecordDefinition),
    `Can't find master record definition '${path}'`,
  );

export const getKafkaConnection = (
  path: string,
  graph: PureModel,
): KafkaConnection =>
  graph.getExtensionElement(
    path,
    KafkaConnection,
    `Can't find kafka connection '${path}'`,
  );

export const getOwnKafkaConnection = (
  path: string,
  graph: BasicModel,
): KafkaConnection =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, KafkaConnection),
    `Can't find kafka connection '${path}'`,
  );

export const getFTPConnection = (
  path: string,
  graph: PureModel,
): FTPConnection =>
  graph.getExtensionElement(
    path,
    FTPConnection,
    `Can't find FTP connection '${path}'`,
  );

export const getOwnFTPConnection = (
  path: string,
  graph: BasicModel,
): FTPConnection =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, FTPConnection),
    `Can't find master FTP connection '${path}'`,
  );

export const getHTTPConnection = (
  path: string,
  graph: PureModel,
): HTTPConnection =>
  graph.getExtensionElement(
    path,
    HTTPConnection,
    `Can't find HTTP connection '${path}'`,
  );

export const getOwnHTTPConnection = (
  path: string,
  graph: BasicModel,
): HTTPConnection =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, HTTPConnection),
    `Can't find master HTTP connection '${path}'`,
  );

export const getDataProvider = (path: string, graph: PureModel): DataProvider =>
  graph.getExtensionElement(
    path,
    DataProvider,
    `Can't find data provider '${path}'`,
  );

export const getOwnDataProvider = (
  path: string,
  graph: BasicModel,
): DataProvider =>
  guaranteeNonNullable(
    graph.getOwnNullableExtensionElement(path, DataProvider),
    `Can't find master data provider '${path}'`,
  );
