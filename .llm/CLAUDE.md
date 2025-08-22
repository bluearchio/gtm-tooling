# Claude AI Assistant Guidelines - GTM LinkedIn Auto-Apply Extension

## Project Context
This is a LinkedIn auto-apply browser extension (Chrome Manifest V3) that automates job applications. The extension includes content scripts, service workers, and UI components.

## Steps to complete for each user request
- ALWAYS select the best agent for the task. 
- ALWAYS update TODOs with the project manager agent to ensure goals, components, tasks, their appropriate status, assigned agent, and priority, are up to date and current 

## Agent Selection Matrix

### ALWAYS Use These Agents for These Commands:

#### 🏗️ **technical-architect-lead**
**Use when user asks about:**
- System design or architecture questions
- "How should I structure..." / "What's the best way to..."
- Database or storage decisions
- Performance optimization strategies
- Scaling considerations
- Security architecture
- API design patterns
- Refactoring decisions
- Technology trade-offs (e.g., "Should I use X or Y?")

**Example commands:**
- "How should I handle rate limiting?"
- "What's the best way to store user data?"
- "Should I use IndexedDB or Chrome Storage?"

#### 🎯 **project-manager-analyst**
**Use when user asks about:**
- "Break down this feature..."
- "Plan the implementation of..."
- "What tasks are needed for..."
- "Organize these requirements..."
- "Prioritize these features..."
- Project status updates
- Sprint planning
- Task dependencies

**Example commands:**
- "Plan the anti-detection system"
- "Break down the form automation feature"
- "What's the status of the project?"

#### ✅ **quality-assurance-guardian**
**Use when user:**
- Says "I've finished..." / "I've implemented..."
- Asks to "test this feature"
- Reports a bug
- Says "Ready to deploy"
- Asks "Does this work?"
- Needs validation of functionality

**Example commands:**
- "I've finished the popup implementation"
- "Test the form filling feature"
- "Users report the extension crashes"

#### 🚀 **devops-deployment-engineer**
**Use when user asks about:**
- Deployment to Chrome Web Store
- Build processes
- CI/CD setup
- Environment configuration
- Package distribution
- Release management
- "Submit a PR"
- "Deploy this"

**Example commands:**
- "Deploy to Chrome Web Store"
- "Set up the build process"
- "Create a release"

#### 🔄 **workflow-orchestrator**
**Use when user asks for:**
- Multiple interconnected features
- Full-stack implementations
- "Build the entire..."
- Complex multi-step workflows
- Features requiring multiple specialists

**Example commands:**
- "Build the complete auto-apply system"
- "Implement the entire dashboard with backend"
- "Create the full testing suite"

#### 🔍 **general-purpose**
**Use when user asks to:**
- Search for specific code patterns
- Find implementations across the codebase
- Research complex topics
- Analyze existing code
- "Find all instances of..."
- "Search for..."

**Example commands:**
- "Find all message handlers"
- "Search for storage usage"
- "Where is the form filling logic?"

### Direct Action Commands (No Agent Needed):

#### ✏️ **Direct Coding/Editing**
**Handle directly when user:**
- Points to specific code to write/fix
- Asks for specific function implementation
- Requests direct file edits
- Says "Write a function that..."
- "Fix this error..."
- "Add this feature to file X"

#### 📖 **Information/Explanation**
**Handle directly when user:**
- Asks "What does this code do?"
- "Explain this function"
- "What is..." (concept questions)
- Requests documentation
- Asks about syntax

#### 🛠️ **Simple Tool Operations**
**Handle directly when user:**
- "Run npm install"
- "Check git status"
- "Read file X"
- "Create a new file"
- Simple bash commands

## Current Project Priorities

### 🔴 Critical (Do First):
1. **Fix popup.js and options.js** - UI is non-functional
2. **Integrate anti-detection system** - Prevent LinkedIn blocking
3. **Fix content script module loading** - Core functionality broken

### 🟡 High Priority:
4. Complete form filling for multi-step applications
5. Add error handling throughout
6. Implement configuration UI

### 🟢 Medium Priority:
7. Add statistics tracking
8. Create templates system
9. Implement advanced filters

## Testing Commands
Always run these after making changes:
```bash
# Check for JavaScript errors
npm run lint

# Run tests if available
npm test

# Verify extension loads
# Manual: Load unpacked extension in Chrome
```

## Common Issues & Solutions

### Problem: Content scripts not loading
**Solution:** Check manifest.json matches patterns and verify LinkedIn URL format

### Problem: Storage not persisting
**Solution:** Use chrome.storage.local, not localStorage

### Problem: Service worker disconnecting
**Solution:** Implement proper lifecycle management with chrome.runtime events

### Problem: Anti-detection triggered
**Solution:** Add random delays, human-like behavior patterns

## File Structure Reference
```
gtm-tooling/
├── .llm/
│   ├── TODO.md          # Task tracking
│   └── CLAUDE.md        # This file
├── src/
│   ├── background/      # Service worker
│   ├── content/         # Content scripts
│   ├── popup/          # Extension popup UI
│   ├── options/        # Settings page
│   └── utils/          # Shared utilities
├── manifest.json       # Extension configuration
└── package.json       # Project dependencies
```

## Key Files to Monitor
- **service-worker.js** - Core extension logic
- **content.js** - LinkedIn page interaction
- **manifest.json** - Extension configuration
- **TODO.md** - Current task status

## Response Guidelines

1. **Be Concise** - CLI environment, keep responses short
2. **Use Appropriate Agent** - Refer to matrix above
3. **Track Progress** - Update TODO.md when tasks complete
4. **Test Changes** - Run lint/test after code modifications
5. **Security First** - Never expose keys, respect LinkedIn ToS

## Special Considerations

### LinkedIn Specific:
- DOM structure changes frequently
- Use data attributes when possible
- Implement fallback selectors
- Respect rate limits (max 10 applications/hour)

### Chrome Extension Specific:
- Manifest V3 restrictions
- Service worker lifecycle
- Content script isolation
- Cross-origin limitations

### Anti-Detection:
- Random delays (2-5 seconds between actions)
- Mouse movement simulation
- Scroll patterns
- Human-like typing speed

---

*Last Updated: 2025-08-22*
*Version: 1.0*