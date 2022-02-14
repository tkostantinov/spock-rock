import React from 'react'

const ResolveButton = props => {
    const {name, value, onClick} = props;

    return (
        <button style={{width: 100}} onClick={onClick}>DECIDE WINNER</button>
    );
}

export default ResolveButton;