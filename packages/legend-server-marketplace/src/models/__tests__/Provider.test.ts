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

import { describe, expect, test } from '@jest/globals';
import {
  TerminalResult,
  TerminalItemType,
  TraderProfileItem,
  TraderProfile,
  RecommendationSource,
  ProductType,
} from '../Provider.js';

// ─── TerminalResult ───────────────────────────────────────────────────────────

describe('TerminalResult', () => {
  describe('terminalItemType getter', () => {
    test('returns TERMINAL for "Vendor Profile" category', () => {
      const item = new TerminalResult();
      item.category = 'Vendor Profile';
      expect(item.terminalItemType).toBe(TerminalItemType.TERMINAL);
    });

    test('returns TERMINAL for lowercase "vendor profile"', () => {
      const item = new TerminalResult();
      item.category = 'vendor profile';
      expect(item.terminalItemType).toBe(TerminalItemType.TERMINAL);
    });

    test('returns TERMINAL for uppercase "VENDOR PROFILE"', () => {
      const item = new TerminalResult();
      item.category = 'VENDOR PROFILE';
      expect(item.terminalItemType).toBe(TerminalItemType.TERMINAL);
    });

    test('returns ADD_ON for other categories', () => {
      const item = new TerminalResult();
      item.category = 'Market Data';
      expect(item.terminalItemType).toBe(TerminalItemType.ADD_ON);
    });

    test('returns ADD_ON for empty string category', () => {
      const item = new TerminalResult();
      item.category = '';
      expect(item.terminalItemType).toBe(TerminalItemType.ADD_ON);
    });

    test('returns ADD_ON for "Add-On" category', () => {
      const item = new TerminalResult();
      item.category = 'Add-On';
      expect(item.terminalItemType).toBe(TerminalItemType.ADD_ON);
    });
  });

  describe('serialization.fromJson', () => {
    test('deserializes required fields', () => {
      const json = {
        id: 42,
        category: 'Vendor Profile',
        providerName: 'Bloomberg',
        productName: 'Bloomberg Terminal',
        description: 'A professional terminal',
        price: 2000,
        phystr: 'phystr-123',
        model: 'BT-1',
        isOwned: false,
      };
      const result = TerminalResult.serialization.fromJson(json);
      expect(result).toBeInstanceOf(TerminalResult);
      expect(result.id).toBe(42);
      expect(result.category).toBe('Vendor Profile');
      expect(result.providerName).toBe('Bloomberg');
      expect(result.productName).toBe('Bloomberg Terminal');
      expect(result.description).toBe('A professional terminal');
      expect(result.price).toBe(2000);
      expect(result.phystr).toBe('phystr-123');
      expect(result.model).toBe('BT-1');
      expect(result.isOwned).toBe(false);
    });

    test('deserializes optional fields', () => {
      const json = {
        id: 1,
        category: 'Market Data',
        providerName: 'Reuters',
        productName: 'Reuters Feed',
        description: '',
        price: 500,
        phystr: '',
        model: null,
        isOwned: false,
        isMandatory: true,
        skipWorkflow: true,
        vendorProfileId: 99,
        permissionId: 77,
        source: RecommendationSource.CART,
      };
      const result = TerminalResult.serialization.fromJson(json);
      expect(result.isMandatory).toBe(true);
      expect(result.skipWorkflow).toBe(true);
      expect(result.vendorProfileId).toBe(99);
      expect(result.permissionId).toBe(77);
      expect(result.source).toBe(RecommendationSource.CART);
    });

    test('deserializes null model', () => {
      const json = {
        id: 1,
        category: 'Vendor Profile',
        providerName: 'Test',
        productName: 'Test Product',
        description: '',
        price: 100,
        phystr: '',
        model: null,
        isOwned: false,
      };
      const result = TerminalResult.serialization.fromJson(json);
      expect(result.model).toBeNull();
    });
  });
});

// ─── TerminalItemType enum ────────────────────────────────────────────────────

describe('TerminalItemType', () => {
  test('has correct string values', () => {
    expect(TerminalItemType.TERMINAL).toBe('Terminal');
    expect(TerminalItemType.ADD_ON).toBe('Add-On');
  });
});

// ─── ProductType enum ─────────────────────────────────────────────────────────

describe('ProductType', () => {
  test('has correct string values', () => {
    expect(ProductType.ALL).toBe('ALL');
    expect(ProductType.VENDOR_PROFILE).toBe('VENDOR_PROFILE');
    expect(ProductType.SERVICE_PRICING).toBe('SERVICE_PRICING');
    expect(ProductType.ORDER_PROFILE).toBe('ORDER_PROFILE');
  });
});

// ─── RecommendationSource enum ────────────────────────────────────────────────

describe('RecommendationSource', () => {
  test('has correct string values', () => {
    expect(RecommendationSource.CART).toBe('cart');
    expect(RecommendationSource.INVENTORY).toBe('inventory');
    expect(RecommendationSource.MARKETPLACE).toBe('marketplace');
  });
});

// ─── TraderProfileItem ────────────────────────────────────────────────────────

describe('TraderProfileItem', () => {
  describe('isTerminal getter', () => {
    test('returns true for "Vendor Profile" category', () => {
      const item = new TraderProfileItem();
      item.category = 'Vendor Profile';
      expect(item.isTerminal).toBe(true);
    });

    test('returns true for lowercase "vendor profile"', () => {
      const item = new TraderProfileItem();
      item.category = 'vendor profile';
      expect(item.isTerminal).toBe(true);
    });

    test('returns true for uppercase "VENDOR PROFILE"', () => {
      const item = new TraderProfileItem();
      item.category = 'VENDOR PROFILE';
      expect(item.isTerminal).toBe(true);
    });

    test('returns false for other categories', () => {
      const item = new TraderProfileItem();
      item.category = 'Market Data';
      expect(item.isTerminal).toBe(false);
    });

    test('returns false for empty category', () => {
      const item = new TraderProfileItem();
      item.category = '';
      expect(item.isTerminal).toBe(false);
    });
  });

  describe('serialization.fromJson', () => {
    test('deserializes required fields', () => {
      const json = {
        id: 10,
        category: 'Vendor Profile',
        providerName: 'Bloomberg',
        productName: 'Bloomberg Terminal',
        price: 2000,
      };
      const result = TraderProfileItem.serialization.fromJson(json);
      expect(result).toBeInstanceOf(TraderProfileItem);
      expect(result.id).toBe(10);
      expect(result.category).toBe('Vendor Profile');
      expect(result.providerName).toBe('Bloomberg');
      expect(result.productName).toBe('Bloomberg Terminal');
      expect(result.price).toBe(2000);
      expect(result.isTerminal).toBe(true);
    });

    test('deserializes optional fields', () => {
      const json = {
        id: 5,
        category: 'Market Data',
        providerName: 'Reuters',
        productName: 'Reuters Feed',
        price: 500,
        isOwned: true,
        vendorProfileId: 11,
        description: 'A data feed',
        phystr: 'phystr-456',
        model: 'Model X',
        isMandatory: false,
        skipWorkflow: true,
        permissionId: 22,
      };
      const result = TraderProfileItem.serialization.fromJson(json);
      expect(result.isOwned).toBe(true);
      expect(result.vendorProfileId).toBe(11);
      expect(result.description).toBe('A data feed');
      expect(result.phystr).toBe('phystr-456');
      expect(result.model).toBe('Model X');
      expect(result.isMandatory).toBe(false);
      expect(result.skipWorkflow).toBe(true);
      expect(result.permissionId).toBe(22);
    });

    test('isTerminal returns false for add-on item', () => {
      const json = {
        id: 1,
        category: 'Market Data',
        providerName: 'Reuters',
        productName: 'Feed',
        price: 100,
      };
      const result = TraderProfileItem.serialization.fromJson(json);
      expect(result.isTerminal).toBe(false);
    });
  });
});

// ─── TraderProfile ────────────────────────────────────────────────────────────

describe('TraderProfile', () => {
  describe('serialization.fromJson', () => {
    test('deserializes profile with items', () => {
      const json = {
        id: 1,
        productName: 'Pro Bundle',
        providerName: 'Bloomberg',
        price: 2500,
        multiselect: false,
        items: [
          {
            id: 10,
            category: 'Vendor Profile',
            providerName: 'Bloomberg',
            productName: 'Bloomberg Terminal',
            price: 2000,
          },
          {
            id: 11,
            category: 'Market Data',
            providerName: 'Bloomberg',
            productName: 'Data Feed',
            price: 500,
          },
        ],
      };
      const result = TraderProfile.serialization.fromJson(json);
      expect(result).toBeInstanceOf(TraderProfile);
      expect(result.id).toBe(1);
      expect(result.productName).toBe('Pro Bundle');
      expect(result.providerName).toBe('Bloomberg');
      expect(result.price).toBe(2500);
      expect(result.multiselect).toBe(false);
      expect(result.items).toHaveLength(2);
      expect(result.items[0]).toBeInstanceOf(TraderProfileItem);
      expect(result.items[0]?.isTerminal).toBe(true);
      expect(result.items[1]?.isTerminal).toBe(false);
    });

    test('deserializes profile with multiselect=true', () => {
      const json = {
        id: 2,
        productName: 'Multi Bundle',
        providerName: 'Reuters',
        price: 1000,
        multiselect: true,
        items: [],
      };
      const result = TraderProfile.serialization.fromJson(json);
      expect(result.multiselect).toBe(true);
      expect(result.items).toHaveLength(0);
    });

    test('deserializes optional description and isOwned', () => {
      const json = {
        id: 3,
        productName: 'Owned Bundle',
        providerName: 'Reuters',
        price: 500,
        multiselect: false,
        isOwned: true,
        description: 'A bundle description',
        items: [],
      };
      const result = TraderProfile.serialization.fromJson(json);
      expect(result.isOwned).toBe(true);
      expect(result.description).toBe('A bundle description');
    });

    test('items are properly deserialized as TraderProfileItem instances', () => {
      const json = {
        id: 4,
        productName: 'Bundle',
        providerName: 'Test',
        price: 300,
        multiselect: false,
        items: [
          {
            id: 100,
            category: 'Vendor Profile',
            providerName: 'Test',
            productName: 'Terminal',
            price: 200,
            model: 'TM-100',
          },
        ],
      };
      const result = TraderProfile.serialization.fromJson(json);
      const item = result.items[0];
      expect(item).toBeInstanceOf(TraderProfileItem);
      expect(item?.model).toBe('TM-100');
      expect(item?.isTerminal).toBe(true);
    });
  });
});
