import { Paragraph } from 'docx';

import { DocsExporterDocx } from '../types';

export const blockMappingOpenProjectTaskDocx: DocsExporterDocx['mappings']['blockMapping']['openProjectTask'] =
  (block, exporter) => {
    return new Paragraph({});
  };
