//Bridge schema give by AWS official Github repository and SDK

var awsIot = require('aws-iot-device-sdk');
//var mqtt = require('mqtt');

//Configuration of certificates, clientID and host endpoint (AWS IoT ARN Endpoint)
//Certificates given directly by AWS with "Create a thing" procedure
var device = awsIot.device({
   keyPath: "certs/kloakaDevice.private.key",
  certPath: "certs/kloakaDevice.cert.pem",
    caPath: "certs/kloakaDevice.crt",
  clientId: "KloakaTestMqttBridge",
      host: "a2nkqjvyvlcr2i-ats.iot.us-east-1.amazonaws.com"
});

console.log("MQTT TESTER FOR AWS IOT - KLOAKA")

device.on('connect', function() {
    console.log('connected to AWS');
    device.subscribe('kloaka_from_device');
  });

device.on('message', function(topic, payload) {
    console.log('Received message', topic, payload.toString());
  });



const readline = require('readline').createInterface({
    input: process.stdin,
    output: process.stdout
});

readline.question('deviceID: ', id => {
    readline.question('filling: ', filling => {
        console.log(`filling ${filling}!`);
        let test = {
            id: id,
            filling: filling
        }
        console.log(test);
        device.publish('kloaka_from_device', JSON.stringify(test));
        readline.close();
    });

  });




  