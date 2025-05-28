import { Paragraph } from 'docx';

import { DocsExporterDocx } from '../types';

export const blockMappingOpenProjectWorkPackageDocx: DocsExporterDocx['mappings']['blockMapping']['openProjectWorkPackage'] =
  () => {
    return new Paragraph({
      text: 'OpenProject Work Package',
    });
  };
