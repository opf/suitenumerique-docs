import { useMutation } from '@tanstack/react-query';

import { APIError, errorCauses, fetchAPI } from '@/api';

export type DocAIOPFeature = {
  docId: string;
  text: string;
  template: string;
};

export type DocAIOPFeatureResponse = {
  answer: string;
};

export const docAIOPFeature = async ({
  docId,
  ...params
}: DocAIOPFeature): Promise<DocAIOPFeatureResponse> => {
  const response = await fetchAPI(
    `documents/${docId}/ai-transform-open-project-feature/`,
    {
      method: 'POST',
      body: JSON.stringify({
        ...params,
      }),
    },
  );

  if (!response.ok) {
    throw new APIError(
      'Failed to request AI open project feature',
      await errorCauses(response),
    );
  }

  return response.json() as Promise<DocAIOPFeatureResponse>;
};

export function useDocAIOPFeature() {
  return useMutation<DocAIOPFeatureResponse, APIError, DocAIOPFeature>({
    mutationFn: docAIOPFeature,
  });
}
