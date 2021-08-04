/***********************************************************
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License
 **********************************************************/
 import * as React from 'react';
 import { Twin } from 'azure-iothub';
 import { ChoiceGroup, IChoiceGroupOption } from 'office-ui-fabric-react/lib/components/ChoiceGroup';
 import { useLocation, useHistory, useRouteMatch, Route } from 'react-router-dom';
 import { Checkbox } from 'office-ui-fabric-react/lib/components/Checkbox';
 import { PrimaryButton } from 'office-ui-fabric-react/lib/components/Button';
 import { CommandBar, ICommandBarItemProps } from 'office-ui-fabric-react/lib/components/CommandBar';
 import { Label } from 'office-ui-fabric-react/lib/components/Label';
 import { Announced } from 'office-ui-fabric-react/lib/Announced';
 import { TextField, ITextFieldStyles } from 'office-ui-fabric-react/lib/TextField';
 import { DetailsList, DetailsListLayoutMode, Selection, IColumn } from 'office-ui-fabric-react/lib/DetailsList';
 import { MarqueeSelection } from 'office-ui-fabric-react/lib/MarqueeSelection';
 import { mergeStyles } from 'office-ui-fabric-react/lib/Styling';
 import { Text } from 'office-ui-fabric-react/lib/Text';
 import { render } from 'enzyme';
 import { useTranslation } from 'react-i18next';
 import * as DevicesService from '../../../../api/services/devicesService';
 import { pnpReducer } from '../../reducer';
 import { pnpSaga } from '../../saga';
 import { pnpStateInitial } from '../../state';
 import { getModelDefinitionAction, InvokeCommandActionParameters, invokeCommandAction, getDeviceTwinAction, updateDeviceTwinAction } from '../../actions';
 import { dispatchGetTwinAction, getBackUrl } from '../../utils';
 import { RepositoryLocationSettings } from '../../../../shared/global/state';
 import { useGlobalStateContext } from '../../../../shared/contexts/globalStateContext';
 import { getRepositoryLocationSettings } from '../../../../modelRepository/dataHelper';
 import { DeviceCommandsPerInterface } from './deviceCommandsPerInterface';
 import { ResourceKeys } from '../../../../../localization/resourceKeys';
 import { getDeviceIdFromQueryString, getInterfaceIdFromQueryString, getComponentNameFromQueryString, getModuleIdentityIdFromQueryString } from '../../../../shared/utils/queryStringHelper';
 import { REFRESH, NAVIGATE_BACK } from '../../../../constants/iconNames';
 import { MultiLineShimmer } from '../../../../shared/components/multiLineShimmer';
 import { usePnpStateContext } from '../../../../shared/contexts/pnpStateContext';
 import { SynchronizationStatus } from '../../../../api/models/synchronizationStatus';
 import { getDeviceCommandPairs } from './dataHelper';
 import { HeaderView } from '../../../../shared/components/headerView';
 import { useAsyncSagaReducer } from '../../../../shared/hooks/useAsyncSagaReducer';
 import { JSONEditor } from '../../../../shared/components/jsonEditor';
 import { deviceTwinReducer } from '../../../deviceTwin/reducer';
 import { deviceTwinSaga } from '../../../deviceTwin/saga';
 import { deviceTwinStateInitial } from '../../../deviceTwin/state';
 import { useBreadcrumbEntry } from '../../../../navigation/hooks/useBreadcrumbEntry';
 import * as Fabric from '../../../../jsonSchemaFormFabricPlugin/widgets/checkBox';
 import '../../../../css/_layouts.scss';
 import '../../../../css/_devicePnpDetailList.scss';

 const exampleChildClass = mergeStyles({
   display: 'block',
   marginBottom: '10px',
 });

 const textFieldStyles: Partial<ITextFieldStyles> = { root: { maxWidth: '300px' } };

 interface DetailsListBasicExampleItem {
   key: number;
   name: string;
   status: string;
   lastUpdate: string;
 }

 interface DetailsListBasicExampleState {
   items: DetailsListBasicExampleItem[];
   selectionDetails: string;
 }

 class DetailsListBasicExample extends React.Component<{}, DetailsListBasicExampleState> {
   private selection: Selection;
   public allItems: DetailsListBasicExampleItem[] = [];
   private columns: IColumn[];

   constructor(props: {}) {
     super(props);

     this.selection = new Selection({
       onSelectionChanged: () => this.setState({ selectionDetails: this._getSelectionDetails() }),
     });

     this.columns = [
       { key: 'column1', name: 'Sensor name', fieldName: 'name', minWidth: 100, maxWidth: 200, isResizable: true },
       { key: 'column2', name: 'Status', fieldName: 'status', minWidth: 100, maxWidth: 200, isResizable: true },
       { key: 'column3', name: 'Last update', fieldName: 'lastUpdate', minWidth: 100, maxWidth: 200, isResizable: true},
     ];

     this.state = {
       items: this.allItems,
       selectionDetails: this._getSelectionDetails(),
     };
   }

   public render = () => {
     const { items, selectionDetails } = this.state;

     return (
       <div className="scrollable-lg">
         <div className={exampleChildClass}>{selectionDetails}</div>
         <MarqueeSelection selection={this.selection}>
           <DetailsList
             className="scrollable-lg"
             items={this.allItems}
             columns={this.columns}
             setKey="set"
             layoutMode={DetailsListLayoutMode.justified}
             selection={this.selection}
             selectionPreservedOnEmptyClick={true}
             ariaLabelForSelectionColumn="Toggle selection"
             ariaLabelForSelectAllCheckbox="Toggle selection for all items"
             checkButtonAriaLabel="select row"
             onItemInvoked={this.onItemInvoked}
           />
         </MarqueeSelection>
       </div>
     );
   }

     private _getSelectionDetails(): string {
     const selectionCount = this.selection.getSelectedCount();

     switch (selectionCount) {
       case 0:
         return 'No items selected';
       case 1:
         return '1 item selected: ' + (this.selection.getSelection()[0] as DetailsListBasicExampleItem).name;
       default:
         return `${selectionCount} items selected`;
     }
   }

   private onFilter = (ev: React.FormEvent<HTMLInputElement | HTMLTextAreaElement>, text: string): void => {
     this.setState({
       items: text ? this.allItems.filter(i => i.name.toLowerCase().indexOf(text) > -1) : this.allItems,
     });
     }

   private onItemInvoked = (item: DetailsListBasicExampleItem): void => {
     alert(`Item invoked: ${item.name}`);
   }
 }

 export const DeviceCommands: React.FC = () => {
     const { search, pathname } = useLocation();
     const history = useHistory();
     const { t } = useTranslation();
     const deviceId = getDeviceIdFromQueryString(search);
     const moduleId = getModuleIdentityIdFromQueryString(search);
     const componentName = getComponentNameFromQueryString(search);

     const { pnpState, dispatch, getModelDefinition } = usePnpStateContext();
     const isLoading = pnpState.modelDefinitionWithSource.synchronizationStatus === SynchronizationStatus.working;
     const modelDefinition = pnpState.modelDefinitionWithSource.payload && pnpState.modelDefinitionWithSource.payload.modelDefinition;
     const commandSchemas = React.useMemo(() => getDeviceCommandPairs(modelDefinition).commandSchemas, [modelDefinition]);

     const invokeCommand = (parameters: InvokeCommandActionParameters) => dispatch(invokeCommandAction.started(parameters));

     const renderCommandsPerInterface = () => {
         return (
             <>
                 {!commandSchemas || commandSchemas.length === 0 ?
                     <Label className="no-pnp-content">{t(ResourceKeys.deviceCommands.noCommands, {componentName})}</Label> :
                     <DeviceCommandsPerInterface
                         invokeCommand={invokeCommand}
                         commandSchemas={commandSchemas}
                         componentName={componentName}
                         deviceId={deviceId}
                         moduleId={moduleId}
                     />
                 }
             </>
         );
     };

     const handleRefresh = () => getModelDefinition();
     const handleClose = () => {
         const path = pathname.replace(/\/ioTPlugAndPlayDetail\/commands\/.*/, ``);
         history.push(getBackUrl(path, search));
     };

     if (isLoading) {
         return (
             <MultiLineShimmer/>
         );
     }

     return (
         <>
             <CommandBar
                 className="command"
                 items={[
                     {
                         ariaLabel: t(ResourceKeys.deviceCommands.command.refresh),
                         iconProps: {iconName: REFRESH},
                         key: REFRESH,
                         name: t(ResourceKeys.deviceCommands.command.refresh),
                         onClick: handleRefresh
                     }
                 ]}
                 farItems={[
                     {
                         ariaLabel: t(ResourceKeys.deviceCommands.command.close),
                         iconProps: {iconName: NAVIGATE_BACK},
                         key: NAVIGATE_BACK,
                         name: t(ResourceKeys.deviceCommands.command.close),
                         onClick: handleClose
                     }
                 ]}
             />
             {renderCommandsPerInterface()}
         </>
     );
 };
 export const DeviceCommandsVT: React.FC = () => {
   const options: IChoiceGroupOption[] = [
     { key: 'A', text: 'Enable' },
     { key: 'B', text: 'Disable' },
   ];

   let vTStatus = 'enabled';

   const onChange = (ev: React.FormEvent<HTMLInputElement>, option: IChoiceGroupOption) => {
     vTStatus = (vTStatus === 'enabled') ? 'disabled' : 'enabled';
     console.dir(option);
   };
   const ChoiceGroupBasicExample: React.FunctionComponent = () => {
     return <ChoiceGroup defaultSelectedKey="Enable" options={options} onChange={onChange} label="" required={true} />;
   };
     // The function below is hardcoded. You may delete it after device sample code is fixed to update deviceStatus
   const getOverallStatus = (currentDevice: any) => {
     return (currentDevice.vTsoilMoistureExternal1.telemetryStatus && currentDevice.vTsoilMoistureExternal2.telemetryStatus);
   };

   const { search, pathname } = useLocation();
   const { pnpState, getModelDefinition } = usePnpStateContext();
   const isLoading = pnpState.modelDefinitionWithSource.synchronizationStatus;
   const history = useHistory();
   const { t } = useTranslation();
   const deviceId = getDeviceIdFromQueryString(search);
   const interfaceId = getInterfaceIdFromQueryString(search);
   const moduleId = getModuleIdentityIdFromQueryString(search);
   const { globalState } = useGlobalStateContext();
   const { modelRepositoryState } = globalState;
   const locations: RepositoryLocationSettings[] = getRepositoryLocationSettings(modelRepositoryState);
   const interfaceIdModified = React.useMemo(() => interfaceId || moduleId, [moduleId, interfaceId]);
   const componentName = getComponentNameFromQueryString(search);
   const [ localState, dispatcher ] = useAsyncSagaReducer(deviceTwinReducer, deviceTwinSaga, deviceTwinStateInitial(), 'deviceTwinState');
   let twin = localState.deviceTwin && localState.deviceTwin.payload as any;
   let modelDefinition: any;
   modelDefinition = pnpState.modelDefinitionWithSource.payload && pnpState.modelDefinitionWithSource.payload.modelDefinition;
   let modelDefinitionWithSource: any;
   modelDefinitionWithSource = pnpState.modelDefinitionWithSource.payload;
   const twinState = localState.deviceTwin && localState.deviceTwin.synchronizationStatus;
   const [ autoGenerateKeys, setautoGenerateKeys ] = React.useState<boolean>(true);
   const [ pnpStatees, pnpDispatch ] = useAsyncSagaReducer(pnpReducer, pnpSaga, pnpStateInitial(), 'pnpState');
   const getModelDefinition2 = () => pnpDispatch(getModelDefinitionAction.started({digitalTwinId: deviceId, interfaceId: interfaceIdModified, locations}));
   const [ state, setState ] = React.useState({
     isDirty: false,
     isTwinValid: true,
     twin: JSON.stringify(twin, null, '\t')
   });
   React.useEffect(() => {
     if (interfaceIdModified && deviceId) {
       getModelDefinition2();
     }
   },              [interfaceIdModified, deviceId]);

   const hello = new DetailsListBasicExample({});

   const telemetryLoading = () => {
     return (isLoading === SynchronizationStatus.working || isLoading === SynchronizationStatus.updating);
   };

   const getTelemetries = () => {
     let telemetries = [] as any;
     telemetries = telemetries;
     if (!telemetryLoading) {
       return telemetries;
     }

     else {
       for  (const i of modelDefinition.contents.length) {
         if (modelDefinition.contents[i]['@type'] === 'Telemetry') {
           telemetries.push(modelDefinition.contents[i].name);
         }
       }
     }

     return telemetries;
   };

   const isVtString = (name: string) => {
     const substringEnd = 2;
     return (name.substring(0, substringEnd) === 'vT');
   };

   const getStat = (currentTelemetryStatus: any) => {
     let status = '';

     if (currentTelemetryStatus === true) {
       status = 'verified';
     }

     else if (currentTelemetryStatus === false) {
       status = 'faulty';
     }

     return status;
   };

   const getArray = (detailObject: any) => {
     let itemList: DetailsListBasicExampleItem[];
     let deviceResponse: any;
     deviceResponse = twin.properties.reported as any;
     deviceResponse = Object.keys(deviceResponse);
     let devResponseObj: any;
     devResponseObj = twin.properties.reported as any;
     itemList = itemList;
     let tempName: any;
     const substringEnd = 2;
     const telemetryTypes = getTelemetries();
     const timeStringEnd = 19;
     let i = 0;

     while (i < deviceResponse.length) {
       tempName = deviceResponse[i];
       const tempNameLength = tempName.length;
       const possibleTelemetryName = tempName.substring(substringEnd, tempNameLength);
       let stat = getStat(devResponseObj[tempName].telemetryStatus);

       if (!isVtString(tempName) && telemetryTypes.includes(tempName)) {
         stat = 'unverified';
       }

       if (stat !== '') {
         let update = devResponseObj.$metadata[tempName].$lastUpdated;
         update = update.substring(0, timeStringEnd);
         detailObject.allItems.push({
           key: i,
           name: tempName,
           status: stat,
           lastUpdate: update,
         });
       }

       i++;
     }
   };

   const handleRefresh = () => {
     dispatcher(getDeviceTwinAction.started(deviceId));
     twin = localState.deviceTwin && localState.deviceTwin.payload;
     renderVTTabDisplay();
   };

   const handleClose = () => {
     const path = pathname.replace(/\/ioTPlugAndPlayDetail.*/, ``);
     history.push(getBackUrl(path, search));
   };

   useBreadcrumbEntry({name: 'twin'});

   React.useEffect(() => {
       dispatcher(getDeviceTwinAction.started(deviceId));
   },              [deviceId]);

   const handleClick = () => {
    twin.properties.desired.vTDevice.enableVerifiedTelemetry = (vTStatus === 'enabled' ? true : false);
    DevicesService.updateDeviceTwin(twin);
   };

   const renderVTTabDisplay = () => {
       if (twinState === SynchronizationStatus.working || twinState === SynchronizationStatus.updating) {
           return <MultiLineShimmer className="device-detail"/>;
       }

       if (twinState === SynchronizationStatus.fetched) {
           const deviceTelemetryStatus = twin.properties.reported as any;
           getArray(hello);
           // change condition below to this when device sample branch is updated: deviceTelemetryStatus.vTDevice.deviceStatus === true
           if (getOverallStatus(deviceTelemetryStatus)) {

               return (
                   <div>
                       <CommandBar
                           className="command"
                           items={[
                               {
                                   ariaLabel: t(ResourceKeys.deviceCommands.command.refresh),
                                   iconProps: {iconName: REFRESH},
                                   key: REFRESH,
                                   name: t(ResourceKeys.deviceCommands.command.refresh),
                                   onClick: handleRefresh
                               }
                           ]}
                           farItems={[
                               {
                                   ariaLabel: t(ResourceKeys.deviceCommands.command.close),
                                   iconProps: {iconName: NAVIGATE_BACK},
                                   key: NAVIGATE_BACK,
                                   name: t(ResourceKeys.deviceCommands.command.close),
                                   onClick: handleClose
                               }
                           ]}
                       />
                       <div style={{ fontWeight: 500 }}>&nbsp;&nbsp;&nbsp;&nbsp;Device status:  <span style={{ color: 'green', fontWeight: 500 }}> working <span/></span></div>
                       <div style={{ fontWeight: 500 }}>&nbsp;&nbsp;&nbsp;&nbsp;Verified telemetry:</div>
                       <ChoiceGroup styles={{ flexContainer: { padding: '20px' } }} defaultSelectedKey="Enable" options={options} onChange={onChange} required={true} />
                       <br/>
                       <PrimaryButton onClick={handleClick} style={{marginLeft: '15px'}}>{'Send command'}</PrimaryButton>
                       <div className="scrollable-lg">
                       {hello.render()}
                       </div>
                     </div>
               );
           }

           return (
               <div>
                   <CommandBar
                       className="command"
                       items={[
                           {
                               ariaLabel: t(ResourceKeys.deviceCommands.command.refresh),
                               iconProps: {iconName: REFRESH},
                               key: REFRESH,
                               name: t(ResourceKeys.deviceCommands.command.refresh),
                               onClick: handleRefresh
                           }
                       ]}
                       farItems={[
                           {
                               ariaLabel: t(ResourceKeys.deviceCommands.command.close),
                               iconProps: {iconName: NAVIGATE_BACK},
                               key: NAVIGATE_BACK,
                               name: t(ResourceKeys.deviceCommands.command.close),
                               onClick: handleClose
                               }
                           ]}
                   />
                   <div style={{ fontWeight: 500 }}>&nbsp;&nbsp;&nbsp;&nbsp;Device status: <span style={{ color: 'red', fontWeight: 500 }}>faulty</span></div>
                   <div style={{ fontWeight: 500 }}>&nbsp;&nbsp;&nbsp;&nbsp;Verified telemetry:</div>
                   <ChoiceGroup styles={{ flexContainer: { padding: '20px' } }} defaultSelectedKey="Enable" options={options} onChange={onChange} required={true} />
                   <br/>
                   <PrimaryButton onClick={handleClick} style={{marginLeft: '15px'}}>{'Send command'}</PrimaryButton>
                   <div className="scrollable-lg">
                   {hello.render()}
                   </div>
               </div>
           );
       }

       return null;
   };
   return renderVTTabDisplay();
 };
