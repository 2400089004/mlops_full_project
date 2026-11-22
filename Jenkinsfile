
pipeline {
    agent any

    environment {
        IMAGE_NAME = 'smartcare-mlops'
        IMAGE_TAG = 'v1'
        CONTAINER_PORT = '3000'
    }

    stages {

        stage('Checkout') {
            steps {
                echo 'Checking out SmartCare MLOps project'
                checkout scm
            }
        }

      stage('Python Setup') {
    steps {
        sh '''
            python3.11 --version
            python3.11 -m venv venv
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

        stage('Docker Build') {
            steps {
                sh '''
                    docker build -t ${IMAGE_NAME}:${IMAGE_TAG} .
                '''
            }
        }

        stage('Docker Image Verification') {
            steps {
                sh '''
                    docker images ${IMAGE_NAME}:${IMAGE_TAG}
                '''
            }
        }
    }

    post {
        success {
            echo 'SmartCare MLOps CI pipeline completed successfully!'
        }

        failure {
            echo 'Pipeline failed. Check the stage logs.'
        }

        always {
            echo 'Jenkins pipeline execution finished.'
        }
    }
}
