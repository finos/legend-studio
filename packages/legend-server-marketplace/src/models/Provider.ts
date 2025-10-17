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

import { SerializationFactory } from '@finos/legend-shared';
import { createModelSchema, primitive } from 'serializr';

export interface LightProvider {
  description: string;
  provider: string;
  type: string;
}

export enum TerminalItemType {
  TERMINAL = 'Terminal',
  ADD_ON = 'Add-On',
}

export class TerminalResult {
  id!: number;
  category!: string;
  providerName!: string;
  productName!: string;
  description!: string;
  price!: number;
  phystr!: string;
  isOwned?: boolean;
  vendorProfileId?: number;

  static readonly serialization = new SerializationFactory(
    createModelSchema(TerminalResult, {
      id: primitive(),
      category: primitive(),
      providerName: primitive(),
      productName: primitive(),
      description: primitive(),
      price: primitive(),
      phystr: primitive(),
      isOwned: primitive(),
      vendorProfileId: primitive(),
    }),
  );

  get terminalItemType(): TerminalItemType {
    return this.category.toLowerCase() === 'vendor profile'
      ? TerminalItemType.TERMINAL
      : TerminalItemType.ADD_ON;
  }
}

export interface Filter {
  label: string;
  value: string;
}
