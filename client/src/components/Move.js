import React from 'react'

const Move = props => {
    const {name, value, onClick} = props;

    return (
        <button style={{width: 100}} key={name} name={name} onClick={onClick}>{name}</button>
    );
}

export default Move;