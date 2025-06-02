import { createReactInlineContentSpec } from "@blocknote/react";
import { OPENPROJECT_HOST, UI_BLUE } from "./OpenProjectBlockSettings";

export const OpenProjectWorkPackageInline = createReactInlineContentSpec(
    {
      type: "openProjectWorkPackageInline",
      propSchema: {
        wpid: { default: '', type: 'string' },
        subject: { default: '', type: 'string' },
      },
      content: "none",
    },
    {
      render: (props) => (
        <a
                href={`${OPENPROJECT_HOST}/wp/${props.inlineContent.props.wpid}`}
                style={{
                  marginRight: 6,
                  textDecoration: 'none',
                  color: UI_BLUE,
                  cursor: 'pointer',
                }}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(`${OPENPROJECT_HOST}/wp/${props.inlineContent.props.wpid}`, '_blank');
                }}
                // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
                onMouseOver={(e) =>
                  (e.currentTarget.style.textDecoration = 'underline')
                }
                // eslint-disable-next-line jsx-a11y/mouse-events-have-key-events
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                OP#{props.inlineContent.props.wpid} - {props.inlineContent.props.subject}
              </a>
      ),
    },
  );