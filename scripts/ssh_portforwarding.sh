#!/bin/bash

localport=$1
node="st-lrwan1-$2"
username=$3
site=$4


if test "$#" -ne 4; then
    echo "Usage: $0 <localport> <node> <username> <site>"
    exit 1
fi

echo Trying to connect to $node on site $site with username $username via localport $localport

ssh -L $localport:$node:20000 $username@$site.iot-lab.info
