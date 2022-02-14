export const formatCountdown = (seconds) => {
    let date = new Date(null);
    date.setSeconds(seconds);

    return  date.toISOString().substr(11, 8);
}

export const genRanHex = size => [...Array(size)].map(() => Math.floor(Math.random() * 16).toString(16)).join('');

export const generateSalt = () => {
    return "0x" + genRanHex(32);
}

export const generateHash = (web3, move, salt) => {
    return web3.utils.keccak256(web3.eth.abi.encodeParameters(
        ["uint8", "uint256"],
        [move, salt]));
}
