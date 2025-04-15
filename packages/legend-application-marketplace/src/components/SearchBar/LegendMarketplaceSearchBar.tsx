import { type JSX, useState } from 'react';
import { Button, InputAdornment, TextField } from '@mui/material';
import { SearchIcon } from '@finos/legend-art';

export interface Vendor {
  provider: string;
  description: string;
  type: string;
}

export const LegendMarketplaceSearchBar = (props: {
  onSearch: (provider: string | undefined, query: string | undefined) => void;
}): JSX.Element => {
  const { onSearch } = props;

  const [searchQuery, setSearchQuery] = useState<string>('');

  return (
    <div className="legend-marketplace__search-bar">
      <TextField
        type="search"
        placeholder="Search"
        fullWidth={true}
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value);
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          height: '100%',
          '& .MuiOutlinedInput-root': {
            height: '100%',
            borderTopRightRadius: 0,
            borderBottomRightRadius: 0,
          },
        }}
      />
      <Button
        onClick={() => onSearch(undefined, searchQuery)}
        variant="contained"
        disabled={!searchQuery}
      >
        Go
      </Button>
    </div>
  );
};
