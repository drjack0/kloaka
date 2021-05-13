#!/bin/bash

node=$1
username=$2 
site=$3 

if test "$#" -ne 3; then
    echo "Usage: $0 <node> <username> <site>"
    exit 1
fi

echo Trying to connect to $node on site $site with username $username

ssh -L 20000:$node:20000 $username@$site.iot-lab.info
