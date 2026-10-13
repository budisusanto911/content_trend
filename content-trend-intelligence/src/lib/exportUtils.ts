export function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportAsMarkdown(context: any) {
  const md = `# Content Brief: ${context.trend.topic}
  
## Trend
- **Score:** ${context.trend.trendScore}
- **Status:** ${context.trend.trendStatus}
- **Why Trending:** ${context.trend.whyTrending}

## Audience
- **Target:** ${context.audience.primaryAudience}
- **Pain Points:** ${context.audience.audiencePainPoints.join(", ")}

## Gap & Opportunity
- **Gap:** ${context.contentGap}
- **Opportunity:** ${context.contentOpportunity.recommendedOpportunity}
- **Angle:** ${context.contentOpportunity.uniqueAngle}

## Brief
- **Hook:** ${context.contentBrief.hook}
- **Structure:**
${context.contentBrief.storyStructure.map((s: string) => `  - ${s}`).join("\n")}
- **CTA:** ${context.contentBrief.cta}
`;
  downloadFile(md, "content-brief.md", "text/markdown");
}

export function exportAsJSON(context: any) {
  downloadFile(JSON.stringify(context, null, 2), "content-brief.json", "application/json");
}

export function exportAsCSV(context: any) {
  // Simple CSV of the key points for spreadsheet
  const csv = `Topic,Score,Status,Angle\n"${context.trend.topic}",${context.trend.trendScore},"${context.trend.trendStatus}","${context.contentOpportunity.uniqueAngle}"`;
  downloadFile(csv, "trend-data.csv", "text/csv");
}
