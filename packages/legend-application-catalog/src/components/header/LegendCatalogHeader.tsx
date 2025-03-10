import {
  ControlledDropdownMenu,
  MenuContent,
  MenuContentItem,
  MenuIcon,
} from '@finos/legend-art';
import { observer } from 'mobx-react-lite';
import { useState } from 'react';
import { LegendCatalogAppInfo } from './LegendCatalogAppInfo.js';

const LegendCatalogHeaderMenu = observer(() => {
  // about modal
  const [openAppInfo, setOpenAppInfo] = useState(false);
  const showAppInfo = (): void => setOpenAppInfo(true);
  const hideAppInfo = (): void => setOpenAppInfo(false);

  return (
    <>
      <div className="legend-catalog-header__menu">
        <ControlledDropdownMenu
          className="legend-catalog-header__menu-item"
          menuProps={{
            anchorOrigin: { vertical: 'top', horizontal: 'right' },
            transformOrigin: { vertical: 'top', horizontal: 'left' },
            elevation: 7,
          }}
          content={
            <MenuContent>
              <MenuContentItem onClick={showAppInfo}>About</MenuContentItem>
            </MenuContent>
          }
        >
          <MenuIcon />
        </ControlledDropdownMenu>
      </div>
      <LegendCatalogAppInfo open={openAppInfo} closeModal={hideAppInfo} />
    </>
  );
});

export const LegendCatalogHeader = observer(() => {
  return (
    <div className="legend-catalog-header">
      <LegendCatalogHeaderMenu />
      <div className="legend-catalog-header__name">Legend Catalog</div>
    </div>
  );
});
