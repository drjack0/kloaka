import React from "react";
import { Container } from "./styled-components";

export function CustomTable(props) {
    const { data, type } = props;
    function getDateTimestamp(timestamp){
        const dateObject = new Date(timestamp);
        return dateObject.toLocaleString("it-IT",{day:"numeric"})
        + "/"
        + dateObject.toLocaleString("it-IT",{month:"numeric"})
        + ", "
        + dateObject.toLocaleTimeString("it-IT");
    };

    //PROBLEM TABLE TYPE
    if(type === "PROBLEMS"){
        let list = [];
        for(let i = 0; i < data.length; i++){
            if(data[i].problem === "PROBLEM" && data[i].problem_status !== "SOLVED"){
                let selected = data[i];
                list.push({
                    firstSensor: selected.problem_id.substring(0,2),
                    secondSensor: selected.problem_id.substring(2,4),
                    status: selected.problem_status,
                    time: selected.problem_time,
                    description: selected.problem_description
                })
            }
        }
        if(list.length === 0){
            return (
                <Container className="card-value pt-4 text-medium">
                  No "Problem" detected in whole system
                </Container>
            )
        }
        return(
            <table className="problem-table text-small">
                <thead>
                    <tr>
                        <th>Sensors</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr> 
                </thead>
                <tbody>
                    {list.map((data,key) => {
                        return(
                            <tr className="text-x-small">
                                <td>{data.firstSensor} - {data.secondSensor}</td>
                                <td>{getDateTimestamp(data.time)}</td>
                                <td>{data.status}</td>
                                <td>{data.description}</td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        )
    }

    // OBSTRUCTION TABLE TYPE
    else if(type === "OBSTRUCTIONS"){
        let list = [];
        for(let i = 0; i < data.length; i++){
            if(data[i].problem === "OBSTRUCTION" && data[i].problem_status !== "SOLVED"){
                let selected = data[i];
                list.push({
                    firstSensor: selected.problem_id.substring(0,2),
                    secondSensor: selected.problem_id.substring(2,4),
                    status: selected.problem_status,
                    time: selected.problem_time,
                    description: selected.problem_description
                })
            }
        }
        if(list.length === 0){
            return (
                <Container className="card-value pt-4 text-medium">
                  No "Obstruction" detected in whole system
                </Container>
            )
        }
        return(
            <table className="problem-table text-small">
                <thead>
                    <tr>
                        <th>Sensors</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr> 
                </thead>
                <tbody>
                    {list.map((data,key) => {
                        return(
                            <tr className="text-x-small">
                                <td>{data.firstSensor} - {data.secondSensor}</td>
                                <td>{getDateTimestamp(data.time)}</td>
                                <td>{data.status}</td>
                                <td>{data.description}</td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        )
    }

    // OTHER TABLE TYPE
    else{
        let list = [];
        for(let i = 0; i < data.length; i++){
            if(data[i].problem === "OTHER" && data[i].problem_status !== "SOLVED"){
                let selected = data[i];
                list.push({
                    firstSensor: selected.problem_id.substring(0,2),
                    secondSensor: selected.problem_id.substring(2,4),
                    status: selected.problem_status,
                    time: selected.problem_time,
                    description: selected.problem_description
                })
            }
        }
        if(list.length === 0){
            return (
                <Container className="card-value pt-4 text-medium">
                  No "Other" detected in whole system
                </Container>
            )
        }
        return(
            <table className="problem-table text-small">
                <thead>
                    <tr>
                        <th>Sensors</th>
                        <th>Time</th>
                        <th>Status</th>
                        <th>Notes</th>
                    </tr> 
                </thead>
                <tbody>
                    {list.map((data,key) => {
                        return(
                            <tr className="text-x-small" key={key}>
                                <td>{data.firstSensor} - {data.secondSensor}</td>
                                <td>{getDateTimestamp(data.time)}</td>
                                <td>{data.status}</td>
                                <td>{data.description}</td>
                        </tr>
                        )
                    })}
                </tbody>
            </table>
        )
    }
}