#!/bin/bash

while true; do
    #python3 ./generator.py | nc -q 1 localhost 20000;

    for port in "$@"
    do
        echo ">> Sending to local port: $port";   
        python3 ./generator.py | nc -q 1 localhost $port;   
        sleep 1 ; 
    done

    sleep 77m
done 
