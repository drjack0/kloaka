const ApiGatewayManagementApi = require('aws-sdk/clients/apigatewaymanagementapi');
const DynamoDB = require('aws-sdk/clients/dynamodb');
const converter = require("aws-sdk").DynamoDB.Converter;

const AWS = require("aws-sdk");
const axios = require("axios");

function call(action,params){
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    return dynamoDB[action](params).promise();
}

module.exports.trigger = async function (event, context, callback) {
    const db = new DynamoDB.DocumentClient();
    let connections;

    // Try Websocket Connection, check the dynamoDB Table for connectionID
    try {
        connections = await db.scan({ TableName: "Kloaka-WebsocketManager", ProjectionExpression: 'connectionID' }).promise();
        console.log("PRIMO AWAIT", connections)
    } catch (e) {
        return { 
            statusCode: 500, 
            body: e.stack };
    }

    
    console.log("EVENT",JSON.stringify(event,null,2));
    if(event.Records[0].eventName === "REMOVE") return "REMOVE EVENT";
    let data = converter.unmarshall(event.Records[0].dynamodb.NewImage);
    console.log("DATA",JSON.stringify(data));
    const tube = data.id.charAt(0);
    const id = data.id.substr(1);
    var post_id_2 = parseInt(id)+1;
    post_id = tube.concat(post_id_2);
    console.log("TUBE", tube, "| ID", id, "| POST_ID",post_id);

    const post_params = {
        TableName: process.env.TableA,
        Key: {
            id: post_id
        }
    };

    try{
        const post_sensor = await call("get",post_params)
        console.log("POST_SENSOR_GET_ITEM", post_sensor);
        if(post_sensor.Item){
            try{
                const result = await post_comparator(post_sensor, data);
                if(result.problem !== "OK"){
                    var problem = {
                        problem_id: data.id.concat(post_id),
                        problem_time: Date.now(),
                        problem: result.problem,
                        problem_status: "UNRESOLVED",
                        problem_description: result.description
                    }
                    console.log("PROBLEM LOG", problem);
                    var problem_item = {
                        TableName: process.env.ProblemTable,
                        Item : problem
                    }
                    try {
                        const dynamo_insert_result = await call("put",problem_item);
                        console.log("DYNAMO PROBLEM INSERT", dynamo_insert_result);
                        return callWebsocket(connections,problem);
                    } catch(err) {
                        console.log("ERROR DYNAMO PROBLEM INSERT",err);
                        return callWebsocket(connections,{
                            error: err
                        })
                    }
                } else{
                    return callWebsocket(connections,{
                        message: result
                    })
                }
            } catch(err){
                console.log("ERROR POST COMPARATOR",err);
                return callWebsocket(connections,{
                    error: err
                })
            }
            
        } else {
            return callWebsocket(connections,{
                message: "LAST SENSOR"
            })
        }
    } catch(err) {
        console.log("ERROR DYNAMO TABLE GET",err);
        return callWebsocket(connections,{
            error: err
        })
    }
}

async function post_comparator(post_sensor, sensor){
    console.log("POST_SENSOR_ITEM", post_sensor.Item);
    console.log("SENSOR_ITEM", sensor);

    try{
        const api_call = await axios.get("https://api.openweathermap.org/data/2.5/weather?q=Rome,IT&APPID=851d5349dce623d142023194a74c8538");
        console.log("API CALL OPENWEATHER ", api_call);

        const weatherJSON = api_call.data;
        console.log("WEATHER JSON, ",weatherJSON);

        const weather = api_call.data.weather[0].main;
        console.log("RETRIEVED WEATHER ", weather)

        var post_sensor_lastMes = {
            filling: post_sensor.Item.last_value * 1,
            time: post_sensor.Item.last_update
        }

        var sensor_lastMes = {
            filling: sensor.last_value * 1,
            time: sensor.last_update
        }

        // const weatherConditions = ["Thunderstorm", "Drizzle", "Rain", "Snow", "Squall", "Clear", "Clouds"];
    
        if(post_sensor_lastMes.filling > sensor_lastMes.filling){ // Flow Level DOWN
            // NO WEATHER DATA
            if(weather === undefined || weather === null){
                return {
                    problem: "OBSTRUCTION",
                    description: "NO_WEATHER_DATA"
                }
            }
            // BAD WEATHER
            if(weather === "Thunderstorm" || weather === "Rain" || weather === "Snow" || weather === "Squall"){
                return {
                    problem: "OBSTRUCTION",
                    description: "Probably due to bad weather"
                }
            } else if(weather === "Drizzle" || weather === "Clear" || weather === "Clouds"){ // GOOD WEATHER
                return {
                    problem: "OBSTRUCTION",
                    description: "Possible illegal taking of water"
                }
            }
        } else if (post_sensor_lastMes.filling < sensor_lastMes.filling){ // Flow Level UP
            // NO WEATHER DATA
            if(weather === undefined || weather === null){
                return {
                    problem: "PROBLEM",
                    description: "NO_WEATHER_DATA"
                }
            }
            // BAD WEATHER
            if(weather === "Thunderstorm" || weather === "Rain" || weather === "Snow" || weather === "Squall"){
                return {
                    problem: "PROBLEM",
                    description: "Probably due to bad weather"
                }
            } else if(weather === "Drizzle" || weather === "Clear" || weather === "Clouds"){ // GOOD WEATHER
                return {
                    problem: "OTHER",
                    description: "Possible illegal entry of water"
                }
            }
        } else {
            return {
                problem: "OK",
                description: "NO"
            }
        }
    } catch(err){
        console.log("ERROR AXIOS CALL",err);
    }
}

async function callWebsocket(connections,data){
    console.log("WEBSOCKET PASSED DATA", data);
    const api = new ApiGatewayManagementApi({
        endpoint: "https://0o7o4txyea.execute-api.us-east-1.amazonaws.com/dev",
    });
    const postCalls = connections.Items.map(async ({ connectionID }) => {
        await api.postToConnection({
            ConnectionId: connectionID,
            Data: JSON.stringify(data)
        }).promise();
        console.log("CONNECTION ID: "+connectionID, "DATA PASSED: " + JSON.stringify(data));
    });
    try {
        await Promise.all(postCalls);
    } catch (e) {
        console.log("ERROR IN WEBSOCKET CALL", err);
        return { statusCode: 500, body: e.stack };
    }

    return {
        statusCode: 200,
        body: 'Event sent.'
    };
}