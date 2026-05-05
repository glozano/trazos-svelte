#!/usr/bin/env bash

LOCATION="${GIF_TEMP_DIR:-static/user-img}"

find $LOCATION -type f -mmin +30 -delete
