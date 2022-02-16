import React, {useEffect, useState} from 'react'
import useCountDown from "./useCountDown";
import {formatCountdown} from "./utils";

const CountDown = props => {
    const {timeout, onFinish} = props;

    console.log("CountDown", timeout);
    const [timeLeft, {start, reset}] = useCountDown(timeout * 1000, onFinish);
    const [initialized, setInitialized] = useState(false);

    useEffect(
        () => {
            start();
            setInitialized(true);
            return () => {}
        }, [timeout, start]
    );

    return (
        <h1>{formatCountdown(timeLeft/1000)}</h1>
    );
}

export default CountDown;
