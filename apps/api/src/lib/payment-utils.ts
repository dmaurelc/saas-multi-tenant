// Payment utilities for handling Oneclick and Transbank operations

export interface OneclickMetadata {
  tbkUser: string;
  username: string;
  authorizationCode?: string;
}

export function getOneclickMetadata(metadata: unknown): OneclickMetadata {
  if (!metadata || typeof metadata !== 'object') {
    throw new Error('Invalid metadata');
  }

  const data = metadata as Record<string, unknown>;

  if (typeof data.tbkUser !== 'string' || typeof data.username !== 'string') {
    throw new Error('Invalid Oneclick metadata format');
  }

  return {
    tbkUser: data.tbkUser,
    username: data.username,
    authorizationCode:
      typeof data.authorizationCode === 'string' ? data.authorizationCode : undefined,
  };
}

export function createOneclickMetadata(data: OneclickMetadata): Record<string, unknown> {
  return {
    tbkUser: data.tbkUser,
    username: data.username,
    ...(data.authorizationCode && { authorizationCode: data.authorizationCode }),
  };
}

export interface TransbankConfig {
  commerceCode: string;
  apiKey: string;
  environment: 'TEST' | 'LIVE';
}

export interface TransbankOneclickConfig {
  commerceCode: string;
  apiKey: string;
}

export function getTransbankConfig(): TransbankConfig | null {
  const commerceCode = process.env.TBK_COMMERCE_CODE;
  const apiKey = process.env.TBK_API_KEY;
  const environment = (process.env.TBK_INTEGRATION_TYPE as 'TEST' | 'LIVE') || 'TEST';

  if (!commerceCode || !apiKey) {
    return null;
  }

  return { commerceCode, apiKey, environment };
}

export function getTransbankOneclickConfig(): TransbankOneclickConfig | null {
  const commerceCode = process.env.TBK_ONECLICK_COMMERCE_CODE;
  const apiKey = process.env.TBK_ONECLICK_API_KEY;

  if (!commerceCode || !apiKey) {
    return null;
  }

  return { commerceCode, apiKey };
}
