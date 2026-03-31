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

import { afterEach, expect, jest, test } from '@jest/globals';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import {
  TEST__provideMockLegendMarketplaceBaseStore,
  TEST__setUpMarketplaceLakehouse,
} from '../../__test-utils__/LegendMarketplaceStoreTestUtils.js';
import { createSpy } from '@finos/legend-shared/test';
import { guaranteeNonNullable } from '@finos/legend-shared';

jest.mock('react-oidc-context', () => {
  const { MOCK__reactOIDCContext } = jest.requireActual<{
    MOCK__reactOIDCContext: unknown;
  }>('@finos/legend-shared/test');
  return MOCK__reactOIDCContext;
});

const setupTestComponent = async () => {
  const MOCK__baseStore = await TEST__provideMockLegendMarketplaceBaseStore();

  const { renderResult } =
    await TEST__setUpMarketplaceLakehouse(MOCK__baseStore);

  return { MOCK__baseStore, renderResult };
};

afterEach(() => {
  jest.useRealTimers();
});

test('renders feedback toggle button', async () => {
  await setupTestComponent();

  expect(screen.getByLabelText('Send feedback')).toBeDefined();
});

test('opens feedback popup when toggle button is clicked', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  expect(screen.getByText('Marketplace Feedback')).toBeDefined();
  expect(screen.getByText('How would you rate your experience?')).toBeDefined();
  expect(
    screen.getByPlaceholderText(
      'Spill the tea ☕ — what would make Marketplace better?',
    ),
  ).toBeDefined();
});

test('closes feedback popup when toggle button is clicked again', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  expect(screen.getByText('Marketplace Feedback')).toBeDefined();

  fireEvent.click(toggleButton);

  await waitFor(() => {
    expect(screen.queryByText('Marketplace Feedback')).toBeNull();
  });
});

test('submit button is disabled when no rating is selected', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const submitButton = screen.getByText('Submit').closest('button');
  expect(submitButton?.disabled).toBe(true);
});

test('submit button is enabled when a rating is selected', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  expect(stars).toBeDefined();
  expect(stars?.length).toBe(5);

  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[3]));

  const submitButton = screen.getByText('Submit').closest('button');
  expect(submitButton?.disabled).toBe(false);
});

test('submits feedback successfully and shows success message', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockResolvedValue({
    response_code: '200',
    status: 'success',
    error_message: null,
  });

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[4]));

  const textarea = screen.getByPlaceholderText(
    'Spill the tea ☕ — what would make Marketplace better?',
  );
  fireEvent.change(textarea, { target: { value: 'Great product!' } });

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText('Thank you!')).toBeDefined();
    expect(
      screen.getByText('Your feedback has been submitted successfully.'),
    ).toBeDefined();
  });
});

test('calls submitFeedback with expected FeedbackRequest payload', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockResolvedValue({
    response_code: '200',
    status: 'success',
    error_message: null,
  });

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[3]));

  const textarea = screen.getByPlaceholderText(
    'Spill the tea ☕ — what would make Marketplace better?',
  );
  fireEvent.change(textarea, {
    target: { value: 'Needs better documentation' },
  });

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledTimes(1);
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledWith({
      username: expect.any(String),
      origin_page: expect.any(String),
      query: '',
      filters: '',
      rating: 4,
      suggestion: 'Needs better documentation',
    });
  });
});

test('calls submitFeedback with correct rating and empty suggestion when no comment is provided', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockResolvedValue({
    response_code: '200',
    status: 'success',
    error_message: null,
  });

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[0]));

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledTimes(1);
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 1,
        suggestion: '',
      }),
    );
  });
});

test('calls submitFeedback even when submission results in error', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockRejectedValue(new Error('Server unavailable'));

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[1]));

  const textarea = screen.getByPlaceholderText(
    'Spill the tea ☕ — what would make Marketplace better?',
  );
  fireEvent.change(textarea, { target: { value: 'Fix the bugs' } });

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(
      screen.getByText('Failed to submit feedback. Please try again.'),
    ).toBeDefined();
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledTimes(1);
    expect(
      MOCK__baseStore.marketplaceServerClient.submitFeedback,
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        rating: 2,
        suggestion: 'Fix the bugs',
      }),
    );
  });
});

test('shows error message when feedback submission fails', async () => {
  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockRejectedValue(new Error('Network error'));

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[2]));

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(
      screen.getByText('Failed to submit feedback. Please try again.'),
    ).toBeDefined();
  });
});

test('displays character count for suggestion textarea', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  expect(screen.getByText('0/1000')).toBeDefined();

  const textarea = screen.getByPlaceholderText(
    'Spill the tea ☕ — what would make Marketplace better?',
  );
  fireEvent.change(textarea, { target: { value: 'Test suggestion' } });

  expect(screen.getByText('15/1000')).toBeDefined();
});

test('closes popup via close button in header', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  expect(screen.getByText('Marketplace Feedback')).toBeDefined();

  const closeButton = screen.getByTitle('Close feedback');
  expect(closeButton).toBeDefined();
  fireEvent.click(closeButton);

  await waitFor(() => {
    expect(screen.queryByText('Marketplace Feedback')).toBeNull();
  });
});

test('auto-closes popup after successful submission', async () => {
  jest.useFakeTimers();

  const { MOCK__baseStore } = await setupTestComponent();

  createSpy(
    MOCK__baseStore.marketplaceServerClient,
    'submitFeedback',
  ).mockResolvedValue({
    response_code: '200',
    status: 'success',
    error_message: null,
  });

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[4]));

  const submitButton = guaranteeNonNullable(
    screen.getByText('Submit').closest('button'),
  );
  fireEvent.click(submitButton);

  await waitFor(() => {
    expect(screen.getByText('Thank you!')).toBeDefined();
  });

  await act(async () => {
    jest.advanceTimersByTime(5300);
  });

  await waitFor(() => {
    expect(screen.queryByText('Thank you!')).toBeNull();
  });
});

test('resets form state when popup is closed and reopened', async () => {
  await setupTestComponent();

  const toggleButton = screen.getByLabelText('Send feedback');
  fireEvent.click(toggleButton);

  const stars = screen
    .getByText('How would you rate your experience?')
    .closest('.legend-marketplace-feedback-widget__rating-section')
    ?.querySelectorAll('.legend-marketplace-feedback-widget__star');
  fireEvent.click(guaranteeNonNullable(guaranteeNonNullable(stars)[3]));

  const textarea = screen.getByPlaceholderText(
    'Spill the tea ☕ — what would make Marketplace better?',
  );
  fireEvent.change(textarea, { target: { value: 'Some text' } });

  fireEvent.click(toggleButton);
  fireEvent.click(toggleButton);

  const submitButton = screen.getByText('Submit').closest('button');
  expect(submitButton?.disabled).toBe(true);
  expect(screen.getByText('0/1000')).toBeDefined();
});
