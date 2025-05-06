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

import {
  V1_DataContractsRecordModelSchemaToContracts,
  V1_dataProductModelSchema,
} from '@finos/legend-graph';
import { Data_Product, CREATE_CONTRACT_RESPONSE } from './ContractTestData.js';
import { describe, expect, test } from '@jest/globals';
import { deserialize } from 'serializr';
import { guaranteeNonNullable } from '@finos/legend-shared';
import { dataContractContainsDataProduct } from '../LakehouseUtils.js';
import { buildDataContractDetail } from '../entitlements/DataContractState.js';

describe('DataContract and DataProduct Association', () => {
  test('should correctly deserialize and check association', () => {
    const contracts = V1_DataContractsRecordModelSchemaToContracts(
      CREATE_CONTRACT_RESPONSE,
    );
    expect(contracts.length).toBe(1);
    const dataContract = guaranteeNonNullable(contracts[0]);

    const product = deserialize(V1_dataProductModelSchema, Data_Product);

    const assoicated = dataContractContainsDataProduct(
      product,
      '10',
      dataContract,
    );
    expect(assoicated).toBe(true);
    const valueSet = new Map<string, string>();
    buildDataContractDetail(dataContract).forEach((e) => {
      expect(valueSet.has(e.name)).toBe(false);
      valueSet.set(e.name, e.value.toString());
    });

    expect(valueSet.get('Contract ID')).toBe('1');
    expect(valueSet.get('Contract Description')).toBe('test');
    expect(valueSet.get('Contract Version')).toBe('1');
    expect(valueSet.get('Contract State')).toBe(
      'Open for Privilege Manager Approval',
    );
    expect(valueSet.get('Contract Data ID')).toBe('2');
    expect(valueSet.get('Contract Data Product')).toBe('TestDataProduct');
    expect(valueSet.get('Contract Data Product DID')).toBe('10');
    expect(valueSet.get('Contract Access Group')).toBe('AccessGroup1');
    expect(valueSet.get('Contract Access Points')).toBe('simple');
    expect(valueSet.get('Contract Consumer Name (1)')).toBe('user1');
  });
});
