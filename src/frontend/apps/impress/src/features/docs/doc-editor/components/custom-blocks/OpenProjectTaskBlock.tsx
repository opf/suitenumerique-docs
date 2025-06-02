import { insertOrUpdateBlock } from '@blocknote/core';
import { BlockTypeSelectItem, createReactBlockSpec } from '@blocknote/react';
import React, { useEffect, useRef, useState } from 'react';
import {
  RiCheckLine,
  RiCheckboxBlankCircleLine,
  RiCheckboxCircleFill,
  RiPlayCircleLine,
} from 'react-icons/ri';

import { fetchAPI } from '@/api';
import { Icon } from '@/components';

import {
  OPENPROJECT_HOST,
  OPENPROJECT_TASK_PROJECT_ID,
  OPENPROJECT_TASK_TYPE_ID,
  UI_BEIGE,
  UI_BLUE,
  UI_GRAY,
} from './OpenProjectBlockSettings';

interface Status {
  id: string;
  name: string;
  isClosed: boolean;
  _links: {
    self: { href: string };
  };
}

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

          // Set current status if available
          if (data._links?.status) {
            setCurrentStatus({
              id: data._links.status.href.split('/').pop() || '',
              name: data._links.status.title || 'Unknown',
              isClosed: data.status?.isClosed || false,
              _links: {
                self: { href: data._links.status.href },
              },
            });
          }

          // Update block props so markdown is in sync
          editor.updateBlock(block, {
            props: {
              ...block.props,
              subject: data.subject,
              lockVersion: data.lockVersion,
              wpid: +data.id,
              wpurl: data._links?.self?.href || null,
              status: data._links?.status?.title || null,
              statusIsClosed: data.status?.isClosed || false,
            },
          });
        })
        .catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

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
      inputRef.current.focus();
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

    // Save the task and get whether it was a first save (creation)
    const wasFirstSave = await saveTask(subject.trim());
    console.log('wasFirstSave:', wasFirstSave);
    console.log('isFirstSave:', isFirstSave);

    // If this was the first successful save and we're still tracking first save
    if (wasFirstSave && isFirstSave) {
      setIsFirstSave(false); // Mark that we've handled the first save

      // Automatically insert a new task block below
      const newBlockId = insertOrUpdateBlock(
        editor,
        {
          type: 'openProjectTask',
          props: {
            parentId: block.props.parentId, // Inherit parent ID from current block
          },
          content: '',
        },
        {
          at: {
            blockId: block.id,
            position: 'after',
          },
        },
      );

      // Focus the new input with a more reliable approach
      setTimeout(() => {
        console.log('Attempting to focus new task block input:', newBlockId);
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
    if (isStatusDropdownOpen && statusUpdateSaving) {
      return <Icon iconName="spinner" $size="16px" />;
    }

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
          width: '500px',
          textDecoration:
            block.props.statusIsClosed ||
            (block.props.status || '').toLowerCase() === 'closed'
              ? 'line-through'
              : 'none',
        }}
      />
      {saving && <Icon iconName="spinner" $size="16px" />}
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
      wpid: { default: null },
      subject: { default: '' },
      lockVersion: { default: null },
      parentId: { default: null },
      status: { default: 'new' },
      statusIsClosed: { default: false },
      wpurl: { default: null },
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
    onItemClick: async () => {
      // Get the current selection
      const selection = editor.getSelection();
      if (!selection) {
        console.log('No selection found, inserting new OpenProject task block');
        // If no selection, just insert a new OpenProject task block
        insertOrUpdateBlock(editor, {
          type: 'openProjectTask',
        });
        return;
      }

      // Get the block at the current selection
      const block = editor.getBlock(selection.anchor.blockId);
      if (!block) {
        console.log(
          'No block found at selection, inserting new OpenProject task block',
        );
        // If no block found, just insert a new OpenProject task block
        insertOrUpdateBlock(editor, {
          type: 'openProjectTask',
        });
        return;
      }

      // If the block is a bullet list item, convert it and its children to OpenProject tasks
      if (block.type === 'bulletListItem') {
        console.log('Converting bullet list to OpenProject tasks...');
        await convertBulletListToOpenProjectTasks(editor, block);
      } else {
        console.log(
          'Inserting new OpenProject task block for non-bullet list item',
        );
        // For non-bullet list items, just convert to an OpenProject task
        insertOrUpdateBlock(editor, {
          type: 'openProjectTask',
        });
      }
    },
    aliases: ['task', 'openprojecttask', 'op-task'],
    group,
    icon: <Icon iconName="task" $size="18px" />,
    subtext: t('Add an OpenProject task block'),
  },
];

// Function to convert bullet list to OpenProject tasks with hierarchy
export const convertBulletListToOpenProjectTasks = async (editor, block) => {
  console.log('Starting conversion of bullet list to OpenProject tasks');

  // Get all blocks in the document
  // const blocks = editor.document.getBlocks();
  const blocks = editor.document;
  console.log('Total blocks in document:', blocks.length);

  const currentIndex = blocks.findIndex((b) => b.id === block.id);
  console.log('Selected block index:', currentIndex);

  if (currentIndex === -1 || block.type !== 'bulletListItem') {
    console.log('Not a bullet list item, aborting');
    return; // Not a bullet list item
  }

  console.log('Selected block:', {
    id: block.id,
    type: block.type,
    content: block.content,
    props: block.props,
  });

  // Create a map to track created tasks and their IDs
  const createdTasksMap = new Map();

  // First, analyze the structure to identify parent-child relationships
  console.log('Analyzing block hierarchy...');
  const blockHierarchy = analyzeBlockHierarchy(blocks, currentIndex);
  console.log(
    'Block hierarchy analysis result:',
    JSON.stringify(
      blockHierarchy,
      (key, value) => {
        if (key === 'block') {
          return {
            id: value.id,
            type: value.type,
            content: value.content,
            props: value.props,
          };
        }
        return value;
      },
      2,
    ),
  );

  // Process the hierarchy starting from the root
  console.log('Processing hierarchy to create tasks...');
  await processHierarchy(editor, blockHierarchy, null, createdTasksMap);
  console.log(
    'Finished processing hierarchy. Created tasks map:',
    createdTasksMap,
  );
};

// Function to analyze the block hierarchy
const analyzeBlockHierarchy = (blocks, startIndex) => {
  const rootBlock = blocks[startIndex];
  const rootLevel = rootBlock.props.indent || 0;

  console.log('Root block:', {
    id: rootBlock.id,
    type: rootBlock.type,
    content: rootBlock.content,
    props: rootBlock.props,
    indent: rootLevel,
  });

  // Create a hierarchical structure
  const rootNode = {
    block: rootBlock,
    children: [],
    level: rootLevel,
  };

  // Keep track of nodes at each level
  const levelNodes = {
    [rootLevel]: rootNode,
  };

  // First, collect all bullet list items
  const bulletItems = [];
  console.log('Collecting bullet list items...');

  // Log all blocks to see their structure
  console.log('All blocks:');
  blocks.forEach((block, idx) => {
    console.log(`Block ${idx}:`, {
      id: block.id,
      type: block.type,
      content: block.content,
      props: block.props,
      indent: block.props.indent || 0,
    });
  });

  // Collect all bullet list items, ignoring other block types
  for (let i = startIndex + 1; i < blocks.length; i++) {
    const block = blocks[i];
    console.log(`Examining block ${i}:`, {
      id: block.id,
      type: block.type,
      content: block.content,
      props: block.props,
    });

    // Only process bullet list items
    if (block.type === 'bulletListItem') {
      const level = block.props.indent || 0;
      console.log(`Found bullet list item at level ${level}`);

      // If we've gone back to a level lower than our root, we're done with this branch
      if (level < rootLevel) {
        console.log('Level is lower than root level, stopping collection');
        break;
      }

      bulletItems.push({
        block,
        level,
        index: i,
      });
      console.log('Added to bullet items collection');
    } else {
      console.log('Not a bullet list item, skipping');
      // Continue scanning for more bullet list items
      // This allows us to handle blank lines and other non-bullet list items
    }
  }

  console.log('Collected bullet items:', bulletItems.length);
  console.log(
    'Bullet items:',
    bulletItems.map((item) => ({
      id: item.block.id,
      content: item.block.content,
      level: item.level,
      index: item.index,
    })),
  );

  // Now process the bullet items to build the hierarchy
  console.log('Building hierarchy from bullet items...');
  for (const item of bulletItems) {
    const { block: currentBlock, level: currentLevel } = item;
    console.log('Processing item:', {
      id: currentBlock.id,
      content: currentBlock.content,
      level: currentLevel,
    });

    // Create a node for this block
    const currentNode = {
      block: currentBlock,
      children: [],
      level: currentLevel,
    };

    // Find the parent for this node
    console.log('Finding parent for level:', currentLevel);
    console.log('Current level nodes:', Object.keys(levelNodes));

    // For indented items, we need to find the appropriate parent
    if (currentLevel > rootLevel) {
      // Start looking for a parent at one level lower
      let parentLevel = currentLevel - 1;
      console.log('Initial parent level to look for:', parentLevel);

      // Keep looking for a parent at lower levels until we find one or reach the root level
      while (parentLevel >= rootLevel && !levelNodes[parentLevel]) {
        console.log(
          `No node found at level ${parentLevel}, trying lower level`,
        );
        parentLevel--;
      }

      console.log('Final parent level found:', parentLevel);

      if (parentLevel >= rootLevel) {
        // Add as a child to the parent
        console.log(`Adding as child to parent at level ${parentLevel}`);
        levelNodes[parentLevel].children.push(currentNode);
        console.log(
          `Parent now has ${levelNodes[parentLevel].children.length} children`,
        );
      } else {
        console.log(
          'Could not find a parent for this node, using root as parent',
        );
        // If we couldn't find a proper parent, use the root as the parent
        // This ensures that even if the indentation is unusual, we still maintain the hierarchy
        levelNodes[rootLevel].children.push(currentNode);
      }
    } else if (currentLevel === rootLevel) {
      // This is a sibling of the root, we're done with the root's hierarchy
      console.log('This is a sibling of root, stopping hierarchy building');
      break;
    }

    // Update the level nodes for this level
    // This means this node becomes the most recent node at its level
    console.log(`Updating level nodes for level ${currentLevel}`);
    levelNodes[currentLevel] = currentNode;
  }

  console.log(
    'Final hierarchy:',
    JSON.stringify(
      rootNode,
      (key, value) => {
        if (key === 'block') {
          return {
            id: value.id,
            type: value.type,
            content: value.content,
            props: value.props,
          };
        }
        return value;
      },
      2,
    ),
  );

  return rootNode;
};

// Function to process the hierarchy and create tasks
const processHierarchy = async (
  editor,
  node,
  parentTaskId,
  createdTasksMap,
) => {
  const { block } = node;
  console.log('Processing node:', {
    id: block.id,
    content: block.content,
    children: node.children.length,
    parentTaskId,
  });

  // Extract content from the bullet point
  const content = Array.isArray(block.content)
    ? block.content.map((c) => c.text || '').join('')
    : block.content || '';

  console.log('Extracted content:', content);

  if (!content.trim()) {
    console.log('Empty content, skipping task creation');
    return;
  }

  // Create a new OpenProject task
  console.log('Creating OpenProject task with subject:', content.trim());
  console.log('Parent task ID:', parentTaskId);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  editor.replaceBlocks(
    [block],
    [
      {
        type: 'openProjectTask',
        props: {
          subject: content.trim(),
          parentId: parentTaskId,
        },
        content: [],
      },
    ],
  );

  const newTaskBlock = block;

  console.log('New task block created:', newTaskBlock.id);

  // Wait for the task to be created in OpenProject
  let taskId = null;
  let attempts = 0;
  const maxAttempts = 10;

  console.log('Waiting for task to be created in OpenProject...');

  while (!taskId && attempts < maxAttempts) {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const updatedBlock = editor.getBlock(newTaskBlock.id);
    console.log('Updated block:', updatedBlock);
    taskId = updatedBlock?.props?.wpid;
    console.log(`Attempt ${attempts + 1}: Task ID:`, taskId);
    attempts++;
  }

  if (taskId) {
    console.log('Task created successfully with ID:', taskId);
    createdTasksMap.set(block.id, taskId);

    console.log(`Processing ${node.children.length} children...`);
    // Process children only after the parent task has been created
    for (const childNode of node.children) {
      console.log('Processing child node:', {
        id: childNode.block.id,
        content: childNode.block.content,
      });
      await processHierarchy(editor, childNode, taskId, createdTasksMap);
    }
  } else {
    console.log('Failed to create task after', maxAttempts, 'attempts');
  }
};

// Formatting toolbar item
export const getOpenProjectTaskBlockFormattingToolbarItems = (
  t,
): BlockTypeSelectItem => ({
  name: t('OpenProject Task'),
  type: 'openProjectTask',
  icon: () => <RiCheckLine />,
  isSelected: (block) => {
    console.log('Checking if block is OpenProject task:', block);
    return block.type === 'openProjectTask';
  },
});
