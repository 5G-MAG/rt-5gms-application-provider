#!/bin/bash

# Navigate to the management UI directory
cd /ui/management-ui/

# Web GUI as second process
uvicorn server:app --reload --host 0.0.0.0 --port 8000
