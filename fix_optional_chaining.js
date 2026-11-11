const fs = require('fs');
const path = 'src/app/dashboard/analyzer/page.tsx';
let code = fs.readFileSync(path, 'utf8');

// Replace potentially undefined accesses with optional chaining and fallbacks
code = code.replace(/context\.contentOpportunity\.uniqueAngle/g, "context?.contentOpportunity?.uniqueAngle || 'N/A'");
code = code.replace(/context\.contentGap/g, "context?.contentGap || 'N/A'");
code = code.replace(/context\.contentOpportunity\.recommendedFormat/g, "context?.contentOpportunity?.recommendedFormat || 'N/A'");
code = code.replace(/context\.contentBrief\.hook/g, "context?.contentBrief?.hook || 'N/A'");
code = code.replace(/context\.contentBrief\.storyStructure\.map/g, "(context?.contentBrief?.storyStructure || []).map");
code = code.replace(/context\.contentBrief\.youtubeDescription/g, "context?.contentBrief?.youtubeDescription");
code = code.replace(/context\.trend\.topic/g, "context?.trend?.topic || 'N/A'");
code = code.replace(/context\.trend\.trendScore/g, "context?.trend?.trendScore || 0");
code = code.replace(/context\.trend\.trendStatus/g, "context?.trend?.trendStatus || 'N/A'");
code = code.replace(/context\.trend\.whyTrending/g, "context?.trend?.whyTrending || 'N/A'");
code = code.replace(/context\.audience\.primaryAudience/g, "context?.audience?.primaryAudience || 'N/A'");
code = code.replace(/context\.audience\.audiencePainPoints\.map/g, "(context?.audience?.audiencePainPoints || []).map");
code = code.replace(/context\.preProduction\.retentionPredictor\.riskScore/g, "context?.preProduction?.retentionPredictor?.riskScore || 0");
code = code.replace(/context\.preProduction\.retentionPredictor\.dropOffWarning/g, "context?.preProduction?.retentionPredictor?.dropOffWarning || 'N/A'");
code = code.replace(/context\.preProduction\.retentionPredictor\.pacingSuggestion/g, "context?.preProduction?.retentionPredictor?.pacingSuggestion || 'N/A'");
code = code.replace(/context\.preProduction\.thumbnailPrompts\.map/g, "(context?.preProduction?.thumbnailPrompts || []).map");
code = code.replace(/context\.contentBrief\.keywords/g, "(context?.contentBrief?.keywords || [])");

// Fix voice over script building
code = code.replace(
  "const script = `Here is the hook: ${context.contentBrief.hook}. \\n\\nAnd here is the story structure. ${context.contentBrief.storyStructure.join(\". \")}.`;",
  "const script = `Here is the hook: ${context?.contentBrief?.hook || ''}. \\n\\nAnd here is the story structure. ${(context?.contentBrief?.storyStructure || []).join(\". \")}.`;"
);

fs.writeFileSync(path, code);
