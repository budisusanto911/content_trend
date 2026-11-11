const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

code = code.replace(
  'const script = `Here is the hook: ${context?.contentBrief?.hook || \'N/A\'}. \\n\\nAnd here is the story structure. ${context.contentBrief.storyStructure.join(". ")}.`;',
  'const script = `Here is the hook: ${context?.contentBrief?.hook || \'N/A\'}. \\n\\nAnd here is the story structure. ${(context?.contentBrief?.storyStructure || []).join(". ")}.`;'
);

code = code.replace(
  'topic: context.contentBrief.mainTopic || context?.trend?.topic || \'N/A\' || "Untitled Idea",',
  'topic: context?.contentBrief?.mainTopic || context?.trend?.topic || "Untitled Idea",'
);

// One more check for the hook in voice over
code = code.replace(
  'const script = `Here is the hook: ${context.contentBrief.hook}. \\n\\nAnd here is the story structure. ${context.contentBrief.storyStructure.join(". ")}.`;',
  'const script = `Here is the hook: ${context?.contentBrief?.hook || \'\'}. \\n\\nAnd here is the story structure. ${(context?.contentBrief?.storyStructure || []).join(". ")}.`;'
);

fs.writeFileSync(path, code);
