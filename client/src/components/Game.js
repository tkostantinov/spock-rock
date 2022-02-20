import React, {useState, useEffect, Fragment} from "react"
import PeerJs from "peerjs";
import RPS from '../contracts/RPS.json';
import {generateHash, generateSalt} from "../utils";
import {moves} from "../constants";
import ResolveButton from "./ResolveButton";
import CountDown from "./CountDown";
import PlayerControls from "./PlayerControls";
import {useBeforeunload} from "react-beforeunload";

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
    const [gameContractBalance, setGameContractBalance] = useState(null);
    const [salt, setSalt] = useState("");
    const [hash, setHash] = useState("");
    const [gameTimeout, setGameTimeout] = useState(0);
    const [startGame, setStartGame] = useState(false);
    const [finishGame, setFinishGame] = useState(false);
    const [gameStake, setGameStake] = useState("0.01");

    const [gameType, setGameType] = useState(null);

    const showResolveButton = () => {
        return moveHost !== null && moveGuest !== null && gameContractBalance > 0;
    }

    const showCounter = () => {
        return startGame === true && finishGame === false && gameTimeout > 0;
    }

    const showControls = () => {
        return startGame === true && finishGame === false;
    }

    const isWaitingForGuestMove = () => {
        return startGame === true && guestAddress !== null && moveGuest === null;
    }

    useBeforeunload((event) => {
        if (gameContractBalance > 0) {
            event.preventDefault();
        }
    });

    useEffect(
        async () => {
            return () => {
                console.log("CLOSING CONNECTIONS...");
                connection.close();
                peer.disconnect();
            }
        }, []
    )


    useEffect(
        async () => {
            if(gameContractAddress)
            {
                await refreshGameContractBalance();
            }

            return () => {
            }
        }, [drizzle.store, drizzleState, moveGuest, moveHost]
    )

    useEffect(
        async () => {
            console.log("GAME TYPE = ", gameType);

            if (gameType === "host") {
                setHostAddress(drizzleState.accounts[0]);
            } else if (gameType === "guest") {
                setGuestAddress(drizzleState.accounts[0]);
                setHostAddress(hostAddress);
            } else {

            }
            return () => {
            }
        }, [drizzle.store, drizzleState, gameType]
    )

    useEffect(
        async () => {
            console.log("HERE PEER LOGIC", gameType, hostAddress, guestAddress);

            if (gameType === "host") {
                peer = new PeerJs(hostAddress, {debug: 1});
                peer.on('connection', (conn) => {
                    console.log("HOST has connection...", conn);

                    setGuestAddress(conn.peer);
                    setStartGame(true);

                    conn.on('open', function () {
                        // Receive messages
                        conn.on('data', function (data) {
                            console.log("HOST RECEIVED MESSAGE: ", data);

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
                peer = new PeerJs(guestAddress, {debug: 1});

                peer.on('open', function (id) {
                    let conn = peer.connect(hostAddress);

                    conn.send("HEY HEY MESSAGE");

                    conn.on('open', function () {
                        conn.on('data', function (data) {
                            console.log("GUEST RECEIVED MESSAGE: ", data);

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
        }, [drizzleState, gameType, hostAddress, guestAddress]
    )

    const refreshGameContractBalance = async () => {

        const balance = await drizzle.web3.eth.getBalance(gameContractAddress);

        const balanceReadable = drizzle.web3.utils.fromWei(balance, "ether");

        console.log("CONTRACT BALANCE = ", balanceReadable);
        setGameContractBalance(balanceReadable);
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
            console.log('confirmation', value);
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


        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING SOLVE", moveHost, salt);

        gameContract.methods.solve(moveHost, salt).send({
            from: hostAddress,
        }).on('confirmation', function (value) {
            console.log('confirmation', value);
            notifyHost({action: "HOST_MOVE", payload: {move: moveHost}});

        }).catch(e => console.log("ERROR", e));
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
            console.log('confirmation', value);

            await refreshGameContractBalance();

            notifyHost({action: "GUEST_MOVE", payload: {move}});

        }).catch(e => console.log("ERROR", e));
    }

    if (gameType === null) {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock</h1>
                <button onClick={() => setGameType("host")}>HOST GAME</button>
                <hr/>
                JOIN GAME AT ADDRESS:
                <input
                    defaultValue={hostAddress}
                    onChange={
                        (e) =>
                            setHostAddress(e.target.value)
                    }
                />
                <button onClick={() => setGameType("guest")}>JOIN GAME</button>
            </Fragment>
        );
    } else if (gameType === "host") {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock (HOST)</h1>
                <h2>CONTRACT BALANCE: {gameContractBalance + " ETH"}</h2>
                {startGame === false && (
                    <Fragment>
                        <h2>waiting for guest ...</h2>
                        <h2>join address: {hostAddress}</h2>
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
                            balance={hostBalance}
                            onMove={handlePlayMoveHost}/>
                        <h2>STAKE</h2>
                        <input defaultValue={gameStake} onChange={(e) => setGameStake(e.target.value)}/>
                        <hr/>
                    </Fragment>
                )}
                {finishGame === true && (
                    <h2>GUEST PLAYED: {moves[moveGuest - 1]} - YOU PLAYED: {moves[moveHost -1]}</h2>
                )}

                {showResolveButton() && (<ResolveButton onClick={() => handleResolveGame()}/>)}
                <hr/>
                <button key="timeout_host" onClick={() => handleTimeoutHost()}>TIMEOUT CALL BY HOST (get
                    refund)
                </button>
                <hr/>
                {finishGame === false && gameTimeout > 0 && (
                    <CountDown timeout={gameTimeout} onFinish={() => {
                    }}/>
                )}
            </Fragment>
        );
    } else {
        return (
            <Fragment>
                <h1>Rock Paper Scissors Lizard Spock (GUEST)</h1>
                <h2>CONTRACT BALANCE: {gameContractBalance + " ETH"}</h2>
                {startGame === false && (
                    <h2>waiting for host to create a game...</h2>
                )}
                {showControls() && (
                    <Fragment>
                        <PlayerControls
                            title="GUEST"
                            address={guestAddress}
                            balance={guestBalance}
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
                    <h2>HOST PLAYED: {moves[moveHost - 1]} - YOU PLAYED: {moves[moveGuest - 1]}</h2>
                )}
                <button key="timeout_guest" onClick={() => handleTimeoutGuest()}>TIMEOUT CALL BY GUEST
                    (scoop/steel
                    stakes)
                </button>
            </Fragment>
        );
    }


}

export default Game