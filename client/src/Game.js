import React, {useState, useEffect, Fragment} from "react"
import useCountDown from "./useCountDown";
import RPS from './contracts/RPS.json';
import Move from "./Move";
import {formatCountdown, generateHash, generateSalt} from "./utils";
import ResolveButton from "./ResolveButton";
import CountDown from "./CountDown";

const Game = props => {
    const {drizzle, drizzleState} = props

    const [player1Address, setPlayer1Address] = useState("0x86a59ec14a2bCA67208e1862eF0BFF291660fc48");
    const [player2Address, setPlayer2Address] = useState("0xd817C7ABb7E94f8ddF98D6a320e4e63B7782bd66");
    const [player1Balance, setPlayer1Balance] = useState(0);
    const [player2Balance, setPlayer2Balance] = useState(0);
    const [movePlayer1, setMovePlayer1] = useState(null);
    const [movePlayer2, setMovePlayer2] = useState(null);
    const [player2Move, setPlayer2Move] = useState(null);
    const [gameContractAddress, setGameContractAddress] = useState(null);
    const [salt, setSalt] = useState("");
    const [hash, setHash] = useState("");
    const [gameTimeout, setGameTimeout] = useState(0);

    useEffect(
        async () => {
            const balancePlayer1 = await drizzle.web3.eth.getBalance(player1Address);
            setPlayer1Balance(balancePlayer1/Math.pow(10,18));

            const balancePlayer2  = await drizzle.web3.eth.getBalance(player2Address);
            setPlayer2Balance(balancePlayer2/Math.pow(10,18));

            const ct = new drizzle.web3.eth.Contract(RPS.abi, "0x1d73A80028c2E181e3A0D792B16693f9791d5018");
            const c1Hash = await ct.methods.c1Hash.call().call();
            console.log("CONTRACT HASH", c1Hash);
            console.log("GENERATED HASH", generateHash(drizzle.web3, 0, "0x1d73A80028c2E181e3A0D792B16693f9791d5018"));

            //generateHash = (web3, move, salt)

            return () => {}
        }, [drizzle.store, drizzleState, player2Address]
    )

    const initiateGame = async (contractInstance) => {
        console.log("CONTRACT instance", contractInstance);

        const timeout = await contractInstance.methods.TIMEOUT.call().call();
        setGameTimeout(5);

        const message = {
          type: "GAME_START",
          payload: {
            "contractAddress" : contractInstance.options.address,
            "timeout" : timeout
          }
        };

        notifyPlayer2(message);
    }

    const notifyPlayer2 = (message) => {
        console.log("SENDING MESSAGE TO PLAYER 2", message);
    }

    const handleTimeoutPlayer1 = async () => {
        console.log("HANDLE TIMEOUT PLAYER - TAKE BACK THE FUNDS - PLAYER 2 DID NOT PLAY HIS MOVE!");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);

        gameContract.methods.j2Timeout().send({
            from: player1Address
        }).on('receipt', function(value){
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
        }).on('receipt', function(value){
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
        }).on('receipt', function(value){
            console.log('receipt', value);
        }).catch(e => console.log("ERROR", e));
    }

    const handlePlayMovePlayer1 = async (move) => {
        setMovePlayer1(move);
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi);

        console.log("GAME CONTRACT BEFORE CREATION", gameContract);
        console.log("ACCOUNTS", drizzleState.accounts);

        //setPlayer1Address(drizzleState.accounts[0]);

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

    const handlePlayMovePlayer2 = async (move) => {
        setMovePlayer2(move);
        console.log("HANDLE RESOLVE GAME");
        console.log(drizzle.web3);

        let gameContract = new drizzle.web3.eth.Contract(RPS.abi, gameContractAddress);

        console.log("GAME CONTRACT", gameContract);
        console.log("CALLING PLAY FROM PLAYER 2", move);
        console.log("PLAYER 2 address", player2Address);

        gameContract.methods.play(move).send({
            from: player2Address,
            value: drizzle.web3.utils.toWei("1", "ether"),
        }).on('receipt', function(value){
            console.log('receipt', value);
        }).catch(e => console.log("ERROR", e));
    }

        let moves = ["Rock", "Paper", "Scissors", "Lizard", "Spock"];

        return (
            <Fragment>
                <h1>GAME Rock Paper Scissors Lizard Spock</h1>
                <h2>PLAYER 1 CONTROLS</h2>
                <h4>PLAYER 1 ADDRESS: {player1Address}</h4>
                <h4>PLAYER 1 BALANCE: {player1Balance}</h4>
                {moves.map((move, index) => (
                    <Move key={index} name={move} onClick={() => handlePlayMovePlayer1(index)} value={index}/>)
                )}
                <hr />
                <h2>PLAYER 2 CONTROLS</h2>
                <h4>PLAYER 2 ADDRESS: {player2Address}</h4>
                <h4>PLAYER 2 BALANCE: {player2Balance}</h4>
                {moves.map((move, index) => (
                    <Move key={"player_2_" + index} name={move} onClick={() => handlePlayMovePlayer2(index)} value={index}/>)
                )}
                {gameTimeout > 0 && (
                    <CountDown timeout={gameTimeout} onFinish={() => {}} />
                )}
                <hr />
                <ResolveButton onClick={() => handleResolveGame()} />
                <hr />
                <button key="timeout_player1" onClick={() => handleTimeoutPlayer1()} >TIMEOUT CALL PLAYER 1</button>
                <hr />
                <button key="timeout_player2" onClick={() => handleTimeoutPlayer2()} >TIMEOUT CALL PLAYER 2</button>
            </Fragment>
        );
}

export default Game