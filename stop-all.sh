#!/bin/bash

# ZKP Ledger System - Stop All Services

echo "🛑 Stopping ZKP Ledger System..."

# Function to stop a service
stop_service() {
    local name=$1
    local logname=$(echo "$name" | tr ' ' '-' | tr '[:upper:]' '[:lower:]')
    
    if [ -f "logs/${logname}.pid" ]; then
        pid=$(cat "logs/${logname}.pid")
        if ps -p $pid > /dev/null 2>&1; then
            echo "Stopping $name (PID: $pid)..."
            kill $pid 2>/dev/null || true
            rm "logs/${logname}.pid"
        else
            echo "$name is not running"
            rm "logs/${logname}.pid" 2>/dev/null || true
        fi
    else
        echo "No PID file for $name"
    fi
}

# Stop all services
stop_service "Ledger Service"
stop_service "Prover Coordinator"
stop_service "Prover Worker"
stop_service "Rollup Aggregator"
stop_service "Credential Issuer"
stop_service "API Gateway"
stop_service "Identity Service"
stop_service "Startup Service"
stop_service "Investor Service"
stop_service "web"
stop_service "anvil"

echo ""
echo "✅ All services stopped"
