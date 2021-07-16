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

