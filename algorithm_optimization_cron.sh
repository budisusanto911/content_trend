#!/bin/bash
cd /opt/content-trend
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/ubuntu/.local/bin
sudo -u ubuntu python3 /opt/content-trend/algorithm_optimization.py >> /opt/content-trend/data/algorithm_optimization_cron.log 2>&1
