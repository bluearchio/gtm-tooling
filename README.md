# LinkedIn Auto-Apply Chrome Extension MVP

A Chrome extension that automates LinkedIn job applications with intelligent filtering and form filling capabilities.

## Features

### Core Functionality
- **Auto-Apply**: Automatically apply to LinkedIn Easy Apply jobs
- **Smart Filtering**: Filter jobs by keywords, location, experience level, and more
- **Form Auto-Fill**: Automatically fills application forms with your profile information
- **Anti-Detection**: Human-like behavior to avoid detection
- **Session Management**: Track daily and session application limits
- **Statistics Tracking**: Monitor your application success rate

### Current MVP Capabilities
- Filter jobs by "remote" status and keywords
- Auto-click Easy Apply on matching jobs
- Fill basic form fields (name, email, phone, etc.)
- Start/Stop/Pause automation controls
- Real-time status updates
- Configurable settings page

## Installation Instructions

### Step 1: Load the Extension in Chrome

1. Open Chrome browser
2. Navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right corner)
4. Click "Load unpacked"
5. Select the folder: `/Users/jproctor/My Drive/source/git/projects/bluearch/gtm-tooling`
6. The extension should appear in your extensions list

### Step 2: Pin the Extension

1. Click the puzzle piece icon in Chrome toolbar
2. Find "LinkedIn Auto-Apply Assistant"
3. Click the pin icon to keep it visible

## How to Use

### Initial Setup

1. Click the extension icon to open the popup
2. Click "Settings" link at the bottom
3. Configure your preferences:
   - **Job Filters**: Add keywords like "finops", "cloud", "aws"
   - **Automation**: Set daily/session limits
   - **Profile**: Enter your information for auto-fill

### Start Auto-Applying

1. Navigate to LinkedIn Jobs: `https://www.linkedin.com/jobs/`
2. Perform an initial job search with your criteria
3. Click the extension icon
4. Click "Start Auto-Apply"
5. The extension will:
   - Scan jobs on the page
   - Filter based on your criteria
   - Apply to matching Easy Apply jobs
   - Track progress in real-time

### Control Options

- **Start**: Begin automation on current LinkedIn jobs page
- **Stop**: Stop all automation
- **Pause**: Temporarily pause (resume later)
- **Resume**: Continue after pausing

### Quick Filters

Use the quick filter buttons in the popup:
- **Remote Only**: Only apply to remote positions
- **Easy Apply**: Only process Easy Apply jobs
- **Posted < 7 days**: Only recent job postings

## Configuration Options

### Job Filters
- **Keywords**: Jobs matching these terms are prioritized
- **Keyword Logic**: AND (all keywords) or OR (any keyword)
- **Remote Preference**: Any, Remote Only, On-site Only, Hybrid
- **Experience Level**: Entry, Mid, Senior, etc.
- **Posted Within**: Last 24 hours to last month
- **Minimum Salary**: Optional salary filter

### Automation Settings
- **Mode**: 
  - Fully Automatic: Submit without review
  - Semi-Automatic: Review before submit (recommended)
  - Review Only: Fill forms but don't submit
- **Daily Limit**: Max applications per day (default: 50)
- **Session Limit**: Max applications per session (default: 10)
- **Delays**: Random delays between actions (3-8 seconds)
- **Anti-Detection**: Humanize mouse movements and actions

### Profile Information
- Basic info: Name, email, phone
- Professional: Current title, company, years of experience
- LinkedIn profile URL

## Testing the Extension

### Quick Test

1. Load the extension in Chrome
2. Go to: `https://www.linkedin.com/jobs/search/`
3. Search for any job (e.g., "software engineer")
4. Open the extension popup
5. Click "Start Auto-Apply"
6. Watch the status updates

### Verify Core Functions

1. **Popup Opens**: Click extension icon - popup should display
2. **Settings Page**: Click "Settings" link - options page should open
3. **Status Updates**: Start automation - see real-time status changes
4. **Job Detection**: On LinkedIn jobs page - extension should find jobs
5. **Filtering**: Add keywords in settings - only matching jobs processed

### Test Scenarios

#### Scenario 1: Basic Flow
1. Set keyword filter to "remote"
2. Navigate to LinkedIn jobs
3. Start automation
4. Verify only remote jobs are processed

#### Scenario 2: Semi-Auto Mode
1. Set mode to "Semi-Automatic" in settings
2. Start automation
3. Extension should fill forms but wait for review
4. Manually click submit after reviewing

#### Scenario 3: Session Limits
1. Set session limit to 2
2. Start automation
3. Should stop after 2 applications

## File Structure

```
/gtm-tooling/
├── manifest.json           # Extension configuration
├── assets/
│   └── icons/             # Extension icons
├── src/
│   ├── background/
│   │   └── service-worker.js    # Background script
│   ├── content/
│   │   ├── content.js           # Main content script
│   │   ├── linkedin-analyzer.js # LinkedIn page analyzer
│   │   ├── form-filler.js       # Form filling logic
│   │   ├── filter-engine.js     # Job filtering
│   │   ├── anti-detection.js    # Anti-detection measures
│   │   └── styles.css           # Injected styles
│   ├── popup/
│   │   ├── popup.html           # Extension popup UI
│   │   └── popup.js             # Popup logic
│   ├── options/
│   │   ├── options.html         # Settings page
│   │   └── options.js           # Settings logic
│   └── utils/
│       └── storage.js           # Storage utilities
```

## Troubleshooting

### Extension Not Loading
- Ensure Developer mode is enabled
- Check for errors in chrome://extensions/
- Try reloading the extension

### Not Finding Jobs
- Ensure you're on LinkedIn jobs page
- Check if page fully loaded
- Try refreshing the page

### Forms Not Filling
- Check profile information in settings
- Ensure all required fields are configured
- Try semi-automatic mode for debugging

### Status Not Updating
- Check console for errors (F12)
- Reload the extension
- Clear Chrome cache

## Development Notes

### Key Technologies
- Chrome Extension Manifest V3
- Content Scripts for page interaction
- Background Service Worker for coordination
- Chrome Storage API for persistence

### Security Features
- Anti-detection delays and randomization
- Human-like mouse movement simulation
- Session rotation support
- Rate limiting

## Current Limitations

- Only works with LinkedIn Easy Apply jobs
- Basic form filling (complex forms may need manual input)
- No resume upload capability yet
- No cover letter generation
- English language only

## Next Steps for Enhancement

1. Advanced form field detection
2. Resume upload support
3. Cover letter templates
4. Multi-step application support
5. Better error recovery
6. Export application history
7. Advanced analytics dashboard

## Support

For issues or questions:
1. Check console logs (F12 → Console tab)
2. Review settings configuration
3. Ensure LinkedIn is logged in
4. Try disabling other extensions that might conflict

## Legal Notice

This extension is for educational and personal use. Users are responsible for complying with LinkedIn's Terms of Service and any applicable laws. Use responsibly and ethically.

---

**Version**: 1.0.0 (MVP)  
**Last Updated**: August 2024