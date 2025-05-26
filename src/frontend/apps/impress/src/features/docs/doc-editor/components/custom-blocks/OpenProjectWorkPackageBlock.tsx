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
  const [mode, setMode] = useState<'search' | 'create'>('search');

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkPackage[]>([]);

  // Creation mode state
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  // Types for selected project
  const [types, setTypes] = useState<any[]>([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // Statuses, subject, description, saving
  const [statuses, setStatuses] = useState<any[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  // const [saving, setSaving] = useState(false);

  // Fetch statuses when a type is selected
  React.useEffect(() => {
    if (!selectedType) {
      setStatuses([]);
      setSelectedStatus(null);
      return;
    }
    let isMounted = true;
    const fetchStatuses = async () => {
      try {
        const response = await fetchAPI(`op/api/v3/statuses`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // OpenProject returns statuses in _embedded.elements
        if (isMounted && data && data._embedded && data._embedded.elements) {
          setStatuses(data._embedded.elements);
        } else if (isMounted) {
          setStatuses([]);
        }
      } catch (error) {
        if (isMounted) {
          setStatuses([]);
        }
        // eslint-disable-next-line no-console
        console.error('Error fetching statuses:', error);
      }
    };
    fetchStatuses();
    return () => {
      isMounted = false;
    };
  }, [selectedType]);

  // Fetch types when a project is selected
  React.useEffect(() => {
    if (!selectedProject) {
      setTypes([]);
      setSelectedType(null);
      return;
    }
    let isMounted = true;
    const fetchTypes = async () => {
      try {
        const response = await fetchAPI(
          `op/api/v3/projects/${selectedProject}/types`,
          {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' },
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // OpenProject returns types in _embedded.elements
        if (isMounted && data && data._embedded && data._embedded.elements) {
          setTypes(data._embedded.elements);
        } else if (isMounted) {
          setTypes([]);
        }
      } catch (error) {
        if (isMounted) {
          setTypes([]);
        }
        // eslint-disable-next-line no-console
        console.error('Error fetching types:', error);
      }
    };
    fetchTypes();
    return () => {
      isMounted = false;
    };
  }, [selectedProject]);

  // Fetch projects when entering create mode
  React.useEffect(() => {
    if (mode !== 'create') {
      return;
    }
    let isMounted = true;
    const fetchProjects = async () => {
      try {
        const response = await fetchAPI('op/api/v3/projects', {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' },
        });
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        // OpenProject returns projects in _embedded.elements
        if (isMounted && data && data._embedded && data._embedded.elements) {
          setProjects(data._embedded.elements);
        } else if (isMounted) {
          setProjects([]);
        }
      } catch (error) {
        if (isMounted) {
          setProjects([]);
        }
        // eslint-disable-next-line no-console
        console.error('Error fetching projects:', error);
      }
    };
    fetchProjects();
    return () => {
      isMounted = false;
    };
  }, [mode]);

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

      const data: WorkPackageCollection = await response.json();

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
      <div style={{ marginBottom: 12 }}>
        <button
          onClick={() => setMode('search')}
          disabled={mode === 'search'}
          style={{ marginRight: 8 }}
        >
          {t('Search Work Package')}
        </button>
        <button onClick={() => setMode('create')} disabled={mode === 'create'}>
          {t('New Work Package')}
        </button>
      </div>

      {mode === 'search' && (
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
      )}

      {mode === 'create' && (
        <div>
          {/* Step 1: Select Project */}
          <p>{t('Select a project to create a new work package in:')}</p>
          {projects.length === 0 ? (
            <p>{t('Loading projects...')}</p>
          ) : (
            <select
              value={selectedProject || ''}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">{t('Select a project')}</option>
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}
          {/* Step 2: Select Type */}
          {selectedProject && (
            <div style={{ marginTop: 16 }}>
              <p>{t('Select a work package type:')}</p>
              {types.length === 0 ? (
                <p>{t('Loading types...')}</p>
              ) : (
                <select
                  value={selectedType || ''}
                  onChange={(e) => setSelectedType(e.target.value)}
                >
                  <option value="">{t('Select a type')}</option>
                  {types.map((type) => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          )}
          {/* Step 3: Input fields */}
          {selectedType && (
            <div style={{ marginTop: 16 }}>
              <p>{t('Enter work package details:')}</p>
              {/* Status */}
              <div style={{ marginBottom: 8 }}>
                <label>
                  {t('Status')}:{' '}
                  {statuses.length === 0 ? (
                    <span>{t('Loading statuses...')}</span>
                  ) : (
                    <select
                      value={selectedStatus || ''}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                    >
                      <option value="">{t('Select a status')}</option>
                      {statuses.map((status) => (
                        <option key={status.id} value={status.id}>
                          {status.name}
                        </option>
                      ))}
                    </select>
                  )}
                </label>
              </div>
              {/* Subject */}
              <div style={{ marginBottom: 8 }}>
                <label>
                  {t('Subject')}:{' '}
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </label>
              </div>
              {/* Description */}
              <div style={{ marginBottom: 8 }}>
                <label>
                  {t('Description')}:{' '}
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </label>
              </div>
              {/* Save button */}
              <div>
                <button
                  disabled={
                    !subject ||
                    !description ||
                    !selectedStatus ||
                    !selectedType ||
                    !selectedProject
                  }
                  onClick={async () => {
                    // Save work package
                    // Find selected type and status objects for hrefs
                    const typeObj = types.find((t) => t.id === selectedType);
                    const statusObj = statuses.find(
                      (s) => s.id === selectedStatus,
                    );
                    if (!typeObj || !statusObj) {
                      return;
                    }
                    // POST to /api/v3/projects/{project_id}/work_packages
                    try {
                      // const [saving, setSaving] = useState(false); // For loading state if needed
                      // setSaving(true);
                      const response = await fetchAPI(
                        `op/api/v3/projects/${selectedProject}/work_packages`,
                        {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            subject,
                            description: { format: 'plain', raw: description },
                            _links: {
                              type: { href: typeObj._links.self.href },
                              status: { href: statusObj._links.self.href },
                            },
                          }),
                        },
                      );
                      if (!response.ok) {
                        throw new Error(
                          `HTTP error! status: ${response.status}`,
                        );
                      }
                      // Optionally, show success or reset form
                      alert(t('Work package created successfully!'));
                      // Optionally, reset form or show created work package
                    } catch (error) {
                      // eslint-disable-next-line no-console
                      console.error('Error creating work package:', error);
                      alert(t('Failed to create work package.'));
                    } finally {
                      // setSaving(false);
                    }
                  }}
                >
                  {t('Save')}
                </button>
              </div>
            </div>
          )}
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
