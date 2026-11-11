---
name: generate-content-context
description: Guidelines for generating the Content Context and AI Prompts from source videos without directly paraphrasing them.
---
# Generate Content Context

When the user selects multiple videos and clicks "Generate Context", the AI Service must follow these guidelines to synthesize the data.

## Goal
The output must be **original content opportunities** based on trend analysis, NOT a paraphrase of the source videos.

## Prompting the AI
When querying the AI Engine (e.g., Gemini), use this prompt structure:

1. **Input Data**: Provide the titles, metadata, views, and engagement data of the selected source videos.
2. **Analysis Request**: Ask the AI to identify:
   - Common themes and core topics.
   - Common audience interests and pain points.
   - Hook patterns used in the sources.
   - Format and emotional triggers.
3. **Gap & Opportunity**: Ask the AI to identify what is *missing* from the source videos (Content Gap) and suggest a unique angle (Content Opportunity).
4. **Content Brief**: Ask the AI to formulate a brief including Hook, Key Points, Story Flow, CTA, Title Ideas, and Thumbnail Concept.

## Output Format
Ensure the AI returns the data matching the `ContentContext` TypeScript interface so the frontend can display it in the structured dashboard.
