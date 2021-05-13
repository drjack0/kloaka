#!/bin/bash

for i in 1 2 3 4 5; do     
    echo "trigger $i" | nc -q 1 localhost 20000; 
done