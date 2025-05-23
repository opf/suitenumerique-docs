import { insertOrUpdateBlock } from '@blocknote/core';
import { BlockTypeSelectItem, createReactBlockSpec } from '@blocknote/react';
import { TFunction } from 'i18next';
import React, { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchAPI } from '@/api';
import { Icon } from '@/components';

import { DocsBlockNoteEditor } from '../../types';

interface WorkPackage {
  id: string;
  subject: string;
  status?: string | null;
  assignee?: string | null;
  href?: string | null;
  _links?: {
    self: { href: string };
    status: { title: string } | null;
    assignee: { title: string } | null;
    type: { title: string } | null;
  } | null;
}

interface WorkPackageCollection {
  _embedded: {
    elements: WorkPackage[];
  };
}

const OpenProjectWorkPackageBlockComponent = () => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkPackage[]>([]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery) {
      setSearchResults([]);
      return;
    }

    try {
      const response = await fetchAPI(
        `op/api/v3/work_packages?filters=[{"id":{"operator":"=","values":["${searchQuery}"]}}]`,
        {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: WorkPackageCollection = await response.json();

      // Assuming the API returns a WorkPackageCollection with an _embedded.elements array
      if (data && data._embedded && data._embedded.elements) {
        setSearchResults(data._embedded.elements);
      } else {
        console.error('Invalid API response:', data);
        setSearchResults([]);
      }
    } catch (error) {
      console.error('Error fetching work packages:', error);
      setSearchResults([]);
    }
  }, [searchQuery]);

  return (
    <div>
      <input
        type="text"
        placeholder={t('Search for work package ID or subject')}
        value={searchQuery}
        onChange={(e) => {
          setSearchQuery(e.target.value);
        }}
        onKeyUp={() => {
          void handleSearch();
        }}
      />

      {searchResults.length > 0 && (
        <div>
          <div>
            <h3>{searchResults[0].subject}</h3>
            <p>
              {t('Type')}: {searchResults[0]._links?.type?.title}
            </p>
            <p>
              {t('Status')}: {searchResults[0]._links?.status?.title}
            </p>
            <p>
              {t('Assignee')}: {searchResults[0]._links?.assignee?.title}
            </p>
            <p>
              {t('Link')}:{' '}
              <a href={searchResults[0]._links?.self?.href}>
                {searchResults[0].id}
              </a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export const OpenProjectWorkPackageBlock = createReactBlockSpec(
  {
    type: 'openProjectWorkPackage',
    propSchema: {},
    content: 'inline',
  },
  {
    render: () => {
      return <OpenProjectWorkPackageBlockComponent />;
    },
  },
);

export const getOpenProjectWorkPackageReactSlashMenuItems = (
  editor: DocsBlockNoteEditor,
  t: TFunction<'translation', undefined>,
  group: string,
) => [
  {
    title: t('OpenProject Work Package'),
    onItemClick: () => {
      insertOrUpdateBlock(editor, {
        type: 'openProjectWorkPackage',
      });
    },
    aliases: ['openproject', 'workpackage', 'op'],
    group,
    icon: <Icon iconName="task" $size="18px" />,
    subtext: t('Add an OpenProject work package block'),
  },
];

export const getOpenProjectWorkPackageFormattingToolbarItems = (
  t: TFunction<'translation', undefined>,
): BlockTypeSelectItem => ({
  name: t('OpenProject Work Package'),
  type: 'openProjectWorkPackage',
  icon: () => <Icon iconName="task" $size="16px" />,
  isSelected: (block) => block.type === 'openProjectWorkPackage',
});
