import packageJson from '../../package.json';
import { AbstractPreset } from '@finos/legend-shared';
import type { GraphPluginManager } from '@finos/legend-graph';
import {MappingGeneration_PureProtocolProcessorPlugin} from "./MappingGeneration_PureProtocolProcessorPlugin";

export class MappingGeneration_GraphPreset extends AbstractPreset {
  constructor() {
    super(packageJson.extensions.graphPreset, packageJson.version);
  }

  install(pluginManager: GraphPluginManager): void {
    new MappingGeneration_PureProtocolProcessorPlugin().install(
      pluginManager,
    );
  }
}
