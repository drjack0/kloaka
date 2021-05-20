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
