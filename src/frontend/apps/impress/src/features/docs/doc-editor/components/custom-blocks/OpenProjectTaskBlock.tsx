import { insertOrUpdateBlock } from '@blocknote/core';
import { BlockTypeSelectItem, createReactBlockSpec } from '@blocknote/react';
import React, { useRef, useState } from 'react';

import { fetchAPI } from '@/api';
import { Icon } from '@/components';

const OPENPROJECT_TASK_PROJECT_ID = '1'; // TODO: Replace with your actual project ID
const OPENPROJECT_TASK_TYPE_ID = '1'; // TODO: Replace with your actual "task" type ID

export const OpenProjectTaskBlockComponent: React.FC<{
  block: any;
  editor: any;
}> = ({ block, editor }) => {
  const [subject, setSubject] = useState(block.props.subject || '');
  const [taskId, setTaskId] = useState(block.props.wpid || null);
  const [lockVersion, setLockVersion] = useState(
    block.props.lockVersion || null,
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch latest subject and lockVersion if taskId exists
  React.useEffect(() => {
    if (taskId) {
      fetchAPI(`op/api/v3/work_packages/${taskId}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }
          const data = await response.json();
          setSubject(data.subject);
          setLockVersion(data.lockVersion);
          // Update block props so markdown is in sync
          console.log('OPENPROJECT_TASK_TYPE_ID', OPENPROJECT_TASK_TYPE_ID);
          console.log('data.id', data.id);
          editor.updateBlock(block, {
            props: {
              ...block.props,
              subject: data.subject,
              lockVersion: data.lockVersion,
              wpid: +data.id,
              wpurl: data._links?.self?.href || null,
            },
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

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
      inputRef.current.focus();
    }
  }, [taskId]);

  // Save or update the task in OpenProject
  const saveTask = async (newSubject: string) => {
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
          return;
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
          },
        });
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
          return;
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
    } catch (err: any) {
      setError(err.message || 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  // Handle blur or Enter key
  const handleSave = async () => {
    if (subject.trim() === '') {
      return;
    }
    await saveTask(subject.trim());
  };

  // Handle Enter: save and insert new block below, focus new input
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await handleSave();
      // Insert a new task block below and focus its input
      const newBlock = editor.insertBlock(
        {
          type: 'openProjectTask',
          props: {},
          content: '',
        },
        block,
        'after',
      );
      setTimeout(() => {
        // Try to focus the new input (may require a more robust approach)
        const input = document.querySelector(
          `[data-block-id="${newBlock.id}"] input`,
        );
        if (input) {
          input.focus();
        }
      }, 100);
    }
  };

  // Render ID as link or "NEW"
  const OPENPROJECT_HOST =
    process.env.OPEN_PROJECT_HOST || 'https://openproject.local';
  const renderId = () => {
    if (!taskId) {
      return <span style={{ color: '#aaa' }}>NEW</span>;
    }
    const url = `${OPENPROJECT_HOST}/wp/${taskId}`;
    return (
      <a
        href={url}
        style={{
          marginRight: 6,
          textDecoration: 'underline',
          color: '#1976d2',
          cursor: 'pointer',
        }}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          window.open(url, '_blank');
        }}
      >
        #{taskId}
      </a>
    );
  };

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, minHeight: 32 }}
      data-block-id={block.id}
    >
      <span style={{ fontSize: 20, userSelect: 'none' }}>▣</span>
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
        }}
      />
      {saving && <Icon iconName="spinner" $size="16px" />}
      {error && (
        <span style={{ color: 'red', marginLeft: 8 }} title={error}>
          <Icon iconName="error" $size="16px" />
        </span>
      )}
      {/* TEMP: Button to fetch and log available work package types */}
      <button
        type="button"
        style={{ marginLeft: 8, fontSize: 12, padding: '2px 6px' }}
        onClick={async () => {
          const resp = await fetchAPI(
            `op/api/v3/projects/${OPENPROJECT_TASK_PROJECT_ID}/types`,
            {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' },
            },
          );
          if (resp.ok) {
            const data = await resp.json();
            // Log all types to the console
            // Each type: { id, name }
            // Example: { id: 1, name: "Task" }
            // Use the id for OPENPROJECT_TASK_TYPE_ID
            // eslint-disable-next-line no-console
            console.log(
              'Available work package types:',
              data._embedded?.elements,
            );
            alert('Check the console for available work package types.');
          } else {
            alert('Failed to fetch types');
          }
        }}
      >
        Log Types
      </button>
    </div>
  );
};

// BlockNote block spec
export const OpenProjectTaskBlock = createReactBlockSpec(
  {
    type: 'openProjectTask',
    propSchema: {
      wpid: { default: null },
      subject: { default: '' },
      lockVersion: { default: null },
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
export const getOpenProjectTaskBlockSlashMenuItems = (editor, t, group) => [
  {
    title: t('OpenProject Task'),
    onItemClick: () => {
      insertOrUpdateBlock(editor, {
        type: 'openProjectTask',
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
  t,
): BlockTypeSelectItem => ({
  name: t('OpenProject Task'),
  type: 'openProjectTask',
  icon: () => <Icon iconName="task" $size="16px" />,
  isSelected: (block) => block.type === 'openProjectTask',
});
