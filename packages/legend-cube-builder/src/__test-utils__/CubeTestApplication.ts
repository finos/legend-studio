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

import {
  ApplicationStore,
  type GenericLegendApplicationStore,
  LegendApplicationConfig,
  type LegendApplicationPlugin,
  LegendApplicationPluginManager,
} from '@finos/legend-application';
import { TEST__getApplicationVersionData } from '@finos/legend-application/test';
import type { CubeHost } from '../stores/CubeHost.js';
import { LocalModelCatalog } from '../stores/LocalModelCatalog.js';
import {
  createFakeCubeEngine,
  type FakeCubeEngine,
  type FakeCubeEngineAnswers,
} from './FakeCubeEngine.js';
import {
  createFakeCubeConnectionExplorer,
  type FakeCubeConnectionExplorer,
} from './FakeCubeConnectionExplorer.js';
import {
  createFakeCubeDataProductCatalog,
  type FakeCubeDataProductCatalog,
} from './FakeCubeDataProductCatalog.js';

// A bare Legend application for Cube's jsdom tests, as the data-space viewer's
// tests build theirs: the builder may not use the query builder's test helpers

export class TEST__LegendCubePluginManager extends LegendApplicationPluginManager<LegendApplicationPlugin> {
  private constructor() {
    super();
  }

  static create(): TEST__LegendCubePluginManager {
    return new TEST__LegendCubePluginManager();
  }
}

class TEST__LegendCubeApplicationConfig extends LegendApplicationConfig {
  override getDefaultApplicationStorageKey(): string {
    return 'test';
  }
}

/** A fresh application store: build one per test, since it initializes once */
export const TEST__createCubeApplicationStore = (
  plugins: LegendApplicationPlugin[] = [],
): GenericLegendApplicationStore => {
  const pluginManager = TEST__LegendCubePluginManager.create();
  pluginManager.usePlugins(plugins).install();
  return new ApplicationStore(
    new TEST__LegendCubeApplicationConfig({
      configData: { env: 'TEST', appName: 'TEST' },
      versionData: TEST__getApplicationVersionData(),
      baseAddress: '/',
    }),
    pluginManager,
  );
};

/** A host over fakes of the engine, the connection explorer and the data product catalog, with the bundled models */
export const TEST__createCubeHost = (
  answers?: FakeCubeEngineAnswers,
  applicationStore = TEST__createCubeApplicationStore(),
): {
  host: CubeHost;
  fake: FakeCubeEngine;
  connections: FakeCubeConnectionExplorer;
  dataProducts: FakeCubeDataProductCatalog;
} => {
  const fake = createFakeCubeEngine(answers);
  const connections = createFakeCubeConnectionExplorer();
  const dataProducts = createFakeCubeDataProductCatalog();
  return {
    host: {
      applicationStore,
      engine: fake.engine,
      modelCatalog: new LocalModelCatalog(fake.engine),
      connectionExplorer: connections.explorer,
      dataProductCatalog: dataProducts.catalog,
    },
    fake,
    connections,
    dataProducts,
  };
};
