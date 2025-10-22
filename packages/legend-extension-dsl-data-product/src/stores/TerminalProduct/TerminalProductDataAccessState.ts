/**
 * Copyright (c) 2025-present, Goldman Sachs
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
  type V1_TerminalProvisionPayload,
  V1_terminalProvisionPayloadModelSchema,
} from '@finos/legend-graph';
import {
  ActionState,
  assertErrorThrown,
  type GeneratorFn,
  type PlainObject,
  type UserSearchService,
} from '@finos/legend-shared';
import { flow, makeObservable, observable } from 'mobx';
import type { TerminalProductViewerState } from './TerminalProductViewerState.js';
import { serialize } from 'serializr';
import type { TerminalAccessServerClient } from '@finos/legend-server-marketplace';
import type { GenericLegendApplicationStore } from '@finos/legend-application';

// TODO:
// - Find way to get current user approval status via endpoint

export class TerminalProductDataAccessState {
  readonly viewerState: TerminalProductViewerState;
  readonly terminalAccessServerClient: TerminalAccessServerClient;
  readonly applicationStore: GenericLegendApplicationStore;
  readonly userSearchService: UserSearchService | undefined;
  readonly creatingTerminalOrderState = ActionState.create();

  constructor(
    viewerState: TerminalProductViewerState,
    terminalAccessServerClient: TerminalAccessServerClient,
    applicationStore: GenericLegendApplicationStore,
    userSearchService: UserSearchService | undefined,
  ) {
    this.viewerState = viewerState;
    this.terminalAccessServerClient = terminalAccessServerClient;
    this.applicationStore = applicationStore;
    this.userSearchService = userSearchService;

    makeObservable(this, {
      createTerminalRequest: flow,
    });
  }

  *createTerminalRequest(
    targetKerberos: string,
    businessJustification: string,
  ): GeneratorFn<void> {
    try {
      this.creatingTerminalOrderState.inProgress();
      const terminalId = parseInt(this.viewerState.product.id);
      const orderedBy = this.applicationStore.identityService.currentUser;
      const terminalOrderItem = {
        providerName: this.viewerState.product.providerName,
        productName: this.viewerState.product.productName,
        category: this.viewerState.product.category,
        price: parseFloat(this.viewerState.product.price),
        id: parseInt(this.viewerState.product.id),
      };

      const request = serialize(V1_terminalProvisionPayloadModelSchema, {
        ordered_by: orderedBy,
        kerberos: targetKerberos,
        order_items: {
          [terminalId]: [terminalOrderItem],
        },
        business_justification: businessJustification,
      } satisfies V1_TerminalProvisionPayload) as PlainObject<V1_TerminalProvisionPayload>;

      yield this.terminalAccessServerClient.createTerminalOrder(request);

      this.applicationStore.notificationService.notifySuccess(
        'Terminal access request submitted successfully',
      );
    } catch (error) {
      assertErrorThrown(error);
      this.applicationStore.notificationService.notifyError(
        `Failed to request access to terminal: ${error.message}`,
      );
    } finally {
      this.creatingTerminalOrderState.complete();
    }
  }
}
