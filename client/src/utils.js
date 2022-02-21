import {moves} from './constants';

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


export const decideWinner = (mHost,mGuest) => {
    const hostItem = moves[mHost -1];
    const guestItem = moves[mGuest -1];

    switch(hostItem) {
        case "ROCK":
            switch (guestItem) {
                case "ROCK":
                    return 0;
                case "PAPER":
                    return -1;
                case "SCISSORS":
                    return 1;
                case "LIZARD":
                    return 1;
                case "SPOCK":
                    return -1;
            }
        case "PAPER":
            switch (guestItem) {
                case "ROCK":
                    return 1;
                case "PAPER":
                    return 0;
                case "SCISSORS":
                    return -1;
                case "LIZARD":
                    return -1;
                case "SPOCK":
                    return 1;
            }
        case "SCISSORS":
            switch (guestItem) {
                case "ROCK":
                    return -1;
                case "PAPER":
                    return 1;
                case "SCISSORS":
                    return 0;
                case "LIZARD":
                    return 1;
                case "SPOCK":
                    return -1;
            }
        case "LIZARD":
            switch (guestItem) {
                case "ROCK":
                    return -1;
                case "PAPER":
                    return 1;
                case "SCISSORS":
                    return -1;
                case "LIZARD":
                    return 0;
                case "SPOCK":
                    return 1;
            }
        case "SPOCK":
            switch (guestItem) {
                case "ROCK":
                    return 1;
                case "PAPER":
                    return -1;
                case "SCISSORS":
                    return 1;
                case "LIZARD":
                    return -1;
                case "SPOCK":
                    return 0;
            }
    }
}