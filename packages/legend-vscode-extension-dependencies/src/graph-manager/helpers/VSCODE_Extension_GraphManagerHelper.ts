import type { Entity } from '@finos/legend-storage';
import { LogService } from '@finos/legend-shared';
import {
  type PureModel,
  Core_GraphManagerPreset,
  GraphManagerState,
} from '@finos/legend-graph';
import { LegendStudioPluginManager } from '@finos/legend-application-studio';
import { DSL_Diagram_GraphManagerPreset } from '@finos/legend-extension-dsl-diagram/graph';

export const getPureGraph: (entities: Entity[]) => Promise<PureModel> = async (
  entities: Entity[],
) => {
  const pluginManager = LegendStudioPluginManager.create();
  pluginManager
    .usePresets([
      new Core_GraphManagerPreset(),
      new DSL_Diagram_GraphManagerPreset(),
    ])
    .install();
  const graphManagerState = new GraphManagerState(
    pluginManager,
    new LogService(),
  );

  await graphManagerState.graphManager.initialize({
    env: 'test',
    tabSize: 2,
    clientConfig: {},
  });
  await graphManagerState.initializeSystem({});
  await graphManagerState.graphManager.buildGraph(
    graphManagerState.graph,
    entities,
    graphManagerState.graphBuildState,
    {},
  );
  return graphManagerState.graph;
};
