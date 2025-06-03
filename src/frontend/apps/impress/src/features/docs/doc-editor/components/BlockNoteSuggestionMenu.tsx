import { combineByGroup, filterSuggestionItems } from '@blocknote/core';
import {
  SuggestionMenuController,
  getDefaultReactSlashMenuItems,
  getPageBreakReactSlashMenuItems,
  useBlockNoteEditor,
  useDictionary,
} from '@blocknote/react';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import { DocsBlockSchema } from '../types';

import {
  getCalloutReactSlashMenuItems,
  getDividerReactSlashMenuItems,
  getOpenProjectTaskBlockSlashMenuItems,
  getOpenProjectWorkPackageReactSlashMenuItems,
} from './custom-blocks';
import { blockNoteSchema } from './BlockNoteEditor';

export const BlockNoteSuggestionMenu = () => {
  const editor = useBlockNoteEditor(blockNoteSchema);
  const { t } = useTranslation();
  const basicBlocksName = useDictionary().slash_menu.page_break.group;

  const getSlashMenuItems = useMemo(() => {
    return async (query: string) =>
      Promise.resolve(
        filterSuggestionItems(
          combineByGroup(
            getDefaultReactSlashMenuItems(editor),
            getPageBreakReactSlashMenuItems(editor),
            getCalloutReactSlashMenuItems(editor, t, basicBlocksName),
            getDividerReactSlashMenuItems(editor, t, basicBlocksName),
            getOpenProjectWorkPackageReactSlashMenuItems(
              editor,
              t,
              basicBlocksName,
            ),
            getOpenProjectTaskBlockSlashMenuItems(editor, t, basicBlocksName),
          ),
          query,
        ),
      );
  }, [basicBlocksName, editor, t]);

  return (
    <SuggestionMenuController
      triggerCharacter="/"
      getItems={getSlashMenuItems}
    />
  );
};
