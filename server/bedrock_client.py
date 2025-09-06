import os
import boto3
import logging
from typing import Dict, Any
from config import settings

logger = logging.getLogger(__name__)


class BedrockClient:
  def __init__(self):
    os.environ['AWS_BEARER_TOKEN_BEDROCK'] = settings.aws_bearer_token_bedrock
    
    self.client = boto3.client(
      service_name='bedrock-runtime',
      region_name=settings.aws_region
    )
    self.model_id = settings.bedrock_model_id
    logger.info(f'Bedrock client initialized for model: {self.model_id}')

  async def process_request(self, prompt: str) -> Dict[str, Any]:
    try:
      messages = [
        {
          'role': 'user',
          'content': [{'text': prompt}]
        }
      ]
      
      response = self.client.converse(
        modelId=self.model_id,
        messages=messages
      )
      
      result = response['output']['message']['content'][0]['text']
      logger.info('Successfully processed Bedrock request')
      
      return {
        'success': True,
        'response': result,
        'model': self.model_id
      }
      
    except Exception as e:
      logger.error(f'Bedrock request failed: {str(e)}')
      return {
        'success': False,
        'error': str(e),
        'model': self.model_id
      }


bedrock_client = BedrockClient()