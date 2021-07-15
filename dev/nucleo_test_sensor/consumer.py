import paho.mqtt.client as mqtt
import json
import os

results_dir="./results/"

def on_connect(client, userdata, flags, rc):  # The callback for when the client connects to the broker
    print(f"Connected with result code {str(rc)}")  # Print result of connection attempt
    client.subscribe("out")  # Subscribe to the topic “digitest/test1”, receive any messages published on it

def on_message(client, userdata, msg):  # The callback for when a PUBLISH message is received from the server.
    #print("Message received-> " + msg.topic + " " + str(msg.payload))  # Print a received msg
    #print(str(msg.payload.decode("utf-8")))
    values=msg.payload.decode("utf-8").split(";")
    with open(f"./results/{values[0]}.txt",'a+') as f:
        f.write(values[1]+"\n")


client = mqtt.Client("boop")  # Create instance of client with client ID “digi_mqtt_test”
client.on_connect = on_connect  # Define callback function for successful connection
client.on_message = on_message  # Define callback function for receipt of a message
client.connect('127.0.0.1', 1886)
client.loop_forever()  # Start networking daemon