import packageJson from '../package.json';

import { AbstractPreset } from '@finos/legend-shared';
import type { GraphPluginManager } from '@finos/legend-graph';

import { DSLPersistence_PureGraphPlugin } from './graph/DSLPersistence_PureGraphPlugin';
import { DSLPersistence_PureGraphManagerPlugin } from './graphManager/DSLPersistence_PureGraphManagerPlugin';
import { DSLPersistence_PureProtocolProcessorPlugin } from './models/protocols/pure/DSLPersistence_PureProtocolProcessorPlugin';

export class DSLPersistence_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new DSLPersistence_PureGraphPlugin().install(pluginManager);
    new DSLPersistence_PureGraphManagerPlugin().install(pluginManager);
    new DSLPersistence_PureProtocolProcessorPlugin().install(pluginManager);
  }
}
