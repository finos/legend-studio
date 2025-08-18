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

import React from 'react';
import { Handle, Position } from 'reactflow';
import { clsx } from '@finos/legend-art';

export interface PropertyOwnerNodeData {
  label: string;
  isPropertyOwner: boolean;
  highlightedProperties?: Set<string> | undefined;
  allProperties?:
    | Array<{
        name: string;
        dataType?: string | undefined;
        propertyType: string | undefined;
      }>
    | undefined;
  isSelected?: boolean | undefined;
  isHighlighted?: boolean | undefined;
}

export const PropertyOwnerNode = (props: { data: PropertyOwnerNodeData }) => {
  const { data } = props;
  const {
    label,
    isPropertyOwner,
    highlightedProperties,
    allProperties,
    isSelected,
    isHighlighted,
  } = data;

  const hasHighlightedProperties =
    !!highlightedProperties && highlightedProperties.size > 0;
  const showPropertyList = isPropertyOwner && hasHighlightedProperties;

  const safeAllProperties = Array.isArray(allProperties) ? allProperties : [];

  const filteredProperties = safeAllProperties
    .filter((prop) => highlightedProperties?.has(prop.name))
    .slice(0, 20);

  const remainingCount = Math.max(
    0,
    safeAllProperties.filter((prop) => highlightedProperties?.has(prop.name))
      .length - 20,
  );

  const needsScrolling = filteredProperties.length > 4;

  return (
    <>
      <Handle type="target" position={Position.Left} style={{ left: -5 }} />
      <div
        className={clsx('property-owner-node', {
          'property-owner-node--selected': isSelected,
          'property-owner-node--highlighted': isHighlighted,
          'property-owner-node--with-properties': showPropertyList,
          'property-owner-node--property-owner': isPropertyOwner,
          'property-owner-node--scrollable': needsScrolling,
        })}
        style={{
          width: '100%',
          height: '100%',
          minHeight: showPropertyList ? '160px' : '80px',
          overflow: 'hidden',
          position: 'absolute',
          top: 0,
          left: 0,
          margin: 0,
          padding: 0,
          boxSizing: 'border-box',
        }}
      >
        <div className="property-owner-node__header">
          <div className="property-owner-node__title">{label}</div>
          {isPropertyOwner && (
            <div className="property-owner-node__badge">
              {safeAllProperties.length} properties
            </div>
          )}
        </div>
        {showPropertyList && (
          <div className="property-owner-node__properties">
            <div
              className={clsx('property-owner-node__properties-list', {
                'property-owner-node__properties-list--scrollable':
                  needsScrolling,
              })}
            >
              {filteredProperties.map((property) => {
                const propertyIsSelected = highlightedProperties.has(
                  property.name,
                );
                return (
                  <div
                    key={property.name}
                    className={clsx('property-owner-node__property', {
                      'property-owner-node__property--selected':
                        propertyIsSelected,
                    })}
                  >
                    <div className="property-owner-node__property-name">
                      {property.name}
                    </div>
                    <div className="property-owner-node__property-meta">
                      <span className="property-owner-node__property-type">
                        {property.dataType ?? 'Unknown'}
                      </span>
                      <span className="property-owner-node__property-scope">
                        {property.propertyType ?? 'Unknown'}
                      </span>
                    </div>
                  </div>
                );
              })}
              {remainingCount > 0 && (
                <div className="property-owner-node__property property-owner-node__property--more">
                  <div className="property-owner-node__property-name">
                    ... and {remainingCount} more
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} style={{ right: -5 }} />
    </>
  );
};
