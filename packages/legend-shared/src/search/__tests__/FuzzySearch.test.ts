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

import { test, expect } from '@jest/globals';
import { unitTest } from '../../__test-utils__/TestUtils.js';
import { FuzzySearchEngine } from '../FuzzySearch.js';

test(unitTest('FuzzySearchEngine performs basic search correctly'), () => {
  // Test data
  const books = [
    { title: "Old Man's War", author: 'John Scalzi' },
    { title: 'The Lock Artist', author: 'Steve Hamilton' },
    { title: 'HTML5', author: 'Remy Sharp' },
    { title: 'Right Ho Jeeves', author: 'P.D. Woodhouse' },
  ];

  // Create a new FuzzySearchEngine instance
  const fuse = new FuzzySearchEngine(books, {
    keys: ['title', 'author'],
  });

  // Test exact match
  const result1 = fuse.search('old man');
  expect(result1.length).toBeGreaterThan(0);
  expect(result1[0].item.title).toBe("Old Man's War");

  // Test fuzzy match
  const result2 = fuse.search('wodehouse');
  expect(result2.length).toBeGreaterThan(0);
  expect(result2[0].item.author).toBe('P.D. Woodhouse');

  // Test no match
  const result3 = fuse.search('xyz123');
  expect(result3.length).toBe(0);
});

test(unitTest('FuzzySearchEngine handles different search options'), () => {
  const fruits = ['apple', 'banana', 'orange', 'pear', 'pineapple'];

  // Default options
  const defaultFuse = new FuzzySearchEngine(fruits);

  // Test with default options
  const defaultResult = defaultFuse.search('aple');
  expect(defaultResult.length).toBeGreaterThan(0);
  expect(defaultResult[0].item).toBe('apple');

  // Test with custom options - exact match only
  const exactFuse = new FuzzySearchEngine(fruits, {
    threshold: 0, // Exact match only
  });

  const exactResult1 = exactFuse.search('apple');
  expect(exactResult1.length).toBe(1);
  expect(exactResult1[0].item).toBe('apple');

  const exactResult2 = exactFuse.search('aple');
  expect(exactResult2.length).toBe(0); // No match with exact search
});

test(
  unitTest('FuzzySearchEngine handles complex objects and custom keys'),
  () => {
    // Test data with nested properties
    const people = [
      {
        name: { first: 'John', last: 'Doe' },
        location: { city: 'New York', country: 'USA' },
      },
      {
        name: { first: 'Jane', last: 'Smith' },
        location: { city: 'London', country: 'UK' },
      },
      {
        name: { first: 'Bob', last: 'Johnson' },
        location: { city: 'Paris', country: 'France' },
      },
    ];

    // Create a new FuzzySearchEngine instance with nested keys
    const fuse = new FuzzySearchEngine(people, {
      keys: ['name.first', 'name.last', 'location.city', 'location.country'],
    });

    // Test search by first name
    const result1 = fuse.search('john');
    expect(result1.length).toBeGreaterThan(0);
    expect(result1[0].item.name.first).toBe('John');

    // Test search by city
    const result2 = fuse.search('london');
    expect(result2.length).toBeGreaterThan(0);
    expect(result2[0].item.location.city).toBe('London');
    expect(result2[0].item.name.first).toBe('Jane');

    // Test search by country
    const result3 = fuse.search('france');
    expect(result3.length).toBeGreaterThan(0);
    expect(result3[0].item.location.country).toBe('France');
    expect(result3[0].item.name.first).toBe('Bob');
  },
);
