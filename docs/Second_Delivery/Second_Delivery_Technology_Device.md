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

To get an accurate masure while the values received from the sensors are oscillating we decide to repeat multiple measures for each sensor.
At first we have a reference phase in wiche we sample the empty pipe, for now, 10 times, we take the minimum and the maximum of this measures and we store it.

Each sensing phase takes `(2+0.3) * NUMBER OF MEASURES * NUMBER OF SENSORS s so in our case 2.3 * 20 = 46 s`.

We then take the median of the measures and check weter or not it is contained in our reference reange (for eache sensor), if it's not we have water flowing through the pipe (we store 100) otherwise not (we store 0).

Between each measure we sleep, at now, for about 7 minutes (see evaluation document for explanation) and repeat the mesure.

After, for now, 10 rounds of measures, so about `(46+420) * 10 = 4660 s = 77 min` we take the median of the values stored by the each sensing and send that to the cloud.
