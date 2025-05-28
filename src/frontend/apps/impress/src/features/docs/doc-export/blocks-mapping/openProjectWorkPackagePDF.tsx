import { Text } from '@react-pdf/renderer';

import { DocsExporterPDF } from '../types';

export const blockMappingOpenProjectWorkPackagePDF: DocsExporterPDF['mappings']['blockMapping']['openProjectWorkPackage'] =
  () => <Text>OpenProject work package</Text>;
