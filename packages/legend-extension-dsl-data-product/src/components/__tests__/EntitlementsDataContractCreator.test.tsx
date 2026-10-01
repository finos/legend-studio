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

import { describe, expect, jest, test } from '@jest/globals';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import { ApplicationStoreProvider } from '@finos/legend-application';
import { integrationTest } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';
import {
  type V1_AccessPointGroup,
  V1_ModelAccessPointGroup,
  V1_PackageableElementPointer,
  PackageableElementPointerType,
} from '@finos/legend-graph';
import { EntitlementsDataContractCreator } from '../DataProduct/DataContract/EntitlementsDataContractCreator.js';
import type { DataProductDataAccessState } from '../../stores/DataProduct/DataProductDataAccessState.js';
import type { DataProductAPGState } from '../../stores/DataProduct/DataProductAPGState.js';
import type { DataProductViewerState } from '../../stores/DataProduct/DataProductViewerState.js';
import {
  TEST__getDataProductDataAccessState,
  TEST__getDataProductViewerState,
} from '../__test-utils__/StateTestUtils.js';
import {
  mockEntitlementsSDLCDataProduct,
  mockSDLCDataProduct,
} from '../__test-utils__/TEST_DATA__LakehouseDataProducts.js';

(global as unknown as { IntersectionObserver: unknown }).IntersectionObserver =
  jest.fn().mockImplementation(() => ({
    observe: jest.fn(),
    unobserve: jest.fn(),
    disconnect: jest.fn(),
  }));

const setupBulkMode = async (): Promise<{
  viewerState: DataProductViewerState;
  dataAccessState: DataProductDataAccessState;
  representativeApgState: DataProductAPGState;
  defaultApg: V1_AccessPointGroup;
}> => {
  const viewerState =
    await TEST__getDataProductViewerState(mockSDLCDataProduct);
  const dataAccessState = TEST__getDataProductDataAccessState(
    viewerState,
    mockEntitlementsSDLCDataProduct,
  );
  const representativeApgState = guaranteeNonNullable(viewerState.apgStates[0]);
  const defaultApg = guaranteeNonNullable(
    viewerState.product.accessPointGroups[0],
  );
  return { viewerState, dataAccessState, representativeApgState, defaultApg };
};

const buildModelAccessPointGroup = (id: string): V1_ModelAccessPointGroup => {
  const apg = new V1_ModelAccessPointGroup();
  apg.id = id;
  const mappingPointer = new V1_PackageableElementPointer(
    PackageableElementPointerType.MAPPING,
    'test::mapping::TestMapping',
  );
  apg.mapping = mappingPointer;
  return apg;
};

const renderCreator = async (
  viewerState: DataProductViewerState,
  props: {
    dataAccessState: DataProductDataAccessState;
    apgState: DataProductAPGState;
    overrideTargetApgs: V1_AccessPointGroup[];
    onClose?: () => void;
    headerContent?: React.ReactNode;
  },
): Promise<void> => {
  const {
    dataAccessState,
    apgState,
    overrideTargetApgs,
    onClose,
    headerContent,
  } = props;
  await act(async () => {
    render(
      <ApplicationStoreProvider store={viewerState.applicationStore}>
        <EntitlementsDataContractCreator
          open={true}
          onClose={onClose ?? jest.fn()}
          tokenProvider={(): string => 'test-token'}
          apgState={apgState}
          dataAccessState={dataAccessState}
          overrideTargetApgs={overrideTargetApgs}
          headerContent={headerContent ?? <span>bulk-mode-header</span>}
        />
      </ApplicationStoreProvider>,
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
};

describe(
  integrationTest('EntitlementsDataContractCreator - bulk mode rendering'),
  () => {
    test('renders the dialog with the caller-provided bulk header content', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg],
        headerContent: <span>Submit access request for 2 APGs</span>,
      });

      expect(screen.getByText('Data Contract Request')).toBeDefined();
      expect(
        screen.getByText('Submit access request for 2 APGs'),
      ).toBeDefined();
    });

    test('renders the default consumer type buttons when no target is a Model APG', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg],
      });

      expect(screen.getByRole('button', { name: 'User' })).toBeDefined();
      expect(
        screen.getByRole('button', { name: 'System Account' }),
      ).toBeDefined();
      expect(screen.getByRole('button', { name: 'Producer' })).toBeDefined();
    });

    test('hides the System Account consumer type when any target is a Model APG', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();

      const modelApg = buildModelAccessPointGroup('MODEL_APG');

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg, modelApg],
      });

      expect(screen.getByRole('button', { name: 'User' })).toBeDefined();
      expect(screen.getByRole('button', { name: 'Producer' })).toBeDefined();
      expect(
        screen.queryByRole('button', { name: 'System Account' }),
      ).toBeNull();
    });

    test('renders Create disabled and Cancel enabled by default', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg],
      });

      const createButton = screen.getByRole('button', { name: 'Create' });
      expect(createButton.hasAttribute('disabled')).toBe(true);
      const cancelButton = screen.getByRole('button', { name: 'Cancel' });
      expect(cancelButton.hasAttribute('disabled')).toBe(false);
    });

    test('clicking Cancel invokes the onClose callback', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();
      const onClose = jest.fn();

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg],
        onClose,
      });

      fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    test('renders a business justification input for the default (User) consumer type', async () => {
      const {
        viewerState,
        dataAccessState,
        representativeApgState,
        defaultApg,
      } = await setupBulkMode();

      await renderCreator(viewerState, {
        dataAccessState,
        apgState: representativeApgState,
        overrideTargetApgs: [defaultApg],
      });

      const dialog = within(
        guaranteeNonNullable(
          document.querySelector<HTMLElement>('[role="dialog"]'),
        ),
      );
      expect(dialog.getByLabelText(/Business Justification/i)).toBeDefined();
    });
  },
);
