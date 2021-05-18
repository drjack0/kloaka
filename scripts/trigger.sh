#!/bin/bash

while true; do
    python3 ./generator.py | nc -q 1 localhost 20000;   
    sleep 30
done 
