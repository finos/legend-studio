/**
 * Copyright (c) 2020-present, Goldman Sachs
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

import { expect, jest, test, beforeEach, describe } from '@jest/globals';
import { renderHook } from '@testing-library/react';
import { useSyncStateAndSearchParam } from '../URLUtils.js';
import type { SetURLSearchParams } from 'react-router';

// Helper to wait for microtask queue to flush
const flushMicrotasks = (): Promise<void> =>
  new Promise((resolve) => queueMicrotask(resolve));

describe('useSyncStateAndSearchParam', () => {
  let mockSetSearchParams: jest.Mock;

  beforeEach(() => {
    mockSetSearchParams = jest.fn();
  });

  test('should only update state from URL when state is null or undefined', () => {
    let stateVar: string | undefined;
    const updateStateVar = jest.fn((val: string | null) => {
      stateVar = val === null ? undefined : val;
    });
    const searchParamValue: string | null = 'initial-value';
    const initializedCallback = () => true;

    renderHook(() =>
      useSyncStateAndSearchParam(
        stateVar,
        updateStateVar,
        'testParam',
        searchParamValue,
        mockSetSearchParams,
        initializedCallback,
      ),
    );

    // Initial call should update state with the URL param value
    expect(updateStateVar).toHaveBeenCalledWith('initial-value');
    expect(stateVar).toBe('initial-value');
  });

  test('should update URL parameter when state value changes', async () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => true;

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          'new-state-value',
          updateStateVar,
          'testParam',
          null,
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    // Wait for microtask queue to flush (queueMicrotask is used for batching)
    await flushMicrotasks();

    // Should call setSearchParams to update the URL
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params = new URLSearchParams();
    const newParams = setParamsFn(params);
    expect(newParams.get('testParam')).toBe('new-state-value');
  });

  test('should delete URL parameter when state value is set to null', async () => {
    let stateVar: string | null = 'old-value';
    const updateStateVar = jest.fn((val: string | null) => {
      stateVar = val;
    });
    let searchParamValue: string | null = null;
    const updateSearchParam = jest.fn((setter) => {
      if (typeof setter === 'function') {
        const prev = new URLSearchParams();
        const result = setter(prev) as Map<string, string>;
        searchParamValue = result.get('testParam') ?? null;
      }
    }) as SetURLSearchParams;
    const initializedCallback = () => true;

    const { rerender } = renderHook(
      () =>
        useSyncStateAndSearchParam(
          stateVar,
          updateStateVar,
          'testParam',
          searchParamValue,
          updateSearchParam,
          initializedCallback,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Check that URL param was updated once to expected value
    expect(updateSearchParam).toHaveBeenCalledTimes(1);
    expect(searchParamValue).toBe('old-value');

    // Update state to null
    stateVar = null;

    rerender();

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams to delete the URL param
    expect(updateSearchParam).toHaveBeenCalledTimes(2);
    const setParamsFn = (updateSearchParam as jest.Mock).mock.calls[1]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params = new URLSearchParams('testParam=old-value');
    const newParams = setParamsFn(params);
    expect(newParams.has('testParam')).toBe(false);
  });

  test('should delete URL parameter when state value is set to undefined', async () => {
    let stateVar: string | undefined = 'old-value';
    const updateStateVar = jest.fn((val: string | null) => {
      stateVar = val === null ? undefined : val;
    });
    let searchParamValue: string | null = null;
    const updateSearchParam = jest.fn((setter) => {
      if (typeof setter === 'function') {
        const prev = new URLSearchParams();
        const result = setter(prev) as Map<string, string>;
        searchParamValue = result.get('testParam') ?? null;
      }
    }) as SetURLSearchParams;
    const initializedCallback = () => true;

    const { rerender } = renderHook(
      () =>
        useSyncStateAndSearchParam(
          stateVar,
          updateStateVar,
          'testParam',
          searchParamValue,
          updateSearchParam,
          initializedCallback,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Check that URL param was updated once to expected value
    expect(updateSearchParam).toHaveBeenCalledTimes(1);
    expect(searchParamValue).toBe('old-value');

    // Update state to undefined
    stateVar = undefined;

    rerender();

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams to delete the URL param
    expect(updateSearchParam).toHaveBeenCalledTimes(2);
    const setParamsFn = (updateSearchParam as jest.Mock).mock.calls[1]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params = new URLSearchParams('testParam=old-value');
    const newParams = setParamsFn(params);
    expect(newParams.has('testParam')).toBe(false);
  });

  test('should only update the specific URL parameter while preserving others when multiple params exist', async () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => true;

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          'new-test-value',
          updateStateVar,
          'testParam',
          'test-value',
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;

    // Simulate multiple params in the URLSearchParams
    const params = new URLSearchParams(
      'testParam=old-test-value&otherParam=other-value&anotherParam=another-value',
    );
    const newParams = setParamsFn(params);

    // Verify testParam is updated
    expect(newParams.get('testParam')).toBe('new-test-value');
    // Verify other params are preserved
    expect(newParams.get('otherParam')).toBe('other-value');
    expect(newParams.get('anotherParam')).toBe('another-value');
  });

  test('should only update the specific state value while preserving others when multiple params exist', () => {
    let stateVar1: string | null = null;
    let stateVar2: string | null = 'value2';
    const updateStateVar1 = jest.fn((value: string | null) => {
      stateVar1 = value;
    });
    const updateStateVar2 = jest.fn((value: string | null) => {
      stateVar2 = value;
    });
    const searchParamValue1: string | null = 'initial-value1';
    const searchParamValue2: string | null = 'initial-value2';
    const initializedCallback = () => true;

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          stateVar1,
          updateStateVar1,
          'testParam1',
          searchParamValue1,
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          stateVar2,
          updateStateVar2,
          'testParam2',
          searchParamValue2,
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    // Initial call should only update null state value
    expect(updateStateVar1).toHaveBeenCalledWith('initial-value1');
    expect(stateVar1).toBe('initial-value1');
    expect(updateStateVar2).not.toHaveBeenCalled();
    expect(stateVar2).toBe('value2');
  });

  test('should only delete the specific URL parameter while preserving others when multiple params exist', async () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => true;

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          undefined,
          updateStateVar,
          'testParam',
          'test-value',
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;

    // Simulate multiple params in the URLSearchParams
    const params = new URLSearchParams(
      'testParam=old-value&otherParam=other-value&anotherParam=another-value',
    );
    const newParams = setParamsFn(params);

    // Verify testParam is deleted
    expect(newParams.has('testParam')).toBe(false);
    // Verify other params are preserved
    expect(newParams.get('otherParam')).toBe('other-value');
    expect(newParams.get('anotherParam')).toBe('another-value');
  });

  test('should not sync when initialized callback returns false', () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => false;

    renderHook(
      () =>
        useSyncStateAndSearchParam(
          'some-value',
          updateStateVar,
          'testParam',
          null,
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    // Should not call updateStateVar or setSearchParams
    expect(updateStateVar).not.toHaveBeenCalled();
    expect(mockSetSearchParams).not.toHaveBeenCalled();
  });
});
