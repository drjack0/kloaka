# Technology
This document provides technical details about kloaka.

Scroll down to read the previous versions of this document.

## \[16/07/2021] V3: Final Delivery
## Device
### Working principle
The [device](https://en.wikipedia.org/wiki/Ultrasonic_flow_meter) works exploiting the fact that ultrasonic waves propagating in the same direction of a liquid flowing in a pipe will be accelerated proportionally to their angle and to the amount of flow while bakwads wave will be decelerated.
This is a common approch in industrial grade flow meter as we can see for example [here](https://www.youtube.com/watch?v=DD2bBLu6kLM) and [here](https://www.youtube.com/watch?v=P_pBunU6uV8&t=551s).

### Sensor developing and structure
We tried to reproduce this behavior using common ultrasonics range finder.

The device is made of:
* Nucleo board
* Metal pipe
* Clear tubing
* 2x sfr04 without metal caps

We placed the sensord directly on the metal tubing holding the sensors with electrical tape and we used two sensor in opposite ways to detect flow direction

![dia_sensor](/docs/Images/technology/dia_sensor.png)

![img_sensor](/docs/Images/technology/img_sensor.jpg)

![img_setup](/docs/Images/technology/device.png)

To choose how to handle data we we have built a test setup composed by our sersor and a relay connected to a pump controlled by the nucleo. (See input data evaluation)

Every time the device enters in the measuring phase it takes 10 samples.

As the device will be battery powered, as we assume that electrical power isnt present in white water sewer, to maximize bttery life we need reduce duty cycle choosing to transmit every our or so, the device in fact will trasmit data an intervals while sensing multiple times during this interval.

To futher reduce this consuption we used RIOT-OS power management module to reduce energy consumption putting the device in a deep sleep mode during time beetween measures.

To redeuce data transmission data obtained from each sensing phase is reduced to a change of state that before data transmission will be mapped to a value between 0 and 100, then sended to the cloud.

## IoT-Lab infrastructure
The FIT/IoT-Lab testbed is employed to test Kloaka on a large scale.

### The nodes
As Kloaka uses LoRaWAN as chosen communications channel, `st-lrwan1` nodes are employed.
![lora-node](/docs/Images/technology/lrwan1.jpg)

### Jupyter Notebook
The interaction with the testbed is realized using a [Jupyter notebook](/dev/iot-lab/Kloaka.ipynb), which is tasked with submitting the experiments.
![lora-node](/docs/Images/technology/jupyter.jpeg)

### Trigger scripts
In order to run large-scale experiments with the nodes from IoT-Lab, a [trigger script](/scripts) is set up, which will be used to test the experiments by triggering flow events on the nodes offered by the testbed.

We planned our experiments to follow specific patterns in order to test all the possible combinations supported by our system.

### LoRaWAN
As the network is sparse, we chose LoRa as the transmitting medium for the device as it is capable of long range transmission, low energy consumption and a discrete resistance to interference.

The `st-lrwan1` nodes communicate using the LoRaWAN technology thanks to [The Things Network](https://www.thethingsnetwork.org/).

![ttn](/docs/Images/technology/ttn.jpg)


**TTN Application**

![ttn_app](/docs/Images/technology/TTN_app.png)

**Device and antenna positioning**

As the transmission obstruction underground could be significant, a multi-hop solution like [this](https://www.mdpi.com/1424-8220/19/2/402) would be cool but infeasible for this project so we decided to place the device not too far from manholes and place the antenna outside the sewer underground infrastructure.

**Integration with AWS**

After the messages are sent by the devices to TTN via the LoRAWAN uplink, they are directly forwarded to AWS IoT Core using the MQTT protocol. This is achieved thanks to the [Default Integration](https://www.thethingsindustries.com/docs/integrations/cloud-integrations/aws-iot/default/) offered by TTN itself, which required the deployment of an *AWS CloudFormation stack* directly  into our cloud infrastructiure.  
In this way, an AWS IoT rule specifically set to listen to the uplink topic of the TTN application we created is capable of intercepting the messages kloaka devices send to the uplink without the need to add any additional layer to the infrastructure.

**Security**

Concerning the Security aspect of the system, TTN already provides solid security features, in particular: 
* The OTAA method to join TTN dynamically assigns an address and negotiates security keys with the devices, therefore securing the communication between them. 
* The communication between TTN and AWS is also secure, as the integration described above requires to set some application-specific configurations, like for example an API key which must remain secret. 
* It is not possible to sniff the MQTT messages, as the device's devEUI as well as an additional API keys are needed, and in order to know them one would need to access the TTN console (which is of course password-protected).

### Collective Intelligence

In order to gather information about the weather, Kloaka relies on the REST APIs provided by [openweathermap](https://openweathermap.org/api), which allow to issue queries about the current weather in the city of interest via HTTP requests in the following format:
`https://api.openweathermap.org/data/2.5/weather?q=<CITY,COUNTRY>&APPID=<API KEY>` by simply replacing <CITY, COUNTRY\> with something like "Rome,it" and <API KEY\> with the API key received after subscribing to the service (a free tier allowing up to 60 requests per day is offered).

## Technology - AWS
In this section are explained all the steps made for developing the Kloaka's backend infrastructure.

![network-overview-second-delivery](/docs/Images/technology/aws/network_overview_second.png)

### Main model
![main-model](/docs/Images/technology/aws/Main-new.png)
Main AWS services used are:
- AWS Lambda: Serverless functions
- DynamoDB: NoSQL Database with stream integration
- API Gateway: Expose REST and WebSocket API's
- IoT Core: Mqtt Broker and Rules
- CloudFormation: Production Templates

With [Serverless Framework](https://www.serverless.com), integrating AWS CLI, yaml and Node.JS, we built the whole backend infrastructure, managing all the services directly from cli or yaml file.

Serverless Framework's aim is to easy create a CloudFormation Template, upload it on AWS and deploy all functionalities producted.

![serverless-logo](/docs/Images/technology/aws/serverless_framework_logo.png)

#### Data from Devices - Lambda Organizer
First step of the Kloaka machine is to have devices data on the cloud. Every device, through [TTN & AWS IoT Core integration](https://www.thethingsnetwork.org/docs/applications/aws/), can publish on IoT Mqtt Broker. Everytime a message is posted, an IoT Rule is called 

```sql
SELECT
end_device_ids.device_id as id,
end_device_ids.dev_eui as dev_eui,
uplink_message.frm_payload as filling
FROM 'thethings/lorawan/kloaka-ttn/#'
```

and a Lambda is triggered: Lambda **Organizer**.

Main goal of this function is to organize and format data riceived from devices and put them in the DynamoDB Table.

Every device's message is a Json Object, styled, for example, as below
```json
{
  "end_device_ids": {
    "device_id": "kloaka03",
    "application_ids": {
      "application_id": "kloaka"
    },
    "dev_eui": "5984656596326678",
    "join_eui": "0000000000000000"
  },
  "correlation_ids": [
    "as:up:01FANAC5RE0E1891WSN71S4TZ4",
    "rpc:/ttn.lorawan.v3.AppAs/SimulateUplink:5e068f67-c493-4293-92e2-6ba392177ad0"
  ],
  "received_at": "2021-07-15T14:50:49.487951507Z",
  "uplink_message": {
    "f_port": 1,
    "frm_payload": "MA==",
    "rx_metadata": [
      {
        "gateway_ids": {
          "gateway_id": "test"
        },
        "rssi": 42,
        "channel_rssi": 42,
        "snr": 4.2
      }
    ],
    "settings": {
      "data_rate": {
        "lora": {
          "bandwidth": 125000,
          "spreading_factor": 7
        }
      }
    },
    "received_at": "0001-01-01T00:00:00Z"
  },
  "simulated": false
}
```
Where `device_id`, string type, is unique for every device and, at the moment, costructed as, after `kloaka` text, the first number refers to the tube and the second number refers to the sensor,
Then `frm_payload`, under `uplink_message`, string type, indicates the flow level, encoded in *Base64*.

When stored in DynamoDB Table, data are formatted as below

```json
{
    "id": "String",
    "dev_eui": "String",
    "last_value": "String",
    "last_update": "Timestamp",
    "measurements": [
        {
            "filling": "String",
            "dt": "Timestamp"
        },
        {
            "filling": "String",
            "dt": "Timestamp"
        }
    ]
}
```

Where:
- `last_value` indicates the last flow value received
- `last_update` indicates the timestamp of last flow value received
- `measurements` is an array of object, where all the last data are stored

`Timestamp` is a number, for example: 1658274939.

If a device publishes on the AWS Cloud for the first time, then it is registered on the DynamoDB Table. On the next publication, the fields are updated and the last measurement added to the array.

#### DynamoDB Streams & Triggers

Devices are registered in a DynamoDB Table and updated everytime comes a measure. For estimate if a problem exists between two sensors, at the moment, we made a little assumption with the `filling` level

| Flow Level       | Assumption   |
| ---------------- |:------------:|
| 100              | Flow         |
| 0                | No Flow      |

![api-endpoints](/docs/Images/technology/aws/dynamodb-streams.png)

When a sensor's value is updated in DB, a Lambda function is triggered through the DynamoDB Stream functionalities. This Lambda checks the following sensor's filling value and compare this one with the current sensor's value.

Compared values are also implemented through the [openweathermap API](https://openweathermap.org/), that return us a `json object` with current weather infos about sensor's placement, used to improve the comparison process.

The following table resumes the results:

| Current Sensor | Following Sensor | Weather Data    | Return Value |   Description                   |
| -------------- |------------------| :-------------: | :----------: | :-----------------------------: |
| 100            | 100              | No weather data | OK           | NO                              |
| 100            | 100              | Good Weather    | OK           | NO                              | 
| 100            | 100              | Bad Weather     | OK           | NO                              |
| 100            | 0                | No weather data | OBSTRUCTION   | NO_WEATHER_DATA                 |
| 100            | 0                | Good Weather    | PROBLEM      | Probably leak or obstruction    |
| 100            | 0                | Bad Weather     | OBSTRUCTION  | Probably due to bad weather     |
| 0              | 100              | No weather data | PROBLEM      | NO_WEATHER_DATA                 |
| 0              | 100              | Good Weather    | OTHER        | Possible illegal substance dump |
| 0              | 100              | Bad Weather     | PROBLEM      | Probably due to bad weather     |
| 0              | 0                | No weather data | OK           | NO                              |
| 0              | 0                | Good Weather    | OK           | NO                              |
| 0              | 0                | Bad Weather     | OK           | NO                              |


`Return Value` is stored in the "Problem Table", if not equal to "OK", with this format

```json
{
    "problem_id": "String",
    "problem": "String",
    "problem_time": "Timestamp",
    "problem_status": "String",
    "problem_description": "String"
}
```

- `problem_id`: generated by the concatenation of current sensor's id and following sensor's id.
- `problem_status`: informations about the problem status (RESOLVED etc...)
- `problem_time`: timestamp
- `problem`: "OBSTRUCTION", "PROBLEM", "OTHER"
- `problem_description`: More informations about problem (combined with weather data)

```
Example: id1 = 01, id2 = 02 -> problem_id = 0102 [weather=GOOD and Flow level down].
{
    "problem_id": "0102",
    "problem": "OBSTRUCTION",
    "problem_time": 19282127361,
    "problem_status": "UNRESOLVED",
    "problem_description": "Probably due to bad weather"
}
```

#### Rest & WebSocket API
![api-endpoints](/docs/Images/technology/aws/api-gateway-diagram-general.svg)

All the `GET` endpoints are exposed publicly.
We have two type of API Gateway endpoints:
* API REST
  * `/device/{id}` -> Return informations about a single device
  * `/device/scan` -> Return informations about all devices
  * `/problem/{id}` -> Return informations about a single problem
  * `/problem/scan` -> Return informations about all problems
* WEBSOCKET API
  * `$connect` -> Connect to WebSocket API
  * `$disconnect`-> Disconnect from WebSocket API
  * `$default` -> Exchange of data through Websocket Channel

At the moment there aren't `POST`, `REMOVE` or `PUT` endpoints, so there is no type of protection on the API endpoints. Data are open to everyone who wants!

![api-endpoints](/docs/Images/technology/aws/API-new.png)

- WEBSOCKET ENDPOINT: `wss://0o7o4txyea.execute-api.us-east-1.amazonaws.com/dev`
- API REST ENDPOINT: `https://mo6thqx9bj.execute-api.us-east-1.amazonaws.com`

#### DashBoard

Web dashboard was made using [React framework](https://it.reactjs.org/) and allows the user to visualize data about:
* Single device (can be selected)
* Problems/Obstruction/Other total list
* Map with sensor (pins)

![api-endpoints](/docs/Images/technology/web_dashboard/kloaka-dashboard-device.png)
![api-endpoints](/docs/Images/technology/web_dashboard/kloaka-dashboard-error-list-total.png)
![api-endpoints](/docs/Images/technology/web_dashboard/kloaka-dashboard-sensor-map.png)
![api-endpoints](/docs/Images/technology/web_dashboard/kloaka-dashboard-device-pin.png)


## \[20/05/2021] V3: Group Project MVP Presentation

## Device
### Working principle
The [device](https://en.wikipedia.org/wiki/Ultrasonic_flow_meter) works exploiting the fact that ultrasonic waves propagating in the same direction of a liquid flowing in a pipe will be accelerated proportionally to their angle and to the amount of flow while bakwads wave will be decelerated.
This is a common approch in industrial grade flow meter as we can see for example [here](https://www.youtube.com/watch?v=DD2bBLu6kLM) and [here](https://www.youtube.com/watch?v=P_pBunU6uV8&t=551s).

### Sensor developing and structure
We tried to reproduce this behavior using common ultrasonics range finder.
![dia_sensor](/docs/Images/technology/dia_sensor.png)

We started ripping down the metal enclosure from the piezo spekers of the sensor and placing the bare piezos on a plastic tube, tryng to measure the "bounce-back" time of the trasmitted wave, hoowever this didn't produce valuable results.

Thus we tryed angling the tx and rx piezos by different angles using 3d printed angled prisms, this also has not produced valuable results.
So we decided to switch to a smaller diameter pipe and repeadtly try to changing angles, distances and configuration between piezos and... still nothing happened.

We then switched pipe material using a metal pipe and we placed the piezos directly in contact with the pipe.
After some experiment we tryed to increase the delay between the trig and the read of the echo pin finding it suitable at 300ms (over the 50ms suggested by RIOT docs and datasheet).
Testing the device reveals that for an empty tube a large value is returned, while while flowing water a smaller value is returned (eg: 123456 -> 3456).

This measure is phisically meaningless as it not represents the pipe's flow but we can use it to determine al least the two extreme cases (no water, water).
This works pretty well even if there are some outliers in the measure (we will discuss this in a while).

An important thing that we notice is that in this configuration the place of the Tx sensor is almost meaningless, in fact by moving it a different distances from the rx one it seems to not change much.
Pheraps we think that water flowing into the tube generates some particular frequency that, detected via the rx piezo triggers the sensor anyway.
![img_sensor](/docs/Images/technology/img_sensor.jpg)

### How do we measure?

To avoid false positives (and to in future get the direction of the flow) we employed, as now, two sensors.

To get an accurate measure while the values received from the sensors are oscillating we decide to repeat multiple measures for each sensor.
At first we have a reference phase in wich we sample the empty pipe, for now, 10 times, we take the minimum and the maximum of this measures and we store it.

Each sensing phase takes `(2+0.3) * NUMBER OF MEASURES * NUMBER OF SENSORS s so in our case 2.3 * 20 = 46 s`.

We then take the median of the measures and check weter or not it is contained in our reference reange (for eache sensor), if it's not we have water flowing through the pipe (we store 100) otherwise not (we store 0).

Between each measure we sleep, at now, for about 7 minutes (see evaluation document for explanation) and repeat the mesure.

After, for now, 10 rounds of measures, so about `(46+420) * 10 = 4660 s = 77 min` we take the median of the values stored by the each sensing and send that to the cloud.

## IoT-Lab infrastructure
The FIT/IoT-Lab testbed is employed to test Kloaka on a large scale. 
### The nodes
As Kloaka uses LoRaWAN as chosen communications channel, `st-lrwan1` nodes are employed.
![lora-node](/docs/Images/technology/lrwan1.jpg)
### Jupyter Notebook
The interaction with the testbed is realized using a [Jupyter notebook](/dev/iot-lab/Kloaka.ipynb), which is tasked with submitting the experiments.
![lora-node](/docs/Images/technology/jupyter.jpeg)
### Trigger scripts
In order to run large-scale experiments with the nodes from IoT-Lab, a [trigger script](/scripts) is set up, which will be used to test the experiments by triggering flow events on the nodes offered by the testbed.

### LoRaWAN
As the newtork will be sparse we chose LoRa as the transmitting medium for the device as it's capable of long range transmission, low energy consuption and a discrete resistance to interference.

The `st-lrwan1` nodes communicate using the LoRaWAN technology thanks to [The Things Network](https://www.thethingsnetwork.org/).

![ttn](/docs/Images/technology/ttn.jpg)

**Device and antenna positioning**

As the transmission obstruction underground could be significant, a multi-hop solution like [this](https://www.mdpi.com/1424-8220/19/2/402) would be cool but infeasible for this project so we decided to place the device not too far from manholes and place the antenna outside the sewer underground infrastructure.

**Messagge passing**

As LoRaWAN and The Thinghs of Network seems to have a good integration with AWS services [as stated here](https://aws.amazon.com/it/blogs/iot/connect-your-devices-to-aws-iot-using-lorawan/) we will proceed like this, probably straight forward.

## Technology - AWS
In this section are explained all the steps made for developing the Kloaka's backend infrastructure.

![network-overview-second-delivery](/docs/Images/technology/aws/network_overview_second.png)

### Main model
![main-model](/docs/Images/technology/aws/Main.png)
Main AWS services used are:
- AWS Lambda: Serverless functions
- DynamoDB: NoSQL Database with stream integration
- API Gateway: Expose REST and WebSocket API's
- IoT Core: Mqtt Broker and Rules
- CloudFormation: Production Templates

With [Serverless Framework](https://www.serverless.com), integrating AWS CLI, yaml and Node.JS, we built the whole backend infrastructure, managing all the services directly from cli or yaml file.

Serverless Framework's aim is to easy create a CloudFormation Template, upload it on AWS and deploy all functionalities producted.

![serverless-logo](/docs/Images/technology/aws/serverless_framework_logo.png)
#### Data from Devices - Lambda Organizer
First step of the Kloaka machine is to have devices data on the cloud. Every device, through [TTN & AWS IoT Core integration](https://www.thethingsnetwork.org/docs/applications/aws/), can publish on IoT Mqtt Broker. Everytime a message is posted, an IoT Rule is called 

```sql
SELECT * FROM 'kloaka_from_device'
```

and a Lambda is triggered: Lambda "Organizer".

Main goal of this function is to organize and format data riceived from devices and put them in the DynamoDB Table.

Every device's message is a Json Object, styled as below
```json
{
    "id": "String",
    "filling": "String"
}
```
Where `id`, string type, is unique for every device and, at the moment, costructed as the first number refers to the tube and the second number refers to the sensor,
Then `filling`, string type, indicates the flow level.

When stored in DynamoDB Table, data are formatted as below

```json
{
    "id": "String",
    "last_value": "String",
    "last_update": "Timestamp",
    "measurements": [
        {
            "filling": "String",
            "dt": "Timestamp"
        },
        {
            "filling": "String",
            "dt": "Timestamp"
        }
    ]
}
```

Where:
- `last_value` indicates the last flow value received
- `last_update` indicates the timestamp of last flow value received
- `measurements` is an array of object, where all the last data are stored

`Timestamp` is a number, for example: 1658274939.

If a device publishes on the AWS Cloud for the first time, then it is registered on the DynamoDB Table. On the next publication, the fields are updated and the last measurement added to the array.

#### DynamoDB Streams & Triggers

Devices are registered in a DynamoDB Table and updated everytime comes a measure. For estimate if a problem exists between two sensors, at the moment, we made a little assumption with the `filling` level

| Flow Level       | Assumption   |
| ---------------- |:------------:|
| 100              | Correct Flow |
| 50               | Low Flow     |
| 0                | No Flow      |

![api-endpoints](/docs/Images/technology/aws/dynamodb-streams.png)

When a sensor's value is updated in DB, a Lambda function is triggered through the DynamoDB Stream functionalities. This Lambda checks the following sensor's filling value and compare this one with the current sensor's value

| Current Sensor | Following Sensor | Return Value |
| -------------- |------------------| :----------: |
| 100            | 100              | OK           |
| 100            | 50               | OBSTRUCTION  |
| 100            | 0                | OBSTRUCTION  |
| 50             | 100              | PROBLEM      |
| 50             | 50               | OK           |
| 50             | 0                | OBSTRUCTION  |
| 0              | 100              | PROBLEM      |
| 0              | 50               | PROBLEM      |
| 0              | 0                | OK           |

`Return Value` is stored in the "Problem Table", if not equal to "OK", with this format

```json
{
    "problem_id": "String",
    "problem": "String",
    "problem_time": "Timestamp",
    "problem_status": "String"
}
```

- `problem_id`: generated by the concatenation of current sensor's id and following sensor's id.
- `problem_status`: informations about the problem
- `problem_time`: timestamp
- `problem`: "OBSTRUCTION", "PROBLEM"

```
Example: id1 = 01, id2 = 02 -> problem_id = 0102.
{
    "problem_id": "0102",
    "problem": "OBSTRUCTION",
    "problem_time": 19282127361,
    "problem_status": "UNRESOLVED"
}
```

#### Rest & WebSocket API
![api-endpoints](/docs/Images/technology/aws/api-gateway-diagram-general.svg)

All the `GET` endpoints are exposed publicly.
We have two type of API Gateway endpoints:
* API REST
  * `/device/{id}` -> Return informations about a single device
  * `/device/scan` -> Return informations about all devices
  * `/problem/{id}` -> Return informations about a single problem
  * `/problem/scan` -> Return informations about all problems
* WEBSOCKET API
  * `$connect` -> Connect to WebSocket API
  * `$disconnect`-> Disconnect from WebSocket API
  * `$default` -> Exchange of data through Websocket Channel

At the moment there aren't `POST`, `REMOVE` or `PUT` endpoints, so there is no type of protection on the API endpoints

![api-endpoints](/docs/Images/technology/aws/API.png)

- WEBSOCKET ENDPOINT: `wss://0o7o4txyea.execute-api.us-east-1.amazonaws.com/dev`
- API REST ENDPOINT: `https://mo6thqx9bj.execute-api.us-east-1.amazonaws.com`

#### DashBoard

WORK IN PROGRESS

## \[08/04/2021] V1: Initial Ideas Pitch
## Sensors and data
Of course there are many metrics of interest to evaluate sewer water condition.
Based on the goal of the device we chose the following.
### Water turbidity
A water turbidity sensor like the [SEN0189](https://media.digikey.com/pdf/Data%20Sheets/DFRobot%20PDFs/SEN0189_Web.pdf) will be used to measure amount of suspended particles in sewer water to assess it's polluting rate.
As from the datasheet:

> It uses light to detect
> suspended particles in water by measuring the light transmittance and scattering rate, which
> changes with the amount of total suspended solids (TSS) in water. As the TTS increases, the liquid
> turbidity level increases. 

### pH sensing
Measuring water's pH is essential to know if the water will damage aquatic organisms.
This measurement is entrusted to a sensor such as the [SEN0169](https://media.digikey.com/pdf/Data%20Sheets/DFRobot%20PDFs/SEN0161_SEN0169_Web.pdf).
Key caracteristics for choosing this device are:
- Continuos measuring: the characteristic of beeng continusly immersed in water;
- Waterproofness;
- Durability: the particles and pH changes in the solution could reduce significantly the lifespan of the device.

This sensors works mapping pH changes to small voltage changes then amplified by the included board thus readable by our board.

### Measuring the flow
To measure the flow will be infeasible to use a device like [this](https://theorycircuit.com/water-flow-sensor-yf-s201-arduino-interface/) as the impurity and particles in wastewater could easly block it letting the device be unreliable.
So we reused the concept and camed up with a bigger 3d printed paddle wheel like the one below with an embedded rotary encoder.
![paddle_design](Images/technology/paletta.jpg)
From [this design](https://eribuijs.blogspot.com/2017/01/peddle-wheel-boat-3d-printed.html)
## Actuators

### A LED indicator
To reduce energy consuption and to increase the lifespan of the device the only actuator we choose to use in the device is a simple led to let the human operator precisely locate the fault site.
It lights up when the system detects an anomaly in the tubing that will be further solved from the operator.

## Network overview
![network_overview](Images/technology/network_overview.png)
### LoRaWAN
As the newtork will be sparse we chose LoRa as the transmitting medium for the device as it's capable of long range transmission, low energy consuption and a discrete resistance to interference.

### Device and antenna positioning
As the transmission obstruction underground could be significant, a multi-hop solution like [this](https://www.mdpi.com/1424-8220/19/2/402) would be cool but infeasible for this project so we decided to place the device not too far from manholes and place the antenna outside the sewer underground infrastructure.

### Messagge passing
As LoRaWAN and The Thinghs of Network seems to have a good integration with AWS services [as stated here](https://aws.amazon.com/it/blogs/iot/connect-your-devices-to-aws-iot-using-lorawan/) we will proceed like this, probably straight forward.

## Think, show and act
### Data processing
Data from the onboard environmental sensors and external data of city air pollution and marine pollution are aggregated to determine the efficiency of the purification process of wastewater, to know if there is some "illegal addition of wastewater" and to determine the impact of city pollution over marine pollution.

The wastewater flow data from adiacent devices is then processed to determine the direction and the intensity of the flow in a given section of the sewer with which we can determine if at some point there is a blockage determined by garbage or leaks in the tubing looking for differences in flows beween the two adiacent devices.
Furthermore using meteorological data we can extimate futures flows based on precipitation to schedule maintainance.

### Dashboard
To monitor the status of the sewer and let the operators act there will be a dashboard providing infos on the detetced flows and amount of pollutants on the sewer map, it will let the operator clearly visualize the detected malfuncioning sewer sections in the map via a Geographic Information Systems (GIS) providing their location and specifyng the problem.
Furthermore data from the environmental sensing could then be provided as open data.

