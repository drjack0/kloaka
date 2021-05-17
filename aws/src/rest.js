//REST ENDPOINTS

const AWS = require("aws-sdk");

function call(action,params){
    const dynamoDB = new AWS.DynamoDB.DocumentClient();
    return dynamoDB[action](params).promise();
}

function success(body){
    return buildResponse(200,body);
}

function failure(body){
    return buildResponse(500,body);
}

function buildResponse(statusCode,body){
    return {
        statusCode: statusCode,
        headers: {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Credentials": true
        },
        body: JSON.stringify(body)
    };
}

module.exports.getDeviceStat = async function (event, context){
    console.log(event);
    const params = {
        TableName: process.env.TableA,

        Key: {
            id: event.pathParameters.id
        }
    };

    console.log(params);

    try{
        const result = await call("get", params);
        console.log(result);
        return success(result);
    } catch(err) {
        console.log(err);
        return failure({status: false});
    }
}

module.exports.getAllDevices = async function(event, context){
    console.log(event);
    const params = {
        TableName: process.env.TableA
    }

    console.log(params);

    try{
        const result = await call("scan", params);
        console.log(result);
        return success(result);
    } catch(err) {
        console.log(err);
        return failure({status: false});
    }

}

module.exports.getProblem = async function(event,context){
    console.log(event);
    const params = {
        TableName: process.env.ProblemTable,
        Key: {
            problem_id: event.pathParameters.problem_id
        }
    };
    console.log(params);

    try{
        const result = await call("get", params);
        console.log(result);
        return success(result);
    } catch(err) {
        console.log(err);
        return failure({status: false});
    }
}

module.exports.getAllProblems = async function(event, context){
    console.log(event);
    const params = {
        TableName: process.env.ProblemTable
    }

    console.log(params);

    try{
        const result = await call("scan", params);
        console.log(result);
        return success(result);
    } catch(err) {
        console.log(err);
        return failure({status: false});
    }
}