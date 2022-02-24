import type { PureModel } from '@finos/legend-graph';
import { Persistence } from '../models/metamodels/pure/model/packageableElements/persistence/Persistence';

export const getPersistence = (path: string, graph: PureModel): Persistence =>
  graph.getExtensionElement(
    path,
    Persistence,
    `Can't find persistence '${path}'`,
  );
