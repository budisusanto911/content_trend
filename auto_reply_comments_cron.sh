#!/bin/bash
cd /opt/content-trend
PATH=/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin:/home/ubuntu/.local/bin
sudo -u ubuntu python3 /opt/content-trend/auto_reply_comments.py >> /opt/content-trend/data/comment_reply_cron.log 2>&1
