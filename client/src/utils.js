export const formatCountdown = (seconds) => {
    let date = new Date(null);
    date.setSeconds(seconds);

    return  date.toISOString().substr(11, 8);
}

export const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

export const generateSalt = () => {
    const result = "0x" + genRanHex(32);
    console.log("generated salt", result);

    return result;
}

export const generateHash = (web3, move, salt) => {
    return web3.utils.soliditySha3({t: 'uint8', v: move}, {t: 'uint256', v: salt} )
}
