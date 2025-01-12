/***********************************************************
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 **********************************************************/
 import * as React from 'react';
 import { Route, useRouteMatch, useLocation } from 'react-router-dom';
 import { useTranslation } from 'react-i18next';
 import { ModuleIdentityTwin } from '../../module/moduleIdentityTwin/components/moduleIdentityTwin';
 import { AddModuleIdentity } from '../../module/addModuleIdentity/components/addModuleIdentity';
 import { ModuleIdentityList } from '../../module/moduleIdentityList/components/moduleIdentityList';
 import { ModuleIdentityDetail } from '../../module/moduleIndentityDetail/components/moduleIdentityDetail';
 import { ModuleDirectMethod } from '../../module/moduleDirectMethod/components/moduleDirectMethod';
 import { BreadcrumbRoute } from '../../../navigation/components/breadcrumbRoute';
 import { ROUTE_PARTS } from '../../../constants/routes';
 import { ResourceKeys } from '../../../../localization/resourceKeys';
 import { getModuleIdentityIdFromQueryString } from '../../../shared/utils/queryStringHelper';
 import { Pnp } from '../../pnp/components/pnp';
 import { DeviceEvents } from '../../deviceEvents/components/deviceEvents';

 export const DeviceModules: React.FC = () => {
     const { url } = useRouteMatch();
     const { t } = useTranslation();
     const { search } = useLocation();
     const moduleId = getModuleIdentityIdFromQueryString(search);

     return (
         <>
             <Route exact={true} path={`${url}`} component={ModuleIdentityList}/>
             <BreadcrumbRoute
                 exact={true}
                 path={`${url}/${ROUTE_PARTS.ADD}`}
                 breadcrumb={{name: t(ResourceKeys.breadcrumb.addModuleIdentity)}}
                 children={<AddModuleIdentity/>}
             />

             <BreadcrumbRoute
                 exact={true}
                 path={`${url}/${ROUTE_PARTS.MODULE_DETAIL}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<ModuleIdentityDetail/>}
             />

             <BreadcrumbRoute
                 exact={true}
                 path={`${url}/${ROUTE_PARTS.MODULE_TWIN}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<ModuleIdentityTwin/>}
             />

             <BreadcrumbRoute
                 exact={true}
                 path={`${url}/${ROUTE_PARTS.MODULE_METHOD}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<ModuleDirectMethod/>}
             />

             <BreadcrumbRoute
                 path={`${url}/${ROUTE_PARTS.MODULE_EVENTS}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<DeviceEvents/>}
             />

             <BreadcrumbRoute
                 path={`${url}/${ROUTE_PARTS.DEVICE_VT_INFO}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<DeviceEvents/>}
             />

             <BreadcrumbRoute
                 path={`${url}/${ROUTE_PARTS.SENSOR_VT_INFO}`}
                 breadcrumb={{name: moduleId, suffix: search}}
                 children={<DeviceEvents/>}
             />

             <BreadcrumbRoute
                 path={`${url}/${ROUTE_PARTS.MODULE_PNP}`}
                 breadcrumb={{name: moduleId, disableLink: true, suffix: search}}
                 children={<Pnp/>}
             />
         </>
     );
 };
