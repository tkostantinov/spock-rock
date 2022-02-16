import React from 'react'
import Move from "./Move";
import {moves} from "../constants";

const PlayerControls = props => {
    const {title, address, balance, onMove} = props;


    return (
        <>
            <h2>{title} CONTROLS</h2>
            <h4>ADDRESS: {address}</h4>
            <h4>BALANCE: {balance}</h4>
            {moves.map((move, index) => (
                <Move key={index} name={move} onClick={() => onMove(index)} value={index}/>)
            )}
        </>
    );
}

export default PlayerControls;


