#!/bin/bash
# Make sure the script is executable
chmod +x ./node_modules/.bin/react-scripts
# Install dependencies
npm install
# Build the application
CI=false ./node_modules/.bin/react-scripts build
