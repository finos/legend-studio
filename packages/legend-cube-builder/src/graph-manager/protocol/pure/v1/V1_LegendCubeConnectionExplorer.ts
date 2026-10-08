/**
 * Copyright (c) 2026-present, Goldman Sachs
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

import { V1_EngineServerClient } from '@finos/legend-graph';
import type { PlainObject, TracerService } from '@finos/legend-shared';
import type {
  CubeConnectionDescription,
  CubeConnectionDraft,
  CubeConnectionExplorer,
  CubeDirectConnection,
  CubeDirectDatabaseType,
  CubeExploredTable,
} from '../../../CubeConnectionExplorer.js';
import { CubeEngineError, CubeEngineErrorKind } from '../../../CubeEngine.js';
import {
  V1_buildCubeDirectConnection,
  V1_checkCubeDirectConnection,
  V1_summarizeCubeDirectConnection,
} from './V1_CubeDirectConnection.js';
import {
  type V1_CubeExplorationScope,
  V1_buildCubeSchemaExplorationInput,
  V1_readExploredSchemaNames,
  V1_readExploredTables,
  V1_toCubeExplorationError,
} from './V1_CubeSchemaExploration.js';
import type { V1_CubeEngineConfig } from './V1_LegendCubeEngine.js';

/** Where the engine puts the Database it reads for the picker: never saved */
const EXPLORED_DATABASE = { package: 'cube::explored', name: 'Database' };

/**
 * The Legend implementation of the connection explorer (PLAN §6.8): the
 * engine's schema exploration, with its own client. Connections are checked
 * first, so one Cube can't use never reaches the engine
 */
export class V1_LegendCubeConnectionExplorer implements CubeConnectionExplorer {
  readonly client: V1_EngineServerClient;

  constructor(config: V1_CubeEngineConfig, tracerService: TracerService) {
    this.client = new V1_EngineServerClient(config);
    this.client.setTracerService(tracerService);
  }

  buildConnection(draft: CubeConnectionDraft): CubeDirectConnection {
    return V1_buildCubeDirectConnection(draft);
  }

  describeConnection(
    connection: CubeDirectConnection,
  ): CubeConnectionDescription {
    const problems = V1_checkCubeDirectConnection(connection);
    return problems.length
      ? { supported: false, problems }
      : {
          supported: true,
          summary: V1_summarizeCubeDirectConnection(connection),
        };
  }

  async listSchemas(
    connection: CubeDirectConnection,
  ): Promise<readonly string[]> {
    return V1_readExploredSchemaNames(
      await this.explore(connection, { kind: 'schemas' }),
    );
  }

  async listTables(
    connection: CubeDirectConnection,
    schema: string,
  ): Promise<readonly CubeExploredTable[]> {
    return V1_readExploredTables(
      await this.explore(connection, { kind: 'tables', schema }),
      schema,
    );
  }

  private async explore(
    connection: CubeDirectConnection,
    scope: V1_CubeExplorationScope,
  ): Promise<PlainObject> {
    const problems = V1_checkCubeDirectConnection(connection);
    if (problems.length) {
      throw new CubeEngineError(
        CubeEngineErrorKind.COMPILE,
        problems.join('\n'),
      );
    }
    try {
      return await this.client.buildDatabase(
        V1_buildCubeSchemaExplorationInput(
          connection,
          connection.databaseType as CubeDirectDatabaseType,
          EXPLORED_DATABASE,
          scope,
        ),
      );
    } catch (error) {
      throw V1_toCubeExplorationError(error, CubeEngineErrorKind.COMPILE);
    }
  }
}
