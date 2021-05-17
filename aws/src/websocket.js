// WEBSOCKET ENDPOINTS

const DynamoDB = require('aws-sdk/clients/dynamodb');

module.exports.connect = async function(event,context,callback){
    const db = new DynamoDB.DocumentClient();
    var putParams = {
        TableName: "Kloaka-WebsocketManager", // In our case, "Kloaka-WebSocketManager"
        Item: {
            connectionID: event.requestContext.connectionId,
        }
    };

    try {
    // Insert incoming connection id in the WebSocket
        await db.put(putParams).promise();
        return {
            statusCode: 200,
            body: "Connected"
        };
    } catch (e) {
        console.error('error!', e);
        return {
            statusCode: 501,
            body: "Failed to connect: " + JSON.stringify(e),
        };
    }
};

module.exports.disconnect = async function(event, context, callback){
    const db = new DynamoDB.DocumentClient();
    var deleteParams = {
        TableName: "Kloaka-WebsocketManager", // In our case, "Kloaka-WebSocketManager"
        Key: {
            connectionID: event.requestContext.connectionId,
        }
    };

    try {
    // If the client dis
        await db.delete(deleteParams).promise();
        return {
            statusCode: 200,
            body: "Disconnected"
        }
    } catch (e) {
        console.error('error!', e);
        return {
            statusCode: 501,
            body: "Failed to disconnect: " + JSON.stringify(e),
        };
    }
}