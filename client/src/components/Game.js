import React, {useState, useEffect, Fragment} from "react"
import {useBeforeunload} from "react-beforeunload";
import PeerJs from "peerjs";
import {v4 as uuidv4} from 'uuid';
import RPS from '../contracts/RPS.json';
import {generateHash, generateSalt, decideWinner} from "../utils";
import {moves} from "../constants";
import ResolveButton from "./ResolveButton";
import CountDown from "./CountDown";
import PlayerControls from "./PlayerControls";

let peer = null;
let connection = null;

const Game = props => {
    const {drizzle, drizzleState} = props

    const [hostAddress, setHostAddress] = useState(null);
    const [guestAddress, setGuestAddress] = useState(null);
    const [hostBalance, setHostBalance] = useState(0);
    const [guestBalance, setGuestBalance] = useState(0);
    const [moveHost, setMoveHost] = useState(null);
    const [moveGuest, setMoveGuest] = useState(null);
    const [gameContractAddress, setGameContractAddress] = useState(null);
    const [gameContractBalance, setGameContractBalance] = useState(0);
    const [salt, setSalt] = useState("");
    const [hash, setHash] = useState("");

    const [hostPeerId, setHostPeerId] = useState(null);
    const [guestPeerId, setGuestPeerId] = useState(null);

    const [gameTimeout, setGameTimeout] = useState(0);
    const [startGame, setStartGame] = useState(false);
    const [finishGame, setFinishGame] = useState(false);
    const [gameStake, setGameStake] = useState("0.01");
    const [gameType, setGameType] = useState(null);
    const [showResolveGameButton, setShowResolveGameButton] = useState(true);
    const [winner, setWinner] = useState("GAME IN PROGRESS...");

    const hostGame = () => {
        setHostPeerId(uuidv4());
        setGameType("host");
    }

    const joinGame = () => {
        setGameType("guest");
    }

    const showResolveButton = () => {
        return moveHost !== null && moveGuest !== null && gameContractBalance > 0 && showResolveGameButton;
    }

    const showCounter = () => {
        return startGame === true && finishGame === false && moveHost === null;
    }

    const showControls = () => {
        return startGame === true && finishGame === false;
    }

    const isWaitingForGuestMove = () => {
        return startGame === true && guestAddress !== null && moveGuest === null;
    }

    useBeforeunload((event) => {
        if (gameContractBalance > 0) {
            console.log("SOMEBODY SHOULD CALL A TIMEOUT");
            event.preventDefault();
        }
    });

    useEffect(
        async () => {
            console.log("HERE! initializing the component");

            return () => {
                console.log("CLOSING CONNECTIONS...");
                connection.close();
                peer.disconnect();
            }
        }, []
    )

    useEffect(
        async () => {

            if (guestAddress !== null) {
                await refreshPlayerBalances();
            }

            return () => {
            }
        }, [hostAddress, guestAddress]
    );

    useEffect(
        async () => {
            if (gameContractAddress) {
                await refreshGameContractBalance();
                await refreshPlayerBalances();
            }

            if (moveHost !== null && moveGuest !== null) {
                const gameResult = decideWinner(moveHost, moveGuest);

                switch (gameResult) {
                    case 0:
                        setWinner("DRAW");
                        break;
                    case 1:
                        setWinner("HOST");
                        break;
                    case -1:
                        setWinner("GUEST");
                        break;
                }
            }

            return () => {
            }
        }, [drizzle.store, drizzleState, moveGuest, moveHost]
    );

    useEffect(
        async () => {
            console.log("SETTING ADDRESSES gameType ", gameType);

            if (gameType === "host") {
                if (drizzleState.accounts[0] !== hostAddress) {
                    console.log("SETTING HOST ADDRESS", drizzleState.accounts[0]);
                    setHostAddress(drizzleState.accounts[0]);
                }
            } else if (gameType === "guest") {
                if (drizzleState.accounts[0] !== guestAddress) {
                    console.log("SETTING GUEST ADDRESS", drizzleState.accounts[0]);
                    setGuestAddress(drizzleState.accounts[0]);
                }

            } else {
            }
            return () => {
            }
        }, [drizzle.store, drizzleState, gameType]
    )

    useEffect(
        async () => {

            if (gameType === "host") {

                peer = new PeerJs(hostPeerId, {debug: 0});
                peer.on('connection', (conn) => {
                    console.log("HOST has connection...", conn);

                    setGuestPeerId(conn.peer);
                    setStartGame(true);

                    conn.on('open', function () {
                        // Receive messages
                        conn.on('data', function (data) {
                            console.log("HOST RECEIVED MESSAGE: ", data);

                            if (typeof data === "object" && data.action === "GUEST_ADDRESS") {
                                setGuestAddress(data.payload.address);
                            }

                            if (typeof data === "object" && data.action === "GUEST_MOVE") {
                                setMoveGuest(data.payload.move);
                                setFinishGame(true);
                            }
                        });

                        conn.send('Hello back!!');

                        connection = conn;
                    });
                });
            } else if (gameType === "guest") {

                peer = new PeerJs(guestPeerId, {debug: 0});

                peer.on('open', function (id) {
                    let conn = peer.connect(hostPeerId);

                    conn.on('open', function () {

                        conn.on('data', function (data) {
                            console.log("GUEST RECEIVED MESSAGE: ", data);

                            connection.send({action: "GUEST_ADDRESS", payload: {address: drizzleState.accounts[0]}});

                            if (typeof data === "object" && data.action === "GAME_START") {
                                setGameContractAddress(data.payload.contractAddress);
                                setGameTimeout(data.payload.timeout);
                                setGameStake(data.payload.gameStake);
                                setStartGame(true);
                            }

                            if (typeof data === "object" && data.action === "HOST_MOVE") {
                                console.log("HERE SETTING ...", data.payload);
                                setMoveHost(data.payload.move);
                                setFinishGame(true);
                            }
                        });

                        connection = conn;
                    });
                });
            } else {
            }

            return () => {
            }
        }, [gameType]
    )

    const refreshGameContractBalance = async () => {

        const balance = await drizzle.web3.eth.getBalance(gameContractAddress);

        const balanceReadable = drizzle.web3.utils.fromWei(balance, "ether");

        console.log("CONTRACT BALANCE = ", balanceReadable);
        setGameContractBalance(balanceReadable);
    }

    const refreshPlayerBalances = async () => {

        if (hostAddress !== null) {
            const hostBalanceReadable = await getBalance(hostAddress);
            setHostBalance(hostBalanceReadable);
        }

        if (guestAddress !== null) {
            const guestBalanceReadable = await getBalance(guestAddress);
            setGuestBalance(guestBalanceReadable);
        }


    }

    const getBalance = async (address) => {
        const balance = await drizzle.web3.eth.getBalance(address);
        return drizzle.web3.utils.fromWei(balance, "ether");
    }


    const initiateGame = async (contractInstance) => {
        console.log("CONTRACT instance", contractInstance);

        const timeout = await contractInstance.methods.TIMEOUT.call().call();
        setGameTimeout(timeout);

        const message = {
            action: "GAME_START",
            payload: {
                "contractAddress": contractInstance.options.address,
                "timeout": timeout,
                "gameStake": gameStake
            }
        };

        notifyGuest(message);
    }

    const notifyGuest = (message) => {
        connection.send(message);
        console.log("SENDING MESSAGE TO GUEST", message);
    }

    const handleTimeoutHost = async () => {
        console.log("HANDLE TIMEOUT PLAYER - TAKE BACK THE FUNDS - GUEST DID NOT PLAY HIS MOVE!");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);

        gameContract.methods.j2Timeout().send({
            from: hostAddress
        }).on('confirmation', function (value) {
        }).catch(e => console.log("ERROR", e));
    }

    const handleTimeoutGuest = async () => {
        console.log("HANDLE TIMEOUT GUEST - TAKE FUNDS - HOST DID NOT RESOLVE THE GAME ON TIME");


        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);

        gameContract.methods.j1Timeout().send({
            from: guestAddress
        }).on('confirmation', function (value) {
            console.log('confirmation', value);
        }).catch(e => console.log("ERROR", e));
    }

    const handleResolveGame = async () => {

        console.log("HANDLE RESOLVE GAME");

        setShowResolveGameButton(false);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING SOLVE", moveHost, salt);

        gameContract.methods.solve(moveHost, salt).send({
            from: hostAddress,
        }).on('receipt', function (value) {

        }).on('confirmation', function (value) {
            if (value === 1) {
                notifyHost({action: "HOST_MOVE", payload: {move: moveHost}});
                setShowResolveGameButton(false);
            }

        }).catch(e => {
            console.log("ERROR", e);
            setShowResolveGameButton(true);
        });
    }

    const handlePlayMoveHost = async (move) => {
        setMoveHost(move);
        setFinishGame(true);


        let gameContract = new drizzle.web3.eth.Contract(RPS.abi);

        console.log("GAME CONTRACT BEFORE CREATION", gameContract);
        console.log("ACCOUNTS", drizzleState.accounts);

        setHostAddress(drizzleState.accounts[0]);

        const salt = generateSalt();

        setSalt(salt);

        const hash = generateHash(drizzle.web3, move, salt);
        console.log("HASH SALT deploy", hash, salt);
        console.log("GUEST ADDRESS", guestAddress);

        gameContract.deploy({
            data: RPS.bytecode,
            arguments: [hash, guestAddress]
        }).send({
            from: hostAddress,
            value: drizzle.web3.utils.toWei(gameStake, "ether"),
        }).then(instance => {
            setGameContractAddress(instance.options.address);
            initiateGame(instance);
        }).catch(e => console.log("ERROR", e));
    }

    const notifyHost = (message) => {
        console.log("SENDING MESSAGE TO HOST", message);
        connection.send(message);
    }

    const handlePlayMoveGuest = async (move) => {
        setMoveGuest(move);
        setFinishGame(true);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING PLAY FROM GUEST", move);
        console.log("GUEST address", guestAddress);

        gameContract.methods.play(move).send({
            from: guestAddress,
            value: drizzle.web3.utils.toWei(gameStake, "ether"),
        }).on('confirmation', async function (value) {
            if (value === 1) {
                await refreshGameContractBalance();
                notifyHost({action: "GUEST_MOVE", payload: {move}});
            }

        }).catch(e => console.log("ERROR", e));
    }

    if (gameType === null) {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock</h1>
                <button onClick={() => hostGame()}>HOST GAME</button>
                <hr/>
                JOIN GAME AT ADDRESS:
                <input
                    defaultValue={hostAddress}
                    onChange={
                        (e) =>
                            setHostPeerId(e.target.value)
                    }
                />
                <button onClick={() => joinGame()}>JOIN GAME</button>
            </Fragment>
        );
    } else if (gameType === "host") {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock (HOST)</h1>
                <h6>BALANCE: {hostBalance} ETH</h6>
                <h2>CONTRACT BALANCE: {gameContractBalance + " ETH"}</h2>
                {startGame === false && (
                    <Fragment>
                        <h2>waiting for guest ...</h2>
                        <h2>join address: {hostPeerId}</h2>
                    </Fragment>
                )}
                {isWaitingForGuestMove() && (
                    <h2>waiting for guest to make his move ...</h2>
                )}
                {showControls() && (
                    <Fragment>
                        <PlayerControls
                            title="HOST"
                            address={hostAddress}
                            onMove={handlePlayMoveHost}/>
                        <h2>STAKE</h2>
                        <input defaultValue={gameStake} onChange={(e) => setGameStake(e.target.value)}/>
                        <hr/>
                    </Fragment>
                )}
                {finishGame === true && (
                    <Fragment>
                        <h2>GUEST PLAYED: {moves[moveGuest - 1]} - YOU PLAYED: {moves[moveHost - 1]}</h2>
                        <h1>WINNER: {winner}</h1>
                    </Fragment>
                )}

                {showResolveButton() && (<ResolveButton onClick={() => handleResolveGame()}/>)}
                <hr/>
                {moveGuest === null && (
                    <button key="timeout_host" onClick={() => handleTimeoutHost()}>TIMEOUT CALL BY HOST (get
                        refund)
                    </button>)}
                <hr/>
                {moveGuest === null && gameTimeout > 0 && (
                    <CountDown timeout={gameTimeout} onFinish={() => {
                    }}/>
                )}
            </Fragment>
        );
    } else {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock (GUEST)</h1>
                <h6>BALANCE: {guestBalance} ETH</h6>
                <h2>CONTRACT BALANCE: {gameContractBalance + " ETH"}</h2>
                {startGame === false && (
                    <h2>waiting for host to create a game...</h2>
                )}
                {showControls() && (
                    <Fragment>
                        <PlayerControls
                            title="GUEST"
                            address={guestAddress}
                            onMove={handlePlayMoveGuest}/>
                        <hr/>
                        <h2>STAKE: {gameStake}</h2>
                    </Fragment>
                )}
                {showCounter() && (
                    <CountDown
                        timeout={gameTimeout}
                        onFinish={() => {
                        }}
                    />
                )}
                {finishGame === true && (
                    <Fragment>
                        <h2>HOST PLAYED: {moves[moveHost - 1]} - YOU PLAYED: {moves[moveGuest - 1]}</h2>
                        <h1>WINNER: {winner}</h1>
                    </Fragment>
                )}
                {moveHost === null && (
                    <button key="timeout_guest" onClick={() => handleTimeoutGuest()}>TIMEOUT CALL BY GUEST
                        (scoop/steel
                        stakes if the host hast called decide winner (bug in the contract!!! see j1Timeout))
                    </button>)}
            </Fragment>
        );
    }


}

export default Game