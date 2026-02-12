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
  type DataQualityValidationFilterCondition,
  type DataQualityValidationFilterFunction,
  DataQualityValidationLogicalGroupFunction,
} from '../utils/DataQualityValidationFunction.js';
import type { DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS } from '../constants/DataQualityConstants.js';
import type { DataQualityValidationFunctionFactory } from './DataQualityValidationFunctionFactory.js';
import { type ObserverContext } from '@finos/legend-graph';
import { observe_DataQualityValidationLogicalGroupFunction } from './DataQualityValidationFunctionObserver.js';
import { DataQualityValidationFilterFunctionsCloningVisitor } from './DataQualityValidationFunctionCloningVisitor.js';
import { action } from 'mobx';

export const dataQualityValidationFilterFunction_addLogicalOperation = action(
  (
    target: DataQualityValidationFilterFunction,
    currentCondition: DataQualityValidationFilterCondition,
    operator: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
    factory: DataQualityValidationFunctionFactory,
    observerContext: ObserverContext,
  ): void => {
    const visitor = new DataQualityValidationFilterFunctionsCloningVisitor(
      currentCondition.name,
      factory,
      observerContext,
    );
    const newCondition = currentCondition.accept(visitor);

    const logicalGroup = factory.createLogicalFunction(operator);
    logicalGroup.parameters.left = currentCondition;
    logicalGroup.parameters.right = newCondition;

    observe_DataQualityValidationLogicalGroupFunction(logicalGroup);

    target.parameters.lambda.body = logicalGroup;
  },
);

export const dataQualityValidationFilterFunction_transformConditionToLogicalGroup =
  action(
    (
      target: DataQualityValidationFilterFunction,
      conditionToTransform: DataQualityValidationFilterCondition,
      operator: DATA_QUALITY_VALIDATION_LOGICAL_FUNCTIONS,
      factory: DataQualityValidationFunctionFactory,
      observerContext: ObserverContext,
    ): void => {
      const createGroup = () => {
        const visitor = new DataQualityValidationFilterFunctionsCloningVisitor(
          conditionToTransform.name,
          factory,
          observerContext,
        );
        const newCondition = conditionToTransform.accept(visitor);
        const logicalGroup = factory.createLogicalFunction(operator);
        logicalGroup.parameters.left = conditionToTransform;
        logicalGroup.parameters.right = newCondition;
        observe_DataQualityValidationLogicalGroupFunction(logicalGroup);
        return logicalGroup;
      };
      const replaceConditionInTree = (
        node:
          | DataQualityValidationFilterCondition
          | DataQualityValidationLogicalGroupFunction,
      ): boolean => {
        if (node === conditionToTransform) {
          target.parameters.lambda.body = createGroup();
          return true;
        }

        // If this is a logical group, check its branches
        if (node instanceof DataQualityValidationLogicalGroupFunction) {
          if (node.parameters.left === conditionToTransform) {
            node.parameters.left = createGroup();
            return true;
          }

          // Check right branch
          if (node.parameters.right === conditionToTransform) {
            node.parameters.right = createGroup();
            return true;
          }

          // Recursively search in child branches
          return (
            replaceConditionInTree(node.parameters.left) ||
            replaceConditionInTree(node.parameters.right)
          );
        }

        return false;
      };

      replaceConditionInTree(target.parameters.lambda.body);
    },
  );

export const dataQualityValidationFilterFunction_deleteCondition = action(
  (
    target: DataQualityValidationFilterFunction,
    conditionToDelete: DataQualityValidationFilterCondition,
  ) => {
    const deleteFromTree = (
      node:
        | DataQualityValidationFilterCondition
        | DataQualityValidationLogicalGroupFunction,
      parent?: DataQualityValidationLogicalGroupFunction,
      isLeftChild?: boolean,
    ): boolean => {
      if (node instanceof DataQualityValidationLogicalGroupFunction) {
        if (node.parameters.left === conditionToDelete) {
          // Replace this logical group with the right child (keep the sibling)
          if (parent) {
            if (isLeftChild) {
              parent.parameters.left = node.parameters.right;
            } else {
              parent.parameters.right = node.parameters.right;
            }
          } else {
            target.parameters.lambda.body = node.parameters.right;
          }
          return true;
        }

        if (node.parameters.right === conditionToDelete) {
          // Replace this logical group with the left child (keep the sibling)
          if (parent) {
            if (isLeftChild) {
              parent.parameters.left = node.parameters.left;
            } else {
              parent.parameters.right = node.parameters.left;
            }
          } else {
            // This is the root logical group
            target.parameters.lambda.body = node.parameters.left;
          }
          return true;
        }

        // Recursively search in child branches
        return (
          deleteFromTree(node.parameters.left, node, true) ||
          deleteFromTree(node.parameters.right, node, false)
        );
      }

      return false;
    };

    deleteFromTree(target.parameters.lambda.body);
  },
);

export const dataQualityValidationLogicalGroupFunction_changeGroupFunction =
  action(
    (
      logicalGroup: DataQualityValidationLogicalGroupFunction,
      newFunctionName: string,
      childToChange: 'left' | 'right',
      factory: DataQualityValidationFunctionFactory,
      observerContext: ObserverContext,
    ) => {
      const currentChild =
        childToChange === 'left'
          ? logicalGroup.parameters.left
          : logicalGroup.parameters.right;

      const visitor = new DataQualityValidationFilterFunctionsCloningVisitor(
        newFunctionName,
        factory,
        observerContext,
      );

      if (childToChange === 'left') {
        logicalGroup.parameters.left = currentChild.accept(visitor);
      } else {
        logicalGroup.parameters.right = currentChild.accept(visitor);
      }
    },
  );
