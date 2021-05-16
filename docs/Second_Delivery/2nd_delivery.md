# 2nd Delivery

## Comments Received during the 1st delivery

### 1. The project idea is too rich
It was observed that our idea was too rich, meaning we planned to add too many features to the project (namely: water quality control and leakage/obstruction checks) and we were suggested to focus only on the most interesting feature: checking for leakages or physical obstructions in the pipes. 

### 2. Emoploy ultra-sonic sensors
We were also suggested that we might try to do that in a non-invasive way (we planned to add turbines inside the pipes, which required to open the pipes themselves) by employing \[ultra-]sound sensors.  

### 3. The choice of our sensors
Another comment regarded the fact that employing ph-meters and water turbidity sensors would make no sense in wastewaters.

## Changes to the concept 
We gladly accepted the received comments and decided to focus only on the aforementioned issue adopting ultre-sonic sensors placed on top of the pipes to achieve our goal, as this technique particularly caught our interest. 

Therefore we planned to set-up our proof of concept accordingly: we decided to place ultrasonic sensors on top of a metal pipe and try to  infer information about the flow from there. We found out that a similar technique is already adopted in industrial settings: an example can be found [here](https://www.youtube.com/watch?v=BBwSUUlSL5o).

## Technical work done since the 1st delivery
### The proof of concept
The work on the proof of concept took us a lot of time to get a functioning prototype, we made several attempts with different kinds of pipes (PVC, rubber, metal) and different placements of the ultra-sonic sensors. We tried several configurations and during the first tries we did not get any reasonable readings from the sensors. 

We concluded that, in order for the proof of concept to work, we needed to use a **metal** pipe, with a small section to have it completely filled with  water and thus recognize a regular flow using the sensors.   
The picture below shows an example of our configuration
>IMG HERE<

### IoT Lab
We set up a [notebook](/dev/iot-lab/Kloaka.ipynb) in order to run large-scale experiments in the real-world testbed of FIT/IoT-Lab, alongside a [trigger script](/scripts) which will be used to test the experiments by triggering flow events on the nodes offered by the testbed.

### AWS infrastructure
We set up an infrastructure on AWS to receive data from the devices, save them to a set of *Dynamo DB* tables in order to both check them using *Lambdas* (which also are tasked with triggering the actuator: a led).

## Missing functionalities
* LoRa communication infrastructure
* Web dashboard
* Connecting the different components together
* Add security functionalities to the overall system, in order to prevent tampering with the firmware or publicly disclosing information.

## Evaluation conducted since the 1st delivery
As previously stated, getting the proof of concept to work took us a lot of time, so only managed to think about what metrics to evaluate once our infrastructure is all up and running. 

## What we exoect expect to evaluate till the final delivery
We decided to structure the evaluation of our project based on the following factors:
* Speed
* Capacity
* Energy

We planned to measure the needed information by employing the *Consumption* and *Radio monitoring* facilities offered by IoT lab.