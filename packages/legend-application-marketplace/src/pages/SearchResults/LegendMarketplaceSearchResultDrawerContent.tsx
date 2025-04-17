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

import { type ProductSearchResult } from '@finos/legend-server-marketplace';
import {
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';

export const LegendMarketplaceSearchResultDrawerContent = (props: {
  productSearchResult: ProductSearchResult | undefined;
}) => {
  const { productSearchResult } = props;

  if (productSearchResult === undefined) {
    return null;
  }

  return (
    <div className="legend-marketplace-search-results__drawer">
      <div className="legend-marketplace-search-results__drawer__vendor-name">
        {productSearchResult.vendor_name}
      </div>
      <div className="legend-marketplace-search-results__drawer__data-product-name">
        {productSearchResult.data_product_name}
      </div>
      <div className="legend-marketplace-search-results__drawer__data-product-description">
        {productSearchResult.data_product_description}
      </div>
      <hr />
      <div className="legend-marketplace-search-results__drawer__tables">
        {productSearchResult.tables.map((table) => (
          <Card
            key={table.table_name}
            variant="outlined"
            className="legend-marketplace-search-results__drawer__table-card"
          >
            <CardContent className="legend-marketplace-search-results__drawer__table-card__content">
              <div className="legend-marketplace-search-results__drawer__table-card__name">
                <strong>Table Name: </strong> {table.table_name}
              </div>
              <div className="legend-marketplace-search-results__drawer__table-card__description">
                <strong>Description: </strong> {table.table_description}
              </div>
              {table.table_fields.length > 0 && (
                <TableContainer className="legend-marketplace-search-results__drawer__table-card__table">
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Field Name</TableCell>
                        <TableCell>Field Description</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {table.table_fields.map((field) => (
                        <TableRow key={field.field_name}>
                          <TableCell>{field.field_name}</TableCell>
                          <TableCell>{field.field_description}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};
