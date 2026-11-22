
pipeline {
    agent any

    environment {
        APP_NAME = 'mlops_project'
        IMAGE_TAG = 'latest'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out project source code'
                checkout scm
            }
        }

        stage('Install Dependencies') {
            steps {
                sh '''
                    python3 -m venv venv
                    . venv/bin/activate
                    pip install --upgrade pip
                    pip install -r requirements.txt
                '''
            }
        }

        stage('Run Tests') {
            steps {
                sh '''
                    . venv/bin/activate
                    python -m pytest tests/ -v
                '''
            }
        }

        stage('Build Docker Image') {
            steps {
                sh '''
                    docker build -t ${APP_NAME}:${IMAGE_TAG} .
                '''
            }
        }

        stage('Deploy Container') {
            steps {
                sh '''
                    docker rm -f ${APP_NAME} || true

                    docker run -d \
                      --name ${APP_NAME} \
                      --restart unless-stopped \
                      -p 5000:3000 \
                      ${APP_NAME}:${IMAGE_TAG}
                '''
            }
        }
    }

    post {
        success {
            echo 'MLOps pipeline completed successfully!'
        }

        failure {
            echo 'MLOps pipeline failed. Check the console output.'
        }

        always {
            echo 'Jenkins pipeline execution finished.'
        }
    }
}
