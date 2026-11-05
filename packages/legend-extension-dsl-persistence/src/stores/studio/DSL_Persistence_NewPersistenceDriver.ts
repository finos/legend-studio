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
  type EditorStore,
  NewElementDriver,
} from '@finos/legend-application-studio';
import {
  type Service,
  PackageableElementExplicitReference,
} from '@finos/legend-graph';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { action, computed, makeObservable, observable } from 'mobx';
import { Persistence } from '../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Persistence.js';
import { ManualTrigger } from '../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Trigger.js';
import { Notifier } from '../../graph/metamodel/pure/model/packageableElements/persistence/DSL_Persistence_Notifier.js';

export type PersistenceServiceOption = {
  label: string;
  value: Service;
};

/**
 * A persistence needs a documentation, a trigger and a service (the grammar
 * requires all three, and the graph builder rejects an empty documentation),
 * so the new element dialog asks for the service and the documentation and
 * defaults the trigger to manual.
 */
export class NewPersistenceDriver extends NewElementDriver<Persistence> {
  serviceOption?: PersistenceServiceOption | undefined;
  documentation = '';

  constructor(editorStore: EditorStore) {
    super(editorStore);

    makeObservable(this, {
      serviceOption: observable,
      documentation: observable,
      serviceOptions: computed,
      isValid: computed,
      setServiceOption: action,
      setDocumentation: action,
      createElement: action,
    });

    this.serviceOption = this.serviceOptions[0];
  }

  get serviceOptions(): PersistenceServiceOption[] {
    return this.editorStore.graphManagerState.usableServices.map((service) => ({
      label: service.path,
      value: service,
    }));
  }

  setServiceOption(val: PersistenceServiceOption | undefined): void {
    this.serviceOption = val;
  }

  setDocumentation(val: string): void {
    this.documentation = val;
  }

  get isValid(): boolean {
    return Boolean(this.serviceOption && this.documentation.trim());
  }

  createElement(name: string): Persistence {
    const persistence = new Persistence(name);
    persistence.documentation = this.documentation.trim();
    persistence.trigger = new ManualTrigger();
    persistence.service = PackageableElementExplicitReference.create(
      guaranteeNonNullable(this.serviceOption).value,
    );
    persistence.serviceOutputTargets = [];
    persistence.notifier = new Notifier();
    return persistence;
  }
}
