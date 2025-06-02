import { insertOrUpdateBlock } from '@blocknote/core';
import { BlockTypeSelectItem, createReactBlockSpec } from '@blocknote/react';
import { TFunction } from 'i18next';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { fetchAPI } from '@/api';
import { Icon } from '@/components';

import { DocsBlockNoteEditor } from '../../types';
import { UI_BEIGE, UI_BLUE, WorkPackage, WorkPackageCollection } from './OpenProjectBlockCommon';



interface OpenProjectResponse {
  _embedded?: {
    elements?: Array<{
      id: string;
      name: string;
      _links?: { self: { href: string } };
    }>;
  };
}

interface BlockProps {
  props: {
    wpid: string;
    subject: string;
    status: string;
    assignee: string;
    type: string;
    href: string;
  };
}

// Component implementation
const OpenProjectWorkPackageBlockComponent = ({
  block,
  editor,
}: {
  block: BlockProps;
  editor: any; // Using any here to avoid type conflicts with BlockNoteEditor
}) => {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'search' | 'create'>('search');

  // Search mode state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<WorkPackage[]>([]);
  const [selectedWorkPackage, setSelectedWorkPackage] =
    useState<WorkPackage | null>(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [focusedResultIndex, setFocusedResultIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Creation mode state
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>(
    [],
  );
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  // Types for selected project
  const [types, setTypes] = useState<
    Array<{ id: string; name: string; _links: { self: { href: string } } }>
  >([]);
  const [selectedType, setSelectedType] = useState<string | null>(null);
  // Statuses, subject, description, saving
  const [statuses, setStatuses] = useState<
    Array<{ id: string; color: string; name: string; _links: { self: { href: string } } }>
  >([]);
  const [selectedStatus, setSelectedStatus] = useState<string | null>(null);
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Load saved work package if it exists
  React.useEffect(() => {
    if (block.props.wpid) {
      void fetchAPI(`op/api/v3/work_packages/${block.props.wpid}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          setSelectedWorkPackage(data as WorkPackage);
        })
        .catch((error) => {
          console.error('Error fetching work package:', error);
        });
    }
  }, [block.props.wpid]);

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
        const data = await response.json() as OpenProjectResponse;
        
        // OpenProject returns statuses in _embedded.elements
        if (isMounted && data._embedded?.elements) {
          setStatuses(
            data._embedded.elements.filter(item => item._links?.self?.href) as Array<{
              id: string;
              name: string;
              _links: { self: { href: string } };
            }>,
          );
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
    void fetchStatuses();
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
        const data = await response.json() as OpenProjectResponse;
        
        // OpenProject returns types in _embedded.elements
        if (isMounted && data._embedded?.elements) {
          setTypes(
            data._embedded.elements.filter(item => item._links?.self?.href) as Array<{
              id: string;
              name: string;
              _links: { self: { href: string } };
            }>,
          );
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
    void fetchTypes();
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
        const data = await response.json() as OpenProjectResponse;
        
        // OpenProject returns projects in _embedded.elements
        if (isMounted && data._embedded?.elements) {
          setProjects(
            data._embedded.elements.map(item => ({
              id: item.id,
              name: item.name
            })),
          );
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
    void fetchProjects();
    return () => {
      isMounted = false;
    };
  }, [mode]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Debounced search function
  const handleSearch = useCallback(async () => {
    if (!searchQuery) {
      setSearchResults([]);
      setIsDropdownOpen(false);
      return;
    }

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
        setSearchResults(data._embedded.elements);
        setIsDropdownOpen(data._embedded.elements.length > 0);
        setFocusedResultIndex(-1);
      } else {
        console.error('Invalid API response:', data);
        setSearchResults([]);
        setIsDropdownOpen(false);
      }
    } catch (error) {
      console.error('Error fetching work packages:', error);
      setSearchResults([]);
      setIsDropdownOpen(false);
    }
  }, [searchQuery]);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery) {
        void handleSearch();
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Handle selection of a work package from search results
  const handleSelectWorkPackage = (workPackage: WorkPackage) => {
    setSelectedWorkPackage(workPackage);
    setSearchQuery(''); // Clear search input after selection
    setIsDropdownOpen(false);

    // Update block props to persist the selection
    editor.updateBlock(block, {
      props: {
        ...block.props,
        wpid: workPackage.id,
        subject: workPackage.subject,
        status: workPackage._links?.status?.title || '',
        assignee: workPackage._links?.assignee?.title || '',
        type: workPackage._links?.type?.title || '',
        href: workPackage._links?.self?.href || '',
      },
    });
  };

  // Focus input when component is mounted and mode is 'search'
  useEffect(() => {
    if (mode === 'search' && inputRef.current) {
      setTimeout(() => inputRef?.current?.focus(), 50);
    }
  }, [mode]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isDropdownOpen) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setFocusedResultIndex((prev) =>
          prev < searchResults.length - 1 ? prev + 1 : prev,
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setFocusedResultIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (
          focusedResultIndex >= 0 &&
          focusedResultIndex < searchResults.length
        ) {
          handleSelectWorkPackage(searchResults[focusedResultIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsDropdownOpen(false);
        break;
      default:
        break;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: 12 }}>
        {/* <button
          onClick={() => setMode('search')}
          disabled={mode === 'search'}
          style={{ marginRight: 8 }}
        >
          {t('Search Work Package')}
        </button> */}
        
      </div>

      {mode === 'search' && (
        <div>
          {!block.props.wpid && (
            <div style={{ position: 'relative' }}>
              <div style={{
                display: 'flex'
                }}
                >
              <input
                ref={inputRef}
                type="text"
                placeholder={t('Search for work package ID or subject')}
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  if (e.target.value) {
                    setIsDropdownOpen(true);
                  }
                }}
                onFocus={() => {
                  if (searchResults.length > 0) {
                    setIsDropdownOpen(true);
                  }
                }}
                onKeyDown={handleKeyDown}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  border: '1px solid #ccc',
                  fontSize: '14px',
                }}
              />
              <button onClick={() => setMode('create')}>
                {t('New Work Package')}
              </button>
              </div>

              {/* Autocomplete dropdown */}
              {isDropdownOpen && searchResults.length > 0 && (
                <div
                  ref={dropdownRef}
                  role="listbox"
                  aria-label={t('Work package search results')}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    zIndex: 10,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    marginTop: '2px',
                  }}
                >
                  {searchResults.slice(0, 5).map((wp, index) => (
                    <div
                      key={wp.id}
                      role="option"
                      aria-selected={focusedResultIndex === index}
                      tabIndex={0}
                      onClick={() => handleSelectWorkPackage(wp)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleSelectWorkPackage(wp);
                        }
                      }}
                      onMouseEnter={() => setFocusedResultIndex(index)}
                      style={{
                        padding: '8px 12px',
                        cursor: 'pointer',
                        backgroundColor:
                          focusedResultIndex === index
                            ? '#f0f0f0'
                            : 'transparent',
                        borderBottom:
                          index < searchResults.length - 1
                            ? '1px solid #eee'
                            : 'none',
                      }}
                    >
                      <div style={{ fontWeight: 'bold' }}>
                        #{wp.id} - {wp.subject}
                      </div>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        {wp._links?.type?.title} {wp._links?.status?.title}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {block.props.wpid && !selectedWorkPackage && (
            <div
            style={{
              padding: '4px 8px',
              border: 'none',
              borderRadius: '5px',
              backgroundColor: UI_BEIGE
            }}>
              loading... #{block.props.wpid}
            </div>
          )}
          {/* Display selected work package details */}
          {selectedWorkPackage && (
            <div
              style={{
                padding: '4px 8px',
                border: 'none',
                borderRadius: '5px',
                backgroundColor: UI_BEIGE
              }}
            >
              <div style={{
                display: 'flex',
                gap: '8px'
              }}>
                <div style={{
                  color: selectedWorkPackage._links?.type?.color,
                  border: 'none',
                  borderRadius: '5px',
                  backgroundColor: UI_BEIGE
               }}>
                
                {selectedWorkPackage._links?.type?.color} - 
                  {selectedWorkPackage._links?.type?.title}
                </div>
                <div>
                  #{selectedWorkPackage.id}
                </div>
                <div>
                  {selectedWorkPackage._links?.status?.color} - 

                  {selectedWorkPackage._links?.status?.title}
                </div>
              {/* <p>
                {t('Assignee')}: {selectedWorkPackage._links?.assignee?.title}
              </p> */}
              </div>

              <div>
                <a
                  href={selectedWorkPackage._links?.self?.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    marginRight: 6,
                    textDecoration: 'none',
                    color: UI_BLUE,
                    cursor: 'pointer',
                  }}
                >
                  {selectedWorkPackage.subject}
                </a>
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
                    saving ||
                    !subject ||
                    !description ||
                    !selectedStatus ||
                    !selectedType ||
                    !selectedProject
                  }
                  onClick={() => {
                    setSaveError(null);
                    setSaveSuccess(null);
                    setSaving(true);
                    // Save work package
                    // Find selected type and status objects for hrefs
                    const typeObj = types.find((t) => t.id === selectedType);
                    const statusObj = statuses.find(
                      (s) => s.id === selectedStatus,
                    );
                    console.log('types:', types);
                    console.log('statuses:', statuses);
                    console.log('selectedType:', selectedType);
                    console.log('selectedStatus:', selectedStatus);
                    console.log('typeObj:', typeObj);
                    console.log('statusObj:', statusObj);
                    if (!typeObj || !statusObj) {
                      setSaveError(t('Type or status not found.'));
                      setSaving(false);
                      return;
                    }
                    void fetchAPI(
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
                    )
                      .then(async (response) => {
                        if (!response.ok) {
                          const errorText = await response.text();
                          throw new Error(
                            `HTTP error! status: ${response.status} - ${errorText}`,
                          );
                        }
                        setSaveSuccess(t('Work package created successfully!'));
                        setSubject('');
                        setDescription('');
                        setSelectedStatus(null);
                        setSelectedType(null);
                        // Optionally, reset project selection as well
                      })
                      .catch((error: unknown) => {
                        // eslint-disable-next-line no-console
                        console.error('Error creating work package:', error);
                        setSaveError(
                          t('Failed to create work package:') +
                            ' ' +
                            ((error as Error)?.message || String(error)),
                        );
                      })
                      .finally(() => {
                        setSaving(false);
                      });
                  }}
                >
                  {saving ? t('Saving...') : t('Save')}
                </button>
                {saveError && (
                  <div style={{ color: 'red', marginTop: 8 }}>{saveError}</div>
                )}
                {saveSuccess && (
                  <div style={{ color: 'green', marginTop: 8 }}>
                    {saveSuccess}
                  </div>
                )}
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
    propSchema: {
      wpid: { default: '', type: 'string' },
      subject: { default: '', type: 'string' },
      status: { default: '', type: 'string' },
      assignee: { default: '', type: 'string' },
      type: { default: '', type: 'string' },
      href: { default: '', type: 'string' },
    },
    content: 'inline',
  },
  {
    render: ({ block, editor }) => {
      return (
        <OpenProjectWorkPackageBlockComponent block={block} editor={editor} />
      );
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
