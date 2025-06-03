import { BlockNoteEditor, insertOrUpdateBlock } from '@blocknote/core';
import { BlockTypeSelectItem, createReactBlockSpec } from '@blocknote/react';
import React, { useEffect, useRef, useState } from 'react';
import { RiLoaderLine } from "react-icons/ri";
import {
  RiCheckLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
  RiPlayCircleLine,
} from 'react-icons/ri';

import { fetchAPI } from '@/api';
import { Icon } from '@/components';

import {
  getWorkPackage,
  OPENPROJECT_HOST,
  OPENPROJECT_TASK_PROJECT_ID,
  OPENPROJECT_TASK_TYPE_ID,
  Status,
  UI_BEIGE,
  UI_BLUE,
  UI_GRAY,
  WorkPackage,
} from './OpenProjectBlockCommon';

export const OpenProjectTaskBlockComponent: React.FC<{
  block: any;
  editor: any;
}> = ({ block, editor }) => {
  const [subject, setSubject] = useState(block.props.subject || '');
  const [taskId, setTaskId] = useState(block.props.wpid || null);
  const [lockVersion, setLockVersion] = useState(
    block.props.lockVersion || null,
  );
  const [parentId, setParentId] = useState(block.props.parentId || null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFirstSave, setIsFirstSave] = useState(true); // Track if this is the first save
  const inputRef = useRef<HTMLInputElement>(null);

  // Status related state
  const [currentStatus, setCurrentStatus] = useState<Status | null>(null);
  const [availableStatuses, setAvailableStatuses] = useState<Status[]>([]);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
  const [statusUpdateSaving, setStatusUpdateSaving] = useState(false);
  const statusDropdownRef = useRef<HTMLDivElement>(null);

  // Fetch latest subject, status, and lockVersion if taskId exists
  React.useEffect(
    () => {
      if (!taskId) {
        return;
      }
      getWorkPackage(taskId)
        .then(async (data: WorkPackage | null) => {
          if (!data) {
            console.error('Failed to fetch work package data');
            return;
          }

          setSubject(data.subject);
          setLockVersion(data.lockVersion);

          // Set current status if available
          setCurrentStatus({
            id: data._links?.status?.href.split('/').pop() || '',
            name: data._links?.status?.title || 'Unknown',
            isClosed: data._embedded?.status?.isClosed || false,
            _links: {
              self: { href: data._links?.status?.href || '' },
            },
          });

          // Update block props so markdown is in sync
          editor.updateBlock(block, {
            props: {
              ...block.props,
              subject: data.subject,
              lockVersion: data.lockVersion,
              wpid: +data.id,
              wpurl: data._links?.self?.href || null,
              status: data._links?.status?.title || null,
              statusIsClosed: data._embedded?.status?.isClosed || false,
            },
          });
        })
        .catch(() => { });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [taskId, editor, block],
  );

  // Fetch available statuses when dropdown is opened
  const fetchAvailableStatuses = async () => {
    if (!taskId) {
      return;
    }

    setStatusUpdateSaving(true);
    try {
      const response = await fetchAPI(`op/api/v3/statuses`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data && data._embedded && data._embedded.elements) {
        setAvailableStatuses(data._embedded.elements);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch available statuses');
    } finally {
      setStatusUpdateSaving(false);
    }
  };

  // Update work package status
  const updateStatus = async (status: Status) => {
    if (!taskId) {
      return;
    }

    setStatusUpdateSaving(true);
    setError(null);
    try {
      const response = await fetchAPI(`op/api/v3/work_packages/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          lockVersion: lockVersion,
          _links: {
            status: { href: status._links.self.href },
          },
        }),
      });

      if (!response.ok) {
        if (response.status === 409) {
          throw new Error('Update conflict: please reload the task.');
        } else {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
      }

      const data = await response.json();
      setLockVersion(data.lockVersion);
      setCurrentStatus(status);

      // Update block props
      editor.updateBlock(block, {
        props: {
          ...block.props,
          lockVersion: data.lockVersion,
          status: status.name,
          statusIsClosed: status.isClosed,
        },
      });

      // Close the dropdown
      setIsStatusDropdownOpen(false);
    } catch (err: any) {
      setError(err.message || 'Failed to update status');
    } finally {
      setStatusUpdateSaving(false);
    }
  };

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        statusDropdownRef.current &&
        !statusDropdownRef.current.contains(event.target as Node)
      ) {
        setIsStatusDropdownOpen(false);
      }
    };

    if (isStatusDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isStatusDropdownOpen]);

  // On mount: if subject is empty but block has inline content, move it to subject and create the task
  React.useEffect(() => {
    if (!block.props.subject) {
      // Try to extract plain text from block.content (array or string)
      const initialText = Array.isArray(block.content)
        ? block.content.map((c: any) => c.text || '').join('')
        : (block.content as string) || '';

      if (initialText.trim()) {
        // Move text into props.subject and clear inline content after current render
        queueMicrotask(() => {
          editor.updateBlock(block, {
            props: { ...block.props, subject: initialText.trim() },
            content: [],
          });
          setSubject(initialText.trim());
          // Create the task immediately
          void saveTask(initialText.trim());
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Focus input after mount or when taskId changes (after creation)
  React.useEffect(() => {
    if (inputRef.current) {
      if (!taskId) {
        setTimeout(() => inputRef?.current?.focus(), 50);
      }
    }
  }, [taskId]);

  // Save or update the task in OpenProject
  const saveTask = async (newSubject: string): Promise<boolean> => {
    setSaving(true);
    setError(null);
    try {
      if (!taskId) {
        // Defensive check for type ID
        if (!OPENPROJECT_TASK_TYPE_ID) {
          setError(
            'Task type ID is not set. Please configure OPENPROJECT_TASK_TYPE_ID.',
          );
          setSaving(false);
          return false;
        }
        // Create new task
        const response = await fetchAPI(
          `op/api/v3/projects/${OPENPROJECT_TASK_PROJECT_ID}/work_packages`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              subject: newSubject,
              _links: {
                type: { href: `/api/v3/types/${OPENPROJECT_TASK_TYPE_ID}` },
                ...(parentId
                  ? { parent: { href: `/api/v3/work_packages/${parentId}` } }
                  : {}),
              },
            }),
          },
        );
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        setTaskId(data.id);
        setLockVersion(data.lockVersion);
        // Update block props
        console.log('data.id', data.id);
        console.log('OPENPROJECT_TASK_TYPE_ID', OPENPROJECT_TASK_TYPE_ID);
        editor.updateBlock(block, {
          props: {
            ...block.props,
            wpid: +data.id,
            subject: data.subject,
            lockVersion: data.lockVersion,
            wpurl: data._links?.self?.href || null,
            parentId: parentId,
          },
        });

        // This is a successful first save (task creation)
        return true;
      } else {
        // Update existing task (include lockVersion for concurrency)
        const response = await fetchAPI(`op/api/v3/work_packages/${taskId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            subject: newSubject,
            lockVersion: lockVersion,
          }),
        });
        if (!response.ok) {
          if (response.status === 409) {
            setError('Update conflict: please reload the task.');
          } else {
            throw new Error(`HTTP error! status: ${response.status}`);
          }
          return false;
        }
        const data = await response.json();
        setLockVersion(data.lockVersion);
        setSubject(data.subject);
        // Update block props
        editor.updateBlock(block, {
          props: {
            ...block.props,
            subject: data.subject,
            lockVersion: data.lockVersion,
            wpid: +data.id,
          },
        });
      }

      // This is an update, not a first save
      return false;
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Handle blur or Enter key
  const handleSave = async () => {
    if (subject.trim() === '') {
      return;
    }
    console.log('OnBlur');

    // Save the task and get whether it was a first save (creation)
    const wasFirstSave = await saveTask(subject.trim());
    console.log('wasFirstSave:', wasFirstSave);
    console.log('isFirstSave:', isFirstSave);

    // If this was the first successful save and we're still tracking first save
    if (wasFirstSave && isFirstSave) {
      setIsFirstSave(false); // Mark that we've handled the first save

      // Automatically insert a new task block below
      const newBlocks = editor.insertBlocks(
        [{ type: 'openProjectTask' }],
        block,
        'after',
      );
      const newBlockId = newBlocks[0]?.id;

      setTimeout(() => {
        console.log(
          'Attempting to focus new task block input:',
          newBlocks[0]?.id,
        );
        // Use a more specific selector to find the input
        const input = document.querySelector(
          `[data-block-id="${newBlockId}"] input[type="text"]`,
        );
        console.log('Found input element:', input);

        if (input) {
          // Cast to HTMLInputElement to fix TypeScript errors
          const inputElement = input as HTMLInputElement;
          inputElement.focus();
          console.log('Focus applied to input');

          // For extra reliability, try to focus again after a short delay
          setTimeout(() => {
            if (document.activeElement !== inputElement) {
              console.log('Focus was lost, attempting to refocus');
              inputElement.focus();
            }
          }, 50);
        } else {
          console.warn('Could not find input element for new task block');
        }
      }, 300); // Increased timeout to give DOM more time to update
    }
  };

  // Handle Enter: save and insert new block below, focus new input
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSave();
      // The handleSave function will automatically insert a new block if needed
      // We don't need to insert another block here as it would create duplicates
    } else if (e.key === 'Escape' && !block.props?.wpid) {
      editor.removeBlocks([block.id]);
    }
  };

  // Render ID as link or "NEW"

  const renderId = () => {
    if (!taskId) {
      return <span style={{ color: '#ccc', fontStyle: 'italic' }}>New</span>;
    }
    const url = `${OPENPROJECT_HOST}/wp/${taskId}`;
    return (
      <a
        href={url}
        style={{
          marginRight: 6,
          textDecoration: 'none',
          color: UI_BLUE,
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(url, '_blank');
        }}
        // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
        onMouseOver={(e) =>
          (e.currentTarget.style.textDecoration = 'underline')
        }
        // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
        onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
      >
        #{taskId}
      </a>
    );
  };

  // Render status icon based on current status
  const renderStatusIcon = () => {
    if (!taskId) {
      return (
        <div
          style={{ cursor: 'default', display: 'flex' }}
          title="Task not yet created"
        >
          <RiCheckboxBlankCircleLine />
        </div>
      );
    }

    // If status dropdown is open, show a loading spinner while fetching statuses
    // if (isStatusDropdownOpen && statusUpdateSaving) {
    //   return <Icon iconName="spinner" $size="16px" />;
    // }

    const statusName = block.props.status || 'new';
    const isClosed =
      block.props.statusIsClosed || statusName.toLowerCase() == 'closed';

    console.log('Current status:', {
      statusName,
      isClosed,
      taskId,
    });

    // Determine which icon to show based on status
    let StatusIcon = RiCheckboxBlankCircleLine; // Default for "new" status

    if (isClosed) {
      StatusIcon = RiCheckboxCircleFill;
    } else if (statusName.toLowerCase() !== 'new') {
      StatusIcon = RiPlayCircleLine;
    }

    return (
      <div
        onClick={() => {
          setIsStatusDropdownOpen(!isStatusDropdownOpen);
          if (!isStatusDropdownOpen) {
            fetchAvailableStatuses();
          }
        }}
        style={{
          cursor: 'pointer',
          color: UI_BLUE,
          display: 'flex',
        }}
        title={`Status: ${statusName}`}
      >
        <StatusIcon />
      </div>
    );
  };

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minHeight: 32,
        position: 'relative',
        background: UI_BEIGE,
        borderRadius: '5px',
        padding: '4px 8px',
        width: '550px',
      }}
      data-block-id={block.id}
    >
      {renderStatusIcon()}
      {renderId()}
      <input
        ref={inputRef}
        type="text"
        value={subject}
        disabled={saving}
        onChange={(e) => setSubject(e.target.value)}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        placeholder="Type your task..."
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          background: 'transparent',
          fontSize: 16,
          width: '450px',
          textDecoration:
            block.props.statusIsClosed ||
              (block.props.status || '').toLowerCase() === 'closed'
              ? 'line-through'
              : 'none',
        }}
      />
      {saving && <RiLoaderLine className='icon-spin' />}
      {error && (
        <span style={{ color: 'red', marginLeft: 8 }} title={error}>
          <Icon iconName="error" $size="16px" />
        </span>
      )}

      {/* Status dropdown */}
      {isStatusDropdownOpen && taskId && !statusUpdateSaving && (
        <div
          ref={statusDropdownRef}
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            zIndex: 100,
            backgroundColor: 'white',
            border: '1px solid #ddd',
            borderRadius: 4,
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            width: 200,
            maxHeight: 300,
            overflowY: 'auto',
            marginTop: 4,
            color: UI_GRAY,
          }}
        >
          {availableStatuses.length === 0 ? (
            <div style={{ padding: 8, color: '#666', textAlign: 'center' }}>
              No status options available
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0 }}>
              {availableStatuses.map((status) => (
                <li
                  key={status.id}
                  onClick={() => updateStatus(status)}
                  style={{
                    padding: '8px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid #eee',
                    backgroundColor:
                      currentStatus?.id === status.id
                        ? '#f0f7ff'
                        : 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  {status.name.toLowerCase() === 'new' ? (
                    <RiCheckboxBlankCircleLine style={{ color: UI_BLUE }} />
                  ) : status.isClosed ? (
                    <RiCheckboxCircleFill style={{ color: UI_BLUE }} />
                  ) : (
                    <RiPlayCircleLine style={{ color: UI_BLUE }} />
                  )}
                  <span>{status.name}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
};

// BlockNote block spec
export const OpenProjectTaskBlock = createReactBlockSpec(
  {
    type: 'openProjectTask',
    propSchema: {
      wpid: { default: '' },
      subject: { default: '' },
      lockVersion: { default: 0 },
      parentId: { default: '' },
      status: { default: 'new' },
      statusIsClosed: { default: false },
      wpurl: { default: '' },
    },
    content: 'inline',
  },
  {
    render: ({ block, editor }) => (
      <OpenProjectTaskBlockComponent block={block} editor={editor} />
    ),
  },
);

// Slash menu item
export const getOpenProjectTaskBlockSlashMenuItems = (
  editor: any,
  t: any,
  group: any,
) => [
    {
      title: t('OpenProject Task'),
      onItemClick: async () => {
        insertOrUpdateBlock(editor, {
          type: 'openProjectTask',
          props: {},
        });
      },
      aliases: ['task', 'openprojecttask', 'op-task'],
      group,
      icon: <Icon iconName="task" $size="18px" />,
      subtext: t('Add an OpenProject task block'),
    },
  ];

// Formatting toolbar item
export const getOpenProjectTaskBlockFormattingToolbarItems = (
  t: any,
): BlockTypeSelectItem => ({
  name: t('OpenProject Task'),
  type: 'openProjectTask',
  icon: () => <RiCheckLine />,
  isSelected: (block) => {
    return block.type === 'openProjectTask';
  },
});
