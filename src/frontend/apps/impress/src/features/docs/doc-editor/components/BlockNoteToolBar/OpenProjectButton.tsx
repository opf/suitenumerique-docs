import { fetchAPI } from '@/api';
import {
  useComponentsContext,
} from '@blocknote/react';
import { VariantType, useToastProvider } from '@openfun/cunningham-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

export const OpenProjectButton = () => {
  const Components = useComponentsContext();
  const { toast } = useToastProvider();
  const { t } = useTranslation();

  const handleOpenProjectAction = useCallback(async () => {
    try {
      const response = await fetchAPI('op/api/v3', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!response.ok) { throw new Error(`HTTP error! status: ${response.status}`); }

      const data = await response.json();
      toast(t('OpenProject API response: ') + JSON.stringify(data), VariantType.SUCCESS);
    } catch (error) {
      console.error('Error calling OpenProject API:', error);
      toast(t('Error calling OpenProject API'), VariantType.ERROR);
    }
  }, [toast, t]);

  if (!Components) {
    return null;
  }

  return (
    <Components.FormattingToolbar.Button
      className="bn-button --docs--editor-openproject-button"
      mainTooltip={"Call OpenProject API"}
      onClick={() => void handleOpenProjectAction()}
    >
      OP
    </Components.FormattingToolbar.Button>
  );
};