#!/bin/bash
# 1. Build
docker build --platform linux/amd64 -t buildcompare-scraper .
# 2. Tag
docker tag buildcompare-scraper:latest 140065018047.dkr.ecr.eu-north-1.amazonaws.com/buildcompare-scraper-v3:latest
# 3. Push
docker push 140065018047.dkr.ecr.eu-north-1.amazonaws.com/buildcompare-scraper-v3:latest
# 4. Refresh AWS
aws ecs update-service --cluster Buildcompare-cluster --service scraper-service-final --force-new-deployment --region eu-north-1
echo "🚀 Deployment triggered! Check ECS for status."