import React, {Fragment} from "react";
import {DrizzleContext} from "@drizzle/react-plugin";
import {Drizzle} from "@drizzle/store";

import MyStringStore from "./contracts/MyStringStore.json";
import ReadString from "./ReadString";
import SetString from "./SetString";

import { newContextComponents } from "@drizzle/react-components";
const { AccountData, ContractData, ContractForm } = newContextComponents;

const drizzleOptions = {
    contracts: [MyStringStore],
};

const drizzle = new Drizzle(drizzleOptions);

const App = () => {
    return (
        <DrizzleContext.Provider drizzle={drizzle}>
            <DrizzleContext.Consumer>
                {drizzleContext => {
                    const {drizzle, drizzleState, initialized} = drizzleContext;

                    if (!initialized) {
                        return "Loading..."
                    }

                    return (
                        <Fragment>
                            <ReadString drizzle={drizzle} drizzleState={drizzleState}/>
                            <SetString drizzle={drizzle} drizzleState={drizzleState}/>
                            <AccountData drizzle={drizzle} drizzleState={drizzleState} accountIndex={0} />
                            <ContractData contract="MyStringStore" method="myString" drizzle={drizzle} drizzleState={drizzleState}/>
                            <ContractForm  contract="MyStringStore" method="set" drizzle={drizzle} drizzleState={drizzleState} />
                        </Fragment>
                    )
                }}
            </DrizzleContext.Consumer>
        </DrizzleContext.Provider>
    );
}

export default App;