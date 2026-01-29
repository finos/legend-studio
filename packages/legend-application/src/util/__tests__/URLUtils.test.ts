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
    let searchParamValue: string | null = 'initial-value';
    const initializedCallback = () => true;

    const { rerender } = renderHook(() =>
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

    // Clear mock to see only new calls
    updateStateVar.mockClear();

    // Change the URL param value
    searchParamValue = 'new-value';
    rerender();

    // updateSTateVar should not have been called again
    expect(updateStateVar).not.toHaveBeenCalled();
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
    let searchParamValue: string | null = 'old-param-value';
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

    // Check that URL param was updated once to expected value from state
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
    let searchParamValue: string | null = 'old-param-value';
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

    // Check that URL param was updated once to expected value from state
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

    renderHook(() =>
      useSyncStateAndSearchParam(
        stateVar1,
        updateStateVar1,
        'testParam1',
        searchParamValue1,
        mockSetSearchParams,
        initializedCallback,
      ),
    );

    renderHook(() =>
      useSyncStateAndSearchParam(
        stateVar2,
        updateStateVar2,
        'testParam2',
        searchParamValue2,
        mockSetSearchParams,
        initializedCallback,
      ),
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

  test('should queue multiple URL parameter updates in the same tick', async () => {
    let stateVar1: string | null = 'value1';
    let stateVar2: string | null = 'value2';
    const updateStateVar1 = jest.fn((value: string | null) => {
      stateVar1 = value;
    });
    const updateStateVar2 = jest.fn((value: string | null) => {
      stateVar2 = value;
    });
    const initializedCallback = () => true;

    const { rerender: rerender1 } = renderHook(
      () =>
        useSyncStateAndSearchParam(
          stateVar1,
          updateStateVar1,
          'testParam1',
          null,
          mockSetSearchParams,
          initializedCallback,
        ),
      {},
    );

    const { rerender: rerender2 } = renderHook(() =>
      useSyncStateAndSearchParam(
        stateVar2,
        updateStateVar2,
        'testParam2',
        null,
        mockSetSearchParams,
        initializedCallback,
      ),
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams only once for both updates
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;

    const params = new URLSearchParams();
    const newParams = setParamsFn(params);

    // Verify both params are set correctly
    expect(newParams.get('testParam1')).toBe('value1');
    expect(newParams.get('testParam2')).toBe('value2');

    // Update both state values
    stateVar1 = 'new-value1';
    stateVar2 = 'new-value2';

    rerender1();
    rerender2();

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams only once for both updates
    expect(mockSetSearchParams).toHaveBeenCalledTimes(2);
    const setParamsFn2 = mockSetSearchParams.mock.calls[1]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;

    const params2 = new URLSearchParams('testParam1=value1&testParam2=value2');
    const newParams2 = setParamsFn2(params2);

    // Verify both params are updated correctly
    expect(newParams2.get('testParam1')).toBe('new-value1');
    expect(newParams2.get('testParam2')).toBe('new-value2');
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

  test('should clear URL parameter on unmount if specified', async () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => true;

    const { unmount } = renderHook(
      () =>
        useSyncStateAndSearchParam(
          'state-value',
          updateStateVar,
          'testParam',
          null,
          mockSetSearchParams,
          initializedCallback,
          true,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Verify search param is set
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn1 = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params1 = new URLSearchParams();
    const newParams1 = setParamsFn1(params1);
    expect(newParams1.get('testParam')).toBe('state-value');

    // Clear mock to see only unmount calls
    mockSetSearchParams.mockClear();

    // Unmount the hook
    unmount();

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should call setSearchParams to delete the URL param
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn2 = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params2 = new URLSearchParams('testParam=some-value');
    const newParams2 = setParamsFn2(params2);
    expect(newParams2.has('testParam')).toBe(false);
  });

  test('should not clear URL parameter on unmount if specified', async () => {
    const updateStateVar = jest.fn();
    const initializedCallback = () => true;

    const { unmount } = renderHook(
      () =>
        useSyncStateAndSearchParam(
          'state-value',
          updateStateVar,
          'testParam',
          null,
          mockSetSearchParams,
          initializedCallback,
          false,
        ),
      {},
    );

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Verify search param is set
    expect(mockSetSearchParams).toHaveBeenCalledTimes(1);
    const setParamsFn1 = mockSetSearchParams.mock.calls[0]?.[0] as (
      params: URLSearchParams,
    ) => URLSearchParams;
    const params1 = new URLSearchParams();
    const newParams1 = setParamsFn1(params1);
    expect(newParams1.get('testParam')).toBe('state-value');

    // Clear mock to see only unmount calls
    mockSetSearchParams.mockClear();

    // Unmount the hook
    unmount();

    // Wait for microtask queue to flush
    await flushMicrotasks();

    // Should not call setSearchParams on unmount
    expect(mockSetSearchParams).not.toHaveBeenCalled();
  });
});
