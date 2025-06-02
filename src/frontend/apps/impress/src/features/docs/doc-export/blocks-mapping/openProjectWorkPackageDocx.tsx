import { Paragraph } from 'docx';

import { DocsExporterDocx } from '../types';

export const blockMappingOpenProjectWorkPackageDocx: DocsExporterDocx['mappings']['blockMapping']['openProjectWorkPackage'] =
  (block, exporter) => {
    return new Paragraph({});
  };
