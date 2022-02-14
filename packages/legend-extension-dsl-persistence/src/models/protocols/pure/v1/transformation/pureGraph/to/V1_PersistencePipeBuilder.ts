import type { V1_PersistencePipe } from '../../../model/packageableElements/persistence/V1_Persistence';
import { getPersistencePipe } from '../../../../../../../graphManager/DSLPersistence_GraphManagerHelper';
import type { V1_GraphBuilderContext } from '@finos/legend-graph';
import { guaranteeNonEmptyString } from '@finos/legend-shared';

export const V1_buildPersistencePipe = (
  elementProtocol: V1_PersistencePipe,
  context: V1_GraphBuilderContext,
): void => {
  const path = context.graph.buildPath(
    elementProtocol.package,
    elementProtocol.name,
  );

  const element = getPersistencePipe(path, context.graph);
  element.documentation = guaranteeNonEmptyString(
    elementProtocol.documentation,
    `Persistence pipe 'documentation' field is missing or empty`,
  );
  element.owners = elementProtocol.owners;
};
