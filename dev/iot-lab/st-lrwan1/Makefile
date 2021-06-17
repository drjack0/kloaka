# Name of your application
APPLICATION = kloaka

# If no BOARD is found in the environment, use this default:
BOARD ?= b-l072z-lrwan1

# This has to be the absolute path to the RIOT base directory:
RIOTBASE ?= /senslab/users/priamo/RIOT/

USEMODULE += xtimer
USEMODULE += hts221

#
# The application needs LoRaWAN related modules and variables:
#

# The Semtech LoRa radio device (SX1276)
USEMODULE += sx1276
USEMODULE += semtech_loramac_rx

# The Semtech Loramac package
USEPKG += semtech-loramac

# Default region is Europe and default band is 868MHz
LORA_REGION ?= EU868


USEMODULE += shell

ifneq (,$(TTN_DEV_ID))
  CFLAGS += -DTTN_DEV_ID=\"$(TTN_DEV_ID)\"
endif


# Comment this out to disable code in RIOT that does safety checking
# which is not needed in a production environment but helps in the
# development process:
DEVELHELP ?= 1

# Comment this out to join RPL DODAGs even if DIOs do not contain
# DODAG Configuration Options (see the doc for more info)
# CFLAGS += -DCONFIG_GNRC_RPL_DODAG_CONF_OPTIONAL_ON_JOIN

# Change this to 0 show compiler invocation lines by default:
QUIET ?= 1

include $(RIOTBASE)/Makefile.include
