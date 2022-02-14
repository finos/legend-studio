import packageJson from '../../package.json';
import { PersistencePipe } from '../models/metamodels/pure/model/packageableElements/persistence/Persistence';
import type { Clazz } from '@finos/legend-shared';
import { type PackageableElement, PureGraphPlugin } from '@finos/legend-graph';

export class DSLPersistence_PureGraphPlugin extends PureGraphPlugin {
  constructor() {
    super(packageJson.extensions.pureGraphPlugin, packageJson.version);
  }

  override getExtraPureGraphExtensionClasses(): Clazz<PackageableElement>[] {
    return [PersistencePipe];
  }
}
