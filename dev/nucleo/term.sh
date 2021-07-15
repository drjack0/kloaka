#!/bin/sh
#!!!!!!RUN WITH SUDO!!!!!!
./../RIOT/dist/tools/tapsetup/tapsetup -d
./../RIOT/dist/tools/tapsetup/tapsetup
ip a a fec0:affe::1/64 dev tapbr0
make BUILD_IN_DOCKER=1 BOARD=nucleo-f401re term
