import logging
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from config import settings

logging.basicConfig(
  level=getattr(logging, settings.log_level.upper()),
  format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
  datefmt='%Y-%m-%d %H:%M:%S'
)

logger = logging.getLogger(__name__)

app = FastAPI(
  title='FastAPI Bedrock Service',
  description='AI-powered task processing service for Obsidian GTD plugin via AWS Bedrock API keys',
  version='1.0.0'
)

app.add_middleware(
  CORSMiddleware,
  allow_origins=['*'],
  allow_credentials=True,
  allow_methods=['*'],
  allow_headers=['*'],
)


@app.get('/')
async def root():
  logger.info('Root endpoint accessed')
  return {'message': 'FastAPI Bedrock Service is running'}


if __name__ == '__main__':
  import uvicorn
  uvicorn.run(app, host=settings.host, port=settings.port)