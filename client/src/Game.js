import React, {useState, useEffect, Fragment} from "react"
import PeerJs from "peerjs";
import RPS from './contracts/RPS.json';
import {generateHash, generateSalt} from "./utils";
import ResolveButton from "./ResolveButton";
import CountDown from "./CountDown";
import PlayerControls from "./PlayerControls";

let peer = null;
let connection = null;

const Game = props => {
    const {drizzle, drizzleState} = props

    const [player1Address, setPlayer1Address] = useState(null);
    const [player2Address, setPlayer2Address] = useState(null);
    const [player1Balance, setPlayer1Balance] = useState(0);
    const [player2Balance, setPlayer2Balance] = useState(0);
    const [movePlayer1, setMovePlayer1] = useState(null);
    const [movePlayer2, setMovePlayer2] = useState(null);
    const [player2Move, setPlayer2Move] = useState(null);
    const [gameContractAddress, setGameContractAddress] = useState(null);
    const [salt, setSalt] = useState("");
    const [hash, setHash] = useState("");
    const [gameTimeout, setGameTimeout] = useState(0);

    const [gameType, setGameType] = useState(null);
    const [hostAddress, setHostAddress] = useState("");

    useEffect(
        async () => {

            return () => {
                console.log("HERE CLOSING CONNECTIONS...");
                connection.close();
                peer.disconnect();
            }
        }, []
    )


    useEffect(
        async () => {
            console.log("GAME TYPE = ", gameType);

            if (gameType === "host") {
                setPlayer1Address(drizzleState.accounts[0]);
            } else if (gameType === "guest") {
                setPlayer2Address(drizzleState.accounts[0]);
                setPlayer1Address(hostAddress);
            } else {

            }
            return () => {
            }
        }, [drizzle.store, drizzleState, gameType]
    )

    useEffect(
        async () => {
            console.log("HERE PEER LOGIC", gameType, player1Address, player2Address);

            if (gameType === "host") {
                peer = new PeerJs(player1Address, {debug: 1});
                peer.on('connection', (conn) => {
                    console.log("HOST has connection...", conn);

                    setPlayer2Address(conn.peer);

                    conn.on('open', function() {
                        // Receive messages
                        conn.on('data', function(data) {
                            console.log("HOST RECEIVED MESSAGE: ", data);
                        });

                        // Send messages
                        conn.send('Hello back!!');

                        connection = conn;
                    });
                });

            } else if (gameType === "guest") {
                peer = new PeerJs(player2Address, {debug: 1});

                peer.on('open', function (id) {
                    let conn = peer.connect(player1Address);

                    conn.send("HEY HEY MESSAGE");

                    conn.on('open', function () {
                        conn.on('data', function(data) {
                            console.log("GUEST RECEIVED MESSAGE: ", data);

                            if(typeof data === "object" && data.action === "GAME_START"){
                                setGameContractAddress(data.payload.contractAddress);
                            }
                        });

                        connection = conn;
                    });
                });


            } else {
            }

            return () => {
            }
        }, [drizzleState, gameType, player1Address, player2Address]
    )

    const initiateGame = async (contractInstance) => {
        console.log("CONTRACT instance", contractInstance);

        const timeout = await contractInstance.methods.TIMEOUT.call().call();
        setGameTimeout(5);

        const message = {
            action: "GAME_START",
            payload: {
                "contractAddress": contractInstance.options.address,
                "timeout": timeout
            }
        };

        notifyPlayer2(message);
    }

    const notifyPlayer2 = (message) => {
        connection.send(message);
        console.log("SENDING MESSAGE TO PLAYER 2", message);
    }

    const handleTimeoutPlayer1 = async () => {
        console.log("HANDLE TIMEOUT PLAYER - TAKE BACK THE FUNDS - PLAYER 2 DID NOT PLAY HIS MOVE!");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);

        gameContract.methods.j2Timeout().send({
            from: player1Address
        }).on('receipt', function (value) {
            console.log('receipt', value);
        }).catch(e => console.log("ERROR", e));
    }

    const handleTimeoutPlayer2 = async () => {
        console.log("HANDLE TIMEOUT PLAYER 2 - TAKE FUNDS - PLAYER 1 DID NOT RESOLVE THE GAME ON TIME");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);

        gameContract.methods.j1Timeout().send({
            from: player2Address
        }).on('receipt', function (value) {
            console.log('receipt', value);
        }).catch(e => console.log("ERROR", e));
    }

    const handleResolveGame = async () => {

        console.log("HANDLE RESOLVE GAME");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING SOLVE", movePlayer1, salt);

        gameContract.methods.solve(movePlayer1, salt).send({
            from: player1Address,
        }).on('receipt', function (value) {
            console.log('receipt', value);
        }).catch(e => console.log("ERROR", e));
    }

    const handlePlayMovePlayer1 = async (move) => {
        setMovePlayer1(move);
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi);

        console.log("GAME CONTRACT BEFORE CREATION", gameContract);
        console.log("ACCOUNTS", drizzleState.accounts);

        setPlayer1Address(drizzleState.accounts[0]);

        const salt = generateSalt();

        setSalt(salt);

        const hash = generateHash(drizzle.web3, move, salt);

        console.log("HASH SALT deploy", hash, salt);

        setHash(hash);

        gameContract.deploy({
            data: RPS.bytecode,
            arguments: [hash, player2Address]
        }).send({
            from: player1Address,
            value: drizzle.web3.utils.toWei("1", "ether"),
        }).then(instance => {
            setGameContractAddress(instance.options.address);
            initiateGame(instance);
        }).catch(e => console.log("ERROR", e));
    }

    const notifyPlayer1 = (message) => {
        console.log("SENDING MESSAGE TO PLAYER 1", message);
    }

    const handlePlayMovePlayer2 = async (move) => {
        setMovePlayer2(move);
        console.log("HANDLE RESOLVE GAME", gameContractAddress);
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING PLAY FROM PLAYER 2", move);
        console.log("PLAYER 2 address", player2Address);

        gameContract.methods.play(move).send({
            from: player2Address,
            value: drizzle.web3.utils.toWei("1", "ether"),
        }).on('receipt', function (value) {
            console.log('receipt', value);

            notifyPlayer1({type: "MOVE_PLAYED", payload: {}});

        }).catch(e => console.log("ERROR", e));
    }

    if (gameType === null) {
        return (
            <Fragment>
                <h1>GAME Rock Paper Scissors Lizard Spock</h1>
                <button onClick={() => setGameType("host")}>HOST GAME</button>
                <hr/>
                HOST ADDRESS:
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
                <h1>GAME Rock Paper Scissors Lizard Spock</h1>
                <PlayerControls
                    title="PLAYER 1"
                    address={player1Address}
                    balance={player1Balance}
                    onMove={handlePlayMovePlayer1}/>
                <hr/>
                <ResolveButton onClick={() => handleResolveGame()}/>
                <hr/>
                <button key="timeout_player1" onClick={() => handleTimeoutPlayer1()}>TIMEOUT CALL BY PLAYER 1 (get
                    refund)
                </button>
                <button key="send_message" onClick={() => connection.send("TEST SEND!")}>SEND MESSAGE</button>
                <hr/>
                {gameTimeout > 0 && (
                    <CountDown timeout={gameTimeout} onFinish={() => {
                    }}/>
                )}
            </Fragment>
        );
    } else {
        return (
            <Fragment>
                <h1>GAME Rock Paper Scissors Lizard Spock</h1>
                <PlayerControls
                    title="PLAYER 2"
                    address={player2Address}
                    balance={player2Balance}
                    onMove={handlePlayMovePlayer2}/>
                <hr/>
                <button key="timeout_player2" onClick={() => handleTimeoutPlayer2()}>TIMEOUT CALL BY PLAYER 2 (scoop
                    stakes)
                </button>
                <button key="send_message" onClick={() => connection.send("TEST SEND!")}>SEND MESSAGE</button>
                {gameTimeout > 0 && (
                    <CountDown timeout={gameTimeout} onFinish={() => {
                    }}/>
                )}
            </Fragment>
        );
    }


}

export default Game