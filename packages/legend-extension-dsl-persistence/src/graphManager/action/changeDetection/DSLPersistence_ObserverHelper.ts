import type { Persistence } from '../../../models/metamodels/pure/model/packageableElements/persistence/Persistence';
import {
  observe_Abstract_PackageableElement,
  skipObservedWithContext,
} from '@finos/legend-graph';
import { makeObservable, observable, override } from 'mobx';

export const observe_Persistence = skipObservedWithContext(
  (metamodel: Persistence, context): Persistence => {
    observe_Abstract_PackageableElement(metamodel);

    makeObservable<Persistence, '_elementHashCode'>(metamodel, {
      documentation: observable,
      trigger: observable,
      service: observable,
      persister: observable,
      notifier: observable,
      _elementHashCode: override,
    });

    return metamodel;
  },
);
