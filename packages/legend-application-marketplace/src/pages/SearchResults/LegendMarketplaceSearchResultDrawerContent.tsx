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
import DOMPurify from 'dompurify';

export const LegendMarketplaceSearchResultDrawerContent = (props: {
  productSearchResult: ProductSearchResult | undefined;
}) => {
  const { productSearchResult } = props;

  if (productSearchResult === undefined) {
    return null;
  }

  const vendorNameHTML = {
    __html: DOMPurify.sanitize(productSearchResult.vendor_name),
  };
  const dataProductNameHTML = {
    __html: DOMPurify.sanitize(productSearchResult.data_product_name),
  };
  const dataProductDescriptionHTML = {
    __html: DOMPurify.sanitize(productSearchResult.data_product_description),
  };

  return (
    <div className="legend-marketplace-search-results__drawer">
      <div
        dangerouslySetInnerHTML={vendorNameHTML}
        className="legend-marketplace-search-results__drawer__vendor-name"
      />
      <div
        dangerouslySetInnerHTML={dataProductNameHTML}
        className="legend-marketplace-search-results__drawer__data-product-name"
      />
      <div
        dangerouslySetInnerHTML={dataProductDescriptionHTML}
        className="legend-marketplace-search-results__drawer__data-product-description"
      />
      <hr />
      <div className="legend-marketplace-search-results__drawer__tables">
        {productSearchResult.tables.map((table) => {
          const tableNameHTML = {
            __html: DOMPurify.sanitize(table.table_name),
          };
          const tableDescriptionHTML = {
            __html: DOMPurify.sanitize(table.table_description),
          };

          return (
            <Card
              key={table.table_name}
              variant="outlined"
              className="legend-marketplace-search-results__drawer__table-card"
            >
              <CardContent className="legend-marketplace-search-results__drawer__table-card__content">
                <div className="legend-marketplace-search-results__drawer__table-card__name">
                  <strong>Table Name: </strong>
                  <span dangerouslySetInnerHTML={tableNameHTML} />
                </div>
                <div className="legend-marketplace-search-results__drawer__table-card__description">
                  <strong>Description: </strong>
                  <span dangerouslySetInnerHTML={tableDescriptionHTML} />
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
                        {table.table_fields.map((field) => {
                          const fieldNameHTML = {
                            __html: DOMPurify.sanitize(field.field_name),
                          };
                          const fieldDescriptionHTML = {
                            __html: DOMPurify.sanitize(field.field_description),
                          };
                          return (
                            <TableRow key={field.field_name}>
                              <TableCell
                                dangerouslySetInnerHTML={fieldNameHTML}
                              />
                              <TableCell
                                dangerouslySetInnerHTML={fieldDescriptionHTML}
                              />
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </TableContainer>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
