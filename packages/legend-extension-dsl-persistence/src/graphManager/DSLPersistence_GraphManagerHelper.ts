import type { PureModel } from '@finos/legend-graph';
import { PersistencePipe } from '../models/metamodels/pure/model/packageableElements/persistence/Persistence';

export const getPersistencePipe = (
  path: string,
  graph: PureModel,
): PersistencePipe =>
  graph.getExtensionElement(
    path,
    PersistencePipe,
    `Can't find persistence pipe '${path}'`,
  );
