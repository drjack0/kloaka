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
As the newtork will be sparse we chose LoRa as the transmitting medium for the device as it is capable of long range transmission, low energy consuption and a discrete resistance to interference.

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

## Collective Intelligence

In order to gather information about the weather, Kloaka relies on the REST APIs provided by [openweathermap](https://openweathermap.org/api), which allow to issue queries about the current weather in the city of interest via HTTP requests in the following format:
`'https://api.openweathermap.org/data/2.5/weather?q=<CITY,COUNTRY>&APPID=<API KEY>` by simply replacing <\CITY, COUTRY\> with something like "Rome,it" and <\API KEY\> with the API key received after subscribing to the service (a free tier allowing up to 60 requests per day is offered).