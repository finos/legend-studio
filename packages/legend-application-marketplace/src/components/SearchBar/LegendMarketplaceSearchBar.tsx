import { type JSX, useState } from 'react';
import { TextField } from '@mui/material';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = (): JSX.Element => {
  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <div className="legend-marketplace__search-bar">
      <TextField
        type="search"
        fullWidth={true}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
        }}
      />
    </div>
  );
};
