import React, {useState, useEffect, Fragment} from "react"
import useCountDown from "./useCountDown";
import RPS from './contracts/RPS.json';
import Move from "./Move";
import {formatCountdown, generateHash, generateSalt} from "./utils";
import ResolveButton from "./ResolveButton";

const Game = props => {
    const {drizzle, drizzleState} = props

    const [player1Address, setPlayer1Address] = useState(null);
    const [player2Address, setPlayer2Address] = useState(null);
    const [contract, setContract] = useState(null);
    const [hash, setHash] = useState("");
    const [salt, setSalt] = useState("");
    const [gameTimeout, setGameTimeout] = useState(0);

    //const [timeLeft, {start, reset}] = useCountDown(10 * 1000);

    useEffect(
        () => {
            setPlayer2Address("0xFd51e0dF03E9aB9d228ba6f766a322E59d6dBA1e");
            return () => {}
        }, [drizzle.store, drizzleState]
    )

    const initiateGame = async (contractInstance) => {
        console.log("CONTRACT instance", contractInstance);

        const timeout = await contractInstance.methods.TIMEOUT.call().call();
        setGameTimeout(timeout);

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

    const handleResolveGame = async (move) => {
        console.log("HANDLE RESOLVE GAME");
    }

    const handleSelectMove = async (move) => {
        console.log(drizzle.web3);

        let myContract = new drizzle.web3.eth.Contract(RPS.abi);

        console.log("MY CONTRACT", myContract);
        console.log("ACCOUNTS", drizzleState.accounts);

        setPlayer1Address(drizzleState.accounts[0]);

        const salt = generateSalt();

        const hash = generateHash(drizzle.web3, move, salt);

        console.log("HASH", hash);

        setHash(hash);
        setSalt(salt);

        myContract.deploy({
            data: RPS.bytecode,
            arguments: [hash, player2Address]
        }).send({
            from: drizzleState.accounts[0],
            value: drizzle.web3.utils.toWei("0.001", "ether"),
        }).then(instance => {
            initiateGame(instance);
        }).catch(e => console.log("ERROR", e));
    }

        let moves = ["Rock", "Paper", "Scissors", "Lizard", "Spock"];

        return (
            <Fragment>
                <h1>GAME Rock Paper Scissors Lizard Spock</h1>
                {moves.map((move, index) => (
                    <Move key={index} name={move} onClick={() => handleSelectMove(index)} value={index}/>)
                )}
                {/*<p>Time left: {formatCountdown(timeLeft/1000)}</p>*/}
                <br /><br />
                <ResolveButton onClick={handleResolveGame} />
            </Fragment>
        );
}

export default Game