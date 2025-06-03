import { fetchAPI } from '@/api';
import { format } from 'path';

export const OPENPROJECT_TASK_PROJECT_ID = '1'; // TODO: Replace with your actual project ID
export const OPENPROJECT_TASK_TYPE_ID = '1'; // TODO: Replace with your actual "task" type ID
export const OPENPROJECT_FEATURE_PROJECT_ID = '1';
export const OPENPROJECT_FEATURE_TYPE_ID = '4';

export const UI_BLUE = '#000091'; // Default color for task status icons
export const UI_BEIGE = '#FBF5F2';
export const UI_GRAY = '#3a3a3a';

export const OPENPROJECT_HOST =
  process.env.OPEN_PROJECT_HOST || 'https://openproject.local';

export interface WorkPackage {
  id: string;
  subject: string;
  status?: string | null;
  assignee?: string | null;
  href?: string | null;
  lockVersion?: number | null;
  _links?: {
    self: { href: string };
    status: { title: string; href: string } | null;
    assignee: { title: string; href: string } | null;
    type: { title: string; href: string } | null;
  } | null;
  _embedded?: {
    status?: Status | null;
    type?: {
      color: string;
    } | null;
  } | null;
}

export interface WorkPackageCollection {
  _embedded: {
    elements: WorkPackage[];
  };
}

export interface Status {
  id: string;
  name: string;
  isClosed: boolean;
  color?: string | null;
  _links: {
    self: { href: string };
  };
}

export const getWorkPackage = async (
  id: string,
): Promise<WorkPackage | null> => {
  const data = await fetchAPI(`op/api/v3/work_packages/${id}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
  }).then(async (response) => {
    if (!response.ok) {
      return null;
    }
    const data = await response.json();
    return data as WorkPackage;
  });
  return data;
};

export const createFeature = async (
  subject: string,
  description: string,
): Promise<WorkPackage | null> => {
  const data = await fetchAPI(`op/api/v3/projects/${OPENPROJECT_FEATURE_PROJECT_ID}/work_packages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      subject: subject,
      description: {
        format: 'markdown',
        raw: description,
        html: '',
      },
      _links: {
        type: { href: 'op/api/v3/types/' + OPENPROJECT_FEATURE_TYPE_ID },
        status: { href: 'op/api/v3/statuses/' + '1' },
      },
    }),
  }).then(async (response) => {
    if (!response.ok) {
      console.error('Failed to create feature:', response.statusText);
      return null;
    }
    const data = await response.json();
    console.log('Created feature:', data);
    return data as WorkPackage;
  });
  return data;
};

export const searchWorkPackages = async (searchQuery: string) => {
  try {
    const response = await fetchAPI(
      `op/api/v3/work_packages?filters=[{"typeahead":{"operator":"**","values":["${searchQuery}"]}}]`,
      {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: WorkPackageCollection = await response.json();

    if (data && data._embedded && data._embedded.elements) {
      return data._embedded.elements;
    } else {
      console.error('Invalid API response:', data);
      return [];
    }
  } catch (error) {
    console.error('Error fetching work packages:', error);
    return [];
  }
};
