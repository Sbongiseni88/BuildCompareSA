will need these to upload your Docker image from your local machine

Use the following steps to authenticate and push an image to your repository. For additional registry authentication methods, including the Amazon ECR credential helper, see Registry authentication .
Retrieve an authentication token and authenticate your Docker client to your registry. Use the AWS CLI:
aws ecr get-login-password --region eu-north-1 | docker login --username AWS --password-stdin 140065018047.dkr.ecr.eu-north-1.amazonaws.com
Note: if you receive an error using the AWS CLI, make sure that you have the latest version of the AWS CLI and Docker installed.
Build your Docker image using the following command. For information on building a Docker file from scratch, see the instructions here . You can skip this step if your image has already been built:
docker build -t buildcompare/scraper-service .
After the build is completed, tag your image so you can push the image to this repository:
docker tag buildcompare/scraper-service:latest 140065018047.dkr.ecr.eu-north-1.amazonaws.com/buildcompare/scraper-service:latest
Run the following command to push this image to your newly created AWS repository:
docker push 140065018047.dkr.ecr.eu-north-1.amazonaws.com/buildcompare/scraper-service:latest