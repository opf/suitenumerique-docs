import { Block } from '@blocknote/core';
import {
  ComponentProps,
  useBlockNoteEditor,
  useComponentsContext,
  useSelectedBlocks,
} from '@blocknote/react';
import {
  Loader,
  VariantType,
  useToastProvider,
} from '@openfun/cunningham-react';
import { PropsWithChildren, ReactNode, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { RiFileTextLine } from 'react-icons/ri';

import { isAPIError } from '@/api';
import { Icon } from '@/components';
import { useDocStore } from '@/docs/doc-management/';

import { useDocAIOPFeature } from '../../api';

export function OPAIButton() {
  const editor = useBlockNoteEditor();
  const Components = useComponentsContext();
  const selectedBlocks = useSelectedBlocks(editor);
  const { t } = useTranslation();
  const { currentDoc } = useDocStore();

  const show = useMemo(() => {
    return !!selectedBlocks.find((block) => block.content !== undefined);
  }, [selectedBlocks]);

  if (!show || !editor.isEditable || !Components || !currentDoc) {
    return null;
  }

  const canAITransform = currentDoc.abilities.ai_transform;

  if (!canAITransform) {
    return null;
  }

  return (
    <Components.Generic.Menu.Root>
      <Components.Generic.Menu.Trigger>
        <Components.FormattingToolbar.Button
          className="bn-button bn-menu-item --docs--ai-actions-menu-trigger"
          data-test="ai-actions"
          label="OpenProject AI"
          mainTooltip={t('OpenProect AI Actions')}
          icon={<Icon iconName="auto_awesome" $size="l" />}
        >
          OpenProject
        </Components.FormattingToolbar.Button>
      </Components.Generic.Menu.Trigger>
      <Components.Generic.Menu.Dropdown
        className="bn-menu-dropdown bn-drag-handle-menu --docs--ai-actions-menu"
        sub={true}
      >
        <AIMenuItemOPFeatureTransform docId={currentDoc.id}>
          {t(' ')}
        </AIMenuItemOPFeatureTransform>
      </Components.Generic.Menu.Dropdown>
    </Components.Generic.Menu.Root>
  );
}

/**
 * Item is derived from Mantime, some props seem lacking or incorrect.
 */
type ItemDefault = ComponentProps['Generic']['Menu']['Item'];
type ItemProps = Omit<ItemDefault, 'onClick'> & {
  rightSection?: ReactNode;
  closeMenuOnClick?: boolean;
  onClick: (e: React.MouseEvent) => void;
};

interface AIMenuItemOPFeatureTransform {
  docId: string;
}

const AIMenuItemOPFeatureTransform = ({
  docId,
}: PropsWithChildren<AIMenuItemOPFeatureTransform>) => {
  const { mutateAsync: requestAI, isPending } = useDocAIOPFeature();
  const editor = useBlockNoteEditor();

  const template =
    'As a [enter role of user] \n' +
    'I want to [enter objective] \n' +
    'so that [enter desired result] \n' +
    '  Acceptance criteria \n' +
    '  - [enter acceptance criteria] \n';

  const requestAIAction = async (selectedBlocks: Block[]) => {
    const text = await editor.blocksToMarkdownLossy(selectedBlocks);

    const responseAI = await requestAI({
      text,
      template,
      docId,
    });

    if (!responseAI?.answer) {
      throw new Error('No response from AI');
    }

    const markdown = await editor.tryParseMarkdownToBlocks(responseAI.answer);
    editor.replaceBlocks(selectedBlocks, markdown);
  };

  return (
    <>
      <AIMenuItem
        requestAI={requestAIAction}
        isPending={isPending}
        label="Convert to feature"
        icon={<RiFileTextLine />}
      ></AIMenuItem>
    </>
  );
};

interface AIMenuItemProps {
  requestAI: (blocks: Block[]) => Promise<void>;
  isPending: boolean;
  label: string;
  icon?: ReactNode;
}

const AIMenuItem = ({
  requestAI,
  isPending,
  label,
  children,
  icon,
}: PropsWithChildren<AIMenuItemProps>) => {
  const Components = useComponentsContext();
  const { toast } = useToastProvider();
  const { t } = useTranslation();

  const editor = useBlockNoteEditor();
  const handleAIError = useHandleAIError();

  const handleAIAction = async () => {
    const selectedBlocks = editor.getSelection()?.blocks ?? [
      editor.getTextCursorPosition().block,
    ];

    if (!selectedBlocks?.length) {
      toast(t('No text selected'), VariantType.WARNING);
      return;
    }

    try {
      await requestAI(selectedBlocks);
    } catch (error) {
      handleAIError(error);
    }
  };

  if (!Components) {
    return null;
  }

  const Item = Components.Generic.Menu.Item as React.FC<ItemProps>;

  return (
    <Item
      closeMenuOnClick={false}
      icon={icon}
      onClick={(e: React.MouseEvent) => {
        e.stopPropagation();
        void handleAIAction();
      }}
      rightSection={isPending ? <Loader size="small" /> : undefined}
    >
      {label}
      {children}
    </Item>
  );
};

const useHandleAIError = () => {
  const { toast } = useToastProvider();
  const { t } = useTranslation();

  return (error: unknown) => {
    if (isAPIError(error) && error.status === 429) {
      toast(t('Too many requests. Please wait 60 seconds.'), VariantType.ERROR);
      return;
    }

    toast(t('AI seems busy! Please try again.'), VariantType.ERROR);
  };
};
