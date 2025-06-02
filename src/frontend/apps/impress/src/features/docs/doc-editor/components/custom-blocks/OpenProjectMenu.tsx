import { createReactInlineContentSpec, DefaultReactSuggestionItem } from "@blocknote/react";
import { OPENPROJECT_HOST, searchWorkPackages, UI_BLUE } from "./OpenProjectBlockSettings";
import { blockNoteSchema } from "../BlockNoteEditor";


export const getOpenProjectMenuItems = async (
  editor: typeof blockNoteSchema.BlockNoteEditor,
  query: string,
): Promise<DefaultReactSuggestionItem[]> => {

  if (!query) {
    return [
        {
            title: "Create new work package",
            onItemClick: () => {
              alert("Create new work package");
            },
          },
          {
            title: "Search work packages",
            onItemClick: () => {
              alert("Search work packages");
            },
          }
    ];
}


  const workpackages = await searchWorkPackages(query);

  return workpackages.map((wp) => ({
    title: '#' + wp.id + ' ' + wp.subject,
    onItemClick: () => {
      editor.insertInlineContent([
        {
          type: "openProjectWorkPackageInline",
          props: {
            wpid: wp.id || '',
            subject: wp.subject || ''
          },
        },
        " ", // add a space after the mention
      ]);
    },
  }));
};


  