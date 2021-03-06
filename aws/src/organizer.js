var AWS = require('aws-sdk');

var dynamo = new AWS.DynamoDB.DocumentClient();
var table = process.env.TableA;

/*DA IMPLEMENTARE
function calculateZone(id){
    //PRIMA FARE DEHASHING DELLA POSIZIONE PER AVERE LE COORDINATE
    for(i=0; i < zones.length; i++){
        if(latDevice > zones[i].lat1 && latDevice < zones[i].lat2 && latDevice > zones[i].long1 && latDevice < zones[i].long2){
            return ("table" + zones[i].zone);
        }
    }
}
var zones = [
    {
        zone: "A",
        lat1: 32,
        long1: 114,
        lat2: 36,
        long2: 118
    },
    {
        zone: "B",
        lat1: 12,
        long1: 84,
        lat2: 26,
        long2: 108
    },
    {
        zone: "C",
        lat1: 132,
        long1: 214,
        lat2: 236,
        long2: 318
    }
]
*/

exports.handler = function(event, context, callback) {
    console.log('Received measurement:', JSON.stringify(event, null, 2));

    console.log(event);
    let buff = new Buffer.from(event.filling, 'base64');
    console.log("BUFF, ", buff);
    let received_data = buff.toString('ascii');
    console.log("RECEIVED DATA POST BUFF, ", JSON.stringify(received_data));
    const time = Date.now();
    const mes_data = {
            filling: received_data,
            dt: time
        };

    var params = {
        TableName:table,
        Key: {
            id: event.id.substring(6,8)
        },
        UpdateExpression: "ADD measurements :mes SET last_value = :last_value, last_update = :last_update, dev_eui = :dev_eui",
        ExpressionAttributeValues: {
            ":mes": dynamo.createSet([JSON.stringify(mes_data)]),
            ":last_update": time,
            ":dev_eui": event.dev_eui,
            ":last_value": mes_data.filling
        }
    }

    console.log("Adding event to database");
    dynamo.update(params, function(err, data) {
        if (err) {
            console.error("Unable to add event. Error JSON:", JSON.stringify(err, null, 2));
            callback(err);
        } else {
            callback(null,'DynamoDB updated successfully');
        }
    });
}
