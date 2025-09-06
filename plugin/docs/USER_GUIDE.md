# GTD Assistant for Obsidian - User Guide

## Overview

GTD Assistant is an Obsidian plugin that helps you implement Getting Things Done (GTD) methodology by automatically clarifying inbox text into properly formatted, actionable tasks. The plugin uses AI-powered analysis to identify next actions, waiting for items, and someday/maybe projects from your raw notes, emails, and meeting transcripts.

## Key Features

- **Intelligent Text Analysis**: Automatically identifies actionable items from various text formats
- **GTD Methodology**: Follows authentic GTD principles for task categorization
- **Tasks Plugin Compatible**: Outputs tasks in Obsidian Tasks plugin format
- **Context Awareness**: Assigns appropriate contexts (@calls, @computer, @errands, etc.)
- **Priority and Time Estimation**: Includes priority levels and time estimates
- **Performance Optimized**: Handles large text inputs efficiently
- **Privacy-Focused**: Runs locally with secure backend communication

## Installation and Setup

### Prerequisites

1. **Obsidian**: Version 1.4.0 or later
2. **Backend Service**: GTD Assistant FastAPI server running locally
3. **API Access**: AWS Bedrock API key configured in the backend

### Plugin Installation

1. Download the plugin files to your `.obsidian/plugins/obsidian-gtd/` folder
2. Enable the plugin in Obsidian's Community Plugins settings
3. Configure the plugin settings (see Configuration section)

### Configuration

1. Open Obsidian Settings → Community Plugins → GTD Assistant
2. Configure the following settings:

| Setting | Description | Default |
|---------|-------------|---------|
| Backend URL | URL of your GTD Assistant server | `http://localhost:8000` |
| Timeout | Request timeout in milliseconds | `30000` (30 seconds) |
| API Key | Your AWS Bedrock API key | (empty - configure in server) |

3. Test the connection using the "Test Connection" button

## How to Use

### Basic Usage

1. **Select Text**: Highlight any text in your Obsidian note
2. **Trigger Clarification**: Use one of these methods:
   - Keyboard shortcut: `Cmd+Shift+G` (Mac) or `Ctrl+Shift+G` (Windows/Linux)
   - Command palette: Search for "Clarify selected text (GTD)"
   - Ribbon icon: Click the brain icon in the left sidebar

3. **Review Results**: The plugin will replace your selected text with formatted tasks

### Text Input Types

The plugin works best with these types of content:

#### Email Content
```
From: client@company.com
Subject: Project Update Needed

Hi there,

Can you please send me an updated timeline for the project by Friday? 
Also, let's schedule a call next week to discuss the requirements.

Thanks!
```

**Result:**
```markdown
- [ ] Send updated project timeline to client #30m 📅 2024-01-12 @computer #client #timeline
- [ ] Schedule call with client to discuss requirements #15m @calls #client #meeting
```

#### Meeting Notes
```
Team Standup - January 8, 2024

- Alice needs code review by Wednesday
- Bob is blocked on API documentation  
- Schedule retrospective for Friday
- Follow up with client on feedback
```

**Result:**
```markdown
- [ ] Review Alice's code #30m 📅 2024-01-10 @computer #code-review #team
- [ ] API documentation for Bob's integration #waiting #api
- [ ] Schedule team retrospective #15m 📅 2024-01-12 @computer #meeting #team
- [ ] Follow up with client on feedback #30m @calls #client
```

#### General Notes
```
Ideas and tasks from brainstorming:
- Call John about the proposal tomorrow
- Maybe look into automation tools someday
- URGENT: Fix the login bug
- Research competitors next month
```

**Result:**
```markdown
- [ ] Call John about the proposal #30m 📅 2024-01-09 @calls #proposal
- [ ] Look into automation tools #research #someday
- [ ] Fix the login bug #2h 🔺 @computer #urgent #bug
- [ ] Research competitors ⏳ 2024-02-01 @computer #research #competitive
```

## Understanding the Output Format

### Task Structure

GTD Assistant outputs tasks in Obsidian Tasks plugin format:

```markdown
- [ ] [Action] [#time] [📅 due] [⏳ scheduled] [🛫 start] [Priority] [Context] [#tags] [[Project]]
```

### Priority Symbols

| Symbol | Priority | Usage |
|--------|----------|-------|
| 🔺 | Highest | Critical, urgent items |
| ⬆️ | High | Important items with deadlines |
| 🔼 | Medium | Standard priority items |
| 🔽 | Low | Non-urgent but useful |
| ⬇️ | Lowest | Nice-to-have items |

### Date Symbols

| Symbol | Type | Description |
|--------|------|-------------|
| 📅 | Due Date | When the task must be completed |
| ⏳ | Scheduled | When you plan to work on it |
| 🛫 | Start Date | Earliest date to begin work |

### Time Estimates

Time estimates use hashtag format:
- `#15m` - 15 minutes
- `#1h` - 1 hour  
- `#2h` - 2 hours
- `#30m` - 30 minutes

### GTD Categories

The plugin categorizes items according to GTD methodology:

#### Next Actions
- **Purpose**: Specific, actionable tasks you can do right now
- **Format**: `- [ ] [Specific action starting with verb]`
- **Examples**: "Call client", "Draft proposal", "Send email"

#### Waiting For
- **Purpose**: Items you're waiting for from others
- **Format**: `- [ ] [Item description] #waiting`
- **Examples**: "Design mockups from UI team #waiting"

#### Someday/Maybe
- **Purpose**: Ideas and potential projects for future consideration
- **Format**: `- [ ] [Idea or project] #someday`
- **Examples**: "Learn Python programming #someday"

### Contexts

Contexts help you group tasks by the tools, locations, or situations needed:

| Context | Usage |
|---------|-------|
| `@calls` | Phone calls to make |
| `@computer` | Tasks requiring a computer |
| `@errands` | Tasks to do while out |
| `@office` | Tasks requiring office environment |
| `@home` | Tasks to do at home |
| `@waiting` | Items waiting for others |

## Advanced Usage

### Large Text Optimization

For texts over 5,000 characters, the plugin automatically:
- Extracts the most actionable content
- Prioritizes time-sensitive items
- Focuses on sentences with action words
- Provides optimization notes in the output

### Performance Tips

1. **Batch Processing**: Process multiple small items together rather than one at a time
2. **Text Quality**: Better structured input (bullet points, clear sentences) produces better results
3. **Context Clues**: Include names, dates, and specifics for better task generation
4. **Review and Refine**: The AI suggestions are starting points - refine as needed

### Troubleshooting

#### Common Issues

**"No text selected"**
- Solution: Highlight text before using the clarification command

**"Unable to connect to GTD service"**
- Solution: Ensure the backend server is running on the configured URL
- Check that the server is accessible at `http://localhost:8000` (or your configured URL)

**"API service unavailable"**
- Solution: Verify your AWS Bedrock API key is configured in the server
- Check server logs for authentication errors

**"No actionable items found"**
- Solution: Try with more specific text that includes action verbs and clear intentions

#### Getting Help

1. **Plugin Console**: Check Obsidian's developer console (Ctrl+Shift+I) for error messages
2. **Server Logs**: Check your GTD Assistant server logs for detailed error information
3. **Test Connection**: Use the "Test Connection" button in settings to verify configuration

## Best Practices

### Input Text Preparation

1. **Be Specific**: Include names, dates, and context
2. **Use Action Words**: Include verbs like "call", "send", "review", "schedule"
3. **Provide Context**: Mention deadlines, priorities, and dependencies
4. **Structure Content**: Use bullet points or clear paragraphs

### Workflow Integration

1. **Inbox Processing**: Use for converting daily inbox items to tasks
2. **Meeting Notes**: Process meeting notes immediately after meetings
3. **Email Processing**: Copy important emails and clarify action items
4. **Weekly Review**: Process accumulated notes during your GTD weekly review

### Task Management

1. **Review Output**: Always review and refine the generated tasks
2. **Add Details**: Enhance tasks with additional context as needed
3. **Update Priorities**: Adjust priorities based on current circumstances
4. **Link Projects**: Use `[[Project Name]]` syntax to link related tasks

## Examples and Templates

### Email Processing Template

```
From: [Sender]
Subject: [Subject]
Date: [Date]

[Email content with action items highlighted or extracted]

Action items to process:
- [List specific requests or commitments]
```

### Meeting Notes Template

```
Meeting: [Title]
Date: [Date]
Attendees: [List]

Key Decisions:
- [Decision items]

Action Items:
- [Who] will [do what] by [when]
- [Follow-up items]
```

### Project Planning Template

```
Project: [Name]
Status: [Current status]

Immediate Actions (This Week):
- [Urgent items]

Short-term Goals (This Month):
- [Important items]

Someday/Maybe:
- [Future considerations]

Waiting For:
- [Dependencies]
```

## Privacy and Security

- **Local Processing**: All text analysis happens through your local backend server
- **No Data Storage**: The plugin doesn't store your text or task data
- **Secure Communication**: Uses HTTPS for backend communication (when configured)
- **API Key Security**: AWS credentials are stored only in the backend server, not in Obsidian

## Integration with Other Plugins

### Obsidian Tasks Plugin

GTD Assistant is designed to work seamlessly with the Tasks plugin:
- Uses compatible checkbox syntax
- Includes proper date formatting
- Supports priority indicators
- Works with task queries and filters

### Templater Plugin

You can create Templater templates that include GTD Assistant processing:

```javascript
<%*
// Template for inbox processing
const inboxText = await tp.system.prompt("Enter inbox text:");
// Note: You would then manually use the GTD Assistant on this text
%>

## Inbox Item - <% tp.date.now("YYYY-MM-DD HH:mm") %>

<% inboxText %>

---
*Process this text with GTD Assistant using Cmd+Shift+G*
```

## Updates and Changelog

The plugin automatically checks for updates. Major changes will be announced through:
- Plugin release notes in Obsidian
- GitHub repository releases
- Documentation updates

For the latest information, visit the [project repository](https://github.com/user/obsidian-gtd) or check the plugin settings page.